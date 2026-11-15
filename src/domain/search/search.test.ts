import { beforeAll, describe, expect, it } from "vitest";
import { FIXTURE_BUILDING, OTHER_BUILDING } from "./__fixtures__/building";
import { buildSearchIndex } from "./index";
import type { SearchIndex } from "./index";
import { damerauLevenshtein, search } from "./search";

let index: SearchIndex;
beforeAll(() => {
  index = buildSearchIndex([FIXTURE_BUILDING, OTHER_BUILDING]);
});

const ids = (query: string, options?: Parameters<typeof search>[2]): string[] =>
  search(index, query, options).map((h) => h.entry.unitId);

describe("buildSearchIndex", () => {
  it("indexes destinations only and skips nameless, refless units", () => {
    const unitIds = index.entries.map((e) => e.unitId);
    expect(unitIds).not.toContain("u-walk");
    expect(unitIds).not.toContain("u-stairs");
    expect(unitIds).not.toContain("u-nameless");
    expect(unitIds).toContain("u-cafe");
    expect(index.entries).toHaveLength(19);
  });

  it("precomputes folded terms and ref keys", () => {
    const e = index.entries.find((x) => x.unitId === "u-132");
    expect(e?.refKey).toBe("1:32");
    expect(e?.terms).toEqual([
      "karman todor nagyeloado",
      "auditorium maximum",
      "audmax",
    ]);
    expect(e?.nameTermCount).toBe(2);
  });
});

describe("search by room number", () => {
  it.each([
    "F.06",
    "f6",
    "F 06",
    "f.6",
    "BA.F.06",
    "ba f06",
    "ba-f.6",
    "BA.F.06.Terem",
  ])("%s finds F.06 first", (q) => {
    const hits = search(index, q, { buildingId: "ba" });
    expect(hits[0].entry.ref).toBe("F.06");
    expect(hits[0]).toMatchObject({ score: 100, match: "ref" });
  });

  it.each(["1.32", "132", "1 32", "ba132", "BA.1.32", "BA.1.32.Audmax"])(
    "%s finds 1.32",
    (q) => {
      expect(ids(q)[0]).toBe("u-132");
    },
  );

  it("finds 2.02 as 202", () => {
    expect(ids("202")[0]).toBe("u-202");
  });

  it("returns the same ref in every building", () => {
    expect(ids("f.1")).toEqual(expect.arrayContaining(["u-f01", "u-bb-lab"]));
    expect(ids("f.1", { buildingId: "bb" })).toEqual(["u-bb-lab"]);
  });
});

describe("prefix while typing", () => {
  it("f.0 lists F.01 to F.09 in order", () => {
    const hits = search(index, "f.0", { buildingId: "ba" });
    expect(hits.map((h) => h.entry.ref)).toEqual(
      Array.from({ length: 9 }, (_, i) => `F.0${i + 1}`),
    );
    expect(hits.every((h) => h.match === "ref_prefix" && h.score === 80)).toBe(
      true,
    );
  });

  it("1.3 matches 1.3x only", () => {
    expect(ids("1.3")).toEqual(["u-132"]);
    expect(ids("2.1")).toEqual(["u-210", "u-211", "u-212"]);
  });

  it("a bare level lists its rooms in order, refless entries last", () => {
    expect(
      search(index, "2.", { buildingId: "ba" }).map((h) => h.entry.ref),
    ).toEqual(["2.02", "2.10", "2.11", "2.12"]);
    expect(search(index, "f", { buildingId: "ba" })[0].entry.ref).toBe("F.01");
  });

  it("an exact ref outranks prefix matches", () => {
    const hits = search(index, "2.1", { buildingId: "ba" });
    expect(hits.map((h) => h.entry.ref)).toEqual(["2.10", "2.11", "2.12"]);
    const exact = search(index, "f.1", { buildingId: "ba" });
    expect(exact[0]).toMatchObject({ match: "ref", score: 100 });
  });
});

describe("text search", () => {
  it("folds accents in both directions", () => {
    expect(ids("mosdo")).toEqual(ids("MOSDÓ"));
    expect(ids("karman")).toContain("u-132");
    expect(ids("nagyelőadó")).toContain("u-132");
  });

  it("finds the auditorium by alias, name and English name", () => {
    expect(search(index, "audmax")[0]).toMatchObject({
      score: 90,
      match: "alias",
    });
    expect(search(index, "AudMax")[0].entry.unitId).toBe("u-132");
    expect(search(index, "auditorium maximum")[0]).toMatchObject({
      score: 90,
      match: "name",
    });
  });

  it("matches every query word as a word prefix", () => {
    const hit = search(index, "karm tod")[0];
    expect(hit).toMatchObject({ score: 70, match: "name" });
    expect(hit.entry.unitId).toBe("u-132");
  });

  it("matches the occupant", () => {
    expect(ids("nik")).toEqual(["u-210", "u-211", "u-212"]);
  });

  it("matches a query contained inside a word", () => {
    const hit = search(index, "osd")[0];
    expect(hit).toMatchObject({ score: 45 });
  });
});

describe("category synonyms", () => {
  it("wc finds both restrooms", () => {
    const hits = search(index, "wc");
    expect(hits.map((h) => h.entry.unitId).sort()).toEqual([
      "u-wc-1",
      "u-wc-f",
    ]);
    expect(hits.every((h) => h.match === "category" && h.score === 60)).toBe(
      true,
    );
  });

  it("bufe finds the cafe, folded name equality wins", () => {
    expect(search(index, "bufe")[0]).toMatchObject({
      score: 90,
      match: "name",
    });
    expect(ids("coffee")).toEqual(["u-cafe"]);
  });

  it("maps Hungarian and English keywords", () => {
    expect(ids("labor")).toEqual(
      expect.arrayContaining(["u-210", "u-211", "u-212"]),
    );
    expect(ids("iroda")).toEqual(expect.arrayContaining(["u-a01", "u-202"]));
    expect(ids("akadalymentes mosdo")[0]).toBe("u-wc-1");
    expect(ids("parkolo")).toEqual([]);
  });

  it("does not index elevators, so lift finds nothing", () => {
    expect(ids("lift")).toEqual([]);
  });

  it("a keyword prefix of three letters matches the category", () => {
    expect(ids("mos").sort()).toEqual(["u-wc-1", "u-wc-f"]);
  });
});

describe("fuzzy", () => {
  it("tolerates a transposition in audmxa", () => {
    expect(search(index, "audmxa")[0]).toMatchObject({
      score: 25,
      match: "fuzzy",
    });
    expect(ids("audmxa")[0]).toBe("u-132");
  });

  it("tolerates typos across words in karman todro", () => {
    expect(ids("karman todro")).toEqual(["u-132"]);
  });

  it("does not guess on short queries", () => {
    expect(ids("lbr")).toEqual([]);
  });

  it("allows two typos only from eight letters", () => {
    expect(ids("nagyelaodo")).toContain("u-132");
    expect(ids("audmaxxxxx")).toEqual([]);
  });
});

describe("ranking, limit and edge cases", () => {
  it("orders by score, then ref before refless, then level and number", () => {
    const hits = search(index, "mosdo", { buildingId: "ba" });
    expect(hits[0].entry.unitId).toBe("u-wc-f");
    const scores = hits.map((h) => h.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it("puts entries with a ref before those without on equal score", () => {
    const hits = search(index, "iroda", { buildingId: "ba" });
    expect(hits.map((h) => h.entry.ref)).toEqual(["A.01", "2.02"]);
  });

  it("orders levels A, F, 1, 2", () => {
    const hits = search(index, "iroda");
    expect(hits.map((h) => h.entry.levelId)).toEqual(["A", "2"]);
    const levelsOfAll = search(index, "labor", { buildingId: "ba" }).map(
      (h) => h.entry.ref,
    );
    expect(levelsOfAll).toEqual(["2.10", "2.11", "2.12"]);
  });

  it("applies the limit, defaulting to 20", () => {
    expect(search(index, "f", { limit: 3 })).toHaveLength(3);
    const big = buildSearchIndex([
      {
        ...FIXTURE_BUILDING,
        units: Array.from({ length: 30 }, (_, i) => ({
          ...FIXTURE_BUILDING.units[1],
          id: `x${i}`,
          ref: `3.${String(i).padStart(2, "0")}`,
        })),
      },
    ]);
    expect(search(big, "3.")).toHaveLength(20);
  });

  it("returns nothing for empty, blank or non-matching queries", () => {
    expect(search(index, "")).toEqual([]);
    expect(search(index, "   ")).toEqual([]);
    expect(search(index, "zzzzzz")).toEqual([]);
    expect(search(index, "9.99")).toEqual([]);
  });

  it("filters by building", () => {
    expect(ids("fizika")).toEqual(["u-bb-lab"]);
    expect(ids("fizika", { buildingId: "ba" })).toEqual([]);
  });
});

describe("damerauLevenshtein", () => {
  it("counts transpositions as one edit", () => {
    expect(damerauLevenshtein("audmxa", "audmax")).toBe(1);
    expect(damerauLevenshtein("kitten", "sitting")).toBe(3);
    expect(damerauLevenshtein("", "abc")).toBe(3);
  });
});
