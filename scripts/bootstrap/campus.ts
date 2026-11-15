/**
 * Curates the raw OpenStreetMap research export into the campus dataset the
 * app ships: keeps the buildings listed in `CURATED`, shortens names and assigns colours.
 *
 * Input:  docs/research/data/campus-buildings.osm.geojson (© OpenStreetMap contributors, ODbL)
 * Output: src/data/campus/buildings.json, src/data/campus/faculties.json
 *
 * Run with: npx tsx scripts/bootstrap/campus.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { FeatureCollection } from "geojson";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const t = (hu: string, en: string) => ({ hu, en });

const FACULTIES = [
  { abbr: "NIK", name: t("Neumann János Informatikai Kar", "John von Neumann Faculty of Informatics"), url: "https://nik.uni-obuda.hu/", color: "#2f6bff" },
  { abbr: "KVK", name: t("Kandó Kálmán Villamosmérnöki Kar", "Kálmán Kandó Faculty of Electrical Engineering"), url: "https://kvk.uni-obuda.hu/", color: "#ff7a1a" },
  { abbr: "RKK", name: t("Rejtő Sándor Könnyűipari és Környezetmérnöki Kar", "Sándor Rejtő Faculty of Light Industry and Environmental Engineering"), url: "https://rkk.uni-obuda.hu/", color: "#17b890" },
  { abbr: "KGK", name: t("Keleti Károly Gazdasági Kar", "Keleti Károly Faculty of Business and Management"), url: "https://kgk.uni-obuda.hu/", color: "#e5395b" },
  { abbr: "BGK", name: t("Bánki Donát Gépész és Biztonságtechnikai Mérnöki Kar", "Donát Bánki Faculty of Mechanical and Safety Engineering"), url: "https://bgk.uni-obuda.hu/", color: "#8a4fff" },
  { abbr: "YBL", name: t("Ybl Miklós Építéstudományi Kar", "Miklós Ybl Faculty of Architecture and Civil Engineering"), url: "https://ybl.uni-obuda.hu/", color: "#f2a900" },
];
const NEUTRAL_COLOR = "#5f7896";

interface Curated {
  name: ReturnType<typeof t>;
  description: ReturnType<typeof t>;
  kind?: "faculty" | "dormitory" | "sports";
  address?: string;
  height?: number;
  hasIndoorMap?: boolean;
}

/** Buildings we ship, keyed by the research id. Anything not listed is left out. */
const CURATED: Record<string, Curated> = {
  ba: { name: t("BA épület", "Building BA"), description: t("Bécsi úti főépület, Rektori Hivatal, EKIK", "Bécsi út main building, Rector's Office, EKIK"), height: 19, hasIndoorMap: true },
  bc: { name: t("BC épület", "Building BC"), description: t("„Mozdonyos” épület", "The “locomotive” building"), height: 19 },
  d: { name: t("D épület", "Building D"), description: t("Doberdó úti épület", "Doberdó út building"), height: 22 },
  ta: { name: t("TA épület", "Building TA"), description: t("Tavaszmező utcai főépület", "Tavaszmező utca main building") },
  tb: { name: t("TB épület", "Building TB"), description: t("Tavaszmező utca, B épület", "Tavaszmező utca, building B"), address: "1084 Budapest, Tavaszmező utca 15" },
  tg: { name: t("TG épület", "Building TG"), description: t("Tavaszmező utca, G épület", "Tavaszmező utca, building G") },
  banki: { name: t("N épület", "Building N"), description: t("Népszínház utcai épület", "Népszínház utca building"), address: "1081 Budapest, Népszínház utca 8" },
  frangepan: { name: t("Frangepán utcai kampusz", "Frangepán utca campus"), description: t("Ideiglenes oktatási helyszín", "Temporary teaching site") },
  "ybl-a": { name: t("Ybl A épület", "Ybl building A"), description: t("Thököly úti kampusz", "Thököly út campus") },
  "ybl-b": { name: t("Ybl B épület", "Ybl building B"), description: t("Thököly úti kampusz", "Thököly út campus") },
  "ybl-sport": { name: t("Ybl sportcsarnok", "Ybl sports hall"), description: t("Thököly úti kampusz", "Thököly út campus"), kind: "sports" },
  bk: { name: t("Kandó Kálmán Kollégium", "Kandó Kálmán Dormitory"), description: t("Kollégium", "Dormitory") },
  "kiss-arpad": { name: t("Kiss Árpád Kollégium", "Kiss Árpád Dormitory"), description: t("Kollégium", "Dormitory") },
  kukac: { name: t("Kukac Kollégium", "Kukac Dormitory"), description: t("Kollégium", "Dormitory") },
  bankikoll: { name: t("Bánki Donát Kollégium", "Bánki Donát Dormitory"), description: t("Kollégium", "Dormitory") },
  yblkoll: { name: t("Ybl Kollégium", "Ybl Dormitory"), description: t("Kollégium", "Dormitory") },
};

/** Campus (site) each building belongs to; buildings of a campus share one label when zoomed out. */
const CAMPUSES: Record<string, { name: ReturnType<typeof t>; buildings: string[] }> = {
  becsi: { name: t("Óbudai kampusz", "Óbuda campus"), buildings: ["ba", "bc", "d", "kiss-arpad", "bk"] },
  tavaszmezo: { name: t("Józsefvárosi kampusz", "Józsefváros campus"), buildings: ["ta", "tb", "tg", "kukac"] },
  nepszinhaz: { name: t("Népszínház utca", "Népszínház utca"), buildings: ["banki"] },
  thokoly: { name: t("Zuglói kampusz", "Zugló campus"), buildings: ["ybl-a", "ybl-b", "ybl-sport"] },
  frangepan: { name: t("Frangepán utca", "Frangepán utca"), buildings: ["frangepan"] },
  podmaniczky: { name: t("Podmaniczky utca", "Podmaniczky utca"), buildings: ["bankikoll"] },
  maria: { name: t("Mária utca", "Mária utca"), buildings: ["yblkoll"] },
};
const campusOf = (id: string) => {
  const entry = Object.entries(CAMPUSES).find(([, c]) => c.buildings.includes(id));
  if (!entry) throw new Error(`Building "${id}" is not assigned to a campus`);
  return { id: entry[0], name: entry[1].name };
};

const METRES_PER_LEVEL = 3.8;
const DEFAULT_HEIGHT = 15;

const raw = JSON.parse(readFileSync(join(ROOT, "docs/research/data/campus-buildings.osm.geojson"), "utf8")) as FeatureCollection;
const colorOf = new Map(FACULTIES.map((f) => [f.abbr, f.color]));

const features = raw.features.flatMap((feature) => {
  const p = feature.properties as Record<string, unknown>;
  const curated = CURATED[String(p.id)];
  if (!curated) return [];
  const faculties = (p.faculties as Array<{ abbr: string }>).map((f) => f.abbr);
  const kind = curated.kind ?? (p.type === "dormitory" ? "dormitory" : "faculty");
  const levels = typeof p.levels === "number" ? p.levels : null;
  return [
    {
      type: "Feature" as const,
      id: String(p.id),
      properties: {
        id: p.id,
        code: p.code ?? null,
        name: curated.name,
        description: curated.description,
        kind,
        campus: campusOf(String(p.id)),
        faculties,
        address: curated.address ?? p.address,
        district: p.district,
        location: p.centroid,
        height: curated.height ?? (typeof p.height_m === "number" ? p.height_m : levels ? Math.round(levels * METRES_PER_LEVEL) : DEFAULT_HEIGHT),
        color: (kind === "faculty" && colorOf.get(faculties[0])) || NEUTRAL_COLOR,
        verified: p.verified === true,
        hasIndoorMap: curated.hasIndoorMap ?? false,
        osm: p.osm,
      },
      geometry: feature.geometry,
    },
  ];
});

const missing = Object.keys(CURATED).filter((id) => !features.some((f) => f.properties.id === id));
if (missing.length > 0) throw new Error(`Curated buildings missing from the research export: ${missing.join(", ")}`);

writeFileSync(join(ROOT, "src/data/campus/buildings.json"), `${JSON.stringify({ type: "FeatureCollection", features })}\n`);
writeFileSync(join(ROOT, "src/data/campus/faculties.json"), `${JSON.stringify(FACULTIES, null, 2)}\n`);
console.log(`${features.length} buildings, ${FACULTIES.length} faculties`);
