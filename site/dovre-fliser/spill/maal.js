/* Mål: regler uten DOM (Node: require('./maal'); nettleser: globalThis.Maal).
 * Brukeren 16. nov: «legg til flere funksjoner og forbedre det som allerede er … om noe er uklart». En kort liste over hva du kan
 * gjøre nå, i fire kapitler, så en ny spiller ser hva som er neste steg. Hvert mål leser et øyeblikksbilde T av spillet
 * (laget av spill/maal-visning.js): bygg (ferdige bygg per type), strøm, diesel, folk, tre (m³ på lager), hogd, revet,
 * tettsteder (dine), går, inne, lett (antall hus du har lett gjennom), garnison, andel og vunnet (krigen, se kapittel 5). Et mål som er nådd, forblir nådd (ferdige = Set med id-er).
 * Målene og rekkefølgen er Claudes forslag.
 */
(function (rot) {
  'use strict';
  const b = (T, t) => (T.bygg && T.bygg[t]) || 0;
  // kroner som i resten av spillet (Leir.kroner): «8,8 mill. kr», «975 000 kr»
  const kroner = n => (n >= 1e6 ? String(Math.round(n / 1e5) / 10).replace('.', ',') + ' mill. kr' : Math.round(n).toLocaleString('nb-NO').replace(/\u00a0|,/g, ' ') + ' kr');
  const KAPITLER = [
    { navn: 'Få leiren i gang', mål: [
      { id: 'brakke', tekst: 'Bygg en brakke', nå: T => (T.bestilt && T.bestilt.brakke ? 'Vent til brakka er ferdig (byggelaget er i gang)' : null), hjelp: 'Leir → Bygg → Brakke. Folkene sover i telt til de får senger.', ferdig: T => b(T, 'brakke') > 0 },
      // (runde 6, kritikken: «Neste: bygg en dieseltank og kjøp diesel» sto etter at tanken var bygget) – nå() gir teksten for det som gjenstår
      { id: 'tank', tekst: 'Bygg en dieseltank og kjøp diesel', nå: T => (b(T, 'drivstofftank') > 0 ? 'Kjøp diesel til tanken' : null), hjelp: 'Leir → Bygg → Dieseltank, så Leir → Lager → «Kjøp 500 l diesel».', ferdig: T => b(T, 'drivstofftank') > 0 && T.diesel > 0 },
      { id: 'strøm', tekst: 'Få strøm: bygg et aggregat eller solceller', hjelp: 'Aggregatet bruker diesel, solcellene gir mindre, men er gratis i drift.', ferdig: T => !!T.strøm },
      // (balansen 18. nov) maten: folk spiser én rasjon hver per døgn, og startmaten varer bare noen døgn
      { id: 'mat', tekst: 'Ha mat til tre døgn', hjelp: 'Folk spiser én rasjon hver per døgn. Kjøp mat i Folk-panelet, send et lag på jakt, fisk med båt eller så en åker – eller bygg drivhus.', ferdig: T => T.matDøgn >= 3 },
      { id: 'lager', tekst: 'Ha 20 m³ planker på lager', hjelp: 'Kjøp under Leir → Lager, eller hogg skog (samme fane).', ferdig: T => T.tre >= 20 },
    ] },
    { navn: 'Få oversikt', mål: [
      // (løkka r1, kritiker I: startrådet sa 9 mill., byggelista 8,8 mill. i alt og målet «ca. 12 mill.») prisen er den samme som i byggelista:
      // T.pris.kontrollrom = LeirSpill.totalPris('kontrollrom') (utstyr og deler + materialene du mangler, til dagens pris)
      { id: 'kontrollrom', tekst: 'Bygg kontrollrommet', hjelp: 'Kartet, kameraene og radioen. Det er det dyreste bygget i starten og kan vente til leiren står og du har to tropper og et vakttårn.',
        hjelpT: T => (T && T.pris && T.pris.kontrollrom > 0 ? `Kartet, kameraene og radioen. Det koster ${(T.pris.tekst && T.pris.tekst.kontrollrom) || kroner(T.pris.kontrollrom)} i alt nå (samme pris som i byggelista) og kan vente til leiren står og du har to tropper og et vakttårn.` : null), ferdig: T => b(T, 'kontrollrom') > 0 },
      { id: 'radiomast', tekst: 'Bygg en radiomast', hjelp: 'Lagene må ha radiokontakt for å ta imot ordre: 15 km med mast, 8 km uten.', ferdig: T => b(T, 'radiomast') > 0 },
      { id: 'vakttårn', tekst: 'Bygg et vakttårn', hjelp: 'Sett en person på «Vakt» under Folk, så melder tårnet fiender nær leiren.', ferdig: T => b(T, 'vakttårn') > 0 },
    ] },
    { navn: 'Lev av landet', mål: [
      { id: 'hogst', tekst: 'Hogg et skogfelt', hjelp: 'Leir → Lager → «Hogst …», og sett folk på «Hogst» under Folk.', ferdig: T => T.hogd > 0 },
      { id: 'riving', tekst: 'Riv et forlatt hus', hjelp: 'Leir → Lager → «Riv hus …». Gir tre, betong og stål.', ferdig: T => T.revet > 0 },
      { id: 'folk', tekst: 'Rekrutter en person til', hjelp: 'Folk → «Rekrutter» når det er en ledig seng.', ferdig: T => T.folk > 10 },
    ] },
    { navn: 'Ut i verden', mål: [
      { id: 'gå', tekst: 'Gå selv ut i verden', hjelp: 'Trykk på karakteren din i kartet og gi den en ordre – eller trykk på et hus og «Let gjennom huset». I 3D: «3D» og så «Gå».', ferdig: T => !!T.går },
      { id: 'inne', tekst: 'Gå inn i et hus', hjelp: 'Trykk på et hus i kartet og velg «Let gjennom huset» – karakteren går inn. I 3D: gå rett mot døra; inne er det rom og møbler.', ferdig: T => !!T.inne },
      { id: 'let', tekst: 'Let gjennom et hus', hjelp: 'Trykk på et hus i kartet og «Let gjennom huset» (i 3D: inne i bygget, knappen eller E). Butikker har mat, verksteder materialer.', ferdig: T => T.lett > 0 },
      { id: 'tettsted', tekst: 'Ta kontroll over et tettsted', hjelp: 'Flytt et lag inn i tettstedet og hold det til det er ditt.', ferdig: T => T.tettsteder > 0 },
    ] },
    // KRIGEN (natt 18. nov): etter de fire første kapitlene handler målene om krigskartet (spill/strategi.js). T.tettsteder = tettsteder
    // du holder, T.garnison = egne tettsteder med et lag i, T.andel = din del av folket i området (0–1), T.vunnet = regionen er din.
    // Kapittelet åpner først når de fire første er nådd (krig: true): til da telles og vises bare de 14 første målene.
    { navn: 'Krigen om regionen', krig: true, mål: [
      { id: 'krig1', tekst: 'Hold et tettsted med et lag i garnison', hjelp: 'La et lag stå i tettstedet du har tatt. Uten garnison tar fienden det tilbake. Åpne «Krig» for oversikt.', ferdig: T => T.garnison > 0 },
      { id: 'krig3', tekst: 'Hold tre tettsteder samtidig', hjelp: 'Krig → «Neste trekk» foreslår de beste målene. Send lag med «Send».', ferdig: T => T.tettsteder >= 3 },
      { id: 'krig30', tekst: 'Hold 30 % av folket i området', hjelp: 'Store tettsteder teller mest. Stolpene i krigskartet viser stillingen.', ferdig: T => T.andel >= .3 },
      { id: 'krigseier', tekst: 'Vinn regionen: 60 % av folket', hjelp: 'Når du har vunnet, kan du velge en større region eller en sterkere motstander.', ferdig: T => !!T.vunnet || T.andel >= .6 },
    ] },
  ];
  const ALLE = KAPITLER.flatMap(k => k.mål), GRUNN = KAPITLER.filter(k => !k.krig).flatMap(k => k.mål), KRIG = new Set(KAPITLER.filter(k => k.krig).flatMap(k => k.mål.map(m => m.id)));
  // er krigskapittelet åpnet (alle de første målene nådd)?
  const krigÅpen = ferdige => GRUNN.every(m => ferdige.has(m.id));
  // Hva som er nådd nå: nye = id-ene som ble nådd i denne runden; ferdige oppdateres
  function vurder(T, ferdige) { const nye = []; const åpen = krigÅpen(ferdige); for (const m of ALLE) { if (ferdige.has(m.id) || (KRIG.has(m.id) && !åpen)) continue; let ok = false; try { ok = !!m.ferdig(T); } catch (e) { ok = false; } if (ok) { ferdige.add(m.id); nye.push(m.id); } } return nye; }
  // Stillingen: kapittelet du er i (det første med noe ugjort), neste mål, antall
  function stilling(ferdige) {
    const ki = KAPITLER.findIndex(k => k.mål.some(m => !ferdige.has(m.id))), k = ki < 0 ? null : KAPITLER[ki], åpen = krigÅpen(ferdige), med = åpen ? ALLE : GRUNN;
    return { kapittel: ki, navn: k ? k.navn : 'Alle målene er nådd', neste: k ? k.mål.find(m => !ferdige.has(m.id)) : null, krigÅpen: åpen,
      gjort: k ? k.mål.filter(m => ferdige.has(m.id)).length : ALLE.length, av: k ? k.mål.length : ALLE.length, totalt: med.filter(m => ferdige.has(m.id)).length, alle: med.length };
  }
  const finn = id => ALLE.find(m => m.id === id);
  // teksten for et mål slik det står nå (m.nå(T) når en del av målet alt er gjort), ellers den faste teksten
  const tekstNå = (m, T) => { if (!m) return ''; let t = null; try { t = T && m.nå ? m.nå(T) : null; } catch (e) { t = null; } return t || m.tekst; };
  // hjelpeteksten slik den står nå (m.hjelpT(T) når den har et tall fra spillet), ellers den faste
  const hjelpNå = (m, T) => { if (!m) return ''; let t = null; try { t = T && m.hjelpT ? m.hjelpT(T) : null; } catch (e) { t = null; } return t || m.hjelp; };
  const api = { KAPITLER, ALLE, GRUNN, krigÅpen, vurder, stilling, finn, tekstNå, hjelpNå, kroner };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Maal = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
