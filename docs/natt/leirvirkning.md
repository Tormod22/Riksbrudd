# R18-B Virkning i alle leirbyggene (23. nov 2026)

Brukeren: «vi må legge til funksjoner og virkning i alle leirbyggene». Gren `claude/r18-leirvirkning`.

## Slik henger det sammen
- `spill/leirvirkning.js` (regler uten DOM, test `pipeline/fliser/test_leirvirkning.js`): ÉN tabell `VIRKNING` med hva hvert bygg gjør,
  og regnestykkene `leiren(L, LB, mangler)` (hele leiren: moral, helse, mat, tempo, vann, radio, satellitt, nett, bytte, fangevakt,
  varsling, drone – hvert slag teller én gang, med tak i `REGLER`), `ved(..., x, y, natt)` (rundt byggene: vern, sikt, sinke, erf, ammo,
  leging, reparer, fyll, skjerm), `ser(..., e)` (radar/poster), `tekst`, `kort`, `panelTekst`, `brukPå(Leir.BYGG)` (kopierer lager,
  senger og strøm inn i Leir.BYGG og setter `B.virkning`/`B.virkningKort`). Et bygg virker når `Leir.virker(b)`, ikke er slått av, og har
  strøm hvis det bruker strøm (eller `strøm: true` i tabellen); hardt skadet = halv virkning.
- `spill/leirvirkning-visning.js` (lastes rett etter `modeller-leir2.js`): `window.LeirvirkningSpill` (leiren, ved, panel, steg, kobl,
  målt, droner). Kobler på: `SamfunnSpill.valg` (moralTillegg, helseTillegg, matFaktor, tempoFaktor til Folk), `SamfunnSpill.varsling`,
  `Leir.nettFaktor`, `KROKER.ild` (vern), `KROKER.sikt`, `KROKER.ser`, `KROKER.fart` (sinker fiender), `KROKER.sim` (hvert spillminutt:
  trening, ammunisjon, leging, reparasjon og fylling av kjøretøy, vaktdroner i `DRONER` med `d.leirvakt`), `Spillet.Trussel.bytte`
  (røvernes bytte), `Krig.rømmer` (fangevakter), `Enheter.skad` (parkering). Innpakningene merkes på objektet (`__lv…`) så de skjer én gang.
- Små endringer i felles filer: `leir.js` (steg: bygg med `B.diesel`/`B.sol` og kw > 0 lager strøm som aggregat/solcelle; kapasitet:
  egen liten tank i dieselbygg; `api.nettFaktor`), `folk.js` (`o.helseTillegg` i helsa), `overlev.js` (brønner(): vannrens teller),
  `kontrollrom-visning.js` (mast(): radiotillegg; satellitt: ingen terrengsjekk for feltradio), `leir-visning.js` (byggpanelet: linja
  «Virkning: …» `#byggvirkning`; byggelista: kort linje `.virk` og virkningen i tipset), `modeller-leir2.js` (NYE: «(virkningen kommer
  senere)» tatt bort, generatorhus 2 → 9 mill. kr, bærbar generator 60 000 → 1,2 mill., bærbart solpanel 20 000 → 400 000 – de gir nå strøm),
  `index.html` (to skript-tagger).
- Vakt: `pipeline/fliser/vakter/leirvirkning.js` («virkning i leirbyggene»): alle bygg i Leir.BYGG har tekst uten «kommer senere», og i en
  testleir måles moral, vern, radar, sinke, lager, radio, reparasjon, trening og strøm (de åtte første kreves). Prøvd: vakta feiler når
  vern-kroken er slått av.

## Tabellen (alle tall er Claudes forslag)
| Bygg | Kort | Virkning |
|---|---|---|
| kontrollrom | kart, kamera, radio | Kartet, kameraene og radioen: ordre over radio, kameravakt og overvåking |
| brakke | senger · byggelag | Senger (8/14/20 på nivå 1–3) og ett byggelag til |
| vakttårn | sikt · treff · varsling | Med vakt: lag innen 150 m ser 25 % lenger og treffer 20 % bedre innen 100 m; vaktene ser røverne 1,5 km unna |
| port | åpning i gjerdet | Åpning i gjerdet for folk og kjøretøy |
| batteri | lagrer strøm | Lagrer strøm (40/80/160 kWt): sol om dagen, lys om natta |
| veg | rask kjøring | Bilen kjører fort på vegen, og skogen ryddes |
| gjerde | stenger leiren | Stenger leiren; porter lager åpninger |
| lagertelt | lagerplass | Lagerplass +100/200/300 m³ (nivå 1–3) |
| container | lagerplass | Lagerplass +40/70/100 m³ (nivå 1–3) |
| verksted | reparerer kjøretøy | Folk på «verksted» reparerer bygg og lager stål; reparerer også kjøretøy innen 40 m (strøm) |
| sykestue | leger sårede | Folk på «stell» leger syke og sårede soldater innen 150 m |
| drivstofftank | rommer diesel | Rommer 5 000/10 000/20 000 l diesel (nivå 1–3) til aggregat, fyring og fyllestasjon |
| aggregat | strøm av diesel | Gir 20/35/50 kW (nivå 1–3), bruker diesel |
| solcelle | strøm av sol | Gir 5/9/14 kW i dagslys (nivå 1–3) |
| kameramast | ser fiender | Ser fiender innen 300/500/800 m (nivå 1–3) når kameravakta følger med |
| radiomast | radio 15–40 km | Feltradioene når 15/25/40 km (nivå 1–3) i stedet for 8 km |
| drivhus | dyrker mat | Dyrker 3 rasjoner mat i døgnet (mindre om vinteren) |
| helikopterplass | leger sårede | Helikopteret står her. Sårede soldater innen 250 m leges litt fortere (fløyet inn til stell) |
| sandsekkvoll | vern 40 % | Lag innen 15 m tar 40 % færre treff |
| kjøkken | varm mat · moral | Med folk på «kjøkken»: varm mat, mindre svinn og bedre moral |
| brønn | vann | Vann til leiren når vannverket svikter |
| kommandosenter | radio +10 km · arbeid +3 % | Feltradioene når 10 km lenger, og alt arbeid går 3 % raskere (bedre planlegging) (strøm) |
| dronehangar | vaktdrone | Holder én vaktdrone i lufta rundt leiren (1,5 km ut, ser 2,5 km) (strøm) |
| dronerampe | vaktdrone | Én vaktdrone til – trenger en dronehangar (strøm) |
| satellitt | radio over fjell | Samband via satellitt: åser og fjell stopper ikke feltradioene (strøm) |
| radartårn | ser 5 km | Ser fiender i bevegelse innen 5 km (ikke i skog) (strøm) |
| kontor | arbeid +4 % | Arbeidet planlegges bedre: alt arbeid 4 % raskere (strøm) |
| møtetelt | arbeid +3 % | Orientering før arbeidet: alt arbeid 3 % raskere |
| ammobunker | ammunisjon · mindre plyndring | Lag innen 150 m får ammunisjon (50 % i timen); røverne tar 40 % mindre av lager og diesel |
| våpenlager | ammunisjon · mindre plyndring | Lag innen 100 m får ammunisjon (25 % i timen); røverne tar 15 % mindre (strøm) |
| lagerhall | lager +250 | Lagerplass +250 m³ |
| kjølecontainer | mindre matsvinn | Maten holder lenger: 12 % mindre svinn (trenger strøm) (strøm) |
| messe | moral +4 · mindre matsvinn | Felles måltider: moral +4 og 7 % mindre matsvinn (strøm) |
| offisersbrakke | 4 senger · moral +1 | 4 senger og moral +1 |
| dusjbrakke | moral +3 · helse | Moral +3 og helse +2 % i døgnet (strøm) |
| toalett | moral +2 · helse | Moral +2 og helse +2 % i døgnet (mindre smitte) |
| vaskeri | moral +2 · helse | Rene klær: moral +2 og helse +1 % i døgnet (strøm) |
| vannrens | helse · vann | Rent vann uten vannverket (som en brønn) og helse +1 % i døgnet (strøm) |
| avfall | helse | Mindre rotter og smitte: helse +3 % i døgnet |
| klima | moral +2 · helse | Bedre inneklima: moral +2 og helse +1 % i døgnet (strøm) |
| hundegård | moral +1 · varsling | Hundene merker fiender: vaktene ser 30 % lenger. Moral +1 |
| bålplass | moral +3 | Samlingssted: moral +3 |
| flaggrekke | moral +2 | Stolthet over selskapet: moral +2 |
| skilt | moral +1 | Orden i leiren: moral +1 |
| parkering | bare utseende | Egne kjøretøy som står innen 25 m, tar halv skade |
| treningstelt | moral +1 · trening | Lag i ro innen 80 m får 1 min erfaring i timen (høyst veteran). Moral +1 |
| skytebane | trening | Lag i ro innen 120 m får 3 min erfaring i timen (høyst veteran) |
| hinderløype | trening | Lag i ro innen 100 m får 2 min erfaring i timen (høyst veteran) |
| arrest | vokter fanger | Fanger i arbeid voktes: teller som 4 vakter, færre rømmer |
| garasje | reparerer kjøretøy | Reparerer egne kjøretøy innen 30 m (8 % i timen) (strøm) |
| tungverksted | reparerer kjøretøy | Reparerer egne kjøretøy innen 50 m (25 % i timen) (strøm) |
| vaskeplass | reparerer kjøretøy | Vedlikehold: egne kjøretøy innen 20 m repareres litt (3 % i timen) (strøm) |
| fyllestasjon | fyller kjøretøy | Fyller egne kjøretøy innen 30 m (halv tank i timen) med leirens diesel (strøm) |
| feltsykehus | leger sårede | Sårede soldater innen 150 m leges 15 % i timen (strøm) |
| medevac | leger sårede | Sårede fløyes inn: soldater innen 250 m leges 8 % i timen |
| op | vern 30 % · ser 900 m | Ser fiender innen 900 m; lag i posten (6 m) tar 30 % færre treff |
| betongbunker | vern 75 % | Lag innen 8 m tar 75 % færre treff |
| skyttergrav | vern 55 % | Lag innen 8 m tar 55 % færre treff |
| skyttergravHjørne | vern 55 % | Lag innen 8 m tar 55 % færre treff |
| kurver | vern 45 % | Lag innen 6 m tar 45 % færre treff |
| tvegger | vern 50 % | Lag innen 6 m tar halvparten så mange treff |
| porttårn | vern 30 % · ser 500 m | Ser fiender innen 500 m; lag innen 10 m tar 30 % færre treff og ser 20 % lenger innen 40 m |
| piggtråd | sinker fiender | Fiender innen 8 m går med 35 % fart |
| stålkryss | sinker fiender | Fiender innen 8 m går med halv fart (stopper kjøretøy) |
| vegsperring | sinker fiender | Fiender innen 12 m går med 40 % fart |
| sluse | ser 150 m · sinker fiender | Fiender innen 12 m går med 30 % fart; kontrollbua ser 150 m (strøm) |
| lysmast | sikt om natta | Om natta ser lag innen 150 m 30 % lenger |
| sirenemast | varsling | Varsler hele leiren: vaktene ser fiender 50 % lenger unna (strøm) |
| generatorhus | +30 kW | Stor generator: gir 30 kW og bruker diesel |
| trafo | mer fra nettet | Henter mer fra strømnettet: dobbelt så mye mens nettet virker |
| paller | lager +2 | Lagerplass +2 m³ |
| presenning | lager +5 | Lagerplass +5 m³ |
| sekkestabel | vern 15 % | Lag innen 3 m tar 15 % færre treff |
| ammokasser | ammunisjon | Lag innen 30 m får litt ammunisjon (5 % i timen) |
| medisinkasser | leger sårede | Sårede innen 30 m leges 2 % i timen |
| førstehjelp | leger sårede · helse | Sårede innen 30 m leges 2 % i timen; helse +1 % i døgnet |
| oljefat | fyller kjøretøy | Fyller egne kjøretøy innen 15 m litt (5 % i timen) med leirens diesel |
| jerrykanner | fyller kjøretøy | Fyller egne kjøretøy innen 15 m litt (5 % i timen) med leirens diesel |
| bærbargenerator | +3 kW | Gir 3 kW og bruker diesel |
| bærbarsol | +1 kW | Gir 1 kW i dagslys |
| lyskaster | sikt om natta | Om natta ser lag innen 40 m 10 % lenger |
| lysstolpe | sikt om natta | Om natta ser lag innen 30 m 10 % lenger |
| kokeapparat | moral +1 | Varm kaffe: moral +1 |
| feltbord | moral +1 | Et sted å sitte: moral +1 |
| kartbord | arbeid +1 % | Planlegging: alt arbeid 1 % raskere |
| antennestativ | radio +2 km | Feltradioene når 2 km lenger |
| radiostasjon | radio +1 km | Feltradioene når 1 km lenger |
| småtelt | 2 senger | 2 senger (telt) |
| kamotelt | 2 senger | 2 senger (telt) |

Bygg som ikke står i tabellen (gassflasker, matkasser, kamuflasjenett, tømmerstabel, verktøytavle, arbeidsbenk, IBC-tank, søppelcontainer,
stige, stillas, mobilkran, betongblander, gravemaskin, kabeltrommel, rørstabel, strømskap, skiltstolpe, kjegler, sperrebånd, brannstasjon,
våpenstativ): «Bare utseende». Byggesettets deler: «Del i byggesettet …». Bygg andre moduler legger inn (åker, minnesmerke …) bruker sin egen tekst.

## Ikke gjort / kjent
- Virkningene vises ikke i 3D (ingen nye effekter der); vaktdronene vises som andre droner i 2D.
- Stålkryss sinker fiendens lag (også om bord), men stopper ikke fiendens lastebiler direkte.
- Brannstasjon gir ingenting mot brann i leiren ennå; matkasser/IBC er pynt.
- Moral/helse fra byggene virker også i testene (som vakttårnet) – de er faste virkninger av bygg du har bygget, ikke ting som skjer av seg selv.
