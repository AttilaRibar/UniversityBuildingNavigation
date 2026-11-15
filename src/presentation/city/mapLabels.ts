import { Marker, type Map as MapLibreMap } from "maplibre-gl";
import { BUILDING_LABEL_ZOOM, CAMERA } from "./cameraConfig";

export interface BuildingLabelData {
  id: string;
  lngLat: readonly [number, number];
  title: string;
  /** Faculty abbreviations, shown smaller after the title. */
  sub: string;
  colors: readonly string[];
  ariaLabel: string;
  /** Metres; the chip floats above the roof. */
  height: number;
  /** Higher wins when labels collide. */
  priority: number;
}

export interface CampusLabelData {
  id: string;
  lngLat: readonly [number, number];
  title: string;
  buildingIds: readonly string[];
  colors: readonly string[];
}

export interface MapLabelsOptions {
  campuses: readonly CampusLabelData[];
  buildings: readonly BuildingLabelData[];
  /** Accessible name of a campus chip that also stands for the campuses merged into it. */
  campusAriaLabel: (lead: CampusLabelData, merged: readonly CampusLabelData[]) => string;
  onBuilding: (id: string) => void;
  onCampus: (buildingIds: readonly string[]) => void;
  /** Pop the chips in one after another (first load only). */
  intro: boolean;
}

interface Chip {
  marker: Marker;
  button: HTMLButtonElement;
  priority: number;
}

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Class names defined in `cityMap.css`. */
const css = {
  marker: "city-map-marker",
  markerSelected: "city-map-marker-selected",
  chip: "city-map-chip",
  campus: "city-map-campus",
  selected: "city-map-selected",
  hidden: "city-map-hidden",
  intro: "city-map-intro",
  dots: "city-map-dots",
  dot: "city-map-dot",
  sub: "city-map-sub",
  count: "city-map-count",
  more: "city-map-more",
} as const;

/** Height of the pointer triangle under each chip. */
const POINTER = 7;
/** Chips closer than this count as colliding. */
const GAP = 4;
const INTRO_STAGGER_S = 0.07;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function dots(colors: readonly string[]): HTMLElement {
  const wrap = el("span", css.dots);
  wrap.setAttribute("aria-hidden", "true");
  for (const color of colors.slice(0, 3)) {
    const dot = el("span", css.dot);
    dot.style.background = color;
    wrap.append(dot);
  }
  return wrap;
}

/** Approximate on-screen height of `metres` standing upright at the given latitude, zoom and pitch. */
function verticalPixels(metres: number, latitude: number, zoom: number): number {
  const metresPerPixel = (40_075_016.686 * Math.cos((latitude * Math.PI) / 180)) / (512 * 2 ** zoom);
  return (metres / metresPerPixel) * Math.sin((CAMERA.pitch * Math.PI) / 180);
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.left < b.right + GAP && b.left < a.right + GAP && a.top < b.bottom + GAP && b.top < a.bottom + GAP;
}

/**
 * HTML label chips over the map: one per campus when zoomed out, one per
 * building when zoomed in. Colliding chips are hidden (buildings) or merged
 * into the more important neighbour (campuses), recomputed once per frame
 * while the camera moves.
 */
export class MapLabels {
  private readonly campusChips = new Map<string, Chip & { data: CampusLabelData; more: HTMLElement; count: HTMLElement }>();
  private readonly buildingChips = new Map<string, Chip & { data: BuildingLabelData }>();
  /** Campus ids each visible campus chip currently stands for (itself first). */
  private readonly clusters = new Map<string, readonly CampusLabelData[]>();
  private selectedId: string | null = null;
  private frame = 0;

  constructor(
    private readonly map: MapLibreMap,
    private readonly options: MapLabelsOptions,
  ) {
    options.campuses.forEach((c, i) => this.addCampus(c, i));
    options.buildings.forEach((b) => this.addBuilding(b));
    map.on("move", this.schedule);
    map.on("resize", this.schedule);
    this.update();
  }

  setSelected(id: string | null): void {
    if (this.selectedId) this.toggleSelected(this.selectedId, false);
    this.selectedId = id;
    if (id) this.toggleSelected(id, true);
    this.update();
  }

  destroy(): void {
    cancelAnimationFrame(this.frame);
    this.map.off("move", this.schedule);
    this.map.off("resize", this.schedule);
    for (const chip of [...this.campusChips.values(), ...this.buildingChips.values()]) chip.marker.remove();
    this.campusChips.clear();
    this.buildingChips.clear();
  }

  private toggleSelected(id: string, on: boolean): void {
    const chip = this.buildingChips.get(id);
    if (!chip) return;
    chip.button.classList.toggle(css.selected, on);
    chip.button.setAttribute("aria-pressed", String(on));
    chip.marker.getElement().classList.toggle(css.markerSelected, on);
  }

  private makeMarker(button: HTMLButtonElement, lngLat: readonly [number, number], index: number): Marker {
    const root = el("div", css.marker);
    root.append(button);
    if (this.options.intro) {
      button.classList.add(css.intro);
      button.style.setProperty("--delay", `${0.35 + index * INTRO_STAGGER_S}s`);
      button.addEventListener("animationend", () => button.classList.remove(css.intro), { once: true });
    }
    return new Marker({ element: root, anchor: "bottom" }).setLngLat([lngLat[0], lngLat[1]]).addTo(this.map);
  }

  private addCampus(data: CampusLabelData, index: number): void {
    const button = el("button", `${css.chip} ${css.campus}`);
    button.type = "button";
    const more = el("span", css.more);
    const count = el("span", css.count, String(data.buildingIds.length));
    button.append(dots(data.colors), el("span", "", data.title), more, count);
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      const members = this.clusters.get(data.id) ?? [data];
      this.options.onCampus(members.flatMap((c) => c.buildingIds));
    });
    const marker = this.makeMarker(button, data.lngLat, index).setOffset([0, -POINTER]);
    this.campusChips.set(data.id, { marker, button, data, more, count, priority: data.buildingIds.length });
  }

  private addBuilding(data: BuildingLabelData): void {
    const button = el("button", css.chip);
    button.type = "button";
    button.setAttribute("aria-label", data.ariaLabel);
    button.setAttribute("aria-pressed", "false");
    button.append(dots(data.colors), el("span", "", data.title));
    if (data.sub) button.append(el("span", css.sub, data.sub));
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      this.options.onBuilding(data.id);
    });
    const marker = this.makeMarker(button, data.lngLat, 0);
    this.buildingChips.set(data.id, { marker, button, data, priority: data.priority });
  }

  private readonly schedule = (): void => {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.update();
    });
  };

  /** Reads every chip's geometry first, then writes classes, to avoid layout thrashing. */
  private update(): void {
    const zoom = this.map.getZoom();
    const showBuildings = zoom >= BUILDING_LABEL_ZOOM;

    const buildings = [...this.buildingChips.values()].map((chip) => {
      const lift = POINTER + verticalPixels(chip.data.height, chip.data.lngLat[1], zoom);
      const priority = chip.data.id === this.selectedId ? Infinity : chip.priority;
      return { chip, lift, priority, rect: this.rectOf(chip, lift) };
    });
    const campuses = [...this.campusChips.values()].map((chip) => ({ chip, rect: this.rectOf(chip, POINTER) }));

    const placed: Rect[] = [];
    const visibleBuildings = new Set<string>();
    if (showBuildings) {
      for (const b of buildings.sort((x, y) => y.priority - x.priority)) {
        if (placed.some((r) => overlaps(r, b.rect))) continue;
        placed.push(b.rect);
        visibleBuildings.add(b.chip.data.id);
      }
    }

    this.clusters.clear();
    if (!showBuildings) {
      const leads: { id: string; rect: Rect }[] = [];
      for (const c of campuses.sort((x, y) => y.chip.priority - x.chip.priority)) {
        const lead = leads.find((l) => overlaps(l.rect, c.rect));
        if (lead) this.clusters.set(lead.id, [...(this.clusters.get(lead.id) ?? []), c.chip.data]);
        else {
          leads.push({ id: c.chip.data.id, rect: c.rect });
          this.clusters.set(c.chip.data.id, [c.chip.data]);
        }
      }
    }

    for (const { chip, lift } of buildings) {
      chip.marker.setOffset([0, -lift]);
      this.setVisible(chip.button, visibleBuildings.has(chip.data.id));
    }
    for (const { chip } of campuses) {
      const members = this.clusters.get(chip.data.id);
      this.setVisible(chip.button, members !== undefined);
      if (!members) continue;
      const others = members.length - 1;
      chip.more.textContent = others > 0 ? `+${others}` : "";
      chip.count.textContent = String(members.reduce((n, c) => n + c.buildingIds.length, 0));
      chip.button.setAttribute("aria-label", this.options.campusAriaLabel(chip.data, members.slice(1)));
    }
  }

  private rectOf(chip: Chip, lift: number): Rect {
    const { x, y } = this.map.project(chip.marker.getLngLat());
    const w = chip.button.offsetWidth;
    const h = chip.button.offsetHeight;
    return { left: x - w / 2, right: x + w / 2, bottom: y - lift, top: y - lift - h };
  }

  private setVisible(button: HTMLButtonElement, visible: boolean): void {
    button.classList.toggle(css.hidden, !visible);
    button.inert = !visible;
  }
}
