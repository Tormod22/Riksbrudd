# ut9-maskiner – industrimaskiner, produksjonslinjer, symboler og liv (28. nov)

Brukeren: «flere forskjellige maskiner til industri … et system som kan ha forskjellige industrimaskiner til forskjellige industribygg,
om du kan lese hva slags industri et bygg hører til (tømmer, olje, gass, bergarter, fiskeindustri osv.) for å ha korrekt innredning».
Systemet for industritypen finnes fra ut8-industri (`docs/natt/ut8-industri.md`). Denne pakka gjør maskinene ordentlige og mange.

Grenen `claude/ut9-maskiner` (fra `claude/nattfiks`). Alle tall og regler er **Claudes forslag**.

## Filer
- **`spill/maskiner.js`** (ny, regler uten DOM, `window.Maskiner`, lastes rett FØR `industri.js`):
  - `MASKINER[type] = [bredde, dybde, høyde, sperrer, navn]` – 30 nye maskiner (og ny høyde på tappelinja).
  - `MODELLER[type] = (m, k, b, d, h)` – 3D-modellene av 66 maskiner, laget av felles byggeklosser: stående sylinder `S`, liggende
    sylinder langs x/y `LX`/`LY` (åttekant av tre kasser), `bein`, `rekkX` (rekkverk), `stige`, `ring` (flens), `motor`, `panel`
    (skjerm). Samme `k(x0, x1, y0, y1, z0, z1, farge, stoff, rund)` som interior3d.js – alt havner i byggets ene nett (ingen nye
    materialer, ingen lys). 60–900 trekanter per maskin (snitt ca. 300). Erstatter kassemodellene i `Industri.MODELLER`.
  - `LINJER[rolle]` – produksjonslinja per hall, `EKSTRA[rolle]` – det som står langs veggene i tillegg, `OPPSKRIFT` = begge.
  - `LAGERHALL` – rullebane og truck i lagerhallene. `SYMBOL[type]` – 2D-symbolet. `LIV[type]` – delene som beveger seg.
- **`spill/maskiner-visning.js`** (ny, `window.MaskinerSpill`, lastes rett etter `industri-visning.js`): 2D-symbolene og maskinlivet i 3D.
- **`pipeline/fliser/test_maskiner.js`** (ny): regeltesten. **`pipeline/fliser/vakter/ut9-maskiner.js`** (ny): vakta.

## Maskinene per bransje (linja i rekkefølge, `?` = bare i noen bygg, `a | b` = én av dem, fast per bygg)
| bransje | linja (råvare inn -> ferdigvare) | i tillegg |
|---|---|---|
| 1 tømmer | tømmerstabel, tømmerbord med kjeder, barkemaskin, sagbenk, rammesag \| båndsag for tømmer, kantverk, transportbånd, ?flishogger, plankestabel, ?tørkekammer | plankestabler, arbeidsbenk |
| 2 trevare | plankestabel, høvelmaskin, bordsag \| båndsag, ?CNC-fres, limpresse, lakkbås | høvelbenker |
| 3 olje | pumpestasjon, varmeveksler, destillasjonskolonne, rørbro, ?varmeveksler, tank | rørgater, pumper, ventiltavler, tanker, kontrollpult |
| 4 gass | separator, kompressor, ?kompressor, gasstank (liggende), ?fakkel | gassflasker i stativ, ventiltavler, rørgater |
| 5 stein | grushaug, kjeftknuser, transportbånd, kjegleknuser, sikt, transportbånd, pukkhaug | hjullaster, grushauger |
| 6 fisk | fiskekar, sløyelinje, filetmaskin, transportbånd, platefryser, ?iskvern | sløyebenker, kar med is, frysetunnel, pakkebord |
| 7 mat | melketank \| kjøttkroker på skinne, pasteur \| deigelter, transportbånd, pakkemaskin | kokekar, benker i rustfritt stål |
| 8 metall | stålplater, platesaks, kantpresse, dreiebenk \| fresemaskin, sveisebord | traverskran, dreiebenker, sveisebås, esse og ambolt |
| 9 verft | stålplater, platevalse, slipp med båtskrog | traverskran, sveisebås |
| 10 kraft | turbin, generator, ?turbin, transformator | traverskran, kontrollpult, tavlepaneler |
| 11 lager | (reolene som før) | rullebane, gaffeltruck |
| 12 gjenvinning | skraphaug, sorteringsbånd (på plattform, med sjakter og containere), ballepresse | containere |
| 13 bryggeri | bryggekjele, gjæringstank ×2–3, tappelinje, pall | fat |
| 14 kjemi | blandetank, reaktor, rørstativ, ?reaktor, sprøytestøpemaskin | kjemikalieskap, nøddusj og øyeskyll |

## Plasseringen: «linje» i interior.js
`linje(r, liste, o)` i `møblerG` (interior.js) – nytt steg `['linje', liste, antall, valg]` i oppskriftene:
- Langs rommets lange akse, fra enden nærmest **vareinngangen** (ellers hoveddøra) mot den andre enden: råvaren først, ferdigvaren sist.
- Linja står i et felt en firedel av bredden ut fra midten (høyst 5 m), på motsatt side av døra når døra er på langveggen (gangveien fra
  døra til midten er fri). Får den ikke plass, snur den i feltet på den andre siden (U-form).
- Lange ting (båten på slippen) står med lengden langs linja. Maskiner høyere enn rommet hoppes over.
- `prøv()` holder store maskiner unna gangveiene og 2,1 m fra døråpningene (`fri`), så `friInngang` (etasjer3d.js) aldri må ta en maskin.
- Variasjon (fast per bygg via `tilf`): hvilken side linja står på når døra er i enden, `?type` og `[a, b]`.
- Lagerhallen (egen kode) får `MØBELSETT.lagerhall_ekstra` (rullebane og truck) etter reolene.

## 2D: symbolene (maskiner-visning.js)
`window.PLAN2D_MØBEL` – plantegning-visning.js kaller hver funksjon for hvert møbel den tegner. Symbolene (i maskinens akser, bare når
møbelet er minst 5 punkter): sagblad med tenner, bånd med ruller og pil i flytretningen, tank (to sirkler), liggende sylinder, knuser-trakt,
haug (høydekurver), kar med bølger, kroker på skinne, reol (striper), skap med panel, pult, vifte, flamme, båtskrog, valser, hjul, kryss.

## 3D: maskinlivet (maskiner-visning.js)
Maskinene **du driver selv** – `ProduksjonSpill.status()[id].går` – får de bevegelige delene i `Maskiner.LIV`:
- sagbenken i fabrikken (bs_sagbenk_1): sagblad med tenner som roterer (38 rad/s) og stikker ca. 0,6 m opp av bordet foran
  motorhuset; gulvet hentes fra byggesettets grunnhøyde (`ByggesettRegler.høyder`, samme som huset tegnes med),
- vedkløyveren: stempel/kløyvekile opp og ned,
- fyrkjelen, smia og raffineriet: røyk (`Effekter3d.røyk`, samme punktsky som kamp og brann; hvert 0,7 s),
- fiskemottaket og båndene: knaster som går langs båndet.
Står maskinen (eller spillet er i pause), står delene. Tre instansnett (blad, stempel, knast), høyst 24 maskiner, ingen nye lys; lages
første gang det trengs og byttes når scenen er ny. Industribyggene i kartet (som ingen driver) står stille.
OBS: sagbruket som eget bygg har modellen «verksted» (lukket hus) – det får ingen deler (bladet ville stått inne og ikke synes).
Prøvd med bilde (scratchpad `natt/ut9-maskiner/sag-pc.png` og `sag2-pc.png`): en sagbenk bygd i en blikkhall med byggesettet, status «går»
satt for prøven – bladet står i bordet og tennene har dreid seg mellom to bilder.

## Fellesfiler endret (små, samlet)
- `index.html`: skript-taggene `maskiner.js` (rett før `industri.js`) og `maskiner-visning.js` (rett etter `industri-visning.js`).
- `spill/interior.js`: steget `linje` i `oppskrift()` + funksjonen `linje()` (ca. 25 linjer, rett over «MØBELSETT-motoren»), og to linjer i
  `case 'lagerhall'` (MØBELSETT.lagerhall_ekstra).
- `spill/industri.js`: henter Maskiner (MASKINER, OPPSKRIFT, MODELLER slås sammen), `innredning()` forstår `linje`, `koble()` legger inn
  `lagerhall_ekstra`.
- `spill/plantegning-visning.js`: to linjer etter at et møbel er tegnet (PLAN2D_MØBEL).

## Prøvd
- `test_maskiner.js` (ny): 140 haller (14 bransjer × 5 former × 2 dører): alle bransjer har linje (≥ 2 maskiner), ingen maskin i yttervegg,
  ingen i døråpning (også etter friInngang), gangveiene frie (flomfylling fra hver dør til midten av hvert rom og fram til hver maskin),
  linja går fra porten og innover, samme bygg = samme linje, ulike bygg = ulike linjer, sagbruket i rett rekkefølge, alle modeller gyldige og
  under 900 trekanter, alle hallmaskiner har symbol. Selvtester: en kasse som går feil vei, en vegg tvers over hallen.
  Testen fant med en gang fem modeller med kasser som gikk feil vei, fire tunge modeller og to maskiner i døråpninger – rettet.
- `test_industri.js`, `test_interior.js`, `test_interior_biter.js`, `test_plantegning.js`, `test_bygning.js`, `test_kommando.js`,
  `test_produksjon.js`, `test_fabrikk.js` – ok.
- Nettleser (Dovre-testsiden): vakta `ut9-maskiner` ok i 2D på PC og mobil (linjer i 13 bransjer, selvtest, kildene følger «går», 44–55
  symboler tegnet) og i 3D på PC (steinhallen: grushaug → knuser → transportbånd → kjegleknuser, 9322 trekanter for hele hallen; sagbladet
  roterer, knastene går, bladet er borte når maskinen står). Vaktene `ut8-industri`, `inne`, `ut5-fabrikk`, `ut2-sagbruk` ok på PC og mobil
  og i 3D (ut8-industri feilet én gang på PC i 2D på «omgivelsene ved leiren mangler høyde» – det samme skjer på `claude/nattfiks` uten
  denne pakka; på mobil og i 3D var den ok). ut8-vakta godtar nå «sløyelinje» i linja i plantegningen (der sto «sløyebenk» før).
- Feil med vilje: fiskehallen uten linje og sagbladet uten fart -> vakta feilet på begge («bransjer uten produksjonslinje: 6»,
  «sagbladet/båndet går ikke»). Testen fant også at maskinene vendte mot midten i stedet for i flytretningen (rettet, egen test).
- Bilder (scratchpad `natt/ut9-maskiner/`): inne i sagbruket, knuserhallen, fiskehallen og oljehallen (PC 1400), metallverkstedet og
  bryggeriet (mobil 390), plantegningene med symbolene (PC og mobil). Ca. 9 600–10 500 trekanter for interiøret i en hall på 680 m².

## Ikke gjort
- Punkt 5 (nye maskiner du kan bygge i egen fabrikk – barkemaskin, filetmaskin, ballepresse) er IKKE laget: det krever nye varer og nye
  bygg i leir.js/byggesett.js/ikoner.js (fellesfiler) og balansering av økonomien. `Maskiner.LIV` og modellene er klare for dem.
- Industribyggene i kartet kan ikke tas over som fabrikk, så «maskinene går» gjelder bare leirens egne maskiner.
- Ingen lyd fra maskinene. Ingen kollisjon med deler av maskinene utover fotavtrykket (som før).
