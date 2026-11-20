# Pakke «bakke» – bakken, vegen, gresset og skyggene nær deg i 3D

## Runde 11 (20. nov kveld)

Oppdraget: (1) vegbanen lå i høyden til det HØYESTE punktet under den, så i bratt sideterreng sto den 2–4 m over bakken på en fylling;
(2) kameraet bak bilen gikk inn i trekronene i skogen. Prøvd på /rogaland (dev.py, Kleivane ved leiren 15607, 6622779) og /norge
(Aurlandsvangen, kommunal veg i lia ved 77321, 6777623), mobil liggende 844 × 390 og PC 1400 × 820, webdriver av, før/etter-bilder.

### 1. Vegen skåret inn i lia – LAGET (bedre, ikke perfekt)
- `spill/veg.js` (regler uten DOM): `SKJÆR = { opp: .25, glatt: 3, maksSkjær: 3, ekstra: .9, under: 0, runder: 8 }` (Claudes forslag).
  - `senterHøyder(P, w, z)`: vegbanen i snittet av fem punkter på tvers, en firedel opp mot det høyeste (opp), glattet ±3 punkter (ca. 7,5 m)
    langs vegen, og aldri mer enn maksSkjær under det høyeste punktet i vegkanten (ellers løftes vegen).
  - `skjærKrav(P, w, h)`: kravene [x, y, z] på tvers (vegbanen og 0,9 m utenfor kanten = skulderen).
  - `skjær(H, N, steg, x0, y1, krav, låst, R, vekter)` / `skjærG` (generator, yield for hvert 2000. krav): senker høydegitteret så bakken
    ligger under hvert krav. Kaczmarz: et krav som brytes, fordeles på punktene etter vekten. Bare punkter som ligger OVER vegbanen senkes,
    og aldri under den, høyst maksSkjær + 1 m; låste punkter senkes ikke (liv3d.js: nærmere et hus enn ca. 0,6 rute + 2 m – ellers sto huset på en sokkel av luft). Uten «aldri under vegbanen» dro et punkt med vekt på
    begge sider av vegen hele bakken ned (prøvd: bakken 2,4 m under midten av vegen – vegen sto like høyt som før).
  - `bilineær(N, steg, x0, y1)` (vekter for gitteret), `tversMaks(P, w, z)` (høyeste punkt på tvers uten glatting), `senket(endret, …)`.
- `spill/liv3d.js` (bygg3d-kroken): alle vegbitene samles først (`biter2`), får `senterHøyder`, så `skjærBakken(u, biter)`: kravene
  sjekkes både mot gitteret (bilineært = `hoyde3d`, det gange.js går på) og mot terrengnettet slik det tegnes (`nettVekter(u)`: trekanten i
  nettet, hvert hjørne bilineært i gitteret – nettet er grovere enn gitteret ute). Endrer `u.H` (så `terrengGeo` i forbered3d tegner skjæringen),
  setter `u.nett = null` (nettHoyde lages på nytt), og flytter det som alt står der (u.trær alle slag, steiner, busker, parkerte biler, flagg)
  like mye ned. Til slutt løftes vegen der bakken slik den tegnes fortsatt ligger over (`tversMaks`). `u.skjær = { punkter, krav, maks, ms, endret }`.
  `Liv3d.SKJÆR_PÅ.på = false` gir den gamle regelen (sammenligning). `window.SKJÆR_DEBUG = 1` før byggingen legger `u.Hfør` og `u.biterDbg` på
  utsnittet (bare for feilsøking).
- Bilen (kjor.js `verdenFor`: nettHoyde + Liv3d.dekke + vegFylling) og gange (hoyde3d + Liv3d.dekke) følger den nye vegen uten endring:
  de leser gitteret/nettet og vegens z. Bruene: infra3d løfter vegen opp på dekket etterpå som før (ikke endret).
- MÅLT (andel av vegpunktene E/R/F/K med bakken > 2 m under vegen 1 m utenfor kanten; samme utsnitt): Kleivane mobil 41 % → 33 %,
  største 9,9 → 8,3 m; Aurland PC 62 % → 48 %, største 14,7 → 8,8 m. Ved bilen i Aurland: vegen 1,1 → 0,65 m over bakken midt under,
  fyllingen i nedre kant 1,7 → 1,3 m. Ved Kleivane (feilsøking, ett punkt): før 1,66 m bakke over midten i øvre kant → vegen la seg ca. 2 m
  over, nå 0,35 m over midten, øvre kant ligger i vegens høyde (skjæring), nedre kant 1,9 m under (før ca. 3,4).
- BEGRENSNING (ærlig): høydegitteret og terrengnettet har 5–10 m mellom punktene (mobil ca. 9,8 m ved Kleivane), og en veg er 5–8 m bred.
  Skjæringen blir derfor en benk som går ut til neste gitterpunkt (opptil ca. 10 m) før lia stiger, og bakken midt under vegen dras litt ned
  (lineært mellom punktene). Mange veger ligger også på ekte fyllinger i høydedataene. En skarp skjæring krever et tettere nett langs vegene
  (eget nett for vegkorridoren eller hull i bakken) – IKKE gjort.
- Tid: 0,1–0,47 s per utsnitt, nå i biter med pust (kjørAsynk). Ingen nye nett, lys eller oppslag per bilde.

### 2. Kameraet utenfor trekronene – LAGET
- `spill/kjor.js` (bare kameraet): `KRONE` per treslag (lest av modellene: gran kjegle fra 8 % av høyden, furu krone fra 55 %, bjørk 35 %,
  osp, rogn, fjellbjørk, selje, einer), stammen 0,55 m under kronen, `KAMERA_TRE = { rute: 10, margin: .6, inn: 7, ut: 1.1, ta: 12 }`
  (Claudes forslag). Trærne (u.trær) i ruter på 10 m, laget første gang per utsnitt (WeakMap). `treMellom(u, bil, kamera)` gir den største
  andelen av avstanden der kameraet (og 1 m foran/bak) ikke står i en krone; `kamTre` glir dit fort (7/s) og tilbake sakte (1,1/s); henger
  kameraet etter inne i en krone, tar det igjen målet fort (12/s). Et tre MELLOM bilen og kameraet er greit – første utkast trakk kameraet
  helt inn til taket for hver grein (prøvd, dårligere bilde).
- MÅLT (24 retninger rundt bilen i skogen ved Kleivane, mobil): kameraet i en krone 9 av 24 før (med den første, grovere kronemodellen) → 0 av 24.
- `KjorSpill.KAMERA_TRE`, `KRONE`, `kroneU: { iKrone, treMellom }` (tar u), `iKrone(x, y, z)` / `treMellom(...)` (R3.ut), `kamTre()`.

### Vakt «bakke» (utvidet)
I tillegg til runde 10: skjæringen på et prøvegitter med en li på 40 % (selvtest: den gamle regelen gir over 2 m fylling; ny under 70 % av det;
bakken ikke over vegbanen), trekronene med et prøvetre (inne/ute, kameraet kommer nærmere, fritt = 1), og i 3D: høyst 1 % av vegkantene under
bakken. Prøvd: Dovre mobil med 3D – ok (2406 vegkanter, 0 under; skjæring 2773 punkter, 96 ms), 1,3 s.

### Kontroll
Mobilkontrollen (`SJEKK_PROFIL=mobil`, sjekk.js, i en kopi av arbeidstreet ved commit eddd3ef): 128 ok, 0 FEIL (607 s) – også «veger i 3D»,
«3D uten rare ting» (0 i hus/svevende), «kjørbare biler og helikopter» og «bakke, veg og gress» (uten 3D-delen der: 3D var av da vakta kjørte).

### Tester
`node pipeline/fliser/test_veg.js` (11 nye sjekker for senterHøyder/skjær/tversMaks/maksSkjær), `test_kjor.js` grønn.

### Fellesfiler
`index.html`: bare versjonsmerkene (versjon.py). Ingen andre fellesfiler endret.

### Bilder (scratchpad/natt11/bakke/)
`cmp-0.png`, `cmp-180.png` (Kleivane mobil, øverst før, nederst etter), `cmpnorge-0.png` (Aurland PC), `cmpskog-90.png`, `cmpskog3-270.png`
(kameraet i skogen før/etter), `skogetter3-*.png`. Skript: `kjor.js` (fører), `bratt.js`, `skog.js`, `dbg.js`, `vakt.js`.

## Runde 10 (20. nov kveld, brukerens bilder)

Brukerens bilder fra iPhone (liggende, kl. 06:06, ved feltbilen ved **Kleivane** på /rogaland – samme sted som standardleiren
15607, 6622779) viste fire ting. Gjenskapt på /rogaland med ekte data (dev.py) med feltbilen satt på den kommunale vegen der,
kl. 06 og 12, 844 × 390 (mobil) og 1400 × 820 (PC), grafikk Høy, «Lys og skygger» på, webdriver av.

### 1. Store, skarpe, svarte kiler over vegen og bakken – RETTET
**Det var ikke skygger.** Prøvd med sola uten skygger, alle som kaster skygge skjult én gruppe om gangen, og hvert vegnett skjult ett
og ett (lysstyrken i kilen målt): kilen forsvant bare når *kryssflaten* (asfalten i kryssene, spill/veg.js `kryssFlate`) ble skjult.
Krysset ved Kleivane er en kommunal veg med en innkjørsel (P). Hjørnet mellom armene ligger flatt i kryssets høyde, og der bakken
faller bort svevde det opptil 2 m over bakken (målt: vegen −102,8, bakken under −104,5). Innkjørselen fikk også en asfaltstump som
lå som et mørkt flak oppå grusvegen. Med en polygonforskyvning på −10 kunne flaten i tillegg tegnes gjennom en liten kul foran den.
- `spill/veg.js`: `KRYSS_REGLER = { avvik: .35, utenHjørne: 'PS' }` (Claudes forslag). `kryssFlate(n, veger, ut, bakke)`: intet
  avskåret hjørne mot en innkjørsel/skogsbilveg (P, S) inn til en vanlig veg; med `bakke` (bakken slik den tegnes) droppes et hjørne
  som svever eller er begravd mer enn 0,35 m et sted på hjørnet (tre hjørner, midten, midt på langsiden). Innkjørselen får ingen
  asfaltstump når krysset har en vanlig veg (møtes bare P og S, som før).
- `spill/liv3d.js`: kaller `kryssFlate(..., zf)` (nettHoyde) og forskyvningen er −6 (over vegbanen −5, under fortauet −7).
- Test: `pipeline/fliser/test_veg.js` (to nye: hjørner på flat bakke, ingen der de svever, ingen mot innkjørsel; ingen asfaltstump inn i innkjørselen).

**Skyggene** (det brukeren trodde det var) er også gjort mykere: kl. 06 la trærne lange, skarpe striper over hele jordet (A/B-bilde).
`spill/lys3d.js`: ny uniform `uSkF` i three.js sin skyggekode (VSM): (1) skyggen er aldri helt full – `lysLav` 0,5 lysere med sola
under 4°, `lysHøy` 0,18 over 25°; (2) skyggen tones ut med avstanden langs lysstrålen fra den som kaster (12 → 75 m, det VSM alt
har som compare − middeldybde), så skygger fra lav sol blir korte og myke. `Lys3d.SKF` = [lysere, toneFra, toneTil, dybde (m)].
Ingen ekstra oppslag – én blanding i skyggeleggeren. Et materiale uten verdien (egen ShaderMaterial) får 0 = som før.

### 2. Gresset som mørke kruseduller – RETTET
Tustene (gress3d i index.html) og plantene (blomster, bregner, siv i vegetasjon3d.js) er tosidige flater med normalen rett opp, men
`MeshLambertMaterial` gir *baksiden* lyset til en flate som vender ned (bare bakkens farge i halvkulelyset, ingen sol): halvparten av
stråene ble nesten svarte. `forsideLys(sh)` (index.html, ved gressMateriale) tar bort baksidevalget i Lambert-skyggeleggeren; brukt
på gresset, plantene og fyllingen. Fargene (Claudes forslag, `GRESS_FARGE`): gresset 1,16/1,26/1,04 av bakkens farge (før 1,3/1,42/
1,15 – for mettet), ±6 % variasjon, lyngen 3/4 bakkens farge (før mørkegrønn), tustene ytterst 35 % lavere.

### 3. Vegen en flat, mørk stripe med mørke felt – RETTET (delvis)
- `liv3d.js` `VEG_FARGE`: asfalt 84/85/88 (før 62/63/65), kommunal 88/87/86, gang- og sykkelveg 92/86/82. Svake store flekker
  (lappet/slitt), litt mørkere hjulspor, noen tynne sprekker i teksturen. Kryssflaten har asfaltens farge (før mørkere = «mørke rektangler»).
- Fyllingen (skråningen fra vegkanten ned til bakken, 1 : 1,5) var én fast mørk olivenfarge og lå som mørke felt i gresset. Nå:
  bakkens farge per hjørne (u.bunn, snitt av 3 × 3, × 1,22), lys nøytral tekstur med strå, normalene bøyd mot loddrett (0,35 +
  loddrett) og forsidens lys – får omtrent lyset til bakken rundt. Foten av fyllingen legges ikke på en annen veg (`kant(..., fri)`,
  klaring > 0,6 m): innkjørselens fylling lå som et grønt bånd tvers over den kommunale vegen ved Kleivane.
- Igjen ved Kleivane (mobil, kl. 06): et mørkere grønt felt nede til venstre bak bilen (bakken i skyggen av trærne – nå lysere, men
  synlig). Ikke undersøkt videre.
- IKKE gjort: vegbanen legges i høyden til det *høyeste* punktet under den (veg.js `høyder`). I bratt sideterreng står vegen derfor
  2–4 m over bakken på fylling på den ene siden. En skjæring på oversiden ville vært riktigere, men endrer mye (vegen kan bli begravd).

### 4. Fjellsidene i bakgrunnen kornete – DELVIS
Ikke gjenskapt her (programvaregrafikk uten anisotropi gir glatte lier). Kartbildet selv (u.base) er glatt (sjekket). Det som er gjort:
bakkens skyggelegger (detaljIBakken) slår opp kartbildet ett mipmap-trinn grovere langt unna (`texture2D(map, vUv, bias)`, bias 0 ved
150 m, 1 fra 550 m) – mindre flimmer med anisotropi på et ekte grafikkort. Mistanke som ikke er prøvd: de fjerne trærne (små
trekanter med alphaTest i blader) gir fargeprikker på telefonens høye oppløsning; det kan bare sjekkes på en ekte telefon.

### Fart
Ingen nye nett, lys eller oppslag per bilde: skyggene én blanding, gresset/plantene færre instruksjoner (baksidevalget borte),
bakken samme antall oppslag (bias i det samme). Kryssflaten har færre trekanter. Teksturene lages én gang.

### Filer
- `site/dovre-fliser/spill/veg.js` (kryssFlate, KRYSS_REGLER) – regelfil som liv3d bruker
- `site/dovre-fliser/spill/liv3d.js` (VEG_FARGE, bunnFarge, fyllingLys, Liv3d.VEG_FARGE)
- `site/dovre-fliser/spill/lys3d.js` (uSkF, SKF, REGLER.lysLav/lysHøy/solLav/solHøy/toneFra/toneTil)
- `site/dovre-fliser/spill/vegetasjon3d.js` (plantene med forsideLys)
- `site/dovre-fliser/index.html`: `forsideLys`, `GRESS_FARGE`, gressMateriale og gressG (farger, høyde), detaljIBakken (map med bias)
- `pipeline/fliser/test_veg.js` (2 nye sjekker), `pipeline/fliser/vakter/bakke.js` (ny vakt)

### Vakt «bakke»
Kryssreglene (hjørne på flat bakke ja, svevende nei, innkjørsel nei, selvtest uten grensen = hjørnet kommer tilbake), asfaltstump inn i
innkjørsel nei, `uSkF` i skyggekoden, `forsideLys` tar bort baksidevalget (selvtest: three.js har det), GRESS_FARGE, asfalten ≥ 75.
I 3D med veger i utsnittet: ingen hjørnetrekant i kryssflatene svever mer enn 0,6 m over bakken. Prøvd: mobil med 3D (5 hjørner, 0 svever),
PC uten 3D. Ca. 0,1–0,6 s.

### Kontroll
Mobilkontrollen (`SJEKK_PROFIL=mobil`, sjekk.js) etter siste endring: 127 ok, 0 feil (273 s). `test_veg.js` og `test_kartbilde.js` grønne.

### Bilder (scratchpad/natt10/bakke/)
`for-bil-rogaland-mobil-*.png` (før) / `etter2-bil-rogaland-mobil-*.png` (etter) og `cmp-bil-*.png` (side om side): kilene borte.
`cmp4-bil-120.png` (siste, med lysere fylling). `ab-cmp.png`: kl. 06, skyggene etter / som før / uten skygger. `cmp-pc-0.png` (PC før/etter kl. 06), `etter12d-rogaland-pc-180.png` (PC kl. 12).
