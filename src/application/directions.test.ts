import { describe, expect, it } from "vitest";
import { buildDirectionsUrl, detectMapsPlatform } from "./directions";

const target = { location: [19.0342, 47.5338] as const, label: "BA épület" };

describe("detectMapsPlatform", () => {
  it("picks Apple Maps on iPhone and iPadOS", () => {
    expect(detectMapsPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)")).toBe("apple");
    expect(detectMapsPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5)).toBe("apple");
  });
  it("picks Google Maps elsewhere", () => {
    expect(detectMapsPlatform("Mozilla/5.0 (Linux; Android 15; Pixel 9)")).toBe("google");
    expect(detectMapsPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 0)).toBe("google");
  });
});

describe("buildDirectionsUrl", () => {
  it("builds a walking directions link for Google Maps", () => {
    expect(buildDirectionsUrl(target, "google")).toBe("https://www.google.com/maps/dir/?api=1&destination=47.5338%2C19.0342&travelmode=walking");
  });
  it("builds a walking directions link for Apple Maps", () => {
    const url = new URL(buildDirectionsUrl(target, "apple"));
    expect(url.origin).toBe("https://maps.apple.com");
    expect(url.searchParams.get("daddr")).toBe("47.5338,19.0342");
    expect(url.searchParams.get("dirflg")).toBe("w");
  });
});
