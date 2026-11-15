import type { UnitCategory } from "../indoor/model";

/** Folded Hungarian and English search keywords per category. */
export const CATEGORY_KEYWORDS: Readonly<
  Record<UnitCategory, readonly string[]>
> = {
  restroom: [
    "mosdo",
    "wc",
    "vece",
    "toalett",
    "toilet",
    "restroom",
    "bathroom",
  ],
  restroom_accessible: [
    "akadalymentes mosdo",
    "akadalymentes wc",
    "accessible",
    "accessible restroom",
    "mosdo",
    "wc",
    "vece",
    "toalett",
    "toilet",
    "restroom",
    "bathroom",
  ],
  cafe: ["bufe", "kave", "kavezo", "cafe", "coffee", "buffet", "kaja"],
  lecture_hall: ["eloado", "terem", "lecture"],
  auditorium: ["nagyeloado", "audmax", "auditorium"],
  conference: ["konferencia", "conference"],
  laboratory: ["labor", "lab", "gepterem"],
  office: ["iroda", "office", "tanszek", "intezet"],
  reception: ["porta", "recepcio", "reception", "info"],
  lobby: ["aula", "hall"],
  parking: ["garazs", "parkolo", "parking", "garage"],
  outdoor: ["udvar", "kert", "garden", "court"],
  elevator: ["lift", "felvono", "elevator"],
  stairs: ["lepcso", "lepcsohaz", "stairs"],
  walkway: [],
  service: [],
};
