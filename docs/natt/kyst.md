# Pakke «kyst» – kaier langs sjøen

## Runde 15 (21. nov kveld)

Brukeren: «langs kysten er det ofte sementert langs en kai – hvordan ser dette ut i spillet kontra virkeligheten?»

### Virkeligheten (bilder fra Wikimedia Commons – ikke i repoet, bare lenker)
- Skagenkaien, Stavanger (Kallerna, CC BY-SA 4.0): https://commons.wikimedia.org/wiki/File:Skagenkaien_Stavanger_2.jpg
- Vågen/Skagenkaien, Stavanger (Macwhale, CC BY-SA 4.0): https://commons.wikimedia.org/wiki/File:Stavanger_V%C3%A5gen_Skagenkaien_Norway_(2022.06.23).jpg
- Bryggen/Vågen, Bergen (Bahnfrend, CC BY-SA 4.0): https://commons.wikimedia.org/wiki/File:Bryggen,_V%C3%A5gen,_Bergen,_2019_(01).jpg
- Skudeneshavn (Alberto-g-rovi, CC BY 4.0): https://commons.wikimedia.org/wiki/File:Skudeneshavn-2024_11.jpg
- Skudeneshavn fra lufta (Julesvernex2, CC BY-SA 4.0): https://commons.wikimedia.org/wiki/File:Aerial_view_of_Skudeneshavn,_Norway_julesvernex2.jpg

Det som går igjen på bildene:
- Kaifronten er LODDRETT ned i sjøen, 1,5–2 m over vannet. Ingen skråning, ingen strand. Nederst er den mørk og våt (tang).
- Front i betong (Bryggen), fenderverk av mørke, loddrette planker (Skagenkaien) eller granittmur i skift (Skudeneshavn).
- En gul (eller hvit) kantlist langs kanten (Bryggen), pullerter (gule eller sorte), sorte fendere/bildekk på fronten, gule stiger ned i sjøen.
- Dekket er flatt og hardt helt inn til gata og husene: betong i kanten, asfalt/brostein bak.
- Lyktestolper på 6–10 m langs kaia. Flytebrygger ut fra kaia (finnes i spillet fra før).
- Småbåthavner: steinsatt molo/fylling (store steiner) og flytebrygger.

### Spillet før
- `kyst3d` laget båter, flytebrygger, naust og bøyer. Selve kysten var bare terrenget: høydegitteret skrår jevnt fra land ned i sjøen
  over en eller to ruter (4–15 m), og kartbildet viser en brungrønn stripe (strand/gress) mellom vannet og gata. Ved Skagenkaien og
  Strandkaien lå gata 10–40 m fra vannet, med brun skråning imellom (bilde før-pc-stav-0/1).
- Dataene vi har: `kaier.json` (spill/kaier.js) – ETT PUNKT per 120 m-rute med type (1 kai/brygge = OSM man_made=pier/quay, 2 småbåthavn,
  3 havn, 4 ferjeterminal), samlet kailengde og navn. INGEN kailinjer (geometrien er slått sammen i kaier.py). Vannmasken (u.vann, fra
  kartbildet) og høydegitteret u.H sier hvor vannkanten er. Vegene (u.påVeg) og husene (nærHus) sier hvor gata og husene står.
- OSM mangler kai rett på Skagenkaien (punktene ligger på Strandkaien-siden og lenger nord) – derfor byhavn-regelen under.

### Det som er laget
Reglene i `spill/kyst.js` (uten DOM, `Kyst.KAI` = alle tallene, Claudes forslag), visningen i `spill/kyst3d.js`.
- `Kyst.plasserKai(v)` / `plasserKaiG(v)`: kystpunkter i et 12 m-rutenett (som båtene) innen en radius fra hvert kaipunkt:
  kai 35 m + halve lengden (45–170 m), havn 60 m + 0,4 × lengden (90–230 m), småbåthavn 50 m + 0,4 × lengden (60–150 m), i tettsted × 1,35.
  BYHAVN: i et tettsted blir kysten også kai innen 450 m fra et kaipunkt når det går en veg innen 25 m inn på land (v.gate).
  Kystpunktet må ha åpent vann 4 og 9 m foran fronten. Normalen og fronten jevnes ut med naboene (ingen trapp), dekkhøyden 1,3–2,6 moh.
  (det høyeste terrenget 2, 5 og 8 m inn) jevnes ut over 20 m. Over 6,1 moh. rett bak fronten = berg, ingen kai.
  Stilen per kaipunkt: betong (de fleste, alltid store havner), granittmur 22 %, trefront 14 %. Utstyr per 16 m-bit: pullert 55 %,
  stige 22 %, lykt 30 %, to fendere (ikke på trefront). Småbåthavner: steinsetting (fire steiner per kystpunkt fra 1,5 m på land til 3 m ut).
  Ferjeterminaler med egen ferjekai (infra3d.js) hoppes over. Tak: PC 900 biter / 1400 steiner, mobil 320 / 500.
- `Kyst.påKai(biter, x, y)`: ligger punktet på et kaidekke (naust, brygger og båter flyttes ikke oppå kaia).
- `kyst3d.js kaiPlass(u, kv, ferjekaier)` (i bygg3d-kroken, FØR båtene): dekket går inn til 10 m (30 m i tettsted) og stopper 1,5 m før en
  veg eller et hus (vegene er alt lagt av liv3d.js); dybden jevnes ut (minste innen 18 m). Høydegitteret u.H HEVES under dekket (til
  0,12 m under dekket, aldri senket, ikke inntil hus) og SENKES til −0,4 moh. de første 3 m foran fronten – terrenget skrår ikke lenger ned
  i sjøen der det er kai. u.nett nullstilles så nettHoyde lages på nytt.
- 3D (`kaiNett`, i sett3d-kroken): InstancedMesh – kantbit per stil (2,2 m lys betong, gul kantlist 0,3 × 0,18 m, loddrett front 4,5 m ned
  med våt/mørk nedre del; granittmur i forband; fenderverk i planker med vaterbord), dekket (asfalt, skalert etter dybden, bakkant ned i
  bakken), pullerter, fendere, stiger (gule, med håndtak over kanten), lyktestolper (8 m, arm ut over kaia) og steinene. Ingen nye lys.
  9 nett til sammen. `Kyst3d.antall().kai` teller (biter, stil, pullerter, stiger, lykter, endrede gitterpunkter).

### Prøvd
- `node pipeline/fliser/test_kyst.js` – 28 sjekker (13 nye for kaiene, med fasit uten å spørre modulen). Feil med vilje: radius × 3 og
  snudd normal – testen fant begge.
- Vakt `pipeline/fliser/vakter/kyst.js` (kunstig kyst på Dovre-siden): regler, ingen kai uten data, gitteret hevet/senket, dekket stopper
  før vegen, geometrien. Se rapporten for kjøringene.
- Bilder med ekte data (dev.py + /rogaland) i scratchpad natt15/kyst/: før-*/etter-* for Vågen i Stavanger.

### Ikke gjort
- Kailinjene fra OSM finnes ikke i dataene (kaier.py slår alt sammen til punkter). Med linjene (man_made=quay/pier som linje/flate,
  man_made=breakwater for moloer) kunne kaia følge den ekte kanten og moloene legges der de er. Dette krever en ny kaier.py og en ny
  release – IKKE gjort. Til da: vannmasken avgjør kanten, og «molo» er steinsetting langs land ved småbåthavner.
- Ingen kaier i 2D-kartet utover ankermerkene (kartflis.js har ikke kaidataene i bakgrunnstråden).
- Kaikanten stopper deg ikke når du går (du kan gå utfor, og du går på det hevede terrenget). Ingen lys i lyktene om natta.
- Kaikraner og fiskemottak (egne bygg) er ikke laget.
