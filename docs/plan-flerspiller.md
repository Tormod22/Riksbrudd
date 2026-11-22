# Plan: flerspiller i Riksbrudd (22. nov 2026)

Brukeren: «lag en plan for hvordan vi kan legge til multiplayer». Tidligere besluttet: 1–5 spillere i samme Norge, hver med sitt
eget private militærselskap (plan-kollaps.md §10, plan-wardogs.md). Alt her er Claudes forslag til brukeren har bestemt noe annet.

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
| **A. Autoritativ tjener** (anbefalt) | En tjener kjører verden døgnet rundt. Nettleseren sender bare ordre og viser det spilleren får se. | Vanskelig å jukse, verden går mens du er borte (passer «1× er sanntid»), tåka regnes på tjeneren | Simuleringen må skilles ut fra index.html; tjeneren koster litt hver måned |
| B. Én spiller er vert | Vertens nettleser kjører verden, de andre kobler seg til (WebRTC). | Ingen tjener som går hele tiden | Verden stopper når verten går; lett å jukse for verten; vanskelig nettverk på mobil |
| C. Etter tur / postkasse | Hver spiller spiller alene; handlinger mellom spillere (handel, angrep, kontrakter) går via en enkel database. | Enklest, billigst | Ikke ekte samtidig spill; kamper mellom spillere blir «rapporter» |

**Anbefaling:** A, men bygget slik at C kommer først som et billig mellomsteg (handel, meldinger og kontrakter mellom spillere
over en enkel database), mens grunnmuren for A bygges.

## 3. Faser

### M0 – Grunnmur i koden (ingen tjener ennå)
Dette gjør spillet klart, og er nyttig også for enspiller (testing, lagring, færre feil).

1. **Kommandoer:** alt spilleren gjør (ordre, bygg, kjøp, folk på oppgaver, kontrakter, valg i morgenmøtet) går gjennom én funksjon
   `kommando(side, { type, … })`. Da kan de samme kommandoene sendes over nettet senere.
2. **Verden uten nettleser:** simuleringen i `sim(dt)` og krokene den kaller skilles ut i `spill/verden.js`, som kan kjøres i Node
   med kartdataene. Visningen (2D, 3D, paneler) leser bare tilstanden. Gjøres i biter, én modul om gangen, med tester.
3. **Ren tilstand:** all tilstand som betyr noe for spillet, kan lagres og leses som JSON (lagring.js gjør mye av dette alt).
4. **Felles tilfeldighet:** `Math.random` byttes med en frø-basert tilfeldighet per verden (`Tilfeldig(frø)`).
5. **Side-id overalt:** ingen regel antar at spilleren er «blå» (selskap.js og strategi.js gjør det alt riktig).
6. **Test:** samme kommandoer på samme frø gir nøyaktig samme verden, i Node (`test_verden.js`).

### M1 – Spillere møtes uten tjener som går hele tiden (billig mellomsteg)
- En enkel database (for eksempel en liten nøkkel/verdi-tjeneste) holder «postkasser» per selskap.
- Handel og meldinger mellom spillere, kontrakter fra én spiller til en annen, og vennenes leirer og rykte i kartet.
- Ingen sanntidskamp ennå. Angrep på en annen spillers leir blir en kamp som regnes ut når den angrepne er innlogget, med rapport.

### M2 – Første delte verden (2 spillere, tjener)
- Tjeneren: Node med WebSocket (for eksempel Colyseus eller «ws»), kjører `verden.js` i 1× sanntid.
- Nettleseren i «nettmodus»: sender kommandoer, får tilstanden 2–5 ganger i sekundet, bare det spilleren ser (tåka regnes på tjeneren).
- Felles klokke: ingen spoling. ⏭ og 10× blir «foreslå fart», som bare gjelder når alle i verden sier ja (eller tas bort i flerspiller).
- Innlogging: invitasjonslenke med kode (ingen konto i første versjon). Spilleren velger selskap, flagg og leir som i dag.
- Lagring på tjeneren, og gjenoppkobling hvis nettet faller ut.

### M3 – 1–5 spillere
- Diplomati: allianse, våpenhvile, krig; handel og kontrakter mellom spillere; chat og radio mellom selskaper.
- AI-selskapene fyller tomme plasser og forsvinner når en spiller tar over.
- «Mens du var borte»: rapport ved innlogging (finnes i enspiller fra runde 13–14).

### M4 – Vedvarende verdener
- Verden går døgnet rundt. Leiren forsvarer seg selv når du er borte (K8 i plan-kollaps.md).
- Flere verdener samtidig, egne regler per verden (fart, vanskelighetsgrad), enkel administrasjon.

## 4. Teknisk
- **Vert:** Vercel kan ikke kjøre en tjener som går hele tiden. Alternativer:
    - **Fly.io / Railway / Render / en liten VPS:** vanlig Node-tjener, samme JavaScript som i dag.
    - **Cloudflare Durable Objects:** én «verden» per objekt med WebSocket og lagring innebygd. Passer godt, men har egne begrensninger
      på hvor lenge koden kan regne om gangen – må prøves før den velges.
- **Pris:** en liten tjener koster trolig fra under 100 til noen hundre kroner i måneden (grovt anslag – sjekkes når verten velges).
- **Hemmeligheter:** nøkler og passord legges hos verten, aldri i koden. Brukeren har sagt at han ikke vil gi nøkler – derfor må vi
  velge en løsning der han oppretter kontoen selv og legger inn nøkkelen i vertens innstillinger.
- **Nettrafikk:** bare endringer sendes, og bare det spilleren ser. 3D, trær, hus og vær regnes fortsatt i nettleseren.
- **Juks:** tjeneren sjekker hver kommando (har spilleren råd, er laget ditt, har det radiokontakt …).
- **Personvern:** bare spillernavn og invitasjonskode lagres; ingen e-post i første versjon.
- **Enspiller blir som før:** uten nett kjører verden i nettleseren som i dag.

## 5. Risiko
- **index.html er stor og sammenvevd:** å skille ut simuleringen er hovedjobben i M0. Gjøres i små biter med full kontroll mellom hver.
- **Tjenerens kraft:** veisøk (A*), kartdata og AI for 5 spillere må måles – vi lager en belastningstest i M2.
- **Tid i sanntid:** spillerne er ikke på samtidig. Morgenmøtet, kort og angrep må fungere når du ikke er der (K8).
- **Mobilnett:** gjenoppkobling og lite trafikk er viktig fordi brukeren spiller på telefon.

## 6. Det brukeren må bestemme
1. Skal M1 (handel og meldinger uten tjener) komme først, eller rett på M2 (delt verden)?
2. Samarbeid først (venner mot AI) eller mot hverandre først?
3. Skal verden gå når ingen er innlogget (M4), eller bare når noen spiller?
4. Hvilken vert (Fly.io, Railway, Render, VPS eller Cloudflare), og hvor mye kan den koste i måneden?
5. Hvordan skal fart fungere i flerspiller: alltid sanntid, eller fart som alle må si ja til?

## 7. Omfang (grovt)
M0 er størst: anslagsvis 3–5 runder med hjelpere (simuleringen ut av index.html i biter, kommandoer, frø, tester). M1: 1–2 runder.
M2: 2–3 runder pluss oppsett hos verten. M3 og M4: flere runder hver. W1–W4 (selskap, anlegg, kamp, kjøretøy) kan bygges samtidig,
så lenge alt nytt følger M0-reglene (kommandoer, ren tilstand, side-id, frø).
