# Pakke «leir2d» – leiren og kartet på nær zoom i 2D (grenen claude/natt18-verden)

## Runde 7 (20. nov natt)

Kritikken (docs/anmeldelse-2026-11-19.md): «På nær zoom (20 m) blir kartet uskarpt og flatt, og leiren er bare grå bokser»
(bilde 24-brakke-bygges.png). Alle tall er Claudes forslag og står samlet i `Leir2d.REGLER` (og `STIL` for byggtypene).

Målestokk: «20 m» i kritikken er målestokken nederst til venstre (ca. 0,2 m per punkt). Det nye synes under 1,2 m per punkt
(tak med form), med full detalj under 0,35. Lesbarheten er sjekket på 50, 20, 5 og 2 m per punkt (som oppdraget sa) og i tillegg
på 0,5, 0,2 og 0,12 m per punkt, dag og natt.

### 1. Leirens bygg ovenfra – LAGET
`spill/leir2d.js` (ny, rett etter byggevisning.js). `leir-visning.js` tegn1 kaller `Leir2d.bygg(g, b, o)`; uten Leir2d (eller med
`Leir2d.av = true`) tegnes boksene som før.
- **Tak etter type**, samme stil som husene i kartflis.js (lys fra nordvest: takflaten mot lyset ×1,16, den andre ×0,82, mønet ×1,45,
  skygge mot sørøst 0,45 punkter per meter høyde), fargene fra modellene i 3D (modeller.js):
  brakke blikktak med bølger, pipe og trapp; kontrollrom svart saltak, pipe, antenne og parabol; sykestue lyst blikk med rødt kors på
  hvitt felt og forplass; kjøkken rødt tak med pipe og røyk; verksted blikk med lysbånd, forplass og to porter; drivhus glass over
  grønne plantebed; lagertelt presenning med buer, møne, åpning og barduner med plugger; container (rustrød) og batteribank med ribber
  (batteriet med luker og gul stripe); aggregat med rist, eksosrør og stripe; dieseltank som liggende sylinder (glans på lyssiden) i
  oppsamlingskar med stige og pumpe; solceller i 2 × 5 paneler med celler og et himmelskjær; vakttårn med bein og pyramidetak med
  lyskaster; kameramast med fot, stolpe og kamera; radiomast som fagverk (trekant) med tre barduner og forankringer; helikopterplass
  med H, gul sirkel, lys rundt og vindpose; sandsekkvoll som to rader sekker; port med rød/hvit bom og vaktbu; brønn, minnesmerke og
  åker (furer). Ukjente typer: flatt tak med brystning.
- **Tilstanden**: i kø eller laget på vei = stikker og stiplet snor på utgravd grunn; under bygging = grunnmur med forskaling, reisverk
  fra 25 %, sperrer, taket legges fra den ene enden fra 45 %, stillas (planker + stålrør) og en plankestabel og en pall med sekker ved
  siden av; skadet = sot (flere jo mer skadet), under 60 % hull i taket med sperrene synlige, under 35 % rusk rundt; ødelagt = brent
  tomt med murrester, forkullede bjelker og rusk; reparasjon/oppgradering = stillas; flytting = stiplet ramme.
- **Kanten**: valgt = gul, uten strøm eller hardt skadet = rød (som før), ellers en tynn kant i fraksjonens farge (så du ser hva som er ditt).
- **Natt** (KartLys): byggene får samme nattfarge som kartet (`Leir2d.tonet`, samme regning som lagene i kartlys.js), og bygg med
  vinduer, strøm og som ikke er avslått, har varmt lys på bakken langs langveggene og ved døra.
- **Gjerde**: skygge, netting og stolper hver 2,5 m. **Grusveg**: kant, grus, to hjulspor og lysere midtrygg.
- Skissen når du plasserer: taket svakt + grønt/rødt omriss som før.
- Byggene (og folkene og feltbilen) tegnes nå **over tåka og det lyse siktfeltet** (`f.over` i index.html) – før ble leiren bleik
  og utvasket der flere lag så.

### 2. Folk og kjøretøy på nær zoom – LAGET
- **Lagene** (index.html tegnLag, under 1,6 m per punkt som før): hver mann er en figur ovenfra (`Leir2d.mann`): skuldre i sidens farge
  (lagføreren gul som før), hjelm, sekk og gevær med armene fram (fra radius 4,2–4,5 punkter), skygge, i retningen laget ser. Såret =
  bare omrisset (som før). Figurradius 2 / √m, 3,4–6,5 punkter (før 3,4 eller 0,35 / m). Falne er fortsatt kryss.
- **Folkene i leiren** (`Leir2d.folkPlass`, under 0,6 m per punkt): byggelaget står rundt byggeplassen og ser inn mot den, vakta ved
  porten/vakttårnet, frakt går mellom lageret og leirens midte, hogst i skogkanten 38–48 m ute, fri rundt leirens midte; de som arbeider
  inne (kontrollrom, kjøkken, sykestue, verksted) og syke i karantene synes ikke. Sivile figurer: jakke i egen farge, hår og ansikt.
  De flytter seg litt med tida (kartet tegnes på nytt hvert halve spillminutt når de synes).
- **Feltbilen og helikopteret** (kjor.js): under 0,7 m per punkt bytter leir2d.js ut kjor.js sin tegnekrok (finnes etter teksten
  `'B' : 'H'`, ved `load`) med kjøretøyene ovenfra: feltbil med panser, frontrute, tak og lys; helikopter med kropp, cockpit, halebom,
  halerotor og fire rotorblader (en skive når rotoren går). Navnene går gjennom Etikett som før. Lenger ute: merket med B/H som før.
- Kolonnenes kjøretøy (kjoretoy-visning.js) var alt små kjøretøy ovenfra under 12 m per punkt – ikke endret.

### 3. Lesbarheten – SJEKKET
Navnene (Etikett) og merkene er uendret; vakten tegner kartet ved leiren på 50, 20, 5, 2, 0,5, 0,2 og 0,12 m per punkt, dag og natt,
og krever 0 overlapp og at byggene har navn nær. Kart-vakta (runde 6) er grønn sammen med denne. Byggevisningen: nøkkeltallene under
byggene («−1 kW · 8 senger») flytter seg ned under navnene som står der (de lå oppå «Lagertelt» på telefon).

### 4. Ytelse – MÅLT
Byggene tegnes én gang på et eget lite lerret og limes inn (hurtiglager per bygg; nøkkelen er målestokk, tilstand, natt, valgt …);
mens du zoomer, tegnes de rett på kartet. Målt i vakten (maskinen deles med andre, raskeste av fire runder, 0,15 m per punkt ved leiren):
PC 64,5 ms per bilde mot 63,3 uten (Leir2d.av), 71,8 mot 76,2 i en annen kjøring – innenfor støyen. Telefon (390 × 844, DPR 2)
i prøveskriptet: 191 mot 190 ms og 202 mot 269 ms. (Alle tallene er programvare-grafikk på en full maskin.) Vakten feiler hvis
den nye tegningen er mer enn 1,5 × + 12 ms tregere.

### Filer
- `site/dovre-fliser/spill/leir2d.js` (ny) – reglene øverst uten DOM: `REGLER`, `STIL`, `HUS`, `stil`, `tilstand`, `tonet`, `hex`,
  `figurR`, `folkPlass`, `hash`; visningen: `Leir2d.bygg/tegnBygg/skygge/ramme/mann/gjerde/veg/tegnFolk/lager/av/kjørKrok`.
  Test: `pipeline/fliser/test_leir2d.js` (103 sjekker).
- Vakt: `pipeline/fliser/vakter/leir2d.js` (ca. 12 s på en full maskin): alle byggtyper tegnes, tilstandene ser ulike ut,
  kontrollrommets tak er mørkt, natt gir mørkere tak og lys, tegn() bruker den nye tegningen, tid per bilde, navn uten overlapp på
  sju målestokker dag og natt, soldater og folk som figurer. Legger inn prøvebygg 300 m øst for leiren og tar dem bort igjen
  (også L.neste/L.nesteJobb), setter kameraet, tida, kartlyset og Leir2d.av tilbake. Rører ikke lagene eller frø.
- Hjelpetekst: `docs/natt/leir2d-hjelp.json`.

### Endret i fellesfiler
- `index.html`: skripttaggen for leir2d.js rett etter byggevisning.js; `tegn()` – kroker med `f.over = true` tegnes inne i
  `tegnEnheter` etter tåka og siktfeltet og før lagene (ny parameter `mellom` i `tegnEnheter(vx0, vy1, mellom)`; i byggevisningen bare
  de uten f.bygg); `tegnLag` – figurradius og `Leir2d.mann` i stedet for sirkelen (den gamle sirkelen står som reserve).
- `spill/leir-visning.js` (2D-tegningen, min del): tegn1 kaller Leir2d.bygg/veg/gjerde, skyggene tegnes først, kroken har `over = true`.
- `spill/byggevisning.js`: nøkkeltallene under navnene.

### Ikke gjort / svakheter
- Kartflisene på helt nær zoom (z17) er fortsatt myke (trærne er runde klatter) – kartflis.js er ikke min fil; mønsteret i bakken
  (kartlys.js, runde 6) er som før.
- Byggesettets deler (byggesett-visning.js) og fiendens stillinger tegnes som før.
- Folkene i leiren har ingen gange-animasjon (de glir), og barna/de gamle (Samfunn) er ikke med i 2D.
- Kameramast og vakttårn er små på 0,3–0,5 m per punkt.
- Hurtiglageret holder ett lite lerret per bygg i synet (tømmes når målestokken endres) – på telefon med mange bygg kan det bli noen MB.
