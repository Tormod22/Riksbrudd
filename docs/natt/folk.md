# Pakke «folk» – samfunnet i leiren (nattarbeidet 18. nov)

Målet: folkene i leiren skal føles som personer og et lite samfunn, ikke bare tall. ALLE TALL ER CLAUDES FORSLAG (samlet i
`Samfunn.REGLER`, `Forfall.MER`, `Byggesett.ROMBRUK`).

## Filer
- NY `site/dovre-fliser/spill/samfunn.js` – regler uten DOM (`Samfunn`), test `pipeline/fliser/test_samfunn.js` (64 punkter).
- NY `site/dovre-fliser/spill/samfunn-visning.js` – `window.SamfunnSpill` (panelet #samfunnmeny, personkortet #personkort, kortene
  #samfunnkort, minnesmerket som bygg, krokene). Lagres per leir i `riksbrudd-samfunn`.
- NY `pipeline/fliser/vakter/folk.js` – vakten (ca. 0,1 s, PC og mobil, setter alt tilbake).
- Endret (mine): `folk.js`, `folk-visning.js`, `folk3d.js`, `overlev.js` (forfallet), `byggesett.js`, `byggesett-visning.js`,
  `kameravakt-visning.js`, `spillet-visning.js` (hendelsene), `test_overlev.js`, `test_byggesett.js`.
- Endret (ikke mine, små): `leir.js` (én linje: `lagerplass.ekstra`), `leting-visning.js` (én linje: `SamfunnSpill.funnet`),
  `index.html` (to skript-tagger rett før `spill/formasjon.js`).

## I TESTENE SOVER SAMFUNNET
Med `navigator.webdriver` gjør samfunnet INGENTING (ingen moral, ingen kort, ingen klokke) før `SamfunnSpill.test = true`.
`FolkSpill.valg()` er da lik `FolkSpill.grunn()`. Forfallets nye trinn følger `OverlevSpill.test` som før.

## Samfunnets klokke
`S.klokke` (spillminutter): følger spilltiden, men minst 60 × ekte tid (`EKTE_FAKTOR` i samfunn-visning.js): ett ekte minutt = minst
én time i samfunnet, så et «døgn» i reglene er høyst 24 ekte minutter når spillet går i sanntid. Alle frister under er i slike døgn.

## Hva som finnes (punkt 13–20 i oppdraget)
13. FLYKTNINGER: kort «Flyktninger ved porten» hver 3–6 døgn (1–3 voksne, av og til barn/gamle, 25 % en spesialist, 20 % en smittet).
    Valg: ta imot alle (moral +3 hvis det er senger, ellers −4; alle +0,03 lojalitet), bare de som kan arbeide (moral −3/−6, de nye
    −0,2 lojalitet), gi mat og send videre (2 rasjoner per person), avvis (moral −5/−9 med barn, alle −0,04 lojalitet).
14. SPESIALISTER (`p.spes`): lege (stell 1,9; halverer smitte og helsetap, finner smittede flyktninger), mekaniker (verksted 1,9;
    reparerer skadde kjøretøy innen 200 m når leiren har verksted), radiooperatør (overvåking 1,9; vaktenes varsling ×1,5; avslører
    forrædere), skytter (vakt 1,9; egne lag innen 300 m fra leiren treffer ×1,15). Virker bare når de står på riktig oppgave.
    Finnes blant flyktninger og ved leting i hus (20 % av de overlevende, `SamfunnSpill.funnet` kalt fra leting-visning.js).
15. BARN OG GAMLE (`S.avhengige`): arbeider ikke, spiser 0,6 rasjon, trenger seng (får seng først). Moral +1,5 per person (tak +6) når
    ingen sulter/fryser/mangler seng, ellers −4 per person (tak −15). `FolkRegler.behov` har fått `o.avhengige` (B.avh).
16. GRÅLUNGEN (`p.syk`, `p.immun`, `p.karantene`): smitter fra syk til frisk (×2,5 når folk mangler seng, ×0,7 sykestue, ×0,5 lege,
    ×0,7 portforbud, ×0,15 fra en som er i karantene), varer 3–5 døgn, −0,14 helse per døgn, så immun. Karantene (knapp i panelet):
    de syke arbeider ikke, moral −3. Utbrudd av seg selv 3 % per døgn (aldri i testene). Gamle kan dø når sykdommen går fritt.
17. LOV I LEIREN (`S.lover`): rasjonering (mat ×0,75, moral −6, litt helse), arbeidsplikt (tempo ×1,12, moral −5, de minst trofaste
    mister lojalitet), portforbud (mindre smitte, forrædere halvt så aktive, lettere etterforskning, moral −4), våpen i leiren (egne
    lag ved leiren ×1,1, moral +2, slåsskamper blir farlige). Folk med et lynne som misliker loven mister 0,05 lojalitet når den innføres.
18. FORRÆDERE (`p.spion`, skjult): lojalitet under 0,3 og (moral < 50 eller snittlojalitet < 0,5) -> 15 % per døgn. En forræder gjør
    noe 30 % per døgn: lekker (visningen setter `AI.minne[side].leir = true` for alle sider) eller saboterer (15 % av maten, eller et
    bygg −0,3 hp). «Etterforsk» i panelet (en gang per døgn, 45 % + 25 % radiooperatør + 15 % portforbud); uten forræder koster det
    0,02 lojalitet hos alle. Avslørt -> kort: utvis eller gi en sjanse til.
19. OPPLÆRING (`S.opplæring`, høyst 2 par): lærer med ferdighet ≥ 1,25 (veteraner med `p.erf` kan lære bort «vakt»), eleven vokser
    0,05–0,1 per døgn opp til lærerens nivå − 0,05 (tak 1,6); begge arbeider på 60 % imens (`p.trener`).
20. BEGRAVELSER: døde i leiren (folk.js gir nå `døde` fra steg) og falne soldater i egne lag havner i `S.døde`; ugravlagte −3 moral
    hver (tak −9). Seremoni: arbeidet på 30 % i tre timer, «Verdig avskjed» +5 i to døgn, +0,02 lojalitet. Uten seremoni: −1 i ett døgn.
    Etter tre døgn legges de i jorda uten farvel (−3 i to døgn). MINNESMERKE: nytt bygg (`Leir.BYGG.minnesmerke`, 400 000 kr,
    under «Annet» i byggelista, egen 3D-modell): moral +2 og +0,5 per gravlagt navn (tak +5).

## Forbedringer
- PERSONKORT: trykk på et navn i Folk («Vis folkene») -> ansikt fra portrettmotoren (fast per person), historie, lynne, ønske
  (oppfylt/ikke), helse, lojalitet i ord, spesialitet, beste ferdigheter. `Samfunn.profil(p)`, `SamfunnSpill.visPerson(id)`.
- ØNSKER: hver person har ett av ni ønsker (seng, varm mat, bruke faget sitt, hvile, vakt i tårn, minnesmerke, brønn, radiomast,
  sykestue). Oppfylt = +0,02 lojalitet per døgn, ellers −0,01; andelen oppfylte flytter moralen ±4.
- KORT MED FØLGER SOM VARER (`Samfunn.KORT`, ni kort): krangel, fest, lete etter familien (borte i to døgn), arbeidstid, hjemmebrent,
  skole for barna, matttyv, et ønske (løfte som holdes/brytes innen tre døgn), minnestund. Følgene ligger i `S.virkninger`
  (moral og/eller tempo i 1–7 døgn) og vises i panelet. Annenhver hendelse fra spillet-visning.js er nå et slikt kort; de kommer
  også av seg selv hver 1–2 døgn.
- FORFALLET: tre nye trinn i `Forfall.MER` (D.mer i «riksbrudd-forfall»; gamle lagringer får dem ved start): mobilnettet (4–6 døgn /
  40–54 ekte min; uten radiomast moral −5), butikkene (8–11 døgn / 75–95 min; kjøpt mat koster det dobbelte), småvegene (12–16 døgn /
  105–130 min; folk på «frakt» ×0,8). Varsel et døgn / 8 ekte minutter før. Vises i Leir-menyen under «Strømnett og vannverk».
- BYGGESETTET: lukkede rom med dør kan være soverom, kjøkken (≥ 16 m², teller som kjøkken for folket), lager (+0,6 m³ per m²) eller
  verksted (≥ 16 m²). Knapp per rom i Leir-menyen under «Byggesett» (`Byggesett.byttBruk`, `L.romBruk`, `Byggesett.romBruk()`).
- KAMERAVAKTA: varselkortet #kamvarsel oppe til høyre («Kamera 1 har sett folk … 420 m nordøst for leiren») med «Se gjennom
  kameraet» og «Vis i kartet»; blir borte etter 45 s.
- 3D: folkene går til bygget der oppgaven hører hjemme (vakt ved tårn/port, kokk ved kjøkken, stell ved sykestue, verksted,
  overvåking ved kontrollrommet, byggelaget ved byggeplasser, syke i karantene ved sykestua). De står UTENFOR bygget, ikke inne.

## API
`SamfunnSpill`: test, våken(), tilstand(), åpne(bool), visPerson(id), nyttKort('flyktninger' | 'kort' | kort-id), svarFlykt(id),
svarKort(i), svarSpion('utvis'|'tilgi'), valg(grunn), ktx(), døde(liste), funnet(person), varsling(), nullstill(), lagre().
`Samfunn` (regler): REGLER, ny, fraJSON, profil, portrettSVG, ØNSKER, SPES, nySpesialist, harSpes, nyAvhengig, nyeFlyktninger,
flyktSvar, smitt, settKarantene, sykdomSteg, LOVER, settLov, spionSteg, etterforsk, dom, startOpplæring, opplæringSteg, død,
gravlegg, KORT, velgKort, kortSvar, valg, steg.
Nye felt i `FolkRegler`: `oppgaveF` (krok for tempo per oppgave), `kjøpMat(F, n, betal, faktor)`, valgene `avhengige`, `matFaktor`,
`tempoFaktor`, `ekstraKjøkken`, `ekstraVerksted`; `arbeidsfør` er usann for `p.karantene` og `p.borte`. `FolkSpill.grunn()`.

## IKKE gjort / svakheter
- Spesialister fra OPPDRAG er ikke laget (bare flyktninger og leting).
- Barn og gamle blir ikke syke selv (bare de gamle kan dø under et utbrudd), og de vises ikke i 3D.
- Operatører/kokk vises ved bygget, ikke inne i det; vakta står ikke oppe i tårnet.
- Samfunnskortene og #hendelse fra før er to ulike bokser (mitt kort venter mens det andre er oppe).
- Forrædernes sabotasje av bygg bruker `b.hp` direkte (ikke Leir.skad), og fiendens «funnet leiren» lagres ikke mellom økter (som før).
- Mekanikerens reparasjon av kjøretøy og skytterens ildbonus er ikke prøvd i en ekte kamp i nettleseren (bare at krokene ikke feiler).
- Ingen varsel-brikke i #varsler (narhud.js er ikke min) for sykdom eller ugravlagte – bare loggen og panelet.
- Tallene er ikke balansert mot lang spilling.

## RUNDE 2 (etter sammenflettingen med økonomi, verden, krig, spillform, sjø og karakter)
- KORTKØ (`window.Kortkø` i samfunn-visning.js): kortene med valg er #hendelse, #formkort og #samfunnkort. Ett om gangen:
  samfunnskortet venter mens et av de andre står oppe, og hendelsene i spillet-visning.js venter på samfunnskortet. Minst
  `KORT_PAUSE` = 120 ekte sekunder fra ett kort lukkes til det neste vises (en avslørt forræder slipper pausen; i testene – webdriver –
  gjelder ingen pause). #flytkort er en statuslinje uten valg og er ikke med.
- BALANSE (prøvd 18 samfunnsdøgn med alle pakkene på, tilfeldige svar, mat kjøpt ved behov): 20 samfunnskort + 3 hendelser =
  ca. 1,3 kort per døgn, og et døgn er minst 24 ekte minutter – altså et kort hvert kvarter eller sjeldnere i vanlig fart, og aldri
  tettere enn hvert annet minutt i høy fart (køen). Leiren døde ikke ut; den vokste 10 -> 20 voksne + 8 barn/gamle, og moralen falt
  til 25–30 fordi senger ikke ble bygget (det er meningen). Justert: flyktninger hver 2–4 døgn (før 3–6); barn og gamle «lider» av
  sengemangel først når også alle de voksne står uten (de får seng først) – før ga én manglende seng −15.
- REKRUTTER FRA BYENE (region-visning.js, én linje: `SamfunnSpill.ankommet(r.person)`): personen får `p.fra` = det største
  tettstedet dere holder, historien sier «Kom med handelsruta fra …», og 8 % er spesialister.
- FANGER (krig-visning.js er ikke endret): «Fanger» i Samfunn-panelet når `KrigSpill.T().fanger` har noen – «La dem bli med i leiren»
  (`SamfunnSpill.taFanger(i)`): høyst 6 per gruppe blir personer med lojalitet 0,15–0,35 og `p.fange` (historien: «Kjempet for … til
  hen ble tatt til fange»), moral −2 og −0,02 lojalitet hos de andre. Lav lojalitet = fare for forræderi.
- KULDE: Grålungen smitter ×1,5 i sprengkulde (VAER.regel.temp ≤ −8, samme grense som spill/verden.js) og ×1,5 når folk fryser i leiren.
- PRØVD I KAMP: eget lag 100 m fra leiren mot et fiendelag – ildfaktoren ×1,15 med skytter på vakt, ×1,265 med våpenloven i tillegg,
  ×1 når skytteren har fri eller laget er 2 km unna; i seks kamper à 40 min: 36 mot 39 utslåtte. Mekanikeren: et kjøretøy med 50 %
  skade 60 m fra leiren ble helt på et par sekunder i 60×, og ble ikke reparert da mekanikeren hadde fri.
- `window.kartTil(x, y, m)` (samfunn-visning.js) flytter 2D-kartet; kameravarselets «Vis i kartet» bruker den.
- KAMERAVARSELET PRØVD: «Vis i kartet» flytter kartet til stedet, «Se gjennom kameraet» fra 2D åpner 3D inne i kameraet (body.ikamera).
  FUNN OG RETTING: `kam2d(c)` i kameravakt-visning.js satte `kam.x` på en lokal funksjon som også het `kam`, så kartet ble aldri
  flyttet når du gikk ut av kameraet – nå brukes `window.kartTil`. Fra 3D i pause (tempo 0) kom ikke «Se gjennom» inn i kameraet
  i én prøve; ikke undersøkt videre.
- 3D PÅ NÆRT HOLD: figurene sto 5–8 m fra bygget; nå står de 1–3 m utenfor veggen etter byggets fotavtrykk (vakta 3 m fra tårnet,
  målt). De står fortsatt på bakken, ikke oppe i tårnet eller inne i bygget.

## Runde 4 (18. nov dag) – pakke «folk», også det som sto igjen fra «karakter»
ALLE NYE TALL ER CLAUDES FORSLAG (samlet i `Samfunn.REGLER` og `Eventyr.REGLER`).

1. **VARSELBRIKKER** (#varsler øverst til venstre): «Grålungen i leiren» / «Utbrudd av Grålungen» (fra 3 syke; antall, barn/gamle,
   karantene eller ikke), «N døde venter på begravelse» (rød etter ett samfunnsdøgn), skadene dine («Brukket bein – trenger en spjelk»,
   «Infeksjon – bruk førstehjelp (i sekken)», «behandlet – gror») og «Et kort venter» (se 3). Trykk: Samfunn-panelet / karakterarket /
   viser kortet. **Endring i narhud.js (pakka «ui»)**: to linjer rett før `return ut.slice(0, 5)` i `brikker()` – en løkke over
   `window.VARSEL_TILLEGG` (lister av funksjoner som gir brikker `{ i, k, t, s, f }`; en feil i et tillegg fanges). Ingen annen endring.
   Brikkene legges inn fra samfunn-visning.js og eventyr-visning.js. Skadelappene i raden til venstre (når du går) står som før.
2. **SABOTASJE GJENNOM Leir.skad**: `Samfunn.saboter(L, r)` – byggeplasser (igjen > 0) og ferdige bygg over 40 % kan rammes; skaden
   går gjennom `Leir.skad`, så en ødelagt byggeplass legger de ubrukte materialene tilbake på lageret (teksten sier hva), og et ferdig
   bygg står igjen skadet. Byggesettets deler røres ikke. Visningen tegner leiren på nytt (`LeirSpill.oppdater3d`) når noe ble ødelagt.
3. **ÉN KORTKØ** (`window.Kortkø` i samfunn-visning.js): `ta(id, haster, vis)` (få plassen eller vent), `be(id, vis, { tittel })`
   (stå i kø), `ferdig(id)`, `nå()` (vis det første med en gang), `venter()`, `eier()`, `ledig()` (som før, men også «ingen i kø»).
   #hendelse og #samfunnkort går gjennom køen i den rekkefølgen de kom; #formkort og #krigkort (seier/tap) er utenfor køen – kommer ett
   av dem opp, viker kortet i køen (skjules og står først i køen igjen). Et kort som venter, vises som brikken «Et kort venter – tittel».
   Pausen på 120 s mellom kortene gjelder fortsatt (ikke i testene). **Endring i spillet-visning.js (pakka «balanse»)**: i `visHendelse()`
   to linjer – `Kortkø.ferdig('hendelse')` når kortet lukkes, og `if (!Kortkø.ta('hendelse', false, visHendelse)) { … Kortkø.be(…); return; }`
   før kortet vises. Prøvd i nettleser: hendelse mens samfunnskortet står → venter (i kø), vises etter svaret; et krigkort oppå → hendelsen
   viker og kommer tilbake når krigkortet er borte.
4. **BARN OG GAMLE BLIR SYKE**: smittes av alle syke (også andre barn/gamle), barn ×0,6, gamle ×1,2 av en voksens sjanse; mens de er
   syke, dør gamle med 0,1 per døgn og barn med 0,01 (lege ×0,5, stell i sykestue ×0,7); de som kommer gjennom, blir immune. Den gamle
   regelen «gamle dør av og til under et utbrudd uten karantene» (`gammelDør`) er fjernet – nå må de være syke. Karantene gjelder dem
   også, og de teller i moralen («Grålungen») og i panelet. `Samfunn.sykeAvh(S)`.
   **3D (folk3d.js)**: høyst 8 barn/gamle som egne figurer i de samme instansnettene (nå 22 plasser): barn 0,62 store, friske farger,
   raske, leker rundt brakka/leiren; gamle krumme (overkroppen bøyd 0,32 rad fram – overkroppen dreier om hofta, armene sitter på den),
   langsomme, holder seg ved brakka. Syke går saktere og litt bøyd.
5. **FOLK I BYGGENE**: operatører (overvåking) inne i kontrollrommet, kokken i kjøkkenet, stell og syke i karantene i sykestua (ellers
   brakka), verksted i verkstedet – på en fri plass på gulvet (Interior.plan på omrisset fra `Interior3d.egne()`, ikke i møbler, vegger
   eller døråpningen; gulvhøyden som interior3d.js). De går til døra, «går inn» og står 25–85 s, så ut igjen. Vakta klatrer opp:
   plattformen 5,65 m × nivået over `LeirSpill.grunn3d(b).topp`, speider sakte fram og tilbake. Står en figur fast mot en vegg på vei
   til døra, går den en omveg til siden (høyst fire ganger). Målt: operatørene z 2,94 = interiørets gulv 2,936; vakta 5,68 m over bakken.
   `Folk3d.plassVed(b, i)` (til vakten).
6. **SPESIALISTER FRA OPPDRAG**: `Samfunn.oppdragSpes(o, leirFrø)` – redningsoppdrag 35 %, røverposter 25 %, fast per oppdragsnummer og
   leir (ikke stedet: spillet flytter oppdraget etter at det er laget). Står i fanen Mål under «Samfunnet» («★ Redd overlevende 0,9 km mot
   øst: Blant dem som skal reddes, er en skarpskytter»). Når oppdraget er fullført: den første som ble reddet, blir spesialisten; ved
   en røverpost blir fangen med (gratis, lojalitet 0,55–0,8) hvis det er en ledig seng. **Endring i spillet-visning.js**: i `fullfør()`
   samles de rekrutterte i `nye`, og etter `varsel(...)` sendes hendelsen `riksbrudd-oppdrag` med `{ o, nye }` (samfunn-visning.js lytter).
   Prøvd i nettleser: «Knut Ødegård er skarpskytter – en spesialist!» og «Kari Furuseth er lege …».
   OBS: `S.frø` er tilfeldighetsgeneratorens tilstand (endrer seg) – bruk `SamfunnSpill.leirFrø()` for noe som skal være fast.
7. **PORTRETTER I FOLK**: lista under «Vis folkene» har et lite portrett (30 × 37) per person fra portrettmotoren (samme ansikt som
   personkortet; blob-adresse laget én gang per person, så innerHTML er kort og lik mellom tegningene). Trykk = personkortet. Sett på
   PC og telefon.
8. **KARAKTER** (fra «karakter»-pakka):
   - HUNDEN: gruppe med kropp, fire bein og hale – beina svinger i trav etter farten, halen logrer (svakt når den er sulten), halter
     (halv fart) når den er hardt skadet. Trenger mat: sulten etter 36 spilltimer eller 30 ekte minutter; i leiren spiser den en rasjon
     av leirens mat, ute: knappen «Gi Bamse mat» (en rasjon fra sekken). Uten mat i 12 spilltimer / 10 ekte minutter går den sin vei.
     Blir du truffet mens du går, blir hunden truffet med sjanse 0,25 (1,5 × tapet ditt); helse 100, gror 6 per spilltime (×4 i leiren),
     dør på 0. `Eventyr.Hund.fyll/steg/mat/truffet/tilstand`, `EventyrSpill.matHund/hundTruffet`.
   - DEKNING BAK BAKKETOPP: `Eventyr.Snik.bakkeImellom(h, øye)` på 32 høyder langs linja (bare i 3D-utsnittet): stikker terrenget opp over
     linja fra øyet ditt (stå 1,6 / huk 0,9 / ligg 0,35 m) til fiendens (1,5 m), er skaden ×0,15 (ganges med de andre dekningene).
     `EventyrSpill.bakke(d, e)`.
   - SLØRET I MINIKARTET: minikart2d.js eies av «ui» og har ingen krok. Jeg har laget API-et: `EventyrSpill.slørTegn(g, vx0, vy1, m, W, H)`
     (samme regel som KROKER.tegn). FORSLAG til «ui» – én linje i `tegn()` etter at kartet er tegnet (innenfor den runde klippen):
     `if (window.EventyrSpill && EventyrSpill.slørTegn) EventyrSpill.slørTegn(g, cx - R, cy + R, 2 * R / P, P, P);` (cx, cy = midten,
     R = radius i meter, P = størrelsen i punkter). Prøvd på et eget lerret: hjørnet (uoppdaget) alfa 77, midten (leiren) 0.
     3D-minikartet (kompass.js) er ikke endret.
9. **PRØVD I EKTE KAMP** (spilløkka i tempo 60, AI av, ett eget lag 100 m fra leiren mot et prøvelag 360 m unna, 25 ekte s per runde):
   se tallene nederst.

Tester: test_samfunn.js (nye: barn/gamle syke, sabotasje, oppdrag), test_eventyr.js (hunden, bakkedekning). Vakt: folk.js har nye krav
(varsler, sabotasje, énKø, barnGamle, oppdragSpes, portretter, tårn – bare med 3D åpent, ellers «2D» –, hund, bakke, slør).

### IKKE gjort / svakheter (runde 4)
- Figurene inne i byggene står stille (ingen gange inne, ingen sitting ved pultene), og de vises bare når du er inne (veggene skjuler dem).
- Barn/gamle i 3D har ikke grått hår eller egne klær utover fargen; høyst 8 vises.
- Sløret er ikke i minikartene (bare API + forslag); 3D-minikartet er ikke vurdert.
- Hunden har ingen lyd, og fienden sikter ikke på hunden med vilje (bare «truffet sammen med deg»).
- Dekningen bak bakketoppen gjelder skaden du tar – fienden oppdager deg fortsatt (snik) som før.
