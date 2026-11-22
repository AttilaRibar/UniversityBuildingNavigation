# Data model

This document describes the data files that Merre ships and how to change them: the indoor format of a building (`building.json` plus one GeoJSON file per level), the validation rules, and the campus dataset used by the city map.

The format was read from `src/infrastructure/indoor/geojson-mapper.ts` (on-disk format), `src/domain/indoor/model.ts` (domain model) and `src/domain/routing/validate.ts` (rules). If they disagree with this page, the code is right.

The committed GeoJSON files are the source of truth. See [Architecture](ARCHITECTURE.md#geojson-as-the-single-source-of-truth) for the reasoning.

## Relation to IMDF

The vocabulary follows the Indoor Mapping Data Format (IMDF) where a matching concept exists: level, unit, opening, amenity, anchor. The format is inspired by IMDF. It is not a validated IMDF export and does not follow IMDF's file layout, identifiers or property names. IMDF has no routing network, so `walkway` and `connector` are additions of this project.

## Files of a building

```text
src/data/buildings/ba/
  building.json     manifest
  levels/A.json     one GeoJSON FeatureCollection per level
  levels/F.json
  levels/1.json
  levels/2.json
  levels/3.json
  levels/4.json
  index.ts          imports the files and calls mapBuilding
  ba.test.ts        guards the shipped data
src/data/buildings/index.ts   loader table: building id -> dynamic import
```

`mapBuilding(manifest, levelFiles)` turns the manifest and the level files into the domain object `IndoorBuilding`. It throws on a missing level file, an unknown `feature_type` and missing required properties.

## Coordinate frame and georeference

- Coordinates in the level files are **metres in a building-local frame**, not longitude and latitude. They are written as GeoJSON coordinates (`[x, y]`), so generic GeoJSON viewers show them near the null island unless the frame is handled.
- The `georeference` block of `building.json` ties the frame to WGS84:

| Field | Type | Meaning |
| --- | --- | --- |
| `origin` | `[longitude, latitude]` | WGS84 position of the local origin `(0, 0)` |
| `xAxisBearing` | number, degrees | Compass bearing of the local +x axis, clockwise from north |

- The model stores only the bearing of +x. The BA data was authored with a right-handed frame: +y is 90 degrees counter-clockwise from +x. For BA (`xAxisBearing` 304.51) +x points north-west along the long bar and +y points south-west, towards Doberdó út.
- `src/domain/geometry/georef.ts` converts local points to WGS84 with a flat-earth approximation. The building screen uses it to pin the entrance door on a street map (`src/presentation/building/EntranceMap.tsx`) as the first step of a route that starts at an entrance anchor (`kind: "entrance"`).
- The vertical axis is the level, not a coordinate: each level has an `elevation` in metres above the lowest level.
- Polygon rings are closed in the file (first vertex repeated at the end). The mapper drops the repeated vertex.
- The mapper does not check ring winding order.

## `building.json`

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | string | Building id, also the URL segment (`/building/<id>/`) and the key in the loader table. Example `ba` |
| `code` | string | Short code used in timetables. Example `BA` |
| `name` | `{ hu, en }` | Display name |
| `georeference` | object | See above |
| `levels` | array | One entry per level, see below |
| `attribution` | string | Text shown with the data, for example OSM credit and the data origin |

Level entry:

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | string | Level id. It is also the key of the level file and the prefix of unit ids and room numbers. Examples `A`, `F`, `1` |
| `ordinal` | integer | Vertical order. Must run `0, 1, 2, ...` without gaps (rule `level_ordinals`) |
| `shortName` | string | Label on signs and the floor switcher |
| `name` | `{ hu, en }` | Level name |
| `elevation` | number, metres | Floor height above the lowest level |

BA levels:

| id | ordinal | name (en) | elevation (m) |
| --- | --- | --- | --- |
| `A` | 0 | Basement | 0 |
| `F` | 1 | Ground floor | 4.2 |
| `1` | 2 | 1st floor | 8.4 |
| `2` | 3 | 2nd floor | 12.3 |
| `3` | 4 | 3rd floor | 16.2 |
| `4` | 5 | 4th floor | 20.1 |

A level file for each manifest level must exist and be registered in the building's `index.ts`.

## Level files

Each file is a GeoJSON `FeatureCollection`. Every feature has `properties.feature_type`, one of `level`, `unit`, `opening`, `walkway`, `connector`, `anchor`, `amenity`. Any other value makes `mapBuilding` throw.

Identifiers: the feature id is `properties.id`. For connectors it is `properties.connector_id`. **Ids must be unique across all feature types of a building** (rule `duplicate_id`), because routes and URLs refer to them bare. A destination's room number is its id.

BA conventions, which are not enforced:

- Numbered rooms use the room number as the id (`F.06`, `1.32`).
- Rooms without a number use `<level>-<name>` (`F-cafe`, `A-porta`).
- Doors are `<unit id>/door`, or `/door1`, `/door2` when a unit has several.

### Summary

| `feature_type` | Geometry | Becomes | Purpose |
| --- | --- | --- | --- |
| `level` | Polygon | `Level.slabs` | Floor slab outline, base of the 3D level. A level may have several |
| `unit` | Polygon | `Unit` | A room or other bounded space |
| `opening` | Point | `Opening` | A door where a unit meets the walkway network |
| `walkway` | LineString | `Walkway` | A walkable centre line, part of the routing network |
| `connector` | Point | `Connector` stop | One stop of a stair, lift or ramp on this level |
| `anchor` | Point | `Anchor` | A named start point, for example an entrance |
| `amenity` | Point | `Amenity` | A point of interest: defibrillator, seating, smoking area |

### `level`

Only `feature_type` is used. The polygon is a floor slab.

```json
{
  "type": "Feature",
  "properties": { "feature_type": "level" },
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[-0.4, 0], [22.1, 0], [22.1, -12.2], [4.7, -12.2], [4.3, -13], [-1.9, -12.7], [-0.4, 0]]]
  }
}
```

(Taken from `levels/F.json`.)

### `unit`

| Property | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | string | yes | Unique id |
| `ref` | string or null | no | Room number as on the door, for example `F.06`. Null when absent |
| `name` | `{ hu, en }` or null | no | Display name |
| `category` | string | yes | One of the categories below |
| `occupant` | string or null | no | Organisation using the room, for example `NIK`, `EKIK`. Also searchable |
| `aliases` | string[] | no | Extra search terms such as nicknames. Default `[]` |
| `capacity` | number or null | no | Seats |
| `landmark` | boolean | no | True to mention the unit in route hints ("the café stays on your right"). Default false |
| `accuracy` | `"surveyed"` or `"estimated"` | no | `surveyed` comes from plans or an on-site check. Anything else, or missing, is read as `estimated` |

Unit categories:

| Category | Destination | Notes |
| --- | --- | --- |
| `lecture_hall` | yes | |
| `auditorium` | yes | |
| `conference` | yes | |
| `laboratory` | yes | |
| `office` | yes | |
| `restroom` | yes | |
| `restroom_accessible` | yes | |
| `cafe` | yes | |
| `reception` | yes | |
| `lobby` | yes | |
| `parking` | yes | |
| `outdoor` | yes | |
| `walkway` | no | Shaded area, not a destination |
| `stairs` | no | Shaft outline for the 3D view |
| `elevator` | no | Shaft outline for the 3D view |
| `service` | no | Technical rooms and similar |

"Destination" means the category is in `DESTINATION_CATEGORIES`. Destinations appear in search and can be routed to, and each must have at least one opening.

The `accuracy` flag records how much to trust the geometry. All BA units are currently `estimated`. The flag is carried into the domain model; changing a unit to `surveyed` after an on-site check is the way to record that it was verified.

```json
{
  "type": "Feature",
  "properties": {
    "feature_type": "unit",
    "id": "1.32",
    "ref": "1.32",
    "name": { "hu": "Kármán Tódor nagyelőadó", "en": "Auditorium Maximum" },
    "category": "auditorium",
    "occupant": null,
    "aliases": ["Audmax", "Aud Max", "Auditorium Maximum", "Kármán Tódor", "nagyelőadó"],
    "capacity": 330,
    "landmark": true,
    "accuracy": "estimated"
  },
  "geometry": { "type": "Polygon", "coordinates": ["... ring, closed ..."] }
}
```

A smaller, complete example (`levels/F.json`):

```json
{
  "type": "Feature",
  "properties": {
    "feature_type": "unit",
    "id": "F.01",
    "ref": "F.01",
    "name": { "hu": "Előadóterem", "en": "Lecture room" },
    "category": "lecture_hall",
    "occupant": null,
    "aliases": [],
    "capacity": 268,
    "landmark": false,
    "accuracy": "estimated"
  },
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[-35.73, -10.53], [-8.37, -13.31], [-6.99, 0.22], [-34.35, 3], [-35.73, -10.53]]]
  }
}
```

### `opening`

| Property | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | string | yes | Unique id |
| `unit_id` | string | yes | The unit this door belongs to. Must exist (rule `unknown_unit`) |

The point is the door position. A unit may have several openings; routing uses all of them as start or end nodes. A door must be within 6 m of a walkway on its level (rule `not_snapped`).

```json
{
  "type": "Feature",
  "properties": { "feature_type": "opening", "id": "F.01/door", "unit_id": "F.01" },
  "geometry": { "type": "Point", "coordinates": [-7.9, -8.73] }
}
```

### `walkway`

| Property | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | string | yes | Unique id |
| `step_free` | boolean | no | `false` marks a line that includes steps. Default true |

Walkways on a level form the routing network. Lines may cross, touch at T-junctions or share vertices; the graph builder splits them at every vertex and junction. A level that has openings needs at least one walkway (rule `level_without_walkways`).

```json
{
  "type": "Feature",
  "properties": { "feature_type": "walkway", "id": "A-walkway-3", "step_free": true },
  "geometry": { "type": "LineString", "coordinates": [[-29.64, -48.27], [-24.31, -51.04]] }
}
```

### `connector`

| Property | Type | Required | Meaning |
| --- | --- | --- | --- |
| `connector_id` | string | yes | Shared by every stop of the same connector, on every level it serves |
| `kind` | `"stairs"`, `"elevator"` or `"ramp"` | yes | Taken from the first stop (lowest level) |
| `name` | `{ hu, en }` or null | no | Taken from the first stop (lowest level) |

A connector is one feature **per level** it stops at. The mapper groups features with the same `connector_id` into one `Connector`, sorts its stops by level ordinal (bottom to top), and reads `kind` and `name` from the first stop. Put the same `kind` on all stops.

Edges: stairs and ramps link consecutive stops. A lift links every pair of its stops, so it can ride several levels at once. Stairs are not step-free. Costs (`src/domain/routing/costs.ts`): stairs add 18 metre-equivalents per level, a lift costs at least 30 plus 5 per level, a ramp costs 1.2 times its planar length.

BA connectors: `stairs-west`, `lift-west`, `lift-west-front`, `stairs-central`, `lift-central`, `stairs-aula`, `stairs-entrance`, `stairs-south`, `lift-south`.

```json
{
  "type": "Feature",
  "properties": {
    "feature_type": "connector",
    "connector_id": "stairs-west",
    "kind": "stairs",
    "name": { "hu": "Nyugati lépcsőház", "en": "West staircase" }
  },
  "geometry": { "type": "Point", "coordinates": [-5.4, -5.2] }
}
```

Each connector needs at least 2 stops (rule `connector_stops`). The stop must be within 6 m of a walkway on its level.

For the 3D view, BA also draws each shaft as a `unit` polygon with category `stairs` or `elevator` and an id such as `F-stairs-west`. That unit is separate from the connector and has a different id.

### `anchor`

| Property | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | string | yes | Unique id. Usable in the `from` URL parameter |
| `name` | `{ hu, en }` | yes | Display name |
| `kind` | `"entrance"` or `"waypoint"` | no | Anything other than `waypoint` is read as `entrance` |
| `is_default` | boolean | no | Exactly one anchor per building must be `true` (rule `default_anchor`) |
| `street` | string or null | no | Street the entrance opens to |

`waypoint` is meant for fixed in-building start points such as a printed QR sign. BA has none yet; its anchors are `main-entrance` (level A, default) and `doberdo-entrance` (level 1).

```json
{
  "type": "Feature",
  "properties": {
    "feature_type": "anchor",
    "id": "main-entrance",
    "name": { "hu": "Főbejárat (Bécsi út)", "en": "Main entrance (Bécsi út)" },
    "kind": "entrance",
    "is_default": true,
    "street": "Bécsi út"
  },
  "geometry": { "type": "Point", "coordinates": [-25.15, -52.64] }
}
```

### `amenity`

| Property | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | string | yes | Unique id |
| `category` | `"aed"`, `"information"`, `"smoking_area"` or `"seating"` | yes | Kind of amenity |
| `name` | `{ hu, en }` | yes | Display name |

Amenities are part of the data model. They are not part of the routing network.

```json
{
  "type": "Feature",
  "properties": {
    "feature_type": "amenity",
    "id": "aed",
    "category": "aed",
    "name": { "hu": "Automata életmentő defibrillátor", "en": "Automated external defibrillator" }
  },
  "geometry": { "type": "Point", "coordinates": [-34.76, -46.84] }
}
```

## Validation

`validateBuilding(building)` (in `src/domain/routing/validate.ts`) returns a list of issues with `severity` (`error` or `warning`), `code`, `message` and, where relevant, `featureId`. An empty list means a clean building.

| Code | Severity | Rule |
| --- | --- | --- |
| `duplicate_id` | error | An id is used by more than one feature (levels, units, openings, walkways, connectors, anchors, amenities together) |
| `level_ordinals` | error | Level ordinals are not consecutive from 0 |
| `unknown_level` | error | A feature or connector stop refers to a level that is not in the manifest |
| `unknown_unit` | error | An opening refers to a unit that does not exist |
| `destination_without_opening` | error | A unit with a destination category has no opening |
| `default_anchor` | error | The number of anchors with `is_default: true` is not exactly one |
| `connector_stops` | error | A connector has fewer than 2 stops |
| `connector_order` | error | A connector's stops are not strictly ascending by level ordinal |
| `level_without_walkways` | error | A level has openings but no walkways |
| `not_snapped` | error | An opening, anchor or connector stop is more than 6 m from every walkway on its level |
| `unreachable` | error | A destination cannot be reached from the default anchor |
| `not_step_free` | warning | A destination can be reached from the default anchor, but not without stairs or non-step-free walkways |

Notes:

- `unreachable` and `not_step_free` are skipped when the default anchor is missing or could not be snapped. Fix `default_anchor` and `not_snapped` first.
- `destination_without_opening` units are not additionally reported as `unreachable`.
- Warnings do not fail `npm run validate:data`. Errors make it exit with status 1.
- Separately, `mapBuilding` throws on a missing level file, an unknown `feature_type`, and missing required properties (`category`, `unit_id`, `connector_id`, `kind`, `name`).
- The validator does not check geometry quality: overlapping rooms, a door that is not on the room's boundary, or a unit polygon in the wrong place all pass. Check those with the plan renderer.

## Changing data

### How to correct a room

1. Edit the room in `src/data/buildings/<id>/levels/<level>.json`, in QGIS or by hand. Move the polygon, change `name`, `aliases`, `capacity`, or set `accuracy` to `"surveyed"` if you checked it on site. If you move a room, move its `opening` point too and make sure it stays within 6 m of a walkway.
2. Keep the coordinate frame (metres, building-local). In QGIS, use a project CRS without reprojection and do not save the file with a different CRS.
3. Validate:

```bash
npm run validate:data
```

4. Render the plans and look at them. The command renders every level and a route from the main entrance to the given room into `.plans/` (git-ignored):

```bash
npx tsx scripts/render-plans.ts 2.14
```

Optional arguments: a file name prefix, and `sf` for a step-free route.

```bash
npx tsx scripts/render-plans.ts 2.14 levels sf
```

5. Run the tests:

```bash
npm test
```

6. Open the app and check the route to the room (`npm run dev`, then `/building/ba/?to=2.14`).

`render-plans.ts` is written for building BA: it loads `ba`, starts the route at the `main-entrance` anchor, and its drawing window is fixed to the BA extent. For another building, adapt the script first.

### How to add a new building

1. Create `src/data/buildings/<id>/` with `building.json` and `levels/<levelId>.json` for every level. Use the BA files as a template. Use the field tables above.
2. Add `src/data/buildings/<id>/index.ts` modelled on `ba/index.ts`: import the manifest and each level file, then export `building` (from `mapBuilding`), `code` and `attribution`.
3. Register the building in the loader table in `src/data/buildings/index.ts`:

```ts
const loaders: Record<string, () => Promise<IndoorBuildingBundle>> = {
  ba: () => import("./ba"),
  // <id>: () => import("./<id>"),
};
```

   This is what makes the building appear in `generateStaticParams`, the search index, `sitemap.xml`, `npm run validate:data` and the build.
4. In the campus dataset, set `hasIndoorMap: true` for the building in `src/data/campus/buildings.json`. If you regenerate that file with the campus bootstrap script, also set `hasIndoorMap: true` in the `CURATED` entry of `scripts/bootstrap/campus.ts`.
5. Review the places that currently assume BA: the room-number normaliser (`DEFAULT_BUILDING_CODES = ["ba"]` and the level prefixes it knows, in `src/domain/search/normalize.ts`), the PWA manifest shortcut in `src/app/manifest.ts`, and `scripts/render-plans.ts`.
6. Validate and test:

```bash
npm run validate:data
```

```bash
npm test
```

7. Add a data test modelled on `src/data/buildings/ba/ba.test.ts` (validation passes, expected levels and rooms exist, every destination is routable, step-free routes avoid stairs).

Authoring tips:

- Start with the walkways and connectors, then add rooms and doors, then run `validate:data` until it is clean.
- Mark everything you did not measure as `estimated`.
- Give every destination a door close to a corridor, and draw lifts and stairs on every level they serve.

### When not to re-run the bootstrap scripts

`scripts/bootstrap/ba.ts` and `scripts/bootstrap/campus.ts` write their output files from scratch:

- `ba.ts` overwrites `building.json` and every `levels/*.json` of BA. It was used once to derive the first version of the data from the floor directory signs and the OSM outline, and it is kept so that derivation stays reproducible.
- `campus.ts` overwrites `src/data/campus/buildings.json` and `faculties.json` from `docs/research/data/campus-buildings.osm.geojson`.

Do not re-run them after the committed files have been corrected by hand, edited in QGIS or replaced with surveyed plans. Doing so discards those corrections. Edit the GeoJSON files directly instead. Re-run a bootstrap script only on purpose, for example to regenerate a first draft in a clean branch, and review the diff.

## Campus dataset

Used by the city map. Files in `src/data/campus/`:

- `buildings.json`: a GeoJSON `FeatureCollection` of building footprints in WGS84 `[longitude, latitude]`. All 16 features are `Polygon`s. The feature id equals `properties.id`.
- `faculties.json`: an array of faculties.
- `index.ts`: exports `campusGeoJson`, `campusBuildings`, `faculties`, `facultyByAbbr` and `campusBuildingById`.

Feature properties (`CampusBuilding` in `src/domain/campus/model.ts`):

| Property | Type | Meaning |
| --- | --- | --- |
| `id` | string | Building id. Matches the indoor building id when `hasIndoorMap` is true |
| `code` | string or null | Timetable code, for example `BA` |
| `name` | `{ hu, en }` | Display name |
| `description` | `{ hu, en }` | One line saying what the building is |
| `kind` | `"faculty"`, `"dormitory"` or `"sports"` | Building kind |
| `campus` | `{ id, name }` | Site the building belongs to; buildings of a campus are grouped on the map and in lists |
| `faculties` | string[] | Faculty abbreviations housed there |
| `address` | string | Postal address |
| `district` | string | District |
| `location` | `[lon, lat]` | Building centre |
| `height` | number, metres | Extrusion height on the map |
| `color` | string | Map colour: the first faculty's colour for faculty buildings, otherwise neutral |
| `verified` | boolean | False when the footprint could not be confirmed against an official source |
| `hasIndoorMap` | boolean | True when indoor data exists |
| `osm` | string | OSM object the footprint came from, for example `way/159710379`. Present in the data, not in the TypeScript type |

Faculty entry (`Faculty`):

| Field | Type | Meaning |
| --- | --- | --- |
| `abbr` | string | Abbreviation, used as the id (`NIK`, `KVK`, ...) |
| `name` | `{ hu, en }` | Faculty name |
| `url` | string or null | Website |
| `color` | string | Colour of the faculty's buildings on the map |

Example feature (geometry shortened):

```json
{
  "type": "Feature",
  "id": "bc",
  "properties": {
    "id": "bc",
    "code": "BC",
    "name": { "hu": "BC épület", "en": "Building BC" },
    "description": { "hu": "„Mozdonyos” épület", "en": "The “locomotive” building" },
    "kind": "faculty",
    "campus": { "id": "becsi", "name": { "hu": "Óbudai kampusz", "en": "Óbuda campus" } },
    "faculties": ["KVK"],
    "address": "1034 Budapest, Bécsi út 94-96",
    "district": "III. kerület",
    "location": [19.0349116, 47.5334995],
    "height": 19,
    "color": "#ff7a1a",
    "verified": true,
    "hasIndoorMap": false,
    "osm": "way/118433139"
  },
  "geometry": { "type": "Polygon", "coordinates": ["... WGS84 ring ..."] }
}
```

To correct campus data, edit `buildings.json` or `faculties.json` directly, with the same caution about the bootstrap script as above. The source research and the OSM export are in [research/campus-buildings.md](research/campus-buildings.md) and `docs/research/data/campus-buildings.osm.geojson`.
