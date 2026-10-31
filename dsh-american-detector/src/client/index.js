/**
 * dsh-american-detector — browser half.
 *
 * Watches for every instruction the user sends, decides whether this is an
 * American user (browser signals + the host report from
 * /api/american-detector/report), and if so raises the fake
 * "您的账户已被封禁" dialog, which any key or click dismisses.
 *
 * Manual triggers:
 *   ?dsh-ban=1        force the dialog on every send (test mode)
 *   ?dsh-ban=0        never show it (kills the history latch too)
 *   ?dsh-ban-score=N  move the log-odds threshold (default 2.2)
 *   ?dsh-ban-off=ids  ignore signals by id
 *   ?dsh-gate=1       force the login gate on the next instruction
 *   ?dsh-gate=0       disable the periodic login gate
 *   ?dsh-keywords=0   disable the built-in keyword rule (typing 「test」)
 *   ?dsh-passphrase=0 disable the escape hatch (typing 「中国人能飞」)
 *   ?dsh-width=strict refuse full-width symbols in the transcription (default fold)
 *   ?dsh-content=1    enable the content check (default off)
 *   ?dsh-ip=1         allow one public-IP lookup for the coherence check
 *   window.__AMERICAN_DETECTOR__.verdict() / .history() / .gate() / .export()
 *
 * Keyword rule: submitting a line that is exactly one of BAN_KEYWORDS (「test」)
 * forces the ban dialog regardless of the verdict.
 *
 * Content check (opt-in, `?dsh-content=1`): a line whose wording reads like life
 * outside China (tipping, miles, Fahrenheit…) forces the ban dialog too, and
 * reports the matched phrases.
 *
 * Escape hatch: submitting 「中国人能飞」 switches the detector off for this
 * page — the alarm memory, the login-gate counter and every rule are cleared,
 * and nothing pops up again until the page is reloaded.
 *
 * Memory: every send appends one row to localStorage; any "American" row among
 * the last HISTORY_LIMIT keeps the alarm latched. Independently, one send in
 * every four or five is claimed by the blue login gate, which outranks the ban
 * dialog and must be passed (three transcriptions + a 10s hold) to continue.
 */
import { browserSignals } from './browser-signals.js'
import { analyzeWidth, stripTrailingSymbols } from './width.js'
import { CONTENT_THRESHOLD, detectContentMismatch } from './content.js'
import { MODEL, THRESHOLD_LOGIT, replayHistory, scoreSignals } from './score.js'
import { createBanOverlay } from './overlay.js'
import { createGateOverlay } from './gate-overlay.js'
import {
  GATE_PHRASE, advanceGate, clearGateState, markGatePending, passGate, phraseAccepted, readGateState,
  setPassphraseSink,
} from './gate.js'
import { HISTORY_LIMIT, clearHistory, pushHistory, readHistory, saveHistory, summarizeHistory } from './history.js'

/** Client plugin name, matching this package's id in the boot graph. */
export const name = 'dsh-american-detector'

/** Both services exist in the shipped Web composition. */
export const inject = ['sessions', 'slots']

/** The host route that carries the OS-level signals. */
const REPORT_URL = '/api/american-detector/report'

/**
 * Instructions that always raise the ban dialog, whatever the verdict says.
 *
 * A built-in gag rule: typing this word is enough. Matching is on the whole
 * trimmed line, case-folded, with trailing punctuation ignored — so "Test",
 * "test!" and " TEST " fire, while a sentence that merely contains it does not.
 */
const BAN_KEYWORDS = ['test']

/**
 * Instructions that switch the whole detector off.
 *
 * A deliberate escape hatch: submitting this line clears the alarm memory, the
 * pending login challenge and the keyword rule's effect, so nothing pops up
 * again until the page is reloaded. Typing it is the way out of the prank.
 */
const IMMORTAL_PASSPHRASE = '中国人能飞'

/** Parse the query-string knobs: dsh-ban, dsh-ban-score, dsh-ban-off, dsh-gate, dsh-ip. */
function readOptions() {
  const options = { lock: null, threshold: undefined, disabled: new Set(), gate: null, ip: false, keywords: true, passphrase: true, content: false }
  const search = (() => {
    try {
      return new URLSearchParams(window.location.search)
    } catch {
      return null
    }
  })()
  if (search === null) return options
  const ip = search.get('dsh-ip')
  if (ip === '1' || ip === 'true' || ip === 'on') options.ip = true
  try {
    const value = search.get('dsh-ban')
    if (value === '1' || value === 'true' || value === 'on') options.lock = true
    if (value === '0' || value === 'false' || value === 'off') options.lock = false
    const score = Number(search.get('dsh-ban-score'))
    if (Number.isFinite(score) && score !== 0) options.threshold = score
    for (const id of (search.get('dsh-ban-off') ?? '').split(',')) {
      if (id.trim() !== '') options.disabled.add(id.trim())
    }
    const gate = search.get('dsh-gate')
    if (gate === '1' || gate === 'true' || gate === 'on') options.gate = true
    if (gate === '0' || gate === 'false' || gate === 'off') options.gate = false
    const keywords = search.get('dsh-keywords')
    if (keywords === '0' || keywords === 'false' || keywords === 'off') options.keywords = false
    const passphrase = search.get('dsh-passphrase')
    if (passphrase === '0' || passphrase === 'false' || passphrase === 'off') options.passphrase = false
    const width = search.get('dsh-width')
    if (width === 'strict') options.width = 'strict'
    const content = search.get('dsh-content')
    if (content === '1' || content === 'true' || content === 'on') options.content = true
    if (content === '0' || content === 'false' || content === 'off') options.content = false
  } catch {
    /* no window search: not a browser */
  }
  return options
}

/** One session binding subscription. */
function bindSession(bindingId, session, entry, seen) {
  const listener = () => {
    let snapshot
    try {
      snapshot = session.getSnapshot()
    } catch {
      return
    }
    const pending = Array.isArray(snapshot?.pendingSubmissions) ? snapshot.pendingSubmissions : []
    for (const item of pending) {
      const key = item?.requestId ?? `${bindingId}:${String(item?.time)}:${String(item?.text)}`
      if (seen.has(key)) continue
      seen.add(key)
      entry.fire(`会话 ${String(bindingId)} 提交了新的指令`, item?.text)
      return
    }
  }
  const off = session.subscribe(listener)
  return () => {
    try {
      off()
    } catch {
      /* already released */
    }
  }
}

/**
 * Install the detector.
 * @param {object} ctx - client Cordis context.
 */
export function apply(ctx) {
  const options = readOptions()
  let hostReport = null
  let overlay = null
  let gate = null
  let opened = 0
  const gateRuns = { raised: 0, passed: 0 }
  let history = readHistory()
  let gateState = readGateState()
  let immortalMode = false
  // The gate dialog asks the plugin (not itself) to handle the passphrase.
  ctx.effect(() => setPassphraseSink(trigger => enterImmortalMode(trigger)), 'american-detector: passphrase sink')

  /** Pure evaluation — never records, so diagnostics cannot pollute the history. */
  const computeVerdict = () => {
    const browser = browserSignals(hostReport).signals
    const scored = scoreSignals([...browser, ...(hostReport?.signals ?? [])], { threshold: options.threshold })
    // Latch: the alarm stays on while any of the last HISTORY_LIMIT verdicts
    // counted as American under the model that produced it.
    const replayed = replayHistory(history)
    const latched = options.lock !== false && replayed.latched
    const american = options.lock === true ? true : options.lock === false ? false : scored.american || latched
    return {
      ...scored,
      american,
      rawAmerican: scored.american,
      latched,
      historyCount: history.length,
      historyAlarm: replayed.count,
      historyLastAt: replayed.last === null ? null : new Date(replayed.last.at).toLocaleString('zh-CN'),
      testMode: options.lock === true,
      hostError: hostReport?.error ?? null,
      hostAt: hostReport?.at ?? null,
      ua: typeof navigator === 'undefined' ? '' : navigator.userAgent,
      model: MODEL,
    }
  }

  /**
   * Evaluate and append to the rolling history (one row per instruction sent).
   * @param trigger - what raised this evaluation, for the log and the history.
   * @param forced - { keyword } when a built-in keyword forced the verdict.
   */
  const evaluate = (trigger, forced = null) => {
    const base = computeVerdict()
    const verdict = forced === null
      ? base
      : { ...base, american: true, rawAmerican: true, forced: true, forcedReason: forced.reason, detail: forced.detail ?? '' }
    const row = {
      at: Date.now(),
      model: MODEL,
      // A keyword hit is a gag, not a reading of the evidence, so it must never
      // contribute to the rolling alarm: the row is stored for forensics with
      // `american: false` and an explicit `forced` marker.
      american: forced === null ? verdict.american : false,
      raw: forced === null ? verdict.rawAmerican : false,
      total: verdict.total,
      threshold: verdict.threshold,
      proSum: verdict.proSum,
      conSum: verdict.conSum,
      proCount: verdict.proCount,
      conCount: verdict.conCount,
      foldedCount: verdict.foldedCount,
      reasons: verdict.reasons,
      counterReasons: verdict.counterReasons,
      trigger: String(trigger ?? ''),
      latched: verdict.latched,
      ...(forced === null ? {} : { forced: true, forcedReason: forced.reason, detail: forced.detail ?? '' }),
    }
    history = pushHistory(history, row)
    saveHistory(history)
    return verdict
  }

  /**
   * Whether a submitted line reads like life outside China.
   * @param text - the submitted instruction.
   * @returns the detection, or null when the rule is switched off.
   */
  const contentCheck = (text) => (options.content === true ? detectContentMismatch(text) : null)

  /**
   * Whether a submitted line is the passphrase that disables the detector.
   * @param text - the draft as submitted.
   * @returns true for the passphrase (trimmed, trailing punctuation ignored).
   */
  const passphraseIn = (text) => {
    if (options.passphrase === false) return false
    return stripTrailingSymbols(text) === IMMORTAL_PASSPHRASE
  }

  /**
   * Switch the detector off for this page.
   *
   * Clears the two persisted memories rather than only muting, so the escape
   * survives the next evaluation instead of being undone by the latch.
   * @param trigger - what asked for it, for the log.
   * @returns true when the state changed.
   */
  const enterImmortalMode = (trigger) => {
    if (immortalMode) return false
    immortalMode = true
    clearHistory()
    history = []
    clearGateState()
    gateState = readGateState()
    overlay?.close()
    gate?.close()
    ctx.logger?.info?.(`american-detector: 接收口令「${IMMORTAL_PASSPHRASE}」→ 已解除警报、清空认证计数，本次会话不再弹窗（${trigger}）`)
    return true
  }

  /**
   * Whether a submitted line is one of the built-in ban triggers.
   * @param text - the draft as submitted.
   * @returns the matched keyword, or null.
   */
  const banKeywordIn = (text) => {
    // Width-folded first, so `ｔｅｓｔ` and `ＴＥＳＴ！` match `test`.
    const line = stripTrailingSymbols(text).toLowerCase()
    return line === '' ? null : BAN_KEYWORDS.find(keyword => keyword === line) ?? null
  }

  const ensureOverlay = (verdict) => {
    if (overlay === null) overlay = createBanOverlay(verdict)
    else overlay.setVerdict(verdict)
    return overlay
  }

  const gateOpen = () => gate !== null && gate.isOpen()

  /** Raise the periodic authentication gate (higher priority than the ban dialog). */
  const openGate = () => {
    if (gateOpen()) return gate
    overlay?.close()
    // Persist the pending challenge first, so a reload cannot skip it.
    gateState = markGatePending(gateState)
    gate = createGateOverlay({
      nextAt: gateState.nextAt,
      widthStrict: options.width === 'strict',
      onPass: () => {
        gateState = passGate(gateState)
        gateRuns.passed += 1
        ctx.logger?.info?.(`american-detector: 登录认证已通过，下一次在第 ${gateState.nextAt} 轮`)
      },
    })
    gateRuns.raised += 1
    ctx.logger?.info?.(`american-detector: 第 ${gateState.turns} 轮 → 弹出登录认证（下一轮 ${gateState.nextAt}）`)
    return gate
  }

  const entry = {
    /**
     * Handle one instruction the user just sent.
     * @returns 'gate' | 'ban' | false — which ceremony claimed the keystroke.
     */
    fire(trigger, text) {
      // The escape hatch outranks everything: it must work with the gate open,
      // with a latched alarm, and with a keyword in the same line.
      if (passphraseIn(text)) {
        if (enterImmortalMode(trigger)) return 'pass'
        return false
      }
      if (immortalMode) return false
      // The gate outranks the ban dialog, and it blocks until it is passed.
      if (gateOpen()) {
        gate.focus()
        return 'gate'
      }
      // The built-in keyword rule is unconditional and comes before the counter:
      // it must fire even if the periodic gate were about to claim this send.
      const keyword = options.keywords === false ? null : banKeywordIn(text)
      if (keyword !== null && options.lock !== false) {
        const verdict = evaluate(trigger, { reason: 'keyword', detail: keyword })
        const face = ensureOverlay(verdict)
        face.open()
        opened += 1
        ctx.logger?.info?.(`american-detector: 命中关键词「${keyword}」→ 弹出假封禁弹窗（${trigger}）`)
        return 'ban'
      }
      // The content rule is evidence-shaped, so it reports which phrases it
      // matched and does not consume a gate turn.
      const content = contentCheck(text)
      if (content !== null && content.mismatch && options.lock !== false) {
        const verdict = evaluate(trigger, { reason: 'content', detail: content.detail })
        const face = ensureOverlay(verdict)
        face.open()
        opened += 1
        ctx.logger?.info?.(`american-detector: 内容校验命中（${content.detail}）→ 弹出假封禁弹窗（${trigger}）`)
        return 'ban'
      }
      if (options.gate !== false) {
        const gateStep = advanceGate(gateState, options.gate === true)
        gateState = gateStep.state
        if (gateStep.trigger && options.lock !== false) {
          openGate()
          return 'gate'
        }
      }
      const verdict = evaluate(trigger)
      if (!verdict.american) return false
      const face = ensureOverlay(verdict)
      face.open()
      opened += 1
      ctx.logger?.info?.(
        `american-detector: 判定为美国用户（${verdict.total}/${verdict.threshold}${verdict.latched ? '，来自历史警报' : ''}，${trigger}）→ 弹出假封禁弹窗`,
      )
      return 'ban'
    },
    verdict: computeVerdict,
    opened: () => opened,
    gateState: () => ({ ...gateState, raised: gateRuns.raised, passed: gateRuns.passed, open: gateOpen() }),
  }

  /* ---------------------------------------------------------------- *
   * Host report
   * ---------------------------------------------------------------- */
  const loadReport = async () => {
    try {
      const url = options.ip === true ? `${REPORT_URL}?includeIp=1` : REPORT_URL
      const response = await fetch(url, { headers: { accept: 'application/json' } })
      if (!response.ok) return null
      const value = await response.json()
      return value !== null && typeof value === 'object' ? value : null
    } catch {
      return null
    }
  }
  // The host half may still be mounting when this plugin applies, so a failed
  // first read retries a few times instead of silently scoring without it.
  const warmReport = async (attempt = 0) => {
    const value = await loadReport()
    if (value !== null) {
      hostReport = value
      return value
    }
    if (attempt < 5) window.setTimeout(() => { void warmReport(attempt + 1) }, 2000 * (attempt + 1))
    return null
  }
  void warmReport()

  /* ---------------------------------------------------------------- *
   * Primary trigger: a new local submission echo on any session
   * ---------------------------------------------------------------- */
  const seen = new Set()
  const bound = new Set()
  const offs = []

  const bindAll = () => {
    const sessions = ctx.get('sessions')
    if (sessions === undefined) return
    let list
    try {
      list = sessions.list?.getSnapshot?.()
    } catch {
      return
    }
    const ids = Array.isArray(list?.ids) ? list.ids : []
    for (const id of ids) {
      const key = String(id)
      if (bound.has(key)) continue
      let binding
      try {
        binding = sessions.binding(id)
      } catch {
        continue
      }
      if (binding === undefined || binding.session === undefined) continue
      bound.add(key)
      offs.push(bindSession(key, binding.session, entry, seen))
    }
  }

  ctx.effect(() => {
    const sessions = ctx.get('sessions')
    const off = sessions?.list?.subscribe?.(bindAll)
    bindAll()
    return () => {
      off?.()
      for (const dispose of offs.splice(0)) dispose()
      bound.clear()
    }
  }, 'american-detector: session submission watchers')

  /* ---------------------------------------------------------------- *
   * Fallback trigger: a plain Enter in the composer. The popup always
   * wins the keystroke, so a caught send never reaches the host.
   * ---------------------------------------------------------------- */
  const onKeydown = (event) => {
    if (event.isComposing) return
    if (event.key !== 'Enter' || event.shiftKey) return
    // The gate owns the keyboard while it is up: its own input field is the
    // only place a key may land, and a send attempt just refocuses it.
    if (gateOpen()) {
      if (gate.ownsEvent(event)) return
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
      gate.focus()
      return
    }
    const target = event.target
    const editing = target instanceof HTMLElement
      && (target.isContentEditable || target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')
    if (!editing) return
    const text = target.isContentEditable ? target.innerText : target.value
    if (typeof text !== 'string' || text.trim() === '') return
    entry.fire('检测到 Enter 发送指令', text)
  }

  ctx.effect(() => {
    window.addEventListener('keydown', onKeydown, true)
    return () => window.removeEventListener('keydown', onKeydown, true)
  }, 'american-detector: composer enter fallback')

  /* ---------------------------------------------------------------- *
   * Dismissal: any key closes the ban dialog; the gate has no dismissal.
   * ---------------------------------------------------------------- */
  const onAnyKey = (event) => {
    if (gateOpen()) {
      // The gate's own field stops propagation before this listener runs, so a
      // key arriving here came from outside it: swallow it and hand focus back.
      if (gate.ownsEvent(event)) return
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
      gate.focus()
      return
    }
    if (overlay === null || !overlay.isOpen()) return
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
    overlay.close()
  }

  ctx.effect(() => {
    window.addEventListener('keydown', onAnyKey, true)
    window.addEventListener('keyup', onAnyKey, true)
    return () => {
      window.removeEventListener('keydown', onAnyKey, true)
      window.removeEventListener('keyup', onAnyKey, true)
    }
  }, 'american-detector: any-key dismissal')

  /* ---------------------------------------------------------------- *
   * Slot occupant: nothing visual, but it keeps the plugin composed
   * with the conversation input in the shipped Web shell.
   * ---------------------------------------------------------------- */
  ctx.slots.inject('conversation.input.overlay', () => ctx.slots.register({
    name: 'conversation.input.overlay',
    id: 'american-detector-ban',
    order: 90,
  }, () => null))

  /* ---------------------------------------------------------------- *
   * Manual control surface
   * ---------------------------------------------------------------- */
  window.__AMERICAN_DETECTOR__ = {
    verdict: () => computeVerdict(),
    /** The rolling memory: counts, the last American row, and recent rows. */
    history: () => summarizeHistory(history),
    /** Full history as JSON text, for pasting into an issue or a chat. */
    export: () => JSON.stringify({ verdict: computeVerdict(), history, gate: entry.gateState() }, null, 2),
    clearHistory: () => {
      clearHistory()
      history = []
      return history
    },
    /** The login-gate counter, pending challenge, and how many gates were raised. */
    gate: () => entry.gateState(),
    /** Raise the blue login gate right now. */
    gateNow: () => openGate(),
    /** Reset the gate counter (and any pending challenge). */
    resetGate: () => {
      clearGateState()
      gateState = readGateState()
      return entry.gateState()
    },
    /** Close the login gate without passing it (debug escape). */
    closeGate: () => { gate?.close(); return entry.gateState() },
    /** Re-arm the prank after the passphrase switched it off. */
    rearm: () => {
      immortalMode = false
      return false
    },
    /** The escape-hatch passphrase. */
    passphrase: () => IMMORTAL_PASSPHRASE,
    /** Whether the detector has been switched off for this page. */
    immortal: () => immortalMode,
    /** Switch the detector off now (the same thing the passphrase does). */
    goImmortal: () => enterImmortalMode('控制台调用'),
    /** Full-width / half-width inspection of a raw line, for diagnostics. */
    width: value => analyzeWidth(value),
    /** Inspect a line against the content rule without acting on it. */
    content: value => detectContentMismatch(value),
    /** Read or set the content rule's switch; returns the resulting state. */
    contentCheck: (enabled) => {
      if (enabled !== undefined) options.content = enabled === true
      return { enabled: options.content, threshold: CONTENT_THRESHOLD }
    },
    /** The keyword rule: which lines force the ban dialog. */
    keywords: () => [...BAN_KEYWORDS],
    /** Whether a line would trigger the keyword rule. */
    matchesKeyword: value => banKeywordIn(value),
    /** The accepted transcription rule, for tests and curiosity. */
    phrase: value => phraseAccepted(value),
    expectedPhrase: GATE_PHRASE,
    show: () => ensureOverlay(computeVerdict()).open(),
    hide: () => overlay?.close(),
    toggle: () => entry.fire('手动触发'),
    rescan: async () => {
      await fetch('/api/american-detector/refresh').catch(() => undefined)
      hostReport = await loadReport()
      return computeVerdict()
    },
    opens: () => opened,
    historyLimit: HISTORY_LIMIT,
    /** The live score model identity and threshold. */
    model: () => ({ model: MODEL, threshold: THRESHOLD_LOGIT }),
    version: '1.7.0',
  }

  /* ---------------------------------------------------------------- *
   * Boot: a challenge left pending by a reload comes straight back.
   * ---------------------------------------------------------------- */
  if (gateState.pending === true && options.lock !== false) {
    openGate()
    ctx.logger?.info?.('american-detector: 恢复上次未完成的登录认证')
  }

  ctx.logger?.info?.(
    `american-detector: 浏览器侧已就位（模型 ${MODEL}，判定线 ${THRESHOLD_LOGIT}；口令「${IMMORTAL_PASSPHRASE}」可解除；历史 ${history.length}/${HISTORY_LIMIT} 条，`
    + `警报${history.some(row => row.american === true) ? '已拉响' : '未拉响'}；`
    + `登录认证：已过 ${gateState.passed} 次，下一次第 ${gateState.nextAt} 轮`
    + `${gateState.pending ? '（有未完成的验证，锁定中）' : ''}`
    + `${options.lock === null ? '' : options.lock ? '，测试模式：必定弹窗' : '，测试模式：不弹窗'}）`,
  )
}

export default { name, inject, apply }
