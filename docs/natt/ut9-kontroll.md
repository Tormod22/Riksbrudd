# ut9-kontroll – feil som bare kom i den fulle kontrollen (28. nov)

Den fulle kontrollen (`sjekk.js`, alle vaktene i én side etter hverandre) ga feil i vakter som er grønne alene. Årsakene ble funnet
ved å kjøre `SJEKK_DEL=rask` (vaktene uten 3D, ca. 4 min – gjenskapte alle feilene unntatt granatene) og et sporeskript
(`scratchpad/natt/ut9-kontroll/spor.js`) som kjører vaktene i rekke og skriver hvilke paneler/kort som står oppe etter hver vakt,
og en kopi av `sjekk.js` med en tidtaker i siden som melder når Folk-objektet og leirens `L.folk` skilles.

Ingen av feilene var feil i selve spillet: alle var vakter som etterlot rot eller ikke tålte tilstand fra vaktene før.

| Feil i kontrollen | Årsak | Retting |
|---|---|---|
| ut8-kr-hus «husvinduet kom ikke tilbake da Leir-menyen ble lukket», ut8-kr-krig «Velkommen tilbake vises ikke uten panel» | `vakter/ut5-ledere.js` kalte `FolkSpill.åpne()` (som blar) og lot Folk-panelet stå åpent. Husvinduet skjules og velkomsten venter så lenge Folk er åpent (riktig oppførsel). | ut5-ledere åpner med `åpne(true)` og lukker panelet igjen hvis det var lukket. |
| kr-saga «lagret» (og følgefeil i rekke) | `vakter/terreng.js` satte leiren tilbake med `Object.assign(L, JSON-kopi)` – `L.folk` ble en kopi, mens Folk-modulen fortsatt endret sitt eget objekt. Alt med folk (f.eks. «+» på Maskiner) ble da ikke lagret i resten av kontrollen. | terreng kaller `FolkSpill.start()` etter tilbakesettingen (leser folket fra leiren og kobler dem sammen igjen). |
| ut8-hverdag «tingene havner i hylla» | I full kontroll har leiren alt et lagertelt/en container (fra testene før). Det passer tørre ting like godt og har lavere id, så peanøttsmøret havnet der – riktig etter reglene. | Steg 1 gjøres med hylla og kjøleskapet som eneste lagringsplasser (de andre lagerbyggene tas bort til steg 1 er ferdig; alle byggene settes tilbake som før). |
| leir2d «ingen byggnavn ved leiren på 0.12 m per punkt» (telefon) | Leirens nærmeste bygg (aggregatet) står 25 m fra midten; på telefon (390 punkter) viser 0,12 m per punkt bare ±23 m. Navnet sto riktig utenfor bildet. | Navnet kreves på 0,5/0,2/0,12 m per punkt når et av leirens bygg står i bildet (før: innen 40 m). Data om byggene nær leiren skrives når navnet mangler. |
| fiendens granater «granaten forsvant da utsnittet ble byttet» (telefon, bare med 3D) | Trolig: et ekte 3D-utsnitt var under bygging fra vaktene før og ble satt inn mens prøvegranaten fløy – granaten ble flyttet dit (riktig), men vakta sjekket bare det falske utsnittet og satte så det GAMLE utsnittet tilbake oppå det nye. | Vakta venter til byggingen er ferdig; blir et ekte utsnitt likevel satt inn, godtas det at granaten er flyttet dit, og det nye utsnittet beholdes (kameraet settes bare tilbake når utsnittet er det samme). |
| krig «gaSeg» (laget gir seg ikke; feilet «i rekke», PC og telefon) | Vakta gir fiendens fører et nøytralt navn (væremåte med ild 1 og tar 1), men «seig» har også ild 1 og tar 1 – og et seigt lag gir seg først med 8 ute (vakta har 7). Om det slo til, kom an på navnet laget fikk (ca. halvparten av de nøytrale navnene er seige). | Nøytral = ikke seig heller. Feilsøkingsdata (gaSegInfo) og ikke lenger unntak når ingen fanger ble levert. |

Også sett: lokke-r3-angrep («farten ble senket før røverne var sett» – et hendelseskort sto oppe) og morgenmøtet feilet i PC-kjøringen
før rettingene, men var grønne i PC-kjøringen etterpå (trolig følgefeil av panelene/kortene som ble stående).

Ikke rettet her:
- industri «omgivelsene ved leiren mangler høyde/helning» feiler også alene – en annen hjelper (ut9-industri2) ser på den.
- kart (navnelapper …) feiler av og til i `SJEKK_DEL=rask` med ulike meldinger (samlelapp, brakka på 100 m), men var grønn i de fulle kjøringene.

Fellesfiler: ingen (bare vakter i `pipeline/fliser/vakter/` og dette notatet).
