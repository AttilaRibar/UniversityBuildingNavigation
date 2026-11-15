# Óbuda University - Budapest buildings (research, data as of 2026-11-15)

Data file: `campus-buildings.geojson` (20 features, one per OSM footprint; WGS84 [lon,lat]).
Footprints come from the OSM API (way/relation full.json), centroids computed from the outer ring.

## Table

| id | code | Building | Faculties / use | Address | Centroid (lat, lon) | OSM | Levels | Verified |
|---|---|---|---|---|---|---|---|---|
| ba | BA | Bécsi út main building (A) | NIK; Rector's Office, seat, EKIK | 1034 Bp, Bécsi út 96/B | 47.53381, 19.03421 | way/159710379 | 2 (suspect) | yes |
| bc | BC | "Mozdonyos" building | KVK (Bécsi út part), Intl. Education Office | 1034 Bp, Bécsi út 94-96 | 47.53350, 19.03491 | way/118433139 | 5 | yes |
| d | D | Doberdó út building | RKK | 1034 Bp, Doberdó út 6 | 47.53333, 19.03356 | way/165208349 | 6 | yes |
| bk | BK | Kandó Kálmán Kollégium | dormitory | 1034 Bp, Bécsi út 104-108 | 47.53552, 19.03323 | way/251721669 | 7 | yes |
| kiss-arpad | - | Kiss Árpád Kollégium | dormitory | 1034 Bp, Doberdó út 6/A | 47.53365, 19.03297 | way/267493714 | 6 | yes |
| ta | TA | Tavaszmező main building | KGK (seat), KVK dean's office, Library HQ | 1084 Bp, Tavaszmező u. 17 | 47.49090, 19.07842 | way/567175542 | - | NO (inferred) |
| tb | TB | Tavaszmező B | KVK | 1084 Bp, Tavaszmező u. 15 (OSM 7-15) | 47.49057, 19.07778 | way/246810592 | - | yes |
| tg | TG | Tavaszmező G (new Keleti bldg) | KGK | 1084 Bp, Tavaszmező u. 14-18 | 47.49123, 19.07798 | way/979703981 | - | yes |
| tg-b, tg-c | TG | annex ways of TG | KGK | same | - | way/979703980, way/979703979 | - | NO |
| kukac | - | Kukac Kollégium | dormitory | 1084 Bp, Tavaszmező u. 7-15 | 47.49050, 19.07724 | way/246810593 | 5 | yes |
| banki | N | Népszínház utcai épület | BGK, Trefort Ágoston Mérnökpedagógiai Központ | 1081 Bp, Népszínház u. 8 (also József krt 6) | 47.49638, 19.07171 | relation/16570843 | - | yes |
| frangepan | - | Frangepán u. temporary campus (ex-Kodolányi) | BGK theory teaching since 2025-02 | 1139 Bp, Frangepán u. 50-56 | 47.53422, 19.08124 | way/121644702 | 5 | yes (use unconfirmed for late 2026) |
| ybl-a, ybl-b | ? | Ybl A / B | YBL | 1146 Bp, Thököly út 74 | 47.50785, 19.09349 / 47.50793, 19.09308 | way/707995136, way/707995226 | 3, h=15 m | yes |
| ybl-sport | - | Ybl sports hall | YBL | 1146 Bp, Thököly út 74 | 47.50795, 19.09289 | way/1004363281 | 1, h=8 m | yes |
| bankikoll | - | Bánki Donát Kollégium | dormitory | 1065 Bp, Podmaniczky u. 8 | 47.50786, 19.05597 | way/261301423 | 5 | yes |
| yblkoll | - | Ybl-kar kollégiuma | dormitory | 1085 Bp, Mária u. 7 | 47.49224, 19.06869 | relation/3439794 | 3 | yes |
| b-epulet | B? | "Óbudai Egyetem B épület" | unknown | Viador u. area, III. | 47.53330, 19.03770 | way/199003486 | 2 | NO |
| ybl-c | - | Stefánia út 30 "C épület" | unknown | 1143 Bp, Stefánia út 30 | 47.50800, 19.09486 | way/257204820 | 3 | NO |

"Verified" = the OSM footprint carries university tags (name/operator/ref/addr) or a university-tagged node lies inside it, AND address matches an official source. Exceptions are explained in the notes of each feature.

## Faculties (current structure)
The founding document valid from 2026-07-01 lists seven faculties: Alba Regia Kar (Székesfehérvár), BGK, KVK, KGK, NIK, RKK, YBL ("Ybl Miklós Építéstudományi Kar"). All names and abbreviations you listed are correct; no renames found. English names are not uniform: uni-obuda.hu/en uses "Kandó Kálmán Faculty of Electrical Engineering" (menu) / "Kálmán Kandó..." (campus page), "Keleti Károly Faculty of Business and Management", "Sándor Rejtő Faculty of Light Industry and Environmental Engineering", "Miklós Ybl Faculty of Architecture and Civil Engineering" (the English site still says Architecture and Civil Engineering, Hungarian name is Építéstudományi = Building Sciences). The GeoJSON uses the uni-obuda.hu/en forms. There is also a central "Kármán Űrkutatás Központ", "Tehetséggondozási és Pedagógiai Központ" and the "Egyetemi Kutató és Innovációs Központ" (EKIK, Bécsi út 96/B).
Faculty sites (all HTTP 200): nik / kvk / bgk / kgk / rkk / ybl `.uni-obuda.hu`.

## Neptun building codes (source: eng.rkk.uni-obuda.hu PDF "codes of the buildings in the neptun v1", 2023)
BA = Bécsi út A (Neumann Faculty); BC = Bécsi út C (Kandó Faculty, next to the locomotive); D = Doberdó út (Rejtő); N = Népszínház utca (Bánki); TA = Tavaszmező A (main building of Keleti Faculty); TB = Tavaszmező B; TC = Tavaszmező C (brick building); TG = Tavaszmező G (new Keleti building). Room format `D.205` = building code + room number.
Not found in any source: the codes "BN", "AB", "TA..." beyond the list above, and any code for the Ybl buildings (Ybl exam schedules use bare room numbers). "BK" for the Kandó dormitory exists only as an OSM `ref`. hu.wikipedia mentions an "AB" building (Nagyszombat utca, near Árpád Gimnázium) - not confirmed anywhere else.

## Sources
- Campuses / addresses: https://uni-obuda.hu/campuses/ (page updated 2024-11-15); https://hu.wikipedia.org/wiki/Óbudai_Egyetem (campus codes, rectorate in central A building, library HQ Tavaszmező 17)
- Faculty list, seat, property register (all addresses, functions): https://uni-obuda.hu/wp-content/uploads/2021/08/Alapito_Okirat_20260701_alairt.pdf (annex 2)
- Faculty addresses cross-check: study guide 2019 https://uni-obuda.hu/wp-content/uploads/2023/04/obudai_egyetem_intezmenyi_tanulmanyi_tajekoztatoja_2019.pdf; NIK ügyrend 2025-12-01 (search result, not fully read)
- Neptun codes: https://eng.rkk.uni-obuda.hu/wp-content/uploads/2023/05/codes-of-the-buildings-in-the-neptun-v1.pdf
- Tavaszmező building letters A/B/C/G and Bécsi út building C: https://kvk.uni-obuda.hu/?p=3722
- BGK Frangepán move, József körút 6 office address, Népszínház reconstruction: https://bgk.uni-obuda.hu/informacio-a-felevkezdesrol/ ; https://eduline.hu/felsooktatas/20230406_Ezzel-az-uj-epulettel-bovul-az-Obudai-Egyetem
- Ybl: https://ybl.uni-obuda.hu/ (Thököly út 74)
- Footprints/tags: OpenStreetMap (ODbL) via openstreetmap.org API 0.6 and Nominatim; OSM university relation 13165264 and campus relation 15833417.

## Uncertain / contradictory
1. Tavaszmező house numbers differ between sources: KGK = 15-17 (2019, campus page) vs 17 (2025 ügyrend) vs 14-18 (OSM/KVK page for building G); KVK = 15 (campus page), 15-17 (2019), A+C at 17, B at 15 (KVK site). The register lists 7-15, 17 and 18 as separate properties.
2. TA and TC are not separable in OSM; the single node "TA., TC." sits in way/567175542. The `ta` footprint is inferred; TC footprint not identified (candidates way/567175544, 567175545, 625314034). The tags `amenity=university` areas way/83276974 (KVK, 4474 m2), way/83276975 (KGK), way/1548714744 (7-15) are site outlines, not building footprints, and were not exported.
3. BA is probably under-mapped (2 levels, one way); other parts of the Bécsi út complex (e.g. untagged way/396248314, 3 levels, between D and Kiss Árpád) are not confirmed as university buildings and were not exported. OSM has no height tags except for Ybl.
4. Bánki: officially Népszínház u. 8 but offices use József körút 6 (1088); the building is being rebuilt (since 2025) and theory teaching is at Frangepán u. 50, so the footprint will change and could be outdated. Whether Frangepán is still used in Nov 2026 is unverified. The OSM Frangepán way is still named Kodolányi.
5. b-epulet and ybl-c: no official confirmation, see feature notes.
6. Faculty English names vary between pages (see above). Wikipedia's infobox says "foundation university"; the 2026 founding document is a foundation-maintained university (not further checked).
7. Not exported (no geometry looked up): register lists in Budapest also Bécsi út 120-128 (support), Csokonai u. 3 and 6 (offices, near the Bánki building), Szőlő u. 2 (education, III.), Thököly út 67 (education, XIV.), Hajdú u. 18-24 and other rental/kindergarten/school properties (Cserkesz u., Bolgár u., Szent László út, Szinyei Merse u.). Nominatim returned no university-tagged building for these.

## Skipped non-Budapest sites
Székesfehérvár (Alba Regia Faculty: Budai út 45 and 43, Pirosalma u. 1-3, dorms at Gyümölcs u. 10, Széchenyi út); Salgótarján (Rákóczi út 180, 180/A; Május 1. út 54); Kaposvár (Guba Sándor u. 40/A); Cegléd (Kossuth F. u. 32, KGK); Nagymaros (Váci út 139, 141, measuring station); Nyírbátor (Édesanyák útja 7); Zamárdi (Batthyány u. 56, holiday home); Székelyudvarhely (RO) and Szabadka/Subotica (RS) training centres.
