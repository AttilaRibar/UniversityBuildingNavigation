/**
 * Bootstrap for building BA (Bécsi út 96/B).
 *
 * Sources:
 *  - Outline and wing geometry: OpenStreetMap way 159710379 and its
 *    `building:part` ways (© OpenStreetMap contributors, ODbL).
 *  - What is on each level: the floor directory signs in the building
 *    (levels A, F, 1, 2, 3, 4).
 *  - Room numbers, lab list and capacities: public NIK / university pages
 *    (see docs/research/ba-building.md).
 *
 * The signs only show zones, not individual rooms, so room positions inside a
 * wing are ESTIMATED: numbers are spread along the corridor in ascending
 * order, alternating sides. Everything produced here is tagged
 * `accuracy: "estimated"` until someone verifies it on site.
 *
 * Frames (all in metres):
 *  - B: the long bar along Doberdó út. +x runs north-west along the bar,
 *       +y points to Doberdó út (uphill). Origin: the bar's south corner.
 *  - T: the south-east block (rector wing), 5.8° off the bar axis.
 *  - H: the aula link and the Bécsi út wing, 27.5° off the bar axis.
 *
 * Run with: npx tsx scripts/bootstrap/ba.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { frame, LevelBuilder, refs, spans, zigzag, type Frame, type P, type Text, type UnitInput } from "./lib";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../src/data/buildings/ba");

const B = frame([0, 0], 0);
const T = frame([-5.8, 0.1], -5.8);
const H = frame([0, 0], -27.5);

// --- Outlines taken from the OSM building parts -----------------------------

const BAR_SE: P[] = B.poly([[-0.4, 0], [22.1, 0], [22.1, -12.2], [4.7, -12.2], [4.3, -13], [-1.9, -12.7]]);
const BAR_NW: P[] = B.poly([[22.1, 0], [55.8, 0], [55.8, -11.6], [52.7, -11.6], [52.7, -16.7], [22.1, -16.7]]);
const STUB: P[] = B.poly([[-1.9, -12.7], [-7.1, -12.4], [-5.8, 0.1], [-0.4, -0.4]]);
const RECTOR_WING: P[] = T.rect(-28.7, -13.6, 0, 0);
const LINK: P[] = H.poly([[-1.5, -45.8], [23.1, -45.8], [23.1, -16.8], [9.9, -16.8], [9.8, -9.5], [4.2, -12.1], [-0.6, -14.3], [-1.5, -18.8]]);
const BRIDGE: P[] = H.poly([[-1.5, -45.8], [6.5, -45.8], [6.5, -16.8], [9.9, -16.8], [9.8, -9.5], [4.2, -12.1], [-0.6, -14.3], [-1.5, -18.8]]);
const WING: P[] = H.poly([[-18.1, -45.8], [17.3, -45.8], [17.3, -52.4], [28.1, -52.4], [28.1, -64.3], [12.4, -64.3], [12.4, -58.5], [-10.1, -58.5], [-10.1, -54.2], [-18.1, -54.2]]);
const DRUM_CENTER: P = [15.5, -31.2];
const DRUM_RADIUS = 10;
const DRUM: P[] = H.sector(DRUM_CENTER, 0, DRUM_RADIUS, 0, 350).slice(1);

// --- Names -------------------------------------------------------------------

const t = (hu: string, en: string): Text => ({ hu, en });
const RESTROOM = t("Mosdó", "Restroom");
const NIK = "NIK";
const EKIK = "EKIK";
const RECTOR = "Rektori Hivatal";

const CONNECTOR_NAMES = {
  "stairs-west": t("Nyugati lépcsőház", "West staircase"),
  "lift-west": t("Nyugati lift", "West lift"),
  "lift-west-front": t("Nyugati lift (aula felőli)", "West lift (aula side)"),
  "stairs-central": t("Központi lépcsőház", "Central staircase"),
  "lift-central": t("Központi lift", "Central lift"),
  "stairs-aula": t("Aulalépcső", "Aula stairs"),
  "stairs-entrance": t("Főlépcső a bejárattól", "Main stairs from the entrance"),
  "stairs-south": t("Déli lépcsőház", "South staircase"),
  "lift-south": t("Déli lift", "South lift"),
} satisfies Record<string, Text>;

type ConnectorId = keyof typeof CONNECTOR_NAMES;

/** Adds a connector stop and a small shaft unit so the 3D view has something to show. */
function shaft(lb: LevelBuilder, id: ConnectorId, ring: P[], stop: P): void {
  const kind = id.startsWith("lift") ? "elevator" : "stairs";
  lb.unit({ id, category: kind, name: CONNECTOR_NAMES[id] }, ring);
  lb.connector(id, kind, stop, CONNECTOR_NAMES[id]);
}

// --- Reusable pieces ---------------------------------------------------------

interface RowOptions {
  frame: Frame;
  x0: number;
  x1: number;
  /** y of the wall away from the corridor and of the wall on the corridor. */
  yBack: number;
  yDoor: number;
  rooms: UnitInput[];
}

/** A row of equally wide rooms whose doors open onto the corridor at `yDoor`. */
function row(lb: LevelBuilder, o: RowOptions): void {
  spans(o.x0, o.x1, o.rooms.length).forEach(([a, b], i) => {
    lb.unit(o.rooms[i], o.frame.rect(a, Math.min(o.yBack, o.yDoor), b, Math.max(o.yBack, o.yDoor)), [
      o.frame.pt((a + b) / 2, o.yDoor),
    ]);
  });
}

/** West core (stairs, two lifts) in the stub between the rector wing and the bar. */
function westCore(lb: LevelBuilder, opts: { stairs: boolean; frontLift: boolean; restroom: boolean }): void {
  if (opts.stairs) shaft(lb, "stairs-west", B.rect(-6.5, -4.6, -4.3, -0.4), B.pt(-5.4, -5.2));
  shaft(lb, "lift-west", B.rect(-4.0, -3.6, -2.2, -1.6), B.pt(-3.1, -4.2));
  if (opts.frontLift) shaft(lb, "lift-west-front", B.rect(-2.7, -12.2, -0.9, -10.4), B.pt(-1.8, -9.8));
  if (opts.restroom) {
    lb.unit({ id: "wc-west", category: "restroom", name: RESTROOM }, B.rect(-6.9, -12.3, -3.6, -8.6), [B.pt(-5.2, -8.6)]);
  }
}

/** Central core of the bar: stairs and lifts at the back, restrooms at the front on upper levels. */
function centralCore(lb: LevelBuilder, opts: { restroom: boolean }): void {
  shaft(lb, "stairs-central", B.rect(22.3, -5.2, 24.0, -0.3), B.pt(23.2, -5.7));
  shaft(lb, "lift-central", B.rect(24.2, -4.0, 26.4, -1.6), B.pt(25.3, -4.6));
  if (opts.restroom) {
    lb.unit({ id: "wc-central", category: "restroom", name: RESTROOM }, B.rect(22.4, -13.2, 26.4, -8.4), [B.pt(24.4, -8.4)]);
  }
}

/** South core (lift + stairs) of the Bécsi út wing, identical on every level it serves. */
function southCore(lb: LevelBuilder): void {
  shaft(lb, "lift-south", H.rect(8.0, -58.3, 10.0, -56.3), H.pt(9.0, -55.7));
  shaft(lb, "stairs-south", H.rect(10.2, -58.5, 13.4, -55.5), H.pt(11.8, -54.9));
  lb.walkway([H.pt(7, -53.2), H.pt(12.5, -53.2)]);
}

const CORRIDOR_SE_Y = -6.1; // upper levels, between the two room rows
const LOOP_TOP_Y = -5.6;
const LOOP_BOTTOM_Y = -11.1;

/** Upper-level corridor network of the bar: one corridor in the SE half, a loop around the atria in the NW half. */
function barCorridors(lb: LevelBuilder, xStart: number): void {
  lb.walkway([B.pt(xStart, CORRIDOR_SE_Y), B.pt(24.4, CORRIDOR_SE_Y), B.pt(27.8, LOOP_TOP_Y), B.pt(54.3, LOOP_TOP_Y)]);
  lb.walkway([B.pt(24.4, CORRIDOR_SE_Y), B.pt(27.8, LOOP_BOTTOM_Y), B.pt(54.3, LOOP_BOTTOM_Y), B.pt(54.3, LOOP_TOP_Y)]);
  lb.walkway([B.pt(27.8, LOOP_TOP_Y), B.pt(27.8, LOOP_BOTTOM_Y)]);
  lb.walkway([B.pt(40.8, LOOP_TOP_Y), B.pt(40.8, LOOP_BOTTOM_Y)]);
}

interface BarRoomsOptions {
  /** Left end of the SE rows (the Doberdó lobby takes the first metres on level 1). */
  seStart: number;
  seRooms: UnitInput[];
  nwRooms: UnitInput[];
}

/** Rooms of the bar on an upper level, numbered along the corridor, alternating sides. */
function barRooms(lb: LevelBuilder, o: BarRoomsOptions): void {
  const se = zigzag(o.seRooms);
  row(lb, { frame: B, x0: o.seStart, x1: 22.1, yBack: 0, yDoor: -5.0, rooms: se.back });
  row(lb, { frame: B, x0: o.seStart + 1.6, x1: 22.1, yBack: -12.2, yDoor: -7.2, rooms: se.front });
  const nw = zigzag(o.nwRooms);
  row(lb, { frame: B, x0: 26.6, x1: 55.8, yBack: 0, yDoor: -4.6, rooms: nw.back });
  row(lb, { frame: B, x0: 26.6, x1: 52.7, yBack: -16.7, yDoor: -12.1, rooms: nw.front });
}

/** Slab of the bar with the two atrium voids of the NW half cut out. */
function barSlabWithAtria(lb: LevelBuilder): void {
  lb.slab(BAR_SE);
  lb.slab(B.rect(22.1, -16.7, 29.5, 0));
  lb.slab(B.rect(29.5, -6.6, 39.5, 0));
  lb.slab(B.rect(29.5, -16.7, 39.5, -10.1));
  lb.slab(B.rect(39.5, -16.7, 42, 0));
  lb.slab(B.rect(42, -6.6, 52, 0));
  lb.slab(B.rect(42, -16.7, 52, -10.1));
  lb.slab(B.poly([[52, 0], [55.8, 0], [55.8, -11.6], [52.7, -11.6], [52.7, -16.7], [52, -16.7]]));
}

const office = (ref: string, occupant: string, name?: Text): UnitInput => ({ ref, category: "office", occupant, name });
const lab = (ref: string, capacity?: number, name?: Text): UnitInput => ({
  ref,
  category: "laboratory",
  occupant: NIK,
  capacity,
  name: name ?? t("Számítógépes labor", "Computer lab"),
});

// --- Level A: basement, Bécsi út entrance ------------------------------------

function levelA(): LevelBuilder {
  const lb = new LevelBuilder("A");
  const garage = H.poly([[-10, -49.5], [17.3, -49.5], [17.3, -58.5], [30, -58.5], [30, -12], [-4, -12], [-10, -20]]);
  lb.slab(garage);
  lb.slab(H.rect(-10.1, -58.5, 17.3, -49.5));

  lb.unit({ id: "garage", category: "parking", name: t("Teremgarázs", "Indoor garage") }, garage, [H.pt(4, -49.5)]);
  lb.unit(
    { id: "entrance-hall", category: "lobby", name: t("Bejárati csarnok", "Entrance hall") },
    H.rect(-4, -58.5, 8, -49.5),
    [H.pt(2, -56.5)],
  );
  lb.unit(
    { id: "porta", category: "reception", name: t("Porta", "Reception"), aliases: ["recepció", "információ"], landmark: true },
    H.rect(-10.1, -58.5, -4, -54.6),
    [H.pt(-4, -56.5)],
  );
  lb.unit({ id: "service-west", category: "service" }, H.rect(-10.1, -54.6, -4, -49.5));
  lb.unit({ id: "service-east", category: "service" }, H.rect(13.6, -58.5, 17.3, -49.5));

  shaft(lb, "stairs-entrance", H.rect(-3, -54, 1, -49.6), H.pt(-1, -54.6));
  southCore(lb);

  // Entrance hall: door -> reception -> main stairs -> south core.
  lb.walkway([H.pt(2, -58.3), H.pt(2, -56.5), H.pt(2, -53.2), H.pt(7, -53.2)]);
  lb.walkway([H.pt(-4, -56.5), H.pt(2, -56.5)]);
  // Into the garage. The west lift also stops here, but walking across the
  // garage is not a pedestrian route, so that link is deliberately left out.
  lb.walkway([H.pt(2, -53.2), H.pt(4, -51), H.pt(4, -44)]);

  lb.anchor("main-entrance", H.pt(2, -58.3), {
    name: t("Főbejárat (Bécsi út)", "Main entrance (Bécsi út)"),
    kind: "entrance",
    isDefault: true,
    street: "Bécsi út",
  });
  lb.amenity("aed", "aed", H.pt(-9.2, -57.6), t("Automata életmentő defibrillátor", "Automated external defibrillator"));
  return lb;
}

// --- Level F: ground floor, aula and lecture halls ----------------------------

function levelF(): LevelBuilder {
  const lb = new LevelBuilder("F");
  [BAR_SE, BAR_NW, STUB, RECTOR_WING, LINK, WING].forEach((s) => lb.slab(s));

  const hall = (ref: string, capacity: number | undefined, name?: Text, extra: Partial<UnitInput> = {}): UnitInput => ({
    ref,
    category: "lecture_hall",
    capacity,
    name: name ?? t("Előadóterem", "Lecture room"),
    ...extra,
  });

  // Bar and rector wing.
  lb.unit(hall("F.01", 268), T.rect(-28.7, -13.6, -1.2, 0), [T.pt(-1.2, -9)]);
  westCore(lb, { stairs: true, frontLift: true, restroom: false });
  lb.amenity("seating-west", "seating", B.pt(-1.4, -6.2), t("Pihenőtér", "Resting area"));
  row(lb, { frame: B, x0: -0.4, x1: 22.1, yBack: 0, yDoor: -8.7, rooms: [hall("F.02", 40), hall("F.03", undefined), hall("F.04", undefined)] });
  centralCore(lb, { restroom: false });
  lb.unit(hall("F.05", undefined), B.rect(26.6, -12.5, 40.5, -2.5), [B.pt(29.5, -12.5)]);
  lb.unit(hall("F.06", 144), B.poly([[40.5, -2.5], [55.8, -2.5], [55.8, -11.6], [52.7, -11.6], [52.7, -12.5], [40.5, -12.5]]), [B.pt(43.5, -12.5)]);
  lb.unit({ id: "service-rear", category: "service" }, B.rect(26.6, -2.5, 55.8, 0));
  shaft(lb, "stairs-aula", B.rect(0.6, -16, 4.4, -11.4), B.pt(2.5, -16.6));

  // Aula link and the round block under the Audmax.
  lb.unit(
    { id: "aula", category: "lobby", name: t("Aula", "Aula"), capacity: 200, aliases: ["hall", "előcsarnok"] },
    LINK,
    [H.pt(2, -31)],
  );
  const c = DRUM_CENTER;
  lb.unit({ id: "wc-aula", category: "restroom", name: RESTROOM }, H.sector(c, 3, DRUM_RADIUS, 100, 172), [H.polar(c, DRUM_RADIUS, 150)]);
  lb.unit({ id: "wc-aula", category: "restroom", name: RESTROOM }, H.sector(c, 3, DRUM_RADIUS, 188, 232), [H.polar(c, DRUM_RADIUS, 205)]);
  lb.unit(
    { id: "wc-accessible", category: "restroom_accessible", name: t("Akadálymentes mosdó", "Accessible restroom") },
    H.sector(c, 3, DRUM_RADIUS, 232, 262),
    [H.polar(c, DRUM_RADIUS, 245)],
  );
  lb.unit(
    { id: "cafe", category: "cafe", name: t("Büfé", "Café"), aliases: ["Charger Kantin", "kantin", "menza"], landmark: true },
    H.sector(c, 0, DRUM_RADIUS, -82, 82),
    [H.polar(c, DRUM_RADIUS, 88), H.polar(c, DRUM_RADIUS, -88)],
  );

  // Bécsi út wing.
  lb.unit(hall("F.07", undefined), H.rect(-18.1, -54.2, -10.1, -45.8), [H.pt(-10.1, -47.6)]);
  lb.unit(hall("F.08", 84), H.rect(-10.1, -58.5, -3.2, -49.3), [H.pt(-6, -49.3)]);
  shaft(lb, "stairs-entrance", H.rect(-3, -54, 1, -49.6), H.pt(-1, -48.9));
  southCore(lb);
  lb.unit(
    hall("F.09", undefined, t("Wolfgang E. Pauli konferenciaterem", "Wolfgang E. Pauli Conference Hall"), {
      category: "conference",
      aliases: ["Pauli", "Pauli terem", "konferenciaterem"],
      landmark: true,
    }),
    H.rect(13.6, -64.3, 28.1, -54.2),
    [H.pt(15.2, -54.2)],
  );

  // Open-air spaces.
  lb.unit(
    { id: "court", category: "outdoor", name: t("Udvar", "Court") },
    [B.pt(-7.2, -13.4), H.pt(-1.5, -18.8), H.pt(-1.5, -45.8), H.pt(-18.1, -45.8), B.pt(-35.7, -10.5)],
    [H.pt(-4.5, -40.2)],
  );
  lb.unit(
    { id: "garden", category: "outdoor", name: t("Belső kert", "Inner garden"), aliases: ["kert"] },
    B.poly([[4.3, -13], [4.7, -12.2], [22, -12.2], [22.1, -16.7], [38, -16.7], [32, -30], [15.5, -35], [12.7, -25.6], [1, -19.5]]),
    [H.pt(12.6, -14.5)],
  );
  lb.amenity("smoking", "smoking_area", B.pt(10, -21), t("Dohányzásra kijelölt hely", "Designated smoking area"));

  // Walkways. Bar corridor runs in front of the lecture halls, facing the garden.
  lb.walkway([B.pt(-6, -10.2), B.pt(24.4, -10.2), B.pt(24.4, -14.7), B.pt(52, -14.7)]);
  lb.walkway([B.pt(-3.1, -10.2), B.pt(-3.1, -5.2), B.pt(-5.4, -5.2)]);
  lb.walkway([B.pt(24.4, -10.2), B.pt(24.4, -5.7)]);
  // Aula: down the neck, past the round block, to the Bécsi út wing.
  lb.walkway([B.pt(-2.9, -10.2), H.pt(4, -14), H.pt(4, -20), H.pt(2, -31), H.pt(2, -44), H.pt(2, -47.5)]);
  lb.walkway([H.pt(4, -15), H.pt(9, -14.2)]);
  lb.walkway([H.pt(4, -19.5), H.pt(12.6, -19.5), H.pt(12.6, -14.5)]);
  lb.walkway([H.pt(12.6, -19.5), H.pt(15.8, -19.5), H.pt(15.8, -21)]);
  lb.walkway([H.pt(2, -40.2), H.pt(-4.5, -40.2)]);
  lb.walkway([H.pt(2, -43.6), H.pt(15.8, -43.6), H.pt(15.8, -41.4)]);
  // Bécsi út wing corridor.
  lb.walkway([H.pt(-10.1, -47.5), H.pt(15.2, -47.5), H.pt(15.2, -53.2)]);
  lb.walkway([H.pt(7, -47.5), H.pt(7, -53.2)]);
  lb.walkway([H.pt(12.5, -53.2), H.pt(15.2, -53.2)]);
  return lb;
}

// --- Level 1: Doberdó út entrance, labs, Audmax, bridge -----------------------

function levelOne(): LevelBuilder {
  const lb = new LevelBuilder("1");
  [BAR_SE, BAR_NW, STUB, RECTOR_WING, BRIDGE, DRUM, WING].forEach((s) => lb.slab(s));

  // Rector's Office wing.
  const rector = zigzag(refs("1", 1, 9).reverse().map((ref) => office(ref, RECTOR, t("Rektori Hivatal", "Rector's Office"))));
  row(lb, { frame: T, x0: -28.7, x1: -1.5, yBack: 0, yDoor: -5.7, rooms: rector.back });
  row(lb, { frame: T, x0: -28.7, x1: -1.5, yBack: -13.6, yDoor: -7.9, rooms: rector.front });
  lb.walkway([T.pt(-27.5, -6.8), T.pt(-1, -6.8), B.pt(-3.1, CORRIDOR_SE_Y)]);

  // Doberdó lobby in the stub and the first metres of the bar.
  westCore(lb, { stairs: true, frontLift: true, restroom: true });
  shaft(lb, "stairs-aula", B.rect(1, -5.6, 4.6, -1.2), B.pt(2.8, -6.1));
  lb.anchor("doberdo-entrance", B.pt(-2.4, -0.4), {
    name: t("Doberdó úti bejárat", "Doberdó út entrance"),
    kind: "entrance",
    street: "Doberdó út",
  });
  lb.walkway([B.pt(-2.4, -0.4), B.pt(-2.4, CORRIDOR_SE_Y)]);
  lb.walkway([B.pt(-5.4, -5.2), B.pt(-5.4, CORRIDOR_SE_Y), B.pt(-2.4, CORRIDOR_SE_Y)]);
  lb.walkway([B.pt(-1.8, CORRIDOR_SE_Y), B.pt(-1.8, -9.8)]);
  lb.walkway([B.pt(-5.2, CORRIDOR_SE_Y), B.pt(-5.2, -8.6)]);

  // NIK labs and offices 1.10–1.20.
  barRooms(lb, {
    seStart: 5,
    seRooms: [lab("1.10", 27), office("1.11", NIK), lab("1.12", 12), lab("1.13", 25)],
    nwRooms: [lab("1.14", 25), lab("1.15", 25), lab("1.16", 13), office("1.17", NIK), office("1.18", NIK), lab("1.19", 25), office("1.20", NIK)],
  });
  centralCore(lb, { restroom: true });
  barCorridors(lb, -2.4);

  // The bridge over the aula, from the Doberdó lobby to the Bécsi út wing.
  lb.unit({ id: "bridge", category: "walkway", name: t("Híd", "Bridge") }, BRIDGE);
  lb.walkway([B.pt(-1.8, -9.8), H.pt(3, -14.5), H.pt(2.5, -22), H.pt(2.5, -40), H.pt(2.5, -50.5)]);
  lb.unit(
    {
      ref: "1.32",
      category: "auditorium",
      name: t("Kármán Tódor nagyelőadó", "Auditorium Maximum"),
      aliases: ["Audmax", "Aud Max", "Auditorium Maximum", "Kármán Tódor", "nagyelőadó"],
      capacity: 330,
      landmark: true,
    },
    DRUM,
    [H.polar(DRUM_CENTER, DRUM_RADIUS, 160), H.polar(DRUM_CENTER, DRUM_RADIUS, 200)],
  );

  // EKIK in the Bécsi út wing: 1.21–1.31 west of the bridge landing, 1.33–1.36 east of it.
  const ekikWest = zigzag(refs("1", 21, 31).map((ref) => office(ref, EKIK, t("Élettani Szabályozások Kutatóközpont", "Physiological Controls Research Center"))));
  row(lb, { frame: H, x0: -18.1, x1: -0.2, yBack: -45.8, yDoor: -49.6, rooms: ekikWest.back });
  row(lb, { frame: H, x0: -18.1, x1: -0.2, yBack: -54.2, yDoor: -51.4, rooms: ekikWest.front });
  lb.unit({ id: "service-south", category: "service" }, H.rect(-10.1, -58.5, -0.2, -54.2));
  lb.unit({ id: "wc-south", category: "restroom", name: RESTROOM }, H.rect(8, -51, 11, -45.8), [H.pt(9.5, -51)]);
  lb.unit(
    { ref: "1.33", category: "conference", occupant: EKIK, name: t("Tárgyaló", "Meeting room") },
    H.rect(11, -51, 17.3, -45.8),
    [H.pt(14, -51)],
  );
  row(lb, {
    frame: H,
    x0: 13.6,
    x1: 28.1,
    yBack: -64.3,
    yDoor: -54.4,
    rooms: [office("1.34", EKIK), office("1.35", EKIK), office("1.36", EKIK, t("Rector Emeritus iroda", "Rector Emeritus Office"))],
  });
  southCore(lb);
  lb.walkway([H.pt(-17, -50.5), H.pt(7, -50.5), H.pt(7, -53.2)]);
  lb.walkway([H.pt(12.5, -53.2), H.pt(27, -53.2)]);
  return lb;
}

// --- Level 2: rector, labs, EKIK ----------------------------------------------

function levelTwo(): LevelBuilder {
  const lb = new LevelBuilder("2");
  barSlabWithAtria(lb);
  [STUB, RECTOR_WING, DRUM, WING].forEach((s) => lb.slab(s));

  // Rector wing: council room and cabinet at the back, rector and cabinet offices at the front.
  const cabinet = (ref: string) => office(ref, RECTOR, t("Rektori Kabinet", "Rector's Cabinet"));
  lb.unit(cabinet("2.01"), T.rect(-12, -5.7, -1.5, 0), [T.pt(-6.5, -5.7)]);
  lb.unit(
    { ref: "2.02", category: "conference", occupant: RECTOR, name: t("Rektori tanácsterem", "Rector's Meeting Room"), aliases: ["tanácsterem"] },
    T.rect(-28.7, -5.7, -12, 0),
    [T.pt(-20, -5.7)],
  );
  lb.unit(
    { ref: "2.03", category: "office", occupant: RECTOR, name: t("Rektor", "Rector") },
    T.rect(-28.7, -13.6, -18, -7.9),
    [T.pt(-23, -7.9)],
  );
  row(lb, { frame: T, x0: -18, x1: -1.5, yBack: -13.6, yDoor: -7.9, rooms: refs("2", 4, 9).reverse().map(cabinet) });
  lb.walkway([T.pt(-27.5, -6.8), T.pt(-1, -6.8), B.pt(-3.1, CORRIDOR_SE_Y)]);

  westCore(lb, { stairs: true, frontLift: true, restroom: true });
  lb.walkway([B.pt(-5.4, -5.2), B.pt(-5.4, CORRIDOR_SE_Y), B.pt(-1.8, CORRIDOR_SE_Y), B.pt(-1.8, -9.8)]);
  lb.walkway([B.pt(-5.2, CORRIDOR_SE_Y), B.pt(-5.2, -8.6)]);

  barRooms(lb, {
    seStart: -0.2,
    seRooms: [lab("2.10", 25), office("2.11", NIK, t("Dékáni Hivatal – műszaki csoport", "Dean's Office – technical staff")), lab("2.12", 30), lab("2.13", 25, t("Cisco labor", "Cisco lab"))],
    nwRooms: [lab("2.14", 25), lab("2.15", 25), office("2.16", NIK), office("2.17", NIK), lab("2.18", 27), office("2.19", NIK), lab("2.20", 25)],
  });
  centralCore(lb, { restroom: true });
  barCorridors(lb, -1.8);

  // EKIK in the Bécsi út wing: only reachable through the south core on this level.
  const bejczy = t("Bejczy Antal iRobottechnikai Központ", "Antal Bejczy Center for Intelligent Robotics");
  const ekikWest = zigzag(refs("2", 21, 32).map((ref) => office(ref, EKIK, bejczy)));
  row(lb, { frame: H, x0: -18.1, x1: 2, yBack: -45.8, yDoor: -49.6, rooms: ekikWest.back });
  row(lb, { frame: H, x0: -18.1, x1: 2, yBack: -54.2, yDoor: -51.4, rooms: ekikWest.front });
  lb.unit({ id: "service-south", category: "service" }, H.rect(-10.1, -58.5, 2, -54.2));
  lb.unit({ id: "wc-south", category: "restroom", name: RESTROOM }, H.rect(8, -51, 11, -45.8), [H.pt(9.5, -51)]);
  lb.unit(office("2.33", EKIK, t("EKIK főigazgatói iroda", "EKIK Director General's Office")), H.rect(11, -51, 17.3, -45.8), [H.pt(14, -51)]);
  row(lb, { frame: H, x0: 13.6, x1: 28.1, yBack: -64.3, yDoor: -54.4, rooms: refs("2", 34, 36).map((ref) => office(ref, EKIK)) });
  southCore(lb);
  lb.walkway([H.pt(-17, -50.5), H.pt(7, -50.5), H.pt(7, -53.2)]);
  lb.walkway([H.pt(12.5, -53.2), H.pt(27, -53.2)]);
  return lb;
}

// --- Levels 3 and 4: NIK institutes and the Dean's Office ----------------------

/** Levels 3 and 4 only cover the bar: offices on both sides, the central core in the middle. */
function officeLevel(id: string, rooms: UnitInput[]): LevelBuilder {
  const lb = new LevelBuilder(id);
  barSlabWithAtria(lb);
  barRooms(lb, { seStart: -0.2, seRooms: rooms.slice(0, 10), nwRooms: rooms.slice(10) });
  centralCore(lb, { restroom: true });
  barCorridors(lb, 0.8);
  return lb;
}

function levelThree(): LevelBuilder {
  const software = t("Szoftvertervezés és -fejlesztés Intézet", "Software Engineering Institute");
  const cyber = t("Kiberfizikai Rendszerek Intézet", "Institute of Cyberphysical Systems");
  const bio = t("Biomatika és Alkalmazott Mesterséges Intelligencia Intézet", "Biomathematics and Applied Artificial Intelligence Institute");
  const institute = (n: number): Text | undefined => (n >= 3 && n <= 14 ? software : n >= 15 && n <= 22 ? cyber : n >= 23 ? bio : undefined);
  return officeLevel("3", refs("3", 1, 28).map((ref, i) => office(ref, NIK, institute(i + 1))));
}

function levelFour(): LevelBuilder {
  const maths = t("Alkalmazott Matematikai Intézet", "Institute of Applied Mathematics");
  const dean = t("Dékáni Hivatal", "Dean's Office");
  // The sign shows the Dean's Office in the Doberdó-side row of the NW half,
  // which is where the odd numbers from 4.11 land with alternating sides.
  const rooms = refs("4", 1, 28).map((ref, i): UnitInput => {
    const n = i + 1;
    if (n === 1) {
      return { ref, category: "conference", occupant: NIK, name: t("Dékáni tanácsterem", "Dean's Meeting Room"), aliases: ["NIK tárgyaló", "tanácsterem"] };
    }
    const isDean = n >= 11 && n % 2 === 1;
    return { ...office(ref, NIK, isDean ? dean : maths), aliases: isDean ? ["dékáni", "dékán", "dean"] : [] };
  });
  return officeLevel("4", rooms);
}

// --- Output -------------------------------------------------------------------

const LEVELS = [
  { id: "A", name: t("Alagsor", "Basement"), elevation: 0, build: levelA },
  { id: "F", name: t("Földszint", "Ground floor"), elevation: 4.2, build: levelF },
  { id: "1", name: t("1. emelet", "1st floor"), elevation: 8.4, build: levelOne },
  { id: "2", name: t("2. emelet", "2nd floor"), elevation: 12.3, build: levelTwo },
  { id: "3", name: t("3. emelet", "3rd floor"), elevation: 16.2, build: levelThree },
  { id: "4", name: t("4. emelet", "4th floor"), elevation: 20.1, build: levelFour },
];

const manifest = {
  id: "ba",
  code: "BA",
  name: t("BA épület – Bécsi út 96/B", "Building BA – Bécsi út 96/B"),
  georeference: { origin: [19.0340468, 47.5336501], xAxisBearing: 304.51 },
  levels: LEVELS.map(({ id, name, elevation }, ordinal) => ({ id, ordinal, shortName: id, name, elevation })),
  attribution: "Outline © OpenStreetMap contributors (ODbL). Interior estimated from the building's floor directory signs.",
};

mkdirSync(join(OUT_DIR, "levels"), { recursive: true });
writeFileSync(join(OUT_DIR, "building.json"), `${JSON.stringify(manifest, null, 2)}\n`);
for (const level of LEVELS) {
  const geojson = level.build().toGeoJSON();
  writeFileSync(join(OUT_DIR, "levels", `${level.id}.json`), `${JSON.stringify(geojson)}\n`);
  console.log(`level ${level.id}: ${geojson.features.length} features`);
}
