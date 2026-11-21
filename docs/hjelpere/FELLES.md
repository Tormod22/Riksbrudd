# Felles regler for hjelpere (også i egne skyøkter)

Du er én av flere hjelpere som arbeider samtidig som bygger hver sin pakke i spillet **Riksbrudd** (nettleserspill på ekte kart over Norge, three.js r128,
ren JavaScript uten byggesteg). Brukeren er ikke utvikler og har bedt om bedre utseende (gågater, parkering, kaier, gressflater, bakkens farge, bygg som ligner virkeligheten) og raskere lasting i 3D, uten spørsmål. Du kan ikke spørre
noen: ta fornuftige valg selv, og skriv dem ned.

## Din arbeidskopi
- Du har din EGEN kopi av prosjektet (git worktree) og din EGEN gren. Mappa, grenen og porten står i oppdraget ditt.
  Arbeid BARE der. Ikke rør /home/user/rb-vind eller de andre natt-mappene. Ikke push til main. Ikke publiser.
- Commit ofte i din gren (`git add -A && git commit -m "…"`), og `git push -u origin <grenen din>` når du er ferdig.
  Commit-meldinger på norsk, og avslutt dem med disse to linjene:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01DFfCiZiYJYrqa7M5C9eD2f`
- **Frist: kl. 23:00 UTC 21. nov (sjekk med `date -u`).** Commit og push etter hvert punkt som virker, så jeg kan flette underveis. Da skal alt være committet og pushet, og du skal ha levert rapporten.

## Slik er spillet bygget (les dette først, ikke hele CLAUDE.md)
- `CLAUDE.md` i roten er en lang logg over alt som finnes (over 1200 linjer). Les BARE avsnittene som gjelder pakka di:
  søk med Grep etter stikkordene i oppdraget. `docs/gjennomgang-2026-11-18.md` beskriver spillet kort.
- Spillet: `site/dovre-fliser/index.html` (hovedskriptet, ca. 3000 linjer med lange linjer) + moduler i `site/dovre-fliser/spill/`.
  Mønsteret er alltid: **regler uten DOM** i `spill/navn.js` (virker i Node: `module.exports` ellers `globalThis.Navn`) med test
  `pipeline/fliser/test_navn.js`, og **visning** i `spill/navn-visning.js` (eller nederst i samme fil).
- Globale ting i index.html er `let`/`const` (ikke `window.x`): `ENHETER` (lagene; `s.side` blå/rød/grønn, `s.menn[]` med `hp`,
  `s.x`, `s.y`, `s.sti`), `KJORETOY`, `INFRA` (tettsteder `INFRA.tettsted`, bruer, kraftverk …), `TETTSTEDER` (eierskap),
  `kam` (2D-kamera: x, y, m = meter per punkt), `tid` (spillminutter), `tempo`, `valgt`, `skitten = true` (tegn kartet på nytt),
  `R3` (3D-tilstanden; bruk `typeof R3 !== 'undefined'`), `på3d`. Funksjoner: `logg(tekst)`, `ordre(lag, X, Y, stille)`,
  `synlig(e)`, `ser(lag, x, y)`, `levende(lag)`, `hoydeVed(x, y)`, `nyttLag(navn, x, y, side)`, `visPanel()`, `knapp(tekst, på, fn)`,
  `sidefarge(side, 'farge'|'lys')`, `lagVindu(...)`, `slå3d(bool)`.
- **Kroker** (legg funksjoner inn i lista): `KROKER.sim` (dt i spillminutter), `KROKER.tegn(g, vx0, vy1)` (2D oppå kartet; skjerm-x =
  (X − vx0) / kam.m, skjerm-y = (vy1 − Y) / kam.m), `KROKER.trykk(X, Y)` (svar true når trykket er brukt), `KROKER.ild(a, b)` (faktor på
  treff når a skyter på b), `KROKER.sikt(lag)`, `KROKER.ser(e)`, `KROKER.tåke`, `KROKER.lagKnapper(lag, H)`, `KROKER.lagTekst(lag)`,
  `KROKER.kanOrdre(lag)`, `KROKER.bygg3d(u)` (async, når et 3D-utsnitt bygges), `KROKER.sett3d(u, R3)`, `KROKER.ramme3d(R3)` (hver ramme),
  `KROKER.tegn3d(g, proj, mPer)`. Leir-menyen: `window.LEIR_MENY.push((hode, { el, knapp }) => …)` med `el('h3', { 'data-fane':
  'bygg'|'lager'|'mål' }, 'Overskrift')` først. Kommandolinja nederst på PC: `window.KOMMANDO_TILLEGG.push({ k, navn, tast, ikon, fins,
  på, trykk, tittel })` (må skje før spillhud.js lastes).
- Viktige API-er: `OppstartSpill.tilstand()` ({ leir: {x, y}, penger }), `OppstartSpill.betal(kr)` / `.gi(kr)`, `LeirSpill.tilstand()`
  (bygg, lager, drivstoff), `Leir.*` (regler), `FolkSpill.tilstand()` ({ personer, mat, moral }), `FolkRegler.*`, `Garnison.tilstand(
  TETTSTEDER, id).eier`, `StridSpill`, `TropperSpill`, `KaierSpill.data()` + `Kaier.nær(...)`, `StrategiSpill`, `SpilletSpill`
  (angrep, marked, oppdrag, hendelser), `VAER` (vær, årstid), `Gange` (gå selv), `KarakterSpill`, `UtstyrSpill`.
  Finn resten med Grep (`window\.[A-Z]\w+ = `).

## Regler du MÅ følge
1. **Norsk** i kode, kommentarer og all tekst i spillet. Enkel, tydelig tekst til spilleren.
2. **Alle tall du finner på, er «Claudes forslag»** – skriv det i kommentaren over tallene, og samle dem i ett REGLER-objekt.
3. **I testene skjer ingenting av seg selv.** Ting som starter av seg selv (hendelser, sykdom, angrep, vær som skader …) skal bare
   skje når `!navigator.webdriver || NavnSpill.test === true`. Kontrollskriptet kjører med webdriver, og det må oppføre seg som før.
4. **Ikke ødelegg det som finnes.** Standardoppførselen for et lagret spill skal være som før hvis ikke oppdraget ditt sier noe annet.
   Nye ting lagres i egne nøkler `riksbrudd-<navn>` i localStorage, per leir (lagre `leir: x,y` og les bare når den stemmer – se
   `spill/karakter.js` linje 42–52 for mønsteret).
5. **Eierskap.** Du eier filene oppdraget ditt nevner. Andre hjelpere endrer andre filer samtidig. Legg heller ny oppførsel i NYE
   filer via krokene enn å endre en fil du ikke eier. Må du endre en felles fil (index.html, leir.js, folk.js …), gjør endringen
   liten og samlet, og skriv i rapporten nøyaktig hva du endret der.
6. **Disse fellesfilene skal du IKKE endre** (jeg samler dem til slutt): `CLAUDE.md`, `spill/hjelp.js`, `spill/meny.js`,
   `pipeline/fliser/sjekk.js`, `site/vercel.json`. I stedet:
   - Notater: skriv `docs/natt/<pakke>.md` (hva du laget, filer, API-er, tall, hva som IKKE er gjort).
   - Hjelpetekst: skriv `docs/natt/<pakke>-hjelp.json` = `[["Tittel", "Tekst til spilleren", "Gruppe"]]`
     (grupper: «Kom i gang», «Leiren», «Lag og strid», «I 3D», «Vær, lyd og bilde»).
   - Vakt: skriv `pipeline/fliser/vakter/<pakke>.js` = `module.exports = { navn: '…', kjør: async (pg, profil) => ({ ok, tekst, data }) }`.
     `pg` er en Playwright-side med spillet startet (Dovre-testsiden, leir satt opp, AI av, 3D kan være på eller av). Vakten skal
     prøve det viktigste i pakka di inne i `pg.evaluate`, sette ALT tilbake (penger, lag, tid, 3D av/på som det var), tåle PC og mobil,
     og ikke ta mer enn ca. 20 sekunder. Prøv vakten selv (se under).
7. **Skript-taggen din:** legg modulene dine inn i `index.html` på det stedet oppdraget ditt sier (akkurat der, så vi ikke kolliderer),
   med `?v=0` – kjør så `python3 pipeline/fliser/versjon.py` (setter versjonsmerkene).
8. **☰-menyen:** IKKE legg en knapp rett i `#lagmeny` fra et skript som lastes etter `meny.js` (siden henger). Bruk Leir-menyen,
   kommandolinja eller et eget panel.
9. **Paneler som tegnes jevnlig:** bygg ved siden av, bytt bare inn når `innerHTML` er endret, og ikke mens `pekerNede(panelet)`.
10. **3D:** aldri legg et nytt lys i scenen for småting (det gir nye skyggeprogrammer for alt). Bruk `InstancedMesh` for mange like
    ting. GLSL tåler bare ASCII (ingen æøå i navn). `THREE` finnes først når 3D er åpnet. Frigjør geometrier/teksturer du lager.
    Ting du legger på utsnittet `u` må lages utenfor kroken eller være små (ellers holder de på store bilder).
11. Ingen skript fra CDN-er, ingen nye biblioteker, ingen nøkler eller hemmeligheter. Ikke send navn/prosjekt til tjenester utenfor.
12. Kommentarer på egen linje over koden (ikke midt i en lang linje), og ikke kommentarer som ser ut som kode.

## Slik prøver du
- Regeltester: `node pipeline/fliser/test_<navn>.js` (skriv en for hver regelfil). Kjør også de testene som gjelder filer du endret.
- Syntaks: `node --check <fil>`.
- I nettleser (Chromium og Playwright er installert; `require('playwright')` virker fra alle mapper). Mal for et prøveskript –
  lagre i `<scratchpad>/natt/<pakke>/` (scratchpad = <scratchpad>):

```js
const { spawn } = require('child_process'); const { chromium } = require('playwright');
const R = '<DIN MAPPE>', PORT = <DIN PORT>;
const srv = spawn('python3', [R + '/pipeline/fliser/server.py', R + '/site'], { stdio: 'ignore', env: { ...process.env, PORT: String(PORT) } });
(async () => { await new Promise(r => setTimeout(r, 900));
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }), pg = await b.newPage({ viewport: { width: 1400, height: 820 } });
  const feil = []; pg.on('pageerror', e => feil.push(e.message)); pg.on('dialog', d => d.dismiss());
  await pg.goto(`http://localhost:${PORT}/dovre-fliser/`, { timeout: 90000, waitUntil: 'domcontentloaded' }); await pg.waitForTimeout(5000);
  await pg.evaluate(async () => { if (window.AI) AI.på = false; for (const k of Object.keys(localStorage)) if (/^riksbrudd/.test(k)) localStorage.removeItem(k);
    OppstartSpill.nytt(); const u = OppstartSpill.utkast(); u.karakter.navn = 'Kari'; u.fraksjon.navn = 'Har'; OppstartSpill.vis(3);
    [...document.querySelectorAll('#oppstart button')].find(b => /kartet/.test(b.textContent)).click(); await OppstartSpill.prøvLeir(196400, 6898900); OppstartSpill.bekreft(); });
  await pg.waitForTimeout(3000); await pg.evaluate(() => { if (window.Hjelp) Hjelp.vis(false); });
  // … prøv tingen din her med pg.evaluate, ta bilde med pg.screenshot({ path }) og SE på bildet (Read-verktøyet) …
  console.log('sidefeil', JSON.stringify(feil)); await b.close(); srv.kill(); })().catch(e => { console.error(e.message); srv.kill(); process.exit(1); });
```
  Hele siden henger ved lasting (tidsavbrudd i `goto`) = en evig løkke i et skript, ofte en MutationObserver som trigger seg selv.
  3D på testsiden: `await pg.evaluate(() => slå3d(true)); await pg.waitForFunction(() => R3 && R3.ut && !R3.bygger, null, { timeout: 180000 })`.
  3D går svært tregt her (programvare-grafikk, flere sekunder per bilde) – det er normalt. Vi er sju som deler fire prosessorkjerner:
  **bare én nettleser om gangen, og lukk den straks.** Ikke kjør hele `sjekk.js` (det gjør jeg til slutt).
  Dovre-testsiden har bare ett tettsted (Dombås), ingen kyst og ingen hus-data. Trenger du kyst/byer: bruk i stedet
  `pipeline/fliser/dev.py` som server (samme argumenter) og adressen `/rogaland` – den henter ekte kartdata
  fra den publiserte siden (tregere; vent på `typeof KLAR_FERDIG !== 'undefined' && LAGFILER`). Leir i Ryfylke: 15607, 6622779.
- Prøv vakten din slik: i prøveskriptet, etter oppstarten: `const V = require(R + '/pipeline/fliser/vakter/<pakke>.js'); console.log(await V.kjør(pg, 'PC'));`

## Rapporten din (det siste du skriver)
Kort og ærlig, på norsk: (1) hva som er laget og virker – per punkt i oppdraget, (2) hva som bare er delvis, (3) hva som ikke er
gjort, (4) hvilke fellesfiler du endret og hvor, (5) hva du prøvde i nettleser og hva du så, (6) grenen og siste commit.
Ikke si at noe virker hvis du ikke har prøvd det.


## I en egen skyøkt
- Du har din egen maskin. Klon grenen du får oppgitt, arbeid i den, og push til grenen du får oppgitt (aldri main).
- `<scratchpad>` betyr din egen midlertidige mappe (for eksempel /tmp/arbeid). Bilder og prøveskript legges der, ikke i repoet.
- Ekte kartdata: `PORT=8790 python3 pipeline/fliser/dev.py site` og så /rogaland eller /norge i Playwright.
- Kjør regeltestene, vakta di og `SJEKK_PROFIL=mobil node pipeline/fliser/sjekk.js` til slutt (du har maskinen for deg selv).
- Den siste meldingen din er rapporten (norsk, kort og ærlig – se over). Den leses av koordinatoren.
