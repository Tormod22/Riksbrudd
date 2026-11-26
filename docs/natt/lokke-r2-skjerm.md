# Kritikerløkka 26. nov, runde 2 – pakke «skjerm»

Grunnlag: Jonas Bakke (telefon 390 × 844, berøring) og Ingrid Sæther (PC 1400 × 860). Prøvd med Playwright i 390 × 844 (isMobile,
hasTouch, webdriver av) og 1400 × 860. Skript og bilder: scratchpad `lokke/r2/skjerm/` (drv.js, s1–s15.js, bilder/).

## Rettet
1. **Ett overlegg om gangen mens et kort venter (telefon).** `skjermlag.js` (`ettOmGangen`): mens et kort i `Skjermlag.KORT`/`ØVERST`
   (hendelse, samfunnkort, krigskort, morgenmøtet …) står, får body klassen `kortvent` på telefon, og banneret (#alarm), 1×-lappen
   (#fartgrunn), stoppstripa (#flytkort), Neste-lappen, varslene, målstripa, Tall-lista, Mer-raden, Selskapet, byggebanneret, opplæringen
   og alle panelene i `Skjermlag.SELV` er skjult (`Skjermlag.BORT`). De kommer tilbake som de var når kortet er besvart. Et trykk i
   topplinja, på været, i bunnmenyen, på ☰ eller Leir/Krig/Deg åpner ikke noe bak kortet – pauselappen blinker «Svar på kortet først».
   3D, ? og farten virker (farten tas av morgen-/flyt-reglene som før). Prøvd: s2.
2. **Neste-lappen og varslene.** `kompakt.js` (`varslerOverLapp`): ligger varslene nede til venstre over Neste-lappen, skyves de opp
   (CSS `translate`, så narhud.js sin egen `bottom` får stå). Gjelder alle skjermer. Prøvd med nordpil/målestokk skjult (som i 3D): s4.
3. **Kronebeløpet («− 5 000 kr»).** `flistips.js` (`plasserLapp`/`fri`): lappen legges bare der den dekker kartet (lerretet) og ingen
   av HINDER (logg, banner, stripe, pauselapp, lapp, topplinja, varsler, opplæring, minikart …): under kassa, til høyre eller midt under
   topplinja, så lenger ned i trinn. Finnes ingen fri plass, vises den ikke (tallet blinker uansett). Observatøren i spillhud.js er borte.
4. **To «Mer» og to faner som lyser.** Flisa øverst heter «Tall ▾» på stående telefon og «⋯ Flere tall» på PC/liggende telefon.
   «Mer» i fanelinja lyser bare når lista er åpen, eller når det åpne panelet ligger bak den og ingen fast fane lyser. Den gule rammen
   Jonas så, var Neste-lappens peker (`traadpek`) – på fanene er den nå en liten blinkende prikk i hjørnet, ikke en ramme.
5. **PC «+7 tall»** → «⋯ Flere tall» (ordene står i lista som før).
6. **Én pauselinje.** Når pauselappen står, fjernes «⏭ Svar på kortet først …»/«Morgenmøtet venter …» fra #flytkort og linja i
   banneret; lappen sier i stedet «Svar på kortet først – farten du valgte, gjelder etterpå» i 3,5 s.
7. **Været to ganger / kuttet.** #tlfvaer vises bare når været ikke står i raden (før leiren står det der). Får ikke hele teksten plass
   (3D, bredere knapperad), står bare temperaturen («1 °C»); hele været står da i Tall-lista. Står det helt, er det ikke med i lista.
8. **Tallene i Selskapet** (`#selskap .tall`) har spillets skrift med like brede sifre (tema.js).
9. **Byggelista hopper (Ingrid).** `leir-visning.js`: (a) lista tegnes ikke på nytt av seg selv mens musepekeren står over den (nye tall
   når pekeren går ut eller du trykker noe); (b) når den tegnes på nytt, står det øverste synlige kortet på samme sted (ankerKort, også
   rettet i neste bilde og etter 160 ms – telefon.js legger inn fanelinja like etter); nettleserens egen «scroll anchoring» er slått av
   for menyen (den flyttet lista). (c) Store kjøp fra `BEKREFT.kr` = 3 mill. kr spørres om i banneret: «Bestille kontrollrom for
   8,8 mill. kr? Ja, bestill / Nei, tilbake» – før pengene trekkes (også «Kjøp materialene og bygg»). Ikke i testene uten
   `LeirSpill.test = true`. (d) Avbestilling: et bygg i køen som ingen har begynt på (`igjen === totalt`, ingen arbeid), har «Avbestill»
   i jobblista og «Avbestill (x kr tilbake)» i byggpanelet – alle pengene og materialene tilbake (riv + resten via OppstartSpill.gi).
   NB: med flere byggelag starter jobbene med en gang, så bare jobber som faktisk venter i kø kan avbestilles.
10. **Etiketter.** (a) Kantene av skjermen meldes som hindringer til Etikett hver ramme (kompakt.js, KROKER.tegn og tegn3d), så et navn
    bare flyttes til siden av merket når det står helt på skjermen («Nattskift · 2 lag, 1 kjøretøy» står til høyre for leiren når den
    er ved venstre kant – s13). (b) Kaimerker tegnes ikke oppå stedsnavn som alt er satt (kaier.js fanger `Etikett.merk`). Ikke sett i
    nettleser (Dovre har ingen kaier). (c) «Lever nødlageret her» meldes som hindring (én linje i selskap-visning.js), så leirens navn går
    utenom. Ikke sett i nettleser (krever kontrakten i leveringsfasen).

## Også (koordinatoren)
- Selskapet står på «venstre» plass i `paneler.js` (PLASS.venstre): åpner du Selskapet mens Tropper står, lukkes Tropper (og omvendt),
  PC og telefon. kompakt.js sin ENE-liste tar ikke Selskapet to ganger. Prøvd: s15 (PC og telefon).

## Tall (Claudes forslag)
BEKREFT.kr = 3 000 000; LAPP { luft 6, steg 34, trinn 9, fall 28 }; Kompakt.REGLER.lappLuft 6; skjermkant for navn 4 px (KANT).

## Fellesfiler endret
- `spill/selskap-visning.js`: én linje i tegningen av «Lever nødlageret her» (`Etikett.hinder(...)`). Neste-lappen er ikke endret der –
  varslene flyttes fra kompakt.js.
- `site/dovre-fliser/index.html`: bare versjonsmerkene (versjon.py).
- `pipeline/fliser/vakter/ui.js`: ikke endret (den krever «tall» på flisa på PC/liggende – det står der fortsatt).

## Vakt
`pipeline/fliser/vakter/skjerm-r2.js` – kortvent og sperret trykk (telefon), én pauselinje, navnet på flisa, én fane, bekreftelse på
kontrollrommet (penger urørt), navn innenfor skjermen, varsler ikke under lappen. Setter alt tilbake. PC og mobil ok (2,5–3,5 s).
Feil lagt inn med vilje (kortvent av, grensen 3 mrd.): vakta fant fire feil. ui- og telefon-vaktene er også kjørt (ok på PC og mobil).

## Ikke gjort / delvis
- «eller når du ikke har sett plasseringen» – bare prisgrensen er laget.
- Kaimerkene og «Lever nødlageret her» er ikke sett på bilde.
- Byggelista: når kortet under pekeren endrer seg selv (pris, gråtonet), byttes det ved neste tegning etter at pekeren har gått ut.
