import { describe, expect, it } from "vitest";
import { building } from "@/data/buildings/ba";
import { buildRouteGraph, buildSteps, condenseSteps, findRoute, type RoutePoint } from "@/domain/routing";
import { buildingEn, buildingHu } from "@/presentation/i18n/messages/building";
import { describeStep, formatDistance, formatDuration, type NavStep, type StepTextContext } from "./stepText";

const origin: RoutePoint = { type: "anchor", anchorId: "main-entrance" };
const graph = buildRouteGraph(building);

function cardsFor(unitId: string, locale: "hu" | "en", stepFree = false) {
  const destination: RoutePoint = { type: "unit", unitId };
  const route = findRoute(building, graph, origin, destination, { stepFree })!;
  const steps = condenseSteps(buildSteps(building, route));
  const ctx: StepTextContext = { building, messages: locale === "hu" ? buildingHu : buildingEn, text: (v) => v[locale], origin, destination };
  return steps.map((_, i) => describeStep(steps, i, ctx));
}

describe("describeStep", () => {
  it("starts at the origin and ends at the destination, in Hungarian", () => {
    const cards = cardsFor("2.14", "hu");
    expect(cards[0].title).toBe("Indulj innen: Főbejárat (Bécsi út)");
    expect(cards.at(-1)).toMatchObject({ icon: "arrive", title: "Megérkeztél: 2.14" });
    expect(cards.at(-1)!.subtitle).toMatch(/^Az ajtó /);
  });

  it("names the target level on connector cards", () => {
    const stairs = cardsFor("2.14", "hu").filter((c) => c.icon === "stairs_up");
    expect(stairs.length).toBeGreaterThan(0);
    expect(stairs.at(-1)).toMatchObject({ title: "Lépcsőn fel", subtitle: "Cél: 2. emelet" });
  });

  it("uses the lift on a step-free route and says so in English", () => {
    const cards = cardsFor("F.06", "en", true);
    expect(cards.some((c) => c.icon === "elevator_up" && c.title === "Take the lift up" && c.subtitle === "To: Ground floor")).toBe(true);
    expect(cards.some((c) => c.icon.startsWith("stairs"))).toBe(false);
    expect(cards.some((c) => c.subtitle?.includes("to the lift"))).toBe(true);
  });

  it("never leaves a card without a title", () => {
    for (const unit of building.units.filter((u) => u.ref)) {
      for (const card of cardsFor(unit.id, "hu")) expect(card.title.length, unit.id).toBeGreaterThan(3);
    }
  });

  describe("approach step", () => {
    const anchor = building.anchors.find((a) => a.kind === "entrance")!;
    const approach: NavStep = { type: "approach", anchorId: anchor.id, levelId: building.levels[0].id, position: [0, 0] };
    const entranceOrigin: RoutePoint = { type: "anchor", anchorId: anchor.id };
    const destination: RoutePoint = { type: "unit", unitId: "2.14" };
    const ctx: StepTextContext = { building, messages: buildingEn, text: (v) => v.en, origin: entranceOrigin, destination };
    const route = findRoute(building, graph, entranceOrigin, destination, { stepFree: false })!;
    const indoor = condenseSteps(buildSteps(building, route));

    it("shows the entrance as an enter card", () => {
      const card = describeStep([approach, ...indoor], 0, ctx);
      expect(card.icon).toBe("enter");
      expect(card.title).toBe(buildingEn.step.enter);
      expect(card.subtitle).toContain(anchor.name.en);
    });

    it("titles a depart step after an approach like the first step", () => {
      const steps = [approach, ...indoor];
      const idx = steps.findIndex((s, i) => i > 0 && s.type === "depart");
      expect(idx).toBe(1);
      expect(describeStep(steps, idx, ctx).title).toBe(buildingEn.step.departFrom(anchor.name.en));
    });
  });
});

describe("Hungarian wording", () => {
  it("says only the distance under a turn, without repeating a verb", () => {
    const subtitles = cardsFor("2.14", "hu").map((c) => c.subtitle ?? "");
    expect(subtitles.some((s) => /m-t\b/.test(s))).toBe(false);
    expect(subtitles.filter((s) => /^(Kb\. )?\d+ m/.test(s)).length).toBeGreaterThan(0);
  });

  it("puts the right article and suffix after the step count", () => {
    expect(buildingHu.route.stepOf(1, 10)).toBe("1. lépés a 10-ből");
    expect(buildingHu.route.stepOf(2, 5)).toBe("2. lépés az 5-ből");
    expect(buildingHu.route.stepOf(3, 6)).toBe("3. lépés a 6-ból");
  });
});

describe("formatters", () => {
  it("rounds walking distances to something a person would say", () => {
    expect(formatDistance(3.4, buildingHu)).toBe("3 m");
    expect(formatDistance(47, buildingHu)).toBe("kb. 45 m");
    expect(formatDistance(47, buildingEn)).toBe("about 45 m");
  });
  it("formats durations", () => {
    expect(formatDuration(30, buildingHu)).toBe("1 percnél rövidebb");
    expect(formatDuration(130, buildingHu)).toBe("kb. 2 perc");
  });
});
