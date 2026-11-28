# ut5-fabrikk – fabrikken du bygger selv (fase B5)

28. nov, utbyggingen av `docs/plan-selskap-okonomi.md`, kapittel 5.6 (og 4.2, 6.6), B5 i kapittel 16. Gren `claude/ut5-fabrikk`.
Figurene «fabrikk», «maskinfolk» og «spor» som oppdraget nevner, fant jeg ikke i docs/ – bygget etter teksten i 5.6 og 6.6.
Alle tall er Claudes forslag (`Fabrikk.REGLER`, delene i `ByggesettRegler.NYE`).

## Hva spilleren ser
- **Byggesettet har fanen «Maskiner»**: Sagbenk (3,6 × 9,6 m), Høvel (2,4 × 4,8), Vedkløyver (2,4 × 3,6), Fyrkjele (2,4 × 3,6), Lysrør, Lyskaster,
  Hyllerekke (1,2 × 4,8) og Pallplass (2,4 × 2,4). Ett trykk = én maskin med midten der du trykker; «Flyt mot øst/nord/vest/sør» (R) snur den
  (innmating → utmating). Linja sier pris, mål, kW og «betonggulv» for de tunge. Lamper: to trykk = én lampe hver 4,8 m.
- **Avvisninger med grunn** (rødt): «Sagbenk må stå på gulv – legg gulv under hele fotavtrykket først», «Sagbenk er tung og trenger betonggulv
  (fundament eller betongdekke)», «Vedkløyver står over en vegg», «Det står en søyle der …», «Her går det en trapp», «Her står det alt en maskin
  eller hylle», og **«Ingen vei til bruksplassen (rommet har ingen dør) – sett inn en dør eller port, eller flytt maskinen.»** (Vei.kanNå med
  `bruksplass: true` for hver bruksplass, med maskinen i fotavtrykket). **Ikke under tak** er lov, men oransje advarsel: «… slites dobbelt så fort».
- **Rommet**: et rom med en sagbenk eller to maskiner heter «Fabrikk», én maskin «Verksted», bare hyller/paller «Lagerrom» (`ROMTYPER` i
  byggesett.js, romType-kroken fra B4). Navnet i kartet får «· lager 10 m³» når rommet har hyller.
- **2D** (kartet og fanen Plan): maskinene med fotavtrykk og tegn (sagblad, valser, kile, flamme), retningen som en liten pil, lampene som gule
  prikker og hyllene med hyllelinjer. Zoomet inn (under 0,35 m per punkt): bruksplassene som oransje ringer, innmating/utmating som stiplede ruter
  («inn»/«ut» – med bæringen på tegner baering-visning.js feltene med mengdene i stedet), **flytpila** port inn → sag → høvel → port ut (grønn,
  «+15 % flyt») eller oransje stiplet («hulter til bulter −10 %»), og grunnen når maskinen går saktere («mørkt – uten lys om natta (−40 %)»).
  Med byggesettet åpent: lysets rekkevidde som svake sirkler.
- **3D**: enkle kasser i byggesettets nett (sagbenk: bord, sagkasse, blad, gule valser; høvel; vedkløyver med kile; fyrkjele med pipe; hyller med
  hyllebord; paller; lamper under taket). Sett i en hall uten tak (bilde), 0 svevende deler (`Byggesett.sjekk()`).
- **Selskapet → Produksjon**: hver maskin i en hall får linja «I hallen: Fabrikk · flyt +15 % · lys på · under tak» (eller «mørkt (−40 %)»,
  «kaldt (−20 %)», «uten tak – slites dobbelt»), og teksten «går · +15 %» / «går · 60 % fart». Høvelen: «høvler plankene fra sagbenken i rommet».
- **Leir-menyen, fanen Bygg → «Fabrikk»**: rommene med maskiner – strømmen per rom (maskiner og lys), hvor mange uten strøm, og linja per maskin.

## Reglene (spill/fabrikk.js – uten DOM, `window.Fabrikk`)
- `plasser(b)`: innmating og utmating i rutene rett utenfor endene av fotavtrykket, bruksplassene (sagbenken 3, de andre 1) i rutene langs høyre side
  sett i flytretningen. Alt er frie ruter; fotavtrykket sperrer i Vei. **baering.js bruker dem** (`Baering.plasser` spør `Fabrikk.plasser` for deler med
  `maskinDel`), så operatørene og bærerne går inn gjennom porten/døra.
- `hall(L)` → Map id → { rom, romNavn, tak, dagslys, lamper, flyt, flytTekst, flytPunkter, sager, høvler }.
  - **Tak**: dekke/tak over hele fotavtrykket (`c:i:j:n+1`).
  - **Lys**: ferdige lamper i samme etasje (og samme rom når maskinen står i et rom) innen lampens rekkevidde (lysrør 6 m, lyskaster 14 m).
    Dagslys: åpen himmel, ikke i et rom, eller rommet har vinduer eller porter.
  - **Flyt** (per sagbenk i et lukket rom): inn = åpningen (dør/port) nærmest sagbenkens innmating, ut = åpningen nærmest den siste maskinens
    utmating (ikke den samme). Punktene inn → sag (inn, ende) → høvel (inn, ende) → ut legges på linja fra inn-porten til ut-porten; går ingen steg
    mer enn 1,2 m baklengs = riktig (×1,15), mer enn 2,4 m baklengs = hulter til bulter (×0,9), ellers ×1. Én åpning: ×1 («sett inn en port til»).
    Høvelen nærmest sagas utmating får samme faktor. Dette er en enkel måling langs linja, ikke en ekte vei-lengde (Vei.finn) – billig og forutsigbar.
- `faktorer(L, H, { time, vinter, virker(lampe-id), status })` → `{ fart, slit, sager, høvelFor, del }` til `Produksjon.steg`:
  fart = flyt × lys (natt eller mørkt rom uten lampe som virker: 0,6) × varme (vinter uten fyrkjele som går i samme rom: 0,8); slit = 2 uten tak.
  Dagen er kl. 7–19 (spillets klokke `6 + tid / TIME`). Lampen virker = ferdig, ikke slått av, ikke i `Leir.steg().mangler`.
- `sjekkNy(deler, d)` → advarselen «ikke under tak».

## Endringer i filer jeg eier (oppdraget)
- `spill/byggesett.js`: delene i `NYE` (kat `maskin` med `maskin`/`l`/`b`/`tung`/`kw`, `lampe` med `lys`, `lager` med `lager`), `TING`, `fotRuter`,
  `ruter`/`midt`/`biter`/`støttet`/`radU` for dem, `plasserTing` + `tingFeil` (plassering), `registrer` gir Leir.BYGG `maskin`, `maskinType`, `maskinDel`,
  `lampe`, `hylle` og `kw`; `rom()` gir `maskiner`, `hyller`, `lamper`, `hylleplass` og romType med { seng, maskin, sag, hylle }; `ROMTYPER` +
  fabrikk/verksted/lagerrom; `romSum().hyller` og `Leir.lagerplass.ekstra` tar med hyllene (bare når leiren har ferdige hyller); `høyder` regner
  maskiner/lamper som flater (samme grunnhøyde som gulvet).
- `spill/byggesett-visning.js`: fanen «Maskiner» (FANER, V.maskin, typeNå, knapperaden, «Flyt mot …», etasjeknappen, prisTekst per maskin, hjelp),
  ett trykk per maskin, ingen pekerfølging for maskiner, kallet `FabrikkSpill.sjekkForslag` etter kanBygge, advarselen, `tegnDel`- og 3D-kroken
  (maskin/lampe/lager → FabrikkSpill), maskinene i fanen Plan, riv velger maskinen når du trykker på fotavtrykket.
- `spill/produksjon.js`: maskintypen `høvel` (tillegg: 1 folk, 5 kW, ingen råvare), `rekkefølge` med høvel før saga, `alias()`/`base()` (delene bruker
  samme regelobjekt som maskin-byggene: `REGLER.maskiner.bs_sagbenk_1 === REGLER.maskiner.sagbruk`), `steg` med `ctx.fart`, `ctx.slit`, `ctx.sager`,
  `ctx.høvelFor` (uten dem som før), `s.maskin`, `s.fart`, `s.høvlet`, `utFor(b, høvlet)`, teksten «· +15 %», `oppskrift`/`merke` for høvelen.
- `spill/produksjon-visning.js`: `FabrikkSpill.ctx` i simuleringen, linja «I hallen: …» i fanen, `ProduksjonSpill.status()`, sagaAndel med `s.maskin`.
- `spill/baering.js`: `plasser` spør Fabrikk for deler; ingen bærejobb uten råvare (høvelen). `spill/baering-visning.js`: bærerplassene med `Produksjon.base`.
- NYE: `spill/fabrikk.js`, `spill/fabrikk-visning.js`, `pipeline/fliser/test_fabrikk.js`, `pipeline/fliser/vakter/ut5-fabrikk.js`, `docs/natt/ut5-fabrikk-hjelp.json`.

## Fellesfiler endret (små)
- `spill/vei.js`: i `lag()` – `tingH(n)` (fotavtrykket til maskiner og hyller som hindring) lagt til `hindreB` (bakken) og `hindre` i etasjene over.
  Uten maskiner som før (test_vei grønn).
- `index.html`: to skript-tagger rett etter `byggesett-visning.js` (`fabrikk.js`, `fabrikk-visning.js`) + `versjon.py`.
- `Leir.PRIORITET`: maskindelene legges til bakerst fra fabrikk-visning.js (`push`, leir.js er ikke endret).

## Gamle spill
Maskin-byggene (sagbruk, vedkløyver, fyrkjele som egne bygg) er urørt og får ingen av faktorene (de står ikke i `Fabrikk.hall`): samme planker,
samme slitasje, også om natta og om vinteren (test 7 og vakta). Økonomitesten (okosim) er uendret («økonomitesten ok»).

## Økonomien (test_fabrikk.js del 6)
Alt til salgspris 80 % (som okosim-sagbruk.js), dagens priser (planker 20 000, flis 6 000, tømmer 8 000 kr/m³), lønna til ti = 150 000 kr:
| | per døgn | × lønna til ti |
|---|---|---|
| sagbruk-bygg (frittstående) | 195 840 kr | 1,31 |
| sagbenk i god hall, brutto (flyt +15 %, lys, tak) | 225 216 kr | 1,50 |
| – netto etter hallens vedlikehold (24 520) og lys om natta (3 240) | 197 456 kr | 1,32 |
Brutto er hallen 15 % bedre; netto bare litt (1 %) – den lønner seg altså mest fordi en sagbenk UTEN hall mister mye (dobbel slitasje, 40 % saktere om
natta). **Merk:** brutto 1,50 er over båndet 0,7–1,4 som okosim-sagbruk.js bruker for et sagbruk i full drift (det er allerede 1,31 etter
ut4-balanse2). Netto er innenfor. Høvelen (3 mill., 1 folk, 5 kW) gir planker × 1,4 og flis × 0,5 – samme tall som høvleriet fra Storlia (ut4-firmaer).
Hallen 9,6 × 19,2 m i blikk med to porter koster ca. 2,4 mill. kr.

## Prøvd
- Node: test_fabrikk (alle ok, med selvtest), test_byggesett, test_produksjon, test_baering, test_vei, test_bygning (RASK), test_leir, test_folk,
  test_jobber, test_varelager, test_okonomitest, test_leir2d, test_merker, test_leirvirkning, test_kommando, test_byggevisning, test_plantegning,
  test_folkgang, test_firma – grønne.
- Nettleser (Dovre-testsiden, PC 1400 × 860 og mobil 390 × 844): vakta ut5-fabrikk ok på begge (0,2–0,8 s). Feil med vilje (flyttesten snudd) →
  vakta feilet (flyt 1). Vaktene ut4-byggesett3, ut2-sagbruk, ut4-maskinfolk, ut2-vei, ut3-varer, ut4-firmaer, ut3-folkgar, leir2d, leirvirkning,
  ut3-riving ok i samme side (PC; de fem første også mobil). `ut1-selskap` feiler («Byer viser ingenting») – det gjorde den også før (ut4-maskinfolk.md).
- Med døgnplanen på (gangen, JobberSpill.test): en sagbenk i en hall, lagertelt med tømmer utenfor – bærerne bar tømmer inn til innmatingen, tre
  operatører sto på ringene langs saga, og saga gikk etter 130 s med «går · +15 %» (bilde gange.png).
- Bilder (scratchpad natt/ut5-fabrikk/): kart.png (hallen med sag, høvel, lys, hylle, pall og flytpila), verktoy.png / verktoy-mob.png (fanen
  Maskiner), plan.png (fanen Plan), tre.png og tre-utak.png (3D med og uten tak), gange.png. Ingen sidefeil.

## IKKE gjort / å vite
- Maskinene i 3D stopper deg ikke når du går (bare veggene er hindringer i byggesettet), og de har ingen lyd.
- Rives gulvet under en maskin, blir maskinen stående (ingen kaskade som for dekker).
- Flyt bare for sagbenk/høvel; vedkløyver og fyrkjele i rommet får ×1. Ingen transportbånd (planen: folkene bærer).
- Lyset gjelder bare maskinene i hallene (maskin-byggene antas å ha lys); lysene lyser ikke opp noe i 3D.
- Strøm «per bygg med kabel» (planen 5.6) er forenklet: alt går fortsatt på leirens felles nett; Leir-menyen viser forbruket per rom.
- Hyllene gir lagerplass (Leir.lagerplass → varelagerets «egne rom»), men enhetene tegnes ikke på hyllene.
- Maskiner i etasjene over: reglene tillater det (gulv i etasjen), men bærerne/Vei-sjekken er bare prøvd i 1. etasje.
- Varselet før kjøpet (Produksjon.driftVarsel) vises ikke i byggesettet for sagbenken – bare i byggelista for maskin-byggene.
- Ta over hus i kartet og sette maskiner der (B7) er ikke laget.
