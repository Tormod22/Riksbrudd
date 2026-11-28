# ut3-folkgar – folk som går (fase F2)

28. nov, utbyggingen av `docs/plan-selskap-okonomi.md`, kapittel 6.2, 6.3, 6.7 (bare mat/søvn/fri), 6.8, 6.9 og F2 i kapittel 16.
Gren `claude/ut3-folkgar`. Bygger på F0 (jobbtavla og døgnplanen, `spill/jobber.js`) og F1 (veien, `spill/vei.js`).

## Hva som er laget
- **Hver person har en plass, et mål og en vei.** `spill/folkgang.js` (regler uten DOM, `globalThis.Folkgang`) gir hver person i leiren
  x, y, etasje, hus, retning, mål og vei. Målet kommer av døgnplanen (`JobberSpill.nå(p).hva`) og jobben:
  - arbeid → arbeidsplassen: byggeplassen (byggejobbene i `Leir.jobber`, to per jobb, høyst så mange jobber som det er byggelag; byggesettets
    deler: delen selv; gjerder/linjer: et av punktene), maskinen (`Leir.BYGG[..].maskin`), vakttårnet (uten tårn: en post 14 m ut fra midten),
    kjøkkenet, sykestua, verkstedet, kontrollrommet, lageret, hogstfeltet / huset som rives (`RessursSpill.tilstand().jobber`), haugen (frakt).
  - mat → kjøkkenet (kantine/feltkjøkken/kjøkken eller et egenbygd rom brukt som kjøkken), ellers bålet. **Langt ute** (arbeidsplassen over
    300 m fra leiren: hogstfelt, utposter) har de matpakke og blir der.
  - søvn → **sin egen seng**: sengene i brakkene (`Leir.effekt(b).plasser`) og de egenbygde rommene med senger (`Byggesett.rom`), fordelt i
    rekkefølgen i gjengen (som `p.seng` i folk.js). Uten seng: «sover ute (ingen seng)» ved bålet.
  - fri → bålet / fellesplassen: en ring 3,5–7,5 m rundt leirens midte (fast plass per person).
  - syk → sykestua, ellers senga.
- **Veien:** inne i leirens rutenett etter veikartene (`Vei.veikart('id:<bygg>' / 'rom:<nøkkel>')` – felles for alle som skal samme sted) eller
  `Vei.finn` til et punkt. Utenfor rutenettet (hogstfelt, hauger) rett fram, og fra kanten av rutenettet etter veikartet igjen.
  Fart 1,3 m/s (syke 0,7). `Folkgang.steg(G, ctx, dt)` med dt i sekunder spilltid; visningen kaller det **4 ganger i sekundet** (ekte tid) med
  spilltida som har gått (høyst 10 spillminutter om gangen), så det er billig også på 60× (de går da lenger per steg). Nye veier: høyst 40 per steg og
  ca. 8 ms veisøk per steg (et nytt veikart tar 3–15 ms) – resten venter til neste steg, så 200 folk som legger seg samtidig ikke gir en topp.
- **Arbeidet der de står:** en person bidrar bare når hen er **framme** (veien er gått og hen er innen 2,2 m av målet; veikartenes mål er
  ruta foran døra). `Folkgang.stedF(G, F, oppgave)` = andelen av dem på oppgaven som er i arbeidstida og framme (1 når ingen er i arbeidstida –
  døgnplanen gir da 0 uansett). Den går inn gjennom én ny krok i folk.js (`FolkRegler.stedF`) som ganges med døgnfaktoren, og når derfor:
  byggelagene i leir.js (`Leir.folkTempo` → `byggTempo` → `tempo`), maskinene i produksjon.js (`kraft` = arbeidere × `tempo('maskin')`),
  vakta (`forsvar().varsling` bruker `tempo('vakt')`), verkstedet (`vk`) og kjøkkenet (`kokker` i `behov`). Ingen endring i leir.js eller produksjon.js.
  - Unntak som teller som framme (`regnet`): byggeplasser over 300 m unna (leir.js regner reisen dit med `Leir.reise`, så den telles ikke to ganger)
    og frakten (ressurser.js regner turene mellom haugen og leiren selv).
- **Døgnplanen AV** (gamle spill som har slått den av, og testene med `navigator.webdriver` uten `JobberSpill.test`): `stedF` = 1 – gangen er
  bare pynt, alt regnes som før. Også når klokka er flyttet mer enn 2 spillminutter siden siste steg (spoling, tester som setter `tid`), regnes det
  som før til neste steg (`FolkgangSpill.fersk()`).
- **Står fast:** når veien ikke finnes, gir `Vei.kanNå` grunnen («ingen vei dit», «rommet har ingen dør», «døra er låst» …). Personen blir
  stående, bidrar ikke, og jobbtavla viser «Verksted står fast: Ola kommer ikke til verkstedet – ingen vei dit.» (`FolkgangSpill.fastLinjer()`).
- **2D:** prikker med retningsstrek i jobbens farge (`FolkgangSpill.FARGE`) når du er zoomet inn (0,6–3 m per punkt; sovende litt svakere);
  nærmere (under 0,6) tegner leir2d.js sine figurer ovenfra på de samme plassene med jakke i jobbens farge. Folk som er inne i et bygg
  med interiør (kontrollrom, kjøkken, sykestue, verksted, brakke) vises ikke i 2D; folk i egenbygde hus (byggesettets rom) vises i plantegningen.
  **Trykk på en person** (zoomet inn, ikke mens du bygger; et trykk inne i et av leirens bygg går fortsatt til bygget): kortet `#folkgangkort` med navn, jobb, døgnplan og hva hen gjør og hvorfor
  («Går til byggeplassen – bygger brakke», «Sover», «Spiser», «Har fri», «Står fast – kommer ikke til verkstedet: ingen vei dit»). Oppdateres hvert sekund.
  Ved personen i Folk-panelet står teksten fra gangen når den sier noe mer enn døgnplanen (går til …, står fast …).
- **3D:** `folk3d.js` – figurene følger plassene fra gangen (`FolkgangSpill.plass`) i stedet for egen tilfeldig gange: går mykt etter plassen
  (som oppdateres 4 ganger i sekundet), framme i et bygg med interiør står de inne (`plassVed`, som før), vakta oppe i tårnet. Når gangen teller
  (døgnplanen på) vises de **30 nærmeste kameraet** (velges hvert sekund), ellers de 14 første som før. Barn og gamle går som før. `UNNA` er beholdt:
  står du nærmere enn 2,6 m, går figuren unna (og flyttes straks når du er helt inntil).

## Tall (Claudes forslag – `Folkgang.REGLER`)
Gangfart 1,3 m/s, syke 0,7; framme innen 2,2 m; takt 0,25 s; bålet 3,5–7,5 m fra midten; utpost/matpakke over 300 m; 40 nye veier og 8 ms per steg;
30 figurer i 3D (folk3d `MAKS_GANG`). Fargene per jobb i folkgang-visning.js.

## Byggetiden før og etter (test_folkgang.js skriver tallene)
Brakke (4 timers arbeid) 120 m fra leiren, bestilt kl. 08, ti personer på bygg:
| | timer til ferdig |
|---|---|
| før (uten døgnplan – som i testene) | 4,1 |
| døgnplanen (F0, to skift) | 3,1 |
| døgnplanen + gangen (F2) | 3,2 |
Gangen koster her ca. 3 % (de går 120 m til byggeplassen om morgenen og etter lunsj). Med døgnplanen av er tempoet nøyaktig som før (testen og vakta
sjekker at `tempo('bygg')` er likt med og uten kroken). Hogst 700 m unna: ca. 9 min gange hver vei, to ganger i døgnet (matpakke) ≈ 3 % av 9 timer.

## Målt (Node, maskinen delt med andre hjelpere)
| Prøveleir | kartet | snitt per oppdatering | lengste | alle framme |
|---|---|---|---|---|
| 10 folk | 1,5–5 ms | 0,02–0,13 ms | 11–15 ms (ett nytt veikart) | ja, også i senga om natta |
| 50 folk | 8–19 ms | 0,1–0,2 ms | 13 ms | ja |
| 200 folk | 2–7 ms | 0,4–0,8 ms | 14–18 ms | ja |
Det lengste steget er det første veikartet til et nytt mål (Dijkstra over hele leiren); høyst ett slikt over 8 ms per steg.

## Filer
- `site/dovre-fliser/spill/folkgang.js` – NY, regler (`Folkgang`: `REGLER, STED, INNE, ny, steg, målFor, planlegg, gå, stedF, tekst, fast, oversikt, inngang, senger`).
- `site/dovre-fliser/spill/folkgang-visning.js` – NY (`window.FolkgangSpill`: `på, aktiv(), fersk(), tilstand(), steg(dtSek), plass(p), plass2d(p), tekst(p), gjør(p),
  fastLinjer(), visKort(id), farge, FARGE, nullstill(), kart()`). Ingenting lagres (plassene starter ved bålet når spillet lastes).
- `pipeline/fliser/test_folkgang.js` – NY (7 deler: til arbeidsplassen, natt/mat/fri, står fast bak palisade, byggetiden, 10/50/200 folk, egenbygd seng, hogstfelt og matpakke).
- `pipeline/fliser/vakter/ut3-folkgar.js` – NY vakt.
- `docs/natt/ut3-folkgar-hjelp.json` – ett hjelpeemne («Folk går til arbeidet», Leiren).

## Fellesfiler endret (nøyaktig)
- `spill/folk.js`: ny krok `api.stedF` (null som standard) og `stedF(F, o)`; `døgnF` ganger nå med `stedF` (så `tempo` og verkstedets `vk`
  får den), og `kokker` i `behov` ganges med `stedF(F, 'kjøkken')`. Uten kroken er alt som før (test_folk.js grønn).
- `spill/jobber-visning.js`: (1) i `del()`, rett etter linjene for `fast`: linjene fra `FolkgangSpill.fastLinjer()` (klasse `fastlinje gang`);
  (2) i `personDel()`: teksten ved personen er `FolkgangSpill.gjør(p) || n.tekst`.
- `spill/leir2d.js`: i `tegnFolk` – plassen fra `FolkgangSpill.plass2d(p)` når den finnes (jakke i jobbens farge, `går` fra gangen), ellers `folkPlass` som før.
- `spill/folk3d.js`: `MAKS_GANG = 30` (flokken har plass til 30 + 8), `velgVoksne` (de nærmeste kameraet når gangen teller, ellers de 14 første),
  og `følg()` – figuren følger `FolkgangSpill.plass(q)`; den gamle tilfeldige gangen brukes når gangen ikke har personen. `unna`/`UNNA` uendret (test_folk3d grønn).
- `index.html`: to skript-tagger rett etter `vei.js` (`folkgang.js`, `folkgang-visning.js`) + `versjon.py`.

## Prøvd
- `node pipeline/fliser/test_folkgang.js` (alle ok), og test_folk, test_jobber, test_leir, test_leir2d, test_folk3d, test_vei, test_kommando, test_produksjon – grønne.
- Nettleser (Dovre-testsiden, 1400 × 860 og 390 × 844 mobil, bilder sett): prøveleir med brakker, kjøkken, vakttårn, verksted bak palisade og
  en byggeplass – prikkene og figurene i 2D, kortet ved trykk (PC og mobil), jobbtavla med «Verksted står fast: … ingen vei dit», figurene i 3D
  ved byggene (Folk3d.antall 10). Ingen sidefeil.
- Vakta `ut3-folkgar` ok på PC og mobil (0,2–1,4 s), også med 3D åpent. Feil lagt inn med vilje (`stedF` alltid 1) → vakta feilet på
  «byggeren bidrar før hen er framme». Andre vakter etter endringen: ut1-jobber (feilet først fordi den setter klokka og leser tempo/tekst straks –
  rettet med «ferske plasser»), folk, leir2d, ut2-vei, ut2-sagbruk, lonn, morgen, figurer, 3d – ok.

## IKKE gjort (senere faser / åpent)
- Bærejobber (F3): frakt-folkene går til haugen og står der; turene regnes fortsatt av ressurser.js. Maskinenes innmating/bruksplass/utmating er ikke
  egne plasser – folkene går til inngangen foran maskinbygget.
- Leirens ferdige bygg er hindringer med én inngang i veien (F1): folk går til døra og «inn» (3D: interiøret, 2D: skjult) – ikke rute for rute inne.
- Ute går folk rett fram utenfor leirens rutenett (ikke terreng, vann eller veger); fra leiren ut til et hogstfelt kan streken gå over et bygg i 2D.
- Ingen kø eller trengsel; flere ved samme dør spres bare litt i tegningen.
- Plassene lagres ikke (alle starter ved bålet når spillet lastes – det første kvarteret etter lasting arbeider de litt mindre mens de går).
- Bare spillerens egen leir; utposter og folk langt unna regnes som før (kapittel 6.9). Ingen trafikkart (F5), ingen ordre til én person.
- Etasje 2 i byggesettets hus: figurene i 3D løftes 3 m per etasje; 2D tegner alle etasjer oppå hverandre.
