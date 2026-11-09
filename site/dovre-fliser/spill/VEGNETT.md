# S1 – vegnettet som graf

Nye, selvstendige filer. S1 endrer ikke kartet eller kampreglene og viser ingen kjøretøy ennå (S2).
Kilde: **Statens vegvesen / NVDB, NLOD**. Denne krediteringen må også inn i `#kilde` når S2 tar grafen i bruk.

## Bygg og test

```sh
python3 pipeline/fliser/test_vegnett.py
node pipeline/fliser/test_vegnett.js
python3 pipeline/fliser/vegnett.py /tmp/vegnett --buffer /tmp/nvdb
node pipeline/fliser/test_vegnett.js /tmp/vegnett/vegnett.bin
```

`--veg EV6` bygger bare E6 til utvikling, og merkes som et utvalg i manifestet. Standard er hele NVDBs norske
bilvegnett, 1. juni 2023. Byggeren henter fire fylker samtidig og slår sammen på NVDBs node-ID-er, også over fylkesgrenser.
Noder opprettes aldri bare fordi to linjer krysser hverandre. Også NVDBs fiktive `posisjon@sekvens`-noder beholdes.
Veggeometrien forenkles av NVDB med 3 meters toleranse og avrundes til meter. NVDB-lengden beholdes til reisetid.

`.github/workflows/vegnett.yml` kjører alle fem eksisterende tester og nye regeltester før nasjonal bygging.
Deretter testes ekte E6 Oslo–Trondheim (<1 sekund) og en faktisk NVDB-bru sperres. Release opprettes først når
kontrollene består og gzip-filen er under 30 MB. Hele råfilen og gzip-filen publiseres, med SHA-256 i manifestet.

## Anleggsveger der NVDBs historikk har hull

Første nasjonale bygging (8. nov) hadde Finnmark avskåret: per 1. juni 2023 er E6 ved Sørkjosen (Nordreisa) registrert som
anlegg (fase A), og den gamle vegen mangler i historikken. Regel: E/R/F-veg i fase A tas med bare som den **korteste**
anleggsstrekningen som binder sammen deler av vegnettet som ellers er adskilt. Nye veger ved siden av eksisterende holdes
utenfor. Manifestet viser `anlegg_lagt_til` og `anlegg_sekvenser`. Testen mot en nasjonal fil krever at Oslo–Kirkenes,
Oslo–Bergen og Oslo–Kristiansand finnes, så et slikt brudd blir oppdaget.

## Bruk fra S2 / server

```js
const Vegnett = require('./vegnett.js'); // nettleser: globalThis.Vegnett etter skriptinnlasting
const graf = Vegnett.les(buffer);        // Buffer, Uint8Array eller ArrayBuffer
// Alternativ: await Vegnett.last(urlTilBin); svar må inneholde utpakket RBVEG001.
const rute = graf.rute([x1, y1], [x2, y2]); // EPSG:25833, eller nodeindekser
// null = ingen rute eller ingen node innen 2 km. maksAvstand kan settes eksplisitt.
for (const e of graf.infraLenker(60, bruId)) graf.sperr(e);
for (const e of graf.infraLenker(60, bruId)) graf.åpne(e);
```

Valg til `rute`: `maksAvstand`, `ferjeVentetid`, `tillat(lenke)` og `kategoriFaktor` (6 tall ≥ 1 for ERFKPS som gjør mindre veger
«dyrere» i rutevalget; reisetiden som returneres er fortsatt den ekte). Kjøretøyene i S2 bruker dette (spill/kjoretoy.js).
`rute` gir `{noder, lenker, meter, sekunder, besokt}`. Sekunder er **reisetid i spillverdenen**; S2 omregner til
simuleringsklokken (1× er sanntid: 1 spillminutt = 1 minutt). `lenke(id)` gir NVDB-sekvens og posisjoner,
kategori, vegnummer, målt fartsgrense (null når ukjent), lengde og ferjeflagg. `linje(id)` dekoder bare den
valgte vegens geometri. S2 snur punktrekken hvis ruten kjører fra `til` til `fra`.
Lenkeindekser gjelder én bestemt release; lagret tilstand skal knyttes til infrastrukturens kilde-ID eller
`sekvens/startposisjon/sluttposisjon`, ikke en indeks fra en gammel release.

Bru 60, tunnelløp 67 og ferjesamband 770 kobles med NVDBs stedfesting (sekvens + overlappende intervall),
aldri nærmeste geometri. Kilde-ID-ene tilsvarer de samme typene i INFRA. En bru kan ha flere lenker; sperr alle.

## Spillregler og begrensninger

- A* bruker reisetid og en nedre grense fra luftlinje / høyeste fart. Binærhaug og typede nabotabeller.
- `feltoversikt` angir kjøreretning langs geometrien; oddetall med, partall mot. Manglende/reversible felt
  tillates begge veier. Trafikkreguleringer som svingeforbud, bommer, aksellast og tidsstyrt adgang er ikke modellert.
- Ukjent fartsgrense: E 80, R 70, F 60, K 40, P/S 30 km/t. Dette er reserveverdier for spillet.
  Hvis flere fartsgrenser overlapper ett segment brukes den laveste. Dette er ikke en navigasjonstjeneste.
- Bilferjer finnes i vegnettet; ingen kunstig forbindelse over vann. Fart 25 km/t og venting 15 minutter
  ved avgang fra en node som også har landveg. Delte sjøsegmenter får ikke hver sin ventetid.
  Dette er spillverdier, ikke faktiske ferjeruter eller avgangstider.
- Punkter festes til nærmeste node, ikke et punkt inne på lenken. Tilkomst fra terrenget modelleres i S2.
- Første format lastes samlet. Fylkesvis nedlasting i klienten er ikke implementert; budsjettet gjelder
  komprimert overføring, og manifestet rapporterer også rå størrelse. Gzip på HTTP-server må sendes med
  korrekt Content-Encoding, ellers brukes rå `.bin` (også på eldre Safari uten DecompressionStream).
- S1 har ingen automatisk innlasting i kartet. S2 registrerer kjøretøymodulen i `spill.js`, laster grafen,
  legger kreditering i `#kilde` og bruker KROKER. Slik unngås endringer i kart-chatens HTML under S1.

## Binærformat RBVEG002 (little-endian, kolonner)

Byttet fra RBVEG001 8. nov etter nasjonal bygging: RBVEG001 ble 66,5 MB gzip (2 030 057 lenker), over budsjettet på 30 MB.
RBVEG002 lagrer det samme innholdet i kolonner, sortert slik at nabotall ligner, med varint i stedet for faste 4 byte.
E6-utvalget: 550 KB -> 189 KB gzip. `vegnett.js` leser fortsatt RBVEG001 (eldre testfiler).

| Del | Innhold |
|---|---|
| Header, 28 byte | magic `RBVEG002`; uint32: antall noder N, lenker M, infrakoblinger I, dato YYYYMMDD, antall kolonner K = 17 |
| Kolonnetabell | K × uint32: bytelengden til hver kolonne, i rekkefølgen under. Kolonnene følger rett etter hverandre |

Kolonner (u = uvarint, z = zigzag-varint):
1–2 `x`, `y` (z): noder i bånd på 2 km (slangerekkefølge), differanse til forrige node, meter EPSG:25833.
3–4 `fra` (z, minus forrige lenkes til-node), `til` (z, minus fra). Lenkene er sortert på NVDB-sekvens og startposisjon.
5 `lengde` (u): desimeter, rundet opp. 6 `sekvens` (u, økning fra forrige). 7 `start` (z, minus forrige sluttposisjon i samme
sekvens, ellers minus 0) og 8 `slutt` (u, minus start), posisjon × 1e8. 9 `vegnummer` (z, minus forrige).
10–12 `flagg`, `fart`, `kategori`: én byte per lenke (som før). 13 `indre` (u): antall punkter mellom endenodene.
14 `geometri` (z): de indre punktene, differanse fra fra-noden og så fra forrige punkt. Endepunktene er nodene.
15 `infratype`: én byte (0 = bru 60, 1 = tunnelløp 67, 2 = ferjesamband 770); 16 `infralenke` (u, økning; sortert på lenke);
17 `infraid` (u): kilde-ID.

Flagg: bit 0 med, bit 1 mot, bit 2 ferje. Kategoriindeks i `ERFKPS`. Ukjent fartsgrense = 0.
Nodenumre og lenkenumre gjelder én bestemt fil – lagre aldri tilstand på dem (se over).
`infraPåLenke(e)` gir `[[type, kilde-id], …]` for en lenke (bruer, tunnelløp, ferjesamband).

API-referanse: https://nvdb-docs.atlas.vegvesen.no/nvdbapil/v4/Vegnett/
OpenAPI: https://nvdbapiles.atlas.vegvesen.no/api-docs/vegnett

## Verifisering 8. november 2026

- Byggerens 7 tester og 1600 sammenligninger mellom A* og en uavhengig Dijkstra-beregning består.
- Ekte NVDB-utvalg `EV6`: 16 741 lenker, 16 266 noder, 1 780 infrastrukturkoblinger. Råfil 1 021 445 byte,
  gzip 549 836 byte. SHA-256 `c1397f7f98e383328c1912e2b74b303640e43a46aa1118c44e7a2d7167c00097`.
- E6 Oslo–Trondheim: 514,1 km over 2 278 lenker, rundt 6 ms i lokal Node-test. Sperring av en ekte bru
  gir ingen rute i det rene E6-utvalget; syntetisk test bekrefter også omkjøring når sideveg finnes.
- `stubtest.js`, `stub.js`, `stub2.js` og `test_terreng.js` består. `sjekk.js` forsøkt, men Chromium stoppes
  av kjøremiljøets socket-begrensning før nettleseren starter. Dette er ikke en bestått nettlesertest.
- **Ikke klarert for main:** nasjonal bygging, nasjonalt størrelsesbudsjett, nettlesertest og release er ennå
  ikke gjennomført. GitHub avviser skriving med HTTP 403 «Resource not accessible by integration».
  Workflowen er klargjort, men har ikke kjørt. Ingen release, opplasting eller sammenslåing er utført.

`graf.lenkerVed(n)` (S5, 9. nov): lenkene som går fra eller til node `n` – brukes til vegkrater (ingeniørene sprenger lenken nærmest laget).
