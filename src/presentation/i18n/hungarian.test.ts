import { describe, expect, it } from "vitest";
import { definiteArticle, elativeSuffix } from "./hungarian";

describe("elativeSuffix", () => {
  it.each([
    [1, "ből"],
    [2, "ből"],
    [3, "ból"],
    [4, "ből"],
    [5, "ből"],
    [6, "ból"],
    [7, "ből"],
    [8, "ból"],
    [9, "ből"],
    [10, "ből"],
    [12, "ből"],
    [13, "ból"],
    [20, "ból"],
    [30, "ból"],
    [40, "ből"],
    [60, "ból"],
    [100, "ból"],
    [1000, "ből"],
  ] as const)("%i-%s", (n, suffix) => {
    expect(elativeSuffix(n)).toBe(suffix);
  });
});

describe("definiteArticle", () => {
  it.each([
    [1, "az"],
    [4, "a"],
    [5, "az"],
    [10, "a"],
    [11, "a"],
    [50, "az"],
    [100, "a"],
    [500, "az"],
    [1000, "az"],
    [2000, "a"],
  ] as const)("%s %i", (n, article) => {
    expect(definiteArticle(n)).toBe(article);
  });
});
