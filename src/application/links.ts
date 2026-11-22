export interface BuildingLinkOptions {
  /** Destination unit id, e.g. "F.06". */
  to?: string;
  /** Origin: an anchor id or a unit id. Omitted = the building's default entrance. */
  from?: string;
  stepFree?: boolean;
  /**
   * Where the link was followed from, for analytics only (`src=search`). The indoor
   * screen reads it once and drops it from the address bar, so shared links stay clean.
   */
  source?: "search";
}

/**
 * Shareable link to a building's indoor map, optionally with a destination.
 * Every room has a stable URL, so it can be put on a course page or a QR sign.
 */
export function buildingHref(buildingId: string, options: BuildingLinkOptions = {}): string {
  const params = new URLSearchParams();
  if (options.to) params.set("to", options.to);
  if (options.from) params.set("from", options.from);
  if (options.stepFree) params.set("sf", "1");
  if (options.source) params.set("src", options.source);
  const query = params.toString();
  return `/building/${encodeURIComponent(buildingId)}/${query ? `?${query}` : ""}`;
}

export interface ProblemReport {
  /** What the report is about, e.g. "BA épület – 3.14". */
  subject: string;
  /** The page the problem was seen on, so the maintainer can reproduce it. */
  pageUrl: string;
}

/**
 * A pre-filled "new issue" link in the public repository. The template mirrors the
 * "Reporting wrong map data" checklist in CONTRIBUTING.md.
 */
export function reportProblemHref(repositoryUrl: string, report: ProblemReport): string {
  const body = [
    `Link: ${report.pageUrl}`,
    "",
    "Mi a hiba? / What is wrong?",
    "",
    "Mi van ott valójában? / What is actually there?",
    "",
    "Honnan tudod? / How do you know? (pl. ott jártam ekkor: …)",
  ].join("\n");
  const params = new URLSearchParams({ title: `Térképhiba: ${report.subject}`, body });
  return `${repositoryUrl.replace(/\/+$/, "")}/issues/new?${params.toString()}`;
}
