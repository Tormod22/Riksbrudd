# Pakke «balanse» – natt til 18. nov (fortsettelse av «test1»)

Gren `claude/natt18-test1`. Utgangspunktet var gjennomspillingen i `docs/natt/test1.md` (sju spilldøgn på /rogaland, leir ved Sand):
startbyggene brukte nesten hele kassa, røverbyttet var hovedinntekten, bølgene vokste fort, og stridsvogna/rakettartilleriet bar
forsvaret alene. Det uferdige utkastet (18f62fd) er beholdt og bygget videre på. **Alle tallene under er Claudes forslag.**

## Tallene (samlet) og hvorfor

| Hva | Før | Nå | Fil | Hvorfor |
|---|---|---|---|---|
| Røverbytte per bølge | 2 mill. + 1 mill. × nr (3, 4, 5 … mill.) | 300 000 + 150 000 × nr, høyst 1,5 mill. (450 000, 600 000 …) | `spillet.js` Trussel.BALANSE.bytte | Ett tettsted (Sand) ga 185 000–404 000 kr per døgn; byttet var 10 × det. Nå omtrent det en bølge koster i reparasjon og ammunisjon. |
| Lag per bølge | 1, 1, 2, 2, 3, 3 … høyst 6 | 1, 1, 1, 2, 2, 2, 3 … høyst 6 (perLag 3) | `Trussel.lag` | Vokser halvparten så fort. |
| Tak etter soldater | – | ett lag per 8 soldater (minst 1), +1 med stridsvogn/rakettartilleri | `Trussel.lagFor` (mennPerLag) | Bølgen følger det spilleren har; en ny gjeng på ti møter aldri fire lag. |
| Tak etter dagen | – | 1 lag dag 1–3, 2 dag 4–6, 3 dag 7–9 … (dagerPerLag 3) | `Trussel.lagFor` (o.dag) | «Følger dagen»: tidlig i spillet er det aldri mer enn ett lag. |
| Vanskelighetsgrad | ganger antall lag | som før (`SPILLREGLER.faktor.røvere`, lett 0,6 – hard 1,5) etter takene | `spillet-visning.js` | |
| Første bølge | 12 spilltimer / 18 ekte min | 24 spilltimer / 30 ekte min (det som kommer først) | `Trussel.BALANSE.først` | Brakke (2 t), aggregat, tank og vakttårn (1 t hver) og en tropp rekkes uansett fart. |
| Tid mellom bølger | 20 − nr t (min 10) / 26 − 2·nr min (min 12) | 27 − nr t (16–26) / 30 − 2·nr min (16–28) | `Trussel.vent` | Tid til å reparere mellom bølgene. |
| Lagret spill | ny bølge etter 12 t | halv vanlig ventetid (første bølge: 24 t som nytt spill) | `spillet-visning.js` start() | |
| Kontrollrom | 15 mill. kr | 9 mill. kr (materialer som før: 10 tre, 40 betong, 8 stål) | `leir.js` | Brakke + aggregat + dieseltank + kontrollrom med materialer (1,5 × pris) og 500 l diesel: 38,8 → 32,8 mill. av 40 (7,2 mill. igjen). |
| Betonghylla i markedet | 40 m³, fyll 10/døgn | 60 m³, fyll 12/døgn | `spillet.js` Marked.LAGER | De fire første byggene trenger 48 m³ betong. |
| Opplæringen/målene | – | «Kontrollrommet (9 mill. kr) kan vente til leiren står og du har en tropp og et vakttårn» | `maal.js`, loggen ved start (`oppstart-visning.js`) | |
| Startkjøretøy i nye spill | stridsvogn, rakettartilleri, lastebil, speiderbil | lastebil og speiderbil (S.lettStart) | `oppstart-visning.js` | Kan bygges på basen senere. Testene (webdriver) og lagrede spill som før. |
| Motstanderne og leiren | angrep leiren så snart den var funnet | fredstid i et ekte spill: 4 døgn på Vanlig (5 Lett, 3 Hard = 4 / faktor.fiende, 2–6): leiren er ikke mål, og lag innen 1,5 km fra leiren regnes ikke som mål | `fraksjoner-visning.js` (fredTid) | Gjennomspillingen: Kystalliansen i leiren på dag 2, Vaktlaget utslettet, byggene ned til 21–27 %, og på dag 3 var alt utenom vakttårnet borte. |
| Avbrutt bølge | røverne borte, bølgenummeret økt | samme bølge kommer igjen etter 20 spillminutter / 1 ekte min | `spillet-visning.js` start() | Røverlagene lagres ikke (lagring.js hopper over e.raid); å starte bølgen på nytt er enklere og sikrere enn å lagre dem. |
| Første hus du leter i | kunne være tomt | aldri tomt: 4 rasjoner og 20 000 kr hvis det ellers var tomt | `leting-visning.js` | Ikke i testene. |
| Butikk | 20 % tomme | aldri tomme (alltid mat) | `leting.js` | Butikken har fulle hyller i 3D. |

Kostnaden for en nybegynner som følger rådet (brakke, aggregat, tank, 500 l diesel, en tropp, et vakttårn): 26,5 mill. – 13,5 mill.
igjen til mat, reparasjoner og kontrollrommet senere. Med kontrollrom første dag: 38,3 mill. (1,7 mill. igjen) – det er derfor rådet
sier at det kan vente.

## Sjudøgnsspillet (/rogaland, Sand 6825, 6627357, «Vanlig», webdriver av)

Spilt med scratchpad `natt/balanse/` (daemon.js + s/ny.js, hj.js, b1.js, b2.js, dag.js). Dag 1: brakke, aggregat, dieseltank,
tropp av fire (de to «fri» og to fra bygg) og vakttårn ved start, 500 l diesel når tanken sto. Spolingen med ⏭, første valg på
alle kort, «Forsvar leiren» ved alarm. NB: skriptet kjøpte kontrollrommet så snart kassa hadde 16 mill. – det skjedde alt på dag 1
(17,5 mill. igjen etter de andre byggene), altså ikke slik rådet sier. Kjøringen startet FØR fredstiden for motstanderne var lagt inn.

TABELL_HER

## Ikke gjort
- (b) Karakteren blir «utslitt» når du spoler – ikke rørt.
- (d) «Gå» fra opplæringen setter deg ikke ved karakterlaget – ikke rørt.
- Ingen ny sjudøgnskjøring med fredstiden for motstanderne (tiden rakk ikke).
