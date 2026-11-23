# R18-A – Kontraktene som den røde tråden (23. nov)

Brukeren: «det må være én tydelig rød tråd». Kontraktene i Selskapet (W1, `spill/selskap.js`) er nå hovedløkka.
Alle tall er Claudes forslag (samlet i `Selskap.REGLER`).

## Den første kontrakten
- `Selskap.førsteKontrakt(S, side, nå, steder, reserve)`: et nytt selskap (ingen kontrakter før, `S.nr === 0`) får tilbudet
  «Hent nødlageret i <sted>» (type `forsyning`, `første: true`, 400 000 kr, 72 t frist, ingen bot). Stedet: tettstedet/brua nærmest
  2 km fra leiren innen 0,6–6 km, ellers «nødlageret» 1,6 km unna på land. Navnet er «nødlager» (ikke «forsyninger») så det ikke
  blandes med de gamle oppdragene i `spillet.js` («Hent forsyninger»-diamantene).
- Laget (en tropp) innen 150 m av stedet henter lageret (`k.bærer`), innen 300 m av leiren er kontrakten levert (betales straks).
- TRÅDEN (`Selskap.TRÅD`, `oppdaterTråd`, `trådSteg`; tilstanden i `S.tråd = { k, gjort, byggVed, slutt }`, lagres med selskapet):
  ta → tropp (en egen tropp med `s.fraFolk`) → send (hentet) → hjem (levert, husker antall bygg) → bygg (ett bygg til i leiren) →
  neste (en kontrakt nr. 2 er tatt). Brytes den første kontrakten, hoppes det til «neste».
- Mens tråden går før «bygg», kommer ingen nye dagstilbud (én ting om gangen). Når den første er levert, kommer nye tilbud straks.
- Opplæringsruta (`opplaering.js`) venter mens tråden pågår (`SelskapSpill.trådAktiv()`); stegene der sjekkes fortsatt.
- Leir-menyen: «Første kontrakt – neste steg» står øverst i stedet for «Neste mål» mens tråden går (`maal-visning.js`).

## Nivåer og krav
- `Selskap.REGLER.NIVÅER`: 1 Ukjent, 2 Kjent i bygda (2 levert, pålitelig 55), 3 Etablert (5, 65), 4 Ettertraktet (10, 78);
  betalingsfaktor 1 / 1,35 / 1,8 / 2,4; lagstørrelse for hold 3/5/7/9 (rydd én til).
- `nivå(sd)`, `nesteNivå(sd)` (hva som mangler), `kravFor(k)` (avledet av type og `k.nivå`), `kanTa(k, har, sd)`, `kravKort(k)`.
  `godta(..., har)` avviser med «Dere mangler: …». Eskorte krever et eget kjøretøy (bestill ved basen).
- `lagTilbud` gir hvert tilbud `nivå`; med sjanse `teaser` (0,5) er det siste fra neste nivå – vises låst (🔒, grå knapp).
- Panelet viser «Nivå N · navn», hva som mangler for neste nivå, tråd-boksen og kravet på hvert tilbud (grønt/rødt).

## Koblingene
- Markedet: betalingen ganges med prisstigningen (`SpilletSpill.M().infl`) når tilbudene lages.
- Krigskartet: `KRIG_TILLEGG.by` viser kontrakt/tilbud ved tettstedet; levert i et tettsted dere eier gir +25 % (`egetSted`).
- Forsvar: `lever` gir `motangrep` (rydd 50 %, hold 20 %, eskorte/hent 10 %, aldri den første) -> `SpilletSpill.angrep()` når
  ingen bølge er i gang.
- Folk: fra nivå 2 gir levering 35 % sjanse for at en ny person blir med gratis (`FolkRegler.rekrutter`).
- Nytt nivå meldes i loggen.

## «Neste»-lappen
- `#nestelapp` over kommandolinja (PC) / bunnmenyen (telefon), og over opplæringsruta/«Mer»-raden. Står bare når bunnmenyen står.
  Tekst fra `SelskapSpill.lapp()` (tråden, ellers den aktive kontrakten med kortest frist via `Selskap.lappFor`, ellers ledige tilbud).
  Trykk = `SelskapSpill.følgLapp()` (åpner Selskapet / Tropper / Leir, eller viser stedet og velger troppen).
- Knappen steget gjelder får klassen `traadpek` (gul, pulserende kant): Selskapet (eller «Mer»), Tropper, Leir, «Marsjer».
- Ikke i testene før `SelskapSpill.test = true`. Tråden sjekkes hvert halve sekund (KROKER.sim går bare hvert spillminutt).

## Kommandolaget
- `kontraktTa`, `kontraktAvslå`, `kontraktLever`, `kontraktAvbryt`, `kontraktPris` (leir-kommandoer) i `kommando-visning.js`;
  arbeidet i `SelskapSpill.rett`. Knappene i panelet går gjennom `KOMMANDO`.

## Filer
`spill/selskap.js`, `spill/selskap-visning.js`, `spill/kommando-visning.js` (én blokk), `spill/opplaering.js` (én linje),
`spill/maal-visning.js` (én blokk), `spill/hjelp.js` (én setning), `docs/natt/kontrakter-hjelp.json` (fire emner),
`pipeline/fliser/test_selskap.js` (28 nye tester), `pipeline/fliser/vakter/kontrakter.js` (vakta «den røde tråden»).

## Ikke gjort
- De gamle oppdragene i `spillet.js` (hent/redd/post) finnes fortsatt ved siden av kontraktene – de bør på sikt bli kontrakter.
- Motstanderselskapene tar ikke den første kontrakten, og AI-en har ingen egen kontraktsløkke.
- Ingen egen kontrakt der et tettsted skal tas (krigskartet viser bare kontraktene som finnes).
