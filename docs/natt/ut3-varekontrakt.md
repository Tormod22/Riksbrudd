# ut3-varekontrakt – fase Ø2: varekontrakter

28. nov, gren `claude/ut3-varekontrakt`. Plan: `docs/plan-selskap-okonomi.md` kapittel 7 (Varekontrakter), 14.5 (teknologi gjennom
kontrakter – her bare: Storlias tømmerkontrakt gjør sagbruket kjent) og Ø2 i kapittel 16. **Alle tall er Claudes forslag** (samlet i
`Vare.REGLER` i `spill/vare.js` og `VM` i `pipeline/fliser/okosim-vare.js`).

## Hva som er laget

### Reglene: `site/dovre-fliser/spill/vare.js` (uten DOM, `window.Vare`; test `pipeline/fliser/test_vare.js`, 45 sjekker)
Tre nye kontrakttyper i Selskapet – samme maskineri som før (tilbud, frist, bot, rykte, nivå, `Selskap.godta/steg/lever/bryt`, lagres med
selskapet i `riksbrudd-selskap`). `Vare.registrer(Selskap)` legger dem i `Selskap.REGLER.TYPER` (gjøres av seg selv i nettleseren).
- **lever** – «Storlia Tømmer kjøper 40 m³ planker, levert ved Otta innen 3 døgn». Planker (`tre`), ved eller flis, 10–40 m³, frist 48–72 t.
  Pris per enhet = markedets verdi i dag × 1,25 (× 1,1 når det er meldt bakhold). Stedet er firmaets hjemsted: et av de fire nærmeste
  tettstedene 2,5–40 km fra leiren (fast per firma). Levert = varene er der (innen 250 m), flere turer går fint. Bot ved brudd 35 %.
- **avtale** (leveranseavtale) – N m³ hvert døgn i 5–8 døgn (ved 6–10, flis 8–12, planker 8–14), pris × 1,1. **Kjøperen henter ved leiren**
  hvert døgn etter at avtalen ble tatt (valgt for at det skal kunne spilles uten en tur hver dag – planens «frakt» gjelder leveringene).
  Mangler lageret varene: bot 50 % av døgnets verdi. Alt levert: bonus 15 % av hele verdien. Over halvparten mistet = avtalen er brutt
  (−10 pålitelig, ingen ekstra bot – den er betalt per døgn).
- **kjøp** (kjøpsavtale) – du kjøper tømmer (16–30 m³), diesel (300–600 l) eller mat (15–30 rasjoner) hvert døgn i 5–7 døgn til fast pris
  (markedet × 0,92). Første levering straks. Det som ikke får plass på lageret, beholder selgeren (betales likevel). Mangler kassa pengene:
  bot 25 % av døgnets pris.
- **Gråfjell Frakt** (`Vare.brukFrakt`): tar hele resten av en levering for 15 % av betalingen, kjører 35 km/t langs en veg 1,35 × luftlinja
  + 3 t lasting. Sjansen for tap 4 % (10 % ved meldt bakhold) – de tar risikoen: ingen bot, erstatning 80 % av varenes verdi, −3 pålitelig.
  Rekker de ikke fristen, sier de nei.
- **Bakhold**: 30 % av leveringene har meldt bakhold; når tatt kan bakholdet komme som for eskorten (`Selskap.godta` trekker `k.angrep`),
  og visningen setter bakholdslaget foran lastebilen (samme kode som eskorten, `k.bil`).
- **Tilbudene**: hver morgen ett varetilbud (to når dere har en maskin som lager varer), høyst tre åpne; det maskinene lager, blir oftere
  til leveranser. `Vare.rekker(k, har, perDøgn, kjøreTimer)` gir «Dere har 12 m³, sagbruket gir 26,4 m³ per døgn – rekker det.»
  (lasten på vegen regnes med). `Vare.vegTekst(km)`: «ca. 21 km langs ruta – lastebil ca. 0,4 t, til fots ca. 6 t» (ruta fra marsj() i
  selskap-visning.js, den samme eskortene og de andre kontraktene bruker).
- **Storlia** (`Vare.storliaTilbud`): den første tømmerkontrakten – kjøpsavtale på 20 m³ tømmer i døgnet i 5 døgn til 70 % av markedsprisen,
  én gang per leir (`S.vare.storlia`), ligger i 14 døgn og tas aldri av de andre selskapene (`k.fast`). Teksten forklarer at et sagbruk gjør
  48 m³ tømmer om til 26 m³ planker i døgnet, og at Storlia kjøper plankene.

### Kroker i `spill/selskap.js` (eid av meg, små og samlet, merket «ut3-varekontrakt»)
`tittel`, `kravTekst`, `lappFor` og `bruttTekst` spør typen først (`T.tittel/T.krav/T.lapp/T.bruttTekst`); `steg` kaller `T.steg` for typer
som har det (svarer 'lever' / { bryt } / null, legger egne hendelser i ut) – frist og bakhold som før; `lever` betaler `k.sluttKr` når den
finnes (avtale: bonusen, levering med Gråfjell: betaling − frakt); `bryt` kjenner grunnene 'frakt' og 'avtale' (ingen bot, −3/−10);
`godta` trekker bakhold også for leveringer med meldt bakhold; `dagSteg` og taket på tilbudslista hopper over `k.fast`; `fraJSON` leser
`S.vare`. Uten varetypene (som i økonomitesten for de andre strategiene) er alt som før – `typeVekter` er uendret, så de vanlige tilbudene
har samme tilfeldighet.

### Visningen: `site/dovre-fliser/spill/vare-visning.js` (`window.VareSpill`)
- Kortene i kontraktpanelet (`#selskap`, også i fanen Kontrakter i Selskapet): tittel, firma, rute/kjøretid, pris per enhet, betaling og bot,
  «rekker det»-linja, og for aktive: framdrift («Levert 3 av 20 m³ · 12 m³ på vegen», bilene med avstand igjen), døgnene som ruter
  (grønt levert, rødt mistet: «Levert 2 av 7 døgn · neste henting om 14 t»). Knappene **Send lastebil**, **La et lag bære**,
  **La Gråfjell Frakt ta det**, Vis i kartet, Avbryt (bot); tilbud: «Ta kontrakten» / «Inngå avtalen», Avslå.
- **Send lastebil**: den største ledige lastebilen/tømmerbilen innen 400 m av leiren (ikke en med kontrakt, ressursoppdrag eller last)
  laster det den tar (lastebil 12 m³, tømmerbil 20 m³ per bil i kolonnen) fra lageret og kjøres til stedet med `kjørTil` (vegnettet).
  Står bilen et annet sted, sier teksten hvor. Framme innen 250 m = levert; bilen kjører hjem igjen. Mistes bilen, er lasten tapt.
- **La et lag bære**: et eget lag ved leiren bærer 0,25 m³ per frisk mann og går dit med `ordre`.
- Handlingene går gjennom kommandolaget: kommandoen **`vareSend` { id, hvordan: bil | lag | frakt }** (registreres fra vare-visning.js).
- Hendelsene: avtalens henting tar varene fra lageret og betaler (`OppstartSpill.gi`), kjøpsavtalen betaler og legger varene inn (tre/tømmer/
  ved/flis i Leir-lageret, diesel i tankene opp til `Leir.kapasitet`, mat i Folk), botene trekkes, alt meldes i loggen.
- Kartet: stiplet linje fra leiren til leveringsstedet og en liten kasse over bilene/lagene som har last.
- **Morgenen** (i selskap-visning.js sitt døgnsteg): nye varetilbud fra trinn 2 «Leverandør» (`TrinnSpill.regn().nr >= 2`).
- **Storlia**: når trinn 2 er nådd, kommer tømmerkontrakten (sjekkes hvert 5. sekund) med en linje i loggen. Tas den, er **sagbruket kjent**
  (`S.vare.sagKjent`): loggen forklarer sagbruket (eller sier at plankene nå kan selges til Storlia), og et leveringstilbud for planker fra
  Storlia følger straks. Kortet «Storlia Tømmer har hørt om dere» (selskapsbilde.js) sier nå at Storlia har en tømmerkontrakt ved trinn 2,
  og «Åpne Selskapet» går til fanen Kontrakter når trinn 2 er nådd.
- I testene (navigator.webdriver) skjer ingenting av seg selv (`VareSpill.test = true` slår det på); `VareSpill.morgen(true)`,
  `VareSpill.storlia(true)` og `VareSpill.knapp(id, hvordan)` kan kalles fra prøver.
- Markedsverdien (`VareSpill.verdi()`): markedets egen pris (kjøpsprisen uten påslaget når markedet er dyrt); uten marked som før grunnprisene.

API: `VareSpill.{ verdi, har, plass, perDøgn, mål, vis, kort, send, knapp, hendelse, ferdig, levertTekst, morgen, storlia, storliaTatt, ledigBil, ledigLag }`.

### Økonomitesten: `pipeline/fliser/okosim-vare.js`
Ny strategi **«kontrakter + sag + varer»** (`kontraktVare`): som «kontrakter + sagbruk», og fra trinn 2 tar leiren varekontraktene som passer
(Storlias tømmer når saga går, leveringer av planker/ved som lager + det maskinene faktisk ga siste døgn rekker, flis bare når alt ligger på
lageret, avtaler når maskinene ga 1,1 × det avtalen krever og lageret har det første døgnet). Leveringene kjøres med tømmerbilen (én tur om
gangen, `okosim.bilTimer`), eller av Gråfjell når fristen er nær. Sagbruksdelen selger ikke det kontraktene trenger (`sim.vareReserve`, én
linje i okosim-sagbruk.js). `Selskap.steg` pakkes inn i modellen bare for kjøringer med varer (SIMS), så de andre strategiene er uendret.
Krav: varekontraktene gir minst 3 mill. på 30 døgn (median), aldri mer i døgnet enn ett sagbruk i full drift lager av planker til
leveringspris (0,7 mill.), og en **selvtest** (betaling × 3) som skal slå ut. Båndet for den nye strategien er lagt til
`okonomitest-band.json` (de andre strategiene er ikke endret – sjekket at tallene var like).

Resultat (60 frø, sommer, kassa i mill. kr, median [10–90 %]):

| strategi | dag 10 | dag 20 | dag 30 |
|---|---|---|---|
| kontrakter + sagbruk | 21 [2–32] | 56 [14–78] | 100 [6–131] |
| **kontrakter + sag + varer** | 23 [2–38] | 57 [21–90] | 102 [30–140] |

Varekontraktene gir ca. 11–12 mill. på 30 døgn (12,7 leveringer, 0,9 avtaler, 0,9 kjøpsavtaler i snitt; 0,9 brutt), plankesalget i
markedet faller fra 10,5 til 3,7 mill. – netto ca. +4 mill., og færre kjøringer ender dårlig (10 %-kvantilen 30 mot 6 mill.). 5 av 60
blakk de tre siste døgnene (krav ≤ 10 %). `OKO_STRENG=1`: de eneste bruddene er de fire kjente fra ut2-sagbruk (hogst og «bare sagbruk»).

## Valg der planen er åpen (Claudes forslag)
- Leveranseavtalene hentes ved leiren (ingen daglig tur); leveringene (lever) må fraktes.
- Kjøpsavtalen leverer til leiren; det som ikke får plass, er tapt (betales likevel) – det «binder» som planen sier.
- Gråfjell tar risikoen: erstatter 80 % av varene og tar boten selv; litt ripe i ryktet.
- Storlias første kontrakt er en kjøpsavtale på billig tømmer (planen: «kjøp av tømmer billig eller lever planker»); leveringen av planker
  kommer rett etter at den er tatt.
- Varekontrakter er nivå 1 (ingen krav til lag/kjøretøy for å ta dem); betalingen følger markedet, ikke nivåfaktoren.

## Fellesfiler endret (nøyaktig)
- `site/dovre-fliser/index.html`: to skript-tagger rett etter `selskap-visning.js` (før `trinn.js`): `vare.js`, `vare-visning.js` + `versjon.py`.
- `site/dovre-fliser/spill/selskap-visning.js` (eid): `VS()/erVare`; `rydd(k)` fjerner bare bilen kontrakten selv satte ut (`b.kontrakt === k.id`
  – ellers ville spillerens egen lastebil blitt slettet) og slipper lasten; `vurder` og målingen i `steg` for varetypene; levert-meldingen og
  leveringskortet (ikke for 0 kr); `VS().hendelse` for de nye hendelsene; morgenens varetilbud; «Avtale inngått» og Storlia ved `ta`;
  kortene (`tilbudKort/aktivKort`); knappen `data-s="vare"`; ingen kartmerke for avtaler; lappen peker til Selskapet for varekontrakter.
- `site/dovre-fliser/spill/selskapsbilde.js`: én tekst (`storliaTekst().neste`) nevner tømmerkontrakten. test_selskapsbilde.js er grønn.
- `site/dovre-fliser/spill/selskapspanel.js`: én linje – «Åpne Selskapet» på Storlia-kortet går til Kontrakter når trinn ≥ 2.
- `pipeline/fliser/okosim-sagbruk.js`: én linje – salget om morgenen holder igjen `sim.vareReserve`.
- `pipeline/fliser/okonomitest-band.json`: nytt bånd for `kontraktVare` (de andre uendret).

## Prøvd
- Regeltester: test_vare (45), test_selskap, test_balanse, test_trinn, test_selskapsbilde, test_kommando, test_okonomi, test_okonomitest
  (60 frø, også OKO_STRENG=1), og alle 138 `pipeline/fliser/test_*.js` (grønne; test_tilfeldig fant `Math.random` i frakten – rettet til
  den felles tilfeldigheten). Storlia av seg selv (VareSpill.test/SelskapSpill.test på, trinn 2): tilbudet kom innen 5 s, ble tatt, sagbruket kjent.
- Nettleser (Dovre-testsiden, 1400 × 860 og 390 × 844 mobil): tilbudskort og aktive kort for levering, leveranseavtale og Storlias kjøpsavtale
  (bilder sett), «Send lastebil» lastet 20 m³ på leirens lastebilkolonne, «La et lag bære» sendte et lag mot stedet (det gikk), morgenens
  varetilbud (`VareSpill.morgen(true)`). Testsiden har ikke vegnettet («Fikk ikke hentet vegkartet»), så **lastebilen er ikke kjørt en hel
  tur langs vegen i nettleseren** – vakta flytter den fram. Dovre-testsiden har ingen tettsteder for leveringer (`SelskapSpill.steder()` er tom);
  vakta og prøvene bruker prøvesteder.
- Vakt `pipeline/fliser/vakter/ut3-varekontrakt.js` (0,1–0,2 s): ok på PC og mobil; med feil lagt inn med vilje (avtalen ga 0 kr i bot)
  feilet den («et døgn uten ved ga ikke bot»). I samme side også ok: ut2-balanse, ut1-selskap, ut2-sagbruk, kontrakter, kontrakt-r1,
  kontrakt-r3, selskap, balanse.

## IKKE gjort
- Ordre fra byer (planen 7, fjerde punkt) – hører til Ø3 (byene).
- AI-ene (Ravnsund, Mosevakt) tar fortsatt bare varetilbud gjennom `dagSteg` (35 % per døgn som de andre tilbudene) – ingen egne varekontrakter (Ø8).
- Høvleriet og andre maskiner som låses opp av Storlia «når dere har levert nok» (14.5) – bare `S.vare.sagKjent` er laget; sagbruket kunne
  bygges før også (ut2-sagbruk), så «kjent» betyr her teksten og tilbudet, ikke en lås.
- Lyd, egne 3D-modeller for last på bilene, og lastebilen som egen figur i Gange.
- Økonomimodellen eskorterer ikke leveringene (bakhold tar lasten med 50 % sjanse), og tømmerbilen deles ikke med hogsten i modellen.
- Hjelpeteksten er skrevet i `docs/natt/ut3-varekontrakt-hjelp.json` – `spill/hjelp-natt.js` er ikke laget på nytt (`samle_hjelp.py` ved flettingen).
