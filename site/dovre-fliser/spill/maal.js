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
  const KAPITLER = [
    { navn: 'Få leiren i gang', mål: [
      { id: 'brakke', tekst: 'Bygg en brakke', hjelp: 'Leir → Bygg → Brakke. Folkene sover i telt til de får senger.', ferdig: T => b(T, 'brakke') > 0 },
      { id: 'tank', tekst: 'Bygg en dieseltank og kjøp diesel', hjelp: 'Leir → Bygg → Dieseltank, så Leir → Lager → «Kjøp 500 l diesel».', ferdig: T => b(T, 'drivstofftank') > 0 && T.diesel > 0 },
      { id: 'strøm', tekst: 'Få strøm: bygg et aggregat eller solceller', hjelp: 'Aggregatet bruker diesel, solcellene gir mindre, men er gratis i drift.', ferdig: T => !!T.strøm },
      { id: 'lager', tekst: 'Ha 20 m³ tre på lager', hjelp: 'Kjøp under Leir → Lager, eller hogg skog (samme fane).', ferdig: T => T.tre >= 20 },
    ] },
    { navn: 'Få oversikt', mål: [
      { id: 'kontrollrom', tekst: 'Bygg kontrollrommet', hjelp: 'Kartet, kameraene og radioen. Det er dyrt (15 mill. kr) og kan vente til leiren står og du har en tropp og et vakttårn.', ferdig: T => b(T, 'kontrollrom') > 0 },
      { id: 'radiomast', tekst: 'Bygg en radiomast', hjelp: 'Lagene må ha radiokontakt for å ta imot ordre: 15 km med mast, 8 km uten.', ferdig: T => b(T, 'radiomast') > 0 },
      { id: 'vakttårn', tekst: 'Bygg et vakttårn', hjelp: 'Sett en person på «Vakt» under Folk, så melder tårnet fiender nær leiren.', ferdig: T => b(T, 'vakttårn') > 0 },
    ] },
    { navn: 'Lev av landet', mål: [
      { id: 'hogst', tekst: 'Hogg et skogfelt', hjelp: 'Leir → Lager → «Hogst …», og sett folk på «Hogst» under Folk.', ferdig: T => T.hogd > 0 },
      { id: 'riving', tekst: 'Riv et forlatt hus', hjelp: 'Leir → Lager → «Riv hus …». Gir tre, betong og stål.', ferdig: T => T.revet > 0 },
      { id: 'folk', tekst: 'Rekrutter en person til', hjelp: 'Folk → «Rekrutter» når det er en ledig seng.', ferdig: T => T.folk > 10 },
    ] },
    { navn: 'Ut i verden', mål: [
      { id: 'gå', tekst: 'Gå selv i 3D', hjelp: 'Trykk «3D» og så «Gå».', ferdig: T => !!T.går },
      { id: 'inne', tekst: 'Gå inn i et hus', hjelp: 'Gå rett mot døra. Inne er det rom og møbler etter hva slags bygg det er.', ferdig: T => !!T.inne },
      { id: 'let', tekst: 'Let gjennom et hus', hjelp: 'Inne i et bygg: trykk «Let gjennom huset» (eller E). Butikker har mat, verksteder materialer.', ferdig: T => T.lett > 0 },
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
  const api = { KAPITLER, ALLE, GRUNN, krigÅpen, vurder, stilling, finn };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Maal = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
