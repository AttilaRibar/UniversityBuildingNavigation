import type { SearchEntry, SearchIndex } from "./index";
import { LEVEL_ORDER, canonicalRef, foldText, refPrefixKey } from "./normalize";
import type { RefPrefix } from "./normalize";
import { CATEGORY_KEYWORDS } from "./synonyms";
import type { UnitCategory } from "../indoor/model";

export type MatchKind =
  | "ref"
  | "ref_prefix"
  | "name"
  | "alias"
  | "category"
  | "fuzzy";

export interface SearchHit {
  entry: SearchEntry;
  score: number;
  match: MatchKind;
}

export interface SearchOptions {
  limit?: number;
  buildingId?: string;
}

interface Score {
  score: number;
  match: MatchKind;
}

/** Everything derived from the query once, so per-entry scoring stays cheap. */
interface Query {
  text: string;
  words: readonly string[];
  refKey: string | null;
  prefix: RefPrefix | null;
  categories: ReadonlySet<UnitCategory>;
}

const DEFAULT_LIMIT = 20;
/** Shortest query that may match a category keyword by prefix (`mos` -> `mosdo`). */
const MIN_KEYWORD_PREFIX = 3;

const wordsOf = (s: string): string[] =>
  s.split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/** Optimal-string-alignment distance: insert, delete, substitute, adjacent swap. */
export function damerauLevenshtein(a: string, b: string): number {
  let prev2: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let d = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d = Math.min(d, prev2[j - 2] + 1);
      }
      row.push(d);
    }
    prev2 = prev;
    prev = row;
  }
  return prev[b.length];
}

/** Typo budget by word length; short words must match exactly. */
function maxTypos(length: number): number {
  if (length >= 8) return 2;
  return length >= 4 ? 1 : 0;
}

function buildQuery(raw: string): Query {
  const text = foldText(raw);
  const categories = new Set<UnitCategory>();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as [
    UnitCategory,
    readonly string[],
  ][]) {
    const hit = keywords.some(
      (k) =>
        k === text || (text.length >= MIN_KEYWORD_PREFIX && k.startsWith(text)),
    );
    if (hit) categories.add(category);
  }
  return {
    text,
    words: wordsOf(text),
    refKey: canonicalRef(text),
    prefix: refPrefixKey(text),
    categories,
  };
}

function matchesRefPrefix(
  refKey: string | null,
  prefix: RefPrefix | null,
): boolean {
  if (refKey === null || prefix === null) return false;
  const [level, number] = refKey.split(":");
  return (
    level === prefix.level && number.padStart(2, "0").startsWith(prefix.digits)
  );
}

/** Every query word is a prefix of some word of the term. */
const isWordPrefixMatch = (words: readonly string[], term: string): boolean => {
  const termWords = wordsOf(term);
  return words.every((w) => termWords.some((tw) => tw.startsWith(w)));
};

/** Every query word is a prefix of, or within the typo budget of, some word of the term. */
const isFuzzyMatch = (words: readonly string[], term: string): boolean => {
  const termWords = wordsOf(term);
  return words.every((w) => {
    const budget = maxTypos(w.length);
    return termWords.some(
      (tw) =>
        tw.startsWith(w) ||
        (budget > 0 &&
          Math.abs(tw.length - w.length) <= budget &&
          damerauLevenshtein(w, tw) <= budget),
    );
  });
};

function scoreEntry(entry: SearchEntry, q: Query): Score | null {
  const { terms, nameTermCount } = entry;
  const kindOf = (termIndex: number): MatchKind =>
    termIndex < nameTermCount ? "name" : "alias";

  if (q.refKey !== null && q.refKey === entry.refKey)
    return { score: 100, match: "ref" };

  const equalIndex = terms.indexOf(q.text);
  if (equalIndex >= 0) return { score: 90, match: kindOf(equalIndex) };

  if (matchesRefPrefix(entry.refKey, q.prefix))
    return { score: 80, match: "ref_prefix" };

  const prefixIndex = terms.findIndex((t) => isWordPrefixMatch(q.words, t));
  if (prefixIndex >= 0) return { score: 70, match: kindOf(prefixIndex) };

  if (q.categories.has(entry.category)) return { score: 60, match: "category" };

  const containedIndex = terms.findIndex((t) => t.includes(q.text));
  if (containedIndex >= 0) return { score: 45, match: kindOf(containedIndex) };

  if (terms.some((t) => isFuzzyMatch(q.words, t)))
    return { score: 25, match: "fuzzy" };
  return null;
}

/** Entries with a room number first, then by level (A, F, 1, 2, 3), room number and name. */
function compareEntries(a: SearchEntry, b: SearchEntry): number {
  if ((a.refKey === null) !== (b.refKey === null))
    return a.refKey === null ? 1 : -1;
  if (a.refKey !== null && b.refKey !== null) {
    const [levelA, numberA] = a.refKey.split(":");
    const [levelB, numberB] = b.refKey.split(":");
    const byLevel = LEVEL_ORDER.indexOf(levelA) - LEVEL_ORDER.indexOf(levelB);
    if (byLevel !== 0) return byLevel;
    const byNumber = Number(numberA) - Number(numberB);
    if (byNumber !== 0) return byNumber;
  }
  return (
    (a.name?.hu ?? "").localeCompare(b.name?.hu ?? "", "hu") ||
    a.unitId.localeCompare(b.unitId)
  );
}

/** Ranked destination search; cheap enough to run on every keystroke. */
export function search(
  index: SearchIndex,
  query: string,
  options: SearchOptions = {},
): SearchHit[] {
  const q = buildQuery(query);
  if (q.text === "") return [];
  const { limit = DEFAULT_LIMIT, buildingId } = options;

  const hits: SearchHit[] = [];
  for (const entry of index.entries) {
    if (buildingId !== undefined && entry.buildingId !== buildingId) continue;
    const scored = scoreEntry(entry, q);
    if (scored) hits.push({ entry, ...scored });
  }
  hits.sort((a, b) => b.score - a.score || compareEntries(a.entry, b.entry));
  return hits.slice(0, limit);
}
