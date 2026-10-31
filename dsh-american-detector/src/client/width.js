/**
 * Full-width / half-width symbol handling.
 *
 * Users type the same thing two ways depending on the IME: `test` and `ｔｅｓｔ`
 * are one word, and a trailing `,` or `，` is one comma. The matchers in this
 * plugin compare user input to fixed strings, so they normalize width first and
 * report what they folded, instead of silently rejecting a correct answer typed
 * with the other width.
 *
 * "Symbol" here means punctuation and signs (`\p{P}` / `\p{S}`), not letters:
 * 中国人能飞 stays intact, `＠` becomes `@`, `，` becomes `,`.
 */

/** Code points whose full-width forms live 0xFEE0 above their ASCII counterparts. */
const FULL_WIDTH_START = 0xff01
const FULL_WIDTH_END = 0xff5e
/** The ideographic space. */
const IDEOGRAPHIC_SPACE = 0x3000

/**
 * Fold full-width ASCII forms and the ideographic space to their half-width
 * equivalents. Everything else (including CJK text and CJK punctuation) is
 * returned unchanged; the symbol strippers remove punctuation afterwards.
 * @param value - raw user input.
 * @returns the width-folded string.
 */
export function toHalfWidth(value) {
  let result = ''
  for (const character of String(value ?? '')) {
    const code = character.codePointAt(0)
    if (code >= FULL_WIDTH_START && code <= FULL_WIDTH_END) result += String.fromCodePoint(code - 0xfee0)
    else if (code === IDEOGRAPHIC_SPACE) result += ' '
    else result += character
  }
  return result
}

/**
 * Characters that read as full-width **symbols**: the punctuation and sign
 * blocks of the FF00 range plus CJK punctuation. Full-width letters and digits
 * are deliberately excluded — they are folded for comparison, but they are not
 * symbols, and calling them one would make the reports wrong.
 */
const FULL_WIDTH_SYMBOL = /[\uFF01-\uFF0F\uFF1A-\uFF20\uFF3B-\uFF40\uFF5B-\uFF5E\u3000-\u303F\uFE30-\uFE4F\uFF5F-\uFF9F]/u
/** Full-width ASCII letters and digits (foldable, but not symbols). */
const FULL_WIDTH_ALNUM = /[\uFF10-\uFF19\uFF21-\uFF3A\uFF41-\uFF5A]/u
/** ASCII punctuation and signs, the form full-width symbols fold into. */
const HALF_WIDTH_SYMBOL = /[!-/:-@[-`{-~]/u

/**
 * Inspect the widths in a raw string.
 *
 * Reports the original widths, before any folding, so a caller can tell a user
 * "you typed it with full-width punctuation" instead of failing silently.
 * @param value - raw user input.
 * @returns { fullWidth, fullWidthAlnum, halfWidth, mixed, count }.
 */
export function analyzeWidth(value) {
  const fullWidth = []
  const fullWidthAlnum = []
  const halfWidth = new Set()
  for (const character of String(value ?? '')) {
    if (FULL_WIDTH_SYMBOL.test(character)) fullWidth.push(character)
    else if (FULL_WIDTH_ALNUM.test(character)) fullWidthAlnum.push(character)
    else if (HALF_WIDTH_SYMBOL.test(character)) halfWidth.add(character)
  }
  return {
    fullWidth,
    fullWidthAlnum,
    halfWidth: [...halfWidth],
    mixed: fullWidth.length > 0 && halfWidth.size > 0,
    count: fullWidth.length,
  }
}

/** Whether a raw string contains any full-width symbol. */
export function hasFullWidthSymbol(value) {
  return FULL_WIDTH_SYMBOL.test(String(value ?? ''))
}

/**
 * Fold width, collapse the ideographic space, and trim.
 * @param value - raw user input.
 * @returns the normalized line.
 */
export function normalizeLine(value) {
  return toHalfWidth(value).replace(/\u3000/g, ' ').trim()
}

/**
 * Normalize and drop every space, punctuation mark and sign.
 * Used where the content matters and the decoration does not ("中国人能飞。").
 * @param value - raw user input.
 * @returns the content-only string.
 */
export function stripAllSymbols(value) {
  return normalizeLine(value).replace(/[\s\p{P}\p{S}]/gu, '')
}

/**
 * Normalize and drop trailing spaces, punctuation and signs only.
 * Used where the whole line must match a word ("test" but not "test new").
 * @param value - raw user input.
 * @returns the line without trailing decoration.
 */
export function stripTrailingSymbols(value) {
  return normalizeLine(value).replace(/[\s\p{P}\p{S}]+$/gu, '')
}
