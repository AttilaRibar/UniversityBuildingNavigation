# BA building (Óbudai Egyetem, Bécsi út 96/B) - research report

Compiled 2026-11-15. Geometry: OSM API 0.6 `map` bbox 19.0315,47.5320,19.0355,47.5350 (Nominatim/Overpass not needed). Raw OSM data: `ba-footprint.geojson` (same folder). OSM (c) OpenStreetMap contributors, ODbL.
Local metre frame used below: origin lat 47.5338, lon 19.0343; x = east, y = north; 1 deg lat = 110574 m, 1 deg lon = 75170 m (cos 47.5338 deg). Bearings are true bearings (0 = N, clockwise).

## IMPORTANT orientation correction
The brief says "long north bar (Doberdó út side)". In real geography the long bar lies on the **west / south-west** side, running WNW-ESE (bearing 124.5 deg). Bécsi út is on the **east** side (the road runs bearing ~331/151 deg, 45-90 m east of the building). Doberdó út is **south-west** of the bar. So the sign plans are drawn with "up" rotated roughly 90-125 deg from true north; do not equate plan-up with north. (Source: road node coordinates in OSM ways 404636126 Bécsi út, 262582156 Doberdó út.)

## (a) Footprint and dimensions (OSM)

### Which polygon is which (all OSM ways, tags in the geojson)
| OSM id | levels tag | Area (m2, computed) | Min-rotated-rectangle L x W (m) | Long-axis bearing | Interpretation |
|---|---|---|---|---|---|
| way/159710379 | building:levels=2 (tag conflicts with parts) | 2646 | 95.9 x 71.9 (whole) | 126.6 | Outer building outline "Óbudai Egyetem NIK (BA épület)", addr 96/B, ref=BA, building=university, 57 nodes |
| way/200241758 | 5 | 833 | 57.9 x 16.7 | 124.5 / 304.5 | **The long straight bar = Doberdó út wing** (brick, parallel to Doberdó út). Corners approx (-65,15), (-53,27), (-18,-17), (-37,-4) |
| way/200241759 | 3 | 569 | 46.2 x 18.7 | 152 / 332 | **East wing = Bécsi út wing** (parallel to Bécsi út, bearing 152 vs road 151) |
| way/200241761 | 2 | 465 | 36.3 x 24.5 | 62 / 242 | **Link / glass "connecting wing"** between bar and east wing; contains the aula (architect: lower glass-fronted third wing with aula + round hall). Irregular, bends around the drum |
| way/190583206 | 3 | 320 | 20.4 x 20.0 | n/a (round) | **Round Auditorium Maximum drum**: circle fit centre lat 47.533917, lon 19.034310 (local x 0.8, y 13.0); mean radius 10.0 m (8.7-11.6) => **diameter ~20 m**; 21 nodes |
| way/200241763 | 2 + building:levels:underground=1 | 393 | 28.8 x 13.7 | 130 / 310 | **South block** (SSE of the drum, towards lower Doberdó út bend). OSM node F.01 (housename) lies inside it => F.01 lecture room (268 seats per booking site) is in this block. Has 1 underground level (garage per architect) |
| way/200241762 | 4 | 66 | 12.7 x 5.4 | 41 / 221 | small stub where bar, link and south block meet at the SE end of the bar (stair/lift core? INFERRED) |
| way/118433139 | 5 | - | - | - | NEIGHBOUR: "Óbudai Egyetem KVK (BC épület)", Bécsi út 94-96, Kandó Kálmán Villamosmérnöki Kar, loc_name "Mozdonyos épület", ref=BC. NOT 96/B |
| way/165208349 | 6 | - | - | - | NEIGHBOUR: RKK (D épület), Doberdó út 6, Rejtő Sándor Kar |
| way/267493714 | 6 | - | - | - | NEIGHBOUR: Kiss Árpád Kollégium, Doberdó út 6/A |
| way/396248314 | 3 | - | - | - | unnamed OSM building ("building=yes", 3 levels) near RKK, not 96/B |
| rooms 1313831590/91, corridor 1313831592 | - | - | - | - | indoor=room "Schmalz terem (EA. II.)", "Gara terem (EA. I.)" - these belong to the RKK/D building (Doberdó út), NOT BA |

There is no OSM relation for the BA building (no multipolygon); the outer way + 6 `building:part` ways are the complete model. OSM "levels" per part: bar 5, east wing 3, link 2, drum 3, south block 2+1 underground, stub 4. The outer way's `building:levels=2` is inconsistent with the parts.

### Derived numbers (how computed)
Method: convert node lat/lon to local metres (formula above), shoelace area, minimum-area rotated rectangle (tries each polygon edge direction), circle fit = mean distance of the 21 drum nodes to their centroid. Accuracy limited by OSM tracing (probably +-1 m).
- Whole footprint: 2646 m2; min-rotated bounding box ~96 x 72 m aligned 126.6 deg. Axis-aligned extent ~102 m (x -65..37) x 77 m (y -39..38).
- Long bar (Doberdó wing): **~58 m x ~17 m**, long axis bearing **124.5 deg (WNW-ESE)**, 5 storeys.
- East wing (Bécsi wing): ~46 m x ~19 m, long axis **152 deg (NNW-SSE)**, 3 storeys. Angle between bar axis and east-wing axis = 27.5 deg (matches Vargha/architect: two wings "bezárnak egy szöget", the aula "absorbs the horizontal angular rotation").
- Round Audmax: centre 47.533917 N, 19.034310 E; diameter ~20 m (area 320 m2 incl. wall).
- South block: ~29 x 14 m, 2 storeys + 1 underground, axis 130 deg (almost parallel to the bar).
- Link/aula wing: ~36 x 25 m bounding rectangle (irregular), axis 62 deg (roughly perpendicular to the bar).
- Centre of drum to bar axis, to east-wing end: drum centre is ~ (0.8, 13.0); the bar's ESE end is at ~(-18,-17); east wing's NNE end at ~(24,38); south block at ~(-3,-27). 
- Footprint-sum x levels (INFERRED rough gross area): 833x5 + 569x3 + 465x2 + 320x3 + 393x3 + 66x4 = ~9200 m2. Published figures: 6000 m2 "alapterület" (university job-fair site), 6000 m2 nettó (Építészfórum 2002 project info), 6600 m2 nettó (Vargha, Építészfórum 2005). The difference to my estimate is plausible (gross vs net, OSM levels are rough).

### Entrance nodes (OSM, all in geojson)
| node | lat, lon | local x,y (m) | tags | where (INFERRED from geometry) |
|---|---|---|---|---|
| 2026970281 | 47.533914, 19.0347211 | 31.6, 12.6 | entrance=main | vertex of east wing, east/Bécsi út face - the **Bécsi út main entrance** (consistent with architect: glass curtain wall of aula runs to the facade, entrance next to it). Sits ~25 m from road centreline |
| 2104740103 | 47.5338219, 19.0341656 | -10.1, 2.4 | entrance=yes | junction drum/bar, aula side (inner) |
| 2104810681 | 47.5337185, 19.034277 | -1.7, -9.0 | entrance=yes, wheelchair=yes | south face of link wing near south block |
| 9131336604 | 47.533809, 19.0345292 | 17.2, 1.0 | entrance=yes, wheelchair=yes | link wing towards the courtyard/garden (east of aula) |
| 2102542701 | 47.5339105, 19.0338819 | -31.4, 12.2 | entrance=yes | bar, north-east (courtyard) face |
| 2380664859 | 47.5338318, 19.0339429 | -26.8, 3.5 | entrance=yes | bar, south-west face (towards Doberdó út) - candidate Doberdó side entrance |
| 2026970276 | 47.533644, 19.0340663 | -17.6, -17.2 | entrance=yes | ESE end of bar |
| 2102521187 | 47.533618, 19.0347421 | 33.2, -20.1 | entrance=yes | outside outline, SE; probably campus / Kandó side |
| 2102521185 | 47.533556, 19.0350461 | 56.1, -27.0 | entrance=main | next to Bécsi út, outside BA outline (likely BC/forecourt or ramp); do not assume BA |
| 2027234206 | 47.533395, 19.0337495 | -41.4, -44.8 | entrance=main, wheelchair=no | belongs to RKK (D building) |
Other mapped features inside/around: node 2102485277 (47.5339006,19.0343202) "Audmax", official_name "Auditorium Maximum", ref **BA.1.32.Audmax**; node 2104810654 "Aula" (7.7,-0.2); housename nodes F.01 (1.1,-22.8) F.02 (-19.0,-11.6) F.03 (-25.3,-7.6) F.04 (-31.9,-3.0) F.05 (-43.3,8.4) F.06 (-51.1,17.8) F.08 (30.0,4.3). F.07 and F.09 are NOT mapped. Node 4798718588 "IT Evolúció kiállítás" (-22.3,-2.7; Mo-Fr 06:00-22:00); node 9700157832 "Charger Kantin" fast food (-1.1,14.5) with note "under the Audmax, entrances on two sides from the ground-floor side", Mo-Fr 08:00-16:00; node 12204780001 bicycle parking (37.7,-2.4, capacity 14); statue park busts (Neumann, Bánki, Kandó, Rejtő, Keleti) at ~ (13..16,-35..-38) i.e. in the garden south of the south block; elevator node 12159539497 at (-47,-50) is RKK.
Mapped OSM F.xx nodes are positioned along the bar's SW face in order F.02..F.06 (every ~8-12 m), matching the architect's "several smaller lecture rooms crosswise in the Doberdó wing".

### Plan-geometry summary for the 3D model
- Two brick wings: Doberdó wing (long bar, 5 storeys, bearing 124.5) and Bécsi wing (3 storeys, bearing 152, parallel to Bécsi út); angle between them 27.5 deg.
- A lower glass-fronted link wing between them holds the aula and the ~20 m diameter cylindrical Audmax (wooden cladding).
- A small 2+1-storey block (F.01 hall + underground garage) to the south of the link.
- Terrain falls steeply from Doberdó út (high, WSW) to Bécsi út (low, E): more than 10 m (>3 storeys) between the Kandó Bécsi út entrance and the RKK front steps (Bérces thesis), see (c).

## (b) Rooms

Code scheme: BA = Bécsi út "A" building (Óbudai Egyetem Table of room codes: BA 1034 Bécsi út 96/B "Building A"; BC 94-96 "Building C"; BK.127 = Kandó dormitory Bécsi út 104-108) https://nik.uni-obuda.hu/en/for-newly-admitted-2/ . Format `BA.<level>.<nn>`; "F" = földszint (ground), e.g. BA.F.05 (gyakorikerdesek.hu answer, unofficial). Rooms are cited on NIK pages as plain "F.09", "AudMax", "BA.4.01".

**Level surprise: a 4th floor exists.** NIK Dean's Office is at "Bécsi út 96/B IV. emelet" and staff offices run 4.03-4.23; "BA.4.01 NIK tárgyaló" is an event location. OSM gives 5 levels for the bar (e.g. A,F,1,2,3 or F..4 - cannot tell). Your signs (A,F,1,2,3) should be checked for a level 4 sign. Also the university web says "Rektori Hivatal: Bécsi út 96/B I-II. emelet" and "EKIK: I.-II. em." (uni-obuda.hu).

### Ground level F (aula level = real "földszint", one storey above Bécsi út entrance)
| Room | Name/function | Capacity | Source |
|---|---|---|---|
| F.01 | lecture hall (largest after Audmax) | 268 seats (ÓE Ingatlan booking site, via search snippet; page itself returned HTTP 500 to me) | https://ingatlan.uni-obuda.hu/terem/f01 ; event use: https://nik.uni-obuda.hu/kcd-budapest-2026/ (KCD 2026 in AudMax + F.01) ; OSM node places it in the south block |
| F.02 | theatre-style lecture room | 40 | https://ingatlan.uni-obuda.hu/terem/f02 |
| F.03 | lecture room (doctoral seminar 2023) | not found | https://nik.uni-obuda.hu/doktorandusz-szeminariumok-2023-tavaszan/ |
| F.04 | lecture room (freshmen sessions 2023) | not found | https://nik.uni-obuda.hu/golyaknak/ |
| F.05 | lecture room, used for NIK freshmen start-of-term, HPC conference | not found | https://nik.uni-obuda.hu/high-performance-computing-konferencia-2025/ |
| F.06 | lecture room | 144 | https://ingatlan.uni-obuda.hu/terem/f06 (snippet) |
| F.07 | exists? not found in any source | - | - |
| F.08 | lecture room | 84 | https://ingatlan.uni-obuda.hu/terem/f08 (snippet) |
| F.09 | "előadóterem", NIK's main event room (doctoral seminars, research-group days, cooperative forums). "Pauli" only in an unverified Foursquare list (you already know it from signs) | not found | https://nik.uni-obuda.hu/nik-kari-kutatocsoportok-bemutatkozasa-2026/ |
| Aula ("Aula") | main aula; terrace opens from it (garden/courtyard side); events, exhibitions, concerts | 200 | https://ingatlan.uni-obuda.hu/terem/aula (snippet) |
| Charger Kantin (büfé) | fast food under Audmax | - | OSM node 9700157832 |
Overall from the university: "5 lecture rooms >100 seats (largest 323), 5 rooms of 48 seats each" in the central building (https://allasborze.uni-obuda.hu/location/show/2). Architect: ten lecture halls of 50-350 seats grouped around the aula (Bérces thesis). INFERRED: the five >100 are Audmax, F.01, F.06, plus two of F.03/F.04/F.05/F.09; the 48-seat rooms are among F.02-F.09 (F.02 is listed at 40 - small mismatch).

### Level 1
| Room | Name/function | Capacity | Source |
|---|---|---|---|
| 1.32 | **Auditorium Maximum / AudMax** (OSM ref BA.1.32.Audmax; round hall, ~20 m diameter). Lecturer platform is one level above the aula per Vargha. "Kármán Tódor nagyelőadó" NOT found in any public source | 330 (ingatlan.uni-obuda.hu/terem/audmax) / 323 (allasborze.uni-obuda.hu, "largest 323") | OSM node 2102485277; https://nik.uni-obuda.hu/golyaknak-2025/ (AudMax freshman welcome) |
| NIK aula | upper-level foyer / exhibition space, houses "IT Evolúció" exhibition, 100 seated; NIK event page: "F.01 és NIK aula (első emeleten)" = first floor. OSM exhibition node at (-22,-3) in the bar | 100 | https://nik.uni-obuda.hu/ai-campus-kovetkezo-fokozat/ ; https://ingatlan.uni-obuda.hu/terem/nik-aula ; https://nik.uni-obuda.hu/wp-content/uploads/2024/11/infrastruktura_kiajanlo-1.pdf |
| Labor 1.10 | computer lab | 27 | infrastruktura_kiajanlo-1.pdf |
| Labor 1.12 | computer lab | 12 | same |
| Labor 1.13 | computer lab | 25 | same |
| Labor 1.14 | computer lab | 25 | same |
| Labor 1.15 | computer lab | 25 | same |
| Labor 1.16 | computer lab (87" interactive display) | 13 | same |
| Labor 1.19 | computer lab | 25 | same |
| 1.08, 1.11, 1.27 | staff offices (BAMI / cyber-physical institutes) | - | https://nik.uni-obuda.hu/biomatika-es-alkalmazott-mesterseges-intelligencia-intezet/ , https://nik.uni-obuda.hu/kiberfizikai-rendszerek-intezet/ |
Numbers in 1.xx up to 1.32 exist (labs 1.10-1.19, offices 1.08/1.11/1.27, Audmax 1.32). Full set not published.

### Level 2
| Room | Name/function | Capacity | Source |
|---|---|---|---|
| Labor 2.10 | PC lab with GTX 1050 | 25 | infrastruktura_kiajanlo-1.pdf |
| Labor 2.12 | workstation lab (Dell Precision, Radeon Pro) | 30 | same |
| Labor 2.13 | Cisco network lab | 25 | same |
| Labor 2.14 | PC lab (EPAM) | 25 | same |
| Labor 2.15 | PC lab | 25 | same |
| Labor 2.18 | digital measurement ("Digit") lab | 27 | same |
| Labor 2.20 | digital measurement lab | 25 | same |
| 2.09, 2.11, 2.28 | offices (2.11 Dean's Office operations group technicians; 2.09 BAMI; 2.28 BAMI institute engineer "BA.1.27"-labelled) | - | https://nik.uni-obuda.hu/dekani-hivatal/ |
Conflict: old Foursquare list puts "Cisco labor" at BA.2.18; NIK's lab brochure puts the Cisco lab at 2.13. Brochure is newer: use 2.13. Your sign says 2.21-2.36 are EKIK; consistent with 2.28 being outside the NIK-lab range (2.10-2.20).

### Level 3 (NIK institutes - offices from staff pages; room is the office number)
Parse note: each staff table row ends with the office number; I assigned rooms to institutes by the page they appear on. Rooms may be shared / listed on another institute's page.
| Range | Unit | Evidence |
|---|---|---|
| 3.03-3.14 | Szoftvertervezés és -fejlesztés Intézet (3.03,3.08,3.09,3.10,3.11,3.12,3.13,3.14) incl. Etikus Hacker Labor lead at 3.10, CUDA Teaching Center lead 3.12; director office 3.14 | https://nik.uni-obuda.hu/szoftvertervezes-es-fejlesztes-intezet/ |
| 3.15-3.22 | Kiberfizikai Rendszerek Intézet (3.15,3.16,3.17,3.18 director,3.19,3.20 admin,3.22) | https://nik.uni-obuda.hu/kiberfizikai-rendszerek-intezet/ |
| 3.19, 3.24, 3.25, 3.27 (+3.02, 4.05, 4.07, 2.09, 1.08, 1.27, 2.28) | Biomatika és Alkalmazott MI Intézet (3.19 deputy director/admin 3.27; 3.25 research centre director; 4.07 = dean/acting institute director) | https://nik.uni-obuda.hu/biomatika-es-alkalmazott-mesterseges-intelligencia-intezet/ |
| 3.02, 3.15, 3.24, 3.27 | Dean's Office staff (administration, ops) | https://nik.uni-obuda.hu/dekani-hivatal/ |
Numbers seen on level 3: 3.02, 3.03, 3.08-3.20, 3.22, 3.24, 3.25, 3.27 (your signs say 3.01-3.28; consistent). The older name of the institutes on the university site: Informatikai Rendszerek, Intelligens Mérnöki Rendszerek, Szoftvertechnológia Intézet - NIK has since reorganised to the four institutes above.

### Level 4 (not on your list)
| Room | Function | Source |
|---|---|---|
| 4.01 | NIK tárgyaló (meeting room), research-night venue | https://nik.uni-obuda.hu/20-eves-a-kutatok-ejszakaja-ket-evtized-a-tudomany-szolgalataban/ |
| 4.03-4.23 (seen: 4.03,4.04,4.05,4.06,4.07,4.08,4.09,4.10,4.11-4.18,4.19,4.20,4.21,4.22,4.23) | Dean's Office (dean 4.07, secretariat 4.06, head of Dean's Office 4.19), Diplomáztatási Csoport (4.10, 4.20, 4.22), Gazdasági Csoport 4.21, Alkalmazott Matematika Intézet (4.08, 4.11-4.15, 4.17, 4.23) | https://nik.uni-obuda.hu/dekani-hivatal/ ; https://nik.uni-obuda.hu/alkalmazott-matematika-intezet/ ; https://nik.uni-obuda.hu/diplomaztatasi-csoport/ ("Bécsi út 96/b BA épület 4. emelet irodáiban") |

### Named rooms / named-after
- F.09 = "Wolfgang E. Pauli konferenciaterem" (from your sign; only secondary hint "(Pauli)" in a 2016-ish Foursquare list).
- Audmax / "Kármán Tódor nagyelőadó": not found publicly. 
- Statue garden (OSM): busts of Neumann János, Bánki Donát, Kandó Kálmán, Rejtő Sándor, Keleti Károly (faculty name-givers) plus statues Rudolf Kalman, Ybl Miklós in the garden south of the south block, opposite the Roman cemetery display.
- Roman-era sarcophagus restored in situ under a glass floor in the trapezoid inner courtyard (Vargha).

## (c) Building facts
- **Architect:** Bérces László, Mérték Építészeti Stúdió Kft. (competition won; design 2001; built 2005; general contractor KÉSZ Kft.; client Budapesti Műszaki Főiskola). Sources: https://epiteszforum.hu/a-budapesti-muszaki-foiskola-uj-epulete-a-becsi-uton-2005 , https://epiteszforum.hu/foiskola-az-amfiteatrumnal-bmf-bovites , https://epiteszforum.hu/budapesti-muszaki-foiskola-obudai-fejlesztese . (A search result also claimed Paulinyi and Partners designed it in 2002 - NOT supported by the Építészfórum credits; probably a different/competing project. Treat as unverified.)
- **Year:** designed 2001-02, built 2005 (Építészfórum "Építés éve: 2005"; Vargha article 2005-09). Exact handover date not found.
- **Cost / size:** 2.5 billion HUF; "6600 m2 nettó" (Vargha 2005); "nettó alapterület 6000 m2" (2002 plan); "6000 m2 alapterület" (university job-fair page). University says the central building won the Budapest Építészeti Nívódíj.
- **Programme:** Rector's Office, Neumann János Informatikai Kar, ten lecture halls (50-350 seats; "larger hall lengthwise, several smaller crosswise in the Doberdó wing"), aula, round Auditorium Maximum, parking level in the basement "with exit towards Bécsi út, reachable from several points by lifts and stairs" (2002 text).
- **Form (architect's own words, Bérces DLA thesis, https://dla.epitesz.bme.hu/storage/2024/05/534-_DLA-tezisfuzet_BercesL.pdf, ch. 3):** three parts: two long brick wings parallel to Bécsi út and Doberdó út (enclosing an angle), joined by a lower glass-fronted third wing containing the aula and the largest, round lecture hall. The aula, raised relative to Bécsi út, is the building's real ground floor; the three wings form a continuous space there and ~ten lecture halls cluster around it. Two perpendicular axes: (1) climbs the steep slope inside the building from the Bécsi út main entrance to the Doberdó út main entrance three levels higher (exactly aligned with the RKK entrance stairs); (2) near-horizontal: from aula through the outdoor atrium to a secondary entrance at Doberdó út (continuing to Kecske utca) and the other way around the Audmax cylinder along the lecturers' corridor to the building's own garden. The glass wall of the aula runs to the Bécsi út facade; at night the "gallery-bridge" is visible as a double row of lights; raw brick used inside too. Terrain: >10 m (>3 storeys) height difference between the Bécsi út entrance of Kandó (BC) and the lower step level in front of RKK (D), plus one more storey to the lobby.
- **Vargha (2005, https://epiteszforum.hu/foiskola-az-amfiteatrumnal-bmf-bovites):** from the Bécsi út entrance you arrive in the aula one level up; to the left through a glass wall is a trapezoid courtyard (Roman sarcophagus under glass); to the right one more level up is the lecture platform of the cylinder; above the aula an upper-level foyer arcs against the straight glass wall - **that arc is the bridge leading to the ground floor of the Doberdó wing**. "Half-sunken aula". Bécsi wing as tall as the older Kandó building; concrete (nyersbeton) entrance block projects at the height change on the Doberdó facade. The Bécsi facade has fewer openings on the lower two levels (traffic noise).
- **Why "basement" = Bécsi út entrance (INFERRED, consistent with sources):** the building is cut into a slope falling towards Bécsi út; the Bécsi út entrance is on the lowest level (garage + entrance hall, signage "A"); the aula one level above it is the architect's "földszint" (F); the Doberdó út entrance is at the top (level 1).
- **Storeys:** OSM: bar 5, east wing 3, link 2, drum 3, south 2+1 underground. Documents: floors A, F, 1, 2, 3 and **4** (Dean's Office "IV. emelet"). Rektori Hivatal "I-II. emelet", EKIK "I.-II. em." (uni-obuda.hu).
- **Lifts/stairs counts:** not found. Lift engineer credited (Kardos Géza) but no count.
- **Accessibility:** not found officially. OSM tags wheelchair=yes on entrances 2104810681 and 9131336604 only. University campus page only lists trams 17, 19, 41 under "accessibility". No info on accessible toilets.
- **Opening hours:** staff may be in university buildings Mon-Fri 06:00-22:00; later by registering at the porta (Rector's instruction 3/2024, https://uni-obuda.hu/wp-content/uploads/2024/03/3_2024_Rektori_utasitas.pdf, via search summary, not read in full). IT Evolúció exhibition: Mo-Fr 06:00-22:00 (OSM) / 6-20 (2016 article). Doctoral office in Mediaworks (Bécsi út 122-124 - different building) 06:00-20:00 - not BA. Porta existence confirmed (doctoral house rules mention "porta szolgálat" but for Mediaworks).
- **Contacts:** Dean's Office +36 1 666 5520, titkarsag@nik.uni-obuda.hu; NIK +36 1 666 5540; ÓE facility room rental teremberlet@uni-obuda.hu.
- **Parking:** only paid street parking around the university (allasborze page); building has its own basement garage (architect).
- **Around the building:** Szent Vér kápolna (OSM 334044451), Roman cemetery display opposite the statue park, Mozdonyos (Kandó V43 locomotive) at the corner Bécsi út / Doberdó út.

## (d) Sources
- OSM API 0.6 map call (bbox above), way ids in table; https://www.openstreetmap.org/way/159710379 etc.
- Bérces László DLA thesis summary (architect's description): https://dla.epitesz.bme.hu/storage/2024/05/534-_DLA-tezisfuzet_BercesL.pdf
- Építészfórum: https://epiteszforum.hu/budapesti-muszaki-foiskola-obudai-fejlesztese (2002 competition plan; 8 images: SW facade, SE facade, Bécsi út facade, inner courtyard view, ground-floor plan), https://epiteszforum.hu/a-budapesti-muszaki-foiskola-uj-epulete-a-becsi-uton-2005 (15 photos by Somlyódy Nóra, no captions in text), https://epiteszforum.hu/foiskola-az-amfiteatrumnal-bmf-bovites (19 photos, Vargha Mihály)
- ÓE job-fair site: https://allasborze.uni-obuda.hu/location/show/2 ; brochure https://allasborze.uni-obuda.hu/downloads/2025_osz_kiajanlo.pdf (page 8 contains a schematic map with labels "F02", "F09", "Terasz", "Udvar", "Udvar", "Bécsi út", "Doberdó út" - I could only read the labels from text, not the drawing)
- NIK lab brochure: https://nik.uni-obuda.hu/wp-content/uploads/2024/11/infrastruktura_kiajanlo-1.pdf
- NIK staff/institute pages: https://nik.uni-obuda.hu/dekani-hivatal/ , /alkalmazott-matematika-intezet/ , /biomatika-es-alkalmazott-mesterseges-intelligencia-intezet/ , /kiberfizikai-rendszerek-intezet/ , /szoftvertervezes-es-fejlesztes-intezet/ , /diplomaztatasi-csoport/
- NIK event pages (rooms in use): see table links; room-code table https://nik.uni-obuda.hu/en/for-newly-admitted-2/
- ÓE room rental site (data only via search-engine snippets because the site returned HTTP 500 to my client): https://ingatlan.uni-obuda.hu/ , /terem/audmax , /terem/f01 , /f02 , /f06 , /f08 , /aula , /nik-aula
- https://uni-obuda.hu/telephelyeink/ and https://uni-obuda.hu/campuses/ (addresses; "Rejtő faculty directly behind the main building at Doberdó út 6")
- https://eduline.hu/felsooktatas/Obudai_Egyetem_innovacios_kozpont_ERU8NO (EKIK core in central building since March, FabLab, da Vinci robot, 8 research centres incl. Bejczy Antal iRobottechnikai Központ)
- hu.wikipedia Óbudai Egyetem (BA = A épület at Bécsi út, NIK seat and dean's office): https://hu.wikipedia.org/wiki/Óbudai_Egyetem
- Unofficial: Foursquare list of OE rooms (BA.F.06, BA.F.09 Pauli, BA.2.18 Cisco, BA.1.32.Audmax) https://fr.foursquare.com/tbazsi95/list/%C3%B3budai-egyetem-%C3%B3budai-campus ; gyakorikerdesek.hu answer on code scheme.
- Imagery: no photos could be seen by me. Text-only: Építészfórum plans/photos above (ground-floor plan "A földszint alaprajza" is item 5/8 of the 2002 gallery); Wikimedia Commons category not located (hu.wikipedia links to a general "Óbudai Egyetem" Commons category).

## (e) NOT found / not verified
- No official floor plans or room list; no public Neptun room export; ingatlan.uni-obuda.hu returned HTTP 500 to direct requests (capacities come from search-engine snippets of its pages; verify).
- Capacities of F.03, F.04, F.05, F.07, F.09 (only: 5 rooms >100, 5 x 48 overall); existence of F.07 and F.10.
- Name "Kármán Tódor nagyelőadó" for the Audmax, and "Wolfgang E. Pauli" for F.09 not confirmed by any text source (Pauli only in Foursquare).
- Room numbers of EKIK (2.21-2.36), Rector's offices (2.01-2.09), Bejczy iRobot centre: only "I-II. emelet" (EKIK, Rektori Hivatal) found; 2.28 appears once as an office.
- Complete lists of 1.xx, 2.xx, 3.xx room numbers per floor; which rooms are labs vs offices outside the 14 labs in the brochure.
- Number of lifts/stairs, accessible WCs, step-free route inside (Doberdó level = 3 levels above Bécsi level), official porta hours for visitors.
- Handover date (only "2005"); OSM way `building:levels=2` on outer way is wrong/inconsistent; OSM F.01 node location is interpretive (inside the south-block polygon).
- Which levels the OSM 5-level bar covers (A..3 or F..4); where level "4" sits relative to your signs.
- Exact positions of Doberdó út entrance and garage ramp (not tagged in OSM; entrance nodes listed are my interpretation only).
