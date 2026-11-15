/** Level prefixes in vertical order: basement, ground, 1st, 2nd, 3rd floor. */
export const LEVEL_ORDER: readonly string[] = ["a", "f", "1", "2", "3"];

const DEFAULT_BUILDING_CODES: readonly string[] = ["ba"];

const SEP = "[\\s.\\-_/]";

/** Letter level (`f6`, `f.06`) or digit level with a separator (`1.32`, `1 3`) or three digits (`132`). */
const REF_RE = new RegExp(
  `^(?:([af])${SEP}*(\\d{1,2})|([1-3])(?:${SEP}+(\\d{1,2})|(\\d{2})))(?!\\d)(?:${SEP}+.*)?$`,
);

const REF_PREFIX_RE = new RegExp(`^([af1-3])${SEP}*(\\d{0,2})$`);

export interface RefPrefix {
  level: string;
  /** Leading digits of the zero-padded two-digit room number typed so far. */
  digits: string;
}

/** Lower-case, strip diacritics (incl. ő/ű, ö/ü) and collapse whitespace. */
export function foldText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Removes a leading building code (`ba.`, `ba-`, `ba `, or glued as in `ba132`) from folded input. */
function stripBuildingCode(folded: string, codes: readonly string[]): string {
  for (const code of codes) {
    if (folded.startsWith(code) && folded.length > code.length) {
      return folded.slice(code.length).replace(new RegExp(`^${SEP}+`), "");
    }
  }
  return folded;
}

/**
 * Canonical compact key `"<level>:<number>"` for anything that looks like a
 * room number, or null. Trailing words (`BA.1.32.Audmax`) are ignored.
 */
export function canonicalRef(
  input: string,
  buildingCodes: readonly string[] = DEFAULT_BUILDING_CODES,
): string | null {
  const m = REF_RE.exec(stripBuildingCode(foldText(input), buildingCodes));
  if (!m) return null;
  const level = m[1] ?? m[3];
  const digits = m[2] ?? m[4] ?? m[5];
  return `${level}:${Number.parseInt(digits, 10)}`;
}

/** Incomplete room number while typing: `f.0`, `f`, `1.3`, `2.`; null otherwise. */
export function refPrefixKey(
  input: string,
  buildingCodes: readonly string[] = DEFAULT_BUILDING_CODES,
): RefPrefix | null {
  const m = REF_PREFIX_RE.exec(
    stripBuildingCode(foldText(input), buildingCodes),
  );
  return m ? { level: m[1], digits: m[2] } : null;
}
