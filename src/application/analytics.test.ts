import { afterEach, describe, expect, it } from "vitest";
import { analyticsQuery, attachAnalyticsSink, disableAnalytics, resetAnalyticsForTests, track, trackException, type AnalyticsSink } from "./analytics";

function recordingSink() {
  const events: Array<[string, Record<string, unknown>]> = [];
  const errors: unknown[] = [];
  const sink: AnalyticsSink = {
    capture: (name, properties) => events.push([name, properties]),
    captureException: (error) => errors.push(error),
  };
  return { sink, events, errors };
}

afterEach(resetAnalyticsForTests);

describe("analytics facade", () => {
  it("buffers events until a sink is attached, then delivers them in order", () => {
    track("language_changed", { locale: "en" });
    track("building_selected", { building: "ba", source: "map" });
    const { sink, events } = recordingSink();
    attachAnalyticsSink(sink);
    track("route_completed", { building: "ba", room: "F.06", step_free: false });
    expect(events.map(([name]) => name)).toEqual(["language_changed", "building_selected", "route_completed"]);
    expect(events[1][1]).toEqual({ building: "ba", source: "map" });
  });

  it("drops everything once disabled", () => {
    track("language_changed", { locale: "en" });
    disableAnalytics();
    const { sink, events, errors } = recordingSink();
    attachAnalyticsSink(sink);
    track("language_changed", { locale: "hu" });
    trackException(new Error("x"));
    expect(events).toEqual([]);
    expect(errors).toEqual([]);
  });

  it("keeps only the newest events while waiting for the sink", () => {
    for (let i = 0; i < 80; i++) track("step_free_toggled", { building: "ba", enabled: i % 2 === 0 });
    const { sink, events } = recordingSink();
    attachAnalyticsSink(sink);
    expect(events).toHaveLength(50);
  });

  it("never throws when the vendor does", () => {
    attachAnalyticsSink({
      capture: () => {
        throw new Error("vendor down");
      },
      captureException: () => {
        throw new Error("vendor down");
      },
    });
    expect(() => track("language_changed", { locale: "hu" })).not.toThrow();
    expect(() => trackException(new Error("x"))).not.toThrow();
  });
});

describe("analyticsQuery", () => {
  it("normalises and caps the search text", () => {
    expect(analyticsQuery("  F.06  ")).toBe("f.06");
    expect(analyticsQuery("Kármán   Tódor")).toBe("kármán tódor");
    expect(analyticsQuery("x".repeat(100))).toHaveLength(40);
  });
});
