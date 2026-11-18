# Nattrapport 18. november 2026 (02:00–08:00)

Alt ligger på grenen `claude/nattfiks`. **Ingenting er publisert.** Detaljene for hver pakke står i `docs/natt/<pakke>.md`.

## Kontroll
- Regeltestene: alle grønne etter hver fletting.
- Mobilkontrollen (hele `sjekk.js`): 112 godkjente, én feil som ble rettet etterpå.
- PC-kontrollen (hele `sjekk.js`): 112 godkjente, én feil i graving-vakten. Årsaken var kontrollen selv (laget var drept av en tidligere vakt); vakten er rettet, men ikke kjørt på nytt.
- Ingenting er prøvd i ekte Safari på iPhone. All 3D er bare sett med programvare-grafikk.

## Femti forbedringer (uten Y-tasten)
| Område | Status |
|---|---|
| Knapphet: start uten ferdige lag, 40 mill. kr, tomme hyller, kjøp dyrere enn hogst/riving | Gjort. Balansen er for hard de første døgnene (se under) |
| Diesel og olje | Ikke slått sammen; kan veksles, forklart i Region |
| Seier fører videre / tap gir utpost / krigsmål etter kapittel 4 | Gjort |
| Spol til neste hendelse, automatisk nedbremsing, marsjtid før ordre, køordre, flere lag | Gjort (marsjtid på telefon via bekreft-trinn) |
| Lagre fiendens lag, minne, stillinger, ordre i gang | Gjort (pågående røverbølge lagres ikke) |
| Retning/flanke, formasjon gir fart, erfaring per ildrunde, «hvorfor laget gjorde det» | Gjort |
| Dekning i hus, roller for stridsvogn/artilleri, sårede bæres, fanger og overgivelse | Gjort |
| Fiendens førere og væremåte, røvere som varierer, fienden bruker flere kjøretøy | Gjort (fienden kjører ikke på telefon) |
| Folk som personer (ansikt, historie, ønsker), krangler og flere hendelseskort, forfall i flere trinn | Gjort |
| Rom i byggesettet kan bli kjøkken/lager/verksted, kameravarsel med knapp, folk ved byggene i 3D | Gjort (folk står ved, ikke i, byggene) |
| Behov ute, tilflukter med lager og søvn, dekning når du skyter, ferdigheter åpner evner | Gjort |
| Opplæring i spillet, telefonens fliser og kommandolinje, én rad fliser, forklaring på flisene | Gjort |
| Våpenruta fri av minikartet, kort logg, byggekort, minikart i 2D, ett merkesett, færre kartmerker | Gjort |
| Stopp kjøretøy ved fylkesgrensa på Rogaland | Gjort for kolonner og båter; «kjør selv» ikke prøvd. Mørklegging i 3D ikke gjort |
| Fjern hakket ved nytt utsnitt | Ikke gjort |
| Del kontrollen i raske og trege deler | Delvis: vakter i egne filer |

## Femti nye ideer
| Ideer | Status |
|---|---|
| 1–6 Sjøen: båter, havner, fiske, landgang, sperring, ferjer | Gjort og prøvd på Rogaland (også kjøretøy om bord) |
| 7–12 Region: tettsteder gir varer, handelsruter, skatt/lojalitet, strøm, svartebørs, gjenoppbygging | Gjort og prøvd på Rogaland |
| 13–20 Samfunn: flyktninger, spesialister, barn og gamle, Grålungen, lover, forrædere, opplæring, begravelser | Gjort; balanse prøvd over 18 døgn med tilfeldige valg |
| 21–30 Krig: etterretning, natt, artilleri, røyk/lys/støy, bakhold, beleiring, våpenhvile, bygdevern, helikopter, droner | Gjort; noe bare prøvd på testsiden |
| 31–38 Verden: vinter, flom og ras, jakt, åker, brann, funn, radio, tog | Gjort og prøvd på Rogaland |
| 39–44 Karakteren: historie, skader, håndverk, hund, sniking, kartslør | Gjort; tilflukt og leting prøvd i ekte hus |
| 45, 46, 49, 50 Scenarier, utfordringer, etterspill, vanskelighetsgrad | Gjort |
| 47 To spillere i samme region | Delvis: dele leir og stilling som lenke. Ikke sanntid (krever tjener) |
| 48 Ukentlig felles oppdrag | Delvis: samme oppdrag for alle den uka, resultat som kode. Ingen felles telling |

## Tjue utseendegrep
| Grep | Status |
|---|---|
| 3, 5, 10–14 Trær, gress, figurer, støv/spor, kampeffekter, ødeleggelse, fjern skog | Gjort og flettet inn (+6–10 % trekanter) |
| 17–20 Lysere 2D-kart, merkesett, tegninger i paneler, overganger | Gjort og flettet inn |
| 1, 2, 4, 6–9, 15, 16 Skygger, omgivelsesskygge, skarp bakke, vann, skyer, nattlys, daltåke, fargesetting, kantutjevning | **Laget på egen gren `claude/natt18-lys`, IKKE flettet inn og ikke kontrollert.** Hjelperen stoppet før den var ferdig |

## Det som ikke ble ferdig
- **Lys og skygger** ligger på egen gren (se over). Må flettes og kontrolleres.
- **Balansen de første døgnene** er for hard for en nybegynner (gjennomspillingen på PC: bølgene vokser raskere enn gjengen, røverbytte er hovedinntekten, de fire første byggene tar 39 av 40 mill.). Arbeidet med det ble avbrutt; et uferdig utkast ligger på `claude/natt18-test1`, ikke flettet inn.
- Fra gjennomspillingene, ikke rettet: last på nytt midt i et angrep fjerner røverne; karakteren blir utslitt når du spoler; første hus kan være tomt; «Gå» setter deg der kameraet ser; krigskartet er trangt i liggende format på telefon; hjelpen og opplæringen kommer samtidig første gang.
- Hakk ved nytt utsnitt er ikke arbeidet med.
- Y-tasten (100 mill. kr) ligger fortsatt inne, som avtalt.
