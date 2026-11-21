# Pakke «anlegg» – grunnmuren for anleggsarbeid

## Runde 15 (21. nov kveld)

Brukeren: «Jeg ønsker å lage systemer der spilleren kan bygge tunneler i framtiden, samt bunkere og skyttergraver, og bygge egne
kaier. Det skal også være båter i spillet.»

### Filer
- `site/dovre-fliser/spill/anleggsarbeid.js` – regler uten DOM (`window.Anlegg`, Node: `require`). Test: `node pipeline/fliser/test_anleggsarbeid.js`.
- `site/dovre-fliser/spill/anleggsarbeid-visning.js` – meny, plassering, arbeid, vern, tunnel i ruta, egne kaier, 2D og 3D (`window.AnleggSpill`).
- `pipeline/fliser/vakter/anlegg.js` – vakta.
- `docs/natt/anlegg-hjelp.json` – hjelpetekstene.

### Endret i filer jeg ikke eier
- `site/dovre-fliser/index.html`: to skript-tagger rett etter `sjo-visning.js` (anleggsarbeid.js og anleggsarbeid-visning.js), versjonsmerker via `versjon.py`.
- `site/dovre-fliser/spill/portal3d.js`: én linje – `window.Portal3d` har nå også `mal` (portalens deler for en bredde), så egne tunneler bruker samme modell.
- Ingen endring i `leir.js`, `leir-visning.js`, `sjo.js`, `sjo-visning.js`, `kaier.js` eller `kyst3d.js`. Byggemenyen utvides med `LEIR_MENY`, og kaiene kobles inn ved å pakke inn `KaierSpill.data`, `Kaier.nær` og `Kaier.iBoks` fra min fil (se under).

### Tabellen (nye anlegg legges til her)
`Anlegg.ANLEGG[id] = { navn, form ('linje' | 'punkt' | 'topunkt'), krav ('tørt' | 'strand' | 'fjellside'), inngrep ({ type: 'grav' | 'grop' | 'bore', … } eller null), vern (treff ganges med dette), kapasitet, pris(L, nivå), tid(L, nivå) i persontimer, mat(L, nivå), modell, tekst }`.
Visningen trenger da bare en 2D-tegning og en 3D-modell (funksjon i `lagModeller`). Alle tall er Claudes forslag (REGLER og ANLEGG):

| Anlegg | Form | Krav | Inngrep | Vern | Plass | Pris | Tid (persontimer) | Materialer |
|---|---|---|---|---|---|---|---|---|
| Skyttergrav | linje 4–250 m | tørt land | grav 1,5 m dyp, 1,2 m bred | ×0,4 | 1 lag per 20 m | 15 000 + 2 500 kr/m | 4 per m | tre L/8 m³ |
| Bunker | punkt (7 × 5,5 m) | tørt land | grop 1,3 m (+3 m inngang bak) | ×0,15 | 1 lag | 3 mill. | 600 | 40 m³ betong, 8 t stål |
| Kai | punkt, nivå 1/2 | strand (vann innen 40 m) | ingen | – | 2/4 båter | 2 / 6 mill. | 350 / 900 | betong, stål, tre |
| Tunnel | to punkter 60–3000 m | bratt fjellside | «bore» (ikke brukt ennå) | – | – | 5 mill. + 40 000 kr/m | 400 + 20 per m | betong, stål |

Arbeidskraft: folk på «bygg» teller 1 (de arbeider på det første uferdige anlegget), hver levende mann i et ingeniørlag innen 400 m teller 3.
Prisen betales når du bekrefter; materialer som mangler på lageret, kjøpes til `Leir.MATERIALER`-prisen.

### Felles motor for terrenginngrep (grunnmuren)
- `Anlegg.inngrep(a)` gir formene (`linje` med halv bredde, `rekt` med retning) og dybden ganget med framdriften – en halvferdig grav er halvt så dyp.
- 2D-reglene: `hoydeVed` pakkes inn (`window.hoydeVed`) og legger til `Anlegg.endringVed(INNGREP, x, y)` – full dybde inne, skråning 1,5 m ut. Alle som spør `hoydeVed` (leiren, gange, sikt …) ser graven.
- 3D: bygg3d-kroken tar prøver av bakken FØR inngrepet (`u.anleggZ`, små tall), lager krav med `Anlegg.terrengKrav` og senker høydegitteret `u.H` med `Veg.skjærG` – den samme motoren som vegene i liv3d.js bruker: bakken senkes bare (aldri heves), punktene senkes høyst til kravet, og både gitteret og terrengnettet slik det tegnes (nettVekter, kopiert fra liv3d.js) må ligge under bunnen. `u.nett = null` etterpå. Trær, steiner, busker, biler og flagg ryddes rundt anleggene, og bakken males (jord rundt grav/bunker, grus foran portalene).
- Et anlegg som blir ferdig, bygger 3D-utsnittet på nytt (`nytt3dUtsnitt`), ellers lages bare modellene på nytt.
- Lagres per leir i `riksbrudd-anlegg` (`{ leir: 'x,y', liste }`).
- Målt i 3D ved Dombås: graven 1,62 m under bakken før inngrepet (mål 1,5), bunkeren 1,39 m (mål 1,3) – litt dypere fordi terrengnettet er grovere enn gitteret.

### Skyttergrav, bunker, kai, tunnel
- **Skyttergrav**: bunn av planker, kledde vegger, jordvoll ut på begge sider og sandsekker i to lag langs kantene (ett nett). Du går ned i den i gåmodus (bakken er senket). Under bygging: oransje staker.
- **Bunker**: betong, gulv 1,3 m under bakken, skyteskår 2,4 × 0,3 m forover, døråpning med åpen ståldør og trinn bak, tak med jord oppå, jordvoll rundt, inni benk, bord, ammunisjonskasser, hyller og en lampe. Vender bort fra leiren (Roter).
- **Kai**: betongblokk ned i sjøen, lyst dekke, kaikant med gul stripe, fendere, pullerter, lyktestolper og leider. Kaia er med i kaidataene: `KaierSpill.data()` gir en sammenslått kopi (kolonnene med egne kaier lagt til ETTER de fra OSM, så indeksene til de gamle står), og `Kaier.nær`/`Kaier.iBoks` søker også i de egne. Båtene i sjo.js legger derfor til der som ved en havn, og kaia innen 3 km er leirens kai. Liten kai (30 m) = småbåt og sjark; middels (60 m, oppgradering i panelet) = også lekter.
- **Tunnel**: to portaler (`Portal3d.mal(9)`). `ordre()` pakkes inn: for egne lag regnes marsjen over fjellet (luftlinje + 8 m per høydemeter opp, 3 m per høydemeter ned, 32 m-høydene) mot veien gjennom tunnelen; er tunnelen under 0,9 av den, går laget til portalen, reiser gjennom (1,3 m/s til fots, 8 m/s med kjøretøy) og fortsetter til målet. Knappene «Gjennom tunnelen» (lag) og «Kjør gjennom tunnelen» (kjøretøy, KJ_PANEL) ved en portal.

### Prøvd i nettleser (Dovre-testsiden, leir 196400, 6898900)
- Skyttergrav med hele flyten (meny-API, to trykk, sjekk mot kartet, betaling 236 000 kr for 40 m), ferdig: −1,5 m i reglene, lag i graven ×0,4 i KROKER.ild.
- Kai i strandkanten ved 196688, 6901438 (funnet med et søk i 32 m-klassene), retning mot vannet; kaidataene får «Egen kai», Kaier.nær finner den, SjoSpill.leirHarKai() = true.
- Tunnel 195450, 6898921 – 195450, 6899171 godkjent (34 m fjell over), laget går inn og kommer ut på den andre siden og går videre.
- 3D: modellene i scenen, gitteret senket. Bilder i scratchpad `natt15/anlegg/`.

### Sammenlignet med virkeligheten
Ekte bilder ble ikke lastet ned (tiden gikk til systemet). Det jeg bygget etter: skyttergraver fra 1940-tallet (f.eks. de restaurerte løpegravene ved
norske kystfort) har plankekledde eller steinsatte vegger, 1,5–2 m dybde og jordvoll/sandsekker på brystvernet – det har modellen. Ekte graver går i
sikksakk (traverser) så en granat bare rammer ett stykke – her går graven der du trykker, så spilleren kan lage traversene selv. Tyske bunkere i Norge
(Atlanterhavsvollen) er kraftigere (1,5–2 m betong) og ofte helt overdekket; denne er en lett feltbunker. Kaiene i norske tettsteder er betongkaier
med fendere og pullerter, som her.

### Gjenstår (ærlig)
- Ingen kollisjon med bunkerveggene når du går (du går gjennom veggene; gulvet er riktig). Veggene kan legges i `R3.hindre` som byggesettet gjør.
- Tunnelen er bare en lenke: ingen graving i fjellet i 3D, kjøretøy får den ikke i vegnettet (bare knappen), og fiendens AI bruker den ikke. `inngrep.type = 'bore'` er reservert for ekte graving senere.
- Lag i tunnelen (`s.iTunnel`) og «på vei til tunnelen» lagres ikke ved omlasting (laget står ved portalen).
- Folkene på «bygg» deles ikke med leirens byggejobber (begge regner med dem) og reiser ikke til anlegget.
- Fjernes en egen kai mens en båt ligger ved en senere egen kai, flytter indeksen (bare egne kaier).
- 2D: graven i kartflisene er ikke senket (bare det spillet spør `hoydeVed` om); høydekurvene er som før.
- Fienden skyter ikke på/ødelegger anleggene ennå (ingen hp).
