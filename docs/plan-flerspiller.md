# Plan: flerspiller i Riksbrudd (22. nov 2026)

Brukeren: «lag en plan for hvordan vi kan legge til multiplayer». Tidligere besluttet: 1–5 spillere i samme Norge, hver med sitt
eget private militærselskap (plan-kollaps.md §10, plan-wardogs.md). Alt her er Claudes forslag til brukeren har bestemt noe annet.

**Bestemt av brukeren 22. nov:** det skal være gratis, og foreløpig kjører tjeneren på **spillerens egen PC** (se kapittel 4).
Senere kan den samme tjeneren flyttes til Cloudflare uten å skrive spillet om.

## 0. Status og Claudes valg (22. nov natt, brukeren: «gjør alt etter en plan du lager … frist 2 timer»)

**Bygget (M2a – første delte verden):** tjenerprogrammet for vertens PC (`tjener/riksbrudd-tjener.js`, ingen avhengigheter,
`start-tjener.bat`, `LESMEG.md`; kan lastes ned fra spillet som `site/tjener/riksbrudd-tjener.zip`) og flerspilleren i
nettleseren (`spill/flerspiller.js` regler, `spill/flerspiller-visning.js` panelet «Spill sammen» i ☰). Gjestene kan sende lagene sine på marsj og stanse dem,
alle ser hvor de andre spillerne er (i kartet og i 3D), og alle kan skrive meldinger. Gjestene ser vertens leirbygg i kartet. Prøvd med to ekte
nettlesere mot tjeneren (`pipeline/fliser/test_flerspiller_e2e.js`) og tunnelen med en falsk cloudflared.

**Også gjort (M0, punkt 4):** felles tilfeldighet – `spill/tilfeldig.js` (frø-basert strøm som kan lagres), og `Math.random`
er byttet ut i regelmodulene (morgen, verden, oppstart, vær, overlevelse, kameravakt, forsvar, trussel). Strømmen lagres med
spillet; hvert nytt spill får sitt eget frø. Laget av en egen skysesjon, kontrollert og flettet.

**Snarveien i M2a:** simuleringen er ikke skilt ut fra index.html ennå (det er M0). Derfor regner **vertens nettleser** verden
som før; tjeneren kobler sammen, videresender og lagrer. Gjestenes nettlesere regner ikke selv – de viser et bilde fra verten
to ganger i sekundet (bare det verten ser – tåka gjelder) og sender ordre. Når M0 er ferdig, flyttes regningen inn i tjeneren
uten at protokollen endres mye.

**Claudes valg for spørsmålene som sto åpne** (kan endres av brukeren):

1. Rett på delt verden (M2), ikke postkasse først – det er det som gjør det til flerspiller.
2. **Samarbeid først:** alle spillerne er på samme side; verten gir lag til gjestene («Styres av» i lagpanelet).
3. **Cloudflare-tunnel** (rask tunnel uten konto, `cloudflared` ved siden av tjeneren). Uten den: bare samme nett.
4. **Verten styrer farten** for alle i M2a (gjestenes fartsknapper gjør ingenting). Avstemning om fart kommer med flere spillere.

**Gjenstår (neste runder):** resten av M0 (resten av simuleringen ut av index.html – marsj, patrulje og kamprunde er flyttet til `spill/simulering.js` –, kommandoer for alt, tilfeldigheten i *-visning.js), flere kommandoer for
gjestene (grav ned, bygg, leir), gjestens egen leir og selskap i vertens verden, mot hverandre (M3), og å prøve på ekte med
brukerens PC og cloudflared.

## 1. Hvor vi står i dag (målt i koden 22. nov)

| Hva | I dag | Hva det betyr for flerspiller |
|---|---|---|
| Simuleringen | Går i nettleseren: `sim(dt)` i index.html (3810 linjer), og 45 moduler henger seg på `KROKER.sim` | Må kunne kjøres uten nettleser på en tjener |
| Spillreglene | Mange er skrevet uten DOM (terreng.js, strid.js, leir.js, folk.js, morgen.js, selskap.js …) og har tester i Node | Kan i stor grad gjenbrukes på tjeneren som de er |
| Lagring | 51 moduler lagrer i nettleseren (localStorage), per leir | Lagring må flyttes til tjeneren for delte verdener |
| Tilfeldighet | 28 moduler bruker `Math.random` | Må få en felles «frø»-tilfeldighet for å kunne spilles likt og sjekkes |
| Tid | 1× er sanntid; 10×, 60×, 600× og ⏭ spoler | Felles tid i en delt verden – spoling kan ikke styres av én spiller |
| Sider | Spilleren er «blå»; Ravnsund (rød) og Mosevakt (grønn) er AI | Hver spiller trenger sin egen side-id; AI kan fylle tomme plasser |
| Kartdata | GitHub-releases via `/api/kart` (Vercel) | Uendret – både nettleseren og tjeneren leser de samme kartfilene |
| 3D | Bare i nettleseren | Uendret – tjeneren regner aldri 3D |
| Venner | «Vennelenke» viser en venns leir i kartet (ingen tjener) | Første lille steg finnes alt |

## 2. Valget av modell

| Modell | Slik virker det | For | Mot |
|---|---|---|---|
| **A. Autoritativ tjener** (valgt) | En tjener kjører verden – foreløpig på spillerens egen PC. Nettleseren sender bare ordre og viser det spilleren får se. | Vanskelig å jukse, verden går mens du er borte (passer «1× er sanntid»), tåka regnes på tjeneren | Simuleringen må skilles ut fra index.html |
| B. Én spiller er vert | Vertens nettleser kjører verden, de andre kobler seg til (WebRTC). | Ingen tjener som går hele tiden | Verden stopper når verten går; lett å jukse for verten; vanskelig nettverk på mobil |
| C. Etter tur / postkasse | Hver spiller spiller alene; handlinger mellom spillere (handel, angrep, kontrakter) går via en enkel database. | Enklest, billigst | Ikke ekte samtidig spill; kamper mellom spillere blir «rapporter» |

**Valgt:** A, med tjeneren på spillerens egen PC. C (postkasse for handel, meldinger og kontrakter) kan komme først som et
mellomsteg; postkassen kan da også ligge på PC-en.

## 3. Faser

### M0 – Grunnmur i koden (ingen tjener ennå)
Dette gjør spillet klart, og er nyttig også for enspiller (testing, lagring, færre feil).

1. **Kommandoer:** alt spilleren gjør (ordre, bygg, kjøp, folk på oppgaver, kontrakter, valg i morgenmøtet) går gjennom én funksjon
   `kommando(side, { type, … })`. Da kan de samme kommandoene sendes over nettet senere.
2. **Verden uten nettleser:** simuleringen i `sim(dt)` og krokene den kaller skilles ut i `spill/simulering.js` (navnet `verden.js` er tatt av «verden som gjør noe»), som kan kjøres i Node
   med kartdataene. Visningen (2D, 3D, paneler) leser bare tilstanden. Gjøres i biter, én modul om gangen, med tester.
   **Første bit gjort (22. nov, R16-B):** marsjsteget for lagene, fiendens patrulje (patruljeMål) og kamprunden ligger nå i
   `spill/simulering.js` (`Simulering.lag({ … })` -> `{ steg, kamprunde }`); index.html har bare tynne innpakninger (`sim`,
   `kamprunde`, `patruljeMål`) og tilbakekall for det som vises. Samme oppførsel som før (testet mot en kopi av den gamle koden i
   `pipeline/fliser/test_simulering.js`, som også kjører et spilldøgn i Node uten nettleser). **Gjenstår:** modulene i `KROKER.sim`
   (AI-en i fraksjoner-visning.js, økonomi, forsyning, garnison, leir, folk, krig …) og `KROKER.ild`/`KROKER.fart`-krokene kjører fortsatt
   i siden; `ordre()` (ruteplan via `lagVindu`) og siktfeltene (`s.sikt`) trenger kartdata som tjeneren må kunne lese; kampens
   tilfeldighet (`KRNG = Terreng.frø(1987)`) bør bli `Tilfeldig.verden` og lagres med spillet.
3. **Ren tilstand:** all tilstand som betyr noe for spillet, kan lagres og leses som JSON (lagring.js gjør mye av dette alt).
4. **Felles tilfeldighet:** `Math.random` byttes med en frø-basert tilfeldighet per verden (`Tilfeldig(frø)`).
5. **Side-id overalt:** ingen regel antar at spilleren er «blå» (selskap.js og strategi.js gjør det alt riktig).
6. **Test:** samme kommandoer på samme frø gir nøyaktig samme verden, i Node (`test_simulering.js`).

### M1 – Spillere møtes uten tjener som går hele tiden (billig mellomsteg)
- Postkassene per selskap ligger i en fil på vertens PC (eller senere hos Cloudflare).
- Handel og meldinger mellom spillere, kontrakter fra én spiller til en annen, og vennenes leirer og rykte i kartet.
- Ingen sanntidskamp ennå. Angrep på en annen spillers leir blir en kamp som regnes ut når den angrepne er innlogget, med rapport.

### M2 – Første delte verden (2 spillere, tjener)
- Tjeneren: et lite Node-program med WebSocket («ws») på vertens PC, kjører `simulering.js` i 1× sanntid (se kapittel 4).
- Nettleseren i «nettmodus»: sender kommandoer, får tilstanden 2–5 ganger i sekundet, bare det spilleren ser (tåka regnes på tjeneren).
- Felles klokke: ingen spoling. ⏭ og 10× blir «foreslå fart», som bare gjelder når alle i verden sier ja (eller tas bort i flerspiller).
- Innlogging: invitasjonslenke med kode (ingen konto i første versjon). Spilleren velger selskap, flagg og leir som i dag.
- Lagring på vertens PC (med sikkerhetskopi), og gjenoppkobling hvis nettet faller ut.

### M3 – 1–5 spillere
- Diplomati: allianse, våpenhvile, krig; handel og kontrakter mellom spillere; chat og radio mellom selskaper.
- AI-selskapene fyller tomme plasser og forsvinner når en spiller tar over.
- «Mens du var borte»: rapport ved innlogging (finnes i enspiller fra runde 13–14).

### M4 – Vedvarende verdener
- Verden «går» døgnet rundt: står PC-en av, regnes tiden fram når den starter igjen. Leiren forsvarer seg selv når du er borte
  (K8 i plan-kollaps.md). Skal verden gå hele tiden uten en PC som står på, flyttes tjeneren til Cloudflare.
- Flere verdener samtidig, egne regler per verden (fart, vanskelighetsgrad), enkel administrasjon.

## 4. Drift: gratis, på din egen PC (valgt 22. nov)

**Slik blir det:** Én spiller er vert. Verten starter et lite tjenerprogram på sin PC (Windows). Programmet kjører verden
(`simulering.js` – foreløpig nettleseren hos verten, se kapittel 0 –, de samme reglene som i spillet) og lagrer den i en fil på PC-en. De andre åpner spillet på riksbrudd.vercel.app som
før og kobler seg til vertens PC med en invitasjonslenke. Kartene hentes som i dag fra kartlageret – PC-en sender bare spillets
tilstand, ikke kart.

**Når PC-en er av eller sover:** verden står stille. Når tjeneren starter igjen, regnes tiden som har gått fram på noen sekunder
(som ⏭ og «mens du var borte» i dag), og alle får en rapport. Slik «går» verden døgnet rundt uten at PC-en må stå på.

**Hvordan vennene når PC-en** (å åpne porter i ruteren er vanskelig og usikkert, så det unngår vi). Begge er gratis:

| Måte | Slik virker det | Hake |
|---|---|---|
| **Cloudflare-tunnel** (anbefalt) | Tjenerprogrammet starter en tunnel og får en https-adresse. Vennene trenger ingenting ekstra – lenken virker også på iPhone. | Uten konto får adressen et tilfeldig navn som skifter hver gang; med en gratis Cloudflare-konto kan den være fast. |
| Tailscale | Et privat nett mellom vennenes maskiner. | Alle må installere appen og bli lagt til. |

**Det tjenerprogrammet må kunne** (bygges i M2):

- Startes med ett dobbeltklikk på Windows (senere som én fil som ikke krever at Node er installert).
- Vise invitasjonslenken og hvem som er koblet til.
- Lagre verden jevnlig, ta sikkerhetskopi, og regne tiden fram ved start.
- Hindre at PC-en sovner mens noen spiller (bare mens tjeneren går).

**Kraft:** en vanlig bærbar holder for 1–5 spillere (Claudes anslag – måles med belastningstesten i M2). Verten spiller selv i
nettleseren på samme PC.

**Senere, også gratis: Cloudflare Durable Objects.** Gratisplanen har hatt Durable Objects siden april 2025 (100 000 forespørsler
per døgn, 5 GB lagring). Da kan verden ligge på nett uten at noen PC står på. Fordi tjeneren skrives som `simulering.js` + et tynt lag
for nettverk og lagring, er flyttingen bare et nytt tynt lag. Hvor mye regning gratisplanen tåler per døgn er ikke bekreftet – det
må måles med en prøve før vi flytter. Andre gratisvalg er vurdert og valgt bort: Render (sovner etter 15 min og mister filene) og
Oracle «Always Free» (krever betalingskort, kvoten ble halvert i 2026).

## 5. Teknisk
- **Vert:** vertens egen PC (kapittel 4). Vercel kan ikke kjøre en tjener som går hele tiden; der ligger fortsatt selve spillet og
  kartlageret.
- **Pris:** 0 kr. Strømmen til PC-en er det eneste.
- **Hemmeligheter:** ingen nøkler i koden. Trengs en Cloudflare-konto for fast adresse, oppretter verten den selv.
- **Nettrafikk:** bare endringer sendes, og bare det spilleren ser. 3D, trær, hus og vær regnes fortsatt i nettleseren.
- **Juks:** tjeneren sjekker hver kommando (har spilleren råd, er laget ditt, har det radiokontakt …).
- **Personvern:** bare spillernavn og invitasjonskode lagres; ingen e-post i første versjon. Vertens IP-adresse vises ikke for de
  andre når tunnelen brukes.
- **Enspiller blir som før:** uten nett kjører verden i nettleseren som i dag.

## 6. Risiko
- **index.html er stor og sammenvevd:** å skille ut simuleringen er hovedjobben i M0. Gjøres i små biter med full kontroll mellom hver.
- **Tjenerens kraft:** veisøk (A*), kartdata og AI for 5 spillere må måles – vi lager en belastningstest i M2.
- **Tid i sanntid:** spillerne er ikke på samtidig. Morgenmøtet, kort og angrep må fungere når du ikke er der (K8).
- **Mobilnett:** gjenoppkobling og lite trafikk er viktig fordi brukeren spiller på telefon.
- **Vertens PC:** står den av, kan ingen spille sammen før den starter. Filen med verden må tas sikkerhetskopi av.
- **Vertens fordel:** verten har tjeneren hos seg og kan i prinsippet jukse. Mellom venner er det greit; for åpne verdener
  flyttes tjeneren til Cloudflare.

## 7. Det brukeren må bestemme
1. Skal M1 (handel og meldinger uten tjener) komme først, eller rett på M2 (delt verden)?
2. Samarbeid først (venner mot AI) eller mot hverandre først?
3. Hvilken vert, og hva kan den koste? **Bestemt 22. nov: gratis, på spillerens egen PC.** Når PC-en er av, regnes tiden fram
   ved neste start.
4. Cloudflare-tunnel (vennene trenger ingenting) eller Tailscale (alle installerer en app)? Claude anbefaler tunnelen.
5. Hvordan skal fart fungere i flerspiller: alltid sanntid, eller fart som alle må si ja til?

## 8. Omfang (grovt)
M0 er størst: anslagsvis 3–5 runder med hjelpere (simuleringen ut av index.html i biter, kommandoer, frø, tester). M1: 1–2 runder.
M2: 2–3 runder, inkludert tjenerprogrammet for Windows. M3 og M4: flere runder hver. W1–W4 (selskap, anlegg, kamp, kjøretøy) kan bygges samtidig,
så lenge alt nytt følger M0-reglene (kommandoer, ren tilstand, side-id, frø).
