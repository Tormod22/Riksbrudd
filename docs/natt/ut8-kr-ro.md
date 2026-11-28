# ut8-kr-ro – ro i skjermen og én tydelig vei (28. nov)

Kritikken fra Ingrid Sæther (docs/kritikk/2026-11-28-ut-ingrid-saether.md): to stiger (trinn og nivå), byer uten vei til mer tillit,
alle Norges byer i lista, eksport på trinn 1, 123 bygg uten orden, Neste-lappen som sto fast på en kjøpsavtale.
Gren: `claude/ut8-kr-ro`. Alle tall er Claudes forslag.

## 1. Trinn og nivå på samme linje (ingen regler endret)
- `spill/trinn.js`: `Trinn.nivåLinje(R, nivå, maks)` → `{ nivå, navn, krav, trinn, ok, kort, lang }` – det neste trinnet som krever et nivå
  og om nivået er nok («nivå 1 av 3 for trinn 3»). Kravteksten heter nå «Ryktet er på nivå 3 «Etablert» (nå nivå 1)».
- `spill/selskapspanel.js`: hodet i Selskapet har en linje til under trinnet («Rykte: nivå 1 av 3 for trinn 3», `.nivlinje`);
  Oversikt-raden heter «Nivå (rykte)» og sier «Trinn 3 krever nivå 3.».
- `spill/selskap-visning.js` (Kontrakter): overskriften er «Trinn 2 Leverandør · rykte: nivå 1 · Ukjent», og «Neste nivå»-teksten får
  «Nivået er ryktet som kunde: trinn 3 krever nivå 3.» (liten endring i `html()`).

## 2. Byer: tillitssporet, budkampen og byoppdrag
- `spill/byavtale.js` (regler):
  - `REGLER.budkamp = { løfte: { lite: 0, vanlig: 5, stort: 10 }, min: 25 }` – **Claudes regel**: når en rival frir til byen (eller har
    avtale der), synker kravet til tillit for beskyttelse med løftet dere gir: 2 mann 40, 4 mann 35, 6 mann 30 (= det en ny by starter på).
    Prisen må fortsatt være under rivalens (`rival.overby`, som før). Bare beskyttelse, ikke handel/medlem.
  - `budkamp(b)`, `tillitKrav(b, t, løfte)`, `kanTrinn(..., o)` tar nå `{ løfte }` som 6. ledd (gamle kall uten det er som før);
    `forhandle` sender løftet.
  - `tillitSpor(b, { holdning, navn, trinn })` → `{ krav, mangler, budkamp: { krav, løfte, mann } | null, veier }` med tallene som finnes:
    kontrakt +4 (`tillit.kontrakt`), vokt byen +2 per døgn opp til 50 (`tillit.holdt` × holdning; patriot 1,4), med avtale: hold løftet
    +2/døgn, hjelp i tide +5.
  - `fraJSON` beholder `oppdragFor`.
- `spill/byavtale-visning.js`:
  - Byens kort: boksen «Budkamp» (hva hvert løfte krever, hvilket løfte som holder, høyeste pris) og «Slik får dere mer tillit» med
    knappene «Se tilbudet» (→ Kontrakter) og «Send lag». Knappen «Forhandle om beskyttelse» regnes med det minste løftet som holder.
  - Forhandlingen: kravet regnes med valgt løfte; i budkamp foreslås det minste løftet som holder og en pris under rivalens.
  - `byOppdrag(id)`: mens en rival frir og byen ikke har tilbud/aktiv kontrakt i Selskapet, kommer ett tilbud fra «Kommunen i X»
    (`Selskap.lagTilbud` med fast oppdragsgiver, `k.byOppdrag`). Én gang per frieri (`b.oppdragFor = forhandler.fra`). Utløses i
    timeSteg (bare utenfor testene) og når spilleren åpner byens kort. Levert kontrakt gir +4 tillit (lytteren fantes fra før).
  - API: `ByavtaleSpill.byOppdrag`, `kontrakterFor`, `andre(v)`.
- NB: `byOppdrag` legger et tilbud rett i Selskapets tilstand (ikke gjennom KOMMANDO) – det er spillet som svarer, ikke en knapp
  som endrer tilstand (samme mønster som firmaenes faste tilbud).

## 3. Bare byene i området
- `byavtale-visning.js liste()`: byene i `område()` (Strategi.område, som krigskartet) står i lista; resten under knappen
  «▸ Andre byer (N) – utenfor området» (sammenfoldet; `data-sp="ba-andre"`). Reservevisningen i selskapspanel.js er ikke endret.

## 4. Eksport og børs låst til trinn 3
- `selskapspanel.js oversikt()`: Verdi/Kurs (børsen) står fra trinn 3 (`LÅST.børs = 3`). Eksportdelen vises når `EksportSpill.åpenNå()`
  (trinn 3 eller havn/grense nær) eller dere alt har ordrer/eurokreditt; ellers én rolig linje «Låses opp på trinn 3 (Makt i regionen).»
  (overskriften har fortsatt `id="eksport"`). Fanen Eiere er uendret.

## 5. Bygglista i grupper
- `leir-visning.js`: `byggGrupper(GR)` gir fast rekkefølge (`BYGGREKKE`): Bo og leve, Produksjon, Strøm og diesel, Lager og arbeid,
  Oversikt og samband, Forsvar, Droner og sensorer, Trening, Veger, Annet, Utstyr og småting, Pynt. «Ting i leiren» deles: med kW →
  Strøm, med virkning i `Leirvirkning.VIRKNING` → «Utstyr og småting», resten → «Pynt». Åker → Produksjon, øvingsfelt → Trening.
  Hvert bygg står én gang (betongblanderen sto to ganger). Hver gruppe (`h4.gruppe`) foldes med et trykk (Enter/mellomrom);
  «Utstyr og småting» og «Pynt» er sammenfoldet fra start (`BYGG_LUKKET`). Valget huskes i nettleseren (`riksbrudd-byggrupper`).
  Byggekortene har `data-gruppe`.

## 6. Neste-lappen
- `spill/neste.js`: `Neste.avSegSelv(k)` (kjøpsavtale, eller levering Gråfjell kjører) → slaget «avtale» med prioritet 30 (under trinn
  42 og mål 40). Trinnsteget skjules ikke lenger av en slik lapp.
- `selskap-visning.js lapp()`: en avtale som går av seg selv viker for en aktiv kontrakt som trenger dere og for ledige tilbud; bare uten
  noe annet står den i lappen.

## Tester og vakt
- `test_trinn.js` (+7), `test_byavtale.js` (+18 budkamp/spor), `test_neste.js` (+3). Alle regeltestene i oppdraget er grønne
  (trinn, selskapsbilde, neste, byavtale, kommando, leir2d, merker, selskap, leir, eksport, bors, vare).
- Vakt `pipeline/fliser/vakter/ut8-kr-ro.js` (2–4 s): punkt 1–6. Prøvd PC og mobil på Dovre-testsiden; med `budkamp.løfte.stort = 0`
  lagt inn med vilje fant den feilen. Vaktene ut1-selskap, ut2-byer, ut2-seier, ut5-bors, ut4-eksport og ui er grønne (PC).

## Ikke gjort
- `versjon.py` er ikke kjørt (ingen nye skript-tagger; index.html er ikke rørt) – kjør den ved flettingen.
- Budkampen gjelder bare beskyttelse; handel/medlem har samme krav som før.
- Det gamle «Neste steg (beskyttelse): … tillit 30 av 40» nederst i kortet står fortsatt når det ikke er budkamp (nå med sporet over).
