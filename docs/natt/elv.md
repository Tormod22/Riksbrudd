# Pakke «elv» – strøm i brede elver

## Runde 15 (21. nov kveld)

Brukeren spurte: **«Har elver vann som er i bevegelse nedover, eller ikke?»**

### Svaret før denne runden
- Små bekker og elver langs NVE-linjene hadde et vannbånd med rennende krusning nedover (bekker-visning.js, S ≤ 2200).
- Brede elver som ligger i kartets vannmaske (Lågen, Glomma, Nidelva, Otta) ble klippet bort (`Bekker.klipp`) for at det ikke skulle ligge
  en smal stripe midt i elva. Der viste bakken bare vindbølgene fra vind3d.js – samme som en innsjø, uten strøm nedover.
  Svaret var altså «nei» for de brede elvene.

### Hva som er laget
- **spill/elvestrom.js** (regler uten DOM, `node pipeline/fliser/test_elvestrom.js`, 26 sjekker):
  - `kjede(linjer)`: setter NVE-bitene sammen til lange elver (enden av én = starten på neste).
  - `bånd(P, { vann, høyde, b, orden, steg })`: punkt hver 4. m (6 m på mobil) langs midtlinja, og per punkt
    høyde (glattet profil som aldri stiger nedover), fall, fart, skum, bredde til venstre/høyre bredd (leter i vannmasken), og tone.
  - **Retning**: NVE digitaliserer linjene med strømmen. Sjekket på Dovre-fila: 1765 sidebekker ender i starten av en elv med høyere
    orden, 1 gjør det motsatte. Terrenget er kontroll: stiger det klart (minst 2,5 m og 0,2 %) langs linja, snus den.
  - **Høydeprofil**: glattet ±50 m og så løpende minimum, så strømmen aldri går oppover selv om høydemodellen er ujevn på vannflaten.
  - **Fart** = 0,5 + 9·√fall m/s (0,35–4); Lågen ved 0,2 % ≈ 0,9 m/s, stryk ved 3 % ≈ 2 m/s. **Skum** fra 0,6 % fall, fullt ved 4,1 %.
  - **Innsjø**: bredere enn 230 m eller 9 × elvas nominelle bredde, eller land ikke funnet innen 220 m på noen av sidene.
    **Sjøen**: under 1 moh. og bredere enn 120 m. Der er det ingen strøm, og strømmen tones inn/ut over 60 m.
  - Alle tall er Claudes forslag (REGLER-objektet øverst i fila).
- **spill/bekker-visning.js** (eier):
  - `bygg3d`-kroken samler linjene som ble klippet fordi de lå i vannflaten (type 1 = ElvBekkMidtlinje, eller bekk med orden ≥ 4) og lager
    `u.elvStrøm` med `lagStrøm` (funksjonen ligger utenfor kroken, så den ikke holder på kartbildet).
  - Nytt nett **«elvestrøm»** oppå vannflaten (ikke i bakkens skyggelegger – den eier natur-pakka): 7 punkt på tvers (5 på mobil) fra
    venstre til høyre bredd, lagt på terrengnettet + 0,14 m, gjennomsiktig (depthWrite av, polygonOffset). Skyggeleggeren:
    tre lag støy som flyttes med `L − tid · fart` (alltid nedover, raskere midt i elva enn ved breddene), normalen vris etter støyens helning
    (lysrefleks som glitrer og flyter), himmelspeiling ved flat vinkel, skum der fallet er stort, alfa mot 0 ved breddene og der tonen er 0.
    Ingen nye lys. Forberedes i `KROKER.forbered3d` (generator, som vannbåndet).
  - `window.ELVESTROM_STAT` (elver, biter, punkt, snudd, trekanter, ms) og `window.Elvestrom3d.sjekk()` for vakta.
- **pipeline/fliser/vakter/elv.js**: prøver reglene på ekte data uten 3D (NVE-midtlinjene for Lågen ved Dombås + terreng og vann fra
  `lagVindu` i 8 m-ruter): strøm finnes, 0 punkt oppover, lange biter ender ikke høyere i terrenget enn de starter, 0 punkt med strøm midt
  i åpent vann, farten innenfor grensene. Er 3D på med strømlag: nettet er i scenen og `Elvestrom3d.sjekk()` gir 0 oppover og 0 i innsjø.
- Hjelpetekst: docs/natt/elv-hjelp.json («Elver som renner», gruppe «I 3D»).

### Fellesfiler endret
- `site/dovre-fliser/index.html`: én ny skript-tagg `spill/elvestrom.js` rett etter `spill/bekker.js` (før bekker-visning.js), og
  versjonsmerkene fra versjon.py.

### Ikke gjort / begrensninger
- Bakkens vindbølger (vind3d.js, natur-pakka) er fortsatt under strømlaget. Laget dekker dem delvis (alfa 0,3–0,6 midt i elva), men
  bølgene i bakken går med vinden også i elva. Forslag til natur-pakka: dempe bølgene der blåkanalen i vannmasken sier at land er nær
  (smal elv), eller lese en «strøm»-maske fra denne pakka.
- Høyden langs elva kommer fra høydemodellen (NVE-linjene har ikke høyde). I svært flate elver blir fallet 0 og strømmen rolig (0,5 m/s).
- Bruer: vannmasken er ofte brutt under brua, så strømmen tones ut og inn igjen der (60 m).
- 2D-kartet er uendret (ingen strømpiler).
