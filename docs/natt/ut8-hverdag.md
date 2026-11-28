# ut8-hverdag – hverdagsting og lagring med hyller (28. nov)

Brukeren (28. nov): «Vi må ha et skikkelig lagringssystem med hyller som kan lagre for eksempel peanøttsmør, alt slags mulig småting og
hverdagslige ting» og «flere forskjellige hyller». Gren `claude/ut8-hverdag`. Alle tall er Claudes forslag (`Ting.REGLER`, `Tinglager.REGLER`,
`Tinglager.LAGRING`, `TinglagerSpill.REGLER`, prisene/målene på de nye delene i `ByggesettRegler.NYE`).

## Hva som fantes fra før, og hvordan dette henger sammen
- `spill/lut.js` (Lut.GJENSTANDER, 56 ting) er **spillerens egen sekk og skapene i husene** (Project Zomboid-mekanikk). Den er urørt.
  Katalogen her bruker **samme id** der tingen finnes i lut.js/utstyr.js (brunost, knekkebrød, havregryn, tørrfisk, sjokolade, kaffe, melk,
  saft, flaskevann, smertestillende, lommelykt, batterier, tau, verktøy, sovepose, rasjon, forbinding …), så tingene kan flyttes mellom sekken og lageret.
- `spill/varelager.js` er **materialene** (paller planker, tømmerhauger, fat diesel). Tingene ligger i et eget lager (litre, ikke m³) – varelager.js
  er IKKE endret. Hyllerekka og pallplassen gir fortsatt m³ til materialene som før, og i tillegg liter til ting.

## Hva som er laget
**1. Katalogen – `spill/ting.js` (window.Ting), test `pipeline/fliser/test_ting.js`.** 249 ting i ti kategorier (mat 62, drikke 13, hygiene 20,
medisin 20, verktøy 38, elektro 21, klær 18, kjøkken 26, fritid 20, kontor 11). Én linje per ting i en tabell
(`id | navn | enhet | vekt kg | volum l | holdbarhet døgn (0 = tåler alt) | verdi kr | lag | bruk`). Bruk: `r` rasjoner, `h` heling (andel, doser),
`m` moral som brukes opp (poeng, gruppe, porsjoner), `M` varig moral (poeng, dekker personer), `t` tempo (oppgave i folk.js, andel, dekker
arbeidere), `krever` (radioen tar batterier, motorsaga trenger bensinkanne), `s` hvor vanlig (sjelden). Tekst: `antall(id, n)` («2 glass
peanøttsmør», «1 rull tape», «3 hammere»), `tittel`, `fantTekst(liste)` («Fant: 2 glass peanøttsmør, 1 rull tape og 3 andre ting.»), `bruksTekst`, `holdTekst`.
Funn: `funnIRom(rolle, frø, skala)` (ROM: kjøkken mat/drikke/kjøkken, bad hygiene/medisin, bod/garasje verktøy, soverom klær, stue fritid,
butikk mye mat, sykerom medisin, loft/kjeller/tilfluktsrom …; rollene fra interior.js/bygning.js oversettes i ROLLE) og `funnIBygg(kl, areal, i, o)`
(rommene etter byggklassen, `o.rom` = rollene fra interiøret, `o.etasje` = loft/kjeller/tilfluktsrom/over). Butikker (klasse «butikk», type 7/kjeder)
har mest mat. Høyst 28 slag per bygg.

**2. Lagringen – `spill/tinglager.js` (window.Tinglager), test `pipeline/fliser/test_tinglager.js`.** Stabler `{ id, t, n, a (alder i døgn), p (plass) }`.
LAGRING (liter, klima, strøm, hva den tar, hva den passer for): hyllereol 400 (alt tørt), pallplass 900, pallreol 3000, kjøleskap 300 (kjøl, 0,15 kW),
kjølerom 2500 (kjøl, 1 kW), frysboks 250 (frys, 0,2 kW; tar bare frys/kjøl), medisinskap 60 (låst; medisin og hygiene), verktøytavle 150 (verktøy),
garderobeskap 400 (klær), kiste 180, vanntønne 200 (vann). Standardplass i leirens bygg (STANDARD): lagertelt 600, container 1200, brakke 150 (skap),
sykestue 120 (låst medisinskap), verksted 300 (verktøy/elektro), kjøkken 500 (kjøl). «Ute» = uten grense.
- `legg` velger den beste plassen: den som eldes saktest, så den som passer, tørre plasser for tørre ting (kjøleplassen spares), skap for ett slag foran
  hyllene; resten ute. `avstem` flytter fra revne bygg/overfylte plasser, `rydd` bærer inn fra ute, `flytt`, `ta`, `taStabel`.
- HOLDBARHET: `eld(T, P, dt)` – faktor per klima (`REGLER.faktor`): ferskvarer 3 × fortere på hylle og 4 × ute, frysevarer 6 × i kjøl og 15 × uten kjøl,
  tørt 2,5 × ute. Kjøl/frys uten strøm = tørt. Ting som tåler alt, blir ødelagt av fukt ute etter 60 døgn (klær, elektro, kontor, fritid, hygiene,
  medisin). Over holdbarheten = kastet (T.tapt).
- BRUK: `spis` (det som går ut først, spises først; mat som også gir moral sist), `medisin` (den sterkeste; én dose per syk per døgn), `moral`
  (grupper kaffe/søtt/tobakk/øl/lys/… brukes opp, varige teller etter dekning, radio/lommelykt trenger batterier; tak 12 poeng), `tempo` (tak 20 %).
- `oversikt` (per kategori, søk), `snartUt`, `påPlass`, `verdi`, `tilJSON/fraJSON`.

**Byggesettet (`spill/byggesett.js`)** – nye deler i fanen «Maskiner» (kat `lager`, `ting` = lagringstypen): Kjøleskap (1×1 rute, 15 000 kr, 0,15 kW),
Kjølerom (3×2, 120 000 kr, 1 kW), Frysboks (1×1, 12 000 kr, 0,2 kW), Medisinskap (6 000), Verktøytavle (2×1, 4 000), Garderobeskap (8 000), Kiste (3 000),
Pallreol (4×2, 60 000 kr, 10 m³ materialer + 3 000 l ting), Vanntønne (2 000). Hyllerekka = hyllereol, pallplassen = pallplass. Leir.BYGG får `tingLager`.
**3D-navn for den tredje hjelperen (møbler):** delene heter `bs_kjøleskap_1`, `bs_kjølerom_1`, `bs_frys_1`, `bs_medisinskap_1`, `bs_verktøytavle_1`,
`bs_garderobe_1`, `bs_kiste_1`, `bs_pallreol_1`, `bs_tønne_1` (+ `bs_hylle_1`, `bs_pall_1`); lagringstypene `Tinglager.LAGRING`. Modellene er enkle kasser
i `bygg3d` i tinglager-visning.js (FabrikkSpill.bygg3d pakkes inn for delene med `ting`, unntatt hylle/pall som fabrikk-visning.js tegner).

**3. Hvordan tingene fås og brukes**
- LETING: `Leting.funn(kl, areal, i, o)` gir `f.ting` (fast per bygg, bare når huset ikke er tomt); `Etasjer.funn` gir ting for loft/kjeller/
  tilfluktsrom/andre etasjer. `LeteSpill.ta(f)` legger dem på hyllene (`TinglagerSpill.leggInnFunn`) – både fra 3D-letingen og etasjeletingen
  (som bruker `LS.ta`). Ting fra hus er ikke nye: ferskvarer har brukt 60 % av holdbarheten, resten 15 %. Inne i et hus med interiør brukes rommenes
  roller (`P.inne.rom`).
- FOLKET (`KROKER.sim`, hvert spillminutt): matlageret (`FolkSpill mat`) fylles fra tingene når det er under ett døgn igjen; medisin → `FolkRegler.tingHeling`
  (heling × 1 + f, antibiotika +80 %, paracet +25 %); moral → `FolkRegler.tingMoral`; verktøy → `FolkRegler.tingTempo(o)`. Rydding 12 stabler/time.
  Råtnet mat meldes i loggen én gang per spilltime («Kastet – for gammelt: 3 kartonger melk (uten kjøl) …»).
- Butikker har mest mat (rommene «butikk» og «lager»).

**4. Visning – `spill/tinglager-visning.js` (window.TinglagerSpill).** Lagres per leir i `riksbrudd-ting` ({ leir: "x,y", t }), hvert 5. s og ved pagehide;
ingenting som gjest i flerspiller. Panelet `#tingpanel` («Lageret»): sum (ting, liter, mat i rasjoner, verdi), søk, «Går snart ut på dato», kategoriene som
`<details>` (sammenfoldet, huskes), antall per ting, hvor de står og hvor lenge de holder; trykk på en ting gir Bruk / Ta med i sekken / Flytt til … / Selg /
Kast; «Hyller og skap» med fylling og «uten strøm – kjøler ikke». Bunnark på telefon. Åpnes fra Leir-menyen (fanen Lager: «Lageret: hverdagsting» med kort
oversikt og «Åpne lageret»), kommandolinja (Mer → Lager) og trykk på en hylle/et skap i 2D (zoomet inn under 0,5 m per punkt; viser bare den plassen).
2D: delene tegnes med farge og bokstav (K, F, +, V, G, Ki, P), fyllingsstrek under. Panelet tegnes bare på nytt når innholdet er endret og ikke mens
pekeren er nede. KOMMANDOER (Kommando.registrer, leir: true): `tingFlytt { stabel, til, n }`, `tingBruk { id }`, `tingKast { id, n }`, `tingSelg { id, n }`
(60 % av verdien), `tingSekk { id, n }`, `tingFraSekk { id, n }`. SEKKEN: alle katalogting legges i `Utstyr.TING` (del: true, lut: true – kan ikke kjøpes);
`SEKK_TILLEGG` gir «Til leirens lager» i sekken (bare nær leiren). LETING: «Fant: 2 glass peanøttsmør, 1 rull tape …» i loggen og under meldingen, og
«Hverdagsting til lageret» i resultatpanelet.

**5. Hjelpetekst:** `docs/natt/ut8-hverdag-hjelp.json` (fire emner i «Leiren»).

## Fellesfiler endret
- `spill/folk.js`: tre nye kroker på api (`tingTempo`, `tingHeling`, `tingMoral`, null som standard): `personTempo` ganger med `api.tingTempo(o)`;
  i helselokka `if (dh > 0 && p.helse < 1 && api.tingHeling) dh *= …` før helsa settes; moralmålet `mf` legger til `api.tingMoral(F, L)`. Uten krokene som før.
- `spill/leting.js`: `funn(kl, areal, i, o = {})` og `f.ting` til slutt (lazy `Ting_()`); `spill/etasjer.js`: `f.ting` i funn for andre etasjer/loft/kjeller.
- `spill/leting-visning.js`: `ta(f)` legger `f.ting` på lageret (`fikk.ting`), `visResultat` viser «Hverdagsting til lageret», `ferdig` sender rommenes
  roller og logger «Fant: …».
- `spill/byggesett.js`: ni nye deler i NYE, `ting` på bs_hylle/bs_pall, `tingLager` i `registrer`, `MASKINFANE` (lista i fanen), og romType teller bare
  deler med materialplass (`lager > 0`) som «hylle» – ellers ble et kjøkken med kjøleskap kalt «Lagerrom».
- `spill/byggesett-visning.js`: fanen Maskiner bruker `BS.MASKINFANE` (én linje).
- `index.html`: tre skript-tagger rett etter `varelager-visning.js` (ting.js, tinglager.js, tinglager-visning.js) + versjon.py.
- varelager.js og utstyr.js er IKKE endret (sekken bruker Utstyr.TING/leggTil/taUt som finnes).

## Prøvd
- Node: test_ting (249 ting, rom → kategori, butikk > 2 × bolig i mat), test_tinglager (plass, kjøl/strøm, ute, rydding, revet bygg, flytt, spis,
  medisin, moral, tempo, oversikt, lagring, selvtest), test_leting, test_etasjer, test_folk, test_byggesett, test_fabrikk, test_kommando, test_utstyr,
  test_lut, test_varelager – grønne.
- Nettleser (Dovre-testsiden, PC 1400 × 860 og mobil 390 × 844, scratchpad `natt/ut8-hverdag/`): en blikkhall med alle ni delene satt inn gjennom
  byggesettet (alle «ok»), funn i riktige skap (melk → kjøleskap, frossen fisk → frysboks, antibiotika → medisinskap, hammer → verktøytavle, vann → tønne,
  ullsokker → garderobe), leting via LeteSpill.ta, folket spiste, heling 1,8, moral +5,7, tempo bygg +9 %, kommandoene (selg, sekk, bruk, fra sekk),
  trykk på kjøleskapet i 2D, Leir-menyen og panelet (bilder kart*.png, panel*.png, kjol*.png, meny*.png, mer.png, tre.png = 3D uten tak). Ingen sidefeil.
- Vakt `pipeline/fliser/vakter/ut8-hverdag.js`: ok på PC og mobil (40–140 ms), alt satt tilbake (bygg, mat, penger, tinglager like før og etter).
  Feil med vilje (kjøleskapet kjøler ikke: faktor 3) → vakta feilet på «mat i kjøleskap holder lenger».
- Andre vakter i samme side: ut5-fabrikk, ut3-varer, ut3-etasjer, ut4-byggesett3, lut, folk, leirvirkning, ut4-maskinfolk ok. `ut5-oppforsel` feiler av og til på «rydding: varen ble ikke båret inn» når den kommer etter sju andre vakter – det gjør den også på grenen
  FØR mine endringer (base aa8511a: 1 av 4 kjøringer feilet; min gren: 3 av 11), så det er tidsavhengig og ikke fra denne pakka.

## Ikke gjort / å vite
- Røverne stjeler ikke ting (bare materialene ute, som før); `låst` på medisinskapene er lagt inn for det, men brukes ikke ennå.
- Folkene bærer ikke tingene som figurer – ryddingen skjer «usynlig» (12 stabler i timen), som varelagerets rydding.
- Ingen startkasse: en ny leir starter med tomt tinglager (så testene oppfører seg som før).
- Lagerteltet/containeren tar ikke trykk for tinglageret i 2D (de har byggpanelet sitt); innholdet vises i panelet under «Hyller og skap».
- Hyller og skap utenfor et rom virker også (ingen krav om tak); kjøleskapet trenger strøm fra leirens nett (som maskinene).
- 3D: bare enkle kasser; ingen ting synlige på hyllene. Lut-skapene i husene (lut.js) får ikke katalogens nye ting.
- Matbufferen: tingene fyller på matlageret når det er under ett døgn igjen, så «mat i tingene» står ved siden av rasjonene i Folk-panelet (ikke lagt sammen).
