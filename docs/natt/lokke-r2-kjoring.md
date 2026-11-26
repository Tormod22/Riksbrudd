# Kritikerløkka runde 2 – pakke «kjøring» (26. nov)

Grenen `claude/lokke-r2-kjoring`. Anmeldelsene: `docs/kritikk/2026-11-26-r2-jonas-bakke.md` (Kjør dit → NaN) og `…-r2-ingrid-saether.md`
(nødlageret i Glomma, marsj mot elvebredden, Tropper oppå Selskapet).

## 1. «Kjør dit» ga NaN (Jonas, høy)
ÅRSAK (gjenskapt i Node med det ekte vegnettet): `Kjoretoy.planlegg` rutet fra nærmeste NODE ved kjøretøyet til nærmeste NODE ved målet.
Et mål midt på en lang veglenke hadde samme nærmeste node som kjøretøyet → `rute()` ga en tom rute (0 lenker), stien fikk ett punkt, og
`posisjon()` regnet med et punkt som ikke fantes → x/y = NaN. Stien ble tømt i samme simuleringssteg, så strategi-visning.js så aldri at bilen
kjørte og meldte «kom ikke av gårde (finner ingen veg dit)» etter 30 spillminutter. «Gå av» satte troppen på bilens NaN-plass; garnison.js
`inni` kastet for NaN (feilen hvert sekund); JSON lagret NaN som null, og `fraJSON` kastet laget og bilen → borte etter omlasting, og
morgenmøtet regnet de fire som «forlot gjengen».

RETTET:
- `spill/vegnett.js`: `naermestePåVeg(p, maks, ekstra = 1500)` – nærmeste punkt PÅ veggeometrien (lenke, x, y, d, langs, total). Ser på lenkene
  til noder innen maks + ekstra (Claudes tall).
- `spill/kjoretoy.js` `planlegg`: kjører fra der kjøretøyet står (TERRENG_FART = 15 km/t inn på vegen – Claudes tall), langs startlenken til en
  node, ruta, og langs mållenken til punktet på vegen nærmest målet. Samme lenke = rett langs vegen. Snur ruta tilbake langs start-/mållenken,
  kuttes den lenken. Står bilen alt der (< 2 m): `{ framme: true }` uten sti. Ugyldige tall gir `{ feil }`, aldri en NaN-sti; `oppdater` skriver
  aldri NaN. Bilen teleporteres ikke lenger til nærmeste node.
- `spill/kjoretoy-visning.js`: `kjørTil` gir svaret og kaller `window.KJ_UTFALL` (k, r, X, Y); `gyldigPlass(k)` hvert steg (k.sistGyldig) –
  NaN settes tilbake til siste gyldige plass, sti tømmes, melding i loggen.
- `spill/tropper-visning.js`: KJ_UTFALL-kroken: bilen kjører → `avstigning.kjørt = true` straks (ingen kappløp med strategi-visning.js);
  står alt ved målet → troppen går av; ingen veg → `s.kjørFeil`, tydelig loggmelding og knappen «Gå av og marsjer dit» (#gaaavmarsj) i lagpanelet.
  Mens vegkartet hentes, venter avstigningen (a.t flyttes fram) – før ga høy fart «kom ikke av gårde» mens vegnettet lastet. `gåAvRett` og
  følgekroken bruker aldri NaN; et lag med NaN settes tilbake til `s.sistGyldig` (ellers kjøretøyet, ellers leiren).
- `spill/garnison.js` `inni`: NaN/ugyldige tall er aldri inni (før: «reading 'length'»). `spill/strategi-visning.js`: lag/fiender med ugyldig
  plass tas ikke med i krigsbildet.
- `spill/lagring.js`: lagrer aldri NaN (siste gyldige plass, ellers kjøretøyets). En eldre lagring med `x: null, y: null` leses med plass ved
  leiren (UKJENT_PLASS = 25 m – Claudes tall) i stedet for å slettes. Mangler feltene helt, hoppes linja over som før.
- Spøkelsesetiketten «Speiderbil 1»: bilen ble kastet fra lagringen og sto igjen på startplassen ved Dombås etter omlasting. Med lagringen
  over skjer ikke det lenger. Lagringer som ALT har mistet bilen (Jonas sin) får den ikke tilbake.
- «forlot gjengen»: skjer ikke lenger fordi laget ikke forsvinner. Teksten selv står i `spill/forsvar-oppgjor.js` (eies av angrep3d) og er
  IKKE endret: den kaller fortsatt alle som mangler uten forklaring for «forlot gjengen» når moraltelleren er 0.

## 2. Ingen veg → «Gå av og marsjer dit»
Se over. Melding: «Speiderbil 1 når ikke målet med bil: ingen veg i nærheten av målet. Trykk «Gå av og marsjer dit» hos Speidertropp 1, eller
velg et mål ved en veg.» Lagteksten sier «Speiderbil 1 kommer ikke fram med bil».

## 3. Nødlageret på land, marsj mot vann (Ingrid, middels)
- `spill/selskap-visning.js` (bare ved lagerPlass): `landLager()` kjøres etter at den første kontrakten er laget, og ved start for lagrede spill
  (k.sted.land = sjekket). Leser terrengklassen (lagVindu, 32 m-ruter) og flytter låven til nærmeste rute på fast mark (ikke vann/myr/utenfor
  kartet, fast mark 2 ruter rundt), helst på samme side av vannet som leiren, nær en veg og i samme retning (tittelen står). LAND-tallene er
  Claudes forslag. Bare før noen har hentet lageret.
- `index.html` `ordre()` (FELLESFIL – 2 linjer rett etter `Terreng.ruteTil`): finnes ingen rute, prøves `window.MÅL_PÅ_LAND(v, sx, sy, X, Y)`
  (tropper-visning.js: nærmeste framkommelige rute innen 1500 m, og første på linja tilbake mot laget); loggen sier «målet ligger i vannet –
  laget går til nærmeste bredd». «Kjør dit» til vann går til nærmeste veg (punktet over), og troppen går resten til bredden.

## 4. Tropper oppå Selskapet
`TropperSpill.åpne()` lukker Selskapet (SelskapSpill.vis(false)). Motsatt vei (Selskapet åpnes mens Tropper står) er ikke endret (selskap-visning.js
`vis` er ikke min).

## Prøvd
- Node: `test_kjoretoy.js` (nye tilfeller: samme node, terreng → veg, framme, NaN), også med det ekte vegnettet; `test_lagring.js` (NaN/null),
  `test_garnison.js` (NaN), `test_vegnett.js`, `test_tropper.js`, `test_strategi.js`, `test_selskap.js`, `test_terreng.js`. 300 tilfeldige
  ruter rundt Dombås med det ekte vegnettet: 0 NaN, bilen står alltid på punktet på vegen nærmest målet.
- Nettleser, /norge med ekte data (dev.py): leir ved E136 vest for Dombås som Jonas, Speidertropp 1 i Speiderbil 1, «Kjør dit» med musa midt i
  nødlagerets sirkel: «Speiderbil 1: 0,8 km, ca. 1 min», bilen kjørte, troppen gikk av ved låven og lastet nødlageret, 0 NaN, 0 sidefeil, laget
  lagret med tall. Elverum (leir ved Glomma): lagerPlass ga en rute i Glomma (klasse 3) – flyttet til dyrket mark på samme side, 559 m; marsj
  til et punkt midt i Glomma gikk til bredden.
- Vakt `pipeline/fliser/vakter/kjor-dit.js` (PC og mobil, 5–9 s): mål ved bilen, mål på vegen 400 m unna, mål uten veg (knappen), NaN med vilje.
  Feilen lagt inn med vilje (gamle kjoretoy.js): vakta feiler («kom ikke av gårde», «79 m unna»).
