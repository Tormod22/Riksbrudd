# Pakke «anlegg» – grunnmuren for anleggsarbeid

## Runde 15 (21. nov kveld)

Brukeren: «Jeg ønsker å lage systemer der spilleren kan bygge tunneler i framtiden, samt bunkere og skyttergraver, og bygge egne
kaier. Det skal også være båter i spillet.»

### Filer
- `site/dovre-fliser/spill/anleggsarbeid.js` – regler uten DOM (`window.Anlegg`, Node: `require`). Test: `node pipeline/fliser/test_anleggsarbeid.js`.
- `site/dovre-fliser/spill/anleggsarbeid-visning.js` – meny, plassering, arbeid, vern, tunnel i ruta, egne kaier, 2D og 3D (`window.AnleggSpill`).
- `pipeline/fliser/vakter/anlegg.js` – vakta.
- `docs/natt/anlegg-hjelp.json` – hjelpetekstene.

### Endret i filer jeg ikke eier
- `site/dovre-fliser/index.html`: to skript-tagger rett etter `sjo-visning.js` (anleggsarbeid.js og anleggsarbeid-visning.js), versjonsmerker via `versjon.py`.
- `site/dovre-fliser/spill/portal3d.js`: én linje – `window.Portal3d` har nå også `mal` (portalens deler for en bredde), så egne tunneler bruker samme modell.
- Pakket inn fra min fil (ingen endring i fila selv): `hoydeVed` (index.html), `ordre` (index.html, ytterst – etter flyt.js og lagring.js), `KaierSpill.data`/`Kaier.nær`/`Kaier.iBoks` (kaier.js) og `Interior3d.iLeirbygg` (interior3d.js – så gress, blomster og bregner ikke vokser i graven/bunkeren).
- Ingen endring i `leir.js`, `leir-visning.js`, `sjo.js`, `sjo-visning.js`, `kaier.js` eller `kyst3d.js`. Byggemenyen utvides med `LEIR_MENY`, og kaiene kobles inn ved å pakke inn `KaierSpill.data`, `Kaier.nær` og `Kaier.iBoks` fra min fil (se under).

### Tabellen (nye anlegg legges til her)
`Anlegg.ANLEGG[id] = { navn, form ('linje' | 'punkt' | 'topunkt'), krav ('tørt' | 'strand' | 'fjellside'), inngrep ({ type: 'grav' | 'grop' | 'bore', … } eller null), vern (treff ganges med dette), kapasitet, pris(L, nivå), tid(L, nivå) i persontimer, mat(L, nivå), modell, tekst }`.
Visningen trenger da bare en 2D-tegning og en 3D-modell (funksjon i `lagModeller`). Alle tall er Claudes forslag (REGLER og ANLEGG):

| Anlegg | Form | Krav | Inngrep | Vern | Plass | Pris | Tid (persontimer) | Materialer |
|---|---|---|---|---|---|---|---|---|
| Skyttergrav | linje 4–250 m (sikksakk) | tørt land | grav 1,5 m dyp, 1,2 m bred | ×0,4 | 1 lag per 20 m | 15 000 + 2 500 kr/m | 4 per m | tre L/8 m³ |
| Bunker | punkt (7 × 5,5 m) | tørt land | grop 1,3 m (+3 m inngang bak) | ×0,15 | 1 lag | 3 mill. | 600 | 40 m³ betong, 8 t stål |
| Kai | punkt, nivå 1/2 | strand (vann innen 40 m) | ingen | – | 2/4 båter | 2 / 6 mill. | 350 / 900 | betong, stål, tre |
| Tunnel | to punkter 60–3000 m | bratt fjellside | «bore» (ikke brukt ennå) | – | – | 5 mill. + 40 000 kr/m | 400 + 20 per m | betong, stål |

Arbeidskraft: folk på «bygg» teller 1 (de arbeider på det første uferdige anlegget), hver levende mann i et ingeniørlag innen 400 m teller 3.
Prisen betales når du bekrefter; materialer som mangler på lageret, kjøpes til `Leir.MATERIALER`-prisen.

### Felles motor for terrenginngrep (grunnmuren)
- `Anlegg.inngrep(a)` gir formene (`linje` med halv bredde, `rekt` med retning) og dybden ganget med framdriften – en halvferdig grav er halvt så dyp.
- 2D-reglene: `hoydeVed` pakkes inn (`window.hoydeVed`) og legger til `Anlegg.endringVed(INNGREP, x, y)` – full dybde inne, skråning 1,5 m ut. Alle som spør `hoydeVed` (leiren, gange, sikt …) ser graven.
- 3D: bygg3d-kroken tar prøver av bakken FØR inngrepet (`u.anleggZ`, små tall), lager krav med `Anlegg.terrengKrav` og senker høydegitteret `u.H` med `Veg.skjærG` – den samme motoren som vegene i liv3d.js bruker: bakken senkes bare (aldri heves), punktene senkes høyst til kravet, og både gitteret og terrengnettet slik det tegnes (nettVekter, kopiert fra liv3d.js) må ligge under bunnen. `u.nett = null` etterpå. Trær, steiner, busker, biler og flagg ryddes rundt anleggene, og bakken males (jord rundt grav/bunker, grus foran portalene).
- Et anlegg som blir ferdig, bygger 3D-utsnittet på nytt (`nytt3dUtsnitt`), ellers lages bare modellene på nytt.
- Lagres per leir i `riksbrudd-anlegg` (`{ leir: 'x,y', liste }`).
- Målt i 3D ved Dombås: graven 1,62 m under bakken før inngrepet (mål 1,5), bunkeren 1,39 m (mål 1,3) – litt dypere fordi terrengnettet er grovere enn gitteret.

### Skyttergrav, bunker, kai, tunnel
- **Skyttergrav**: i sikksakk som standard (traverser, som ekte graver), bunn av planker, kledde vegger, jordvoll ut på begge sider og sandsekker i to lag langs kantene (ett nett). Du går ned i den i gåmodus (bakken er senket). Under bygging: oransje staker.
- **Bunker**: betong, gulv 1,3 m under bakken, skyteskår 2,4 × 0,3 m forover, døråpning med åpen ståldør og trinn bak, tak med jord oppå, jordvoll rundt, inni benk, bord, ammunisjonskasser, hyller og en lampe. Vender bort fra leiren (Roter).
- **Kai**: betongblokk ned i sjøen, lyst dekke, kaikant med gul stripe, fendere, pullerter, lyktestolper og leider. Kaia er med i kaidataene: `KaierSpill.data()` gir en sammenslått kopi (kolonnene med egne kaier lagt til ETTER de fra OSM, så indeksene til de gamle står), og `Kaier.nær`/`Kaier.iBoks` søker også i de egne. Båtene i sjo.js legger derfor til der som ved en havn, og kaia innen 3 km er leirens kai. Liten kai (30 m) = småbåt og sjark; middels (60 m, oppgradering i panelet) = også lekter.
- **Tunnel**: to portaler (`Portal3d.mal(9)`). `ordre()` pakkes inn: for egne lag regnes marsjen over fjellet (luftlinje + 8 m per høydemeter opp, 3 m per høydemeter ned, 32 m-høydene) mot veien gjennom tunnelen; er tunnelen under 0,9 av den, går laget til portalen, reiser gjennom (1,3 m/s til fots, 8 m/s med kjøretøy) og fortsetter til målet. Knappene «Gjennom tunnelen» (lag) og «Kjør gjennom tunnelen» (kjøretøy, KJ_PANEL) ved en portal.

### Prøvd i nettleser (Dovre-testsiden, leir 196400, 6898900)
- Skyttergrav med hele flyten (meny-API, to trykk, sjekk mot kartet, betaling 236 000 kr for 40 m), ferdig: −1,5 m i reglene, lag i graven ×0,4 i KROKER.ild.
- Kai i strandkanten ved 196688, 6901438 (funnet med et søk i 32 m-klassene), retning mot vannet; kaidataene får «Egen kai», Kaier.nær finner den, SjoSpill.leirHarKai() = true.
- Tunnel 195450, 6898921 – 195450, 6899171 godkjent (34 m fjell over), laget går inn og kommer ut på den andre siden og går videre.
- 3D: modellene i scenen (ca. 5000 trekanter for grav + bunker + kai + tunnel), gitteret senket (graven 1,62 m, bunkeren 1,39 m).
- Gå selv ned i graven (Gange.flytt til midten av graven): føttene står 1,6 m under bakken før inngrepet (872,5 mot 874,1 moh.); bildet
  `3d-i-graven.png` viser sandsekkene over hodet. Bregner fra vegetasjonen rundt kameraet vokste i bunnen av graven og inne i bunkeren – rettet med `Interior3d.iLeirbygg`.
- Vakta (`vakter/anlegg.js`) gikk grønt på PC og mobil (844 × 390). Med feil lagt inn med vilje (dybden satt til 1 m) sa den nei: «graven er ikke 1,5 m dyp i reglene (-1); hoydeVed følger ikke graven». Bilder i scratchpad `natt15/anlegg/` (pc-/mobil-leirmeny, -plassering,
  2d, pc-2d-anlegg2, 3d-grav (før), 3d-grav3 (etter: sikksakk og gress), 3d-bunker3, 3d-tunnel, 3d-i-graven2, 3d-i-bunkeren2 med skyteskåret sett innenfra; ekte bilder i ekte/).
- `node pipeline/fliser/test_anleggsarbeid.js` – alle testene går.

### Sammenlignet med virkeligheten
Ekte bilder (Wikimedia Commons, lagret bare i scratchpad `natt15/anlegg/ekte/`, ikke i repoet):
- Skyttergrav: «Bundesarchiv Bild 101I-508-B0131-15A, Norwegen, Schützengraben in Wiese» (Dr. Rümmler 1943, CC BY-SA 3.0 DE),
  https://commons.wikimedia.org/wiki/File:Bundesarchiv_Bild_101I-508-B0131-15A,_Norwegen,_Sch%C3%BCtzengraben_in_Wiese.jpg
- Bunker: «Bundesarchiv Bild 101I-110-1665-26, Norwegen, Atlantikwall» (Faßhauer 1943, CC BY-SA 3.0 DE), bunker under bygging,
  https://commons.wikimedia.org/wiki/File:Bundesarchiv_Bild_101I-110-1665-26,_Norwegen,_Atlantikwall.jpg

Hva som var forskjellig og hva jeg gjorde:
- Den ekte graven går i **sikksakk** og er nesten usynlig i enga: brystvernet er lavt og dekket av torv, kanten er en smal stripe med
  lys jord. Min første utgave så ut som en stor, mørkebrun kasse (jordvoll 2,6 m bred i én farge, malt jord 2,6 m ut). Nå: sikksakk som
  standard («Sikksakk: på/av» i plasseringen, `Anlegg.sikksakk`: 8 m biter, 1,6 m ut til hver side), lavere brystvern, vollen glir fra jord
  ved graven over i gress ute (hjørnefarger), og bare 1,1 m malt jord langs kanten.
- Den ekte bunkeren er støpt i forskaling (plankemønster i betongen), har tykke vegger og står i sprengt stein. Min er glatt betong med
  jord og torv rundt. Gjenstår: forskalingsmønster (tekstur) og stein rundt.
- Kaiene: kyst-pakka lager kaiene i tettstedene; min egen kai har de samme delene (betong, fendere, pullerter, leider, lys). Ikke
  sammenlignet med bilde (fant ikke et godt fritt bilde av en norsk betongkai i tide).

### Gjenstår (ærlig)
- Ingen kollisjon med bunkerveggene når du går (du går gjennom veggene; gulvet er riktig). Veggene kan legges i `R3.hindre` som byggesettet gjør.
- Tunnelen er bare en lenke: ingen graving i fjellet i 3D, kjøretøy får den ikke i vegnettet (bare knappen), og fiendens AI bruker den ikke. `inngrep.type = 'bore'` er reservert for ekte graving senere.
- Lag i tunnelen (`s.iTunnel`) og «på vei til tunnelen» lagres ikke ved omlasting (laget står ved portalen).
- Folkene på «bygg» deles ikke med leirens byggejobber (begge regner med dem) og reiser ikke til anlegget.
- Fjernes en egen kai mens en båt ligger ved en senere egen kai, flytter indeksen (bare egne kaier).
- 2D: graven i kartflisene er ikke senket (bare det spillet spør `hoydeVed` om); høydekurvene er som før.
- Fienden skyter ikke på/ødelegger anleggene ennå (ingen hp).
