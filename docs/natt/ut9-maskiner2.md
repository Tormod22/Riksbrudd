# ut9-maskiner2 – maskiner i egen fabrikk og maskinlyd (28. nov)

Fortsettelse av ut9-maskiner (punkt 5 i oppdraget + lyd). Grenen `claude/ut9-maskiner2` fra `claude/nattfiks` (etter «Flettet inn
claude/ut9-maskiner»). Alle tall er **Claudes forslag**.

## Nye maskiner du kan bygge i egen hall (byggesettet, fanen «Maskiner»)
| del | maskintype (produksjon.js) | inn -> ut per time | folk | kW | pris | gulv |
|---|---|---|---|---|---|---|
| Flishogger (`bs_flishogger`) | `flishogger` (ny) | 1 m³ tømmer -> 0,9 m³ flis | 1 | 8 | 1,5 mill. | – |
| Filetmaskin (`bs_filetmaskin`) | `filetmaskin` (ny) | 0,4 t fisk -> 0,38 t frossen fisk | 1 | 6 | 3 mill. | – |
| Ballepresse (`bs_ballepresse`) | `ballepresse` (ny) | 0,5 t skrap -> 0,18 t stål | 1 | 7 | 2 mill. | betong |
| Steinknuser (`bs_knuser`) | `steinknuser` (fantes) | 2 m³ stein -> 1,8 m³ pukk | 2 | 20 | 5 mill. | betong |

- Flishoggeren gir brensel til fyrkjelen uten sagbruk (tømmer -> flis -> 30 kW). Fisken til filetmaskinen kommer bare når leiren har et
  fiskemottak ved kai (båtene leverer da fisk, kjeder-visning.js). Skrapet til ballepressa kommer fra riving. Ingen nye varer – alt bruker
  varene som finnes, så økonomitesten (båndet) er uendret.
- Ballepressa gir mer stål per arbeider enn smia (0,18 mot 0,075), men ingen deler.
- Folk, strøm, slitasje, flyt/lys/varme i hallen og «hvorfor står den» virker som for de andre maskinene (samme Produksjon.steg).

## 3D, ikoner og liv
- Modellene er de fra ut9-maskiner (`Maskiner.FABRIKK`: del -> modell). `fabrikk-visning.js` bygg3d tegner dem som bokser langs
  flyten (sylindrene blir firkantede), og de reiser seg med byggingen.
- Ikoner: `Ikoner.legg` fra maskiner-visning.js (flis, filet, balle, knus) for `bs_…` og `bs_…_1`.
- Liv når de går (Maskiner.LIV): flishoggeren blåser flis/støv ut av røret (røyk), filetmaskinens bånd går, ballepressas stempel går
  opp og ned, knuseren rister. Strømprioritet: lagt inn i `Leir.PRIORITET` (fabrikk-visning.js).

## Maskinlyd
`maskiner-visning.js`: en dur fra maskinen som går nærmest kameraet i 3D – sagtann gjennom lavpass + sus (støy, båndpass), tonen etter
delen (sagblad 150 Hz, bånd 88, stempel 62, røyk 48), styrken (1 − d/30 m)² × 0,1. Kobles til `Lyd.motor().hoved`, så ☰ «Lyd» og skjult
fane demper den; stille i 2D og når 3D ikke tegnes. Lages først når en maskin går nær deg og lyden er startet. `MaskinerSpill.lyd()`.

## Fellesfiler endret
- `spill/produksjon.js`: tre maskiner i `REGLER.maskiner` (flishogger, filetmaskin, ballepresse) og i `rekkefølge`.
- `spill/byggesett.js`: fire deler i `NYE` (rett over «LYS») og i `MASKINFANE` (etter fyrkjelen).
- `spill/fabrikk-visning.js`: bygg3d tegner `Maskiner.FABRIKK`-delene med modellene (ca. 10 linjer før standardkassen); PRIORITET-lista.
- `spill/maskiner.js`, `spill/maskiner-visning.js` (mine): FABRIKK, LIV, ikoner, lyd.

## Prøvd
- `pipeline/fliser/test_fabrikkmaskiner.js` (ny): delene finnes som maskiner, én time i full drift gir riktig vare, uten råvare «tom for …»,
  uten strøm står den, flishogger + fyrkjele gir 30 kW, ingen maskin lager mer enn den tar inn, modell og liv for hver. Med flisen satt til
  0 med vilje feilet to sjekker.
- test_produksjon, test_fabrikk, test_byggesett, test_kjeder, test_maskiner, test_industri, test_interior, test_lyd, test_kommando og
  **økonomitesten** ok.
- Vakt `vakter/ut9-maskiner2.js`: knappene i fanen, ikonene, alle fire satt i en blikkhall med to porter og godtatt, flishoggeren lager
  0,9 m³ flis på en time, selvtest uten tømmer, 3D-tegningen uten feil – ok på PC, mobil og i 3D. Med flisen satt til 0 feilet den.
  Vakta `ut9-maskiner` sjekker nå også maskinlyden (0,051 nær sagbenken, 0 når den står) – ok i 3D. ut5-fabrikk og ut2-sagbruk ok.
- Bilde: hallen med flishogger, ballepresse og filetmaskin i 3D (scratchpad `natt/ut9-maskiner/fabrikk-pc.png`, `fabrikk-mob.png`).
  Kameraet står lavt inne i byggesett-hallene (gangen står på terrenget under fundamentet) – det er ikke fra denne pakka.

## Ikke gjort
- Filetmaskinen gir «frossen fisk» (ingen egen vare «fiskefilet» – den ville trengt lager, pris og en strategi i økonomitesten).
- Ingen barkemaskin som egen del (flishoggeren dekker «tømmer -> flis»).
- Lyden er én kanal for nærmeste maskin (ikke en per maskin), og det er ingen lyd i 2D.
