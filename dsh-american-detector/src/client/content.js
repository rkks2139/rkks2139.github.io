/**
 * Content check: "does this conversation read like it happens outside China?"
 *
 * An opt-in, fully transparent keyword rule. It looks for vocabulary that is
 * ordinary in American daily life and absent from Chinese daily life (tipping,
 * miles, Fahrenheit, ZIP codes…), and for Chinese daily-life vocabulary that
 * argues the other way (扫码、外卖、高铁…). Matched foreign terms add weight,
 * matched Chinese terms subtract it, and crossing the threshold forces the
 * American verdict.
 *
 * This is a joke rule, not a fact checker: the list below IS the rule, nothing
 * is inferred, nothing leaves the machine, and every entry can be edited here.
 * It is off by default; `?dsh-content=1` turns it on.
 */
import { normalizeLine } from './width.js'

/** Sum of weights at or above which the content check forces the verdict. */
export const CONTENT_THRESHOLD = 1.0

/**
 * Foreign daily-life markers: things a conversation set in China would not say.
 * `weight` is added when the pattern matches.
 */
export const FOREIGN_MARKERS = [
  { pattern: /小费|给服务生|tips?\b/i, label: '小费', weight: 1.0 },
  { pattern: /支票|checkbook|paycheck/i, label: '支票', weight: 0.6 },
  { pattern: /邮编|zip ?code|zip ?code/i, label: '邮编', weight: 0.6 },
  { pattern: /英里|\bmiles?\b/i, label: '英里', weight: 0.6 },
  { pattern: /华氏|fahrenheit/i, label: '华氏度', weight: 0.8 },
  { pattern: /加仑|gallons?/i, label: '加仑', weight: 0.6 },
  { pattern: /英尺|\bfeet\b|\bfoot\b/i, label: '英尺', weight: 0.4 },
  { pattern: /\bpounds?\b|磅/i, label: '磅', weight: 0.4 },
  { pattern: /夏令时|daylight saving/i, label: '夏令时', weight: 0.6 },
  { pattern: /感恩节|thanksgiving/i, label: '感恩节', weight: 0.6 },
  { pattern: /黑色星期五|black friday/i, label: '黑色星期五', weight: 0.6 },
  { pattern: /社安号|\bssn\b/i, label: '社安号', weight: 0.8 },
  { pattern: /\birs\b|联邦税|报税季/i, label: '联邦税务', weight: 0.8 },
  { pattern: /路考|parallel parking|侧方停车考试/i, label: '路考', weight: 0.4 },
]

/**
 * Chinese daily-life markers: their presence argues against the content being
 * about life elsewhere. Each match subtracts a little, and the total deduction
 * is capped so they cannot fully cancel an explicit foreign marker.
 */
export const CHINESE_MARKERS = [
  { pattern: /微信|支付宝|扫码|二维码/, label: '移动支付' },
  { pattern: /外卖|饿了么|美团/, label: '外卖' },
  { pattern: /快递|菜鸟驿站|丰巢/, label: '快递柜' },
  { pattern: /高铁|地铁|公交|共享单车/, label: '公共交通' },
  { pattern: /便利店|早市|菜市场|小吃街/, label: '街边生活' },
]

/** How much one Chinese marker subtracts. */
const CHINESE_MARKER_CREDIT = 0.3
/** The most the Chinese markers may subtract in total. */
const CHINESE_MARKER_CREDIT_CAP = 1.2

/**
 * Inspect one instruction for content that does not fit Chinese daily life.
 * @param text - the submitted instruction.
 * @returns { matched, credit, total, mismatch, detail, reasons }.
 */
export function detectContentMismatch(text) {
  const line = normalizeLine(text)
  const matched = FOREIGN_MARKERS.filter(entry => entry.pattern.test(line))
  const chinese = CHINESE_MARKERS.filter(entry => entry.pattern.test(line))
  const foreign = matched.reduce((sum, entry) => sum + entry.weight, 0)
  const credit = Math.min(CHINESE_MARKER_CREDIT_CAP, chinese.length * CHINESE_MARKER_CREDIT)
  const total = Number((foreign - credit).toFixed(2))
  const reasons = matched.map(entry => entry.label)
  return {
    matched: reasons,
    chinese: chinese.map(entry => entry.label),
    credit: Number(credit.toFixed(2)),
    total,
    mismatch: total >= CONTENT_THRESHOLD,
    detail: reasons.length === 0
      ? '未发现与中国日常不符的内容'
      : `命中：${reasons.join('、')}${chinese.length > 0 ? `（中文生活项抵扣 ${credit.toFixed(1)}）` : ''}`,
  }
}
