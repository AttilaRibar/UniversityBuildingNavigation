import { describe, expect, it } from "vitest";
import { canonicalRef, foldText, refPrefixKey } from "./normalize";

describe("foldText", () => {
  it("lower-cases, strips accents and collapses whitespace", () => {
    expect(foldText("  Mosdó \t Ő-Ű öü  ")).toBe("mosdo o-u ou");
    expect(foldText("Kármán Tódor nagyelőadó")).toBe("karman todor nagyeloado");
  });
});

describe("canonicalRef", () => {
  it.each([
    ["F.06", "f:6"],
    ["f6", "f:6"],
    ["F 06", "f:6"],
    ["f.6", "f:6"],
    ["BA.F.06", "f:6"],
    ["ba-f.6", "f:6"],
    ["ba f06", "f:6"],
    ["1.32", "1:32"],
    ["132", "1:32"],
    ["1 32", "1:32"],
    ["ba132", "1:32"],
    ["BA.1.32", "1:32"],
    ["BA.1.32.Audmax", "1:32"],
    ["BA-2.10", "2:10"],
    ["2.02", "2:2"],
    ["202", "2:2"],
    ["A.01", "a:1"],
    ["3.17", "3:17"],
    ["4.01", "4:1"],
    ["428", "4:28"],
    ["BA.4.12", "4:12"],
  ])("%s -> %s", (input, expected) => {
    expect(canonicalRef(input)).toBe(expected);
  });

  it.each([
    "audmax",
    "mosdo",
    "12345",
    "",
    "  ",
    "f",
    "13",
    "0.01",
    "bufe",
    "ba",
  ])("rejects %j", (input) => {
    expect(canonicalRef(input)).toBeNull();
  });

  it("honours custom building codes", () => {
    expect(canonicalRef("xy.1.32", ["xy"])).toBe("1:32");
    expect(canonicalRef("ba.1.32", ["xy"])).toBeNull();
  });
});

describe("refPrefixKey", () => {
  it.each([
    ["f.0", { level: "f", digits: "0" }],
    ["f", { level: "f", digits: "" }],
    ["1.3", { level: "1", digits: "3" }],
    ["2.", { level: "2", digits: "" }],
    ["BA.F.0", { level: "f", digits: "0" }],
  ])("%s", (input, expected) => {
    expect(refPrefixKey(input)).toEqual(expected);
  });

  it.each(["audmax", "", "f.123", "0."])("rejects %j", (input) => {
    expect(refPrefixKey(input)).toBeNull();
  });
});
