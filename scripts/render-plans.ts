/**
 * Dev tool: renders a top-down PNG of every level (rooms, doors, walkways,
 * connector stops) plus an optional route from the main entrance, so data
 * edits can be eyeballed without starting the app.
 *
 * Usage: npx tsx scripts/render-plans.ts [roomRef] [filePrefix] [sf]
 */
import { mkdirSync } from "node:fs";
import sharp from "sharp";
import { loadIndoorBuilding } from "../src/data/buildings";
import { buildRouteGraph, findRoute, buildSteps } from "../src/domain/routing";

const OUT = process.env.PLANS_OUT ?? ".plans";
mkdirSync(OUT, { recursive: true });
const S = 11;
const X = (x: number) => (x + 42) * S;
const Y = (y: number) => (6 - y) * S;
const pts = (ps: readonly (readonly [number, number])[]) => ps.map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(" ");
const fill: Record<string, string> = { lecture_hall: "#243b6b", auditorium: "#243b6b", conference: "#35508a", laboratory: "#2b4a8a", office: "#5b7bb5", restroom: "#7fc4e8", restroom_accessible: "#57b0e0", cafe: "#b5651d", reception: "#c9a227", lobby: "#dfe8f3", walkway: "#e9eef5", stairs: "#999", elevator: "#3aa0c8", parking: "#cfd8e3", outdoor: "#d8ead2", service: "#e3e3e3" };

async function main() {
  const { building } = await loadIndoorBuilding("ba");
  const graph = buildRouteGraph(building);
  const [toRef, out] = [process.argv[2] ?? "2.14", process.argv[3] ?? "levels"];
  const dest = building.units.find((u) => u.ref === toRef || u.id === toRef)!;
  const route = findRoute(building, graph, { type: "anchor", anchorId: "main-entrance" }, { type: "unit", unitId: dest.id }, { stepFree: process.argv[4] === "sf" });
  if (route) {
    console.log("distance", route.distance.toFixed(0), "duration", route.duration.toFixed(0));
    for (const s of buildSteps(building, route)) console.log(JSON.stringify({ ...s, points: undefined, from: undefined, to: undefined, position: undefined }));
  } else console.log("NO ROUTE");
  for (const level of building.levels) {
    const svg: string[] = [`<svg xmlns="http://www.w3.org/2000/svg" width="${105 * S}" height="${78 * S}" style="background:#fff"><text x="10" y="24" font-size="22">Level ${level.id}</text>`];
    for (const s of level.slabs) svg.push(`<polygon points="${pts(s)}" fill="#f1f4f8" stroke="#99a" stroke-width="1"/>`);
    for (const u of building.units.filter((u) => u.levelId === level.id)) {
      const flat = ["lobby", "outdoor", "parking", "walkway"].includes(u.category);
      svg.push(`<polygon points="${pts(u.polygon)}" fill="${fill[u.category]}" fill-opacity="${flat ? 0.5 : 0.9}" stroke="#fff" stroke-width="1"/>`);
      const cx = u.polygon.reduce((a, p) => a + p[0], 0) / u.polygon.length, cy = u.polygon.reduce((a, p) => a + p[1], 0) / u.polygon.length;
      svg.push(`<text x="${X(cx)}" y="${Y(cy) + 3}" font-size="9" text-anchor="middle" fill="${flat ? "#333" : "#fff"}">${u.ref ?? u.name?.hu ?? ""}</text>`);
    }
    for (const w of building.walkways.filter((w) => w.levelId === level.id)) svg.push(`<polyline points="${pts(w.points)}" fill="none" stroke="#e11" stroke-width="1.5"/>`);
    for (const o of building.openings.filter((o) => o.levelId === level.id)) svg.push(`<circle cx="${X(o.position[0])}" cy="${Y(o.position[1])}" r="2.5" fill="#0a0"/>`);
    for (const c of building.connectors) for (const s of c.stops.filter((s) => s.levelId === level.id)) svg.push(`<circle cx="${X(s.position[0])}" cy="${Y(s.position[1])}" r="4" fill="none" stroke="#c0c" stroke-width="2"/>`);
    for (const a of building.anchors.filter((a) => a.levelId === level.id)) svg.push(`<rect x="${X(a.position[0]) - 4}" y="${Y(a.position[1]) - 4}" width="8" height="8" fill="#f00"/>`);
    for (const leg of route?.legs ?? []) if (leg.type === "walk" && leg.levelId === level.id) svg.push(`<polyline points="${pts(leg.points)}" fill="none" stroke="#fc0" stroke-width="5" stroke-opacity="0.8"/>`);
    svg.push("</svg>");
    await sharp(Buffer.from(svg.join(""))).png().toFile(`${OUT}/${out}-${level.id}.png`);
  }
}
void main();
