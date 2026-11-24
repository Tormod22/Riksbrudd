# Stier og merking (R19-5, 24. nov)

Brukerens bilder fra en fjelltur: smal sti langs stupet, malt merking på stein og trær, vaier på utsatte steder. Brukeren sa ja.
Alle tall er Claudes forslag.

## Data – pipeline/fliser/utveg.py (lag «sti»)
- OpenStreetMap (© OpenStreetMap-bidragsytere, ODbL – står alt i kildeteksten for utveg): highway=path/footway/bridleway/track i
  Norge, bare z11 (2 km fliser, 0,5 m oppløsning, forenklet 1 m). Visningen forstørrer z11 til z13–z16.
- Egenskaper: t (0 sti, 1 traktorveg), m (1 = merket: medlem av route=hiking/foot-relasjon, osmc:symbol, operator DNT/turistforening,
  trailblazed), s (sac_scale 0–6), v (trail_visibility 0 ukjent, 1 god, 2 middels, 3 dårlig).
- Tas ikke med: fortau/gangfelt, asfalt/belegningsstein/belyst (lysløyper og gangveger i bebyggelse), traktorveger grade1/2
  (NVDB har dem), tunneler, flater, private traktorveger, og stier der minst to av start/midt/slutt ligger i et SSB-tettsted
  (infra.json fra INFRA_TAG-releasen, hentes i Actions).
- Regler i sti_egenskaper/merket_rute/tettsted_maske/bort_i_tettsted. Test: python3 pipeline/fliser/test_sti.py (også i Actions).
- .github/workflows/utveg.yml kjører nå også på push til claude/r19-stier.

## 2D – kartflis.js tegnStier (fra z13, STI_Z)
Merkede røde stiplede med lys kant, umerkede mørkebrune stiplede, traktorveger lange streker, alpine (s ≥ 4) prikket.
«Stier» i ☰ under Kartet (VIS.sti, NAVN i index.html, GRUPPER i spill/meny.js). I 3D-kartet bare når utsnittet er > 2200 (som vegene).

## 3D – spill/sti3d.js (lastes etter bane3d.js)
- KROKER.bygg3d (S ≤ 2200, VIS.sti): henter utveg z11, klipper hver linje til sin egen flis (Sti3dRegler.klipp – flisene overlapper),
  punkt hver 3. m, ikke i vann eller hus (nærHus), nærmest midten først til 30 000 punkt (PC) / 12 000 (mobil).
  u.stier, u.stiRute (rutenett for oppslag), u.stiMerker. Trær, busker og steiner ryddes innen 1,1 m (sti) / 2,2 m (traktorveg).
- Merker på merkede ruter: i snitt hvert 70. m (minst 45 m, fast etter stedet). Under tregrensen (Vegetasjon.tregrense): rød T på
  nærmeste tre 1,3–5 m fra stien, ellers på en stein ved siden av stien. Over tregrensen: varde (ca. 55 %) eller stein, med T.
- KROKER.sett3d: ett nett for båndene (tre punkt på tvers, teksturen toner kantene ut, traktorveg = to hjulspor), InstancedMesh for
  steiner, varder, T-merker og vaierstolper, LineSegments for vaieren. Høyden fra nettHoyde (terrengnettet) + 5 cm.
- Vaier: der fallet ned på en side er over 1,05 m per meter over 4 m (0,75 når sac_scale ≥ 3), minst fire punkt på rad; stolper
  hver 3. m på oppsiden av stien, vaieren 1 m over bakken med litt nedheng.
- Gange: Sti3d.fart(u, x, y) – 1,15 på sti, 1,2 på traktorveg (gange.js ganger faktoren inn sammen med skader/last).
- Test: node pipeline/fliser/test_sti3d.js. Vakt: pipeline/fliser/vakter/stier.js (prøvd med feil lagt inn med vilje).

## Ikke gjort
- Gress og blomster rundt kameraet (gress3d/vegetasjon3d) vet ikke om stien – det kan stå gress i stien når du går.
- Ingen bruer/klopper over bekker, ingen trapper i bratte stier.
- Marsj/ruteplan for lagene bruker ikke stiene (bare vegnettet og terrenget).
