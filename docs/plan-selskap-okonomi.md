# Plan: selskapet, byene og økonomien

28. november 2026. Brukeren: «vi spiller jo som en privatmilitær organisasjon, og prøver å få med byer på laget … selskaper kan
investere i organisasjonen, vi blir børsnotert på en internasjonal svartebørs … vi kan investere i andre selskaper selv, samarbeide,
lage kontrakter for tømmer, eksportere tømmer, maskiner som raffinerer tømmer til planker … Kan du lage en plan for dette?»

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

### 4.3 Det som gjør det til valg

- **Kjedene henger sammen:** flis fra sagbruket fyrer kjelen, kjelen gir strøm til sagbruket. Du kan bygge deg ut av dieselen – men
  det tar plass, folk og tid.
- **Folk er knappe:** tre på sagbruket er tre som ikke står vakt. Lønna gjør hver arbeider til et valg.
- **Maskinene slites** (hp synker med drift). Verkstedet reparerer, ellers stopper maskinen. Røvere og rivaler går gjerne etter dem.
- **Lagerplass** (som i dag) og **frakt** betyr noe: en tømmerbil (ny kjøretøytype, 20 m³) frakter fra hogstfeltet og til kunden.
- **Kvalitet:** dyktige folk (ferdighet over 1,2) gir 10 % bedre utbytte. Ferdighetene får en mening i fred, ikke bare i krig.
- **I 2D** er maskinene vanlige bygg med et lite tall over seg (som kW og senger i dag): «1,1 m³/t». I 3D kan sagbruket få en egen
  modell med tømmerstabler og flishaug (valgfritt, ikke nødvendig for å spille).

## 5. Varekontrakter

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

## 6. Samarbeid med andre selskaper

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

## 7. Investere i andre selskaper

Når selskapet har penger til overs (nivå 3, Etablert), kan du **kjøpe andeler** i firmaene:

- Hvert firma har en **verdi** (regnet av inntekt, eiendeler og hvor trygt hjemstedet er) og 100 andeler.
- **Utbytte** hver uke (7 spilldøgn) etter firmaets resultat.
- **Innflytelse:** 10 % gir rabatt (5 %) og innsyn i kontraktene deres; 25 % gir førsterett; over 50 % eier du firmaet – det blir
  en del av selskapet, med anleggene og folkene sine.
- **Verdien følger krigen.** Beskytter du hjemstedet, stiger den. Tar Ravnsund byen, faller den. Investeringen gir deg en grunn til å
  forsvare noe annet enn leiren din.
- **Rivalene investerer også.** Kjøper Mosevakt seg opp i Storlia Tømmer, mister du tømmeret ditt. Et kappløp om andeler er en ny
  form for krig uten skudd.

## 8. Investorer og svartebørsen

Det siste trinnet: selskapet får eiere utenfra. Det gir store penger – og noen å svare til.

### 8.1 Private investorer først

Fra nivå 3 kommer det **henvendelser**: en utenlandsk rederi-eier, et svensk sikkerhetsfirma, et anonymt fond. De tilbyr penger for en
andel (f.eks. 8 mill. kr for 10 %), eller et **lån** med rente. Hver investor har et **ønske**: avkastning, ro i et område, at du
holder deg unna en bestemt rival, eller at du tar en bestemt kontrakt. Ønskene blir oppdrag i Neste-lappen.

### 8.2 Notering på svartebørsen

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

## 9. Eksport

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

## 10. Andre mekanikker som passer inn

Kortere idéer som kan komme når grunnen over står. Hver av dem er et eget, lite valg:

- **Lån og gjeld:** bank i en by du har avtale med (lav rente), eller en lånehai (høy rente, men alltid ja).
- **Forsikring:** betal Gråfjell Frakt eller en investor for å dekke tap av en last.
- **Etterretning og sabotasje:** send en speider for å se rivalens sagbruk; spreng det eller kjøp det.
- **Streik:** folk som har fått for lite lønn eller for mye arbeid, legger ned arbeidet. Henger sammen med lønna som finnes.
- **Avisa:** en enkel lokalavis hver morgen med det som har skjedd (rykte, byer, børs) – ser godt ut i dagboka og gir stemning.
- **Korrupsjon:** bestikk et byråd eller en grensevakt. Raskt, men det kommer ut.
- **Depoter:** små lager langs handelsruta, så du ikke må kjøre helt hjem.
- **Sesonger:** hogst er best om vinteren (frossen mark), fiske om høsten, ved selges dyrt i kulda. Vær og årstider finnes alt.

## 11. De seks forbedringene

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

## 12. Rekkefølgen

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
| **Ø9 – Flere kjeder** | steinknuser, fiskemottak, mølle, raffineri, og kapittel 10 | etter ønske | Ø1 |

Ø8 bør ikke vente til slutt i praksis: hver fase gir rivalene den enkleste utgaven av det nye med en gang (de kan ta byavtaler fra Ø3),
og Ø8 gjør dem smarte.

En «runde» er én arbeidsøkt som i natt-løkkene (regler, visning, tester, kontroll). Tallene er grove anslag.

## 13. Slik ser det ut

- **2D først.** Alt i planen kan spilles i kartet og panelene. 3D gir bare utseende (maskinene, tømmerstabler, båter i havnen).
- **Panelet Selskapet** (knappen «Selskap» i kommandolinja, tast S): Oversikt (verdi, kassa, kurs, ukas resultat, de tre viktigste
  tingene nå), Produksjon (maskinene som rader: inn → ut, folk, strøm, tilstand), Kontrakter (som i dag, pluss leveranser), Byer
  (hver by med tillit/frykt/behov og avtale), Partnere (firmaene og rivalene), Eiere (aksjer, investorer, børsen).
- **Kartet:** byene får en ring i avtalefargen (kunde, partner, medlem), handelsrutene en tynn strek med varer som går, maskinene et
  lite ikon.
- **Telefon:** panelet er et bunnark med fanene som rad øverst, ett tall per linje.

## 14. Spørsmål til deg

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
