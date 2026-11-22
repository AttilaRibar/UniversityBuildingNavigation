import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { centroid } from "@/domain/geometry/polygon";
import { polylineLength, type Vec2 } from "@/domain/geometry/vec2";
import { DESTINATION_CATEGORIES, type IndoorBuilding, type Level, type Unit } from "@/domain/indoor/model";
import type { RouteLeg } from "@/domain/routing";
import { flat, prism, ribbon, shrink, toScene } from "./geometry";
import { COLORS, unitStyle } from "./palette";

/** What the scene should show. */
export type SceneMode =
  | { type: "overview" }
  | { type: "level"; levelId: string }
  /** Levels of a route pulled apart; with a `focusLevelId` the other levels fade to ghosts. */
  | { type: "route"; levelIds: readonly string[]; focusLevelId: string | null };

export interface SceneInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface SceneLabels {
  unit: (unit: Unit) => string | null;
  level: (level: Level) => string;
  origin: string;
}

export interface SceneCallbacks {
  onUnitTap: (unitId: string) => void;
  onLevelTap: (levelId: string) => void;
}

/** A stretch of the route to emphasise: the walk of the current step, or a connector ride. */
export type SceneFocus =
  | { type: "walk"; levelId: string; points: readonly Vec2[] }
  | { type: "connector"; fromLevelId: string; toLevelId: string; from: Vec2; to: Vec2 }
  | { type: "point"; levelId: string; position: Vec2 };

/** Smallest gap between stacked levels; the real gap grows with the footprint (see `stackGap`). */
const OVERVIEW_GAP = 13;
const ROUTE_GAP = 19;
const MAX_STACK_GAP = 48;
const COMPACT_GAP = 4;
/** Floor plates are drawn as trays this thick, so every level shows a darker edge. */
const SLAB_THICKNESS = 1.1;
/** How much each level below the top one fades towards the background in the stacked view. */
const TONE_STEP = 0.07;
const MAX_TONE = 0.3;
/** On-screen diameter of the dot that runs along the current step, in CSS pixels. */
const PULSE_PX = 26;
/** Screen space kept free left of a stack for the level name chips, in CSS pixels. */
const LEVEL_LABEL_ROOM = 84;
const FADED = 0.1;
const ROOM_GAP = 0.14;
const ROUTE_WIDTH = 1.0;
const CHEVRON_SPACING = 1.6;
const MIN_ZOOM = 2.2;
const MAX_ZOOM = 60;

interface TrackedMaterial {
  material: THREE.Material & { color?: THREE.Color };
  opacity: number;
  /** Colour at full strength; the level's tone blends it towards the background. */
  base: THREE.Color | null;
}

interface LevelView {
  level: Level;
  group: THREE.Group;
  materials: TrackedMaterial[];
  labels: CSS2DObject[];
  levelLabel: CSS2DObject;
  y: number;
  targetY: number;
  opacity: number;
  targetOpacity: number;
  tone: number;
  targetTone: number;
  /** Slab corners at floor and roof height, relative to the level: what the camera has to fit. */
  outline: THREE.Vector3[];
  /** Slab corners at floor height: where the level name can be pinned. */
  corners: THREE.Vector3[];
}

interface RouteVisual {
  object: THREE.Object3D;
  /** Fractions of the whole route this piece spans, for the draw-on animation. */
  from: number;
  to: number;
  reveal: (t: number) => void;
}

const damp = (current: number, target: number, rate: number, dt: number) => current + (target - current) * (1 - Math.exp(-rate * dt));

/**
 * Renders a building as a stack of stylised floor plates and owns all the
 * imperative three.js state. React talks to it only through the setters, so
 * the rest of the UI stays plain HTML.
 */
export class BuildingScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly labelRenderer: CSS2DRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 4000);
  private readonly controls: OrbitControls;
  private readonly levels = new Map<string, LevelView>();
  private readonly unitMeshes = new Map<string, THREE.Mesh>();
  private readonly unitBaseMaterial = new Map<string, THREE.Material>();
  private readonly raycaster = new THREE.Raycaster();
  private readonly resizeObserver: ResizeObserver;
  private readonly chevrons: THREE.CanvasTexture;
  private readonly timer = new THREE.Timer();
  private readonly pulseTexture: THREE.CanvasTexture;

  private mode: SceneMode = { type: "overview" };
  private insets: SceneInsets = { top: 0, right: 0, bottom: 0, left: 0 };
  private routeVisuals: RouteVisual[] = [];
  private routeGroup = new THREE.Group();
  private routeProgress = 1;
  private pulse: { sprite: THREE.Sprite; levelId: string; points: readonly Vec2[]; length: number } | null = null;
  private markers: CSS2DObject[] = [];
  private highlighted: string[] = [];
  private cameraGoal: { target: THREE.Vector3; zoom: number } | null = null;
  private frameHandle = 0;
  private pointerDown: { x: number; y: number; time: number } | null = null;
  private disposed = false;
  private size = { width: 1, height: 1 };
  /** Set whenever something changed outside the animations, so idle frames can be skipped. */
  private dirty = true;
  /** Forces the level tones to be re-applied on the next drawn frame. */
  private dirtyTones = true;

  constructor(
    private readonly container: HTMLElement,
    private readonly building: IndoorBuilding,
    private labels: SceneLabels,
    private readonly callbacks: SceneCallbacks,
    private readonly reducedMotion: boolean,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.domElement.className = "scene-canvas";
    container.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.domElement.className = "scene-labels";
    container.appendChild(this.labelRenderer.domElement);

    this.scene.add(new THREE.AmbientLight(0xffffff, 2.1));
    const sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(-60, 120, 80);
    this.scene.add(sun);
    this.scene.add(this.routeGroup);

    // Isometric-style view from the Bécsi út side, like the building's own signs.
    // On a portrait phone the view is turned further so the long bar runs up the screen.
    // A slightly low angle keeps the floor plates of a stack from hiding each other.
    const portrait = container.clientHeight > container.clientWidth * 1.2;
    const azimuth = THREE.MathUtils.degToRad(portrait ? -62 : -35);
    const elevation = THREE.MathUtils.degToRad(36);
    const distance = 900;
    this.camera.position.set(
      Math.sin(azimuth) * Math.cos(elevation) * distance,
      Math.sin(elevation) * distance,
      Math.cos(azimuth) * Math.cos(elevation) * distance,
    );
    this.camera.zoom = 4;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !reducedMotion;
    this.controls.dampingFactor = 0.12;
    this.controls.minPolarAngle = THREE.MathUtils.degToRad(15);
    this.controls.maxPolarAngle = THREE.MathUtils.degToRad(68);
    this.controls.minZoom = MIN_ZOOM;
    this.controls.maxZoom = MAX_ZOOM;
    this.controls.zoomToCursor = true;
    // Map-like gestures: one finger pans, two fingers zoom and rotate.
    this.controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
    this.controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
    this.controls.addEventListener("start", () => (this.cameraGoal = null));
    this.controls.addEventListener("change", () => (this.dirty = true));

    this.chevrons = createChevronTexture();
    this.pulseTexture = createPulseTexture();
    this.timer.connect(document);
    for (const level of building.levels) this.levels.set(level.id, this.buildLevel(level));

    const canvas = this.renderer.domElement;
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointerup", this.onPointerUp);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.applyMode(true);
    this.frameVisible(true);
    this.loop();
  }

  // --- Public API -------------------------------------------------------------

  setMode(mode: SceneMode, options: { reframe?: boolean } = {}): void {
    this.dirty = true;
    this.mode = mode;
    this.applyMode(false);
    if (options.reframe ?? true) this.frameVisible(false);
  }

  setInsets(insets: SceneInsets): void {
    this.dirty = true;
    this.insets = insets;
  }

  setLabels(labels: SceneLabels): void {
    this.dirty = true;
    this.labels = labels;
    for (const view of this.levels.values()) {
      for (const label of view.labels) {
        const unitId = label.userData.unitId as string | undefined;
        const unit = unitId ? this.building.units.find((u) => u.id === unitId) : undefined;
        if (unit) label.element.textContent = labels.unit(unit) ?? "";
        else if (label.userData.levelLabel) label.element.textContent = labels.level(view.level);
      }
    }
  }

  /** Paints the destination (and optionally the origin room) in the accent colour. */
  setHighlight(destinationUnitId: string | null, originUnitId: string | null): void {
    this.dirty = true;
    for (const id of this.highlighted) {
      const mesh = this.unitMeshes.get(id);
      const base = this.unitBaseMaterial.get(id);
      if (mesh && base) mesh.material = base;
    }
    this.highlighted = [];
    this.clearMarkers();
    if (destinationUnitId) this.highlightUnit(destinationUnitId, COLORS.accent, "scene-label scene-label--destination");
    if (originUnitId && originUnitId !== destinationUnitId) this.highlightUnit(originUnitId, "#cfdcf5", null);
  }

  /** Shows the route; `animate` draws it on from the origin. Pass null to remove it. */
  setRoute(legs: readonly RouteLeg[] | null, originLabel: { levelId: string; position: Vec2 } | null, animate: boolean): void {
    this.dirty = true;
    this.clearRoute();
    if (!legs || legs.length === 0) return;
    const total = legs.reduce((sum, leg) => sum + legWeight(leg), 0) || 1;
    let travelled = 0;
    for (const leg of legs) {
      const from = travelled / total;
      travelled += legWeight(leg);
      const to = travelled / total;
      this.routeVisuals.push(leg.type === "walk" ? this.buildWalkLeg(leg, from, to) : this.buildConnectorLeg(leg, from, to));
    }
    if (originLabel) {
      const view = this.levels.get(originLabel.levelId);
      if (view) {
        const marker = makeLabel(this.labels.origin, "scene-label scene-label--origin");
        marker.position.copy(toScene(originLabel.position, 0.4));
        view.group.add(marker);
        this.markers.push(marker);
      }
    }
    this.routeProgress = animate && !this.reducedMotion ? 0 : 1;
    this.revealRoute();
  }

  /** Frames one step of the route and runs a pulse along it. */
  focus(target: SceneFocus | null): void {
    this.dirty = true;
    this.clearPulse();
    if (!target) {
      this.frameVisible(false);
      return;
    }
    const box = new THREE.Box3();
    if (target.type === "connector") {
      const a = this.levels.get(target.fromLevelId);
      const b = this.levels.get(target.toLevelId);
      if (!a || !b) return;
      box.expandByPoint(toScene(target.from, a.targetY)).expandByPoint(toScene(target.to, b.targetY));
      box.expandByScalar(9);
    } else {
      const view = this.levels.get(target.levelId);
      if (!view) return;
      const points = target.type === "walk" ? target.points : [target.position];
      for (const p of points) box.expandByPoint(toScene(p, view.targetY));
      box.expandByScalar(target.type === "walk" ? 7 : 11);
      if (target.type === "walk" && points.length > 1 && !this.reducedMotion) this.startPulse(target.levelId, points);
    }
    this.frameBox(box, false, 26);
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameHandle);
    this.resizeObserver.disconnect();
    const canvas = this.renderer.domElement;
    canvas.removeEventListener("pointerdown", this.onPointerDown);
    canvas.removeEventListener("pointerup", this.onPointerUp);
    this.controls.dispose();
    this.scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      mesh.geometry?.dispose();
      const material = mesh.material;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material?.dispose();
    });
    this.chevrons.dispose();
    this.pulseTexture.dispose();
    this.timer.dispose();
    this.renderer.dispose();
    // Browsers cap the number of live WebGL contexts; free ours now instead of at garbage collection,
    // so going back and forth between the screens never costs the city map its context.
    this.renderer.forceContextLoss();
    this.container.removeChild(canvas);
    this.container.removeChild(this.labelRenderer.domElement);
  }

  // --- Level construction -----------------------------------------------------

  private buildLevel(level: Level): LevelView {
    const group = new THREE.Group();
    const materials: LevelView["materials"] = [];
    const labels: CSS2DObject[] = [];
    const track = <T extends THREE.Material>(material: T, opacity = 1): T => {
      material.transparent = true;
      const color = (material as { color?: THREE.Color }).color;
      materials.push({ material, opacity, base: color ? color.clone() : null });
      return material;
    };

    // Each level is a tray: a pale top, a darker rim and a crisp outline, so stacked
    // levels read as separate plates even where they overlap on screen.
    const slabMaterial = track(new THREE.MeshLambertMaterial({ color: COLORS.slab }));
    const rimMaterial = track(new THREE.MeshLambertMaterial({ color: COLORS.slabSide }));
    const shadowMaterial = track(new THREE.MeshBasicMaterial({ color: COLORS.shadow, depthWrite: false }), 0.5);
    const outlines: THREE.BufferGeometry[] = [];
    for (const slab of level.slabs) {
      group.add(new THREE.Mesh(prism(slab, SLAB_THICKNESS, -SLAB_THICKNESS), [slabMaterial, rimMaterial]));
      outlines.push(ringLines(slab, 0.02));
      const shadow = new THREE.Mesh(flat(slab, -SLAB_THICKNESS - 1.6), shadowMaterial);
      shadow.position.set(1.3, 0, 1.3);
      shadow.renderOrder = -1;
      group.add(shadow);
    }
    const outlineMaterial = track(new THREE.LineBasicMaterial({ color: COLORS.slabEdge }), 0.55);
    group.add(new THREE.LineSegments(mergeGeometries(outlines), outlineMaterial));
    outlines.forEach((g) => g.dispose());

    const edges: THREE.BufferGeometry[] = [];
    const units = this.building.units.filter((u) => u.levelId === level.id);
    // Flat areas first so room blocks draw on top of the lobby they stand in.
    for (const unit of [...units].sort((a, b) => unitStyle(a.category, null).height - unitStyle(b.category, null).height)) {
      const style = unitStyle(unit.category, unit.occupant);
      const material = track(new THREE.MeshLambertMaterial({ color: style.color }));
      let mesh: THREE.Mesh;
      if (style.height === 0) {
        mesh = new THREE.Mesh(flat(unit.polygon, 0.03), material);
        material.polygonOffset = true;
        material.polygonOffsetFactor = -1;
      } else {
        const geometry = prism(shrink(unit.polygon, ROOM_GAP), style.height);
        mesh = new THREE.Mesh(geometry, material);
        edges.push(new THREE.EdgesGeometry(geometry, 30));
      }
      mesh.userData = { unitId: unit.id, levelId: level.id };
      group.add(mesh);
      this.unitMeshes.set(unit.id, mesh);
      this.unitBaseMaterial.set(unit.id, material);

      const text = this.labels.unit(unit);
      if (text) {
        const kind = unit.ref ? "room" : unit.category === "elevator" || unit.category === "stairs" ? "connector" : unit.category.startsWith("restroom") ? "minor" : "place";
        const label = makeLabel(text, `scene-label scene-label--${kind}`);
        label.position.copy(toScene(centroid(unit.polygon), style.height + 0.2));
        label.userData = { unitId: unit.id };
        group.add(label);
        labels.push(label);
      }
    }
    if (edges.length > 0) {
      const edgeMaterial = track(new THREE.LineBasicMaterial({ color: COLORS.edge }), 0.5);
      group.add(new THREE.LineSegments(mergeGeometries(edges), edgeMaterial));
      edges.forEach((e) => e.dispose());
    }

    const outline = level.slabs.flat().flatMap((p) => [toScene(p, -SLAB_THICKNESS), toScene(p, 2.6)]);
    const corners = level.slabs.flat().map((p) => toScene(p, -SLAB_THICKNESS / 2));
    // The level name hangs off the plate's left-most corner on screen (see `pinLevelLabels`),
    // where the stack reads like a legend.
    const levelLabel = makeLabel(this.labels.level(level), "scene-label scene-label--level");
    levelLabel.center.set(1.08, 0.5);
    levelLabel.userData = { levelLabel: true };
    group.add(levelLabel);
    labels.push(levelLabel);

    this.scene.add(group);
    return { level, group, materials, labels, levelLabel, y: 0, targetY: 0, opacity: 0, targetOpacity: 1, tone: 0, targetTone: 0, outline, corners };
  }

  // --- Mode layout ------------------------------------------------------------

  private applyMode(immediate: boolean): void {
    const mode = this.mode;
    const ordinals = new Map(this.building.levels.map((l) => [l.id, l.ordinal]));
    const top = Math.max(...this.building.levels.map((l) => l.ordinal));
    const overviewGap = this.stackGap(this.building.levels.length, OVERVIEW_GAP);
    for (const view of this.levels.values()) {
      const ordinal = view.level.ordinal;
      view.targetTone = 0;
      if (mode.type === "overview") {
        view.targetY = ordinal * overviewGap;
        view.targetOpacity = 1;
        view.targetTone = Math.min(MAX_TONE, (top - ordinal) * TONE_STEP);
      } else if (mode.type === "level") {
        const active = ordinals.get(mode.levelId) ?? 0;
        view.targetY = (ordinal - active) * COMPACT_GAP * (ordinal > active ? 6 : 1);
        view.targetOpacity = ordinal === active ? 1 : 0;
      } else {
        const involved = mode.levelIds.map((id) => ordinals.get(id) ?? 0);
        const min = Math.min(...involved);
        const max = Math.max(...involved);
        const focus = mode.focusLevelId ? ordinals.get(mode.focusLevelId) : undefined;
        view.targetY = (ordinal - min) * this.stackGap(max - min + 1, ROUTE_GAP);
        if (ordinal < min || ordinal > max) view.targetOpacity = 0;
        else if (focus !== undefined) view.targetOpacity = ordinal === focus ? 1 : FADED;
        else view.targetOpacity = involved.includes(ordinal) ? 1 : FADED;
      }
      if (immediate || this.reducedMotion) {
        view.y = view.targetY;
        view.opacity = view.targetOpacity;
        view.tone = view.targetTone;
      }
    }
    this.container.dataset.mode = mode.type;
  }

  /**
   * Vertical distance between stacked levels. A deep floor plate covers more of the
   * screen, so the gap grows with the footprint as seen from the camera, and fewer
   * levels can afford a wider spread.
   */
  private stackGap(count: number, minimum: number): number {
    this.camera.updateMatrixWorld();
    const forward = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 2).setY(0);
    if (forward.lengthSq() < 1e-6) return minimum;
    forward.normalize();
    let min = Infinity;
    let max = -Infinity;
    for (const view of this.levels.values()) {
      for (const corner of view.corners) {
        const d = corner.dot(forward);
        min = Math.min(min, d);
        max = Math.max(max, d);
      }
    }
    if (!Number.isFinite(min)) return minimum;
    const share = count <= 2 ? 0.6 : count === 3 ? 0.46 : 0.34;
    return THREE.MathUtils.clamp((max - min) * share, minimum, MAX_STACK_GAP);
  }

  /** Moves each level name to its plate's left-most corner as seen from the current camera angle. */
  private pinLevelLabels(): void {
    this.camera.updateMatrixWorld();
    const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
    for (const view of this.levels.values()) {
      if (!view.levelLabel.visible) continue;
      let best: THREE.Vector3 | null = null;
      let bestScore = Infinity;
      for (const corner of view.corners) {
        // Left-most first; among corners about as far left, prefer the lower one (the plate's front).
        const score = corner.dot(right) + corner.dot(up) * 0.15;
        if (score < bestScore) {
          bestScore = score;
          best = corner;
        }
      }
      if (best) view.levelLabel.position.copy(best);
    }
  }

  /** Frames the real outline of the visible levels (a bounding box would waste the empty corners). */
  private frameVisible(immediate: boolean): void {
    const points: THREE.Vector3[] = [];
    for (const view of this.levels.values()) {
      if (view.targetOpacity < 0.5) continue;
      for (const p of view.outline) points.push(new THREE.Vector3(p.x, p.y + view.targetY, p.z));
    }
    // Level names hang off the plates' left corners; keep room for them in the stacked views.
    if (points.length > 0) this.framePoints(points, immediate, MAX_ZOOM, this.mode.type === "level" ? 0 : LEVEL_LABEL_ROOM);
  }

  private frameBox(box: THREE.Box3, immediate: boolean, maxZoom: number): void {
    const points: THREE.Vector3[] = [];
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) points.push(new THREE.Vector3(x, y, z));
    this.framePoints(points, immediate, maxZoom);
  }

  /** Moves the camera so `points` fill the part of the viewport not covered by panels. */
  private framePoints(points: readonly THREE.Vector3[], immediate: boolean, maxZoom: number, labelRoom = 0): void {
    this.camera.updateMatrixWorld();
    const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
    const forward = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 2).negate();
    let minR = Infinity, maxR = -Infinity, minU = Infinity, maxU = -Infinity;
    const center = new THREE.Vector3();
    for (const point of points) {
      const r = point.dot(right);
      const u = point.dot(up);
      minR = Math.min(minR, r); maxR = Math.max(maxR, r);
      minU = Math.min(minU, u); maxU = Math.max(maxU, u);
      center.addScaledVector(point, 1 / points.length);
    }
    const margin = 18;
    const left = this.insets.left + labelRoom;
    const freeWidth = Math.max(80, this.size.width - left - this.insets.right - margin * 2);
    const freeHeight = Math.max(80, this.size.height - this.insets.top - this.insets.bottom - margin * 2);
    const zoom = THREE.MathUtils.clamp(Math.min(freeWidth / Math.max(1, maxR - minR), freeHeight / Math.max(1, maxU - minU)), MIN_ZOOM, maxZoom);
    // Where the free area's centre sits relative to the canvas centre, in pixels.
    const offsetX = (left - this.insets.right) / 2;
    const offsetY = (this.insets.bottom - this.insets.top) / 2;
    const current = this.controls.target;
    const target = current
      .clone()
      .addScaledVector(right, (minR + maxR) / 2 - offsetX / zoom - current.dot(right))
      .addScaledVector(up, (minU + maxU) / 2 - offsetY / zoom - current.dot(up));
    target.addScaledVector(forward, center.sub(target).dot(forward));

    if (immediate || this.reducedMotion) {
      this.moveCamera(target, zoom);
      this.cameraGoal = null;
    } else {
      this.cameraGoal = { target, zoom };
    }
  }

  private moveCamera(target: THREE.Vector3, zoom: number): void {
    const delta = target.clone().sub(this.controls.target);
    this.controls.target.copy(target);
    this.camera.position.add(delta);
    this.camera.zoom = zoom;
    this.camera.updateProjectionMatrix();
  }

  // --- Route ------------------------------------------------------------------

  private buildWalkLeg(leg: Extract<RouteLeg, { type: "walk" }>, from: number, to: number): RouteVisual {
    const view = this.levels.get(leg.levelId)!;
    const group = new THREE.Group();
    const border = new THREE.Mesh(
      ribbon(leg.points, ROUTE_WIDTH + 0.5, 0.1, 1),
      new THREE.MeshBasicMaterial({ color: COLORS.ink, side: THREE.DoubleSide }),
    );
    const texture = this.chevrons;
    // The fill's pieces overlap in one plane at bends, so it does not write depth
    // (see `ribbon`). That only works if it is drawn after the border beneath it.
    const fill = new THREE.Mesh(
      ribbon(leg.points, ROUTE_WIDTH, 0.14, 1 / CHEVRON_SPACING),
      new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, depthWrite: false }),
    );
    [border, fill].forEach((mesh, i) => {
      mesh.material.polygonOffset = true;
      mesh.material.polygonOffsetFactor = -4;
      mesh.renderOrder = 2 + i;
      group.add(mesh);
    });
    view.group.add(group);
    const counts = [border, fill].map((m) => m.geometry.getAttribute("position").count / 3);
    return {
      object: group,
      from,
      to,
      reveal: (t) => {
        [border, fill].forEach((mesh, i) => mesh.geometry.setDrawRange(0, Math.floor(counts[i] * t) * 3));
        group.visible = t > 0;
      },
    };
  }

  private buildConnectorLeg(leg: Extract<RouteLeg, { type: "connector" }>, from: number, to: number): RouteVisual {
    const group = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1, 14), new THREE.MeshBasicMaterial({ color: COLORS.accent }));
    const capGeometry = new THREE.CylinderGeometry(0.7, 0.7, 0.3, 18);
    const capMaterial = new THREE.MeshBasicMaterial({ color: COLORS.ink });
    const caps = [new THREE.Mesh(capGeometry, capMaterial), new THREE.Mesh(capGeometry, capMaterial)];
    group.add(shaft, ...caps);
    group.userData = { connector: leg, shaft, caps, t: 1 };
    this.routeGroup.add(group);
    return {
      object: group,
      from,
      to,
      reveal: (t) => {
        group.userData.t = t;
        group.visible = t > 0;
      },
    };
  }

  /** Connector shafts span two moving levels, so they are re-fitted every frame. */
  private updateConnectors(): void {
    for (const visual of this.routeVisuals) {
      const data = visual.object.userData as { connector?: Extract<RouteLeg, { type: "connector" }>; shaft: THREE.Mesh; caps: THREE.Mesh[]; t: number };
      if (!data.connector) continue;
      const a = this.levels.get(data.connector.fromLevelId);
      const b = this.levels.get(data.connector.toLevelId);
      if (!a || !b) continue;
      const start = toScene(data.connector.from, a.y + 0.3);
      const end = toScene(data.connector.to, b.y + 0.3);
      const tip = start.clone().lerp(end, data.t);
      const length = Math.max(0.01, start.distanceTo(tip));
      data.shaft.position.copy(start).lerp(tip, 0.5);
      data.shaft.scale.set(1, length, 1);
      data.shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tip.clone().sub(start).normalize());
      data.caps[0].position.copy(start);
      data.caps[1].position.copy(tip);
    }
  }

  private revealRoute(): void {
    for (const visual of this.routeVisuals) {
      const span = Math.max(1e-6, visual.to - visual.from);
      visual.reveal(THREE.MathUtils.clamp((this.routeProgress - visual.from) / span, 0, 1));
    }
  }

  private clearRoute(): void {
    for (const visual of this.routeVisuals) {
      visual.object.removeFromParent();
      visual.object.traverse((o) => {
        const mesh = o as THREE.Mesh;
        mesh.geometry?.dispose();
        (mesh.material as THREE.Material | undefined)?.dispose();
      });
    }
    this.routeVisuals = [];
    this.clearPulse();
  }

  /**
   * The dot that walks along the current step. It is a screen-facing sprite drawn
   * after everything else and without depth testing: as a "you go here" marker it
   * must never look buried under the floor, a room block or a ghosted level.
   */
  private startPulse(levelId: string, points: readonly Vec2[]): void {
    const view = this.levels.get(levelId);
    if (!view) return;
    const material = new THREE.SpriteMaterial({ map: this.pulseTexture, transparent: true, depthTest: false, depthWrite: false });
    const sprite = new THREE.Sprite(material);
    sprite.renderOrder = 100;
    sprite.visible = false;
    view.group.add(sprite);
    this.pulse = { sprite, levelId, points, length: polylineLength(points) };
  }

  private clearPulse(): void {
    if (!this.pulse) return;
    this.pulse.sprite.removeFromParent();
    this.pulse.sprite.material.dispose();
    this.pulse = null;
  }

  // --- Highlight and markers --------------------------------------------------

  private highlightUnit(unitId: string, color: string, labelClass: string | null): void {
    const mesh = this.unitMeshes.get(unitId);
    const unit = this.building.units.find((u) => u.id === unitId);
    const view = unit && this.levels.get(unit.levelId);
    if (!mesh || !unit || !view) return;
    const material = new THREE.MeshLambertMaterial({ color, transparent: true });
    material.userData.levelId = unit.levelId;
    mesh.material = material;
    this.highlighted.push(unitId);
    if (labelClass) {
      const marker = makeLabel(unit.ref ?? this.labels.unit(unit) ?? "", labelClass);
      marker.position.copy(toScene(centroid(unit.polygon), unitStyle(unit.category, null).height + 1.2));
      view.group.add(marker);
      this.markers.push(marker);
    }
  }

  private clearMarkers(): void {
    for (const marker of this.markers) {
      marker.removeFromParent();
      marker.element.remove();
    }
    this.markers = [];
  }

  // --- Interaction ------------------------------------------------------------

  private readonly onPointerDown = (event: PointerEvent): void => {
    this.pointerDown = { x: event.clientX, y: event.clientY, time: performance.now() };
  };

  /** A tap (not a drag) selects the room, or the level when all levels are shown. */
  private readonly onPointerUp = (event: PointerEvent): void => {
    const down = this.pointerDown;
    this.pointerDown = null;
    if (!down || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 6 || performance.now() - down.time > 450) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const candidates = [...this.unitMeshes.values()].filter((m) => (this.levels.get(m.userData.levelId as string)?.opacity ?? 0) > 0.6);
    const hit = this.raycaster.intersectObjects(candidates, false)[0];
    if (!hit) return;
    const { unitId, levelId } = hit.object.userData as { unitId: string; levelId: string };
    if (this.mode.type === "overview") {
      this.callbacks.onLevelTap(levelId);
      return;
    }
    const unit = this.building.units.find((u) => u.id === unitId);
    if (unit && DESTINATION_CATEGORIES.has(unit.category)) this.callbacks.onUnitTap(unitId);
  };

  private resize(): void {
    this.dirty = true;
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.size = { width, height };
    // One world unit is one CSS pixel at zoom 1, so `camera.zoom` is pixels per metre.
    this.camera.left = -width / 2;
    this.camera.right = width / 2;
    this.camera.top = height / 2;
    this.camera.bottom = -height / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.labelRenderer.setSize(width, height);
  }

  // --- Frame loop -------------------------------------------------------------

  private readonly loop = (): void => {
    if (this.disposed) return;
    this.frameHandle = requestAnimationFrame(this.loop);
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 0.05);

    // A still scene costs nothing: only draw while something moves or was changed.
    const levelsMoving = [...this.levels.values()].some(
      (v) => Math.abs(v.y - v.targetY) > 0.005 || Math.abs(v.opacity - v.targetOpacity) > 0.005 || Math.abs(v.tone - v.targetTone) > 0.002,
    );
    const animating = levelsMoving || this.cameraGoal !== null || this.routeProgress < 1 || (!this.reducedMotion && this.routeVisuals.length > 0);
    this.controls.update();
    if (!animating && !this.dirty) return;
    this.dirty = false;

    for (const view of this.levels.values()) {
      view.y = damp(view.y, view.targetY, 7, dt);
      view.opacity = damp(view.opacity, view.targetOpacity, 9, dt);
      const tone = damp(view.tone, view.targetTone, 6, dt);
      const retone = Math.abs(tone - view.tone) > 1e-4 || this.dirtyTones;
      view.tone = tone;
      view.group.position.y = view.y;
      view.group.visible = view.opacity > 0.01;
      const solid = view.opacity > 0.98;
      for (const { material, opacity, base } of view.materials) {
        material.opacity = opacity * view.opacity;
        material.depthWrite = solid && opacity === 1;
        if (retone && base && material.color) material.color.copy(base).lerp(FOG, tone);
      }
      // While a route is shown only the level being walked keeps its room labels.
      const showLabels = view.opacity > 0.6;
      const showUnits = showLabels && (this.mode.type !== "route" || this.mode.focusLevelId === view.level.id);
      for (const label of view.labels) label.visible = label.userData.levelLabel ? showLabels : showUnits;
    }
    this.dirtyTones = false;
    this.pinLevelLabels();

    if (this.cameraGoal) {
      const target = this.controls.target.clone().lerp(this.cameraGoal.target, 1 - Math.exp(-5 * dt));
      const zoom = damp(this.camera.zoom, this.cameraGoal.zoom, 5, dt);
      this.moveCamera(target, zoom);
      if (target.distanceTo(this.cameraGoal.target) < 0.02 && Math.abs(zoom - this.cameraGoal.zoom) < 0.01) this.cameraGoal = null;
    }

    if (this.routeProgress < 1) {
      this.routeProgress = Math.min(1, this.routeProgress + dt / 1.6);
      this.revealRoute();
    }
    this.updateConnectors();
    if (!this.reducedMotion) this.chevrons.offset.x -= dt * 0.9;

    if (this.pulse) {
      const t = ((performance.now() / 1000) * 9) % (this.pulse.length + 6);
      const sprite = this.pulse.sprite;
      sprite.visible = t <= this.pulse.length;
      sprite.position.copy(toScene(pointAlong(this.pulse.points, t), 0.3));
      // One world unit is `zoom` pixels, so this keeps the dot the same size at every zoom.
      sprite.scale.setScalar(PULSE_PX / this.camera.zoom);
    }

    this.container.dataset.zoom = this.camera.zoom < 5.5 ? "far" : this.camera.zoom < 10 ? "mid" : "near";
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  };
}

/** What lower levels fade towards: the scene background. */
const FOG = new THREE.Color(COLORS.background);

/** The closed outline of a polygon as line segments at `height`. */
function ringLines(polygon: readonly Vec2[], height: number): THREE.BufferGeometry {
  const positions: number[] = [];
  polygon.forEach((p, i) => {
    const q = polygon[(i + 1) % polygon.length];
    positions.push(p[0], height, -p[1], q[0], height, -q[1]);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

/** White dot with a navy ring and a soft yellow glow: the "walk here" marker. */
function createPulseTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const c = size / 2;
  const glow = ctx.createRadialGradient(c, c, size * 0.18, c, c, size / 2);
  glow.addColorStop(0, "rgb(255 210 31 / 0.85)");
  glow.addColorStop(1, "rgb(255 210 31 / 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);
  ctx.beginPath();
  ctx.arc(c, c, size * 0.24, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = size * 0.07;
  ctx.strokeStyle = COLORS.ink;
  ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function legWeight(leg: RouteLeg): number {
  return leg.type === "walk" ? Math.max(leg.length, 1) : 12;
}

function makeLabel(text: string, className: string): CSS2DObject {
  const element = document.createElement("div");
  element.className = className;
  element.textContent = text;
  return new CSS2DObject(element);
}

function pointAlong(points: readonly Vec2[], distance: number): Vec2 {
  let remaining = distance;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (remaining <= len) return [a[0] + ((b[0] - a[0]) * remaining) / len, a[1] + ((b[1] - a[1]) * remaining) / len];
    remaining -= len;
  }
  return points[points.length - 1];
}

/**
 * Yellow tile with a navy chevron; repeated along the route and scrolled to show direction.
 * Keep its top and bottom edges plain yellow: the ribbon's round joints sample them.
 */
function createChevronTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = COLORS.accent;
  ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = COLORS.ink;
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(22, 14);
  ctx.lineTo(42, 32);
  ctx.lineTo(22, 50);
  ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
