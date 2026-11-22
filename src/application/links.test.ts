import { describe, expect, it } from "vitest";
import { buildingHref, reportProblemHref } from "./links";

describe("buildingHref", () => {
  it("links to the indoor map with the route options", () => {
    expect(buildingHref("ba")).toBe("/building/ba/");
    expect(buildingHref("ba", { to: "F.06", from: "doberdo-entrance", stepFree: true })).toBe(
      "/building/ba/?to=F.06&from=doberdo-entrance&sf=1",
    );
  });
});

describe("reportProblemHref", () => {
  it("opens a pre-filled issue with the page link", () => {
    const url = new URL(
      reportProblemHref("https://github.com/acme/repo/", { subject: "BA – 3.14", pageUrl: "https://example.org/building/ba/?to=3.14" }),
    );
    expect(url.origin + url.pathname).toBe("https://github.com/acme/repo/issues/new");
    expect(url.searchParams.get("title")).toBe("Térképhiba: BA – 3.14");
    expect(url.searchParams.get("body")).toContain("Link: https://example.org/building/ba/?to=3.14");
  });
});
