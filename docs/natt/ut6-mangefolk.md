# ut6-mangefolk – mange folk og utposter (fase F5)

28. nov, utbyggingen av `docs/plan-selskap-okonomi.md`: kapittel 6.8 (trafikkart, ordre til én person), 6.9 «Hvor mange folk – og ytelsen»,
6.2 «regnet når du ikke ser» og F5 i kapittel 16. Gren `claude/ut6-mangefolk`. Bygger på F2 (`folkgang.js`), F3 (`baering.js`), F4 (`oppforsel.js`)
og jobbtavla (`jobber.js`). Spørsmål 15 og 18 (kapittel 18): brukt forslagene – **opptil ca. 200 folk**, og **direkte ordre til én person er lov,
men sjelden nødvendig** (knappene ligger i personkortet, ikke i en egen meny). Alle tall er Claudes forslag (samlet i REGLER-objektene).
B7 «ta over hus» (ut5-kampvegger) var ikke flettet inn – utposten har derfor sitt eget API (`Utpost.lag(x, y, navn, { hus })`), som B7 kan kalle.

## 1. Mange folk: målt og rettet
Prøveleir i nettleseren (Dovre-testsiden, 1400 × 860): 26 brakker, to kjøkken, verksted, vakttårn, kontrollrom, to sagbruk, vedkløyver, sykestue,
lagertelt, fem aggregat og 200 personer (`FolkRegler.nyPerson`), døgnplanen og oppførselen slått på (`JobberSpill.test`, `OppforselSpill.test`).
Målt = hele spillsteget (`simulering().steg`, alle `KROKER.sim`) i snitt per steg i 10 s per fase. Skript: scratchpad `natt/ut6/maal.js`.

| Fase (200 folk) | før: snitt / lengste | etter: snitt / lengste |
|---|---|---|
| dag (de første sekundene: nye veikart til alle mål) | 3,6–7,1 / 66–222 ms | 4,9 / 160 ms |
| jobbtavla fordeler | 0,90 / 11 ms | 1,0 / 6 ms |
| **Folk-panelet åpent med «Vis folkene»** | **5,8–7,2 / 110–141 ms** | **1,2 / 15 ms** |
| kveld → natt (alle legger seg) | 0,75–1,06 / 5–11 ms | 0,97 / 17 ms |
| 600× | 0,44–0,73 / 10–94 ms | 0,54 / 21 ms |

Under 3 ms per spillsteg i snitt for 200 folk i alt utenom oppstarten. Det eneste som var tregt, var **Folk-panelet**: 200 rader med portrett og
nedtrekkslister ble bygget hvert sekund. Gangen selv (`Folkgang.steg`, 4 ganger i sekundet) er 0,6–1,4 ms per kall (snitt) med bæring og oppførsel.
- Oppstarten: når leiren endres (nye bygg) regnes nye veikart (Dijkstra over hele leiren, 5–21 ms hvert i nettleseren) – høyst ett over 8 ms per steg
  (`planMs`, fra F2), så toppen er ett veikart + `Vei.oppdater` (inntil ca. 40 ms). Den er der én gang per endring, ikke hele tida. Ikke endret (vei.js er ikke min).
- 2D-tegningen med 200 folk: alle tegnekroker ca. 4–6 ms per bilde (det meste er leir2d.js sine figurer under 0,6 m per punkt); prikkene og trafikkartet er små.
- Lagringen: `riksbrudd-k2` med 200 folk er ca. 64 KB (folket ligger i leiren). Det er ca. 1 % av localStorage – **ikke flyttet** til LagringStor.
- Jobbtavla fordeler 200 på ca. 0,8 ms (test_mangefolk.js) – ikke rørt.
- `FolkgangSpill.måling()` gir tida per del av oppdateringen (kart, steg, hver etter-krok, alt) – vakta og målingene bruker den.

**Folk-panelet** (folk-visning.js): fra 20 personer (`GRUPPE_FRA`) står folkene i **grupper** – én per utpost og én per jobb i leiren, «▸ Bygg (40) · 2 syke»
som foldes ut med et trykk (høyst 40 rader om gangen, «Vis 40 til»). Øverst **søk** (navn eller yrke) og **filter** (alle, syke og skadde, står fast, har en
ordre, i en utpost, har fri) – da én flat liste (høyst 60). Panelet tegnes ikke på nytt mens søkefeltet har fokus. Under 20 personer er lista som før.

## 2. Utposter (regnet når du ikke ser)
- **Reglene** `spill/utpost.js` (`globalThis.UtpostRegler`): `lag, fjern, tildel, hvor, seng, sengerIBruk, reisetid, matDøgn, lokalKr, steg, tekst, fraJSON`.
- **Gangen** (`folkgang.js`): mål over `REGLER.langt` = 3000 m unna går ikke ekte – reisen regnes (rett linje, `reiseFart` 1,3 m/s, ingen veisøk; teksten
  «reiser til Utpost Gården – … (ca. 26 min igjen)»). En person i en utpost (`ctx.utpost(p)`) har ALT der: arbeid, mat («spiser i utposten»), søvn («sover i
  utposten» med seng, ellers «sover ute ved utposten») og fri. Arbeidet: hogst/riving ved et hogstfelt/hus innen 2 km fra utposten teller i leirens oppgave
  (`jobbDer`); ellers er det utpostens eget arbeid («holder vakt ved utposten») – det teller **ikke** som framme i leiren (`stedF`). `G.ute[id]` = hvem som
  er der, på vei, arbeider, og arbeidstida i steget.
- **Timeverk og mat** (`UtpostRegler.steg`): arbeidstida telles bare når personen er framme. Mat «fra leiren» (standard): én frakttur fram og tilbake hver
  dag tas fra arbeidstida (2 × reisetid per døgn). «Kjøper mat lokalt»: 1,5 × matprisen (4 500 kr per person per døgn), og rasjonene gis tilbake til leirens
  lager (folk.js trekker mat for alle). Lokal mat betales bare i et ekte spill (`UtpostSpill.test` i testene).
- **Senger**: 10 000 kr per seng (+4 om gangen, høyst 40); sengene i bruk telles med leirens i folk.js (`ekstraSenger` i folk-visning.js).
- **Visning** `spill/utpost-visning.js`: `window.Utpost` = { `lag(x, y, navn, { hus, jobb })`, `tildel(person|id, utpostId|null)`, `fjern`, `liste`, `finn`,
  `hvor(pid)`, `senger`, `reisetid`, `velgSted`, `tilstand` }; `window.UtpostSpill` (`test, les, lagre, nullstill`). Kommandoer: `utpostLag`, `utpostTildel`,
  `utpostFjern`, `utpostSenger`, `utpostMat`, `utpostJobb`. Leir-menyen, fanen Bygg: «Utposter» – «Ny utpost (trykk i kartet)» (minst 500 m fra leiren; navnet
  fra nærmeste tettsted innen 3 km), per utpost: arbeid (vakt/hogst/riving), +4 senger, mat, Vis, Legg ned. Folk-panelet: nedtrekkslista «I leiren / Utpost …»
  ved hver person og en egen gruppe per utpost. Å sende en person til en utpost setter oppgaven til utpostens arbeid (og låser den i jobbtavla når tavla fordeler).
  2D: merke med navn og antall. Lagres per leir i `riksbrudd-utpost`.
- Koblet til «et vanlig hus/sted»: utposten er et punkt i kartet (feltet `hus` tar imot id/navn fra B7).

## 3. Trafikkart
- `spill/trafikkart.js` (`globalThis.Trafikkart`): rutenett på 4 m innen 240 m fra leirens midte, døgnet i seks bøtter på fire timer (`rull` tømmer den eldste),
  `legg, sum, oversikt, topp (klynger på 16 m), farge`. Gangen gir et punkt for hver 2. meter (`REGLER.sporSteg`, `ctx.spor`).
- `spill/trafikkart-visning.js` (`window.TrafikkSpill`: `på, vis, tekst, oversikt, bilde, kart, nullstill`): av/på med knappen «Trafikkart» i Folk-panelet
  (ved «Vis folkene» – bare visning, valget huskes i `riksbrudd-trafikk`). I 2D (≤ 8 m per punkt): gult → rødt der folk har gått mest, de tre mest brukte stedene
  merket med meter, og linja i panelet «Gått i leiren siste døgn: 17,2 km. Mest ved kjøkken (8242 m), … Kortere vei der (dør, lager nærmere) gir mer arbeid.»
  Trafikken lagres ikke (starter tomt når spillet lastes).

## 4. Ordre til én person
- Personkortet (`#folkgangkort`, trykk på en person i 2D): **«Gå hit»** (så trykk i kartet), nedtrekksliste med oppgave + **«Gjør dette nå»**, og **«Stopp ordren»**.
  Kommandoen `personOrdre { person, hva: 'gå' | 'gjør' | 'stopp', x, y, oppgave }` (folkgang-visning.js).
- «Gå hit» (`Folkgang.gi(G, id, { type: 'gå' })`): personen går dit (veien som ellers), og ordren er ferdig når hen er framme – jobbtavla tar over igjen
  (loggen: «Even er framme der du sa – jobbtavla tar over igjen.»). Et sted ingen kan nå gir «kommer ikke dit du pekte: ingen gulv her».
- «Gjør dette nå»: oppgaven settes nå og arbeidet gjøres også utenom arbeidstida, i 60 spillminutter (`REGLER.ordreMin`); så får personen oppgaven og låsen
  hen hadde. Huskes per leir (`riksbrudd-ordre`), så en lastet leir ikke blir stående med den lånte oppgaven.

## Filer
- NYE: `spill/utpost.js`, `spill/utpost-visning.js`, `spill/trafikkart.js`, `spill/trafikkart-visning.js`, `pipeline/fliser/test_mangefolk.js`
  (utpostreglene, reisetid, ordre gå/gjør, trafikkartet, 50/100/200 folk med tid), `pipeline/fliser/vakter/ut6-mangefolk.js`, `docs/natt/ut6-mangefolk-hjelp.json`.
- `spill/folkgang.js` (min): REGLER `langt, reiseFart, utpostR, ordreMin, sporSteg`; `utpostMål`, reise i `planlegg`, `gå(s, dt, fart, spor)`, ordre og
  hendelser (`gi, stopp, hendelser`), `G.ute`, `stedF` teller ikke folk på ordre eller i utpostens eget arbeid.
- `spill/folkgang-visning.js` (min): måling, `ctx.utpost/spor/tid`, ordrene og knappene i kortet, `FolkgangSpill.ordre/venterGå/måling/nullstillMåling`.
- `spill/folk-visning.js` (min): grupper/søk/filter (`personene`, `personRad`), utpostvalg per person, Trafikkart-knappen, utpostsengene i `ekstraSenger`.

## Fellesfiler endret
- `index.html`: fire skript-tagger rett etter `oppforsel-visning.js` (utpost.js, utpost-visning.js, trafikkart.js, trafikkart-visning.js) + `versjon.py`.
- Ingen endring i baering.js, oppforsel(-visning).js eller jobber.js (de var ikke trege).

## Prøvd
- `node pipeline/fliser/test_mangefolk.js` (alle ok), test_folkgang, test_baering, test_oppforsel, test_jobber, test_folk, test_kommando – grønne.
- Nettleser (bilder sett, PC 1400 × 860 og mobil 390 × 844): trafikkartet over leiren, Folk-panelet med 200 i grupper og søk, utposten i Leir-menyen og
  i kartet, personkortet med «Gå hit»/«Gjør dette nå» (og bredere kort på telefon), «Gjør dette nå» huskes etter omlasting. Ingen sidefeil.
- Vakta `ut6-mangefolk` ok på PC og mobil (0,5–0,9 s). Feil lagt inn med vilje (arbeidstida i utposten telt også på reisen) → vakta feilet på
  «utposten: personen bidrar ikke etter reisetida». Andre vakter etter endringene: ut3-folkgar, ut4-maskinfolk, ut5-oppforsel, ut1-jobber, folk, leir2d,
  ut3-rekruttering, lagring – ok. Vakta også ok med 3D åpent (4,3 s).

## IKKE gjort / begrensninger
- Folk på vakt i en utpost teller fortsatt i `FolkRegler.arbeidere('vakt')` (bemannede vakttårn i leiren regnes av folk.js etter antallet); tempoet (stedF) er riktig.
- Utposten har ingen bygg, forsvar eller angrep ennå (B7), ingen kjøretøy til reisen (alle går, 1,3 m/s), og arbeidet «holde utposten» gir bare timeverk.
- Trafikkartet teller bare gangen inne i leiren (240 m) og lagres ikke. Ordre «Gå hit» huskes ikke over lasting.
- 3D: folk3d.js følger plassene som før (folk på reise eller i en utpost langt unna vises ikke nær leiren). Ikke sett på bilde i 3D.
- Oppstartstoppen (nye veikart når leiren endres) er ikke gjort mindre (vei.js).
