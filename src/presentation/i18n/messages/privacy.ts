/**
 * Strings of the privacy page. Hungarian is the source language. Keep in sync with
 * `src/infrastructure/analytics/posthog.ts` and `src/presentation/analytics/VercelAnalytics.tsx`.
 */
export const privacyHu = {
  title: "Adatvédelem",
  intro:
    "A Merre regisztráció nélkül működik, nincs fiók, és nem kérünk tőled semmilyen személyes adatot. Hogy lássuk, mit érdemes javítani, névtelen használati statisztikát gyűjtünk.",
  collectedTitle: "Mit látunk",
  collected: [
    "melyik oldalt nyitottad meg, és honnan érkeztél (például egy szórólap QR-kódjáról),",
    "mit kerestél (legfeljebb 40 karakter), és hány találat volt,",
    "melyik épületet vagy termet választottad, elindítottad-e az útvonalat, és végigmentél-e rajta,",
    "a nyelvet, a böngésző és az eszköz típusát,",
    "a hibákat és a betöltési sebességet,",
    "a látogatottsági statisztikában (Vercel Web Analytics) a megnyitott oldalt, honnan érkeztél, a böngészőt, az operációs rendszert, az eszköz típusát és az országot.",
  ],
  notCollectedTitle: "Mit nem",
  notCollected:
    "Nevet, e-mail-címet, pontos helyet nem gyűjtünk, és GPS-t sem használunk. Sütit és helyi tárolót a statisztika nem használ. A PostHog a látogatókat a szerverén, naponta változó, visszafejthetetlen azonosítóval számolja, a Vercel a kérés adataiból képzett, 24 óra után eldobott azonosítóval. Az IP-címet egyikük sem tárolja el.",
  providerTitle: "Kik kezelik",
  provider:
    "A használati statisztikát a PostHog EU-s szervere (Frankfurt), a látogatottsági statisztikát a Vercel Web Analytics fogadja. A térképcsempéket az OpenFreeMap (tiles.openfreemap.org), az oldalt a Vercel szolgálja ki; ők a kéréshez szükséges technikai adatokat (például IP-címet) a saját szabályaik szerint kezelik.",
  choiceTitle: "Kikapcsolás",
  choice: "A statisztikát (mindkettőt) itt bármikor kikapcsolhatod. Ha a böngésződben be van kapcsolva a „Do Not Track” vagy a „Global Privacy Control”, akkor eleve nem küldünk semmit.",
  toggle: "Névtelen statisztika küldése",
  stateOn: "Bekapcsolva.",
  stateOff: "Kikapcsolva. Erről a böngészőről nem küldünk statisztikát.",
  stateReload: "Bekapcsolva. A következő oldalbetöltéstől érvényes.",
  stateBrowser: "A böngésződ beállítása miatt ki van kapcsolva.",
  stateNone: "Ezen a telepítésen nincs statisztika.",
  contactTitle: "Kérdésed van?",
  contact: "Írj a projekt GitHub-oldalán:",
  back: "Vissza a térképre",
  updated: "Utoljára frissítve: 2026. november",
};

export type PrivacyMessages = typeof privacyHu;

export const privacyEn: PrivacyMessages = {
  title: "Privacy",
  intro:
    "Merre works without registration: there is no account, and we never ask for personal data. To learn what to improve, we collect anonymous usage statistics.",
  collectedTitle: "What we see",
  collected: [
    "which page you opened and where you came from (for example a flyer's QR code),",
    "what you searched for (at most 40 characters) and how many results there were,",
    "which building or room you chose, whether you started the route and whether you finished it,",
    "the language and the type of browser and device,",
    "errors and loading speed,",
    "in the visitor statistics (Vercel Web Analytics): the page you opened, where you came from, the browser, operating system, device type and country.",
  ],
  notCollectedTitle: "What we don't",
  notCollected:
    "No names, no e-mail addresses, no precise location, no GPS. The statistics use no cookies and no local storage. PostHog counts visitors on its server with an identifier that changes daily and cannot be reversed; Vercel uses an identifier derived from the request and discarded after 24 hours. Neither stores IP addresses.",
  providerTitle: "Who handles it",
  provider:
    "Usage statistics go to PostHog's EU servers (Frankfurt), visitor statistics to Vercel Web Analytics. Map tiles come from OpenFreeMap (tiles.openfreemap.org) and the site is served by Vercel; they process the technical data a request needs (such as the IP address) under their own policies.",
  choiceTitle: "Opting out",
  choice: "You can switch the statistics (both of them) off here at any time. If your browser sends “Do Not Track” or “Global Privacy Control”, nothing is sent in the first place.",
  toggle: "Send anonymous statistics",
  stateOn: "On.",
  stateOff: "Off. This browser sends no statistics.",
  stateReload: "On. Takes effect from the next page load.",
  stateBrowser: "Off because of your browser's setting.",
  stateNone: "This deployment has no statistics.",
  contactTitle: "Questions?",
  contact: "Ask on the project's GitHub page:",
  back: "Back to the map",
  updated: "Last updated: November 2026",
};
