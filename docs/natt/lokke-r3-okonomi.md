# Kritikerløkka runde 3 – pakke «økonomi» (26. nov)

Gren: `claude/lokke-r3-okonomi`. Anmeldelsene: `docs/kritikk/2026-11-26-r3-ingrid-saether.md`, `…-r3-jonas-bakke.md`.
Alle tall under er Claudes forslag (ikke brukerens fasit). Brukerens faste valg er ikke rørt: 40 mill. i start, lønn 15 000 kr per
person per døgn, inflasjon 1 %, kontraktene er den røde tråden.

## 1. Tettstedene gir ikke lenger fri pengemaskin (Ingrid, middels)
Årsaken var tredelt:
- **Regionens «døgn» var et handelsdøgn**: høyst ti minutter ekte spilling. På 1×–60× gikk regionen derfor 2,4 ganger (60×) til
  144 ganger (1×) så fort som spilldøgnet lønna og vedlikeholdet regnes i. Nå er døgnet et spilldøgn (`region-visning.js`: `d = spillAkk`).
- Skatten kom full fra første time, og det kostet ingenting å holde tettstedet.
- Taket var 1,5 mill. kr per tettsted.

Nye regler (`spill/region.js`, `REGLER`):
- `skattMaks` 1,5 → 1,2 mill. kr.
- `forvaltning: .25` – en firedel av skatten går til bygdevern og forvaltning i tettstedet (kommer aldri til leiren).
- `innkjøring: { start: .3, døgn: 3 }` – nytt tettsted betaler 30 % av skatten første døgn og full skatt etter 3 døgn (`b.holdt` =
  døgn holdt, lagres; tatt igjen = begynner på 0; lagret spill fra før uten `holdt` regnes som innkjørt).
- `Region.skatt(folk, type, st)` gir brutto / forvaltning / holdt igjen / netto; `Region.gir` gir netto; `Region.innkjøringTekst(holdt)`.
- Garnisonen: lønna til troppene i garnisonen regnes alt (folk-visning.js betaler lønn for lag med `fraFolk`). Startlagene (uten
  `fraFolk`) får ingen lønn – ikke endret (garnison.js er ikke rørt).

Rammer (`test_balanse.js`, ny del «tettstedene»): en by på 20 000 med full skatt gir 1,01 mill. kr netto per døgn – under én middels
kontrakt (hent person, 1,5 mill.) – og minst tre ganger lønna til en garnison på 12 (0,18 mill.); første døgn 0,30 mill.; en bygd på
1500 gir 0,13 mill. (holdes for varene og ruta). For Ingrids Gjøvik på 60×: før ca. 3,6 mill. kr per spilldøgn, nå 0,3 → 1,0 mill.

## 2. Ett tall for skatten, med navn
- Region-panelet, Leir → Regionen, Krig og tettstedspanelet sier «Gir nå (anslag per døgn)» – samme tall (`girNå`).
- «Siste døgn» = det som faktisk kom inn, fra dagboka i `penger-visning.js` (kategorien `skatt`, kl. 06–06), vist i Region og Lager.
- Loggmeldingen «Regionen ga det siste døgnet (dag N): …» kommer nå ved spilldøgnets skifte kl. 06 (før: hvert handelsdøgn).
- Krig for et tettsted du ikke holder: «Hvis du tar det, per døgn med full skatt: …» + linja om innkjøring og forvaltning.

## 3. Penger inn: egne kategorier, aldri to like navn
Årsaken til «byggingen står under annet»: `hvaFra` tok filnavnet uten «.js» («leir») fra stakken, men regelen krevde `leir\.js`.
Alle kjøp i `spill/leir.js` (bygg, diesel, materialer, reparasjon) og lønna fra `folk.js` ble «annet». Nå (`penger-visning.js`):
`rammer(stakk)` gir fil + funksjonsnavn, `HVA` velger etter fil og så funksjon: bygg, materialer, diesel, reparasjoner, salg, lønn, mat,
rekruttering, vedlikehold, kontrakter, bøter, skatt, støtte til tettsteder, svartebørs, **avtaler** (krig-visning `vernAvtale`/`fred`),
krig og forsvar, kjøretøy og utstyr, morgenmøtet, funn og belønninger, samfunnet, marked og røvere; ukjent = annet. Resten etter de
største postene heter «andre poster» (før «annet» – derav de to like linjene). (Punkt 7: avtalen for 8 mill. står som «avtaler».)

## 4. Radiorådet
`Kontrollrom.radioRåd({ hånd, felt, mast, feltNår, avstand, terreng, mål })`: lag med håndradio får «… har håndradio (3 km) – en
radiomast hjelper ikke håndradio. Gi laget feltradio (1 mill. kr per lag) – da når det så langt som leirens radio (X km).» Masten
nevnes bare for lag med feltradio. Brukt i advarselen før marsjen (`strategi-visning.js`, én linje – se under).

## 5. Bålplassen og prisen
- `Leir.følgerBakken(type)` / `Leir.FØLGER_BAKKEN` (bålplass, flaggstang, flaggrekke, skilt, sandsekkvoll, gassflasker, jerrykanner,
  skytebane, hinderløype, parkering, kameramast, eller `BYGG[t].bakke`): `Leir.grunn` gir bakkens høyde midt under og forskjell 0 – ingen
  grunnmur i 3D, ingen «skrå grunn: … grunnmur» i banneret, og hellingsteksten sier «følger bakken, ingen grunnmur».
- Prisen: 75 000 → 72 000 kom av at hogsten la 0,2 m³ tre på lageret mens banneret sto. Banneret regnes nå på nytt når prisen på det
  som mangler endres (hvert 0,4 s), og «Kjøp materialene og bygg» oppdaterer banneret i stedet for å kjøpe når prisen har endret seg.

## 6. Opplæringen
«Reparer byggene etter et angrep» er gjort når en reparasjon er satt i gang etter et angrep (`b.reparert`, husket som `T.reparert`),
også om et bygg som var opptatt (oppgradering) eller som pengene ikke rakk til, fortsatt er skadet. Jeg fant ikke sikkert hvilket bygg
som holdt steget åpent hos Ingrid; mest sannsynlig et bygg som var opptatt da hun trykket «Reparer alle» (det hoppes over der).

## Fellesfiler endret (små endringer)
- `spill/strategi-visning.js` (kontrakt-hjelperen eier den): én linje i advarselen før marsjen – rådet kommer fra
  `KontrollromSpill`/`Kontrollrom.radioRåd` når de finnes (ellers den gamle teksten). Søk etter `data-radioraad`.
- `spill/leir-visning.js` (delt med skjerm-hjelperen): `hellingTekst` (følger bakken), intervallet ved `hellingtekst` (banneret regnes på
  nytt når materialprisen endres), `kjøpOgBygg` (første linje), og `mur = …` får `!LB.følgerBakken(p.type)`.
- `pipeline/fliser/vakter/sjo.js` og `vakter/lokke-r1-okonomi.js`: regex/regnestykke for de nye tekstene og forvaltningen.
- `index.html`: bare versjonsmerker (versjon.py).

## Tester og vakt
`test_region.js`, `test_balanse.js`, `test_penger.js`, `test_kontrollrom.js`, `test_leir.js`, `test_opplaering.js` – alle grønne.
Vakt: `pipeline/fliser/vakter/lokke-r3-okonomi.js` (PC og mobil ok, ca. 0,1 s). Prøvd med feil lagt inn med vilje (leir-regelen i
`HVA` ødelagt): vakta meldte «byggekjøpet står ikke under bygg … kjøp i leiren ble ført som annet».

## Ikke gjort
- Lønn for startlagene i garnison (de har ingen lønn i det hele tatt) – ikke endret.
- Dagboka (morgenrapporten) viser fortsatt bare inn/ut i sum, ikke postene.
- Markedet har fortsatt sitt eget «handelsdøgn» (ikke min fil).
- `vakter/okonomi.js` feiler i mitt prøveoppsett på dieselprognosen («Ingen tank») – feiler likt på utgangspunktet (ba95513), gjelder lager-visning/dieselen, ikke noe jeg har rørt.
