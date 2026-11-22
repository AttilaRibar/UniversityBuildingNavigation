/**
 * Hungarian grammar helpers for numbers written as digits.
 *
 * A suffix or article after a number follows how the number is *read out*,
 * e.g. "a 10-ből" (tízből) but "a 20-ból" (húszból), "az 5" (öt) but "a 4" (négy).
 * Correct for 0–9999, which covers every count the app shows.
 */

/** Units digit 1–9 read with a back vowel: három, hat, nyolc. */
const BACK_UNITS = new Set([3, 6, 8]);
/** Tens digit 1–9 read with a back vowel: húsz, harminc, hatvan, nyolcvan. */
const BACK_TENS = new Set([2, 3, 6, 8]);

/** "ból" or "ből" for the elative case of `n` ("a 10-ből", "a 6-ból"). */
export function elativeSuffix(n: number): "ból" | "ből" {
  const value = Math.abs(Math.trunc(n));
  const units = value % 10;
  if (units !== 0) return BACK_UNITS.has(units) ? "ból" : "ből";
  const tens = Math.floor(value / 10) % 10;
  if (tens !== 0) return BACK_TENS.has(tens) ? "ból" : "ből";
  if (value % 1000 !== 0) return "ból"; // száz
  if (value === 0) return "ból"; // nulla
  return "ből"; // ezer
}

/** "a" or "az" before `n`: "az" when the spoken number starts with a vowel (egy, öt, ötven, ezer…). */
export function definiteArticle(n: number): "a" | "az" {
  const digits = String(Math.abs(Math.trunc(n)));
  const first = digits[0];
  switch (digits.length) {
    case 1:
      return first === "1" || first === "5" ? "az" : "a";
    case 2:
    case 3:
      return first === "5" ? "az" : "a"; // ötven…, ötszáz…; tíz/tizen…, száz… start with a consonant
    case 4:
      return first === "1" || first === "5" ? "az" : "a"; // ezer…, ötezer…
    default:
      return "a";
  }
}
