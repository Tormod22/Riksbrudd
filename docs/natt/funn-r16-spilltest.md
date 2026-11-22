# Spilltest R16-G (22. nov 2026) – funn

Spilt som ny spiller i ca. 1,5 time på testserveren med ekte kartdata (`dev.py`, port 8840, /api/kart fra riksbrudd.vercel.app),
Chromium (Playwright) med programvaregrafikk. PC 1400 × 900 og telefon 390 × 844 (berøring). Sider: **/norge** (leir ved Ålgård
og ved Bryne i Rogaland) og **/dovre-fliser** (verten i flerspillertesten). Flerspiller: tjeneren
`node tjener/riksbrudd-tjener.js --port 8841 --mappe /tmp/verdener`, vert på PC og gjest på telefon, fulgt etter `tjener/LESMEG.md`.

**Merk om testoppsettet:** Playwright setter `navigator.webdriver`, og da står spillet i testmodus (ingen startskjerm, ingenting skjer
av seg selv). For å se spillet slik en ekte spiller ser det, startet jeg Chromium med flagget
`--disable-blink-features=AutomationControlled` (et nettleserflagg, ingen kode i siden). Det er derfor funn 1 ikke fanges av
`test_flerspiller_e2e.js`: den kjører i testmodus.

Alvor: **stopper spillet** · **forvirrer** · **stygt** · **småting**. Ingen kode er endret.

---

## Flerspiller

### 1. Gjesten får aldri se eller styre laget verten gir henne — **stopper spillet**
- Hvor: flerspiller, gjest (prøvd på telefon; gjelder også PC), /dovre-fliser.
- Gjenskap: vert åpner verden (☰ → Spill sammen → Åpne en ny verden), gjesten åpner lenken og trykker «Bli med». Verten velger
  Vaktlaget → «Styres av: Kari Gjest». Verten sender to lag i bildet (`NETT.bildeNå().lag` = «Ola Vert (deg)» og «Vaktlaget» med
  gjestens id), men gjestens `ENHETER` har hele tiden bare ett lag («Ola Vert (deg)»). Vaktlaget dukker opp et øyeblikk og
  forsvinner igjen. Gjesten har derfor ingen lag å trykke på, ingen «Marsjer» og ingen «Stopp» – hele poenget med M2a virker ikke.
- Årsak (sikker): `spill/oppstart-visning.js:419` – tegnekroken «nye lag som modulene legger inn senere (mens startskjermen står),
  gjemmes også» kjører `gjemStart()` når spilleren ikke har startet eget spill (`!S`). Gjesten har ikke lagt en egen leir, så hvert
  bilde fra verten (`brukBilde` i `spill/flerspiller.js:78`) blir tatt ut igjen ved neste tegning (linje 407: alle blå lag som ikke er
  `karakter`). Kjøretøyene (`KJORETOY`) gjemmes på samme måte. `test_flerspiller_e2e.js` fanger det ikke fordi `ekte()` er usann
  i testmodus.
- Bilde: [01-gjest-ser-ikke-laget.jpg](funn-r16/01-gjest-ser-ikke-laget.jpg) (gjesten ser bare vertens figur, merket «(deg)»).

### 2. Gjesten ser vertens figur som «Ola Vert (deg)» — **forvirrer**
- Hvor: flerspiller, gjest.
- Vertens karakterlag heter `navn + ' (deg)'` (`spill/kontrollrom-visning.js:232`), og navnet sendes uendret i bildet
  (`pakkLag`, `spill/flerspiller.js:50`). Hos gjesten står det altså «(deg)» om en annen spiller. Bilde 01.

### 3. Invitasjonslenken uten tunnel inneholder `ws://localhost:8787` — **forvirrer** (virker aldri for en venn)
- Hvor: «Spill sammen»-panelet hos verten (PC).
- Lenken bygges av adressen verten skrev (`localhost`), ikke av adressen tjeneren selv skriver ut («På nettet hjemme:
  http://192.0.2.2:8841»). En venn på samme wifi kommer derfor ikke inn med lenken, selv om panelet sier at den «virker for maskiner
  på samme nett». I tillegg lastes spillet over **https** (riksbrudd.vercel.app), og da blokkerer nettleseren `ws://` til en annen
  maskin – så uten cloudflared virker flerspiller i praksis bare på én og samme PC. Teksten bør si det rett ut (eller lenken bør bruke
  LAN-adressen og panelet forklare https-sperren). Kode: `lenke()` i `spill/flerspiller-visning.js:257`.
- Bilde: [02-vert-styres-av-under-mer.jpg](funn-r16/02-vert-styres-av-under-mer.jpg).

### 4. «Styres av» ligger gjemt under «Mer (3) ▾» i lagpanelet — **forvirrer**
- LESMEG og panelet sier «velg et lag og trykk «Styres av»», men knappen er en av «Mer»-knappene (klassen `gr-mer bakmer`) og
  synes ikke før man trykker «Mer». En ikke-utvikler finner den ikke. Bilde 02 (der «Mer» er åpnet).

### 5. Verten heter «Spiller» når navnefeltet står tomt — **småting**
- Panelet fyller ikke inn karakterens navn, så verten vises som «Spiller (vert)» for alle (også i tjenerens vindu: «vert: Spiller»).
  Kode: `vis()` i `spill/flerspiller-visning.js:262` bruker `N.navn || les().navn` uten å falle tilbake på karakterens navn. Bilde 02.

### 6. Gjestens panel viser «Vær vert» øverst, og navnefeltet står under «Vær vert» — **forvirrer**
- Gjesten som åpner lenken får beskjeden «Skriv navnet ditt og trykk «Bli med»», men feltet «Navnet ditt» står i «Vær vert»-delen
  sammen med «Tjeneren: ws://localhost:8787» og «Åpne en ny verden». Lett å trykke feil knapp. Når lenken er åpnet bør bare «Bli med»
  (med navnefelt) vises. Bilde: [03-gjest-lenke-panel.jpg](funn-r16/03-gjest-lenke-panel.jpg).

### 7. Gjesten har en enslig «Lagre»-knapp nederst, og fartsknappen viser «1×» når verten kjører 10× — **småting**
- Gjesten har ikke eget spill, men kommandolinja viser bare «Lagre». Fartsknappen sto på «1×» mens `tempo` hos gjesten var 10
  (fulgte verten). Bilde: [14-gjest-verten-borte.jpg](funn-r16/14-gjest-verten-borte.jpg).

### 8. Avvist vert ser «Du er vert» uten kode — **forvirrer**
- Gjenskap: verten mister forbindelsen brått (nettleseren krasjet) og åpner siden igjen før tjeneren har merket det (tidsavbruddet er
  60 s, `TIDSAVBRUDD_MS` i `tjener/riksbrudd-tjener.js:29`). Tjeneren svarer «Verden har alt en vert.» Panelet viser da overskriften
  «DU ER VERT», ingen kode og ingen lenke – og `vertNå` i `riksbrudd-nett` blir satt til false, så neste omlasting åpner ikke verden av
  seg selv. Det burde stå «Verden er fortsatt opptatt – prøv igjen om et minutt» og prøves igjen av seg selv.
- Ellers virket: verten laster siden på nytt → verden åpnes igjen etter ca. 2 s, gjesten får «verten er borte» og så «Ola er med i
  verden»; verten lukker fanen → gjesten får «Verten er borte – verden står stille». Meldinger fra gjesten kom fram til verten.

---

## Start og leir

### 9. Leiren kan legges inne i et tettsted (avstanden vises som «0 m») — **stopper spillet**
- Hvor: PC, /norge (Rogaland). Steg 3 sier «ikke inne i et tettsted», men leiren ble godtatt ca. 1 km øst for Ålgård sentrum med
  faktalinja «Ålgård/Figgjo 0 m». Etterpå sto lagene «i Ålgård/Figgjo», og troppen som ble laget i leiren, gikk rett i kamp med
  bygdevernet (14 mann) noen hundre meter fra leiren; lagføreren falt innen en spilltime (funn 10).
- Årsak: avstanden måles til tettstedets **omsluttende rektangel** (`b.bb`), ikke selve omrisset
  (`spill/oppstart-visning.js:359`), og leirvalget sjekker ikke om stedet ligger inne i tettstedets omriss (`Garnison.inni`).
- Bilder: [04-leir-i-tettsted-0m.jpg](funn-r16/04-leir-i-tettsted-0m.jpg), [05-kamp-ved-leiren.jpg](funn-r16/05-kamp-ved-leiren.jpg).

### 10. Spillet kan ikke spoles mens et lag er i kamp – og kampen her varte og varte — **forvirrer**
- Etter funn 9: 600× ble satt tilbake til 1× av seg selv (automatisk nedbremsing ved ildkamp, `spill/flyt.js`), uten at det sto
  hvorfor ved fartsknappen. Klokka gikk fra 06:55 til 07:18 på to minutter. Leiren hadde bare 2 personer igjen (8 i troppen), så
  ingenting skjer i leiren heller. Bilde: [06-laast-paa-1x.jpg](funn-r16/06-laast-paa-1x.jpg).
- Merk også: lagpanelet sa «ingen radiokontakt» for en tropp 600 m fra leiren (håndradio 3 km) – trolig terrenget, men det er ikke
  forklart i panelet.

### 11. «grunnen: flat» mens kartet rundt flagget er rødt (for bratt) — **forvirrer**
- PC, /norge, høyfjell nær Bykle. Faktalinja sa «grunnen: flat», mens fargene rundt flagget stort sett var røde. Teksten gjelder bare
  akkurat flagget (`spill/oppstart-visning.js:373`). Bilde: [07-grunnen-flat-men-rodt.jpg](funn-r16/07-grunnen-flat-men-rodt.jpg).

### 12. Bygg kan settes midt på en veg, med 4 m grunnmur — **stygt**
- PC: brakka ble godtatt oppå bilvegen ved leiren («skrå grunn: 4 m grunnmur»). Vegene er ikke hindringer i `kanBygge`.
  Bilde: [08-brakke-paa-vegen.jpg](funn-r16/08-brakke-paa-vegen.jpg).

### 13. Tre grunnbygg tar 43 % av startpengene — **forvirrer** (balanse)
- Brakke 5 mill., dieseltank 3,7 mill. og aggregat 8,4 mill. = 17,1 av 40 mill. kr. Aggregatet koster mer enn brakka og dieseltanken
  til sammen. En stormtropp med utstyr tok resten ned til 22,4 mill. Med «ingen fast inntekt» føles det farlig å bygge mer.

### 14. Stormtroppen tar 8 av 10 personer – leiren står med 2 — **forvirrer**
- Forslaget «Stormtropp (8)» lar bare to bli igjen (det sies i panelet), men resultatet er at byggingen nesten stopper (ett byggelag,
  tre bygg i kø) og Folk-varselet blir rødt. Det bør advares tydeligere før «Opprett» når køen er lang.

---

## Tropper og ordre

### 15. Troppen settes om bord i lastebilen av seg selv, og «Marsjer» virker da ikke — **forvirrer**
- PC: skjemaet sto på «Kjøretøy: Til fots», men troppen ble «om bord i 1. lastebilkolonne». Lagpanelet viser «Marsjer» som første
  knapp; trykk i kartet gir bare «Stormtropp 1 sitter i 1. lastebilkolonne: gi kjøretøyet ordre, eller la troppen gå av først».
  Enten bør «Marsjer» være borte mens troppen sitter på, eller ordren bør gå til kjøretøyet. (Malen «Stormtropp» velger trolig
  kjøretøyet selv; da må valglista vise det.)

---

## 3D og gå selv

### 16. «Gå» trykket mens 3D bygges, blir glemt — **forvirrer**
- PC: knappen «Gå» står synlig og kan trykkes mens kortet «Bygger 3D … 60 %» står. Trykket gjør ingenting; når 3D er klart, er du
  fortsatt i lufta. Bør enten huskes eller knappen være grå til 3D er klart.
  Bilde: [10-ga-under-bygging.jpg](funn-r16/10-ga-under-bygging.jpg).

### 17. Helikopteret står inne i byggeteltene — **stygt**
- PC, leiren i 3D (tredjeperson, «V»): teltene fra byggeplassen (byggeplass3d) står oppå/inntil helikopteret.
  Bilde: [09-helikopter-i-telt.jpg](funn-r16/09-helikopter-i-telt.jpg).

### 18. Telefon i 3D: liten boks med bare «m» øverst til høyre, og grafikkvarselet midt i bildet — **stygt**
- Telefon, /norge, første 3D-bilde: en avkuttet lapp med teksten «m» ved minikartet (trolig avstandsteksten til kompasset/navnet som
  ikke får plass), og «3D går tregt»-lappen dekker venstre halvdel av midten. Bilde: [11-mobil-3d-m-boks.jpg](funn-r16/11-mobil-3d-m-boks.jpg).

---

## Grensesnitt

### 19. Opplæringslinja dekker bunnen av tropppanelet på telefon — **småting**
- Telefon: «✓ Bygg en brakke» ligger over nederste del av «Lag ny tropp» (lista under «Opprett troppen» er delvis skjult).
  Bilde: [12-mobil-tropper-opplaering.jpg](funn-r16/12-mobil-tropper-opplaering.jpg).

### 20. Hogstfeltets lapp ligger under loggen øverst til høyre — **småting**
- PC: «hogst 3 % · 0,8 t haug» og den stiplede sirkelen ligger bak logglappene. Bilde: [13-hogstlapp-under-logg.jpg](funn-r16/13-hogstlapp-under-logg.jpg).

### 21. Feil i konsollen ved hver lasting: OffscreenCanvas med ugyldig størrelse — **småting** (kan skjule en ekte feil)
- Hvor: PC og telefon, /norge, med lagret spill. Ved nesten hver omlasting: `TypeError: Failed to construct 'OffscreenCanvas':
  Value is outside the 'unsigned long' value range` fra `oppdaterSikt` (`index.html:1072` → `lerret` i `kartflis.js:109`).
- Årsak (trolig): `w = i1 − i0 + 1` eller `h` blir 0 eller negativ når laget ligger utenfor vinduet `lagVindu` returnerer (tidlig i
  lastingen, før kartdataene er klare), eller r er NaN. Når jeg regnet sikten for alle lag etter 9 s, var alt i orden. Siktfeltet for
  det laget blir da ikke tegnet før neste flytting. En sjekk `if (w < 1 || h < 1) return` (og nytt forsøk) ville fjerne den.

---

## Det som virket bra
- Startskjermen (tre steg) er tydelig på både PC og telefon; advarslene i leirvalget (høyfjell, avstand til veg/tettsted, kai) er nyttige.
- Bygging med skisse, pris og byggetid; ressurslinja og Leir-menyen er lette å lese.
- 3D ved leiren og gange i første- og tredjeperson ser bra ut (byggestillas, flagg, folk, blomster).
- Krigskartet gir god oversikt med «Neste trekk» og forklart krav (mann, bygdevern).
- Flerspiller: tilkobling, kode, meldinger, vertens omlasting og «verten er borte» virket.
