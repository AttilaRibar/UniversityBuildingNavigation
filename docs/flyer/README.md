# Merre szórólap

Kétoldalas A5 álló szórólap (148 × 210 mm) az Óbudai Egyetem hallgatóinak, főleg az elsőéveseknek.
Az előlapon a főcím és a nagy QR-kód van, a hátlapon a funkciók, a „hogyan használd” és az őszinte
megjegyzések (nem hivatalos, becsült BA-adatok, belső térkép csak a BA-hoz).

| Fájl | Mi ez |
| --- | --- |
| `flyer.html` | A forrás: két `section.page`, mindegyik pontosan 148 × 210 mm. A szöveget itt kell szerkeszteni. |
| `build-flyer.mjs` | Ebből készül a PDF és az előnézet, és közben ellenőrzi a tördelést. |
| `merre-szorolap.pdf` | A nyomdába menő fájl (generált). |
| `preview-1.png`, `preview-2.png` | Elő- és hátlap előnézete, 1× méretben (generált). |
| `assets/qr-main.svg` | QR az előlapra: `https://oe-merre.vercel.app/?utm_source=szorolap&utm_medium=print` |
| `assets/qr-f06.svg` | Kis QR a hátlapra: `https://oe-merre.vercel.app/building/ba/?to=F.06&utm_source=szorolap&utm_medium=print` |
| `assets/p22-…jpg`, `assets/p21-…jpg` | Telefonos képernyőképek, 900 px szélesre és 82%-os JPEG-re kicsinyítve. |
| `assets/logo.svg` | Másolat a `public/icons/logo.svg`-ről. |
| `assets/fonts/` | Overpass 500/700/800, latin és latin-ext (az ő/ű miatt), plusz a licenc (`OFL.txt`). |

## Újragenerálás

```bash
node docs/flyer/build-flyer.mjs
```

Playwright és Chromium kell hozzá. Ha a gépen nincs, a projekten kívülre telepítsd (például
`npm i -g playwright` és `npx playwright install chromium`), a projekt `package.json`-jába ne.

A szkript elkészíti a PDF-et és a két előnézetet, és hibakóddal leáll, ha:

- nem töltődött be az Overpass, vagy a PDF-be más (tartalék) betű vagy Type 3 font került,
- van 8 pt-nál kisebb szöveg,
- szöveg, doboz vagy kép 5 mm-nél közelebb kerül a lap széléhez,
- egy szöveg kilóg a dobozából,
- a fő QR-kód (a csendes zóna nélkül) 30 mm-nél kisebb,
- a PDF nem pontosan 2 oldalas.

A szkript nem lát mindent: az előnézetet szerkesztés után mindig nézd meg szemmel is
(rossz sortörés, árva szó, túl zsúfolt rész).

### QR-kód ellenőrzése

```bash
npm i --prefix /tmp/flyer-tools jsqr@1.4.0 pngjs@7.0.0
FLYER_TOOLS=/tmp/flyer-tools node docs/flyer/build-flyer.mjs --verify-qr
```

Mindkét kódot nagy felbontásban lerendereli, visszaolvassa, és összeveti a várt URL-lel.

### Ha változik a cím (például saját domain lesz)

1. A `build-flyer.mjs` elején írd át a `SITE` értékét. Az URL-ek egyetlen helyen, a `QR_CODES` listában vannak.
2. `node docs/flyer/build-flyer.mjs --qr --verify-qr` (a `--qr` az `npx --yes qrcode@1.5.4` paranccsal újragyártja az SVG-ket, ehhez hálózat kell).
3. A `flyer.html`-ben írd át a látható rövid címet (`.url` az előlapon), és a QR-ok `alt` szövegét.

Az UTM paramétereket (`utm_source=szorolap&utm_medium=print`) hagyd meg, ezekből látszik az
analitikában, hányan jöttek a szórólapról.

### Betűk és képek újragyártása

Az app az Overpass Variable betűt használja. A Chromium változó fontot csak Type 3 glifekként tud
PDF-be tenni, ezt sok nyomdai ellenőrző kifogásolja, ezért a szórólap statikus példányokat használ.
Ha más vastagság kell, a projekten kívül:

```bash
python3 -m venv /tmp/fonttools && /tmp/fonttools/bin/pip install fonttools brotli
for w in 500 700 800; do for s in latin latin-ext; do
  /tmp/fonttools/bin/fonttools varLib.instancer \
    node_modules/@fontsource-variable/overpass/files/overpass-$s-wght-normal.woff2 \
    wght=$w --update-name-table -o docs/flyer/assets/fonts/overpass-$s-$w.woff2
done; done
```

és vedd fel az új `@font-face` blokkokat a `flyer.html` elején.

Képernyőkép cseréje: `convert be.png -resize 900x -strip -interlace JPEG -quality 82 assets/uj.jpg`.
Olyan képet ne tegyél ki, amin még javítás alatt álló szöveg van.

## Amihez ne nyúlj

- **Oldalméret.** A `@page` és a `.page` mérete pontosan 148 × 210 mm. Ha a tartalom nem fér el, a szöveget rövidítsd, ne a lapot növeld.
- **Biztonsági sáv.** Az előlap panelje 6 mm-re van a lap szélétől, hogy kifutó nélkül, irodai nyomtatón is egyben maradjon. Szöveg és doboz ne menjen 5 mm-en belülre.
- **A QR-kódok.** Az SVG-ket ne szerkeszd kézzel, csak a szkripttel gyártsd újra. Maradjon sötét a fehér alapon (ne invertáld, ne tedd színes háttérre, a fehér csendes zóna a kód része), és a fő kód ne legyen kisebb 44 mm-nél (így a kód maga 36 mm).
- **Az őszinte részek.** Az előlapi „Nem hivatalos hallgatói projekt” címke és a hátlapi „Jó, ha tudod” doboz kötelező. Ne rövidítsd el úgy, hogy eltűnjön belőle, hogy a projekt nem hivatalos, hogy a BA belseje becsült, hogy belső térkép csak a BA-hoz van, és hogy ez nem menekülési terv.
- **Tények.** Csak olyat írj, amit az app tényleg tud. Nincs GPS, nincs beltéri helymeghatározás, nincs órarend-integráció.
- **Sárga.** A `#ffd21f` csak a legfontosabb elemen van (előlapon az F.06 címke). Ne szórd szét.

## Nyomtatás

A5, tényleges méret (100%, nem „oldalhoz igazítás”), kétoldalas, hosszú él mentén fordítva.
Kifutó nem kell. A PDF RGB színekkel készül; ha a nyomda CMYK-t vagy PDF/X-et kér, ők vagy egy
előkészítő program tudja átalakítani.
