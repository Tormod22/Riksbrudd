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
 *   - rå: getItem/setItem/removeItem uten ending og uten lås (bare for lagringsmenyen);
 *   - er lagringen sperret (localStorage kaster), får spillet en lagring i minnet for økten (iMinne()), så det virker og kan lastes ned.
 * G0 (28. nov, pakke «ut2-lagring», docs/plan-selskap-okonomi.md 13.3): NETTLESERENS DATABASE (IndexedDB) under localStorage.
 *   - Lagringsplassene («riksbrudd-plass-…») og de store dataene («riksbrudd-stor-…», LagringStor) ligger i databasen. Gamle plasser i
 *     localStorage flyttes dit første gang (og tas bort fra localStorage først når databasen har dem). Modulene merker ingenting:
 *     getItem/setItem/removeItem/key/length på localStorage går til databasens minnekopi for disse nøklene.
 *   - Minnekopien (MINNE) leses ved oppstart; «riksbrudd-spill» venter til den er lest (høyst DBN.ventMs). Skriving går til minnet straks
 *     og til databasen i bakgrunnen (tømt() venter til alt er skrevet – lagringsmenyen gjør det før siden lastes på nytt).
 *   - FULL localStorage (QuotaExceededError): først flyttes lagringsplasser som ennå ligger der, så legges nøkkelen som ikke fikk plass
 *     i databasen («flyttet», med merket «riksbrudd-ovl» i localStorage og en kopi i sessionStorage). Ved neste oppstart hentes den derfra;
 *     mangler kopien, låses lagringen, nøkkelen hentes fra databasen og siden lastes på nytt én gang. Ingenting forsvinner i stillhet.
 *   - VERSJON: «riksbrudd-versjon» = { v } for hele det lagrede spillet (0 = fra før merket fantes). Omgjøringene (Lagring.omgjør(fra, fn),
 *     registrert i spill/omgjoringer.js som lastes rett etter denne fila) kjøres i rekkefølge ved oppstart, før modulene leser.
 *   - window.LagringStor: les(navn) synkront fra minnekopien, skriv(navn, verdi) (minnet straks, databasen i bakgrunnen), per side og leir.
 * Reglene øverst er uten DOM (Node: require('./lagringsside'); nettleser: globalThis.LagringSide) – test_lagringsside.js og test_lagring_stor.js.
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
  const INTERNE = /^riksbrudd-(plass-[\w-]+|sider|lastet|k1-utkast|flytt|ovl)$/;
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
  // ---------- G0: versjon, omgjøringer og databasen (reglene) ----------
  // Versjonen på hele det lagrede spillet. 0 = lagret før merket fantes (alt før 28. nov). Øk VERSJON når en omgjøring legges til i
  // spill/omgjoringer.js: Lagring.omgjør(fra, fn) gjør et spill i versjon «fra» om til versjon fra + 1.
  const VERSJON = 1, VERSJON_NØKKEL = 'riksbrudd-versjon';
  const versjonTekst = v => JSON.stringify({ v });
  function versjonAv(t) { if (t === null || t === undefined) return 0; try { const d = JSON.parse(t); return d && Number.isInteger(d.v) && d.v >= 0 ? d.v : 0; } catch (e) { return 0; } }
  // nøkler som bor i nettleserens database (IndexedDB): lagringsplassene og de store dataene (LagringStor) – med eller uten ending
  const DB_NØKKEL = /^riksbrudd-(plass|stor)-[\wæøå-]+(@\w+)?$/;
  const iDatabase = rå => typeof rå === 'string' && DB_NØKKEL.test(rå);
  // merket i localStorage (rått, uten ending) med de nøklene som ble flyttet til databasen fordi localStorage var full
  const OVL_NØKKEL = 'riksbrudd-ovl';
  // nøkler som aldri flyttes til databasen når localStorage er full (merkene selv og prøveskrivingen)
  const kanFlyttes = rå => typeof rå === 'string' && /^riksbrudd-/.test(rå) && !/^riksbrudd-(ovl|sider|plass-test)(@\w+)?$/.test(rå);
  // LagringStor: navnet («hus» eller «riksbrudd-hus») -> «riksbrudd-stor-hus»; verdien pakkes med leiren den hører til
  const storNavn = n => 'riksbrudd-stor-' + String(n === undefined || n === null ? '' : n).replace(/^riksbrudd-(stor-)?/, '');
  const leirId = l => (l && Number.isFinite(l.x) && Number.isFinite(l.y) ? Math.round(l.x) + ',' + Math.round(l.y) : '');
  // leir null = felles for alle leirer på siden
  const pakkStor = (verdi, leir) => JSON.stringify({ leir: leir === null ? '' : leirId(leir), v: verdi });
  // tekst -> verdien når den hører til leiren (undefined ellers)
  function lesStor(t, leir) {
    if (typeof t !== 'string') return undefined; let d = null; try { d = JSON.parse(t); } catch (e) { return undefined; }
    if (!d || typeof d !== 'object' || !Object.prototype.hasOwnProperty.call(d, 'v')) return undefined;
    const vil = leir === null ? '' : leirId(leir); if (leir !== null && !vil) return undefined;
    return d.leir === vil ? d.v : undefined;
  }
  // bytes i nettleseren (localStorage og databasen regner med UTF-16: 2 byte per tegn i nøkkel og verdi)
  function størrelse(alle) { let b = 0; for (const [k, v] of Object.entries(alle || {})) b += 2 * (k.length + String(v === null || v === undefined ? '' : v).length); return b; }
  // «12 kB», «1,4 MB»
  function kb(b) { if (!(b > 0)) return '0 kB'; if (b < 1024 * 1024) return Math.max(1, Math.round(b / 1024)) + ' kB'; return (b / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB'; }
  // to kopier av samme nøkkel (databasen og en gammel i localStorage): den nyeste etter «laget»/«t» i JSON, ellers den første
  function nyest(a, b) { const t = x => { try { const d = JSON.parse(x); return d && (Number.isFinite(d.laget) ? d.laget : Number.isFinite(d.t) ? d.t : -1); } catch (e) { return -1; } };
    if (a === null || a === undefined) return b; if (b === null || b === undefined) return a; return t(b) > t(a) ? b : a; }
  // Registeret for omgjøringer. omgjør(fra, fn, navn): fn(lager, fra) gjør et spill i versjon «fra» om til fra + 1. kjør(base, fra) kjører
  // alle med fra ≤ f < til i rekkefølge på en kopi (base = { navn uten ending: tekst }) og gir { fra, til, kjørt, feil, endringer, senere }:
  // endringer = { navn: tekst | null (slettes) } som tas i bruk bare når alle virket. lager: les, json, skriv, fjern, navn, senere(f) –
  // senere(f) kjører f(lager) på de store dataene (databasen) når de er lest inn.
  function lagOmgjøringer(til = VERSJON) {
    const liste = [];
    function omgjør(fra, fn, navn) {
      if (!Number.isInteger(fra) || fra < 0 || typeof fn !== 'function') throw new Error('omgjør(fraVersjon, fn): fraVersjon må være et heltall ≥ 0');
      liste.push({ fra, fn, navn: String(navn || 'versjon ' + fra + ' → ' + (fra + 1)) });
      // stabil sortering: samme «fra» kjøres i den rekkefølgen de ble lagt inn
      liste.sort((a, b) => a.fra - b.fra);
    }
    function kjør(base, fra, mål = til) {
      const ut = { fra, til: fra, kjørt: [], feil: null, endringer: {}, senere: [], nyere: fra > mål }; if (fra >= mål) return ut;
      const E = {}, har = (o, n) => Object.prototype.hasOwnProperty.call(o, n), senere = [];
      const lager = { les: n => (har(E, n) ? E[n] : har(base, n) ? base[n] : null),
        json: n => { try { return JSON.parse(lager.les(n)); } catch (e) { return null; } },
        skriv: (n, v) => { if (n === VERSJON_NØKKEL) throw new Error('versjonsmerket settes av lagringen'); E[n] = typeof v === 'string' ? v : JSON.stringify(v); },
        fjern: n => { E[n] = null; },
        navn: () => [...new Set([...Object.keys(base), ...Object.keys(E)])].filter(n => lager.les(n) !== null).sort(),
        senere: f => { if (typeof f === 'function') senere.push(f); } };
      for (const o of liste) { if (o.fra < fra || o.fra >= mål) continue;
        try { o.fn(lager, o.fra); ut.kjørt.push(o.navn); } catch (e) { ut.feil = o.navn + ': ' + (e && e.message ? e.message : e); return ut; } }
      ut.endringer = E; ut.senere = senere; ut.til = mål; return ut;
    }
    return { omgjør, kjør, liste: () => liste.map(o => ({ fra: o.fra, navn: o.navn })), tøm: () => { liste.length = 0; } };
  }
  const api = { SIDER, DOVRE, MERKE, INNSTILLINGER, INTERNE, side, ending, hvem, tilRå, egen, erSpill, leirAv, påDovre, delPlan,
    VERSJON, VERSJON_NØKKEL, versjonTekst, versjonAv, DB_NØKKEL, iDatabase, OVL_NØKKEL, kanFlyttes, storNavn, leirId, pakkStor, lesStor, størrelse, kb, nyest, lagOmgjøringer };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  rot.LagringSide = api;
  if (typeof window === 'undefined' || typeof Storage === 'undefined') return;

  // ---------- på siden: endingen, delingen og låsen ----------
  const S = side(location.pathname), P = Storage.prototype, RÅ = { get: P.getItem, set: P.setItem, del: P.removeItem, key: P.key };
  const lenD = Object.getOwnPropertyDescriptor(P, 'length'); RÅ.len = lenD && lenD.get ? lenD.get : function () { return 0; };
  let L = null; try { L = window.localStorage; } catch (e) { L = null; }
  let låst = false, sistFeil = null, iMinne = false; const lyttere = [];
  const låsTil = k => låst && typeof k === 'string' && /^riksbrudd-/.test(k);
  // SPERRET LAGRING (localStorage kaster, f.eks. blokkerte informasjonskapsler): spillet får en lagring i minnet for denne økten, så alt
  // virker som før og kan lastes ned som fil – men ingenting huskes når siden lukkes (lagringsmenyen sier fra). Går ikke det, er L null.
  const M = new Map();
  if (!L) try {
    const mem = { getItem: k => (M.has(tilRå(String(k), S)) ? M.get(tilRå(String(k), S)) : null), setItem: (k, v) => { if (!låsTil(k)) M.set(tilRå(String(k), S), String(v)); },
      removeItem: k => { if (!låsTil(k)) M.delete(tilRå(String(k), S)); }, key: i => { const a = [...M.keys()]; return i >= 0 && i < a.length ? a[i] : null; }, get length() { return M.size; }, clear: () => M.clear() };
    Object.defineProperty(window, 'localStorage', { configurable: true, get: () => mem }); L = mem; iMinne = true;
  } catch (e) { L = null; }
  // rå lesing og skriving i localStorage (nøkkelen som den står). simulertLS: bare localStorage er «full» (vakten, G0)
  let simulert = null, simulertLS = null, ekstraListe = null;
  const lsGet = k => (!L ? null : iMinne ? (M.has(k) ? M.get(k) : null) : RÅ.get.call(L, k));
  const lsSet = (k, v) => { if (!L) throw new DOMException('Lagring er sperret', 'SecurityError'); if (simulertLS) throw new DOMException('Simulert', 'QuotaExceededError');
    if (iMinne) M.set(k, String(v)); else RÅ.set.call(L, k, v); ekstraListe = null; };
  const lsDel = k => { if (!L) return; if (iMinne) M.delete(k); else RÅ.del.call(L, k); ekstraListe = null; };
  const lsNøkler = () => { const ut = []; if (!L) return ut; if (iMinne) return [...M.keys()]; const n = RÅ.len.call(L); for (let i = 0; i < n; i++) { const k = RÅ.key.call(L, i); if (k !== null) ut.push(k); } return ut; };
  const rg = lsGet, rs = lsSet, rd = lsDel;
  api.her = S; api.ending = (s = S) => ending(s); api.tilRå = (navn, s = S) => tilRå(navn, s); api.egen = (rå, s = S) => egen(rå, s);
  api.iMinne = () => iMinne;
  // den gamle felles lagringen deles én gang (før endingen slås på, så nøklene leses rått)
  if (L && !iMinne) try {
    const alle = {}; for (const k of lsNøkler()) if (/^riksbrudd-/.test(k)) alle[k] = rg(k);
    const plan = delPlan(alle);
    if (plan) { for (const [fra, til] of plan.kopier) rs(til, alle[fra]); for (const k of plan.fjern) rd(k);
      rs(MERKE, new Date().toISOString().slice(0, 10)); api.delt = { kopiert: plan.kopier.length, flyttet: plan.fjern.length }; }
  } catch (e) { /* fullt eller sperret: prøves igjen neste gang */ }
  // en lagring som feiler: «fullt» (QuotaExceededError) eller «sperret» (alt annet). «flyttet» = localStorage var full, og nøkkelen ble lagt
  // i databasen i stedet (ingenting er mistet, men spilleren får vite det)
  const erFull = e => !!e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014);
  function varsle(f) { for (const g of lyttere) try { g(f); } catch (e2) { /* lytteren feilet */ } }
  function feilet(e, navn) { sistFeil = { t: Date.now(), navn, type: erFull(e) ? 'fullt' : 'sperret' }; varsle(sistFeil); }
  api.erFull = erFull;

  // ---------- G0: databasen (IndexedDB) med minnekopi ----------
  // Claudes forslag: høyst fem sekunder venter oppstarten på databasen (ellers brukes localStorage som før for alt)
  const DBN = { navn: 'riksbrudd', lager: 'nokler', ventMs: 5000, reloadMs: 30000 };
  // MINNE: rå nøkkel -> tekst (databasens innhold, lest ved oppstart og skrevet straks); KØ: det som ennå ikke er skrevet (null = slett)
  const MINNE = new Map(), KØ = new Map();
  let db = null, dbTilstand = (L && !iMinne && typeof indexedDB !== 'undefined') ? 'åpner' : 'ute', lastet = false, tømmer = null, dbFeil = null;
  // de flyttede nøklene (localStorage var full): merket i localStorage, og en kopi i sessionStorage som kan leses synkront etter omlasting
  const OVL = new Set(); const SS_FØR = 'riksbrudd-ovl:';
  const ssGet = k => { try { return window.sessionStorage.getItem(SS_FØR + k); } catch (e) { return null; } };
  const ssSet = k => { try { window.sessionStorage.setItem(SS_FØR + k, MINNE.get(k)); return true; } catch (e) { return false; } };
  const ssDel = k => { try { window.sessionStorage.removeItem(SS_FØR + k); } catch (e) { /* ingen sessionStorage */ } };
  try { const o = JSON.parse(lsGet(OVL_NØKKEL) || '[]'); if (Array.isArray(o)) for (const k of o) if (typeof k === 'string') OVL.add(k); } catch (e) { /* ødelagt merke */ }
  function lagreOvl() { try { if (OVL.size) lsSet(OVL_NØKKEL, JSON.stringify([...OVL])); else lsDel(OVL_NØKKEL); } catch (e) { /* merket fikk ikke plass: kopien i databasen gjelder */ }
    KØ.set(OVL_NØKKEL, OVL.size ? JSON.stringify([...OVL]) : null); planlegg(); }
  // mangler en flyttet nøkkel i denne fanen (ingen kopi i sessionStorage), må den hentes fra databasen før modulene kan lese den:
  // lagringen låses (ingen modul skriver over noe), og siden lastes på nytt når kopien er lagt i sessionStorage
  let henter = false;
  for (const k of OVL) { const s = ssGet(k); if (s !== null) MINNE.set(k, s); else henter = true; }
  if (henter) låst = true;
  const endret = () => { ekstraListe = null; };
  function planlegg() { if (dbTilstand === 'ute' && lastet) return Promise.resolve(); if (!tømmer) tømmer = new Promise(r => setTimeout(r, 0)).then(tøm); return tømmer; }
  // skriver køen til databasen i én transaksjon. En gammel kopi i localStorage (lagringsplassene fra før G0) tas bort først etterpå.
  async function tøm() {
    await klar;
    if (!db) { tilLocalStorage(); tømmer = null; return; }
    const deler = [...KØ]; KØ.clear();
    if (deler.length) try {
      await new Promise((ja, nei) => { const tx = db.transaction(DBN.lager, 'readwrite'), st = tx.objectStore(DBN.lager);
        for (const [k, v] of deler) { if (v === null) st.delete(k); else st.put(v, k); }
        tx.oncomplete = () => ja(); tx.onerror = () => nei(tx.error); tx.onabort = () => nei(tx.error || new DOMException('Avbrutt', 'AbortError')); });
      for (const [k, v] of deler) if (v !== null && iDatabase(k) && lsGet(k) !== null) lsDel(k);
    } catch (e) {
      // det som ikke ble skrevet, legges tilbake i køen (når det ikke er skrevet på nytt imens) og prøves igjen om litt
      dbFeil = e; for (const [k, v] of deler) if (!KØ.has(k)) KØ.set(k, v); feilet(e, deler[0][0]);
      tømmer = null; setTimeout(planlegg, 2000); return;
    }
    tømmer = null; if (KØ.size) planlegg();
  }
  // uten database: det som lå i køen, skrives i localStorage som før (lagringsplassene)
  function tilLocalStorage() { for (const [k, v] of KØ) { if (k === OVL_NØKKEL) continue; try { if (v === null) lsDel(k); else lsSet(k, v); } catch (e) { feilet(e, k); } } KØ.clear(); }
  const dbGet = k => (MINNE.has(k) ? MINNE.get(k) : lsGet(k));
  function dbSett(k, v) { if (dbTilstand === 'ute' && lastet) { lsSet(k, v); MINNE.delete(k); endret(); return; } MINNE.set(k, String(v)); KØ.set(k, String(v)); endret(); planlegg(); }
  function dbDel(k) { MINNE.delete(k); lsDel(k); if (!(dbTilstand === 'ute' && lastet)) { KØ.set(k, null); planlegg(); } endret(); }
  // lesing, skriving og sletting av en rå nøkkel – samme vei for modulene (getItem …), lagringsmenyen (rå) og LagringStor
  function lesRå(rå) { if (iDatabase(rå)) return dbGet(rå); if (OVL.has(rå)) return MINNE.has(rå) ? MINNE.get(rå) : lsGet(rå); return lsGet(rå); }
  // localStorage er full: lagringsplasser som ennå ligger der, flyttes først; får nøkkelen fortsatt ikke plass, legges den i databasen
  function frigjør() { let n = 0; if (dbTilstand === 'ute') return 0;
    for (const k of lsNøkler()) if (iDatabase(k)) { const v = lsGet(k); if (v === null) continue; MINNE.set(k, nyest(MINNE.get(k), v)); KØ.set(k, MINNE.get(k)); lsDel(k); n++; }
    if (n) { endret(); planlegg(); } return n; }
  function flytt(rå, v, navn) {
    if (dbTilstand === 'ute' || !kanFlyttes(rå)) return false;
    if (frigjør()) { try { lsSet(rå, v); return true; } catch (e) { if (!erFull(e)) return false; } }
    OVL.add(rå); lsDel(rå); MINNE.set(rå, v); KØ.set(rå, v); lagreOvl(); ssSet(rå); endret(); planlegg();
    sistFeil = { t: Date.now(), navn, type: 'flyttet' }; varsle(sistFeil); return true;
  }
  function skrivRå(rå, v, navn) {
    v = String(v);
    if (iDatabase(rå)) { try { dbSett(rå, v); } catch (e) { feilet(e, navn); throw e; } return; }
    if (OVL.has(rå)) {
      // en flyttet nøkkel: tilbake i localStorage når det er plass igjen, ellers i databasen
      try { lsSet(rå, v); OVL.delete(rå); MINNE.delete(rå); KØ.set(rå, null); ssDel(rå); lagreOvl(); endret(); planlegg(); return; }
      catch (e) { if (!erFull(e)) { feilet(e, navn); throw e; } MINNE.set(rå, v); KØ.set(rå, v); ssSet(rå); planlegg(); return; }
    }
    try { lsSet(rå, v); } catch (e) { if (erFull(e) && flytt(rå, v, navn)) return; feilet(e, navn); throw e; }
  }
  function slettRå(rå) {
    if (iDatabase(rå)) { dbDel(rå); return; }
    if (OVL.has(rå)) { OVL.delete(rå); MINNE.delete(rå); ssDel(rå); KØ.set(rå, null); lagreOvl(); endret(); }
    lsDel(rå);
  }
  // nøklene i databasen som ikke står i localStorage (de kommer etter localStorage sine i key(i))
  const ekstra = () => { if (!ekstraListe) ekstraListe = [...MINNE.keys()].filter(k => lsGet(k) === null).sort(); return ekstraListe; };
  // åpner databasen og leser alt (nøkler som begynner med «riksbrudd-») inn i minnet. Gir databasen, eller null når den ikke virker.
  const klar = new Promise(ja => {
    if (dbTilstand === 'ute') return ja(null);
    let ferdig = false; const slutt = d => { if (ferdig) { if (d) try { d.close(); } catch (e) { /* lukket */ } return; } ferdig = true; ja(d); };
    setTimeout(() => slutt(null), DBN.ventMs);
    try {
      const r = indexedDB.open(DBN.navn, 1);
      r.onupgradeneeded = () => { try { r.result.createObjectStore(DBN.lager); } catch (e) { /* finnes */ } };
      r.onerror = () => { dbFeil = r.error; slutt(null); };
      r.onsuccess = () => { const d = r.result; d.onversionchange = () => { try { d.close(); } catch (e) { /* lukket */ } };
        try { const tx = d.transaction(DBN.lager, 'readonly'), st = tx.objectStore(DBN.lager), rk = st.getAllKeys(), rv = st.getAll();
          tx.oncomplete = () => { const K = rk.result || [], V = rv.result || [];
            for (let i = 0; i < K.length; i++) { const k = K[i]; if (typeof k !== 'string' || !/^riksbrudd-/.test(k) || KØ.has(k) || k === OVL_NØKKEL) continue;
              if (iDatabase(k) || OVL.has(k)) MINNE.set(k, String(V[i])); }
            slutt(d); };
          tx.onerror = tx.onabort = () => { dbFeil = tx.error; slutt(null); };
        } catch (e) { dbFeil = e; slutt(null); } };
    } catch (e) { dbFeil = e; slutt(null); }
  }).then(d => { db = d; dbTilstand = d ? 'ok' : 'ute'; lastet = true; endret(); try { etterLast(); } catch (e) { console.error(e); } return dbTilstand; });
  // etter lesingen: gamle lagringsplasser i localStorage flyttes til databasen, flyttede nøkler prøves tilbake i localStorage, og de
  // store dataenes omgjøringer kjøres
  function etterLast() {
    if (!db) { tilLocalStorage(); if (henter) { låst = false; henter = false; console.error('Lagringen: fant ikke databasen – flyttede nøkler mangler'); varsle({ t: Date.now(), type: 'mangler' }); } return; }
    let n = 0; for (const k of lsNøkler()) if (iDatabase(k)) { const v = lsGet(k); if (v === null) continue; const best = nyest(MINNE.get(k), v);
      if (best !== MINNE.get(k)) { MINNE.set(k, best); KØ.set(k, best); n++; } else if (!KØ.has(k)) { KØ.set(k, best); n++; } }
    if (n) { api.flyttetPlasser = n; planlegg(); }
    let tilbake = 0, mangler = 0;
    for (const k of [...OVL]) { const v = MINNE.get(k); if (v === undefined) { mangler++; continue; }
      try { lsSet(k, v); OVL.delete(k); MINNE.delete(k); KØ.set(k, null); ssDel(k); tilbake++; } catch (e) { ssSet(k); } }
    if (tilbake) lagreOvl();
    if (mangler) console.error('Lagringen: ' + mangler + ' flyttede nøkler finnes ikke i databasen');
    for (const f of omgjortSenere.splice(0)) try { kjørSenere(f); } catch (e) { console.error('omgjøring av de store dataene feilet', e); }
    endret();
    if (henter) {
      // kopiene ligger nå i sessionStorage (eller tilbake i localStorage): siden lastes på nytt én gang, så modulene leser dem
      let sist = 0; try { sist = +window.sessionStorage.getItem('riksbrudd-ovl-omlast') || 0; } catch (e) { sist = 0; }
      if (Date.now() - sist > DBN.reloadMs) { try { window.sessionStorage.setItem('riksbrudd-ovl-omlast', String(Date.now())); } catch (e) { /* uten sessionStorage */ }
        planlegg().then(() => location.reload()); return; }
      låst = false; henter = false; varsle({ t: Date.now(), type: 'mangler' });
    }
  }
  api.klar = klar; api.lastet = () => lastet; api.database = () => dbTilstand; api.dbFeil = () => dbFeil; api.henter = () => henter;
  // venter til alt er skrevet til databasen (lagringsmenyen gjør det før siden lastes på nytt)
  api.tømt = async () => { for (let i = 0; i < 50 && (tømmer || KØ.size); i++) await (tømmer || planlegg()); return !KØ.size; };
  api.flyttede = () => [...OVL];
  // «riksbrudd-spill» venter til databasen er lest (normalt er den lest lenge før kartet er klart)
  try { const send = rot.dispatchEvent;
    if (typeof send === 'function') rot.dispatchEvent = function (e) { if (e && e.type === 'riksbrudd-spill' && !lastet && this === rot) { klar.then(() => send.call(rot, e)); return true; } return send.call(this, e); };
  } catch (e) { /* uten venting */ }

  // getItem/setItem/removeItem/key/length: endingen for siden, databasen, låsen og feilene (bare for localStorage – sessionStorage er som før)
  if (!iMinne) try {
    P.getItem = function (k, ...r) { if (this !== L) return RÅ.get.call(this, k, ...r); return lesRå(tilRå(k, S)); };
    P.setItem = function (k, v, ...r) { if (this !== L) return RÅ.set.call(this, k, v, ...r); if (låsTil(k)) return undefined; return skrivRå(tilRå(k, S), v, k); };
    P.removeItem = function (k, ...r) { if (this !== L) return RÅ.del.call(this, k, ...r); if (låsTil(k)) return undefined; return slettRå(tilRå(k, S)); };
    P.key = function (i, ...r) { if (this !== L) return RÅ.key.call(this, i, ...r); const n = RÅ.len.call(this); if (i < n) return RÅ.key.call(this, i); const e = ekstra(); return i - n < e.length ? e[i - n] : null; };
    if (lenD && lenD.get) Object.defineProperty(P, 'length', { configurable: true, enumerable: lenD.enumerable, get: function () { const n = RÅ.len.call(this); return this === L ? n + ekstra().length : n; } });
  } catch (e) { /* uten lagring */ }
  api.lås = (v = true) => { låst = !!v; return låst; };
  api.låst = () => låst;
  api.feil = () => sistFeil;
  api.nårFeil = f => { lyttere.push(f); };
  // simuler('fullt' | 'sperret' | 'fullt-ls' | null): rå.set feiler som om nettleseren var full eller sperret (bare for vakten – uten melding
  // i loggen); 'fullt-ls' = bare localStorage er full (databasen virker), så setItem flytter nøkkelen til databasen
  api.simuler = t => { simulert = t === 'fullt-ls' ? null : t || null; simulertLS = t === 'fullt-ls' ? t : null; };
  // rå tilgang (nøkkelen som den står, uten ending og lås) – kaster ved feil, så lagringsmenyen kan si fra
  api.rå = { get: lesRå,
    set: (k, v) => { if (simulert) throw new DOMException('Simulert', simulert === 'fullt' ? 'QuotaExceededError' : 'SecurityError'); skrivRå(k, v, k); },
    del: slettRå,
    // alle nøklene for denne siden: { navn uten ending: verdi } – også de som ligger i databasen
    alle: (s = S) => { const ut = {}; if (!L) return ut; for (const k of [...lsNøkler(), ...ekstra()]) { const h = hvem(k); if (h && h.side === s && !(h.navn in ut)) ut[h.navn] = lesRå(k); } return ut; } };
  // virker lagringen? «ok», «fullt» eller «sperret» (prøver å skrive en liten nøkkel; lagring i minnet regnes som sperret). Er bare
  // localStorage full, men databasen virker, er det «ok»: det som ikke får plass, flyttes dit.
  api.virker = () => { if (!L || iMinne) return 'sperret'; if (simulert) return simulert; const k = 'riksbrudd-plass-test' + ending(S);
    try { rs(k, '1'); rd(k); return 'ok'; } catch (e) { return erFull(e) ? (dbTilstand === 'ute' ? 'fullt' : 'ok') : 'sperret'; } };
  // hvor mye plass spillet bruker (bytes): ls = alle «riksbrudd-»-nøkler i localStorage (alle sidene), db = alt i databasen, spill = spillet
  // på denne siden (begge steder, uten lagringsplassene), plasser = { id: bytes } for denne siden, kvote = localStorage sin grense (anslag)
  api.størrelse = (s = S) => {
    const ls = {}, side = {}, pl = {}; for (const k of lsNøkler()) if (/^riksbrudd-/.test(k)) ls[k] = lsGet(k);
    const dbAlle = {}; for (const [k, v] of MINNE) dbAlle[k] = v;
    for (const [k, v] of Object.entries({ ...ls, ...dbAlle })) { const h = hvem(k); if (!h || h.side !== s) continue;
      const m = /^riksbrudd-plass-([\w-]+)$/.exec(h.navn); if (m) pl[m[1]] = størrelse({ [k]: v }); else if (erSpill(h.navn, v)) side[k] = v; }
    return { ls: størrelse(ls), db: størrelse(dbAlle), spill: størrelse(side), plasser: pl, flyttet: OVL.size, database: dbTilstand, kvote: 5 * 1024 * 1024 };
  };

  // ---------- G0: versjonen og omgjøringene ----------
  const REG = lagOmgjøringer(); let omgjort = null; const omgjortSenere = [];
  // de store dataene (databasen) for siden som et lager for omgjøringene (senere(f))
  function kjørSenere(f) {
    const E = {}, har = n => Object.prototype.hasOwnProperty.call(E, n), rå = n => tilRå(n, S);
    const lager = { les: n => (har(n) ? E[n] : lesRå(rå(n))), json: n => { try { return JSON.parse(lager.les(n)); } catch (e) { return null; } },
      skriv: (n, v) => { E[n] = typeof v === 'string' ? v : JSON.stringify(v); }, fjern: n => { E[n] = null; },
      navn: () => [...MINNE.keys()].map(k => hvem(k)).filter(h => h && h.side === S).map(h => h.navn).sort(), senere: () => { /* ikke flere ledd */ } };
    f(lager); for (const [n, v] of Object.entries(E)) { if (v === null) slettRå(rå(n)); else skrivRå(rå(n), v, n); }
  }
  // kjøres én gang ved oppstart (spill/omgjoringer.js kaller den når omgjøringene er registrert; ellers ved DOMContentLoaded)
  api.omgjørNå = function () {
    if (omgjort) return omgjort;
    const alle = api.rå.alle(), harSpill = typeof alle['riksbrudd-k1'] === 'string', harMerke = typeof alle[VERSJON_NØKKEL] === 'string';
    const fra = harMerke ? versjonAv(alle[VERSJON_NØKKEL]) : harSpill ? 0 : VERSJON;
    const base = {}; for (const [n, v] of Object.entries(alle)) if (n !== VERSJON_NØKKEL && typeof v === 'string') base[n] = v;
    const r = REG.kjør(base, fra); omgjort = { fra: r.fra, til: r.til, kjørt: r.kjørt, feil: r.feil, nyere: r.nyere };
    if (r.nyere) { console.warn(`Lagringen: spillet er lagret med en nyere utgave (versjon ${fra}, denne er ${VERSJON})`); return omgjort; }
    if (r.feil) { console.error('Lagringen: omgjøringen feilet – spillet er ikke endret:', r.feil); return omgjort; }
    try {
      if (r.kjørt.length && dbTilstand !== 'ute') { KØ.set('kopi:' + tilRå('riksbrudd-før-versjon-' + fra, S), JSON.stringify({ t: Date.now(), fra, nøkler: base })); planlegg(); }
      for (const [n, v] of Object.entries(r.endringer)) { if (v === null) slettRå(tilRå(n, S)); else skrivRå(tilRå(n, S), v, n); }
      if (!harMerke || fra !== r.til) skrivRå(tilRå(VERSJON_NØKKEL, S), versjonTekst(r.til), VERSJON_NØKKEL);
      omgjortSenere.push(...r.senere); if (lastet && r.senere.length) for (const f of omgjortSenere.splice(0)) kjørSenere(f);
    } catch (e) { omgjort.feil = 'kunne ikke skrive: ' + (e && e.message); console.error('Lagringen: omgjøringen ble ikke lagret', e); }
    return omgjort;
  };
  api.versjon = () => ({ lagret: versjonAv(lesRå(tilRå(VERSJON_NØKKEL, S))), utgave: VERSJON, omgjort, omgjøringer: REG.liste() });
  // et nytt spill (startet i denne utgaven) som mangler merket, får det når spillet er klart
  rot.addEventListener('riksbrudd-spill', () => { try { if (lesRå(tilRå(VERSJON_NØKKEL, S)) === null && !låst) skrivRå(tilRå(VERSJON_NØKKEL, S), versjonTekst(VERSJON), VERSJON_NØKKEL); } catch (e) { /* fullt eller sperret */ } });
  if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', () => { if (!omgjort) { console.warn('Lagringen: spill/omgjoringer.js er ikke lastet – omgjøringene kjøres nå'); api.omgjørNå(); } });
  // Lagring.omgjør(fra, fn, navn) – spill/lagring.js legger resten av Lagring til (Object.assign)
  rot.Lagring = Object.assign(rot.Lagring || {}, { omgjør: (fra, fn, navn) => { if (omgjort) console.warn('Lagring.omgjør etter oppstart: kjøres først neste gang siden lastes'); REG.omgjør(fra, fn, navn); }, SPILLVERSJON: VERSJON });

  // ---------- G0: LagringStor – store data i databasen, per side og per leir ----------
  // les(navn, { felles }) synkront fra minnekopien (null når det ikke finnes eller hører til en annen leir), skriv(navn, verdi, { felles })
  // (minnet straks, databasen i bakgrunnen; gir false uten leir eller når lagringen er låst), fjern(navn), klar (løfte), når(fn), navn().
  // les gir det samme objektet hver gang (ikke en kopi): endre det og kall skriv for å lagre. Verdiene følger med i lagringsplassene og fila.
  const CACHE = new Map();
  const nåLeir = () => { try { const T = rot.OppstartSpill && rot.OppstartSpill.tilstand(); return T && T.leir ? T.leir : null; } catch (e) { return null; } };
  rot.LagringStor = {
    les(navn, o = {}) {
      const rå = tilRå(storNavn(navn), S), t = lesRå(rå); if (typeof t !== 'string') return null;
      let c = CACHE.get(rå); if (!c || c.t !== t) { let d = null; try { d = JSON.parse(t); } catch (e) { d = null; } c = { t, d }; CACHE.set(rå, c); }
      const d = c.d; if (!d || typeof d !== 'object' || !Object.prototype.hasOwnProperty.call(d, 'v')) return null;
      const vil = o.felles ? '' : leirId(nåLeir()); if (!o.felles && !vil) return null; return d.leir === vil ? d.v : null;
    },
    skriv(navn, verdi, o = {}) {
      if (låst) return false; if (verdi === undefined || verdi === null) return rot.LagringStor.fjern(navn);
      const l = o.felles ? null : nåLeir(); if (!o.felles && !leirId(l)) return false;
      const rå = tilRå(storNavn(navn), S), t = pakkStor(verdi, l);
      try { skrivRå(rå, t, rå); } catch (e) { return false; }
      CACHE.set(rå, { t, d: { leir: o.felles ? '' : leirId(l), v: verdi } }); return true;
    },
    fjern(navn) { if (låst) return false; const rå = tilRå(storNavn(navn), S); slettRå(rå); CACHE.delete(rå); return true; },
    navn: () => [...MINNE.keys()].map(k => hvem(k)).filter(h => h && h.side === S && /^riksbrudd-stor-/.test(h.navn)).map(h => h.navn.slice(15)).sort(),
    klar: klar.then(() => true), når(fn) { klar.then(() => { try { fn(); } catch (e) { console.error(e); } }); },
    lastet: () => lastet, database: () => dbTilstand, tømt: () => api.tømt(),
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
