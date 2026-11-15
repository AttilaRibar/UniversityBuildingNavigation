import { describe, expect, it } from "vitest";
import { building } from "@/data/buildings/ba";
import { buildRouteGraph, buildSteps, condenseSteps, findRoute, type RoutePoint } from "@/domain/routing";
import { buildingEn, buildingHu } from "@/presentation/i18n/messages/building";
import { describeStep, formatDistance, formatDuration, type StepTextContext } from "./stepText";

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
