# Indoor navigation landscape and the case for a static, graph-based approach

Research note, November 2026. Every factual claim links to a source in the "Sources" section; items that could not be verified are marked "unverified".

## Summary

- Commercial campus platforms (MazeMap, Mappedin, MapsIndoors, ArcGIS Indoors, Concept3D) share one pipeline: CAD/BIM floor plans are imported, cleaned up, and a routing network of nodes and lines is added by the vendor or the customer. Routing is a graph search, not a navigation mesh.
- Live "blue dot" positioning is a separate, paid layer that needs infrastructure and a native SDK. Pointr states that web-only location is GPS-based and has no level detection.
- IMDF (OGC Community Standard) is a good vocabulary for units, openings and amenities, but it has no routing network. Vendors add the network separately.
- Research on 2D versus 3D maps and on landmark instructions is mixed; neither supports dropping text instructions.
- Our hypothesis (IMDF-like GeoJSON, explicit walkway polylines, A*, manual start or QR, three.js) is sound for one building. Its weak points are the three.js model as a cost centre, the 3D-versus-2D usability evidence, and data-maintenance discipline rather than the algorithm.

## 1. Existing solutions

| System | Map authoring | Routing | Start point / positioning | Pricing (public info) |
|---|---|---|---|---|
| MazeMap | Campus CAD (DWG) uploaded, generated with AI plus manual checks ([FAQ](https://mazemap.com/about-us/faqs)); DWG, IFC or PDF accepted as base layer ([guide](https://mazemap.com/post/indoor-navigation-campuses)) | Indoor paths from current location to destination ([Cisco blog](https://news-blogs.cisco.com/networking/mazemap-and-cisco-lead-the-way)); internals not documented | Optional positioning via Wi-Fi partners (Cisco blog); manual selection | Not public |
| Mappedin | Cloud CMS for POIs, routing and styling ([vendor](https://www.mappedin.com/resources/blog/indoor-mapping-wayfinding-software-guide)); IMDF export exists ([vendor](https://www.mappedin.com/blog/product/map-editor/product-101-imdf-export/)) | Network-based; accessible routing marketed ([vendor](https://www.mappedin.com/resources/blog/accessible-indoor-navigation-software/)) | Blue dot only in custom tiers | Third-party listings cite a free tier and about 165 USD per map per month (unverified against vendor page) ([review](https://www.guideflow.com/blog/indoor-mapping-software)) |
| MapsIndoors (MapsPeople) | Vendor processes customer CAD and defines routing networks during onboarding ([implementation guide](https://resources.mapspeople.com/hubfs/2024-contacts/MapsIndoors-implementation-and-support-1_04.pdf)); CMS for day-to-day edits ([docs](https://docs.mapsindoors.com/products/cms/data-concepts)) | Route network with barrier and door elements in the CMS ([docs](https://docs.mapsindoors.com/products/cms)) | Web, Android, iOS SDKs; positioning via third parties | Not public |
| ArcGIS Indoors | CAD imported in ArcGIS Pro ([tool docs](https://doc.esri.com/en/arcgis-pro/latest/tool-reference/indoors/import-cad-to-indoor-dataset.html)) into an indoor dataset | Routable network built in the GIS | Indoor positioning (ArcGIS IPS) is a separate purchase ([licensing](https://doc.esri.com/en/arcgis-pro/latest/help/data/indoors/choose-a-licensing-configuration.html)) | Contact sales; licensing split by role |
| Concept3D | Interactive map editor | Node network; stair-free option; no beacons required ([vendor](https://concept3d.com/interactive-virtual-experiences/features/wayfinding/)) | User picks start and destination | Not public |
| Apple Maps indoor | Venues submit IMDF via Apple Business Register ([Apple](https://register.apple.com/resources/indoor/program/indoor_maps)); Apple suggests Esri, Mappedin and others as tooling ([FAQ](https://register.apple.com/resources/indoor/program/faq)) | Not documented publicly | Device positioning in the Maps app | Not public |
| Situm, Pointr | Situm combines positioning, step-by-step navigation and 3D maps ([MWC listing](https://mwcbarcelona.com/exhibitors/31757-situm-wayfinding-interactive-maps)); Pointr has an app-free Express mode opened by QR, URL or NFC ([Pointr](https://www.pointr.tech/express)) | Layered on positioning | BLE, Wi-Fi, magnetic field via native SDKs | Not public |
| Anyplace (open source, MIT) | Browser "Architect" tool; crowdsourced Wi-Fi fingerprints ([GitHub](https://github.com/dmsl/anyplace), [paper](https://www.cs.ucy.ac.cy/~dzeina/papers/sigspatial17-letter.pdf)) | Server API | Wi-Fi fingerprinting on native clients | Free; needs a server (Couchbase) |

Google Maps indoor, OpenIndoor, OsmInEdit and OpenLevelUp were not verified in this research and are not characterised here. OpenLevelUp tagging recommendations exist on the OSM wiki ([page](https://wiki.openstreetmap.org/wiki/OpenLevelUp/Recommended_tagging)).

Deployments found: NTNU (described by MazeMap as one of the first universities with indoor navigation), Linkoping, Twente ([MazeMap](https://www.mazemap.com/universities), [Linkoping case](https://mazemap.com/case-studies-posts/linkoping-campus-navigation)). Hungary: ELTE runs a Building Information System with floor plans, but access is limited to university members ([ELTE](https://ttk.elte.hu/en/interactive-map-bis)). BME has an official app with a campus map; room-level indoor routing was not found ([App Store](https://apps.apple.com/us/app/bme-app/id1157868800?ls=1)). A 2016 paper describes indoor navigation with Linked Data at Obuda University ([dblp](https://dblp1.uni-trier.de/rec/conf/saci/FleinerSP16.html)); whether it is in production is unknown. Semmelweis, SZTE, TU Wien and ETH deployments were not confirmed, except that Esri reports ETH Zurich using ArcGIS indoor GIS ([Esri](https://www.esri.com/about/newsroom/arcwatch/swiss-university-enhances-accessibility-with-indoor-gis-technology)).

## 2. Data model standards

**IMDF** is a set of GeoJSON files (RFC 7946). Feature types: Venue, Building, Footprint, Level, Unit, Fixture, Section, Geofence, Kiosk, Detail, Opening, Amenity, Anchor, Occupant, Address, Relationship ([OGC](https://docs.ogc.org/cs/20-094/index.html)). It was accepted as an OGC Community Standard in 2021 without going through OGC's own approval process ([OGC justification](https://portal.ogc.org/files/92141)). The specification page lists no path or routing network; Apple's own guidance is outside the standard ([guidance](https://docs.ogc.org/cs/20-094/Apple_Guidance/index.html)). Vendors therefore keep the network in their own store (MapsIndoors route network, ArcGIS network dataset) and export IMDF only for display.

**OGC IndoorGML 2.0** Part 1 (published August 2025) models space as cells with boundaries and derives a dual navigation graph: one node per cell, edges between adjacent passable cells; several graphs (for example pedestrian and wheelchair) can coexist ([OGC announcement](https://www.ogc.org/ogc-publishes-indoorgml-2-0-part-1-conceptual-model-standard/), [overview paper](https://3d.bk.tudelft.nl/hledoux/pdfs/20_3dgeoinfo_indoorgml.pdf)). Part 2 carries the encodings. It is a conceptual model, heavy for a volunteer project.

**OSM Simple Indoor Tagging** uses `indoor=room|corridor|area`, `level=*`, `repeat_on=*`, and `highway=corridor` as the line routers follow ([wiki](https://wiki.openstreetmap.org/wiki/Simple_Indoor_Tagging), [corridor](https://wiki.openstreetmap.org/wiki/Tag:indoor%3Dcorridor)). It is the only common scheme that stores walkable lines next to room polygons.

**Minimal subset worth adopting:** Venue/Building (one), Level (ordinal, name), Unit (polygon, category, name, room code), Opening (door point/line, accessibility flag), Amenity (point, category), plus two project-specific layers that IMDF lacks: walkway LineStrings and connector points (stairs, lift, ramp, each with a connector id shared across levels). This mirrors the OSM `highway=corridor` idea in IMDF clothing and keeps IMDF export a future option.

## 3. Routing

| Approach | Strength | Weakness for this project |
|---|---|---|
| Node/edge graph, A* or Dijkstra | Simple, hand-authorable, easy per-edge attributes; used by Concept3D and others in practice | Paths follow drawn lines, not true shortest geometry |
| Navmesh (Recast/Detour) | More natural paths and better space efficiency, but harder to generate ([CMSC 425](https://www.cs.umd.edu/class/fall2018/cmsc425/Lects/lect16-nav-mesh.pdf)); designed for agent movement ([Recast docs](https://recastnav.com/md_Docs__1_Introducation.html)) | Needs accurate wall geometry; we have rough sign-derived outlines |
| Visibility graph / grid | Free-form paths | Same geometry demand; grid is memory-heavy for multi-floor |

Multi-floor handling: AccessMap-style pathfinders merge floors into one graph, block stair edges for a wheelchair profile, apply a small surcharge to lifts, and set the heuristic to 0 for multi-floor routing because Euclidean distance does not generalise across floors; Dijkstra is fast at floor-plan scale ([AccessMap](https://accessmap.uom.gr/about)). 3D Wayfinder models lift waiting as extra weight on the lift node (its example: 3 minutes as 150 m) ([3D Wayfinder](https://3dwayfinder.com/?p=2349)). The W3C paper recommends discarding routes unsuitable for a disability ([W3C](https://www.w3.org/WAI/RD/2014/way-finding/paper6)). I found no empirical calibration of lift-wait or stair penalties; treat them as tunable constants.

Instructions: landmark-based instructions are argued to impose lower cognitive load than metric ones ([Pavlin 2016, TU Wien](https://repositum.tuwien.at/handle/20.500.12708/4769)). Evidence on map type is mixed: a virtual multi-level study found higher accuracy with 2D maps ([Li and Giudice 2013](https://umaine.edu/vemi/wp-content/uploads/sites/220/2016/08/2013-The-effects-of-2D-and-3D-maps-on-learning-virtual-multi-level-indoor-environments-1.pdf)), while a 2025 virtual-mall study found better visual search with 3D maps, especially when landmark labels sat on or below the map ([Frontiers in VR 2025](https://www.frontiersin.org/journals/virtual-reality/articles/10.3389/frvir.2025.1622522/full)). Both are virtual-environment studies; transfer to a phone in a real building is unverified.

## 4. Positioning without infrastructure

- Browser geolocation relies on GPS/assisted GPS, which is unreliable indoors; Pointr's comparison puts web solutions at 5-10 m with no level detection versus under 1-3 m for native SDKs ([Pointr](https://www.pointr.tech/blog/dispelling-web-based-bluedot-myth)).
- Web Bluetooth is not supported in iOS Safari ([caniuse](https://caniuse.com/web-bluetooth)); only third-party browsers or extensions provide it. Wi-Fi RTT is a native Android API since Android 9 ([Android docs](https://developer.android.com/develop/connectivity/wifi/wifi-rtt)); I found no web equivalent.
- Low-cost anchors: QR or NFC tags at known points (Pointr Express uses QR, URL or NFC to open maps; an RWTH Aachen thesis prototype georeferences users by QR scans, [thesis](https://hci.rwth-aachen.de/publications/stallmann2025a.pdf)), manual start selection, and per-room deep links. A study of QR-initialised AR on a campus used 256 students ([paper](https://thesai.org/Downloads/Volume16No4/Paper_6-Evaluating_User_Acceptance_and_Usability_of_AR.pdf)), though it required native AR, not a static page.

## 5. Mobile UX patterns

Evidence for these patterns is vendor material and practice, not controlled studies, except where noted. Common elements: search-first entry; a floor switcher with the current level always visible; a route preview before starting; step cards that show a floor change as its own step; deep links per room; a text list of steps as an alternative to the 3D view (needed for screen readers); offline use via a service worker, feasible because all data is static. Concept3D describes node-based routing with stair-free options as standard ([vendor](https://concept3d.com/interactive-virtual-experiences/features/wayfinding/)).

## 6. Recommendation and critique of the hypothesis

**Keep:** per-level GeoJSON with IMDF-like names; explicit walkway polylines and connector points (this is what vendors do, just hidden in a CMS); a graph with A* (or Dijkstra, given the multi-floor heuristic issue above); a step-free profile as edge filter; manual start, deep link or QR, defaulting to the main entrance.

**Where the hypothesis is weak:**
1. *Heuristic.* Plain 3D Euclidean A* is admissible but weak across floors, and adds nothing at building scale. Use Dijkstra or A* with a per-floor heuristic; do not spend effort here.
2. *Three.js model first.* The model is the largest cost and the least evidenced benefit; the 2D/3D literature is inconclusive. Build a 2D floor view plus text steps first, treat the exploded 3D view as optional polish, and ensure the app works without WebGL.
3. *Data quality, not algorithm, is the risk.* Rough geometry from signs means unreliable door positions, missing rooms and wrong distances. Add a validator (connected graph, every unit reachable from an entrance, every connector present on both levels) in CI, and show a "rough map" notice.
4. *Walkway polylines drift from rooms.* Hand-drawn lines and room polygons can disagree. Store a `door` node per unit and generate edges from door to the nearest walkway, rather than drawing room links by hand.
5. *Default start = main entrance* is a weak default for students entering elsewhere; prompt for the start when no deep link is given.
6. *IMDF fidelity.* Claiming IMDF compatibility invites validator failures (Apple validates submitted files, [Apple](https://register.apple.com/resources/indoor/program/indoor_maps)). Say "IMDF-inspired" unless export is actually tested.

**Alternatives and when to prefer them:** a navmesh only if accurate wall geometry (CAD or survey) becomes available; OSM Simple Indoor Tagging as the source of truth if the project wants community editing and reuse (tooling like OsmInEdit is unverified here); a vendor platform if the university wants live positioning, analytics and paid support, accepting recurring cost and lock-in.

**Risks:** volunteer turnover and stale data (mitigate with a simple schema, validation and a "report an error" link); accessibility claims without surveyed data (label step-free routes as indicative); privacy is low-risk since there is no backend or positioning.

## Sources

- MazeMap: https://mazemap.com/about-us/faqs, https://mazemap.com/post/indoor-navigation-campuses, https://www.mazemap.com/universities, https://mazemap.com/case-studies-posts/linkoping-campus-navigation, https://news-blogs.cisco.com/networking/mazemap-and-cisco-lead-the-way
- Mappedin: https://www.mappedin.com/resources/blog/indoor-mapping-wayfinding-software-guide, https://www.mappedin.com/blog/product/map-editor/product-101-imdf-export/, https://www.mappedin.com/resources/blog/accessible-indoor-navigation-software/, https://www.guideflow.com/blog/indoor-mapping-software
- MapsIndoors: https://resources.mapspeople.com/hubfs/2024-contacts/MapsIndoors-implementation-and-support-1_04.pdf, https://docs.mapsindoors.com/products/cms, https://docs.mapsindoors.com/products/cms/data-concepts
- ArcGIS Indoors: https://doc.esri.com/en/arcgis-pro/latest/tool-reference/indoors/import-cad-to-indoor-dataset.html, https://doc.esri.com/en/arcgis-pro/latest/help/data/indoors/choose-a-licensing-configuration.html, https://www.esri.com/about/newsroom/arcwatch/swiss-university-enhances-accessibility-with-indoor-gis-technology
- Concept3D: https://concept3d.com/interactive-virtual-experiences/features/wayfinding/
- Situm, Pointr: https://mwcbarcelona.com/exhibitors/31757-situm-wayfinding-interactive-maps, https://www.pointr.tech/express, https://www.pointr.tech/blog/dispelling-web-based-bluedot-myth
- Anyplace: https://github.com/dmsl/anyplace, https://www.cs.ucy.ac.cy/~dzeina/papers/sigspatial17-letter.pdf
- Apple and IMDF: https://register.apple.com/resources/indoor/program/indoor_maps, https://register.apple.com/resources/indoor/program/faq, https://docs.ogc.org/cs/20-094/index.html, https://docs.ogc.org/cs/20-094/Apple_Guidance/index.html, https://portal.ogc.org/files/92141
- IndoorGML: https://www.ogc.org/ogc-publishes-indoorgml-2-0-part-1-conceptual-model-standard/, https://3d.bk.tudelft.nl/hledoux/pdfs/20_3dgeoinfo_indoorgml.pdf
- OSM: https://wiki.openstreetmap.org/wiki/Simple_Indoor_Tagging, https://wiki.openstreetmap.org/wiki/Tag:indoor%3Dcorridor, https://wiki.openstreetmap.org/wiki/OpenLevelUp/Recommended_tagging
- Hungary: https://ttk.elte.hu/en/interactive-map-bis, https://apps.apple.com/us/app/bme-app/id1157868800?ls=1, https://dblp1.uni-trier.de/rec/conf/saci/FleinerSP16.html
- Routing: https://www.cs.umd.edu/class/fall2018/cmsc425/Lects/lect16-nav-mesh.pdf, https://recastnav.com/md_Docs__1_Introducation.html, https://accessmap.uom.gr/about, https://3dwayfinder.com/?p=2349, https://www.w3.org/WAI/RD/2014/way-finding/paper6
- Cognition and maps: https://repositum.tuwien.at/handle/20.500.12708/4769, https://umaine.edu/vemi/wp-content/uploads/sites/220/2016/08/2013-The-effects-of-2D-and-3D-maps-on-learning-virtual-multi-level-indoor-environments-1.pdf, https://www.frontiersin.org/journals/virtual-reality/articles/10.3389/frvir.2025.1622522/full
- Positioning: https://caniuse.com/web-bluetooth, https://developer.android.com/develop/connectivity/wifi/wifi-rtt, https://hci.rwth-aachen.de/publications/stallmann2025a.pdf, https://thesai.org/Downloads/Volume16No4/Paper_6-Evaluating_User_Acceptance_and_Usability_of_AR.pdf
