# Nattrapport 18. november 2026 (02:00–08:00)

Alt ligger på grenen `claude/nattfiks`. **Ingenting er publisert.** Detaljene for hver pakke står i `docs/natt/<pakke>.md`.

## Kontroll
- Regeltestene: alle grønne etter hver fletting.
- Mobilkontrollen (hele `sjekk.js`): 112 godkjente, én feil som ble rettet etterpå.
- PC-kontrollen (hele `sjekk.js`): 112 godkjente, én feil i graving-vakten. Årsaken var kontrollen selv (laget var drept av en tidligere vakt); vakten er rettet, men ikke kjørt på nytt.
- Ingenting er prøvd i ekte Safari på iPhone. All 3D er bare sett med programvare-grafikk.

## Femti forbedringer (uten Y-tasten)
| Område | Status |
|---|---|
| Knapphet: start uten ferdige lag, 40 mill. kr, tomme hyller, kjøp dyrere enn hogst/riving | Gjort. Balansen er for hard de første døgnene (se under) |
| Diesel og olje | Ikke slått sammen; kan veksles, forklart i Region |
| Seier fører videre / tap gir utpost / krigsmål etter kapittel 4 | Gjort |
| Spol til neste hendelse, automatisk nedbremsing, marsjtid før ordre, køordre, flere lag | Gjort (marsjtid på telefon via bekreft-trinn) |
| Lagre fiendens lag, minne, stillinger, ordre i gang | Gjort (pågående røverbølge lagres ikke) |
| Retning/flanke, formasjon gir fart, erfaring per ildrunde, «hvorfor laget gjorde det» | Gjort |
| Dekning i hus, roller for stridsvogn/artilleri, sårede bæres, fanger og overgivelse | Gjort |
| Fiendens førere og væremåte, røvere som varierer, fienden bruker flere kjøretøy | Gjort (fienden kjører ikke på telefon) |
| Folk som personer (ansikt, historie, ønsker), krangler og flere hendelseskort, forfall i flere trinn | Gjort |
| Rom i byggesettet kan bli kjøkken/lager/verksted, kameravarsel med knapp, folk ved byggene i 3D | Gjort (folk står ved, ikke i, byggene) |
| Behov ute, tilflukter med lager og søvn, dekning når du skyter, ferdigheter åpner evner | Gjort |
| Opplæring i spillet, telefonens fliser og kommandolinje, én rad fliser, forklaring på flisene | Gjort |
| Våpenruta fri av minikartet, kort logg, byggekort, minikart i 2D, ett merkesett, færre kartmerker | Gjort |
| Stopp kjøretøy ved fylkesgrensa på Rogaland | Gjort for kolonner og båter; «kjør selv» ikke prøvd. Mørklegging i 3D ikke gjort |
| Fjern hakket ved nytt utsnitt | Ikke gjort |
| Del kontrollen i raske og trege deler | Delvis: vakter i egne filer |

## Femti nye ideer
| Ideer | Status |
|---|---|
| 1–6 Sjøen: båter, havner, fiske, landgang, sperring, ferjer | Gjort og prøvd på Rogaland (også kjøretøy om bord) |
| 7–12 Region: tettsteder gir varer, handelsruter, skatt/lojalitet, strøm, svartebørs, gjenoppbygging | Gjort og prøvd på Rogaland |
| 13–20 Samfunn: flyktninger, spesialister, barn og gamle, Grålungen, lover, forrædere, opplæring, begravelser | Gjort; balanse prøvd over 18 døgn med tilfeldige valg |
| 21–30 Krig: etterretning, natt, artilleri, røyk/lys/støy, bakhold, beleiring, våpenhvile, bygdevern, helikopter, droner | Gjort; noe bare prøvd på testsiden |
| 31–38 Verden: vinter, flom og ras, jakt, åker, brann, funn, radio, tog | Gjort og prøvd på Rogaland |
| 39–44 Karakteren: historie, skader, håndverk, hund, sniking, kartslør | Gjort; tilflukt og leting prøvd i ekte hus |
| 45, 46, 49, 50 Scenarier, utfordringer, etterspill, vanskelighetsgrad | Gjort |
| 47 To spillere i samme region | Delvis: dele leir og stilling som lenke. Ikke sanntid (krever tjener) |
| 48 Ukentlig felles oppdrag | Delvis: samme oppdrag for alle den uka, resultat som kode. Ingen felles telling |

## Tjue utseendegrep
| Grep | Status |
|---|---|
| 3, 5, 10–14 Trær, gress, figurer, støv/spor, kampeffekter, ødeleggelse, fjern skog | Gjort og flettet inn (+6–10 % trekanter) |
| 17–20 Lysere 2D-kart, merkesett, tegninger i paneler, overganger | Gjort og flettet inn |
| 1, 2, 4, 6–9, 15, 16 Skygger, omgivelsesskygge, skarp bakke, vann, skyer, nattlys, daltåke, fargesetting, kantutjevning | **Laget på egen gren `claude/natt18-lys`, IKKE flettet inn og ikke kontrollert.** Hjelperen stoppet før den var ferdig |

## Det som ikke ble ferdig
- **Lys og skygger** ligger på egen gren (se over). Må flettes og kontrolleres.
- **Balansen de første døgnene** er for hard for en nybegynner (gjennomspillingen på PC: bølgene vokser raskere enn gjengen, røverbytte er hovedinntekten, de fire første byggene tar 39 av 40 mill.). Arbeidet med det ble avbrutt; et uferdig utkast ligger på `claude/natt18-test1`, ikke flettet inn.
- Fra gjennomspillingene, ikke rettet: last på nytt midt i et angrep fjerner røverne; karakteren blir utslitt når du spoler; første hus kan være tomt; «Gå» setter deg der kameraet ser; krigskartet er trangt i liggende format på telefon; hjelpen og opplæringen kommer samtidig første gang.
- Hakk ved nytt utsnitt er ikke arbeidet med.
- Y-tasten (100 mill. kr) ligger fortsatt inne, som avtalt.

---

# Tillegg kl. 10:30 (arbeid 08:30–10:30)

## Kontroll
- **Mobilkontrollen (hele `sjekk.js`) på den endelige versjonen: 115 godkjente, «Alt i orden».**
- PC-kontrollen på versjonen fra 08:30 (uten lys, balanse og telefon runde 2–3): 109 godkjente og ingen feil så langt; den var ikke ferdig kl. 10:20 (maskinen var travel). PC-kontrollen er ikke kjørt på den endelige versjonen.
- Fem feil i selve kontrollen ble rettet (graving-laget var drept av tidligere vakter; kontrollrommet koster nå 9 mill.; 15 grunnmål; knappehøyde og kassa på telefon).

## Gjort
- **Lys og skygger i 3D er nå flettet inn og kontrollert:** skygger fra sola (Høy og Middels på PC, Høy på mobil), omgivelsesskygge ved hus, skarp bakke nært, vann med dybde og skum, skyer i lag, lys på bakken om natta, tåke i dalene, standard fargesetting, kantutjevning og dybdeuskarphet når du går. «Lys og skygger» i ☰ slår alt av. Lav grafikk er ikke tyngre enn før (målt 1,48 mot 1,46 s per bilde i programvare-grafikk). Ingen grafikkfeil.
- **Minnelekkasje rettet:** 3D-flagget ved leiren la igjen ett bilde på grafikkortet for hvert nytt område (fantes fra før).
- **Telefon:** krigskartet og panelene står som sidepanel i liggende format; små iPhoner (SE) rettet; byggekortene i tre kolonner (fanen Bygg fra 3200 til 1800 px); lagpanelet flytter kartet så valgt lag ikke ligger under panelet; opplæringen kommer før hjelpen første gang; ☰-radene 40 px.
- **Balansen de første døgnene** (tallene i `docs/natt/balanse.md`): røverbytte 0,45–1,5 mill. (før 3–7), bølger som vokser med gjengen og dagen, røverlag på 6–12 mann og aldri mer enn dine soldater + 2, første bølge tidligst etter ett døgn, sabotører tidligst fra dag 5, motstanderne holder seg unna leiren de første døgnene, kontrollrommet 9 mill. (før 15), betonghylla 60 m³, nye spill uten stridsvogn og rakettartilleri, brann i leiren slokkes av folk hjemme og skader gradvis, varsel og mål for mat.
- Fra gjennomspillingen: laster du på nytt midt i et angrep, kommer bølgen igjen; du sover i leiren; første hus er aldri tomt; «Gå» i opplæringen starter ved karakteren. (Ikke prøvd i nettleser.)

## Står igjen
- **Leiren overlever fortsatt ikke sju døgn** i den automatiske gjennomspillingen: den sto i fire døgn og falt på dag 6, fordi røverne i bølge 4 ble stående inne i leiren og ingen slo dem, og byggene aldri ble reparert. Neste steg: røvere som har herjet en stund trekker seg med byttet, forsvarerne går mot røvere i leiren, og opplæringen sier «reparer byggene» og «lag en tropp til». Gjennomspillingen laget bare én tropp på fire – en ekte spiller ville gjort mer.
- Ikke sett i ekte Safari på iPhone, og 3D (særlig skyggene) er bare målt med programvare-grafikk: be om «Mål ytelse» med «Lys og skygger» på og av.
- Hakk når et nytt område lastes i 3D er ikke arbeidet med.
- Y-tasten (100 mill. kr) ligger inne, som avtalt.

---

# Runde 4 (18. nov 10:45–13:40, brukeren: «fortsett på lista å utbedre enda mer»)

Sju hjelpere på Opus, hver i sin pakke. Detaljene står under «Runde 4» i `docs/natt/<pakke>.md`. Alt ligger på `claude/nattfiks`.
**Ikke publisert.**

## Gjort
| Pakke | Hva |
|---|---|
| Balanse | Røvere som har herjet 90 min i leiren, tar bytte og går. Røverlag som har mistet en tredel, flykter. Lagene hjemme går mot fiender i leiren av seg selv. Ledige byggelag reparerer mellom bølgene, og «N bygg er skadet – Reparer alle». Opplæringen har fire nye steg. Etter flettingen: motstanderne har fredstid i 7 døgn på Vanlig (før 4), med varsel ett døgn før. |
| Hakk i 3D | Byttet til et nytt område går i biter. I Bergen-målingen gikk summen av lange pauser fra 6,1 til 1,3 s, og den lengste fra 812 til 157 ms. Utsnittene er like før og etter. Skygger fra kjøretøy og soldater er målt og forkastet (nesten tre ganger tregere). |
| Krig | Dekning bak leirens bygg. Fanger kan byttes, settes i arbeid eller rekrutteres, og motstanderen foreslår bytte. Røyk, lys, helikopter og kjøreordrer huskes. Fiendens stillinger vises med sandsekker og figurer i 3D. **Feil rettet:** skjev sikt, ammunisjon brukt uten skudd, radio under våpenhvile, lag som ikke svarte et kjøretøy som skjøt. |
| Folk | Varsler for sykdom, ugravlagte og skader. Én kø for alle kortene. Barn og gamle i 3D og syke. Folk inne i byggene, vakta på tårnet. Spesialister fra oppdrag. Portretter i Folk-panelet. Hunden går og trenger mat. |
| Sjø og økonomi | Krigskartet viser hva et tettsted gir. Handelsruter langs vegene, stengt av sprengte bruer og kratere. Båter med helse kan bordes og senkes, fiendens båter skyter, og fienden bruker båter. Trykk på kaier og båter i 3D. Nærmeste kai i leirvalget. Lavt sjøpanel på telefon. Is stenger innsjøer. |
| Verden og natur | Snø stenger fjellveger, og fienden fryser. Kratere og spor huskes, og felte dyr kommer ikke tilbake. Åkeren er et bygg. Funn vises som 3D-modeller. Regnflom følger dalen. Sotlag på brente hus. |
| Grensesnitt | Paneler oppå hverandre er rettet. Kjøretøy og tettsteder bruker merkesettet. Tegnforklaring og forklaring på flisene. Byggelista som rutenett, og tegning i byggpanelet. Ramme for å velge lag i 3D (Shift + dra; rotering nå med høyre museknapp). Marsjtid i 3D. Etterspillet viser mer. |

## Står igjen
- **Sju døgn:** leiren sto mot røverne i fem døgn, men falt for Kystalliansen på dag 5–6 (gjennomspilling 7 og 8). Fredstiden er nå 7 døgn, men det er ikke spilt gjennom på nytt.
- **Hakk:** trinnet «henter høydene og kartet» er bare litt bedre. Det som står igjen, er søppeltømming og grafikkortet, og det kan bare måles hos brukeren («Mål hakk»).
- **Stridsvogna:** den skyter fortsatt på mål den ikke ser selv, bare fordi vakter, kameraer eller droner har meldt dem.
- **Ikke sett i Safari:** ingenting er prøvd i ekte Safari på iPhone.

## Kontroll (kl. 14:30)
- **Hele `sjekk.js` på den endelige versjonen: PC 115 av 115 og mobil 115 av 115, «Alt i orden».**
- Regeltestene: alle grønne etter hver fletting.
- Tre feil i selve kontrollene er rettet:
  - Tresjekken prøvde 0 trær og sa «ok». Den prøver nå ca. 3260 trær i Dombås-utsnittet.
  - Krig-vakta feilet når fiendelaget tilfeldig fikk en «forsiktig» fører.
  - Folk-vakta målte vakta i tårnet fra midten av tårnet, ikke fra grunnen.
- Skjermbilder av tegnforklaringen og byggelista er sett på PC (1400 px) og telefon (390 px), uten feil på siden.

# Lut og sekk (18. nov kveld)
Brukeren ville finne lut i husene (brunost, matgreier, saft, rifle, ammunisjon …) og ha et inventarsystem som i Project Zomboid.
Laget av én hjelper på grenen `claude/natt18-karakter`, flettet inn i `claude/nattfiks`. Detaljer: `docs/natt/lut.md`.

## Gjort
- **Beholdere i husene:** kjøleskap, kjøkkenskap, garderobe, nattbord, reol, pall, verktøybenk osv. lages av møblene i interiøret.
  Innholdet er fast per møbel og avhenger av hva slags bygg det er (våpen oftest i hytter, medisin på sykehus, mat i butikker).
- **Lutpanelet:** det du bærer til venstre, beholderne og gulvet til høyre. Like ting stables. Telefon: trykk og trykk. Mus: dra og slipp,
  dobbeltklikk, høyreklikk for valg. «Ta alt» og «Legg alt».
- **Vekt og plass:** lommer + sekk på ryggen (fire sekker). Tung last gjør deg tregere og fortere sliten; svært tung last stopper løpingen.
- **Handlinger:** spis, drikk, utstyr, ta på, lad, bruk, legg fra deg, flytt, gi til leiren.
- **Ferskhet:** fersk mat blir gammel og råtten; kjøleskap hjelper bare med strøm.
- **3D:** tingene står på benker og bord, våpen ved garderoben, haug på gulvet der du legger fra deg.

## Står igjen
- Lommelykt, batterier, sovepose og feltflaske har ingen virkning ennå.
- Ingen sekk i sekk. Det som ligger inne i kjøleskap og reoler, synes ikke i 3D.
- Fiender leter ikke i hus, og husene fylles ikke på igjen.

# Runde 5 (18.–19. nov kveld, brukeren: «publiser så forbedre enda mer» og «flyttbare møbler og alt»)
Seks hjelpere, hver i sin pakke. Detaljene står under «Runde 5» i `docs/natt/<pakke>.md`. Flettet inn i `claude/nattfiks`. Maskinen ble
startet på nytt kl. 00:15; hjelperne fortsatte fra det de hadde committet.

## Gjort
| Pakke | Hva |
|---|---|
| Lut og møbler | Alle møbler kan plukkes opp, bæres og settes ned (grønt/rødt spøkelse, roter, innholdet følger med, lagres). Lommelykt med batterier, sovepose, feltflaske. Fiender tømmer hus, butikker fylles på, husene nær leiren har alltid noe. Du stelles av leirens lager når du spoler ved leiren. «Gå» starter ved karakteren. |
| Balanse | Spilt gjennom på nytt: leiren holdt i 9 døgn på Vanlig og mistet et lag. Taket på røverne gjelder hele bølgen, lagene hjemme fyller ammunisjon og hviler, skadde lag går hjem. Et angrep som er i gang, kommer tilbake etter omlasting. Døgnoppgjør hver morgen. |
| Krig | Stridsvogna skyter bare på det den selv (eller et lag rett ved) ser. Fienden kjører også på telefon. Krigskartet kan skjules og passer liggende telefon. Fiendens lastebiler og «sist sett» huskes. |
| Natur | Myke strandkanter med stein- og grussone. Lyng i stedet for stein på heia. Ingen planter inne i hus eller leirbygg. Låvene har høy, redskap og traktor. Lavere tregrense mot vestkysten. |
| Rogaland og hakk | Alt utenfor fylket er mørklagt også i 3D, med stiplet grense. Lengste pause når du går: 0,61 → 0,37 s. Mer forberedes før et nytt område settes inn. |
| Kontrollen | Hele kontrollen tar nå ca. 7 min på mobil og 14 min på PC (før ca. 25 og 60–70 min): 3D bygges uten å tegne hvert bilde underveis, ventetider venter på betingelser, kartfiler leses én gang, tidtaking per linje. `SJEKK_DEL=rask` kjører bare 2D og vaktene (ca. 1 min). Som ny spiller: varsel og stoppkort over alarmen, lagpanelet mens du går, værbrikken og «Velg lag» er rettet. |

## Står igjen
- Ting inne i kjøleskap og reoler synes ikke i 3D. Lykta lyser bare bakken, ikke vegger.
- «Husene lever», «første hus har noe» og soveposen ute er regeltestet, men ikke prøvd i spillet.
- Fiendens lag går inn i hus via LutSpill.tøm bare i 3D-utsnittet; 2D viser ikke ransakede hus.
- Største hakk igjen: når innsiden av et hus bygges (160–330 ms per bygg).
- Balansen etter fredstiden (motstanderne mot leiren) er ikke prøvd: de kom ikke på dag 8–10.

## Etter flettingen (kl. 01:05–02:40)
- Rettet etter gjennomspillingen som ny spiller: spolingen stopper ikke for hvert lag som er framme eller i ildkamp midt i et angrep
  (bare alarm, tap og ødelagte bygg), «kr» står ikke alene på ny linje, opplæringen sier «se at minst to står på Bygg», lutpanelet er tett.
- Fire feil i selve kontrollene: krig-vakta lot 3D være av etter krigskartet (vaktene etter kjørte uten 3D, og angrepsvakta krasjet),
  møbelvakta brukte PC-avstanden på telefon og sto for langt unna kjøleskapet, lys-vakta ventet ikke på en ombygging, sjøvakta
  kunne treffe en annen båt.

## Kontroll (kl. 02:40)
- **Hele `sjekk.js` på den endelige versjonen: PC 116 av 116 (836 s) og mobil 116 av 116 (414 s), «Alt i orden».**
- Regeltestene: alle grønne etter hver fletting.
- Ikke rettet fra gjennomspillingen (står i docs/natt/test2.md): første røverangrep allerede første natt, navnene ved leiren ligger
  oppå hverandre, startskjermens feilmelding står utenfor synet, loggen over «Flaske» når du går på telefon.

# Kritikken og runde 6 (19. nov)
Brukeren: «Lat som du er en spillkritiker og lag en rapport for så å fikse alt den sa som var dårlig.» To kritikere spilte den ekte siden
som nye spillere (PC i Rogaland, telefon på Dovre) og ga begge terningkast 3 (`docs/anmeldelse-2026-11-19.md`). Seks hjelpere rettet
feillistene; detaljer under «Runde 6» i `docs/natt/kart.md`, `ui.md`, `krig.md`, `okonomi.md`, `start.md` og `ga.md`.

## Rettet
| Pakke | Hva |
|---|---|
| Kartet | Navnelappene overlapper ikke (plassert etter viktighet, fiender øverst). Ingen kai-ankre i krigskartet, som også fyller telefonen. «0 t olje» borte. /norge-søylen rettet. Natt og regn i 2D. |
| Skjermbildet | Ord i toppstripa. Bunnmenyen alltid synlig. Én rekkefølge for vinduer. Kort setter spillet på pause. Opplæringen med «✓ Gjort» og sammenleggbar. Leir-menyen starter øverst. Hjelpen i grupper med søk. Forsiden med «Spill nå». |
| Krigen | Store byer krever mange mann og timer. Fredstid de første 2,5 døgnene og ingen seier før dag 4. Motstanderen holder sitt startsted. «Neste trekk» sier hvor mange som trengs. Røvervarsel 3–4 km ute med anslag. Forsvaret huskes. |
| Økonomien | Diesel 3 000 kr/l. «Penger inn» viser hvor pengene kommer fra. Hogst virker. Én dieselprognose. Hele byggeprisen i menyen. Kjøpsknapp i dieselvarselet. Mindre masete nedbremsing. Ingen tapt tid ved omlasting. |
| Start | «Kvinne» gir kvinneportrett. Portrettet fast på telefon. Utkastet huskes. Ingen pilot-lag før start. Advarsler ved leirvalget. Riktig område i steg 3. |
| Gå og 3D | «Reis hit» når kameraet ser et annet sted. «Gå inn» ved dører. Esc lukker sekken først. Været i 3D stemmer. Maskinvarevarselet én gang. Snikemåleren forklart. Fjellmark. |

## Står igjen
- Mykere figurer (folk og soldater er fortsatt kantete).
- Leirens bygg i 2D på nær zoom er grå bokser.
- Motstanderne tar ikke Stavanger/Sandnes av seg selv; krigen står på ca. 15 % fra dag 6 hvis spilleren ikke gjør noe.
- Balansen er prøvd med automatiske gjennomspillinger, ikke av et menneske over mange døgn.
- /dovre-fliser og /norge deler fortsatt ett lagret spill.

# Natt til 20. nov: runde 7–9
Brukeren: «Fortsett utviklingen og forbedringer fram til imorgen klokken 10:30.» Arbeidet stoppet ca. kl. 04:10 fordi kontoen nådde
ukegrensen for bruk, og ble gjort ferdig etter kl. 16 da grensen var nullstilt. To nye kritikere spilte versjonen fra 19. nov
(`docs/anmeldelse-2026-11-20.md`): PC 4 (opp fra 3), telefon 3.

## Gjort
| Pakke | Hva |
|---|---|
| Figurer | Avrundede folk og soldater med gange, sikting, bæring; nytt gevær i hånda. Færre trekanter enn før. |
| Leiren i 2D | Bygg som tak ovenfra etter type, byggestadier, skader, lys om natta; soldater som figurer ovenfra. |
| Motstanderne | Bygger seg opp, samler seg til angrep, tar storbyer, angriper dine tettsteder og leiren med varsel, slåss seg imellom. |
| Lagring | Eget spill per kart, «Lagre og last» med tre plasser og fil. |
| Hakk | Husene og gresset bygges i biter; gjenbrukte tabeller når du flyr (færre og kortere pauser). |
| Nybegynner | Troppforslagene tar aldri de siste som bygger, advarsel, oppløs tropp, «Ring etter arbeidere», enklere steg 6. |
| Terreng | Leirvalget nekter bratt grunn og foreslår flat; hellingen synes når du bygger. |
| Gang | «Reis hit» uten heng, «Gå inn i huset» fra kartet, pil mot døra, snu med én finger, leiren i 3D fra start. |
| Flyt | Loggen maser mindre, ⏭ stopper bare for det viktige, kort pauser også under spoling, hjelpen samlet. |
| Utseende | Ingen harde skjøter i kartet, mindre grått i regn, trær ved leiren, halvmåne-stripa borte. |
| Angrep | Røverne og kampen synes, rapport etter hver bølge, én kilde for status og anslag, garnisoner holder. |
| Morgenmøtet | Valg hver morgen med følger, rapport neste dag, større beslutninger av og til. |

## Står igjen
- Lyse felt i selve satellittmosaikken (ved Bryne) – må rettes når kartet bygges.
- Byttet til et nytt 3D-utsnitt er fortsatt én bit (ca. 0,1 s); første bilde i førsteperson er tregt med programvare-grafikk.
- Folk på fortauene i byene har gamle former; ingen skygge fra figurer.
- Bare én angrepsgruppe per motstander om gangen; den svakeste motstanderen får ingen hjelp.
- Morgenmøtet er spilt i 4–5 døgn, ikke balansert over lang tid.
- Ingen ny kritikerrunde på den nye versjonen ennå.

## Kontroll (20. nov kl. 18)
- **Hele `sjekk.js` på den endelige versjonen: PC 126 av 126 og mobil 126 av 126, «Alt i orden».**
- Funnet ved flettingen: «Lys og skygger» ga GL-feil 1282 på mobil første gang hvert nett ble tegnet i skyggekartet (den egne «tomme»
  dybdetegningen fra utseende-pakka). Byttet til three.js sin MeshDepthMaterial med colorWrite/depthWrite av – samme virkning, ingen feil.
- Hjelpen samlet på nytt (213 emner).
