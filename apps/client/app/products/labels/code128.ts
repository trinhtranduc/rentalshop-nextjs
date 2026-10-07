/**
 * Code 128, code set B (#623): printable ASCII 32–126, the set every handheld scanner reads.
 * Pure: text → symbol values → bar/space widths. The label draws the bars as SVG rects.
 */

/**
 * Element widths (bar, space, bar, space, bar, space) of symbol values 0–105, then STOP (106,
 * 7 elements). Every symbol is 11 modules wide (STOP 13) and starts with a bar.
 */
export const PATTERNS: readonly string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];

export const START_B = 104;
export const STOP = 106;
/** Blank modules each side; scanners need at least 10. */
export const QUIET_ZONE = 10;

/** True when every character is printable ASCII (space … ~) and the text is not empty. */
export function isCode128B(text: string): boolean {
  if (!text) return false;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 32 || c > 126) return false;
  }
  return true;
}

/** Start B, data, checksum, stop — or null when the text cannot be encoded in set B. */
export function code128Values(text: string): number[] | null {
  if (!isCode128B(text)) return null;
  const data = Array.from(text, (ch) => ch.charCodeAt(0) - 32);
  let sum = START_B;
  data.forEach((v, i) => {
    sum += v * (i + 1);
  });
  return [START_B, ...data, sum % 103, STOP];
}

export interface Code128Bars {
  /** Bars as [x, width] in modules, quiet zone included in x. */
  bars: Array<[number, number]>;
  /** Total width in modules, both quiet zones included. */
  width: number;
}

/** Bars to draw for `text`, or null when it is not encodable. */
export function code128Bars(text: string): Code128Bars | null {
  const values = code128Values(text);
  if (!values) return null;
  const bars: Array<[number, number]> = [];
  let x = QUIET_ZONE;
  for (const v of values) {
    const p = PATTERNS[v];
    for (let i = 0; i < p.length; i++) {
      const w = Number(p[i]);
      if (i % 2 === 0) bars.push([x, w]);
      x += w;
    }
  }
  return { bars, width: x + QUIET_ZONE };
}
