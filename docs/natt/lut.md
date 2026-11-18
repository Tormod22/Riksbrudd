# Pakke «lut» – lut i husene og inventar i Zomboid-sjangeren

## Runde 4 (18. nov kveld)

Brukeren: «Legg også til at en kan finne lut inni hus, for eksempel brunost, andre matgreier, saft, rifle, ammunisjon og så
videre.» Utvidet: «Jeg ønsker liksom inventar systemet til project zomboid» – mekanikken i sjangeren (beholdere, to sider, vekt,
utstyrt, handlinger, ferskhet), ikke spillets utseende, navn eller tekster. Alle tall er Claudes forslag.

### Filer
- `site/dovre-fliser/spill/lut.js` – reglene uten DOM (`Lut`), test `pipeline/fliser/test_lut.js` (45 sjekker).
- `site/dovre-fliser/spill/lut-visning.js` – visningen (`window.LutSpill`), lastes rett etter `leting-visning.js`.
- `pipeline/fliser/vakter/lut.js` – vakten «lut og beholdere».
- `docs/natt/lut-hjelp.json` – fire hjelpeemner (gruppe «I 3D»).

### Reglene (`Lut`)
- `REGLER`: lommer 5 kg, bæreevne 22 kg (+ styrken fra overlev.js), svært tungt ved 1,5 × bæreevnen, fart 0,7–1 når tungt og 0,55
  svært tungt, løpetid ned til 0,5, våpen opp til 2 × bæreevnen, rekkevidde 1,6 m til møbelkanten, gulvhauger innen 2 m, kjøleskap
  med strøm eldes 4 × saktere, gammel mat ×0,7 sult / ×0,8 tørst, råtten ×0,3 og −12 helse, ransaket bygg: hver ting 30 %,
  3000 endrede beholdere huskes, alle starter med tursekk på ryggen.
- `GJENSTANDER` (id → navn, enhet, vekt, kat, spis, fersk, rasjoner, våpen, sekk, helse, funn-vekter w/n/b/k, tekst):
  mat (brunost, knekkebrød, fiskeboller, lapskaus, pølser på boks, makrell i tomat, havregryn, tørrfisk, melkesjokolade, feltrasjon),
  fersk (melk, grovbrød, egg, epler, wienerpølser, gulost, leverpostei), drikke (saft solbær/bringebær, flaskevann, brus, kaffe – kaffe
  gir søvn +22), våpen (`v_jaktrifle`, `v_hagle`, `v_pistol`, `v_gevær` = HV-geværet), ammo (a762, ahagl, a9, a556 – typene fra
  utstyr.js), medisin (førstehjelp = `forbinding`, smertestillende +15 helse), utstyr (lommelykt, batterier, tau, verktøykasse, sovepose,
  feltflaske), sekker (handlenett 7 kg/0 %, skolesekk 12/15 %, tursekk 22/30 %, militærsekk 30/40 %).
  `finnes: true` = tingen finnes alt i sekken (utstyr.js / eventyr.js) – navn og vekt derfra.
- `BEHOLDERE` = møbeltypene i interior.js det kan ligge noe i: kjøleskap, kjøledisk (kalde), kjøkkenbenk («kjøkkenskapene»), skap
  («garderoben»), nattbord, tvbenk, bokhylle, pult, kateter, arkivskap, skranke, vask («baderomsskapet»), reol, kasse, pall,
  pallereol, hylle, arbeidsbenk («verktøybenken»), verktøyvogn, tønne og bil (i garasjen). Hver har kg-plass og hva som er vanlig der.
- `KLASSER` = lut per byggklasse (sjansen for at bygget er ransaket, «rik» og ganger per slag): jaktvåpen og ammo i hytter, låver og
  uthus, mye mat i butikker og lager, medisin på sykehus, skolesekker på skoler, militærsekk og feltrasjon i hangarer. Målt i testen:
  våpen i 27 % av hyttenes første garderobe, 16 % i boliger, 3 % i leiligheter, 0 på sykehus; ca. 10 matvarer per butikkreol.
  Våpen ligger bare i det første møbelet av hver type i bygget. Leirens egne bygg har beholdere, men de er tomme.
- `innhold(kl, type, i, k)` – fast innhold per møbel (hash av byggets nummer, typen og nummeret blant like møbler); fersk mat har
  dato 0 (den har ligget der siden alt stoppet), så kjøleskapene råtner etter noen døgn.
- Datoer: tall = «født» (alder = nå − tall), i kjøleskap `[alder da den kom inn, når]`. `alder/stadium/normaliser/flytt/taUt/
  stabler/måltid/bæring/beholdere/avstand`.

### Visningen (`LutSpill`)
- Tingene legges inn i `Utstyr.TING` (del: true – kan ikke kjøpes) og jaktrifla i `Utstyr.VÅPEN` (4 skudd 7,62 mm, 450 m,
  selges ikke) ved DOMContentLoaded og senest ved «riksbrudd-spill» (lytteren kommer før sekkens egen, så en lagret sekk med lut
  leses riktig). Alle våpen kan også ligge som ting (`v_<id>`).
- **Beholdere**: inne i et bygg (Interior3d.inne) kommer `#lutknapp` «Åpne kjøleskapet (E)» ved møbelet (≤ 1,6 m fra kanten).
  Over «Sikre huset» på skjermen. E åpner (letingens E venter da), Tab åpner/lukker panelet når du går, Esc lukker.
- **Lutpanelet** `#lutpanel`: venstre «Du bærer» (vekt/bæreevne med merker for tungt og svært tungt, plass, Utstyrt: Hånd og
  Rygg, Beltet 1–4, Lommer og sekk), høyre «Beholdere» med én fane per møbel innen rekkevidde (to like: «Garderobe 1/2») og
  «Gulvet». Like ting stables («20 × 7,62 mm», «1 × Melk – råtten»). Trykk velger, trykk på den andre siden flytter (telefon);
  dra og slipp og dobbeltklikk (mus); høyreklikk / hold inne 0,5 s gir valgene i feltet under. «Ta alt» / «Legg alt».
  Valg: Spis, Drikk, Bruk (medisin), Utstyr (våpen i beltet), Ta på (sekk), Ta av (ryggen), Ta i hånda, Lad, Legg i sekken,
  Legg fra deg / Legg i …, Flytt til …, Én (bare én), Ta med, Gi til leiren (i leiren: maten blir rasjoner i FolkSpill).
- **Gulvet**: hauger i kartets meter (`S.gulv`); den nærmeste innen 2 m brukes, ellers lages en der du står når noe legges der.
- **Vekt**: `Utstyr.krok = { maks, vekt, plassTil, våpenOk }` – plass = lommer + sekken på ryggen (våpnene i beltet tar ikke plass),
  vekt = våpen + sekkens egen vekt + lommene + innholdet i sekken × (1 − «lettere»). `Utstyr.maks()` = bæreevnen. For tungt:
  `LutSpill.fart()` (gange.js) og `LutSpill.løp()` (karakter.js, løpetiden), svært tungt: `LutSpill.kanLøpe()` = false.
- **Ferskhet**: kjøleskap i husene er kalde så lenge strømnettet i spill/overlev.js virker (`S.strømAv` husker når det gikk);
  kjøleskap i leirens kjøkken når bygget virker. Råtten mat kan spises (−12 helse).
- **3D**: det som ligger i benker, bord, nattbord, hyller og verktøybenker, står oppå møbelet (opptil 6 slag, to av hver), våpen i
  garderoben står mot veggen ved siden av den, og haugene på gulvet/bakken synes (innen 120 m). Ett nett per bygg med hjørnefarger,
  lagt i interiørets `o.nett` (frigjøres sammen med interiøret), bygges bare på nytt når innholdet endres. Ingen lys.
- **Lagring** per leir i «riksbrudd-lut»: `{ rygg, dato, b (endrede beholdere), gulv, strømAv }`.
- I sekken (#sekk): «Spis»/«Drikk»/«Til beltet»/«Ta på» på tingene, og «Ryggen og plassen» med knappen «Inventar og beholdere (Tab)».

### Valg (skrevet ned fordi ingen kunne spørres)
- **G – leirressursene**: «Let gjennom huset» beholdes for det tunge (tre, betong, stål, diesel, penger og mat i kartonger til leiren).
  Grunner: det er tonn og kubikkmeter som ikke kan bæres i en sekk, leirens økonomi og balansen (pakka «balanse» stilte den inn i dag)
  bygger på det, og vaktene «leting i hus» og «det som ble igjen» skal være grønne. Våpen og ammunisjon kommer ikke lenger fra letingen
  (`fantIHus` kalles ikke når lutsystemet er klart) – de ligger i skapene. Meldingen etter letingen minner om skapene.
- **Jaktrifle** er et eget våpen (4 skudd, 450 m) – «Skarpskyttergevær» (rifle) i butikken er sterkere og koster 1,2 mill.
- **Boksåpner**: ikke krav (det ble mas, og figuren har kniv i beltet).
- **Våpen i beltet** tar ikke plass i sekken (de henger på deg), men teller i vekta. Det må alltid være minst ett våpen i beltet
  (kampen i spillet-visning.js og narhud.js regner med det). Et våpen fra en beholder kommer i beltet med tomt magasin.
- **Sekken** kan bare tas av når det du bærer, får plass i lommene; bytter du sekk, må alt få plass i den nye.
- Sekken teller som én samlet plass (ikke hver sekk sin beholder).

### Fellesfiler endret (små, samlede endringer)
- `spill/utstyr.js`: `api.krok` (maks, vekt, plassTil, våpenOk) og `råVekt`; `forTungt()` brukes av nyttVåpen og kjøp;
  `LutSpill.sekkKnapp(id)` spørres før EventyrSpill i sekkens knapper; `window.SEKK_TILLEGG` (lister i sekkpanelet, før ferdighetene).
- `spill/gange.js`: farten ganges med `LutSpill.fart()`, og `ikkeLøp` når `!LutSpill.kanLøpe()`.
- `spill/karakter.js`: løpetiden ganges også med `LutSpill.løp()` (bare når behovene går, ikke i testene).
- `spill/leting-visning.js` (min): E venter når du står ved en beholder; `fantIHus` kalles ikke når LutSpill er klar; meldingen nevner skapene.
- `index.html`: to skripttagger etter leting-visning.js (versjon.py kjørt).

### Prøvd
- `node pipeline/fliser/test_lut.js` (45 ok), `test_utstyr.js`, `test_leting.js`.
- Vakten «lut og beholdere» i nettleser på PC og mobil (3D: 1,6–1,8 s; uten 3D bare reglene).
- Ekte mus (Playwright): dra og slipp flytter, dobbeltklikk flytter tilbake (telles i trykk() – nettleserens dblclick kommer ikke
  fordi panelet tegnes på nytt etter første klikk), høyreklikk gir valgene. I sekken (#sekk): Drikk på saften, Til beltet på hagla,
  Ta på på skolesekken, Spis på brunosten (sult 40 -> 65).
- Vaktene «leting i hus», «angrep, marked … sekken» og «det som ble igjen» kjørt fra sjekk.js-koden i samme side: grønne.
  (Interiørvakten ga geo = 4 i mitt oppsett både med og uten lut-skriptene – ikke fra denne pakka.)
- Bilder: lutpanelet PC 1400 og telefon 390, benken med brunost/saft/knekkebrød/fiskeboller, rifle ved garderoben, haug på gulvet,
  og et ekte hus i Ryfylke (husdata via dev.py) med to garderober.

### Ikke gjort
- Lommelykt, batterier, sovepose og feltflaske har ingen virkning ennå (bare ting med vekt).
- Ingen egen vekt per sekk (sekken er én plass), ingen sekker i sekker, ikke «nøkkelring/belte»-plasser utover våpnene.
- Tingene inne i kjøleskap, kjøledisker, reoler og paller synes ikke i 3D (bare det som ligger oppå åpne møbler).
- Fiender/overlevende leter ikke i husene; husene fylles ikke på igjen.
- Leirens egne lagre (lagerteltet) er ikke koblet til leirens materialer – beholderne der er bare din egen lagring.
