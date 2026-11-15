import type { CampusBuilding } from "@/domain/campus/model";
import { foldText } from "@/domain/search";
import { campusBuildings, facultyByAbbr } from "@/data/campus";

interface IndexedBuilding {
  building: CampusBuilding;
  code: string;
  nameWords: readonly string[];
  /** Words of everything worth matching: code, names, faculties, address, campus. */
  allWords: readonly string[];
}

const wordsOf = (s: string): string[] => foldText(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean);

const index: readonly IndexedBuilding[] = campusBuildings.map((b) => {
  const faculties = b.faculties.flatMap((abbr) => {
    const f = facultyByAbbr(abbr);
    return f ? [abbr, f.name.hu, f.name.en] : [abbr];
  });
  const nameWords = wordsOf(`${b.code ?? ""} ${b.name.hu} ${b.name.en}`);
  return {
    building: b,
    code: foldText(b.code ?? ""),
    nameWords,
    allWords: [...nameWords, ...wordsOf([...faculties, b.address, b.district, b.campus.name.hu, b.campus.name.en].join(" "))],
  };
});

const matchesAll = (query: readonly string[], words: readonly string[]) => query.every((q) => words.some((w) => w.startsWith(q)));

/**
 * Buildings where every query word starts some word of the name, code,
 * faculty (abbreviation or name), address or campus; accent-insensitive.
 * Exact code matches come first, then name matches.
 */
export function searchBuildings(query: string): CampusBuilding[] {
  const words = wordsOf(query);
  if (words.length === 0) return [];
  const scored = index.flatMap((entry) => {
    if (!matchesAll(words, entry.allWords)) return [];
    const exactCode = words.length === 1 && words[0] === entry.code;
    return [{ building: entry.building, score: exactCode ? 2 : matchesAll(words, entry.nameWords) ? 1 : 0 }];
  });
  return scored.sort((a, b) => b.score - a.score).map((s) => s.building);
}
