/**
 * Whether this browser may send analytics. Analytics is cookieless, but the visitor
 * still has the last word: Do Not Track, Global Privacy Control and the opt-out
 * switch on the privacy page all turn it off.
 */

const OPT_OUT_KEY = "merre.analyticsOptOut";

export function readOptOut(): boolean {
  try {
    return window.localStorage.getItem(OPT_OUT_KEY) === "1";
  } catch {
    return false;
  }
}

/** Stored per browser; takes effect immediately and on every later visit. */
export function writeOptOut(optedOut: boolean): void {
  try {
    if (optedOut) window.localStorage.setItem(OPT_OUT_KEY, "1");
    else window.localStorage.removeItem(OPT_OUT_KEY);
  } catch {
    // Private mode: the choice lasts for this page load only.
  }
}

/** The visitor allows analytics: no Do Not Track / Global Privacy Control and no opt-out. */
export function analyticsAllowed(): boolean {
  return !browserSignalsNoTracking() && !readOptOut();
}

/** Do Not Track or Global Privacy Control is switched on in the browser. */
export function browserSignalsNoTracking(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  const win = window as Window & { doNotTrack?: string };
  return nav.doNotTrack === "1" || win.doNotTrack === "1" || nav.globalPrivacyControl === true;
}
