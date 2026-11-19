/* Riksbrudd – HVER SIDE SITT LAGREDE SPILL (runde 7, 20. nov natt, pakke «lagring»). Kritikken og runde 6: «/dovre-fliser og /norge
 * deler fortsatt ett lagret spill». Nå har /dovre-fliser, /norge og /rogaland hver sine nøkler i localStorage:
 *   /dovre-fliser: «riksbrudd-…» uten ending (som før), /norge: «riksbrudd-…@norge», /rogaland: «riksbrudd-…@rogaland» (som før).
 * Modulene merker ingenting: getItem/setItem/removeItem på localStorage legger til endingen for siden de står på.
 * Første gang etter oppdateringen (ingen nøkkel «riksbrudd-sider» ennå) deles det gamle felles spillet: /norge får en kopi av alle de
 * gamle nøklene uten ending (spillet og innstillingene), og et spill med leiren utenfor Dovre-kartet flyttes helt til /norge (det kan
 * ikke spilles på Dovre-kartet – Dovre-siden viser da startskjermen og sier at spillet ligger på /norge).
 * Lastes FØRST på siden (før noen modul leser localStorage). I tillegg:
 *   - lås(true): andre skript kan ikke skrive «riksbrudd-…» (lagringsmenyen låser når et lagret spill lastes inn, så det modulene
 *     lagrer når siden lastes på nytt, ikke skriver over det som ble lastet inn);
 *   - feil(): sist gang en lagring feilet (nettleseren full eller lagring sperret) – lagringsmenyen sier fra;
 *   - rå: getItem/setItem/removeItem uten ending og uten lås (bare for lagringsmenyen).
 * Reglene øverst er uten DOM (Node: require('./lagringsside'); nettleser: globalThis.LagringSide) – test_lagringsside.js.
 */
(function (rot) {
  'use strict';
  // ---------- reglene ----------
  const SIDER = { dovre: '', norge: '@norge', rogaland: '@rogaland' };
  // samme ramme som DOVRE i index.html (Dovre-kartet, EPSG:25833)
  const DOVRE = [182016, 6880000, 228000, 6930016];
  // rå nøkkel (uten ending) som sier at det gamle felles spillet er delt
  const MERKE = 'riksbrudd-sider';
  // nøkler som er innstillinger for spilleren, ikke en del av ett spill (de følger ikke med i en lagringsplass eller fil, og røres ikke
  // når et spill lastes inn). Verdier som ikke er et JSON-objekt («1», «på», «pc» …) regnes også som innstillinger.
  const INNSTILLINGER = new Set(['allemerker', 'effekter', 'filter', 'flyt', 'fps', 'grafikk', 'grafikkvarsel', 'hjelp', 'kaier', 'kamspor', 'kompass',
    'krigpanel', 'leirdeler', 'lyd', 'maler', 'minikart', 'minikart-nord', 'opplaering', 'opplaering-av', 'opplaering-sammen', 'snikforklart', 'strid',
    'teknisk', 'tredje', 'venner']);
  // lagringsmenyens egne nøkler og ting som bare gjelder et øyeblikk (utkastet på startskjermen, en leir som flyttes)
  const INTERNE = /^riksbrudd-(plass-[\w-]+|sider|lastet|k1-utkast|flytt)$/;
  const side = sti => (/^\/rogaland\/?$/.test(sti || '') ? 'rogaland' : /^\/norge\/?$/.test(sti || '') ? 'norge' : 'dovre');
  const ending = s => SIDER[s] || '';
  // rå nøkkel -> { navn (uten ending), side } – null for nøkler som ikke er spillets
  function hvem(rå) {
    if (typeof rå !== 'string' || !/^riksbrudd-/.test(rå)) return null; const m = /^(.+)@(\w+)$/.exec(rå);
    return m ? { navn: m[1], side: m[2] } : { navn: rå, side: 'dovre' };
  }
  // navnet modulene bruker -> rå nøkkel for siden (nøkler som allerede har en ending, røres ikke)
  const tilRå = (navn, s) => (typeof navn === 'string' && /^riksbrudd-/.test(navn) && !/@\w+$/.test(navn) ? navn + ending(s) : navn);
  const egen = (rå, s) => { const h = hvem(rå); return !!h && h.side === s; };
  // hører nøkkelen til ett spill (følger med i en lagringsplass)? navn uten ending, verdi = teksten som er lagret
  function erSpill(navn, verdi) {
    if (typeof navn !== 'string' || !/^riksbrudd-[\wæøå-]+$/.test(navn) || INTERNE.test(navn) || INNSTILLINGER.has(navn.slice(10))) return false;
    try { const d = JSON.parse(verdi); return !!d && typeof d === 'object'; } catch (e) { return false; }
  }
  // leiren i et lagret «riksbrudd-k1» (null når spillet ikke er ferdig satt opp)
  function leirAv(k1) { try { const S = JSON.parse(k1); return S && S.ferdig && S.leir && Number.isFinite(S.leir.x) && Number.isFinite(S.leir.y) ? { x: S.leir.x, y: S.leir.y } : null; } catch (e) { return null; } }
  const påDovre = l => !!l && l.x >= DOVRE[0] && l.x <= DOVRE[2] && l.y >= DOVRE[1] && l.y <= DOVRE[3];
  // Planen for å dele det gamle felles spillet. alle = { rå nøkkel: verdi } (hele localStorage). Gir { kopier: [[fra, til]], fjern: [rå],
  // merke: true } – eller null når det er gjort før. Kopien til /norge lages bare når /norge ikke har et spill fra før.
  function delPlan(alle) {
    if (!alle || Object.prototype.hasOwnProperty.call(alle, MERKE)) return null;
    const gamle = Object.keys(alle).filter(k => { const h = hvem(k); return h && h.side === 'dovre' && !INTERNE.test(k); }), ut = { kopier: [], fjern: [], merke: true };
    if (!gamle.length) return ut;
    const norgeHar = Object.prototype.hasOwnProperty.call(alle, 'riksbrudd-k1' + SIDER.norge);
    if (!norgeHar) for (const k of gamle) if (!Object.prototype.hasOwnProperty.call(alle, k + SIDER.norge)) ut.kopier.push([k, k + SIDER.norge]);
    // et spill med leiren utenfor Dovre-kartet er et Norge-spill: det flyttes (spillnøklene tas bort fra Dovre-siden, innstillingene blir)
    const leir = leirAv(alle['riksbrudd-k1']);
    if (leir && !påDovre(leir) && !norgeHar) for (const k of gamle) if (erSpill(k, alle[k]) || k === 'riksbrudd-k1') ut.fjern.push(k);
    return ut;
  }
  const api = { SIDER, DOVRE, MERKE, INNSTILLINGER, INTERNE, side, ending, hvem, tilRå, egen, erSpill, leirAv, påDovre, delPlan };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  rot.LagringSide = api;
  if (typeof window === 'undefined' || typeof Storage === 'undefined') return;

  // ---------- på siden: endingen, delingen og låsen ----------
  const S = side(location.pathname), P = Storage.prototype, RÅ = { get: P.getItem, set: P.setItem, del: P.removeItem };
  let L = null; try { L = window.localStorage; } catch (e) { L = null; }
  let låst = false, sistFeil = null; const lyttere = [];
  api.her = S; api.ending = (s = S) => ending(s); api.tilRå = (navn, s = S) => tilRå(navn, s); api.egen = (rå, s = S) => egen(rå, s);
  // den gamle felles lagringen deles én gang (før endingen slås på, så nøklene leses rått)
  if (L) try {
    const alle = {}; for (let i = 0; i < L.length; i++) { const k = L.key(i); if (k && /^riksbrudd-/.test(k)) alle[k] = RÅ.get.call(L, k); }
    const plan = delPlan(alle);
    if (plan) { for (const [fra, til] of plan.kopier) RÅ.set.call(L, til, alle[fra]); for (const k of plan.fjern) RÅ.del.call(L, k);
      RÅ.set.call(L, MERKE, new Date().toISOString().slice(0, 10)); api.delt = { kopiert: plan.kopier.length, flyttet: plan.fjern.length }; }
  } catch (e) { /* fullt eller sperret: prøves igjen neste gang */ }
  // en lagring som feiler: «fullt» (QuotaExceededError) eller «sperret» (alt annet)
  function feilet(e, navn) { sistFeil = { t: Date.now(), navn, type: e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) ? 'fullt' : 'sperret' };
    for (const f of lyttere) try { f(sistFeil); } catch (e2) { /* lytteren feilet */ } }
  // getItem/setItem/removeItem: endingen for siden, låsen og feilene (bare for localStorage – sessionStorage er som før)
  try {
    P.getItem = function (k, ...r) { return RÅ.get.call(this, this === L ? tilRå(k, S) : k, ...r); };
    P.setItem = function (k, ...r) { if (this !== L) return RÅ.set.call(this, k, ...r); if (låst && typeof k === 'string' && /^riksbrudd-/.test(k)) return undefined;
      try { return RÅ.set.call(this, tilRå(k, S), ...r); } catch (e) { feilet(e, k); throw e; } };
    P.removeItem = function (k, ...r) { if (this !== L) return RÅ.del.call(this, k, ...r); if (låst && typeof k === 'string' && /^riksbrudd-/.test(k)) return undefined;
      return RÅ.del.call(this, tilRå(k, S), ...r); };
  } catch (e) { /* uten lagring */ }
  api.lås = (v = true) => { låst = !!v; return låst; };
  api.låst = () => låst;
  api.feil = () => sistFeil;
  api.nårFeil = f => { lyttere.push(f); };
  api.L = () => L;
  // rå tilgang (nøkkelen som den står, uten ending og lås) – kaster ved feil, så lagringsmenyen kan si fra
  // simuler('fullt' | 'sperret' | null): rå.set feiler som om nettleseren var full eller sperret (bare for vakten)
  let simulert = null; api.simuler = t => { simulert = t || null; };
  api.rå = { get: k => (L ? RÅ.get.call(L, k) : null),
    set: (k, v) => { if (!L) throw new DOMException('Lagring er sperret', 'SecurityError');
      try { if (simulert) throw new DOMException('Simulert', simulert === 'fullt' ? 'QuotaExceededError' : 'SecurityError'); RÅ.set.call(L, k, v); } catch (e) { feilet(e, k); throw e; } },
    del: k => { if (L) RÅ.del.call(L, k); },
    // alle nøklene for denne siden: { navn uten ending: verdi }
    alle: (s = S) => { const ut = {}; if (!L) return ut; for (let i = 0; i < L.length; i++) { const k = L.key(i), h = hvem(k); if (h && h.side === s) ut[h.navn] = RÅ.get.call(L, k); } return ut; } };
  // virker lagringen? «ok», «fullt» eller «sperret» (prøver å skrive en liten nøkkel)
  api.virker = () => { if (!L) return 'sperret'; const k = 'riksbrudd-plass-prøve' + ending(S);
    try { RÅ.set.call(L, k, '1'); RÅ.del.call(L, k); return 'ok'; } catch (e) { return e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) ? 'fullt' : 'sperret'; } };
})(typeof globalThis !== 'undefined' ? globalThis : this);
