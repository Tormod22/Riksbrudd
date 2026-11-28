# ut9-industri2 – flere bygg med industritype, stabilt anslag, vakta ut8-industri (28. nov)

Grenen `claude/ut9-industri2` fra `claude/nattfiks` (etter «Flettet inn claude/ut9-maskiner2»). Alle tall er **Claudes forslag**.

## 1. Byggjobben (`pipeline/fliser/bygninger.py`) – MÅ KJØRES PÅ NYTT
Funnet: med husdataene kart-hus-3af69d4a5eaf hadde nesten ingen ekte industribygg `ind` (Stavanger/Sandnes 1 av 12, Egersund 0 av 9),
fordi de fleste industriområdene i OSM er bare `landuse=industrial` uten `industrial=*` – områdets type ble 0, og byggene arvet ingenting.
Nå (`koble_industri`, `industri_type`, `svak_type`):
- **Navnet** leses fra `name`, `official_name`, `operator`, `owner` og `brand` (`navn_av`) – bedriften står ofte i operator/owner. Også for
  havneområder og områder med `industrial=*` uten kjent verdi.
- **Områder uten egen type arver** typen fra det som står inne i dem: sterke punkter (industrial/craft/man_made/power med kjent type,
  vekt 2), svake punkter (vekt 1) og bygg med egne merker (vekt 1) – flest stemmer vinner (`IND_VEKT`). Teller i loggen: «områder som arvet».
- **Svake punkter**: bedrifter (`office=*`, `craft` uten kjent verdi, `company`) der navnet sier bransjen («Egersund Fisk AS»). De gir typen
  bare til et område (stemme) eller til et bygg som alt er industri/lager (t 6/12) – aldri til en bolig eller et kontor.
- **Nærmeste sterke punkt** innen `IND_NÆR` = 60 m gir typen til industri-/lagerbygg som fortsatt mangler den.
- `.github/workflows/hus.yml`: punktfila tar nå også med `n/office`.
- `koble_industri.sist` gir tallene (fra punkt, fra område, områder som arvet, nært punkt, ny type) – står i loggen i Actions.
Test (`test_bygninger.py`, 89 ok): fire nye regler for svake punkter, fire nye merke-eksempler (operator/owner), og ni nye prøvebygg i den
syntetiske byggjobben (område med fiskepunkt, område med operator «Egersund Sildoljefabrikk», område med bedriften «Moen Trelast AS», nabo til et
mek. verksted i samme område, industribygg 40 m og 120 m fra et sagbrukspunkt, bolig og lager med «Bergen Fisk AS» inni). Feil med vilje:
`IND_NÆR = 0` -> «industribygg 40 m fra et sagbrukspunkt» feilet.
**Slik tas det i bruk:** Actions «Bygg byggomriss» (hus.yml) på grenen, så `python3 pipeline/fliser/bruk_hus.py kart-hus-<hash>` og versjon.py.

## 2. Stabilt anslag (`spill/industri-visning.js`)
- `IndustriSpill.omgivelser` husker svaret **første gang** det spørres for et bygg – også uten høyde (`utenHøyde`) og uten infrastruktur
  (`utenInfra`). Før ble det bare husket når både høyden og infrastrukturen var lest, så en plantegning laget tidlig kunne vise en annen
  type enn huspanelet etterpå (Egersund: «fiskeforedling» over en mathall). Nå gir plantegningen, huspanelet og 3D samme type i hele økten.
  Bygg uten nummer (`info.i`) huskes ikke (før delte de nøkkelen 0).
- Linja i plantegningen leser typen fra hallen i modellen (fra ut9-maskiner2), så den alltid stemmer med rommene.
- Begrensning: svaret kan fortsatt bli et annet i en NY økt (det første spørsmålet kan komme før eller etter at høyden/kaiene er lest).
  For bygg med `ind` fra dataene (punkt 1) er typen alltid den samme.

## 3. Vakta ut8-industri på PC
Årsak: `hoydeVed` leser bare flisene på nivået kartet står på NÅ. Oppstarten går inn på leiren (kam.m ≤ 3), og rett etterpå er flisene på det
nye nivået ikke laget – så høyden ved leiren manglet. `høydeFlis(X, Y)` i industri-visning.js leser høyden fra en ferdig flis på hvilket som
helst nivå (finest først). Vakta ut8-industri er nå ok på PC (og mobil, og i 3D).

## Ny vakt `vakter/ut9-industri2.js`
Høyden ved leiren finnes; et sted uten lest høyde (60 km unna) gir et svar som huskes og samme type to ganger; et prøvehus (industri uten ind)
gir samme type i plantegningens hall, huspanelet, forInfo og linja; i 3D samme type i interiøret og huspanelet. Selvtest av sammenligningen.
Feil med vilje (svaret huskes bare med høyde, som før) -> vakta feilet («svaret uten høyde huskes ikke / skifter»). Å ta bort `høydeFlis`
alene fikk ikke vakta til å feile i den kjøringen (hoydeVed hadde høyden da) – den gamle feilen kom an på tidspunktet.

## Prøvd
- test_bygninger.py (89 ok), test_industri, test_maskiner, test_fabrikkmaskiner, test_interior, test_plantegning – ok.
- Vaktene ut9-industri2, ut8-industri, ut9-maskiner, ut9-maskiner2, inne: ok på PC og mobil; ut9-industri2, ut8-industri, ut9-maskiner og
  ut9-maskiner2 ok i 3D.
- /rogaland (dev.py), Egersund: tre ekte industribygg – huspanelet og linja i plantegningen sier nå det samme (mekanisk verksted, kraft og
  energi, matproduksjon). Før: panelet «mekanisk verksted», plantegningen «kraft og energi».

## Fellesfiler endret
- `pipeline/fliser/bygninger.py` (se 1) og `.github/workflows/hus.yml` (`n/office` i punktfila).
- `spill/industri-visning.js` (ut8): høydeFlis, hurtigminnet (se 2), nøkkelen.
