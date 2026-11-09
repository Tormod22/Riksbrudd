# Plan: Norge etter kollapsen – lore, fraksjoner, leir, kontrollrom og marked

Bestemt av brukeren 9. nov 2026 (egen chat). Bygger videre på `docs/plan-gjeng.md` (din egen gruppe med medlemmer og leir)
og gir spillet en ny bakgrunnshistorie. Erstatter lore-en fra 1986 i HANDOFF.md og designdokumentet.
Alt er oppdiktet: sykdommen, politikerne, fraksjonene og hendelsene. Kartet er fortsatt det ekte Norge 2023.

## 1. Lore: Riksbruddet

Historien er ikke det viktigste. Den forklarer hvorfor verden er som den er, og etter det skriver spillerne historien selv.

1. **Råte i toppen.** En rekke korrupsjonsskandaler (oppdiktede politikere og partier) tapper staten for penger og tillit.
   Protestene blir voldelige, og flere regjeringer faller på kort tid.
2. **Grålungen.** En ny luftveissykdom (arbeidsnavn, kan byttes: *Nordfeberen*, *Den stille vinteren*) sprer seg raskt.
   Helsevesenet er allerede svekket og bryter sammen. Myndighetene skjuler de virkelige tallene. Når det kommer fram,
   forsvinner den siste tilliten.
3. **Kollapsen.** Strømnettet svikter flere steder, forsyningene fra utlandet stopper og staten mister kontrollen.
   Store deler av befolkningen dør eller flykter.
4. **Kronekrakket.** Kronen mister nesten all verdi. Folk bruker den fortsatt fordi det ikke finnes noe bedre.
5. **Nå.** Noen år etter kollapsen. Kartet viser Norge slik det var i 2023, rett før alt raste: byene, vegene og husene
   står der fortsatt, men mange er tomme og forfalt. Grupper av overlevende kjemper om mat, drivstoff, penger og innflytelse.

**Tidslinje (forslag):** skandalene 2023–2024, Grålungen 2024–2025, kollapsen 2025, spillet starter våren 2027.
Spør brukeren før årstallene settes fast.

## 2. Fraksjonene er spillerne

- **Hver spiller lager sin egen fraksjon** ved start: navn, farge og merke. (Samme som «gjengen» i plan-gjeng.md.)
- Fraksjonen kan bli hva spilleren vil: de som samler Norge igjen, en ny makthaver, en handelsliga, plyndrere.
  Spillet dømmer ikke. Valgene gir omdømme, og omdømmet påvirker hvem som vil handle med deg og bli med deg.
- **Datastyrte grupper** kan fylle ut verdenen (for eksempel plyndrere, restene av staten, bygdefolk). Hvilke og hvor mange er
  ikke bestemt ennå.
- Til å begynne med har **hver spiller sin egen fraksjon**. Flere spillere i samme fraksjon kan komme senere.

## 3. Din karakter

- Du lager din egen karakter ved start: navn, utseende og bakgrunn (forslag: tidligere soldat, lege, ingeniør, bonde,
  forretningsmann, politi). Bakgrunnen gir en liten startbonus.
- Karakteren blir bedre gjennom spillet. Du blir god på det du gjør (skyting, kjøring, bygging, handel, ledelse, sanitet).
- Forslag til ferdighetsgrener: **Leder** (flere folk, bedre moral), **Kriger**, **Tekniker** (kameraer, droner, strøm),
  **Handelsmann**, **Overlever**.
- Karakteren er en person i verden. Du er der du står, og du kan bli skadet.

## 4. Økonomi: 100 millioner og et marked som flytter seg

- **Start: 100 millioner kr** per spiller. Etter Kronekrakket er dette akkurat nok til en enkel leir og noen få folk.
- **Prisene flytter seg i sanntid** etter:
  - tilbud og etterspørsel (alle kjøper drivstoff → prisen stiger),
  - region (mat billig på bygda og dyr i byen, drivstoff billig ved kysten), som gjør det lønnsomt å frakte varer,
  - hendelser (raid på et lager, sykdomsutbrudd, sprengt bru),
  - spillerne (den som kontrollerer et raffineri eller et kraftverk påvirker prisen for alle).
- **Inflasjon:** kronen taper litt verdi hver ekte dag (forslag 1–2 %, justeres i testing). Det lønner seg ikke å sitte på penger,
  så spilleren må investere i bygg, folk eller varer.
- **Varer holder verdien bedre** (ammunisjon, medisin, drivstoff, hermetikk). Bytte vare mot vare er mulig.
- Olje, oppdrag og næringer fra plan-gjeng.md og S3 beholdes og betaler i kroner.

Eksempelpriser ved start (bare et utgangspunkt):

| Vare | Pris |
|---|---|
| Mat for én person i ett døgn | 15 000 kr |
| 10 liter drivstoff | 80 000 kr |
| Overvåkningskamera | 500 000 kr |
| Rekruttere én overlevende | 2 000 000 kr |
| Vakttårn | 5 000 000 kr |
| Aggregat | 8 000 000 kr |

**Senere:** egne markedsplasser i leiren med avgift, handelsruter med eskorte som kan bli raidet, og kanskje en ny valuta
hvis noen samler nok makt.

## 5. Leiren

- Spilleren velger hvor leiren skal ligge på kartet (som i plan-gjeng.md, fase G2).
- Bygg (forslag): **kontrollrom**, brakker, vakttårn, gjerde og port, lager, verksted, sykestue, drivhus, garasje,
  aggregat og solcellepaneler, kameramaster, radiomast, helikopterplass.
- Hvert bygg koster penger og ekte tid, og står i 3D der du plasserer det.
- **Strøm er en ressurs.** Kameraer, radio og kontrollrom trenger strøm. Slår noen ut aggregatet, blir det mørkt på skjermene.

## 6. Tre måter å se spillet på

1. **Kontrollrommet (strategi).** Et rom i leiren der du ser kartet ovenfra og gir ordrer. På skjermene:
   - kartet med det du vet (tåke der du ikke ser),
   - **kamerafeeds** fra kameraene du har satt opp,
   - det **troppene ser og melder på radio** (lagene du har ute),
   - droner og radar når du har dem.
2. **Førsteperson.** Du går ut av kontrollrommet og beveger deg selv i leiren og verden (bygger på `spill/gange.js`).
3. **Tredjeperson.** Samme som førsteperson, men med kameraet bak karakteren. Spilleren velger fritt mellom dem.

Poenget: du må **fysisk være i kontrollrommet** for å få oversikt. Er du ute i felt når leiren blir angrepet, ser du bare det
du ser med egne øyne, og kanskje det troppene melder på radio.

## 7. Overvåking og speiding

- **Kameraer:** settes opp i og rundt leiren. De har synsfelt og rekkevidde, bruker strøm, og kan bli oppdaget og ødelagt.
  Hacking kan komme senere. Det kameraene ser, løfter tåka (bruk reglene for sikt og tåke som finnes, `KROKER.ser`/`KROKER.tåke`).
- **Vakttårn og radio:** vakter melder fra når de ser noe. Radioen kan fange opp meldinger fra andre.
- **Speidere:** sendes ut for å kartlegge andre leirer (hvor mange de er, hva de har, hvor de er svake).
- **Droner og radar:** finnes allerede (S6) og brukes videre.

## 8. Tropper og angrep

- Medlemmene har roller: **speider, soldat, sanitet, ingeniør, sjåfør, forhandler**, og navn, ferdigheter, moral og helse.
  De kan bli syke, skadet, dø eller rømme.
- Typer angrep: plyndring, sabotasje (for eksempel slå ut strømmen så kameraene slukner), bakhold, full erobring.
- Kampreglene, kjøretøyene, ødeleggelsen og feltarbeidet som finnes, brukes videre.

## 9. Tid og vinter

- **Tiden er 1:1 med virkeligheten** (finnes allerede: 1× = sanntid).
- **Vinteren straffer lite** fordi den varer i ekte måneder: litt mer mat, tregere reiser på snø, kortere dager og mindre
  solstrøm. Mer stemning enn trussel.
- **Når du er logget av** går verden videre. Leiren forsvarer seg selv (vakter, kameraer, gjerder), og du får en rapport om hva
  som skjedde mens du var borte.

## 10. Flerspiller

- **1–5 spillere per verden**, hver med sin egen fraksjon på det samme kartet. De kan handle, alliere seg eller angripe hverandre.
- Krever en server som kjører hele tiden og er «sannheten» (klienten sender bare ordrer). Den kan ikke kjøre på Vercel eller
  GitHub. Den må hostes et annet sted (Fly.io, Railway, Render eller en VPS). Spør brukeren om vert når det blir aktuelt
  (se S9 i plan-funksjoner.md og G6 i plan-gjeng.md).
- Koden blir liggende i GitHub, og nettsiden blir på Vercel.

## 11. Rekkefølge (forslag)

| Fase | Innhold |
|---|---|
| K1 | **Oppstart:** lag karakter og fraksjon (navn, farge, merke, bakgrunn), få 100 mill. kr, velg plass til leiren |
| K2 | **Leiren:** bygg med kostnad og byggetid, strøm som ressurs (bygger på G2) |
| K3 | **Kontrollrommet:** rom i leiren med kart ovenfra, radiomeldinger fra lagene, bytte mellom feeds |
| K4 | **Kameraer og vakttårn:** sett opp, synsfelt, strøm, kan ødelegges, feed i kontrollrommet |
| K5 | **Marked:** dynamiske priser per region, inflasjon, kjøp og salg |
| K6 | **Karakterutvikling og tredjeperson** |
| K7 | **Speiding og angrep** på andre leirer (først AI-grupper) |
| K8 | **Logget av:** automatisk forsvar og rapport |
| K9 | **Flerspiller 1–5** (server) |

## 12. Åpne spørsmål til brukeren

1. Skal fraksjonen fortsatt kunne ta **oppdrag i utlandet** (plan-gjeng.md, G3), eller skal alt foregå i Norge nå?
2. Navnet på sykdommen: Grålungen, Nordfeberen, Den stille vinteren eller noe annet?
3. Årstallet spillet starter i (forslag 2027).
4. Hvilke datastyrte grupper skal finnes i verdenen?
5. Hvor stor skal inflasjonen være, og skal det komme en ny valuta senere?
6. Hva skjer når en spiller taper leiren: starter på nytt, eller flykter med de som er igjen?
