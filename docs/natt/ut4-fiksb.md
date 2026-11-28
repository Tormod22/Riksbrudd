# ut4-fiksb – feil fra full kontroll (sjekk.js, PC) etter flettingen (28. nov)

Gren `claude/ut4-fiksb`. Fire feil fra `feil-ut3pc.txt`; alle gjenskapt eller forklart, årsaken rettet.

1. **folk** (inline i `sjekk.js`): sjekken krevde `rader === 10` oppgaver i folkepanelet. Pakka maskinfolk la til oppgaven
   `maskin` (FolkRegler.OPPGAVER har nå 11). Gammel forventning – sjekken krever nå like mange rader som `Folk.OPPGAVER`
   (og minst 10). Ingen endring i spillet.
2. **ikoner** (inline i `sjekk.js`): sagbruk, vedkløyver og fyrkjele hadde ikon i CSS (produksjon-visning.js), men ikke i
   ikonsettet, så `Ikoner.har('sag')` var false. Nytt API `Ikoner.legg(ikoner, bygg)` i `spill/ikoner.js` legger nye ikoner inn i
   settet (og CSS-en) og knytter bygg til dem; produksjon-visning.js bruker det (reserve: som før).
3. **lokke-r3-angrep**: når en sensor (KROKER.ser – radar, kameramast, drone fra kontrollen før) ser røverne, går observasjonen
   med vilje foran ruta i banneret, mens varselet i loggen ble skrevet fra ruta ved avmarsjen. Rettet to steder:
   - spillet: `spill/spillet-visning.js` – er røverne alt sett når de drar ut, bruker varselet der de er (samme kilde som banneret);
   - vakta: sensorene skrus av fra før `SpilletSpill.angrep()` (ikke bare under fartsprøven), og settes tilbake også i `finally`.
   Gjenskapt med en sensor som alltid ser røverne: den gamle vakta feilet («sørøst» mot «sør»), nå ok (både gammel og ny vakt).
4. **lyd i 2D** (`ut3-lyd`): `loggdemp.js` holder igjen «<lag>: planlegger rute …» når laget fikk en ordre under 3 min før, så
   lyd2d.js (som lyttet på loggteksten) ga ingen ordrelyd – også i spillet. Nå pakker `spill/lyd2d.js` inn `window.ordre`: ordren
   gir lyd når kallet tas imot (s.planlegger satt før første await), ikke stille, eget lag. «planlegger rute» i loggen hoppes over
   mens kallet går (ikke to lyder). Vakta gir ordren med `ordre()` (laget settes tilbake), leter etter ordrelyden blant lydene etter
   kallet, og har et nummer per kjøring i tekstene (loggdemp slår ellers sammen med en kjøring like før).
   Feil med vilje: uten innpakningen feilet vakta på andre kjøring med den samme meldingen som i full kontroll.

Endrede fellesfiler: `pipeline/fliser/sjekk.js` (folk-linja: `fo.oppgaver`, `fo.rader === fo.oppgaver`), `spill/ikoner.js`
(`legg`), `spill/lyd2d.js` (ordre-innpakning), `spill/spillet-visning.js` (varselets retning), `spill/produksjon-visning.js`
(bruker `Ikoner.legg`), vaktene `lokke-r3-angrep.js` og `ut3-lyd.js`, `index.html` (bare versjonsmerker fra versjon.py).
