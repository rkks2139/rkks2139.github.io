#!/usr/bin/env node
/**
 * Headless smoke test for the periodic blue login gate.
 *
 * Drives the counter across instructions, opens the gate, proves the phrase
 * rule (Simplified Chinese only), proves the 10-second hold is required, and
 * proves a passed gate resets the counter while a page reload cannot skip it.
 *
 * Usage: node scripts/test-gate.mjs
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import { createHarness, materialize } from './dom-harness.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const bundle = join(root, 'lib/client.js')

/** Boot one "page": harness + plugin + a session that can send instructions. */
function page(options = {}) {
  const harness = createHarness()
  for (const [key, value] of Object.entries(options.storage ?? {})) harness.storage.set(key, value)
  if (options.search !== undefined) harness.window.location.search = options.search
  const context = vm.createContext(harness.sandbox)
  const exportsObject = materialize(context, bundle, vm)

  let submissions = []
  let submissionListener = null
  const session = {
    getSnapshot: () => ({ pendingSubmissions: submissions.slice() }),
    subscribe: (listener) => { submissionListener = listener; return () => { submissionListener = null } },
  }
  const sessions = {
    list: { getSnapshot: () => ({ ids: ['session-1'] }), subscribe: () => () => {} },
    binding: () => ({ session }),
  }
  const ctx = {
    logger: { info: () => {}, warn: () => {} },
    get: name => (name === 'sessions' ? sessions : undefined),
    effect: (fn) => { fn() },
    slots: { inject: () => {}, register: () => () => {} },
  }
  exportsObject.apply(ctx)

  return {
    ...harness,
    api: () => harness.window.__AMERICAN_DETECTOR__,
    /** Send one instruction and return which ceremony claimed it. */
    send(text = 'hi', marker = Math.random().toString(36).slice(2)) {
      submissions = [...submissions, { requestId: marker, time: Date.now(), text }]
      submissionListener?.()
      harness.flushTimers()
    },
    gateHost: () => harness.body.children.find(node => node.getAttribute('data-dsh-american-detector') === 'gate'),
    banHost: () => harness.body.children.find(node => node.getAttribute('data-dsh-american-detector') === 'overlay'),
  }
}

const assert = (condition, message) => { if (!condition) throw new Error(message) }

/**
 * Type a line into the gate the way a person does: one keystroke per character,
 * then Enter. The challenge refuses values that appear without typing.
 * @param page - a page() result.
 * @param line - the characters to type.
 */
function typeLineInto(page, line) {
  const box = page.gateHost().querySelector('input')
  box.value = ''
  for (const character of line) {
    box.dispatchEvent(new (page.sandbox.Event)('keydown', { key: character, target: box }))
    box.value += character
  }
  box.dispatchEvent(new (page.sandbox.Event)('keydown', { key: 'Enter', target: box }))
}



/* ------------------------------------------------------------------ *
 * 1. The counter runs to 4 or 5 and then the gate claims a send
 * ------------------------------------------------------------------ */
{
  const p = page()
  assert(p.gateHost() === undefined, 'the gate must not be up before the threshold')
  const nextAt = p.api().gate().nextAt
  assert(nextAt === 4 || nextAt === 5, `gate interval must be 4 or 5, got ${nextAt}`)
  console.log(`1. gate interval drawn: ${nextAt} (turns now ${p.api().gate().turns})`)

  for (let index = 1; index < nextAt; index += 1) p.send(`turn ${index}`)
  assert(p.gateHost() === undefined, `the gate must stay down for ${nextAt - 1} sends`)
  assert(p.api().gate().turns === nextAt - 1, `counter should be ${nextAt - 1}, is ${p.api().gate().turns}`)
  console.log(`2. ${nextAt - 1} sends counted without a gate (turns ${p.api().gate().turns}/${nextAt})`)

  p.send('the triggering send')
  const host = p.gateHost()
  assert(host !== undefined, 'the gate must be up on the threshold send')
  const mark = host.allMarkup()
  assert(mark.includes('账户登录验证'), 'the gate must be titled 账户登录验证')
  assert(mark.includes('中国人能飞'), 'the gate must show the phrase to transcribe')
  assert(mark.includes('人机验证'), 'the gate must include the captcha step')
  assert(mark.includes('假的'), 'the gate must carry its prank disclaimer')
  assert(mark.includes('#14263f') || mark.includes('SECURITY RE-AUTHENTICATION'), 'the gate must render the blue card')
  assert(p.banHost() === undefined || p.banHost().style.display === 'none', 'the gate outranks the ban dialog: no ban dialog alongside it')
  console.log('3. gate raised on the threshold send; blue card, phrase, captcha, disclaimer present; ban dialog suppressed')
}

/* ------------------------------------------------------------------ *
 * 2. The phrase rule: Simplified Chinese, three consecutive lines
 * ------------------------------------------------------------------ */
{
  const p = page()
  p.api().gateNow()
  p.flushTimers()
  const state = () => p.gateHost()?.allMarkup() ?? ''
  assert(p.api().gate().open === true, 'gateNow() must open the gate')

  const gate = p.api()
  assert(gate.phrase('中国人能飞') === true, '中国人能飞 must be accepted')
  assert(gate.phrase(' 中国人能飞，') === true, 'whitespace and punctuation must be tolerated')
  assert(gate.phrase('中國人能飛') === false, 'Traditional characters must be rejected')
  assert(gate.phrase('中国人能飞了') === false, 'a wrong phrase must be rejected')
  assert(gate.phrase('') === false, 'an empty line must be rejected')
  console.log('4. phrase rule: Simplified only, punctuation tolerated, Traditional and wrong text rejected')

  // One wrong line does not advance the counter.
  const input = p.gateHost().querySelector('input')
  assert(input !== null, 'the gate must render an input')
  const before = p.api().gate()
  typeLineInto(p, '美国人不能飞')
  const hint = p.gateHost().querySelector('[data-hint]')
  assert(hint !== null && hint.textContent.includes('口令不匹配'), `a wrong line must show the mismatch hint, got ${JSON.stringify(hint?.textContent)}`)
  assert(p.api().gate().turns === before.turns, 'a wrong line must not change the counter')
  console.log('5. wrong line rejected with a hint and no progress')

  // Three correct lines advance to the captcha step.
  for (let index = 0; index < 3; index += 1) typeLineInto(p, '中国人能飞')
  const label = p.gateHost().allElements().find(node => node.textContent.includes('/ 3'))
  assert(label !== undefined && label.textContent.includes('3 / 3'), `three correct lines must complete step one, got ${JSON.stringify(label?.textContent)}`)
  console.log('6. three consecutive correct lines complete step one')
}

/* ------------------------------------------------------------------ *
 * 2b. The transcription must be typed: paste and drop are refused
 * ------------------------------------------------------------------ */
{
  const p = page()
  p.api().gateNow()
  p.flushTimers()
  const input = () => p.gateHost().querySelector('input')
  const hint = () => p.gateHost().querySelector('[data-hint]')
  const steps = () => p.api().gate()

  // A paste event is cancelled and explained.
  const field = input()
  let prevented = false
  const paste = new (p.sandbox.Event)('paste', { target: field, preventDefault: () => { prevented = true } })
  field.dispatchEvent(paste)
  assert(prevented === true, 'the paste event must be cancelled')
  assert(hint().textContent.includes('不能粘贴'), `a paste must explain itself, got ${JSON.stringify(hint().textContent)}`)
  console.log('12. paste is cancelled with an explanation')

  // A value that appears without a keystroke is refused even if a paste event
  // was never delivered (drag-drop / autofill / extension).
  field.value = '中国人能飞'
  field.dispatchEvent(new (p.sandbox.Event)('keydown', { key: 'Enter', target: field }))
  assert(hint().textContent.includes('不能粘贴'), 'an untyped value must be refused')
  assert(field.value === '', 'the refused value must be cleared')
  assert(steps().done === undefined || steps().turns >= 0, 'no crash on the refused path')
  console.log('13. an untyped value is refused at submit even without a paste event')

  // Typing it properly still works and advances the counter.
  typeLineInto(p, '中国人能飞')
  const label = p.gateHost().allElements().find(node => node.textContent.includes('/ 3'))
  assert(label !== undefined && label.textContent.includes('1 / 3'), `typed line must advance, got ${JSON.stringify(label?.textContent)}`)
  console.log('14. a typed line still advances the challenge (1/3)')
}

/* ------------------------------------------------------------------ *
 * 2c. Full-width / half-width symbols are detected and folded
 * ------------------------------------------------------------------ */
{
  const p = page()
  p.api().gateNow()
  p.flushTimers()
  const hint = () => p.gateHost().querySelector('[data-hint]').textContent

  // A full-width comma is decoration: the line still transcribes the phrase.
  typeLineInto(p, '中国人能飞，')
  const label = p.gateHost().allElements().find(node => node.textContent.includes('/ 3'))
  assert(label !== undefined && label.textContent.includes('1 / 3'), `a full-width comma must not fail the line, got ${JSON.stringify(label?.textContent)}`)
  assert(hint().includes('全角'), `the dialog must report the fold, got ${JSON.stringify(hint())}`)
  console.log('15. a full-width comma is folded and reported')

  // A full-width sign is decoration too.
  typeLineInto(p, '中国人能飞＠')
  const label2 = p.gateHost().allElements().find(node => node.textContent.includes('/ 3'))
  assert(label2 !== undefined && label2.textContent.includes('2 / 3'), 'a full-width sign must not fail the line')
  console.log('16. a full-width sign is folded as well')

  // Strict mode refuses the width instead of folding it.
  const strict = page({ search: '?dsh-gate=1&dsh-width=strict' })
  strict.api().gateNow()
  strict.flushTimers()
  typeLineInto(strict, '中国人能飞，')
  const strictHint = strict.gateHost().querySelector('[data-hint]').textContent
  const strictLabel = strict.gateHost().allElements().find(node => node.textContent.includes('/ 3'))
  assert(strictHint.includes('全角'), `strict mode must name the problem, got ${JSON.stringify(strictHint)}`)
  assert(strictLabel !== undefined && strictLabel.textContent.includes('0 / 3'), 'strict mode must not advance')
  console.log('17. ?dsh-width=strict refuses full-width symbols instead of folding')
}

/* ------------------------------------------------------------------ *
 * 3. The captcha hold is required, and passing resets the counter
 * ------------------------------------------------------------------ */
{
  const p = page()
  const before = p.api().gate()
  p.api().gateNow()
  p.flushTimers()
  const gateHost = () => p.gateHost()
  const box = () => gateHost().querySelector('[data-box]')
  const passButton = () => gateHost().querySelector('[data-pass]')
  assert(box() !== null, 'the gate must render the captcha box')

  // Complete step one.
  for (let index = 0; index < 3; index += 1) typeLineInto(p, '中国人能飞')
  assert(box() !== null, 'the captcha box must survive the step-one re-render')

  // A short press does not verify: cancel the pending hold before it elapses.
  box().dispatchEvent(new (p.sandbox.Event)('pointerdown'))
  p.flushTimers({ only: 0 }) // do not let the 10s timer fire; emulate a quick release
  for (const [id, timer] of p.pendingTimers()) p.window.clearTimeout(id)
  const pointerup = [...(p.listeners.get('pointerup') ?? [])]
  for (const handler of pointerup) handler(new (p.sandbox.Event)('pointerup'))
  p.flushTimers()
  assert(passButton().disabled === true, 'a released hold must leave the button disabled')

  // A full hold verifies.
  box().dispatchEvent(new (p.sandbox.Event)('pointerdown'))
  p.flushTimers()
  assert(passButton().disabled === false, 'a completed 10s hold must enable the button')
  console.log('7. captcha: releasing early keeps it disabled, a full hold verifies')

  // Press the button: the gate closes, the pending challenge clears, the
  // counter resets to a fresh interval, and the pass count increments.
  passButton().dispatchEvent(new (p.sandbox.Event)('click'))
  p.flushTimers()
  const after = p.api().gate()
  assert(p.api().gate().open === false, 'passing must close the gate')
  assert(after.pending === false, 'passing must clear the pending challenge')
  assert(after.turns === 0, `passing must reset the counter, got ${after.turns}`)
  assert(after.passed === before.passed + 1, 'passing must increment the pass count')
  assert(after.nextAt === 4 || after.nextAt === 5, 'passing must draw a fresh interval')
  console.log(`8. passed: gate closed, counter reset, next gate in ${after.nextAt} turns (passed ${after.passed})`)
}

/* ------------------------------------------------------------------ *
 * 4. A reload cannot skip a pending challenge
 * ------------------------------------------------------------------ */
{
  const first = page()
  first.api().gateNow()
  first.flushTimers()
  assert(first.gateHost() !== undefined, 'gate is up before the reload')
  const pending = first.api().gate()
  assert(pending.pending === true, 'the pending challenge must persist to storage')

  // Emulate a reload: a fresh page seeded with the storage the gate wrote.
  const seed = Object.fromEntries(first.storage)
  const second = page({ storage: seed })
  const revived = second.api().gate()
  assert(revived.pending === true, 'the stored pending challenge must survive a reload')
  assert(second.gateHost() !== undefined, 'a reload must re-raise the pending gate, not skip it')
  console.log('9. a pending challenge survives a reload and comes straight back')
}

/* ------------------------------------------------------------------ *
 * 5. ?dsh-gate=0 disables the gate, ?dsh-gate=1 forces it
 * ------------------------------------------------------------------ */
{
  const offPage = page({ search: '?dsh-gate=0' })
  for (let index = 0; index < 8; index += 1) offPage.send(`turn ${index}`)
  assert(offPage.gateHost() === undefined, '?dsh-gate=0 must never raise the gate')
  assert(offPage.api().gate().raised === 0, '?dsh-gate=0 must not count a raise')
  console.log('10. ?dsh-gate=0 disables the periodic gate')

  const forced = page({ search: '?dsh-gate=1' })
  forced.send('first instruction')
  assert(forced.gateHost() !== undefined, '?dsh-gate=1 must raise the gate on the next send')
  console.log('11. ?dsh-gate=1 forces the gate on the next instruction')
}

console.log('\nall login-gate tests passed')
