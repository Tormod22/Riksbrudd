# Pakke «lut» – lut i husene og inventar i Zomboid-sjangeren

## Runde 4 (18. nov kveld)

Brukeren: «Legg også til at en kan finne lut inni hus, for eksempel brunost, andre matgreier, saft, rifle, ammunisjon og så
videre.» Utvidet: «Jeg ønsker liksom inventar systemet til project zomboid» – mekanikken i sjangeren (beholdere, to sider, vekt,
utstyrt, handlinger, ferskhet), ikke spillets utseende, navn eller tekster. Alle tall er Claudes forslag.

### Filer
- `site/dovre-fliser/spill/lut.js` – reglene uten DOM (`Lut`), test `pipeline/fliser/test_lut.js` (45 sjekker).
- `site/dovre-fliser/spill/lut-visning.js` – visningen (`window.LutSpill`), lastes rett etter `leting-visning.js`.
- `pipeline/fliser/vakter/lut.js` – vakten «lut og beholdere».
- `docs/natt/lut-hjelp.json` – fire hjelpeemner (gruppe «I 3D»).

### Reglene (`Lut`)
- `REGLER`: lommer 5 kg, bæreevne 22 kg (+ styrken fra overlev.js), svært tungt ved 1,5 × bæreevnen, fart 0,7–1 når tungt og 0,55
  svært tungt, løpetid ned til 0,5, våpen opp til 2 × bæreevnen, rekkevidde 1,6 m til møbelkanten, gulvhauger innen 2 m, kjøleskap
  med strøm eldes 4 × saktere, gammel mat ×0,7 sult / ×0,8 tørst, råtten ×0,3 og −12 helse, ransaket bygg: hver ting 30 %,
  3000 endrede beholdere huskes, alle starter med tursekk på ryggen.
- `GJENSTANDER` (id → navn, enhet, vekt, kat, spis, fersk, rasjoner, våpen, sekk, helse, funn-vekter w/n/b/k, tekst):
  mat (brunost, knekkebrød, fiskeboller, lapskaus, pølser på boks, makrell i tomat, havregryn, tørrfisk, melkesjokolade, feltrasjon),
  fersk (melk, grovbrød, egg, epler, wienerpølser, gulost, leverpostei), drikke (saft solbær/bringebær, flaskevann, brus, kaffe – kaffe
  gir søvn +22), våpen (`v_jaktrifle`, `v_hagle`, `v_pistol`, `v_gevær` = HV-geværet), ammo (a762, ahagl, a9, a556 – typene fra
  utstyr.js), medisin (førstehjelp = `forbinding`, smertestillende +15 helse), utstyr (lommelykt, batterier, tau, verktøykasse, sovepose,
  feltflaske), sekker (handlenett 7 kg/0 %, skolesekk 12/15 %, tursekk 22/30 %, militærsekk 30/40 %).
  `finnes: true` = tingen finnes alt i sekken (utstyr.js / eventyr.js) – navn og vekt derfra.
- `BEHOLDERE` = møbeltypene i interior.js det kan ligge noe i: kjøleskap, kjøledisk (kalde), kjøkkenbenk («kjøkkenskapene»), skap
  («garderoben»), nattbord, tvbenk, bokhylle, pult, kateter, arkivskap, skranke, vask («baderomsskapet»), reol, kasse, pall,
  pallereol, hylle, arbeidsbenk («verktøybenken»), verktøyvogn, tønne og bil (i garasjen). Hver har kg-plass og hva som er vanlig der.
- `KLASSER` = lut per byggklasse (sjansen for at bygget er ransaket, «rik» og ganger per slag): jaktvåpen og ammo i hytter, låver og
  uthus, mye mat i butikker og lager, medisin på sykehus, skolesekker på skoler, militærsekk og feltrasjon i hangarer. Målt i testen:
  våpen i 27 % av hyttenes første garderobe, 16 % i boliger, 3 % i leiligheter, 0 på sykehus; ca. 10 matvarer per butikkreol.
  Våpen ligger bare i det første møbelet av hver type i bygget. Leirens egne bygg har beholdere, men de er tomme.
- `innhold(kl, type, i, k)` – fast innhold per møbel (hash av byggets nummer, typen og nummeret blant like møbler); fersk mat har
  dato 0 (den har ligget der siden alt stoppet), så kjøleskapene råtner etter noen døgn.
- Datoer: tall = «født» (alder = nå − tall), i kjøleskap `[alder da den kom inn, når]`. `alder/stadium/normaliser/flytt/taUt/
  stabler/måltid/bæring/beholdere/avstand`.

### Visningen (`LutSpill`)
- Tingene legges inn i `Utstyr.TING` (del: true – kan ikke kjøpes) og jaktrifla i `Utstyr.VÅPEN` (4 skudd 7,62 mm, 450 m,
  selges ikke) ved DOMContentLoaded og senest ved «riksbrudd-spill» (lytteren kommer før sekkens egen, så en lagret sekk med lut
  leses riktig). Alle våpen kan også ligge som ting (`v_<id>`).
- **Beholdere**: inne i et bygg (Interior3d.inne) kommer `#lutknapp` «Åpne kjøleskapet (E)» ved møbelet (≤ 1,6 m fra kanten).
  Over «Sikre huset» på skjermen. E åpner (letingens E venter da), Tab åpner/lukker panelet når du går, Esc lukker.
- **Lutpanelet** `#lutpanel`: venstre «Du bærer» (vekt/bæreevne med merker for tungt og svært tungt, plass, Utstyrt: Hånd og
  Rygg, Beltet 1–4, Lommer og sekk), høyre «Beholdere» med én fane per møbel innen rekkevidde (to like: «Garderobe 1/2») og
  «Gulvet». Like ting stables («20 × 7,62 mm», «1 × Melk – råtten»). Trykk velger, trykk på den andre siden flytter (telefon);
  dra og slipp og dobbeltklikk (mus); høyreklikk / hold inne 0,5 s gir valgene i feltet under. «Ta alt» / «Legg alt».
  Valg: Spis, Drikk, Bruk (medisin), Utstyr (våpen i beltet), Ta på (sekk), Ta av (ryggen), Ta i hånda, Lad, Legg i sekken,
  Legg fra deg / Legg i …, Flytt til …, Én (bare én), Ta med, Gi til leiren (i leiren: maten blir rasjoner i FolkSpill).
- **Gulvet**: hauger i kartets meter (`S.gulv`); den nærmeste innen 2 m brukes, ellers lages en der du står når noe legges der.
- **Vekt**: `Utstyr.krok = { maks, vekt, plassTil, våpenOk }` – plass = lommer + sekken på ryggen (våpnene i beltet tar ikke plass),
  vekt = våpen + sekkens egen vekt + lommene + innholdet i sekken × (1 − «lettere»). `Utstyr.maks()` = bæreevnen. For tungt:
  `LutSpill.fart()` (gange.js) og `LutSpill.løp()` (karakter.js, løpetiden), svært tungt: `LutSpill.kanLøpe()` = false.
- **Ferskhet**: kjøleskap i husene er kalde så lenge strømnettet i spill/overlev.js virker (`S.strømAv` husker når det gikk);
  kjøleskap i leirens kjøkken når bygget virker. Råtten mat kan spises (−12 helse).
- **3D**: det som ligger i benker, bord, nattbord, hyller og verktøybenker, står oppå møbelet (opptil 6 slag, to av hver), våpen i
  garderoben står mot veggen ved siden av den, og haugene på gulvet/bakken synes (innen 120 m). Ett nett per bygg med hjørnefarger,
  lagt i interiørets `o.nett` (frigjøres sammen med interiøret), bygges bare på nytt når innholdet endres. Ingen lys.
- **Lagring** per leir i «riksbrudd-lut»: `{ rygg, dato, b (endrede beholdere), gulv, strømAv }`.
- I sekken (#sekk): «Spis»/«Drikk»/«Til beltet»/«Ta på» på tingene, og «Ryggen og plassen» med knappen «Inventar og beholdere (Tab)».

### Valg (skrevet ned fordi ingen kunne spørres)
- **G – leirressursene**: «Let gjennom huset» beholdes for det tunge (tre, betong, stål, diesel, penger og mat i kartonger til leiren).
  Grunner: det er tonn og kubikkmeter som ikke kan bæres i en sekk, leirens økonomi og balansen (pakka «balanse» stilte den inn i dag)
  bygger på det, og vaktene «leting i hus» og «det som ble igjen» skal være grønne. Våpen og ammunisjon kommer ikke lenger fra letingen
  (`fantIHus` kalles ikke når lutsystemet er klart) – de ligger i skapene. Meldingen etter letingen minner om skapene.
- **Jaktrifle** er et eget våpen (4 skudd, 450 m) – «Skarpskyttergevær» (rifle) i butikken er sterkere og koster 1,2 mill.
- **Boksåpner**: ikke krav (det ble mas, og figuren har kniv i beltet).
- **Våpen i beltet** tar ikke plass i sekken (de henger på deg), men teller i vekta. Det må alltid være minst ett våpen i beltet
  (kampen i spillet-visning.js og narhud.js regner med det). Et våpen fra en beholder kommer i beltet med tomt magasin.
- **Sekken** kan bare tas av når det du bærer, får plass i lommene; bytter du sekk, må alt få plass i den nye.
- Sekken teller som én samlet plass (ikke hver sekk sin beholder).

### Småting fra anmeldelsene (i mine filer)
- Karakterpanelet («Deg») åpnes ikke fra varslene mens morgenmøtet venter på svar (E: møtet ble skjult under panelet); loggen sier
  «Svar på morgenmøtet først.» (`spill/karakter.js`).
- Ingen tastaturhint («(E)», «(Tab)») på berøringsskjerm også når nettleseren ikke svarer «pointer: coarse» (maxTouchPoints og ikke hover).
- PC: merkelappen «Låve · ikke gjennomsøkt» står under kompasset, ikke oppå våpenfeltene (F: 79-inne-60s.png).

### Prøvd i nettleser (runde 12; skriptene og bildene i scratchpad natt12/inne/)
- Telefon 844 × 390 (isMobile, hasTouch, webdriver av): låve (høyballer, båser, tønne) og bolig – knappene i rad under kompasset, hintet
  nede, «Plukk opp dusjen», «Åpne tønna», letingen → panelet (låve: 1,4 m³ tre og 0,5 t stål → lageret, deler i sekken, 20 l diesel ble
  igjen, «1 i alt, men de er tomme»; bolig: 3 rasjoner → leirens mat …, «Det ligger ting i 9 av 9», «Se i skapene» → ni faner + Gulvet),
  etterpå «Se i skapene (9)» i raden. Bilder: låve-*.png, hus-*.png.
- PC 1400 × 820: samme bolig (huspc-*.png).
- Sveip med ekte berøring (CDP), se 4. Drikk/spis av seg selv i 2D (t3): tørst 20 → 55 og sult 20 → 70 på ca. 3 s, to linjer i loggen;
  uten automatikk (webdriver) står «Drikk» og «Spis» ved varslene (t3b-varsel.png).
- «Reis til feltbilen (ca. 11 min til fots)» (t4): framme 4 m fra bilen, «Sett deg inn i feltbilen» kom.
- Vaktene «lut og beholdere» (med 3D, 32 s) og «gå» (13 s) grønne på PC.

### Ikke gjort / svakheter (runde 12)
- Pila kunne ikke prøves med ekte hus her (Dovre-testsiden har ingen husdata) – bare med prøvehuset i vakten «gå».
- Innsiden av låven (flate vegger, klossetraktor, høy malt på gulvet) er interiør3d.js, ikke min pakke.
- «Grafikk: middels (automatisk)» og de andre 3D-punktene i anmeldelsene er ikke rørt.

### Fellesfiler endret (små, samlede endringer)
- `spill/utstyr.js`: `api.krok` (maks, vekt, plassTil, våpenOk) og `råVekt`; `forTungt()` brukes av nyttVåpen og kjøp;
  `LutSpill.sekkKnapp(id)` spørres før EventyrSpill i sekkens knapper; `window.SEKK_TILLEGG` (lister i sekkpanelet, før ferdighetene).
- `spill/gange.js`: farten ganges med `LutSpill.fart()`, og `ikkeLøp` når `!LutSpill.kanLøpe()`.
- `spill/karakter.js`: løpetiden ganges også med `LutSpill.løp()` (bare når behovene går, ikke i testene).
- `spill/leting-visning.js` (min): E venter når du står ved en beholder; `fantIHus` kalles ikke når LutSpill er klar; meldingen nevner skapene.
- `index.html`: to skripttagger etter leting-visning.js (versjon.py kjørt).

### Prøvd
- `node pipeline/fliser/test_lut.js` (45 ok), `test_utstyr.js`, `test_leting.js`.
- Vakten «lut og beholdere» i nettleser på PC og mobil (3D: 1,6–1,8 s; uten 3D bare reglene).
- Ekte mus (Playwright): dra og slipp flytter, dobbeltklikk flytter tilbake (telles i trykk() – nettleserens dblclick kommer ikke
  fordi panelet tegnes på nytt etter første klikk), høyreklikk gir valgene. I sekken (#sekk): Drikk på saften, Til beltet på hagla,
  Ta på på skolesekken, Spis på brunosten (sult 40 -> 65).
- Vaktene «leting i hus», «angrep, marked … sekken» og «det som ble igjen» kjørt fra sjekk.js-koden i samme side: grønne.
  (Interiørvakten ga geo = 4 i mitt oppsett både med og uten lut-skriptene – ikke fra denne pakka.)
- Bilder: lutpanelet PC 1400 og telefon 390, benken med brunost/saft/knekkebrød/fiskeboller, rifle ved garderoben, haug på gulvet,
  og et ekte hus i Ryfylke (husdata via dev.py) med to garderober.

### Ikke gjort
- Lommelykt, batterier, sovepose og feltflaske har ingen virkning ennå (bare ting med vekt).
- Ingen egen vekt per sekk (sekken er én plass), ingen sekker i sekker, ikke «nøkkelring/belte»-plasser utover våpnene.
- Tingene inne i kjøleskap, kjøledisker, reoler og paller synes ikke i 3D (bare det som ligger oppå åpne møbler).
- Fiender/overlevende leter ikke i husene; husene fylles ikke på igjen.
- Leirens egne lagre (lagerteltet) er ikke koblet til leirens materialer – beholderne der er bare din egen lagring.

## Runde 5 (18.–19. nov kveld)

Brukeren: «forbedre enda mer». Midt i runden kom et nytt ønske som ble gjort FØRST: «Flyttbare møbler og alt» (som i Project
Zomboid – inspirasjonen, ikke en kopi). Alle tall er Claudes forslag (REGLER i hver fil).

### 0. Flyttbare møbler (nytt ønske, gjort først)
- `spill/mobler.js` (regler uten DOM, `Mobler`; test `pipeline/fliser/test_mobler.js`, 24 sjekker) og `spill/mobler-visning.js`
  (`window.MoblerSpill`). Skripttaggene står rett etter `lut-visning.js`.
- Hvert møbel har nøkkelen «bygg:type:nr» (`Mobler.merk`) – den samme som beholderne i lut.js (`Lut.beholdere` gir nå `nk`, og et
  flyttet møbel beholder sin), så innholdet følger møbelet.
- `F = { nøkkel: { i, X, Y, a, type, b, d, h, f, sperrer } }`: i = bygget det står i (nummer), null = ute, 'bæres'. X/Y i kartets meter.
  `Mobler.bruk(plan, i, F, cx, cy)` tar flyttede møbler ut av planen de kom fra og setter inn dem som står i bygget nå. interior3d.js
  kaller krokene i `window.INTERIOR_PLAN` rett etter `Interior.plan` – da følger veggene, kollisjonen (`Interior.blokkert`), 3D-bildet,
  tingene oppå møblene og beholderne med. `Interior3d.bygOm(i)` bygger et interiør på nytt med en gang, `Interior3d.møbelGeo(m)` gir et
  møbel som eget nett (spøkelset og møbler ute).
- Plukk opp: knappen «Plukk opp sofaen (P)» (#mobelknapp) når du står innen 1,3 m (helst det du ser mot). Vekt per type (`Mobler.VEKT`;
  nye typer får vekt fra målene), over 85 kg for tungt (traktor, bil, fly, maskin, pallereol, kjøledisk), over 18 kg eller lengste side
  over 1,3 m = stort: i armene, fart ×0,72, ingen løping (`LutSpill.fart/kanLøpe`), ingen skyting (`SpilletSpill.skyt` spør
  `MoblerSpill.hender()`), våpenet i hånda skjules (narhud.js). Vekta (møbel + innhold) teller i det du bærer.
- Innholdet: en beholder tar med seg det som ligger i den, høyst 20 kg (ellers «Ta ut det meste først»). `LutSpill.tattOpp` gjør
  innholdet fast (S.b) og lar fersk mat eldes som vanlig mens det bæres; `LutSpill.sattNed` – i et kjøleskap teller kulden fra nå
  (et kjøleskap i en brakke med strøm holder maten kald).
- Sett ned: spøkelset (gjennomsiktig møbel, grønt/rødt) står foran deg og følger blikket, i byggets akser; R/Q dreier 90°, E/Enter, klikk
  med låst mus eller «Sett her» setter ned, «Sett tilbake» legger det der det sto. Linja #mobelbar øverst (under kompasset) sier hva du bærer
  og hvorfor det er rødt: gjennom ytterveggen, en skillevegg, oppå et annet møbel (tepper unntatt), i en døråpning, foran inngangen, ute:
  vann/hus/tre/annet møbel/for bratt (0,45 m). Inne må du stå i samme bygg som spøkelset.
- Ute: møblene er ett nett (hjørnefarger), og de som sperrer, legges i `R3.hindre` (du går ikke gjennom dem).
- Lagres per leir i «riksbrudd-mobler» ({ leir, F, bær }).
- Vakten «lut og beholdere» prøver nå også: kjøleskap med 27 kg i nektes, kjøleskap med brunost plukkes opp (borte fra planen, ingen
  løping/skyting), spøkelset grønt i scenen, settes ned 1,5 m+ unna (sperrer der), brunosten følger med, lagret, og står der etter
  `bygOm`. Alt settes tilbake (`MoblerSpill.settTilstand`).
- Bilder: scratchpad natt5/lut/m1-ved.png, m1-spøkelse.png, m1-satt.png (inne, PC), m2-pc-knapp/ute/satt.png (ute, PC).

### 1. Lommelykt (`spill/lykt.js`, `LyktSpill`; test `test_lykt.js`)
- L (PC, fanges før hurtigtasten L for Leiren) eller «Lykt på (L) · 100 %» i raden til venstre når du går (eventyr-visning.js spør
  `LyktSpill.rad()`); i sekken/lutpanelet «Slå på/av», «Bytt batterier», og på batteriene «Lad (i lykta)». Lykta må ligge i sekken.
- Et sett batterier = 8 spilltimer (KROKER.sim), svakere de siste 15 %. Om natta: karakterlaget ser opptil 45 % lenger (KROKER.sikt),
  fiendene ser deg opptil 90 % lenger unna og mørket skjuler deg ikke (eventyr-visning.js `snikRekkevidde` ganger med
  `LyktSpill.røper()`; målt 89 m -> 160 m ved mørke 0,44).
- 3D: en lyskjegle på bakken/gulvet foran deg (seks biter langs strålen som følger terrenget eller gulvet): ett nett som legger til et
  varmt lys og ett som ganger opp det som er der (samme blanding som lysflekkene under gatelysene). INGEN nye lys. Målt med
  `renderer.render` på testmaskinen: 1–2 ms uansett (ingen målbar forskjell).
- Lagres i «riksbrudd-lykt». Bilder: natt5/lut/l1-pc-av.png, l1-pc-på.png, l1-pc-inne.png.

### 2. Sovepose og 3. feltflaske (spill/eventyr.js + eventyr-visning.js)
- «Sov her» (raden til venstre) når søvnen er under 70 ute (ikke i hus, leir eller nær fiender): samme søvn som i en tilflukt (spoler,
  vekkes som før, våkner når du slutter å gå). `Eventyr.Tur.ute(andel, pose, vinter)`: med sovepose ×1, uten ×0,5; vinter uten sovepose:
  ×0,35 søvn, −20 sult og −10 helse («Du frøs i natt …»).
- Feltflaske: `Eventyr.Tur.maks(ting)` = 4 slurker × (1 + antall feltflasker i sekken) – samme «Flaske 3/8» som før, ikke to systemer.
  Fylles i leiren og ved vann ELLER en bekk (u.iBekk); i 2D der karakteren står når 3D-utsnittet dekker stedet.

### 4. Husene lever og 5. første hus
- `Lut.tøm(B, andel, frø)`, `Lut.ransak(a, timer)` (1 − e^(−1,2·t)), `Lut.påfyll(B, ny, andel, plass)`; `REGLER.ran` (60 m, 1,2/t, «ransaket»
  fra 0,6, sjekk hvert 10. spillminutt) og `REGLER.påfyll` (butikk/lager: hvert 3. døgn en tredel av en ny forsyning).
- `LutSpill.tøm(byggNr, { av, andel })` (API som krig-hjelperen ba om) og `LutSpill.ransaket(byggNr)`. Fiendelag og røvere i
  3D-utsnittet (byggene i u.hus.omriss) tømmer bygg innen 60 m (KROKER.sim, ikke i testene: `LutSpill.test`). Beholdere som er åpnet,
  tømmes med en gang; de andre får tømmingen når de lages. Flyttede møbler røres ikke. Panelet sier «huset er ransaket».
- Første hus: boliger (hus, hytte, leil) innen 1,5 km fra leiren er aldri ransaket, og den første kjøkkenbenken/kjøleskapet/garderoben/
  nattbordet har én nyttig ting trukket med byggets nummer (`Lut.NYTTIG` – mat, drikke, sekk, ammo, førstehjelp, sovepose, lommelykt).
  Testen: 300 av 300 boliger har noe, 39 ulike kjøkkenskap av 40.
- S.ran og S.fylt lagres i «riksbrudd-lut».

### Prøvd i runde 5
- Regeltester: `test_mobler.js` (24), `test_lykt.js` (8), `test_lut.js` (52), `test_karakter.js`, `test_eventyr.js`.
- I nettleser (PC): vaktene «lut og beholdere» (med møblene) og «eventyret til fots (karakter)» grønne; de innebygde vaktene i sjekk.js
  «leting i hus» og «angrep, marked … sekken …» grønne. «interiør» gir geo = 4 i mitt oppsett – det samme som i runde 4 (også uten
  lut-skriptene), ikke fra denne pakka.
- Bilder (scratchpad natt5/lut/): m1-ved/-spøkelse/-satt.png (inne, PC), m2-pc-knapp/-ute/-satt.png (ute, PC), l1-pc-av/-på/-inne.png
  (lykta om natta, PC), m3-tlf-lykt/-knapp/-spøkelse/-satt.png (telefon 390 px).

### Ikke gjort / svakheter
- 8 (tingene inne i kjøleskap og reoler i 3D) er ikke gjort – reolene har alt fyllvarer i modellen, og kjøleskapet er lukket.
- Møbler: ingen animasjon av møbelet i hendene (spøkelset vises bare foran deg), ingen «Riv/demonter», og du kan ikke stable møbler
  oppå hverandre. Utemøbler lages bare innenfor 3D-utsnittet. Fiendene flytter ikke møbler.
- Lykta lyser bare bakken/gulvet (ikke vegger og møbler) – det er prisen for å ikke legge et nytt lys i scenen.
- «Husene lever» gjelder bare bygg i 3D-utsnittet (byggomrissene finnes bare der); 2D-kartet viser ikke hvilke hus som er ransaket.

### Rettet etter gjennomsyn (telefon)
- Spøkelset står 1,6 m (pluss halve møbelet) foran deg på smale skjermer (`Mobler.REGLER.foranSmal`; PC 0,9 m), så det ikke fyller bildet.
- Møbellinja står nede over styrespaken på telefon (body.kort), ikke oppå minikartet og helselinja; øverst under kompasset på PC.
- Mens du bærer et møbel (body.bærermøbel) skjules «Skyt», våpenbyttet, «Let gjennom huset», «Sikre huset», «Sett deg inn i …»,
  merkelappen for huset og «Åpne …».
- Den store grå flaten nederst i det første telefonbildet var ikke spøkelset: prøveskriptet la prøvehuset der rakettartilleriet i
  leiren sto (det sto inne i huset). Skriptet flytter nå kjøretøyene bort først.

## Runde 12 (21. nov natt, kritikk E/F) – pakka «inne»

Kritiker E (liggende telefon) og F (PC): «Let gjennom huset viser ingenting», «møbelflytting er umulig å oppdage», uttørket med full
feltflaske, raske sveip virker ikke, «Inngang 45 m · rundt huset →» uten hus, og feltbilen var ikke å nå etter «Reis hit».

### 1. Resultatet av letingen (`spill/leting-visning.js`, `spill/lut-visning.js`)
- `#funnpanel`: når letingen er ferdig (og når du henter det som lå igjen) står et panel til du lukker det eller går ut av bygget:
  «Låve er gjennomsøkt», **Til leiren (ikke i sekken)** med hvor hver ting havnet («3 rasjoner → leirens mat», «1,4 m³ tre → lageret»,
  «20 l diesel → dieseltankene», «13 000 kr → kassa»), **I sekken din** (deler til håndverk fra eventyr-visning.js), **Ble igjen i huset**
  (det leiren ikke hadde plass til), **Folk** (en overlevende) og **Skap, skuffer og hyller**: «Det ligger ting i 9 av 9 (18,6 kg)».
  Knappen **«Se i skapene»** åpner lutpanelet med ALLE beholderne i bygget (`LutSpill.åpneHele()`; de med noe i først), ikke bare de innen
  1,6 m. Det gjelder til panelet lukkes eller du går ut (`helHus`). `LutSpill.husOversikt(P)` = { antall, medTing, kg }.
  Valg: å ta fra et skap i andre enden av huset etter at du har lett gjennom det, er lov – letingen tok tid, og på telefon med trege
  bilder var det umulig å gå til hvert skap. Loggmeldingene og 5-sekunderslappen er som før (regnskap-hjelperen retter teksten).
- `LeteSpill.visResultat(P, d)`, `lukkFunn()`, `funnÅpent()`.
- Etter at panelet er lukket, står «Se i skapene (9)» (`#skapknapp`) blant knappene inne så lenge du er i et gjennomsøkt bygg med ting
  i skapene (tallet = beholdere med noe i, regnet hvert 1,5 s).
- Fanene i lutpanelet ruller sidelengs på liggende telefon (de tok halve høyden med ti beholdere).

### 2. Møblene og knappene inne (`leting-visning.js`, `mobler-visning.js`)
- Knappene inne (Let, Sikre, Åpne …, Plukk opp …, Gå inn/ut) flyttes inn i `#inneknapper`: en kolonne midt nede på PC (som før, men
  uten hull), og på liggende telefon (body.kort, høyde ≤ 560) en rad under kompasset. Før lå «Åpne …» (bunn 330 px) og «Plukk opp …»
  (bunn 380 px / til høyre over Skyt) utenfor skjermen eller under andre knapper på en 390 px høy skjerm. «Gå ut» lå oppå minikartet.
- Første gang du er inne i et hus (én gang i nettleseren, «riksbrudd-innehint»): `#innehint` «Inne i huset. «Let gjennom huset» finner det
  leiren kan bruke. Står du ved et skap, kommer «Åpne …» … Ved et møbel kommer «Plukk opp …», og da kan du flytte det.» Lukkes ved trykk,
  etter 20 s eller når du går ut. Nede mellom våpenboksen og Huk på telefon. Ikke i testene (webdriver) uten `LeteSpill.test`.
- Bygg uten møbler du kan bære: merkelappen sier «Låve · gjennomsøkt · ingen møbler du kan bære» (ikke for leirens bygg).
- Står du ved et møbel som er for tungt (høyball 250 kg, traktor), sier knappen «Høyballen er for tung å bære» i stedet for «Plukk opp».

### 3. Drikk og spis (`spill/karakter.js`, `spill/eventyr-visning.js`, liten endring i `spill/narhud.js`)
- `Karakter.R.autoDrikk = 40`, `autoSpis = 35` (Claudes forslag): utenfor leiren drikker karakteren av feltflaska og spiser en feltrasjon
  av seg selv når behovet er under det, også når karakteren står i 2D. Loggen: «Du var tørst og drakk av feltflaska (3 slurker igjen).» /
  «Du var sulten og spiste en feltrasjon fra sekken (1 igjen).» Bare når `!navigator.webdriver || KarakterSpill.test` (som all takt).
- Varslene (`KarakterSpill.varsler()`): rådet sier «Drikk fra feltflaska (4 slurker igjen).» / «Spis en feltrasjon fra sekken (2 igjen).»
  når det går, «Feltflaska er tom – drikk i leiren eller ved et vann.» ellers, og har `knapp: { t: 'Drikk' | 'Spis', f }`.
- **narhud.js (fellesfil, én endring):** brikken for karakterens varsler sender `knapp: v.knapp || null` videre, så «Drikk»/«Spis» står
  ved siden av varselet i 2D (samme mekanikk som «Kjøp 500 l» ved diesel).
- `EventyrSpill.drikk(true)` / `KarakterSpill.spisRasjon(true)`: av seg selv (egen loggtekst, ingen melding når det ikke går).

### 4. Se rundt med fingeren (`spill/gange.js`)
- Årsaken (funnet med hendelseslogg i nettleseren): kritikerens raske sveip begynte på våpenbyttet «Automatgevær» (#byttvapen, x 590–683),
  som ikke hadde `touch-action:none` – nettleseren tok draget (pointercancel), og blikket fikk aldri noe. Det sakte draget begynte på lerretet.
- Nå: et drag over 12 punkter som begynner på #byttvapen, Skyt, «Sett deg inn …» eller knappene inne, blir et blikk-drag (knappen trykkes
  ikke når du slipper; Skyt skyter som før). Disse knappene har `touch-action:none`.
- Blikket følger pekeren på hele vinduet mens du drar, og resten av draget tas med fra slippet. Akselerasjon: følsom × (1 + 1,6 ·
  min(1, fart / 0,8 punkter per ms)) (Claudes forslag, `BLIKK`).
- Prøvd med ekte berøring (CDP) som kritikeren: sveip 150 px på 0,6 s: før 0°, nå 43°; 300 px på 0,12 s: før 0°, nå 91°; sakte 200 px
  på 6 s: 57° (som før).

### 5. Pila mot inngangen (`spill/gange.js`; vakten `vakter/ga.js` justert)
- Pila står bare når huset er foran deg (midten innen 55° fra blikket) eller du står helt inntil det (12 m) (`PIL`, Claudes forslag), og
  den sier hvilket bygg: «Låve 45 m», «Brakka 20 m · rundt huset». Loggen etter «Reis hit» sier «Låve: inngangen er 30 m unna – snu deg
  mot bygget …». Kritikerens tilfelle (brakka bak ham, døra på baksiden) gir ingen pil.
- `vakter/ga.js`: prøvehuset bak deg gir nå ingen pil; snur du deg 40° mot det, kommer «Bolig 20 m» (før krevde vakten pil bakover).

### 6. Feltbilen etter «Reis hit» (`spill/gange.js`)
- Står et av leirens kjøretøy (feltbilen før helikopteret) innen 60 m fra stedet kameraet ser på, heter knappen «Reis til feltbilen
  (… til fots)», og du settes 3,5 m ved siden av bilen – «Sett deg inn i feltbilen» kommer med en gang.

### Småting fra anmeldelsene (i mine filer)
- Karakterpanelet («Deg») åpnes ikke fra varslene mens morgenmøtet venter på svar (E: møtet ble skjult under panelet); loggen sier
  «Svar på morgenmøtet først.» (`spill/karakter.js`).
- Ingen tastaturhint («(E)», «(Tab)») på berøringsskjerm også når nettleseren ikke svarer «pointer: coarse» (maxTouchPoints og ikke hover).
- PC: merkelappen «Låve · ikke gjennomsøkt» står under kompasset, ikke oppå våpenfeltene (F: 79-inne-60s.png).

### Prøvd i nettleser (runde 12; skriptene og bildene i scratchpad natt12/inne/)
- Telefon 844 × 390 (isMobile, hasTouch, webdriver av): låve (høyballer, båser, tønne) og bolig – knappene i rad under kompasset, hintet
  nede, «Plukk opp dusjen», «Åpne tønna», letingen → panelet (låve: 1,4 m³ tre og 0,5 t stål → lageret, deler i sekken, 20 l diesel ble
  igjen, «1 i alt, men de er tomme»; bolig: 3 rasjoner → leirens mat …, «Det ligger ting i 9 av 9», «Se i skapene» → ni faner + Gulvet),
  etterpå «Se i skapene (9)» i raden. Bilder: låve-*.png, hus-*.png.
- PC 1400 × 820: samme bolig (huspc-*.png).
- Sveip med ekte berøring (CDP), se 4. Drikk/spis av seg selv i 2D (t3): tørst 20 → 55 og sult 20 → 70 på ca. 3 s, to linjer i loggen;
  uten automatikk (webdriver) står «Drikk» og «Spis» ved varslene (t3b-varsel.png).
- «Reis til feltbilen (ca. 11 min til fots)» (t4): framme 4 m fra bilen, «Sett deg inn i feltbilen» kom.
- Vaktene «lut og beholdere» (med 3D, 32 s) og «gå» (13 s) grønne på PC.

### Ikke gjort / svakheter (runde 12)
- Pila kunne ikke prøves med ekte hus her (Dovre-testsiden har ingen husdata) – bare med prøvehuset i vakten «gå».
- Innsiden av låven (flate vegger, klossetraktor, høy malt på gulvet) er interiør3d.js, ikke min pakke.
- «Grafikk: middels (automatisk)» og de andre 3D-punktene i anmeldelsene er ikke rørt.

### Fellesfiler endret
- `spill/narhud.js`: `knapp: v.knapp || null` på brikken for karakterens behov (én linje, ca. linje 204).
- `pipeline/fliser/vakter/ga.js`: pil-sjekken (se 5).
- Elementer andre eier, som nå flyttes inn i `#inneknapper` fra leting-visning.js: ingen (alle fem knappene er i mine filer:
  leting-visning, overlev, lut-visning, mobler-visning, gange). `#kjorknapp` (kjor.js) får bare `touch-action:none` fra gange.js.
