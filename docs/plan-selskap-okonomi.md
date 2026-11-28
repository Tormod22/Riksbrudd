# Plan: selskapet, byene og økonomien

28. november 2026. Brukeren: «vi spiller jo som en privatmilitær organisasjon, og prøver å få med byer på laget … selskaper kan
investere i organisasjonen, vi blir børsnotert på en internasjonal svartebørs … vi kan investere i andre selskaper selv, samarbeide,
lage kontrakter for tømmer, eksportere tømmer, maskiner som raffinerer tømmer til planker … Kan du lage en plan for dette?»
Og samme dag: «byggene i hele spillet trenger et helt nytt system, hvor hvert eneste bygg består av vegger, tak og møbler … vegger en
senere kan rive, eller bygge vinduer på … flere etasjer, loft … om en ønsker å bygge en stor fabrikk helt selv» (kapittel 5).

Planen tar også med de seks forbedringene brukeren likte i svaret på «Hvordan kan spillet gjøres bedre?»: ro i skjermen, én tydelig
vei med kontraktene som rød tråd, en økonomi som gir valg hele spillet, en fiende som er en ekte motstander, lyd og den første halvtimen.

**Alle tall i planen er Claudes forslag.** De er satt for å passe med det spillet har i dag (start 40 mill. kr, lønn 15 000 kr per
person i døgnet, inflasjon 1 %, kontrakter på 0,7–2,1 mill. kr), og skal prøves og justeres. Navn på børser, firmaer og varer er også
forslag. Ingenting her er bygget ennå.

## 1. Kort fortalt

Selskapet ditt starter som en liten gjeng med en leir og en kontrakt. Planen gir spillet en vei videre, i fire trinn:

| Trinn | Du er … | Hva du gjør | Hva som er nytt |
|---|---|---|---|
| 1. Overleve | en gjeng med en leir | første kontrakt, bygge leiren, mat og lønn | ro i skjermen, en god første halvtime |
| 2. Leverandør | et selskap folk stoler på | kontrakter, hogst, **sagbruk**, leveranseavtaler | varer, maskiner og produksjonskjeder |
| 3. Makt i regionen | den byene vil ha | **byavtaler**, beskytte handelsruter, slå tilbake Ravnsund og Mosevakt | byer som velger side, ikke bare inntas |
| 4. Konsern | et selskap med eiere | **eksport**, **investere** i andre, **investorer**, **notering på svartebørsen** | aksjer, kurs, utbytte, oppkjøp |

Grunntanken: **kontraktene er fortsatt den røde tråden.** Hvert nytt system kommer inn gjennom en kontrakt eller en avtale, ikke som
en ny meny du må finne selv. Sagbruket låses opp av en tømmerkontrakt, den første byavtalen kommer etter at du har beskyttet byen,
og den første investoren ringer når selskapet har levert nok.

Under alt dette ligger et nytt **byggesystem** (kapittel 5): hvert bygg i spillet består av etasjer, vegger, gulv, tak og møbler,
husene i kartet regnes ut fra høyden og typen, og du kan rive vegger, lage vinduer og bygge din egen fabrikk del for del.

Og: **produksjon dekker driften, kontrakter og byer gir vekst, børsen gir de store sprangene – og den store risikoen.**

## 2. Det vi bygger videre på

Mye av grunnmuren finnes alt. Planen lager ikke parallelle systemer, men bygger på disse:

- **Selskapet** (`spill/selskap.js`): rykte i tre retninger (pålitelig, hardhendt, billig), fire nivåer (Ukjent → Kjent i bygda →
  Etablert → Ettertraktet), kontrakter med oppdragsgiver (bygd, by, firma), frist, bot og konkurrenter. Det finnes alt sju firmaer:
  Gråfjell Frakt, Tindvik Drivstoff, Brattli Mineral, Dalsnes Kraftlag, Kvernhaug Mølle, **Storlia Tømmer** og Ytterø Sjømat.
- **Regionen** (`spill/region.js`): tettstedene gir varer og skatt etter hva som ligger der, lojalitet, opprør, handelsruter som kan
  trues, og en svartebørs som dukker opp av og til.
- **Markedet** (`spill/spillet.js`): priser som flytter seg og inflasjon (1 %).
- **Materialer fra verden** (`spill/ressurser.js`): hogst og riving, frakt til fots eller med lastebil.
- **Sjøen** (`spill/sjo.js`) og **kaiene** i hele Norge (`spill/kaier.js`): båter, havner, forsyning sjøveien.
- **Folk og lønn** (`spill/folk.js`): personer med ferdigheter, oppgaver, moral og lønn.
- **Krig og fiender** (`spill/strategi.js`, `spill/fraksjoner.js`): krigskartet, tettsteder som skifter eier, Ravnsund og Mosevakt.
- **Dagboka og pengene** (`spill/dagbok.js`): penger inn og ut per post.

## 3. Byene på laget

I dag tar du et tettsted ved å stå der med et lag. Det er ikke det et privat militærselskap gjør. Planen gjør byene til **kunder og
allierte** som du vinner over – og som kan si nei, si opp avtalen eller gå over til Ravnsund.

### 3.1 Hva byen tenker om deg

Hvert tettsted får tre tall (0–100), som vises i et lite kort når du trykker på byen i Krig:

- **Tillit** – har du holdt det du lovet? Opp når du leverer kontrakter for byen, beskytter den og reparerer bruer og kraftverk. Ned
  når du bryter avtaler eller lar røvere herje.
- **Frykt** – hvor hardhendt du er. Litt frykt gjør byen lydig, mye frykt gjør den fiendtlig når du snur ryggen til. Følger ryktet
  «hardhendt».
- **Behov** – hva byen mangler nå: trygghet, strøm, mat, ved, medisiner, arbeid. Behovet bestemmer hvilke kontrakter byen gir og hva
  en avtale er verdt for den.

Byen har også et **byråd** med en leder (navn og portrett), som er den du forhandler med. Små bygder har en ordfører, store byer et
krisestyre. Lederen har en egen holdning (forsiktig, grådig, patriot, redd) som gjør forhandlingene litt forskjellige.

### 3.2 Avtalene

En by går gjennom stegene **nøytral → kunde → partner → medlem**. Hvert steg er en avtale du må forhandle fram og holde:

| Avtale | Byen gir | Du gir | Krav (forslag) |
|---|---|---|---|
| **Kunde** (enkeltkontrakter) | betaling per kontrakt | det kontrakten sier | ingen |
| **Beskyttelsesavtale** | fast betaling hvert døgn, ca. 15 kr per innbygger | et lag i byen eller innen 3 km, svar på angrep innen 2 t | tillit 40 |
| **Handelsavtale** | byens varer til fast pris, og byen kjøper dine | trygg handelsrute, leveranser | tillit 55, en beskyttelsesavtale |
| **Medlemskap** | skatt uten opprør, rekrutter, en base i byen, byens folk i krigsstillingen | strøm, vann og orden; byen kan kreve ting | tillit 70, frykt under 50 |

Dombås (ca. 1300 innbyggere) gir da ca. 20 000 kr i døgnet for beskyttelse – litt mer enn lønna til én person. Lillehammer (ca.
28 000) gir ca. 420 000 kr – nok til å lønne en tropp. Store byer er altså verdt mye, men de krever mye.

**Forhandlingen** er ett kort med tre glidere: pris, hva du lover (antall mann, svartid) og varighet (7, 14 eller 30 døgn). Byrådet
sier ja, nei eller kommer med et motbud. Jo mer byen trenger deg (behov), jo mer kan du kreve.

### 3.3 Det som gjør det levende

- **Byen ber om hjelp.** Røvere ved byen gir et varsel: «Dombås ber om hjelp – 2 røverlag 1,4 km nord.» Kommer du for sent, går tilliten ned.
- **Rivalene frir også.** Ravnsund og Mosevakt sender tilbud til de samme byene. Du ser det i Krig («Ravnsund forhandler med Otta»),
  og kan by over, sabotere eller la det gå.
- **Byen kan si opp.** Holder du ikke det du lover, sier byen opp avtalen med et døgns varsel – og forteller nabobyene det.
- **Inntak med makt finnes fortsatt**, men en by du tar med våpen, starter med frykt 80 og tillit 10. Den gir skatt, men gjør opprør
  så snart du trekker ut. Det er det raske, harde valget.
- **Byens folk** som medlem: noen blir med i selskapet (rekrutter), noen danner et bygdevern som forsvarer byen selv.

Krigskartet (seier ved 60 % av folket) regner da **medlemmer fullt og partnere halvt** – du kan vinne regionen med avtaler, med
våpen, eller begge deler.

## 4. Varer og produksjonskjeder

I dag kjøper du tre, betong og stål ferdig, eller hogger og river. Planen legger til **råvarer, maskiner og ferdigvarer**, så leiren
kan bli et lite industristed.

### 4.1 Varene

| Råvare | Hvor den kommer fra | Ferdigvare (gjennom maskin) |
|---|---|---|
| **Tømmer** (m³) | hogst nær leiren, tømmerkontrakter, Storlia Tømmer | planker, ved og flis |
| **Skrap** (t) | riving av hus, vrak av kjøretøy | stål, deler |
| **Stein og grus** (m³) | steinbrudd/grustak (nytt bygg) | pukk til veger, betong (med sement) |
| **Fisk** (t) | fiske fra båt, Ytterø Sjømat | frossen og tørket fisk (eksport), rasjoner |
| **Korn** (t) | gårder i byer du har avtale med, Kvernhaug Mølle | mel → rasjoner |
| **Olje** (t) | oljebasen, terminaler | diesel (lite raffineri) |

Det leiren kaller «tre» i dag blir **planker**. Hogst gir **tømmer**, som må sages – eller selges billig som det er. (Dette er et
valg du må ta, se spørsmål 1.)

### 4.2 Maskinene

Maskinene er bygg i leiren (eller i en by du har avtale med). De trenger folk, strøm og vedlikehold, og har tre nivåer.

| Maskin | Inn | Ut (per time, nivå 1) | Folk | Strøm | Pris (forslag) |
|---|---|---|---|---|---|
| **Sagbruk** | 2 m³ tømmer | 1,1 m³ planker + 0,7 m³ flis | 3 | 15 kW | 6 mill. kr |
| **Høvleri** (nivå 2 av sagbruket) | planker | høvlede planker (selges for 1,4 ×) | +1 | +5 kW | 3 mill. kr |
| **Vedkløyver** | flis og avkapp | ved til leiren og byene | 1 | 3 kW | 0,8 mill. kr |
| **Fyrkjele** | flis eller ved | strøm og varme (bytter ut diesel) | 1 | gir 30 kW | 4 mill. kr |
| **Smie og verksted** (finnes) | skrap | stål, deler, ammunisjon | 2 | 10 kW | utvidelse 2,5 mill. kr |
| **Steinknuser** | stein | pukk | 2 | 20 kW | 5 mill. kr |
| **Fiskemottak** (ved kai) | fisk | frossen fisk (krever fryselager) | 3 | 25 kW | 7 mill. kr |
| **Mølle** | korn | mel → rasjoner på kjøkkenet | 2 | 10 kW | 3 mill. kr |
| **Lite raffineri** | olje | diesel | 4 | 40 kW | 18 mill. kr |

Regnestykket for sagbruket (forslag): tømmer 8 000 kr/m³, planker 20 000 kr/m³. Ett døgn med full drift gir ca. 26 m³ planker av
48 m³ tømmer: ca. 140 000 kr mer verdt enn tømmeret var, pluss flis. Det dekker lønna til ca. ti personer. **Produksjon holder
selskapet i live – kontrakter og byer får det til å vokse.**

Med byggesystemet i kapittel 5 blir maskinene etter hvert **ting du setter inn i et bygg** (en sagbenk i en hall du har bygget selv,
eller i en gammel låve du har tatt over). Den første utgaven (fase Ø1) kan være vanlige bygg i leiren, som verkstedet i dag, og flyttes
inn i byggene når B5 er klar.

### 4.3 Det som gjør det til valg

- **Kjedene henger sammen:** flis fra sagbruket fyrer kjelen, kjelen gir strøm til sagbruket. Du kan bygge deg ut av dieselen – men
  det tar plass, folk og tid.
- **Folk er knappe:** tre på sagbruket er tre som ikke står vakt. Lønna gjør hver arbeider til et valg.
- **Maskinene slites** (hp synker med drift). Verkstedet reparerer, ellers stopper maskinen. Røvere og rivaler går gjerne etter dem.
- **Lagerplass** (som i dag) og **frakt** betyr noe: en tømmerbil (ny kjøretøytype, 20 m³) frakter fra hogstfeltet og til kunden.
- **Kvalitet:** dyktige folk (ferdighet over 1,2) gir 10 % bedre utbytte. Ferdighetene får en mening i fred, ikke bare i krig.
- **I 2D** er maskinene vanlige bygg med et lite tall over seg (som kW og senger i dag): «1,1 m³/t». I 3D kan sagbruket få en egen
  modell med tømmerstabler og flishaug (valgfritt, ikke nødvendig for å spille).

## 5. Byggene: vegger, etasjer og fri bygging

Brukeren 28. nov: «hvert eneste bygg skal bestå av vegger, tak og møbler og ting inne i huset … vegger som en senere kan rive, eller
bygge vinduer på … bygg på flere etasjer kan kalkuleres basert på høyde, med loft eller ekstra etasjer … om en ønsker å bygge en stor
fabrikk helt selv, skal en kunne bygge vegger, gulv, maskinplassering, lys og så videre.»

Dette er et stort system, og det henger sammen med nesten alt annet: leting, tilflukt, riving, kamp, leiren og fabrikkene i kapittel 4.
Derfor får det egne faser (B0–B7 i kapittel 13).

### 5.1 Slik er det i dag

- **Husene i kartet** (fra OpenStreetMap) er et omriss, en høyde og en type. I 3D er de én kropp med tak (`hus3d`). Når du går nær,
  lages et interiør for **første etasje** (`spill/interior.js` og `interior3d.js`): rom, døråpninger, vinduer og møbler, alltid likt for
  samme hus. Det finnes ikke andre etasjer, og ingenting inne i huset kan endres – bare letes gjennom og «sikres».
- **Riving** (`spill/ressurser.js`) tar hele huset på en gang.
- **Leiren** har to slags bygg: ferdige modeller (brakke, verksted, kontrollrom …) og **byggesettet** (`spill/byggesett.js`) med gulv,
  vegger, dører, vinduer og tak på et rutenett på 2,4 m, høyst to etasjer.

Det betyr tre ulike måter å lage et bygg på. Planen gjør dem til **én**.

### 5.2 Ett bygg = én modell

Hvert bygg i spillet – et hus i kartet, en brakke i leiren eller en fabrikk du har bygget selv – beskrives på samme måte:

| Del | Hva den er | Kan endres |
|---|---|---|
| **Etasjer** | kjeller (noen), 1., 2. … etasje, loft | legge til / fjerne øverste |
| **Gulv og dekker** | ett felt per rute, med stoff (tre, betong, fliser) | rive, legge, hull til trapp |
| **Vegger** | stykker mellom to punkter: yttervegg eller skillevegg, stoff, tykkelse, **bærende** eller ikke | rive, bygge, forsterke |
| **Åpninger** | dør, port, vindu – en plass i en vegg | lage, tette, barrikadere |
| **Trapper** | mellom to etasjer | bygge, rive |
| **Tak** | saltak, valmtak, flatt tak – med loft under når det er plass | reparere, rive (gir hull) |
| **Møbler og ting** | senger, benker, hyller, maskiner, lamper, kasser | flytte, ta med, ødelegge |
| **Installasjoner** | lys, strøm, varme, vann (enkelt) | koble, slå av |

Alt har **stoff** (tre, mur, betong, stål, glass, blikk) og **tilstand** (helt, skadet, ødelagt). Stoffet sier hva du får når du river,
hvor godt veggen tar imot kuler og hvor lett den brenner.

### 5.3 Husene i kartet: regnet ut, ikke lagret

Norge har flere millioner bygg. De kan ikke lagres med vegger og møbler. Derfor **regnes** hvert hus ut fra det kartet vet – omriss,
høyde, type og husets nummer – på samme måte som interiøret gjør i dag: samme hus gir alltid samme plan, på alle maskiner.

- **Etasjer fra høyden** (forslag): etasjehøyde 2,7 m i boliger og hytter, 3,2 m i kontor og skoler, 4,5–8 m i haller og industri.
  Saltak: veggene står opp til der taket begynner, og resten er tak. Antall etasjer = veggens høyde / etasjehøyden, avrundet ned,
  minst én. Et hus på 9 m med saltak blir da to etasjer og loft; en bygård på 18 m med flatt tak blir seks etasjer.
- **Loft** når mønet ligger minst 2,2 m over loftsgulvet: med skråtak, takvinduer i noen, og ofte lager og skrot (godt for leting).
- **Kjeller** i noen boliger og bygårder (fast per hus): bod, fyrrom, tilfluktsrom i større bygg.
- **Planløsningen per etasje** følger typen: bolig med stue og kjøkken nede og soverom oppe, bygård med trapperom i midten og
  leiligheter rundt, kontor med korridor, butikk med salgslokale og lager, fabrikk med hall og kontorer i to etasjer i den ene enden.
- **Bærende vegger:** ytterveggene og én eller to vegger i midten (langs mønet) er bærende. De andre er lette skillevegger.
- **Bare det du har endret lagres.** Et hus du aldri rører, er bare et nummer. River du en vegg, lagres «hus 81234, etasje 1, vegg 7:
  revet». Det holder lagringen liten, og det passer med flerspiller senere (tjeneren sender bare endringene).

### 5.4 Hva du kan gjøre med et bygg

- **Rive en vegg:** et byggelag (eller du selv med verktøy) river én vegg. Det gir materialer etter stoffet: en tømmervegg gir
  planker, en murvegg gir stein, en betongvegg gir litt armering (stål). En lett skillevegg tar minutter, en bærende betongvegg timer.
- **Bærende vegger betyr noe:** river du en bærende vegg uten å sette inn en **bjelke** eller **søyle** først, sier byggelaget fra – og
  gjør du det likevel, raser taket eller etasjen over (enkelt: den delen av dekket som ikke har noe under seg innen 6 m faller ned).
  Regelen er den samme som i byggesettet i dag: ingen deler som svever.
- **Lage åpninger:** en ny dør eller et nytt vindu i en vegg (krever en bjelke over i bærende vegger). Glass blir et nytt materiale
  (kjøpes, eller hentes fra andre hus).
- **Tette og barrikadere:** planker over vinduer og dører. Dette erstatter «Sikre huset» i dag: i stedet for én knapp ser du hvert
  vindu og hver dør, og vet hvor fienden kan komme inn.
- **Ta over et hus:** et hus i kartet kan bli en del av leiren (utpost, lager, verksted, fabrikk). Da kan du bygge om innvendig, akkurat
  som med egne bygg.
- **Rive hele huset** som i dag – men nå etasje for etasje, ovenfra, og du kan stoppe når du har nok.

### 5.5 Bygge selv – helt fra grunnen

Byggesettet blir **versjon 3**, med de samme delene som husene i kartet:

- **Rutenett** på 1,2 m (halvparten av i dag), så vegger kan stå tettere og rom bli mindre. Større ting (haller) kan bygges på et
  grovere rutenett på 4,8 m med ett trykk.
- **Flere etasjer:** opptil fire etasjer for egne bygg (forslag), med trapper, og loft under saltak.
- **Stoff per del:** tre (billig, raskt, brenner), mur (sterk, tung), betong (sterkest, tregest), stål og blikk for haller.
- **Store spenn:** et tak eller dekke over et rom bredere enn 6 m (tre) / 12 m (stål) / 9 m (betong) trenger søyler eller bjelker. Slik
  får fabrikkhallen søylerader – fordi det må til, ikke bare for pynt.
- **Rom regnes ut selv** (som i dag): lukket rom med tak og dør. Spillet ser hva rommet brukes til ut fra det som står i det: senger =
  sovesal, komfyr og benk = kjøkken, maskiner = verksted eller fabrikk.
- **Maler:** et ferdig hus (hytte, brakke, hall, fabrikk) er bare en mal av deler. Du kan legge den ut og bygge om etterpå, eller lagre
  ditt eget bygg som mal.

### 5.6 Fabrikken du bygger selv

Med dette blir maskinene i kapittel 4 noe du **plasserer inne i et bygg**, ikke egne bygg:

- **Maskinplassering:** sagbruket er en sagbenk, et innmatingsbord og en utmating med et fotavtrykk (f.eks. 3,6 × 9,6 m). Det må stå på
  et gulv som tåler det (betong for de tyngste), med plass rundt (en ruteramme der folk går).
- **Flyt:** tømmeret kommer inn en port, plankene går ut en annen. Står maskinene i riktig rekkefølge (inn → sag → høvel → ut), går det
  raskere (forslag: +15 %). Står de hulter til bulter, går det saktere. Ingen transportbånd i første omgang – folkene bærer.
- **Lys:** lamper (lysrør, lyskastere) bruker strøm og lyser opp et område. Uten lys arbeider folk 40 % saktere om natta. Vinduer og
  takvinduer gir lys om dagen gratis.
- **Strøm:** maskiner og lamper kobles til leirens strøm (som i dag, men per bygg: en kabel fra et aggregat, en fyrkjele eller nettet).
  Strømmen per bygg vises i Leir-menyen.
- **Tak og varme:** en maskin under åpen himmel slites dobbelt så fort, og om vinteren arbeider folk saktere uten varme. Et ordentlig
  bygg lønner seg altså.
- **Lager inni:** hyller og paller er lagerplass i bygget (i stedet for egne lagertelt).

### 5.7 Kamp og ødeleggelse med vegger

- **Dekning per vegg:** tre stopper lite, mur og betong mye. Et lag i et hus får vern etter veggene mellom seg og fienden, ikke en fast
  faktor.
- **Skudd og sprengning lager hull.** En granat river en lett vegg, sprengstoff en bærende. Et hus kan rase delvis.
- **Inngang:** fienden går inn der det er dører og ødelagte vinduer. Barrikader holder dem ute en stund.
- **Synsfelt:** fra et vindu i 3. etasje ser du lenger (høyden teller, som i terrenget i dag).

### 5.8 Slik vises det

- **I 2D:** når du zoomer inn på et hus (nærmere enn ca. 1 m per punkt), vises **plantegningen** – vegger, dører, vinduer, møbler – for
  én etasje om gangen, med en etasjevelger (Kjeller, 1, 2, Loft). Riving, åpninger og barrikader gjøres her med trykk. Alt i dette
  kapittelet kan altså spilles i 2D.
- **I 3D:** langt unna er husene som i dag (én kropp, få trekanter). Nær (innen ca. 40 m) og for alle hus du har endret, bygges huset av
  modellen: vegger med hull, gulv, trapper, møbler. Inne ser du bare din egen etasje; de over er skjult.
- **Ytelse:** bare noen få hus er «nære» om gangen (som interiøret i dag: høyst 10), og de bygges litt om gangen mellom bildene (`pust`),
  så det ikke hakker.

### 5.9 Det vanskelige

Dette er det mest krevende i hele planen, og det er greit å si det rett ut:

- **Flere etasjer i 3D:** trapper, dekker og loft må passe med taket utenfra. Første versjon kan ha rette trapper i et trapperom og
  enkle loft.
- **Skjeve hus:** mange omriss i kartet er ikke rettvinklede. Veggene må følge omrisset, og rutenettet inne må tilpasses (slik
  interiøret gjør i dag ved å klippe mot omrisset).
- **Høyhus:** et bygg på 30 etasjer får ikke alle etasjene med innhold. Forslag: bare de seks nederste etasjene og den øverste kan gås
  inn i; resten er stengt («trapperommet er sperret»).
- **Testene:** reglene (etasjer fra høyde, planløsning, bærende vegger, ras, spenn) skrives uten DOM og testes i Node på tusenvis av
  prøvehus, slik interiøret testes i dag (504 prøvebygg).

## 6. Varekontrakter

Kontraktene i dag er oppdrag (eskorte, hold, rydd, hent). Planen legger til **leveranser**, som binder produksjonen til kontraktene:

- **Lever** – «Storlia Tømmer kjøper 40 m³ planker, levert ved Otta innen 3 døgn.» Engangslevering.
- **Leveranseavtale** – «Dalsnes Kraftlag kjøper 20 m³ ved hvert døgn i 14 døgn.» Fast pris, bot når du ikke leverer, bonus til
  slutt hvis alt ble levert. Gir trygg inntekt, men binder produksjonen.
- **Kjøpsavtale** – du kjøper tømmer, korn eller diesel til fast pris i en periode. Trygt når prisene stiger (inflasjon),
  dyrt når de faller.
- **Ordre fra byer** – byer med avtale bestiller det de trenger (ved om vinteren, planker etter et angrep, mat i krise).

Leveranser må **fraktes**: varene kjøres langs vegnettet (som eskorte i dag), og ruta kan trues. Slik møtes økonomien og krigen.
Du kan også sette en annen til å frakte (Gråfjell Frakt tar 15 % og risikoen).

Fristen regnes med den ekte ruta, som kontraktene alt gjør i dag («marsj ca. 21 km, ca. 6 t»). Tilbudene sier hva du har på lager
og hva maskinene rekker: «Du har 12 m³, sagbruket gir 26 m³ per døgn – rekker det.»

## 7. Samarbeid med andre selskaper

Firmaene blir egne aktører med et **register** (ny fane i Selskapet):

- Hvert firma har **bransje**, **hjemsted** (et tettsted), **økonomi** (frisk, presset, konkurstruet), **behov** og **holdning** til
  deg (0–100, som byenes tillit).
- Nye firmaer dukker opp i byer du har avtale med, og firmaer går konkurs når krigen går dårlig rundt dem.

Måter å samarbeide på:

| Samarbeid | Hva det er | Fordel | Risiko |
|---|---|---|---|
| **Fast kunde** | firmaet gir deg førsterett på sine kontrakter | flere og bedre tilbud | du må si ja ofte nok |
| **Felles anlegg** | dere eier et sagbruk eller mottak sammen | halv pris, delt overskudd | dere må enes; firmaet kan selge sin del til en rival |
| **Rammeavtale for vern** | du vokter firmaets anlegg og ruter | fast betaling | angrep på dem blir ditt problem |
| **Våpenhvile med en rival** | Ravnsund eller Mosevakt: ikke angrip hverandre i et område i N døgn | ro til å bygge | de kan bryte den – og du kan |
| **Allianse med en rival** | felles fiende (den andre rivalen) | delt etterretning, felles angrep | den sterkeste tar mest til slutt |

Svik er en del av spillet: å bryte en avtale gir en gevinst nå og koster rykte («pålitelig») hos alle som får vite det.

## 8. Investere i andre selskaper

Når selskapet har penger til overs (nivå 3, Etablert), kan du **kjøpe andeler** i firmaene:

- Hvert firma har en **verdi** (regnet av inntekt, eiendeler og hvor trygt hjemstedet er) og 100 andeler.
- **Utbytte** hver uke (7 spilldøgn) etter firmaets resultat.
- **Innflytelse:** 10 % gir rabatt (5 %) og innsyn i kontraktene deres; 25 % gir førsterett; over 50 % eier du firmaet – det blir
  en del av selskapet, med anleggene og folkene sine.
- **Verdien følger krigen.** Beskytter du hjemstedet, stiger den. Tar Ravnsund byen, faller den. Investeringen gir deg en grunn til å
  forsvare noe annet enn leiren din.
- **Rivalene investerer også.** Kjøper Mosevakt seg opp i Storlia Tømmer, mister du tømmeret ditt. Et kappløp om andeler er en ny
  form for krig uten skudd.

## 9. Investorer og svartebørsen

Det siste trinnet: selskapet får eiere utenfra. Det gir store penger – og noen å svare til.

### 9.1 Private investorer først

Fra nivå 3 kommer det **henvendelser**: en utenlandsk rederi-eier, et svensk sikkerhetsfirma, et anonymt fond. De tilbyr penger for en
andel (f.eks. 8 mill. kr for 10 %), eller et **lån** med rente. Hver investor har et **ønske**: avkastning, ro i et område, at du
holder deg unna en bestemt rival, eller at du tar en bestemt kontrakt. Ønskene blir oppdrag i Neste-lappen.

### 9.2 Notering på svartebørsen

Fra nivå 4 (Ettertraktet) kan selskapet **noteres** på en internasjonal svartebørs. Forslag til navn: **Gråbørsen** (etter Grålungen)
– en oppdiktet handelsplass der private militærselskaper, smuglere og skyggefond kjøper og selger.

- **Noteringen:** du velger hvor stor del du selger (10–40 %). Pengene kommer i kassa på én gang. Du må beholde over 50 % for å styre.
- **Kursen** flytter seg hvert døgn: opp ved leverte kontrakter, nye byer, god drift og seire; ned ved brudd, tap av byer, angrep på
  leiren og dårlige rykter. Et lite kursdiagram i Selskapet viser 30 døgn.
- **Utbytte:** eierne venter noe hver uke. Betaler du ikke, faller kursen og investorene blir urolige.
- **Emisjon:** du kan selge nye aksjer for mer penger – men eier en mindre del.
- **Tilbakekjøp:** går det godt, kan du kjøpe aksjer tilbake og få mer kontroll.
- **Rivalene på børsen:** Ravnsund og Mosevakt er også notert. Du kan kjøpe aksjer i dem – og de i deg. **Fiendtlig oppkjøp:** eier
  en rival over 50 % av et selskap, tar de det over. Det kan være slik du vinner – eller taper – spillet.
- **Aktive eiere:** en eier med over 15 % får stemme. De kan kreve en ny leder i en tropp, en kontrakt de tjener på, eller at du
  selger et anlegg. Du kan si nei – det koster kurs.

Svartebørsen har også en mørk side: **innsidehandel** (kjøp før du gjør noe stort), **ryktespredning** om rivaler, og sjeldne varer
(den gamle svartebørsen i `region.js` flyttes hit). Alt er valgfritt og har en pris i rykte.

## 10. Eksport

Kronen er nesten verdiløs etter Kronekrakket. Eksport gir **utenlandske penger** som holder verdien – det er den store gulroten.

- **Ut sjøveien:** fra en havn (kaiene i `kaier.js`, båtene i `sjo.js`). Store havner tar store laster; du må kontrollere havnen eller
  ha avtale med byen.
- **Ut over grensa:** grensestasjonene mot Sverige og Finland (riksgrensa finnes i spillet). Krever en avtale med «grensevakta» (et
  oppdiktet svensk selskap) – eller smugling.
- **Eksportpriser** er høyere og mer stabile enn hjemme, men en **eksportordre** kommer med mengde og frist («Kjøper i Hamburg vil ha
  200 m³ planker innen 10 døgn»).
- **Valuta:** eksport betales i «eurokreditt» (en egen valuta), som ikke taper seg med inflasjonen. Den kan veksles til kroner, eller
  brukes til ting som bare finnes ute: helikopterdeler, bedre radioer, ammunisjon av høy kvalitet.
- **Risiko:** pirater og rivaler på sjøen, toll ved grensa, og investorene som liker at du eksporterer (kursen stiger).

Tømmer og planker er det første (det brukeren nevnte). Etter hvert: frossen fisk, pukk, stål og diesel.

## 11. Andre mekanikker som passer inn

Kortere idéer som kan komme når grunnen over står. Hver av dem er et eget, lite valg:

- **Lån og gjeld:** bank i en by du har avtale med (lav rente), eller en lånehai (høy rente, men alltid ja).
- **Forsikring:** betal Gråfjell Frakt eller en investor for å dekke tap av en last.
- **Etterretning og sabotasje:** send en speider for å se rivalens sagbruk; spreng det eller kjøp det.
- **Streik:** folk som har fått for lite lønn eller for mye arbeid, legger ned arbeidet. Henger sammen med lønna som finnes.
- **Avisa:** en enkel lokalavis hver morgen med det som har skjedd (rykte, byer, børs) – ser godt ut i dagboka og gir stemning.
- **Korrupsjon:** bestikk et byråd eller en grensevakt. Raskt, men det kommer ut.
- **Depoter:** små lager langs handelsruta, så du ikke må kjøre helt hjem.
- **Sesonger:** hogst er best om vinteren (frossen mark), fiske om høsten, ved selges dyrt i kulda. Vær og årstider finnes alt.

## 12. De seks forbedringene

Dette må komme **først**, fordi alt det nye legger seg oppå det som er i dag:

1. **Ro i skjermen, særlig på telefon.** Ett panel om gangen, færre meldinger, tall som står stille. Alt nytt i denne planen samles i
   **ett** nytt panel, «Selskapet», med faner: Oversikt, Produksjon, Kontrakter, Byer, Partnere, Eiere. Ikke nye knapper i raden.
2. **Én tydelig vei.** Neste-lappen viser alltid ett neste steg. Kontraktene leder videre: første kontrakt → bygg leiren → tømmerkontrakt
   → sagbruk → første byavtale → første investor. Målene i Mål følger de fire trinnene i kapittel 1.
3. **En økonomi med valg hele spillet.** Hver post i dagboka er et valg du har tatt: folk på sagbruket eller på vakt, leveranseavtale
   eller markedspris, eksport eller byggematerialer, utbytte eller vekst. Det skal aldri være én riktig vei.
4. **Fienden som ekte motstander.** Ravnsund og Mosevakt bruker **de samme reglene**: de får byavtaler, bygger sagbruk, tar kontrakter,
   investerer og er notert. Du ser det på krigskartet og børsen. De kan slås med våpen, med pris og med penger.
5. **Lyd.** Lydene er laget i koden (Web Audio, ingen lydfiler) og gjelder bare 3D i dag. Planen: lyd også i 2D – radio med sprak når
   lag melder, alarm ved angrep, kassaapparat ved betaling, sag og motor fra maskinene i leiren, telefonen som ringer når en by eller
   investor tar kontakt. Alt dempet og av/på i ☰.
6. **Den første halvtimen.** Startskjerm, leir, første kontrakt, ett angrep – og så det første glimtet av mer: «Storlia Tømmer har hørt
   om dere.» Spilleren skal vite hva neste mål er etter ti minutter, og se hele veien foran seg etter tretti.

## 13. Rekkefølgen

Hver fase kan spilles ferdig før den neste begynner, og hver har egne tester (regler uten DOM) og vakter, som resten av spillet.

| Fase | Innhold | Omfang (forslag) | Bygger på |
|---|---|---|---|
| **Ø0 – Ro og start** | punkt 1, 2 og 6: panelet Selskapet, Neste-lappen etter trinnene, første halvtime | 1–2 runder | det som finnes |
| **Ø1 – Varer og sagbruk** | tømmer/planker, sagbruk, vedkløyver, fyrkjele, tømmerbil | 2–3 runder | ressurser.js, leir.js, folk.js |
| **Ø2 – Varekontrakter** | lever, leveranseavtale, kjøpsavtale, frakt langs vegen | 1–2 runder | selskap.js, kjoretoy.js |
| **Ø3 – Byene på laget** | tillit/frykt/behov, byråd, de fire avtalene, forhandling, byer som ber om hjelp | 2–3 runder | region.js, garnison.js, strategi.js |
| **Ø4 – Lyd i 2D** | punkt 5 | 1 runde | lyd.js |
| **Ø5 – Firmaer og samarbeid** | register, fast kunde, felles anlegg, våpenhvile/allianse | 2 runder | selskap.js, fraksjoner.js |
| **Ø6 – Eksport** | havner og grense, eksportordre, eurokreditt | 2 runder | sjo.js, kaier.js, riksgrense.js |
| **Ø7 – Investere og børsen** | andeler i firmaer, investorer, Gråbørsen, kurs, utbytte, oppkjøp | 2–3 runder | Ø5, dagbok.js |
| **Ø8 – Rivalene gjør det samme** | punkt 4: AI-en bruker alt over | 2–3 runder | alt over |
| **Ø9 – Flere kjeder** | steinknuser, fiskemottak, mølle, raffineri, og kapittel 11 | etter ønske | Ø1 |

Ø8 bør ikke vente til slutt i praksis: hver fase gir rivalene den enkleste utgaven av det nye med en gang (de kan ta byavtaler fra Ø3),
og Ø8 gjør dem smarte.

**Byggesystemet** (kapittel 5) er et eget spor ved siden av, fordi det er stort og berører mye som finnes:

| Fase | Innhold | Omfang (forslag) | Bygger på |
|---|---|---|---|
| **B0 – Modellen** | én beskrivelse av bygg (etasjer, vegger, åpninger, tak, møbler); husene i kartet regnes ut fra omriss, høyde og type; testes på tusenvis av prøvehus – ingenting endres på skjermen ennå | 2–3 runder | interior.js, byggesett.js |
| **B1 – Husene fra modellen** | 3D nær og plantegning i 2D bygges fra modellen (erstatter dagens interiør), 1. etasje | 2 runder | B0, interior3d.js |
| **B2 – Etasjer, loft og kjeller** | etasjer fra høyden, trapper, loft under saltak, kjeller, etasjevelger | 2–3 runder | B1 |
| **B3 – Rive og åpne** | rive vegger, bærende vegger og ras, nye dører/vinduer, glass, barrikader (erstatter «Sikre huset»), lagre bare endringer | 2–3 runder | B2, ressurser.js |
| **B4 – Byggesett 3** | egne bygg med samme deler: 1,2 m-rutenett, opptil fire etasjer, stoff per del, spenn og søyler, maler; leirens ferdige bygg blir maler | 3 runder | B0–B3, leir.js |
| **B5 – Fabrikken** | maskiner, lys, strøm per bygg, flyt inn → ut, lager i hyller | 2 runder | B4, Ø1 |
| **B6 – Kamp med vegger** | dekning per vegg, hull etter skudd og sprengning, inngang via dører og vinduer, sikt fra etasjene | 2 runder | B3, strid.js |
| **B7 – Ta over hus** | et hus i kartet blir del av leiren (utpost, lager, fabrikk) og kan bygges om | 1–2 runder | B3, B4 |

B0–B1 kan gå samtidig med Ø0–Ø2. Dagens interiør og byggesett virker hele veien til den nye utgaven er like god.

En «runde» er én arbeidsøkt som i natt-løkkene (regler, visning, tester, kontroll). Tallene er grove anslag.

## 14. Slik ser det ut

- **2D først.** Alt i planen kan spilles i kartet og panelene. 3D gir bare utseende (maskinene, tømmerstabler, båter i havnen).
- **Panelet Selskapet** (knappen «Selskap» i kommandolinja, tast S): Oversikt (verdi, kassa, kurs, ukas resultat, de tre viktigste
  tingene nå), Produksjon (maskinene som rader: inn → ut, folk, strøm, tilstand), Kontrakter (som i dag, pluss leveranser), Byer
  (hver by med tillit/frykt/behov og avtale), Partnere (firmaene og rivalene), Eiere (aksjer, investorer, børsen).
- **Kartet:** byene får en ring i avtalefargen (kunde, partner, medlem), handelsrutene en tynn strek med varer som går, maskinene et
  lite ikon.
- **Byggene:** zoomet inn i 2D vises plantegningen med etasjevelger (Kjeller, 1, 2, Loft); i 3D bygges husene nær deg av vegger,
  gulv og møbler, og etasjene over deg er skjult når du står inne.
- **Telefon:** panelet er et bunnark med fanene som rad øverst, ett tall per linje.

## 15. Spørsmål til deg

Svarene bestemmer flere av detaljene over. Ingenting bygges før du har sagt ja til en fase.

1. **Tømmer og planker:** skal «tre» i leiren bli planker, slik at hogst gir tømmer som må sages? (Mer realistisk, men et steg til for
   nye spillere.) Eller beholde «tre» og la sagbruket gi høvlede planker til salg?
2. **Byene:** skal det fortsatt gå an å ta en by med makt, eller skal alt gå gjennom avtaler?
3. **Svartebørsen:** liker du navnet «Gråbørsen»? Skal børsen være mot slutten av spillet (nivå 4), eller tidligere?
4. **Oppkjøp:** skal en rival kunne kjøpe opp selskapet ditt (det vil si tape spillet på børsen)?
5. **Eurokreditt:** en egen utenlandsk valuta – eller holder det med at eksport gir mer kroner?
6. **Rivalene:** skal Ravnsund og Mosevakt kunne bli allierte med deg, eller alltid være fiender?
7. **Hvilken kjede etter sagbruket?** Fisk (kyst), stein (bygging), korn/mat eller olje/diesel?
8. **Rekkefølgen:** er det greit å starte med Ø0 (ro og start) og Ø1 (sagbruk), eller vil du ha byene først?
9. **Hvor mye økonomi?** Skal det være et spill der du kan «bare» drive industri en stund, eller skal krigen alltid presse på?
10. **Avisa og byrådslederne:** vil du ha portretter og navn (som karakteren din), eller holde det enkelt?
11. **Bærende vegger og ras:** skal det være ekte (river du feil vegg, raser taket), eller bare en advarsel?
12. **Rutenettet for egne bygg:** 1,2 m (fint, flere trykk) eller beholde 2,4 m som i dag?
13. **Etasjer:** hvor mange etasjer skal du kunne bygge selv (forslaget er fire)? Og skal høyhus i byene kunne gås inn i bare de
    nederste etasjene?
14. **Byggesystemet eller økonomien først?** Begge er store. Forslaget er å starte begge (B0 og Ø0/Ø1) og la dem møtes i fabrikken (B5).
