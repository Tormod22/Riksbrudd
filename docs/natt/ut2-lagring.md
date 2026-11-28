# ut2 – lagring (G0): nettleserens database, versjon og omgjøring (28. nov)

Plan: `docs/plan-selskap-okonomi.md` 13.3 og G0 i kapittel 16. Gren `claude/ut2-lagring`.

## 1. Målt først: hvor stort er et spill i dag?

Målt i Chromium på Dovre-testsiden (nytt spill ved 196400, 6898900, tempo 3600). Tallene er **tegn** (nøkkel + verdi) – det er
det localStorage regner i. Grensen ble målt til **5 242 873 tegn** (5 Mi) for hele adressen (alle tre kartene deler den).

| Spill | Spillnøklene for siden | Én lagringsplass | Alt (spillet + 3 plasser + Automatisk) |
|---|---|---|---|
| ca. 0,15 døgn (lagret med koden før G0) | ca. 21 000 | ca. 25 500 | 123 851 (med /norge-kopien) |
| 1,7 døgn, AI av | 22 471 | 26 368 | 128 031 |
| 2,9 døgn, AI og hendelser på | 30 503 | 35 165 | 171 251 |

Største nøkler (2,9 døgn): `riksbrudd-verden` 12 135, `-logg` 4 275, `-k2` 3 426, `-morgen` 1 923, `-oppgjor` 1 829, `-k1` 989.
Et spill i dag bruker altså ca. 3 % av localStorage. Det som sprengte først, var lagringsplassene: hver plass er en full kopi av
spillet, så tre plasser + Automatisk = fem ganger spillet, og alle tre kartene deler grensen (15 kopier i verste fall). De nye
systemene (endrede hus, 200 folk, statistikk, fabrikker) vil gjøre selve spillet mange ganger større.

## 2. Nettleserens database under det som finnes (spill/lagringsside.js)

Valget (begrunnelse): modulene leser localStorage **synkront** når skriptene lastes, og IndexedDB kan bare leses asynkront. Derfor:
- **De vanlige spillnøklene blir i localStorage** (små, leses ved oppstart – ingen modul merker noe).
- **Lagringsplassene** (`riksbrudd-plass-…`, leses bare når spilleren åpner «Lagre og last») og **de store dataene** (`riksbrudd-stor-…`,
  LagringStor) ligger i databasen (IndexedDB «riksbrudd», lager «nokler», nøkkel = rå nøkkel med sidens ending, verdi = tekst).
  Det fjerner kopiene som sprenger først.
- En **minnekopi** (MINNE) av databasen leses ved oppstart (getAllKeys + getAll). `riksbrudd-spill` venter til den er lest (høyst
  5 s – normalt er den lest lenge før kartet er klart; `window.dispatchEvent` pakkes inn bare for den hendelsen). Skriving går til
  minnet straks og til databasen i bakgrunnen (én transaksjon for det som har samlet seg). `LagringSide.tømt()` venter til alt er
  skrevet – «Last» venter på den (høyst 3 s) før siden lastes på nytt.
- `getItem/setItem/removeItem/key/length` på localStorage går til minnekopien for disse nøklene, så `localStorage.key(i)` og
  `localStorage.getItem('riksbrudd-plass-1')` virker som før (lagringsvaktene og scenario-flyttingen merker ingenting).
  `Object.keys(localStorage)` og `localStorage[nøkkel]` ser bare det som står i localStorage.
- Gamle lagringsplasser i localStorage flyttes til databasen første gang, og tas bort fra localStorage først når databasen har dem.
  Finnes samme nøkkel begge steder, vinner den nyeste (`laget`/`t`).
- Uten database (blokkert, eller den svarer ikke på 5 s): alt ligger i localStorage som før.

**Full localStorage (QuotaExceededError)** – spillet mister aldri noe i stillhet:
1. Lagringsplasser som ennå ligger i localStorage, flyttes til databasen, og skrivingen prøves igjen.
2. Får nøkkelen fortsatt ikke plass, legges den i databasen («flyttet»): merket `riksbrudd-ovl` (rått, i localStorage) sier hvilke
   nøkler det gjelder, og en kopi legges i sessionStorage (`riksbrudd-ovl:<nøkkel>`). Loggen sier fra én gang («Nettleserens enkle
   lager er fullt … ingenting er mistet»), og «Lagre og last» sier hvor mye som ligger i databasen.
3. Ved neste oppstart i **samme fane** leses kopien i sessionStorage synkront. I **en ny fane** (ingen kopi) låses lagringen
   (ingen modul kan skrive over noe), nøklene hentes fra databasen, legges i sessionStorage, og siden lastes på nytt én gang
   (vern mot ring: høyst én gang per 30 s).
4. Ved hver oppstart prøves de flyttede nøklene tilbake i localStorage; er det plass igjen, går de tilbake, og merket blir borte.

## 3. Versjon og omgjøring (spill/omgjoringer.js)

- `riksbrudd-versjon` = `{"v":1}` for hele det lagrede spillet. Spill uten merket er versjon 0 (alt før 28. nov). Merket er en
  spillnøkkel, så det følger med i lagringsplassene og fila: en gammel plass/fil får versjon 0 når den lastes, og gjøres om ved
  omlastingen. `LagringSide.VERSJON` (nå 1) økes når en omgjøring legges til.
- `Lagring.omgjør(fraVersjon, fn, navn)` registrerer; `spill/omgjoringer.js` lastes rett etter lagringsside.js og kaller
  `LagringSide.omgjørNå()` (reserve: ved DOMContentLoaded). Omgjøringene kjøres i rekkefølge (fra-versjon, så rekkefølgen de ble lagt
  inn) på en **kopi**; feiler én, endres ingenting. Før endringene tas i bruk, legges en kopi av hele spillet i databasen
  (`kopi:riksbrudd-før-versjon-N…`, leses ikke inn i minnet). Et spill fra en nyere utgave røres ikke, og en fil fra en nyere utgave
  avvises med en forståelig melding (`Lagring.Plass.les`).
- `fn(l)`: `l.les/json/skriv/fjern/navn` på sidens nøkler (navn uten ending), og `l.senere(f)` for de store dataene i databasen
  (kjøres når den er lest). Ingen omgjøringer trengs nå (0 → 1 setter bare merket).
- Prøveomgjøring: i `test_lagring_stor.js` (bygg som tall → liste), og i nettleseren med `window.LAGRING_PRØVEOMGJØRING = true`
  satt før skriptene lastes (1 kr ekstra på et versjon-0-spill – viste 99 500 001 kr i K1, altså før modulene leste; kjøres ikke igjen).

## 4. API for nye store data: window.LagringStor (spill/lagringsside.js)

```
LagringStor.les(navn, { felles })        // synkront fra minnekopien; null når det mangler eller hører til en annen leir
LagringStor.skriv(navn, verdi, { felles }) // minnet straks, databasen i bakgrunnen; false uten leir eller når lagringen er låst
LagringStor.fjern(navn); LagringStor.navn(); LagringStor.klar (løfte); LagringStor.når(fn); LagringStor.tømt()
```
- Navnet «hus» lagres som `riksbrudd-stor-hus` + sidens ending (per side som de andre). Verdien pakkes som `{ leir: "x,y", v }`
  (per leir, som `spill/karakter.js`); `{ felles: true }` = for alle leirer på siden.
- `les` gir samme objekt hver gang (ikke en kopi): endre det og kall `skriv` for å lagre.
- De store dataene følger med i lagringsplassene og fila (de er spillnøkler).
- Les dem ved `riksbrudd-spill` eller i `LagringStor.når(fn)` – ikke når skriptet lastes (da er databasen ikke lest ennå).

## 5. Lagringsmenyen (spill/lagringsmeny.js)

- Nederst: «Plass: spillet 19 kB, lagringsplassene 45 kB (i nettleserens database). Det enkle lageret i nettleseren: 38 kB av ca.
  5,0 MB brukt» (+ «x av det er spillet» når andre ting på adressen tar plass). Hver plass viser sin størrelse.
- Statusen sier fra når deler av spillet ligger i databasen fordi localStorage er full («Ingenting er mistet»), og regner ikke
  «flyttet» som en feilet lagring. `LagringSide.virker()` er «ok» når bare localStorage er full og databasen virker.
- Plassene vises når databasen er lest («Leser lagringsplassene …» før det); startskjermens «Du har N lagrede spill» telles på nytt.

## Tall (Claudes forslag)
- `DBN.ventMs` 5000: så lenge venter oppstarten på databasen. `DBN.reloadMs` 30000: høyst én omlasting per 30 s for å hente flyttede
  nøkler. `kvote` 5 Mi tegn (målt i Chromium; vist som «ca. 5,0 MB»). Plassene regnes på nytt i panelet høyst hvert 5. s.

## Filer
- `site/dovre-fliser/spill/lagringsside.js` – reglene (versjon, omgjøringsregister, LagringStor-pakking, størrelse) og databasen,
  overløpet, omgjørNå, LagringStor.
- `site/dovre-fliser/spill/omgjoringer.js` (ny) – stedet for omgjøringene.
- `site/dovre-fliser/spill/lagring.js` – `rot.Lagring = Object.assign(rot.Lagring || {}, api)` og nyere-utgave-sjekk i `Plass.les`.
- `site/dovre-fliser/spill/lagringsmeny.js` – plassbruk, venting på databasen, «flyttet»-melding, omlasting etter `tømt()`.
- `pipeline/fliser/test_lagring_stor.js` (ny), `pipeline/fliser/vakter/ut2-lagring.js` (ny), `docs/natt/ut2-lagring-hjelp.json`.
- FELLESFIL: `site/dovre-fliser/index.html` – én ny linje rett etter `lagringsside.js`:
  `<script src="/dovre-fliser/spill/omgjoringer.js?v=…"></script>` (+ versjonsmerkene fra `versjon.py`).

## Prøvd i nettleseren (Chromium, PC 1400 × 860 og mobil 390 × 844)
- Et spill lagret med koden FØR G0 (storageState fra claude/nattfiks: spill, tre plasser + Automatisk, /norge-kopien): lastes riktig
  (kasse, fraksjon, tid), versjon 0 → 1, plassene flyttet til databasen og borte fra localStorage, alle fire leses (PC og mobil).
- En fil lastet ned med den gamle koden, hentet inn med «Hent fra fil» → «Last inn nå» (mobil): riktig kasse, versjon 0 → 1.
- Tre plasser lagret med ulik kasse og ulik LagringStor-verdi; lastet 2, så 1, så en nedlastet fil av 3 – hver gang med ekte omlasting
  og knappene i panelet: riktig kasse og riktig LagringStor-verdi hver gang, «Automatisk» hadde spillet før lasting (PC og mobil).
- Full localStorage fylt med vilje (5 242 876 tegn): spillet lagret videre (8 nøkler flyttet, inkl. en prøvenøkkel på 30 000 tegn),
  melding i loggen, statusen i panelet; omlasting i samme fane, en NY fane (hentet fra databasen, én omlasting, ikke låst etterpå) og
  etter at plass ble frigjort (nøklene tilbake i localStorage, merket borte): ingenting manglet, 0 sidefeil.
- Prøveomgjøringen i nettleseren (over). Bilder av panelet på PC og mobil (scratchpad natt/ut2-lagring/*.png).
- Vaktene: `ut2-lagring`, `lagring` og `lagring-alt` OK på PC og mobil. `lagring-alt` trenger vegnettet på testserveren (som i
  sjekk.js) – uten det feiler den også på koden før G0. Selvtest: med plass-nøklene tatt ut av databasen fant `ut2-lagring` feilen.
- Regeltester: test_lagring_stor, test_lagring, test_lagringsside, test_kommando ok.

## Ikke gjort / å vite
- Ingen andre modulers lagring er flyttet (oppdraget). **Store kandidater for LagringStor senere** (vokser med tiden eller med de nye
  systemene): `riksbrudd-verden` (lag, kjøretøy, fiender, AI-minne – størst i dag), `riksbrudd-k2` (byggene og folket – F2 med 200
  folk), `riksbrudd-logg`, `riksbrudd-statistikk` (per døgn), `riksbrudd-dagbok`, `riksbrudd-kameravakt` (spor i 48 t),
  `riksbrudd-ressurser` (hogde felt og revne hus), `riksbrudd-leting` (gjennomsøkte hus), og B3 (endrede hus – bare endringene).
  En modul som flyttes, må lese ved `riksbrudd-spill`/`LagringStor.når`, ikke når skriptet lastes, og trenger en omgjøring som
  flytter den gamle nøkkelen (`l.senere`).
- Skriving til databasen rett før siden lukkes (pagehide) kan i verste fall gå tapt for LagringStor (nettleseren venter ikke på
  IndexedDB). localStorage-nøklene er like trygge som før.
- `navigator.storage.persist()` er ikke bedt om (Firefox spør spilleren). Nettleseren kan i teorien rydde databasen ved lite diskplass.
- Scenario-flyttingen av en leir (`riksbrudd-flytt` i scenario-visning.js) skjer før databasen er lest, så LagringStor-verdier med
  leir følger ikke en flyttet leir ennå.
- Flerspiller-formen (samme form som tjeneren) er ikke laget.
