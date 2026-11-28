# ut10-fabrikkbygg – industribygg i kartet tatt i bruk som fabrikk (28. nov)

Brukeren: «Lag det som ikke er bygget». Industribyggene i kartet kan nå tas i bruk som fabrikk, og maskinene der går med de samme
reglene som maskinene i leiren. Grenen `claude/ut10-fabrikkbygg` fra `claude/nattfiks`. Alle tall er **Claudes forslag**.

## Slik virker det for spilleren
Trykk på et industribygg -> «Ta over huset» / «Se inn» (plantegningen). Raden «Ta i bruk som fabrikk: sagbruk og flishogger (4 mill. kr, 8 t)»
(eller hvorfor det ikke går). Trykket betaler istandsettingen; byggelaget setter maskinene i stand (en jobb som andre), og så går de når
folk står på «Maskiner», det er strøm i leiren og råvare i lageret. Plantegningen viser «Din fabrikk: Sagbruk: går · Flishogger: ingen folk»
og «Gi opp fabrikken». Kartet: «Din fabrikk · Sagbruk» over bygget og en prikk per maskin; produksjonstallet over maskinen som for de andre.
Fanen Produksjon: «Fabrikkbygg» med bygget, bransjen, avstanden, maskinene, folkene og hvorfor de står.

## Bransjene (spill/fabrikkbygg.js, `MASKINER`)
| bransje | maskiner (den andre bare i bygg ≥ 500 m²) |
|---|---|
| tømmer/sagbruk | sagbruk (+ flishogger) |
| fisk/sjømat | fiskemottak (+ filetmaskin) – fisken kommer fra båtene når fiskemottaket virker (kjeder-visning.js teller fabrikkbygget) |
| stein/pukk | steinknuser (stein fra steinbruddet) |
| mat | mølle (korn fra byene) |
| olje | raffineri (olje fra basen -> diesel) |
| metall/verksted | smie (skrap -> stål og deler) |
| gjenvinning | ballepresse (skrap -> stål) |
| trevare, gass, verft, kraft, lager, bryggeri, kjemi | **ingen** – tas over som lager eller verksted (overtak.js, som før); raden sier det |

## Reglene
- `Fabrikkbygg.kanTa({ ind, avstand, alt, revet })`: bransjen må ha maskiner, og bygget må ligge innen **1,5 km** fra leiren (`maksAvstand`):
  bærerne og operatørene går dit, og strømmen trekkes dit i kabel. (Utposter er ikke med: bærerne henter fra leirens varelager.)
- `istand(maskiner)`: 0,8 mill. + 1,6 mill. per maskin, 2 t + 3 t per maskin arbeid (et nytt sagbruk koster 6 mill. + materialer).
- `lagBygg(...)`: maskinene blir bygg i leiren, type `fb_<maskin>` (Leir.BYGG, `del: true` – leir-visning tegner dem ikke, interiøret i huset
  har maskinene), plassert der møbelet står i hallen (`MØBEL`: sagbenk, knuser, sløyelinje …), `b.fabrikk` = husets nummer, `igjen` = arbeidet.
- Samme regler som maskin-byggene: `produksjon.js` (inn/ut per time, folk, strøm, slitasje, «hvorfor står den»), `baering.js` (operatørene
  står ved maskinen, bærerne henter råvaren i lageret og bærer varene tilbake), Leir.steg (strømmen fra leirens nett/aggregat; strøm-
  prioriteten har fått typene). Fiender innen 120 m skader maskinene som andre bygg (leir-visning.js) – meldes nå med maskinens navn.
- Lagring: maskinene lagres med leiren («riksbrudd-k2»); hvilke hus som er fabrikker i «riksbrudd-fabrikkbygg» = { v: 1, leir, hus }.
  Prøvd: tatt over, lagret, siden lastet på nytt -> maskinene og fabrikken er der.
- I testene (navigator.webdriver) er maskinene satt i stand straks (ingenting skjer av seg selv); `FabrikkbyggSpill.test = true` gir jobben.

## 3D og lyd
Maskiner.LIV har `fb_<maskin>`: sagbladet roterer i sagbenken, knaster går på båndene, stempelet på knuseren/ballepressa, røyk fra
smia/raffineriet/flishoggeren – når maskinen går (ProduksjonSpill.status). Høyden er gulvet i interiøret (Interior3d.høyde) når huset er
bygget i 3D. Maskinlyden (ut9-maskiner2) følger med av seg selv.

## Økonomitesten
`pipeline/fliser/okosim-fabrikk.js`: strategien «kontrakter + overtatt sagbruk» (som «kontrakter + sagbruk», men sagbruket tas i bruk for
2,4 mill. i stedet for å bygges; fyrkjelen bygges). Krav: istandsettingen er billigere enn et nytt sagbruk; sagbruket tatt i bruk i 59 av 60
kjøringer; medianen dag 30 høyst 25 mill. over «kontrakter + sagbruk» (målt 105,2 mot 94,6 mill.). Strategien er «fornuftig» og passerer
kravene for det (ikke blakk uten sjanse, slår «gjør ingenting»). Ingen lagret bånd for den ennå («ny» – kjør OKO_NYTT_BAND=1 når dere vil
låse den). `okosim-sagbruk.js` eksporterer nå `sagFolk`.

## Filer
- Nye: `spill/fabrikkbygg.js` (regler), `spill/fabrikkbygg-visning.js` (visning, `window.FabrikkbyggSpill`), `pipeline/fliser/test_fabrikkbygg.js`,
  `pipeline/fliser/okosim-fabrikk.js`, `pipeline/fliser/vakter/ut10-fabrikkbygg.js`.
- Fellesfiler endret: `index.html` (to skript-tagger rett etter `fabrikk-visning.js`), `spill/kjeder-visning.js` (`har`/`finnes` teller
  fabrikkbygg med samme maskintype), `spill/leir-visning.js` (skademeldingen for fabrikkmaskiner – tre små endringer), `spill/maskiner.js`
  (LIV for fb_*), `spill/maskiner-visning.js` (gulvet i interiøret), `pipeline/fliser/okosim-sagbruk.js` (eksporterer sagFolk).

## Prøvd
- `test_fabrikkbygg.js` ok (typene, kanTa, istand, plassering ved møblene, jobben, drift for alle ni maskintyper, strøm, bruksplassene,
  lagring), test_produksjon, test_fabrikk, test_kjeder, test_maskiner, test_fabrikkmaskiner, test_industri, test_kommando, økonomitesten ok.
- Vakta `ut10-fabrikkbygg` ok på PC, mobil og i 3D; vaktene ut9-maskiner, ut5-fabrikk, ut2-sagbruk, ut8-industri ok. Feil med vilje (tømmer
  gir bare flishogger) -> vakta feilet på tre punkter, testen på sju.
- Bilder (scratchpad `natt/ut10/`): plantegningen med knappen (PC), etter overtaket (PC og mobil), kartet med «Din fabrikk · Sagbruk», og i
  3D sagbladet som stikker opp av sagbenken i et sagbruk som går (prøvebygg på Dovre – testsiden har ingen husdata).

## Ikke gjort
- Folk «stasjonert» ved fabrikken: de går fram og tilbake fra leiren som til andre maskiner (derfor høyst 1,5 km).
- Egen strøm i bygget (aggregat der): strømmen kommer fra leirens nett.
- Bransjene uten produksjonsregel (trevare, gass, verft, kraft, bryggeri, kjemi) har ingen egne fabrikkregler.
- Ikke prøvd med et ekte industribygg på /norge i denne runden.
