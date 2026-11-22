import { describe, expect, it } from "vitest";
import { withCampaign } from "./campaign";

describe("withCampaign", () => {
  it("adds the landing campaign back to a page view URL", () => {
    expect(withCampaign("https://oe-merre.vercel.app/building/ba/?to=F.06", { utm_source: "szorolap", utm_medium: "print" })).toBe(
      "https://oe-merre.vercel.app/building/ba/?to=F.06&utm_source=szorolap&utm_medium=print",
    );
  });

  it("keeps parameters the URL already has and leaves URLs alone without a campaign", () => {
    expect(withCampaign("https://x.org/?utm_source=chat", { utm_source: "szorolap" })).toBe("https://x.org/?utm_source=chat");
    expect(withCampaign("https://x.org/a/", {})).toBe("https://x.org/a/");
  });
});
