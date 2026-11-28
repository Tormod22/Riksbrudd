# ut1-bygning – byggemodellen (fase B0)

28. nov, utbyggingen av docs/plan-selskap-okonomi.md, kapittel 5 og fasetabellen B0 i kapittel 16.
B0 = modellen. **Ingenting endres på skjermen ennå** – interior.js, interior3d.js og hus3d er uendret og brukes som før.

## Filer
- `site/dovre-fliser/spill/bygning.js` – regler uten DOM (Node: `require('./bygning')`, henter interior.js selv; nettleser: `window.Bygning`).
- `pipeline/fliser/test_bygning.js` – 2128 prøvehus (14 klasser fra interior.js × 4 former × 38 størrelser/høyder) + egne saker.
  `RASK=1` gir 448 prøvehus (ca. 20 s); fullt ca. 2,5 min.
- `pipeline/fliser/vakter/ut1-bygning.js` – vakta.
- `site/dovre-fliser/index.html`: **én linje** – `<script src="/dovre-fliser/spill/bygning.js?v=…">` rett etter interior.js (og versjon.py).

## Modellen (ren JSON)
Ett bygg = `{ v, kilde ('kart'|'byggesett'), hus, kl, t, h, stil, P, akse {ux,uy,vx,vy,u0,u1,v0,v1}, høyde {vegg, møne}, kjerne?,
tak { form 'saltak'|'valm'|'flatt', stoff, møne, felt [{id,u0,u1,tilstand}] (4 m langs mønet), vinduer (takvinduer), spenn },
etasjer [...], trapper [...], endringer [] }`.

Etasje: `{ n (-1 kjeller, 1, 2 …, loftet sist), navn, z (gulvet over 1. etasjes gulv), høyde, takhøyde, kjeller?, loft?, stengt?,
dekke { stoff, tykk, felt [{id, rom, tilstand}] (ett felt per rom), hull [trapphull], spenn }, vegger, åpninger, rom, møbler, søyler, bjelker }`.
- Vegg: `{ id, a, b, type 'ytter'|'skille'|'gavl', kant (ytter: kanten i omrisset), stoff, tykk, bærende, tilstand, trapperom? }`.
- Åpning: `{ id, vegg, t (midten, m fra a), b, h, ned, type 'dør'|'port'|'vindu', stoff, inngang? ('hoved','bak','vare','nød'), leilighet?, bjelke?, sperre, tilstand }`.
- Rom: `{ id, rolle, P (4 hjørner), areal, andel }`. Møbel: `{ id, type, x, y, a, b, d, h, sperrer, stoff, tilstand }` (typene fra Interior.MØBLER +
  fyrkjele, flyttekasse, kiste, skrot).
- Trapp: `{ id, fra, til, x, y, a (retningen opp), b, l, nede, oppe (der du går på/av), form 'rett'|'stige', stoff, tilstand }`.
- Tilstand: `hel | skadet | ødelagt | revet | rast`. Delene beholder nummeret (id) også når de er revet – endringsloggen peker på dem.

## API
- `Bygning.fraKart(P, { i, t | kl, h, dør?, tak?, fall?, vegg?, tett, år … })` og `fraKartG` (generator: yield mellom etasjer, trapper og i trappesøket).
  `tak`/`fall` og `vegg` (= hus3d sin P.veggTopp over 1. etasjes gulv) går foran reglene – B1 bør sende dem fra hus3d, så modellen og 3D har
  samme tak. Uten `dør`: midt på lengste kant (som hus3d).
- `Bygning.endre(modell, endring)` (endrer modellen, gir svar), `vurder(modell, endring)` (samme svar, endrer ingenting – «byggelaget sier fra»),
  `medEndringer(fraKart(...), logg)` (logg = liste eller `{ endringer }`), `tekst(endring, hus)` → «hus 81234, etasje 1, vegg 7: revet».
  Endringer: `{ e, del, id, gjør }` – vegg `riv`; åpning `ny {vegg, t, b, type, bjelke}` / `tett` / `barrikader` / `åpne` / `riv`; bjelke `ny {vegg}`;
  søyle `ny {x,y}` / `riv`; dekke `riv`; tak `riv`; møbel `fjern`/`ødelegg`; etasje `riv` (ovenfra).
  Svar: `{ ok, feil?, advarsel?, materialer {tre, betong, stål, glass}, timer, ras [{e, del, id}], tekst }`.
- `Bygning.ras(modell)`, `nås(modell)` / `nåsEtasje(modell, etasje)` (alle rom nås fra ytterdører/trapper? – rutenett 0,2 m, samme vegglogikk som
  Interior.blokkert), `rutenett(...)` (fri/sperret per rute – kapittel 6.5 kan bygge på den), `støtter`, `telle`, `fraByggesett(deler, {ox, oy})`.

## Slik regnes et hus ut (5.3)
- Takform fra `info.tak`/`info.fall`, ellers sjanse per klasse som harFall i kartflis.js (forenklet). Møne som mønFor i hus3d (Byhus.TAKVINKEL).
  Veggens høyde = h − møne (saltak/valm) eller h (flatt).
- Etasjer: 2,7 m bolig/hytte/leil, 3,2 m kontor/skole/sykehus, butikk 4 m nede og leiligheter over; haller (industri, lager, låve, kirke, hangar,
  terminal, uthus) én etasje i full høyde. Antall = veggens høyde / etasjehøyden, rundet ned, minst én; etasjene fyller veggen helt.
  Hus 9 m med saltak = 2 etasjer + loft, bygård 18 m flatt = 6 etasjer.
- Loft når mønet ≥ 2,2 m (ikke i haller unntatt uthus); gavlvegger med vindu, takvinduer i ca. 35 %, flyttekasser/kister/skrot langs knevggene.
- Kjeller (fast per hus): hus 35 %, leil 70 %, kontor/skole/sykehus 50 %, butikk 30 %, hytte 8 %, industri 10 %. Tilfluktsrom i store bygg
  (≥ 200 m², boliger ≥ 400 m²), ellers «kjeller» + fyrrom/bod bak en skillevegg; fyrkjele, hyller, køyesenger i tilfluktsrom.
- 1. etasje = Interior.plan (rom, døråpninger, møbler – samme svar som i dag). Etasjene over lages også av Interior.plan med samme dørplass
  (over døra blir det et vindu) og samme frø, så veggene oftest står over hverandre. Boliger: romsettet byttes et øyeblikk (soverom, bad,
  allrom oppe – `ROMSETT.bygning_oppe` finnes bare under kallet; interior.js er uendret etterpå, testet).
- Bygård (leil, minst 16 × 7 m, nesten rektangulær, minst 2 etasjer): trapperom 3,2 m bredt der hoveddøra er, og en leilighet fra
  Interior.plan på hver side med dør til trapperommet; trappene står i trapperommet. Går det ikke, brukes vanlig plan.
- Høyhus: bare de 6 nederste og den øverste etasjen har innhold; de andre er `stengt` (tomt rom, trappa går gjennom).
- Trappene: søkes der de passer i begge etasjene (inne i omrisset, ikke gjennom vegger, ikke foran dører) og bare der alle rom fortsatt nås;
  møbler i veien tas bort; et lite rom som trappa fyller, blir «trapperom». Rett trapp først (bolig 0,85 m bred, 1,02 m lang per meter høyde;
  andre 1,1 m og 1,25), så nytt frø i etasjen over (høyst to), så stige (loftsluke 0,6 × 1,1 m), så trangere luft, og til slutt blir etasjen over
  ett åpent rom. 2128 prøvehus: 2228 rette trapper og 839 stiger (de fleste til loftet), 0 nødløsninger.
- Bærende: alle yttervegger; en skillevegg langs mønet nær midten når bygget er over 5 m dypt; og flere til alle punkter i dekket over har
  støtte innen halve spennet.

## Ras (5.4) – tolkningen
Planen: «den delen av dekket som ikke har noe under seg innen 6 m faller ned» og 5.5: tre 6 m, betong 9 m, stål 12 m spenn. **Valg:** et dekke
spenner høyst så langt mellom to støtter, så et punkt lenger enn halve spennet fra nærmeste støtte (bærende vegg, søyle, bjelke som hviler på
noe) i etasjen under faller. Dekket tåler alltid minst det det ble bygget med (+ 0,25 m), så ingen hus raser av seg selv (testet). Et dekkefelt
(rommet) raser når ¼ av punktene mangler støtte; møbler og skillevegger på det raser med; yttervegger raser når ytterveggen under er borte;
taket (felt på 4 m) raser etter samme regel. Det gjentas til ingenting mer faller. Åpent spørsmål 11 (ekte ras eller advarsel): planens forslag –
ekte ras; `vurder()` gir advarselen først.
Bjelke: legges langs veggen og forlenges gjennom bærende vegger på samme linje til noe som står på tvers; finnes ingenting, får enden en søyle.
Ny åpning i bærende vegg krever `bjelke: true`.

## Tall (alle er Claudes forslag – REGLER øverst i bygning.js)
Etasjehøyder over; spenn tre 6 / betong 9 / stål 12 m; rasandel 0,25; riving per m²: tre 0,04 m³ tre, mur 0,12 betong, betong 0,12 betong +
0,004 stål, blikk 0,01 stål, glass 0,02 glass; vindu 0,02 glass per m²; tak 0,03 tre + 0,002 stål; ras gir 30 % som skrot. Tid: tre 0,02 t/m²,
mur 0,08, betong 0,15 (×2 for bærende). Byggesettets materialnavn (tre, betong, stål) + nytt «glass».

## Målt (Node, maskinen delt med andre hjelpere)
fraKart: snitt 35–60 ms per hus (boliger 40–75 ms), lengste 0,4–1,5 s (høyhus/store kontor med mange etasjer). Med fraKartG er hvert steg
som regel under 15–30 ms (ett tilfelle 93 ms ved første kall – oppvarming). I nettleseren (vakta, PC og mobil): ca. 165–400 ms for snittet av hus 9 m,
bygård 18 m og høyhus 60 m. ~10 småhus mens du går = ca. 0,5 s fordelt på bildene med fraKartG – B1 bør bruke generatoren som interior3d
gjør med planG, og huske modellene (endringer lagres, modellen regnes ut på nytt).

## Byggesettet
`fraByggesett(deler, { ox, oy })` leser leirens deler (Byggesett.fraLeir / b.bs) – byggesett.js er ikke endret: gulv → dekkefelt per rute,
vegger (kant mellom to ruter, ytter når bare én side har gulv), dør/vindu/port som åpning midt i delen, rom fra ByggesettRegler.rom, tak per
rute (saltak når noen er saltak), to etasjer med «antatt» trapp (som byggesett.js). Omrisset er rammen rundt gulvet i 1. etasje.

## Ikke gjort (senere faser)
- Ingen visning (B1: 3D og plantegning fra modellen), ingen etasjevelger, ingen lagring av endringer (G0/B3 – `riksbrudd-…` er ikke tatt i bruk).
- Installasjoner (lys, strøm, varme, vann) står i 5.2, men er ikke med i B0.
- Trappene er rette løp eller stiger (ingen svingtrapp/repos); stiger brukes også i noen trange hus med flere etasjer.
- Skjeve omriss: rom er rektangler i byggets akser (som interior.js), noen stikker litt utenfor (andel < 1).
- Dekkefelt per rom, ikke per rute på 1,2 m (kommer med byggesett 3 i B4).
- Byggesettmodellen: omrisset er rammen, ikke et ekte omriss for leirer med flere hus; forsvar (palisade, mur) er utelatt.
