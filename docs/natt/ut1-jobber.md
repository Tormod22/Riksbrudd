# Utbygging 28. nov – pakke «jobber» (fase F0: jobbtavla og døgnet)

Plan: `docs/plan-selskap-okonomi.md` kapittel 6.3, 6.4, 6.8 og F0 i kapittel 16. Fortsatt REGNET – figurene går ikke etter
jobbene ennå (det er F2). Gren `claude/ut1-jobber`.

## Filer
- `site/dovre-fliser/spill/jobber.js` – NY, regler uten DOM (`globalThis.Jobber`, Node: `require`). Test: `pipeline/fliser/test_jobber.js`.
- `site/dovre-fliser/spill/jobber-visning.js` – NY, `window.JobberSpill` (del i Folk-panelet, døgnfaktoren, fordelingen, kommandoene, lagring).
- `pipeline/fliser/vakter/ut1-jobber.js` – NY vakt.
- `docs/natt/ut1-jobber-hjelp.json` – to hjelpeemner (gruppe «Leiren»).
- Endret (små, samlede endringer):
  - `spill/folk.js`: `api.døgnF` (ny krok, `null` som standard) og `døgnF(F, o)`; `tempo()` ganges med den (etter taket 1,5),
    og verkstedets kraft (`vk` i `steg`) ganges med den. Ingenting annet. Uten kroken er alt som før (test_folk.js er grønn).
  - `spill/folk-visning.js`: (1) `grunn().moralTillegg` legger til `JobberSpill.moralTillegg()` (nattskift); (2) i `fyll()`: delen
    «Jobbtavla» (`JobberSpill.del`) – når tavla fordeler, står den i stedet for − / + per oppgave, ellers under oppgavene; (3) ved hver
    person `JobberSpill.personDel(p)` (hva hen gjør nå, låst/aldri, «Jobber …»); (4) nedtrekkslista ved personen kaller
    `JobberSpill.velg(p, o)` først (når tavla fordeler, låser valget personen til jobben).
  - `index.html`: to skript-tagger rett etter `folk-visning.js` (`jobber.js`, `jobber-visning.js`), versjonsmerkene satt med `versjon.py`.

## Slik virker det
- **Jobbene** (`Jobber.lag(F, L, ctx)`): én rad per jobbtype (oppgavene i folk.js uten «fri»), med plasser, hva som skal gjøres og en
  grunn når det ikke er noe å gjøre / jobben er sperret. Plasser: bygg 2 per byggejobb i køen (`Leir.jobber`), hogst 3 og riving 3 når
  et felt/hus er i gang (`RessursSpill.tilstand().jobber`), frakt 2 når en haug ligger lenger unna enn 150 m, vakt 1 per vakttårn (minst 1),
  kjøkken 1 per 8 personer (minst 1), stell 1 per 3 syke, verksted 2 per verksted («uten strøm» = sperret), overvåking 1 per kontrollrom.
- **Fordelingen** (`Jobber.fordel`, bare når «La tavla fordele» er på): de syke og de i opplæring flyttes ikke; låste først; så
  prioritet 1 → 5, innen samme prioritet én plass om gangen etter tur, og den beste på jobben (den som har jobben fra før får +0,25,
  spesialisten +1 på sin oppgave). `friAndel` 0,2 får hvile (startgjengen hadde 2 av 10 fri; moralen i folk.js vil ha minst 10 %).
  Resten «fri». Resultatet skrives i `p.oppgave`, så alt annet (byggelag, ressurser, forsvar, 2D/3D) virker som før.
  Fordeles straks etter en endring, når jobbene endrer seg (sjekkes én gang i sekundet) og ellers hvert 30. spillminutt. Byttene står
  i loggen («Jobbtavla: Trond frakt → bygg …»).
- **Står fast**: plasser som ikke fylles får grunnen «ingen ledige» (noen kan, men er opptatt/har hvile), «ingen med ferdighet»
  (ferdighet under 0,6), «alle er utelukket» eller sperringen («uten strøm»). Når spilleren fordeler selv: «ingen satt på jobben».
- **Standardprioriteter** (Claudes forslag): vakt 1, kjøkken 1, stell 2, bygg 2, verksted 3, overvåking 3, frakt 3, hogst 3, riving 4.
  Med to bestillinger, et hogstfelt og en haug gir de nøyaktig startfordelingen fra folk.js: 4 bygg, 1 kjøkken, 1 vakt, 1 hogst,
  1 frakt, 2 fri (testen sjekker det, også at kokken er på kjøkkenet og soldaten på vakt).
- **Døgnplanen** (Claudes forslag): dag = søvn 22–06, mat 06–07, arbeid 07–11, lunsj 11–12, arbeid 12–17, middag 17–18, fri 18–22
  (9 t arbeid). Tidligskift 06–14:30, senskift 14:30–23, nattskift 22:30–07 (8 t hver, med mat og 8 t søvn). Personer på samme jobb
  deles på skiftene etter tur (id). Vakt, overvåking og stell går i **turnus** (k = min(3, antall) skift fra kl. 06; én vakt = døgnvakt),
  så leiren aldri står uten vakt – de regnes som før hele døgnet. Kjøkkenet «lager alle måltidene» og regnes også som før.
- **Arbeidstempo**: bare produksjonsjobbene (bygg, hogst, riving, frakt, verksted) følger planen. Faktoren (`Jobber.faktor`) =
  summen for dem som er i arbeidstida av `24 / arbeidstimer × dagsverk[skift]` delt på alle arbeidsføre på jobben. `dagsverk`: dag 1,
  to skift 1,05, døgnet rundt 1,1 (verktøyet står mindre stille). Et helt døgn gir altså like mye arbeid per person som før (dag), litt mer med skift.
- **Nattskift**: moralmålet −15 × andelen av gjengen som går nattskift (fire av ti på bygg døgnet rundt: −1,5).
- **Skift per jobbtype**: bygg «to skift» som standard, de andre produksjonsjobbene «dag».
- **I testene** (navigator.webdriver) er døgnplanen av (faktor 1 – som før) til `JobberSpill.test = true`. Tavla er av til spilleren
  slår den på (eller endrer en prioritet), også i et ekte spill: gamle og nye spill oppfører seg som før til da – bortsett fra døgnplanen,
  som er på i ekte spill («Døgnplan: av» i tavla gir det gamle).

## Byggetiden før og etter (test_jobber.js skriver tallene)
- **Et døgn med mye i kø** (40 kontrollrom, startgjengen, 4 på bygg): før 46,7 arbeidstimer, dagskift 46,3, to skift 48,8,
  døgnet rundt 51,4. Altså samme fart per døgn (justert med `ARBEID_K = 24 / arbeidstimer`).
- **Ett bygg bestilt en tilfeldig hel time** (snitt / lengste ventetid til ferdig):
  - brakke (2 t): før 2,05 / 2,05 t · dag 5,20 / 14,78 · **to skift (standard) 2,84 / 8,32** · døgnet rundt 2,06 / 2,98
  - kontrollrom (3 t): før 3,08 / 3,08 · dag 6,21 / 15,17 · **to skift 3,51 / 8,97** · døgnet rundt 3,08 / 4,23
  - container (0,5 t): før 0,52 / 0,52 · dag 4,62 / 14,20 · **to skift 1,52 / 7,33** · døgnet rundt 0,57 / 1,13
- Justering: med bare dagskift ville en bestilling om kvelden vente til neste morgen (snitt 2,5× tregere for en brakke). Derfor går
  bygg i **to skift** som standard (06–23): brakka tar 2,8 t i snitt mot 2,0 før; bare bestillinger mellom 23 og 06 venter til morgenen.
  Vil spilleren ha det som før: bygg «døgnet rundt» (litt lavere moral) eller «Døgnplan: av».

## Kommandoene (spill/kommando.js; registreres fra jobber-visning.js med reglene i `Jobber.registrerKommandoer`)
`jobbPrio { jobb, prio 1–5 }` (slår på tavla), `jobbAuto { på }`, `jobbDøgn { på }`, `jobbSkift { jobb, skift: dag|to|døgn }` (bare
produksjonsjobber), `jobbLås { person, jobb | null }`, `jobbUte { person, jobb, ute }` (utelukking tar bort en lås til samme jobb).
Alle er `leir: true` (en gjest i flerspiller sender dem til verten). Testet i test_jobber.js.

## API
- `Jobber`: `REGLER, TYPER, PRODUKSJON, TURNUS, PLANER, SKIFT, ny, fraJSON, prio, skift, erUte, lag, fordel, bruk, fastManuelt, klokke,
  timer, turnusPlan, planFor, nå, faktor, moralTillegg, døgnSnitt, registrerKommandoer`.
- `JobberSpill`: `test, tilstand(), sett(o), jobber(), fordel(), del(), personDel(), nå(p), velg(p, o), moralTillegg(), aktiv(), les(), lagre()`.
- `FolkRegler.døgnF(F, o)` – kroken (settes av jobber-visning.js; gjelder bare spillerens eget folk).
- Lagring: `riksbrudd-jobber` = `{ leir: 'x,y', J: { versjon, auto, døgn, prio, skift, lås, ute } }`.

## Prøvd
- `node pipeline/fliser/test_jobber.js` (54 sjekker), test_folk, test_leir, test_kommando, test_ressurser, test_samfunn grønne.
- Nettleser (1400 × 860 og 390 × 844 mobil, bilder sett): Folk-panelet med tavla i begge moduser, prikkene/prioriteten, skift-knappen,
  «Jobber …» og «aldri»-brikkene, «sover – bygg fra 07:00». Ingen sidefeil.
- Vakten `ut1-jobber` på PC og mobil (0,2–0,5 s), og med en feil lagt inn med vilje (døgnfaktoren alltid 1) feilet den på «døgn».
  Kjørt etter den: vaktene folk, lonn, ui, morgen, figurer, leir2d, nybegynner, balanse – grønne (nybegynner feilet bare når den
  gikk rett etter balanse; alene og rett etter ut1-jobber er den grønn).

## IKKE gjort (senere faser / åpent)
- Figurene i 2D/3D går ikke etter døgnplanen eller jobbene (F2). folk3d.js og leir2d.js leser fortsatt bare `p.oppgave`.
- Maskinjobber, bærejobber mellom lager og maskin, «ingen vei», «tom for planker» (F1–F3: kommer når maskinene og veien i byggene finnes).
- Byggelagene i leir.js teller fortsatt alle på «bygg» (også de som sover); bare tempoet følger døgnet. Leir-menyen sier ikke
  «byggelaget sover» om natta – jobben står bare stille (Folk-panelet sier «sover – bygg fra 06:00»).
- Hvor mange som får hvile (`friAndel` 0,2) kan ikke endres i spillet ennå.
- Et «Nytt spill» på nøyaktig samme sted bruker tavla fra forrige spill (nøkkelen er leirens plass, som i de andre modulene).
