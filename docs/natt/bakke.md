# Pakke «bakke» – bakken, vegen, gresset og skyggene nær deg i 3D

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
  bakkens farge per hjørne (u.bunn, snitt av 3 × 3), lys nøytral tekstur med strå, normalene bøyd mot loddrett (0,35 + loddrett) og
  forsidens lys – får omtrent lyset til bakken rundt.
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

### Bilder (scratchpad/natt10/bakke/)
`for-bil-rogaland-mobil-*.png` (før) / `etter2-bil-rogaland-mobil-*.png` (etter) og `cmp-bil-*.png` (side om side): kilene borte.
`ab-cmp.png`: kl. 06, skyggene etter / som før / uten skygger. `cmp-pc-0.png` (PC før/etter kl. 06), `etter12d-rogaland-pc-180.png` (PC kl. 12).
