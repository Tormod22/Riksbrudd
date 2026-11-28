# Utbygging 28. nov – pakke «rekruttering» (kapittel 14.1 og 14.2)

Plan: `docs/plan-selskap-okonomi.md` 14.1 «Rekruttering som et marked» og 14.2 «Opplæring». Gren `claude/ut3-rekruttering`.
Alle tall er Claudes forslag (samlet i `Rekruttering.REGLER`).

## Filer
- `site/dovre-fliser/spill/rekruttering.js` – NY, regler uten DOM (`globalThis.Rekruttering`, Node: `require`). Test: `pipeline/fliser/test_rekruttering.js`.
  Legger også inn bygget `Leir.BYGG.øvingsfelt` (som folk.js legger inn kjøkkenet og overlev.js brønnen).
- `site/dovre-fliser/spill/rekruttering-visning.js` – NY, `window.RekrutteringSpill` (søkerne og opplæringen i Folk-panelet, morgenen,
  kommandoene, lagring, ikon og tegning for øvingsfeltet).
- `pipeline/fliser/vakter/ut3-rekruttering.js` – NY vakt. `docs/natt/ut3-rekruttering-hjelp.json` – fire hjelpeemner (gruppe «Leiren»).
- Endret (små, samlede endringer):
  - `spill/folk.js`: (1) `arbeidsfør` er usann for `p.skole` (på opplæring); (2) `personTempo` ganges med den nye kroken `api.personF(p, o)`
    (null som standard); (3) `lønnSats(p)` og `lønnSum(F, ekstra, infl)` – hver person kan ha `p.lønn`, ellers `R.lønn` (`ekstra` = antall eller en liste med personposter); `lønnSteg` bruker
    `lønnSum`. Uten egen lønn er tallene nøyaktig som før (`lønnPerDøgn` finnes fortsatt; test_folk og økonomitesten uendret).
  - `spill/folk-visning.js`: (1) knappen `#rekrutter` er «Søkere (n) ↓» (ruller ned til søkerne) når søkerlista finnes og gjengen ikke er i nød;
    i nød (under tre) er det den gamle rekrutteringen; grunnen (`#rekrutthvorfor`) står som før (fra `RekrutteringSpill.hvorfor()`);
    (2) `lønnNå` = `FR.lønnSum`, og lønna for mennene i egne tropper regnes fra personpostene deres (`m.person.lønn`, ellers 15 000); (3) oppgaveradene sier «n på opplæring» i stedet for å regne dem som syke; (4) ved hver person
    `RekrutteringSpill.personDel(p)` (lønn, egenskaper, opplæring); (5) nederst i panelet `RekrutteringSpill.del(...)` (søkere og opplæring).
  - `spill/morgen-visning.js`: én løkke etter rapportlinjene – `window.MORGEN_LINJER` (liste av `d => tekst | null`) legges til i rapporten.
  - `index.html`: to skript-tagger rett etter `jobber-visning.js` (`rekruttering.js`, `rekruttering-visning.js`), versjonsmerkene satt med `versjon.py`.
  - `leir.js` er IKKE endret (bygget legges inn fra rekruttering.js, så test_leirvirkning/test_merker ikke krever nye linjer der).

## Slik virker det
- **Søkere** (`Rekruttering.morgen`): hver morgen kl. 06 (ny dag, samme tid som morgenmøtet) kommer `round(forventet + (r − 0,5) · 1,6)` søkere,
  0–3. Forventet = 1 + (pålitelig − 50)/40 + 0,35 per by du holder (høyst +1) + 0,25 per aktiv kontrakt (høyst +0,75). Rykte fra
  `SelskapSpill.tilstand().sider.blå.rykte.pålitelig`, byer fra `TETTSTEDER` (eier blå), avtaler = aktive kontrakter. Høyst 6 på lista.
  En søker lages med `FolkRegler.nyPerson` (samme yrker og ferdigheter, navnet reserveres i `F.navnBrukt`) og tas ut av gjengen igjen.
  Søkeren står 2–4 døgn og går så («ventet ikke lenger»).
- **Lønnskrav** (`Rekruttering.krav`): 12 000 + 10 000 × (beste ferdighet − 0,9)/0,55 (0 ved 0,9, alt ved 1,45) + 1 000 per egenskap,
  hele 500, 12 000–25 000 kr i døgnet. Startgjengen har ikke `p.lønn` og får 15 000 som før.
- **Egenskaper** (45 % har én, ca. 12 % to): flittig +10 % tempo, nattmenneske +15 % kl. 18–06, modig +15 % på vakt, lærenem 50 % raskere
  opplæring. Virker gjennom `FolkRegler.personF` (settes av visningen med klokka i spillet).
- **Bud**: søkere med beste ferdighet ≥ 1,3 har bud fra Ravnsund eller Mosevakt med sjansen 0,55, på kravet × 1,10–1,25. «Ansett» går
  ikke da – «By over» ansetter for budet + 1 000 kr (lojalitet +0,05). Hver morgen går en med bud til rivalen med sjansen 0,35.
- **Ansettelse** (`Rekruttering.ansett`, kommando `ansett { søker, byOver }`): krever det samme som før (`FolkRegler.kanRekruttere`: ledig seng og
  moral ≥ 40, ikke i nød) og 150 000 kr for utstyret; personen får `p.lønn` = kravet (eller budet + 1 000) og `p.egen`. I nød går den nye
  på «bygg» som før.
- **Lokking** (bare om morgenen, ikke i testene): misfornøyd = lojalitet < 0,55 og (moral < 45 eller lønn < kravet − 2 500). Sjanse 0,15 per
  morgen for ett tilbud (`S.lokk`) på max(kravet, lønna + 2 000). Frist 12 spilltimer. «Gi lønnstillegg» (kommando `lokkSvar { valg: 'tillegg' }`)
  gir budet som lønn og +0,1 lojalitet; «La gå» (`valg: 'gå'`) eller ingen svar: personen går (`F.borte` + 1).
- **Opplæring** (14.2): bygget **Øvingsfelt** (2,5 mill. kr, 2 t, 0 kW, modellen til lagerteltet, 10 planker, 4 betong, 1 stål) gir 4/6/8
  elevplasser per nivå. Kommando `opplæring { person, ferdighet }` (ferdighet null = avslutt). En elev (`p.skole = oppgave`) er ikke arbeidsfør
  (jobbtavla flytter hen ikke), og ferdigheten stiger 0,05 per døgn (lærenem 0,075) til 1,45 – da tilbake i arbeid (melding).
- **Mester og lærling**: på hver oppgave med minst to arbeidsføre og en mester (≥ 1,3) lærer de andre 0,01 per døgn opp til mesteren − 0,1
  (høyst 1,45). Bare i ekte spill (ikke av seg selv i testene). Den eksplisitte opplæringen i Samfunn (lærer + elev) finnes fortsatt ved siden av.
- **Morgenmøtet**: «Én ny søker i Folk-panelet: Kari Haugen (kokk, krever 18 000 kr/døgn).» i rapporten (og i loggen).
- **I testene** (navigator.webdriver) kommer ingen søkere, ingen lokking og ingen mester/lærling før `RekrutteringSpill.test = true`.
- **Lagring**: `riksbrudd-rekruttering` = `{ leir: 'x,y', S }` (søkerne, tilbudet, frø). Lønn, egenskaper og opplæring står på personen i folket (`L.folk`).

## API
- `Rekruttering`: `REGLER, EGENSKAPER, ny, fraJSON, rng, beste, krav, lønn, forventet, antall, egenskaper, lagSøker, morgen, steg, kanAnsette,
  ansettLønn, ansett, misfornøyd, lokkSjekk, svarLokk, personF, plasser, elever, startOpplæring, stoppOpplæring, skoleSteg, mesterSteg, registrerKommandoer`.
- `RekrutteringSpill`: `test, tilstand(), sett(o), start(), morgen(), steg(dt), ctx(), del(h), personDel(p), hvorfor(), ansett(id, byOver), svar(valg), opplæring(id, o), lagre()`.
- `FolkRegler.lønnSats(p)`, `FolkRegler.lønnSum(F, ekstra, infl)`, kroken `FolkRegler.personF(p, o)`.
- `window.MORGEN_LINJER` (morgenmøtets rapport).

## Prøvd
- `node pipeline/fliser/test_rekruttering.js` (alt ok), test_folk, test_jobber, test_kommando, test_morgen, test_leirvirkning, test_merker,
  test_samfunn, test_leir grønne. `node pipeline/fliser/test_okonomitest.js` ok (4 kjente brudd); med `OKO_STRENG=1` bare de fire kjente
  bruddene for «hogst og salg» / «bare sagbruk» / sagbruket.
- Nettleser (1400 × 860 og 390 × 844 mobil, bilder sett): Folk-panelet med tilbudet fra Mosevakt, to søkerkort (det ene med bud og «By over»),
  opplæringen med elev, velgere og Start; morgenmøtet med linja om ny søker. Ingen sidefeil.
- Vakten `ut3-rekruttering` på PC og mobil grønn; med en feil lagt inn med vilje (`lønnSats` uten `p.lønn`) feilet den på «lønn».
  Kjørt etter den: folk, lonn, regnskap, ut1-jobber, morgen, leirvirkning, ut2-sagbruk grønne; ui grønn alene (feilet én gang i en lang
  rekke etter andre vakter – «kortet setter ikke spillet på pause med lapp»); okonomi feiler på «prognose lik» også på grenen før denne pakken.

## IKKE gjort (senere / åpent)
- «Venner i leiren holder på dem» (14.1) er ikke med – bare moral, lønn og lojalitet.
- Varselet om lokking står i loggen og øverst i søkerdelen av Folk, ikke som brikke i #varsler (narhud.js er ikke endret).
- Spioner blant søkerne (14.3) er ikke laget, men en søker har allerede alt som trengs for å få et skjult `spion`-merke senere.
- Øvingsfeltet har ingen egen 3D-modell (bruker lagerteltet) og ingen egen 2D-stil i leir2d.js (standard flatt tak).
