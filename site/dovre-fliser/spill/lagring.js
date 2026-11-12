/* Lagring av verden (feiljakt 12. nov: «omlasting nullstiller klokka, årstida, lagene og kjøretøyene»).
 * Reglene øverst er uten DOM (Node: require('./lagring'); nettleser: globalThis.Lagring), visningen nederst kobler dem på spillet.
 * Det som lagres (localStorage «riksbrudd-verden»): klokka (tid i spillminutter), årstida og været, og for egne lag og kjøretøy
 * hvor de står og hvordan de har det (mennenes helse, ammunisjon, antall biler, drivstoff og last). Karakteren, leiren, folket og
 * materialjobbene lagres som før av sine egne deler (k1–k3, ressurser).
 * IKKE lagret ennå (gjenstår): marsj- og kjøreordre (lag og biler står stille etter omlasting), fiendens lag, olje på basen og
 * enheter i bestilling, erobrede tettsteder, sprengt infrastruktur, minefelt og droner.
 */
(function (rot) {
  'use strict';
  const VERSJON = 1;
  const tall = (v, reserve = 0) => (Number.isFinite(+v) ? +v : reserve), mellom = (v, a, b) => Math.max(a, Math.min(b, v));
  const r1 = v => Math.round(v * 10) / 10;
  // ---------- lagene ----------
  function pakkLag(s) {
    const d = { navn: s.navn, x: r1(s.x), y: r1(s.y), leder: s.leder || 0, menn: s.menn.map(m => ({ navn: m.navn, rolle: m.rolle, hp: +(+m.hp).toFixed(3), loy: m.loy })) };
    if (s.speider) d.speider = true; if (s.ingeniør) d.ingeniør = true; if (s.nedgravd) d.nedgravd = true;
    if (s.radio) d.radio = s.radio; if (s.ammo !== undefined) d.ammo = +(+s.ammo).toFixed(3);
    return d;
  }
  // Setter laget slik det ble lagret. Laget står stille (ordren er ikke lagret), og sikten regnes på nytt.
  function brukLag(s, d) {
    s.x = tall(d.x, s.x); s.y = tall(d.y, s.y); s.sti = null; s.steg = null; s.seg = 0; s.prog = 0; s.timerIgjen = 0; s.siktSkitten = true;
    if (Array.isArray(d.menn) && d.menn.length) s.menn = d.menn.filter(m => m && m.navn).map(m => ({ navn: String(m.navn), rolle: String(m.rolle || 'rifle'), hp: mellom(tall(m.hp, 1), 0, 1), loy: tall(m.loy, .8) }));
    s.leder = mellom(Math.round(tall(d.leder, 0)), 0, Math.max(0, s.menn.length - 1));
    if (d.ammo !== undefined) s.ammo = mellom(tall(d.ammo, 1), 0, 1);
    if (d.radio) s.radio = d.radio; if (d.nedgravd) s.nedgravd = true;
    return s;
  }
  // ---------- kjøretøyene ----------
  function pakkKj(k) {
    const d = { navn: k.navn, type: k.type, antall: k.antall, x: r1(k.x), y: r1(k.y), retning: +(+k.retning || 0).toFixed(3) };
    if (k.drivstoff !== undefined) d.drivstoff = +(+k.drivstoff).toFixed(4); if (k.forsyning) d.forsyning = r1(k.forsyning);
    return d;
  }
  // Kolonnen står stille der den var (ruten og oppdraget er ikke lagret)
  function brukKj(k, d) {
    k.x = tall(d.x, k.x); k.y = tall(d.y, k.y); k.retning = tall(d.retning, k.retning || 0); k.antall = mellom(Math.round(tall(d.antall, k.antall)), 0, 40);
    k.sti = null; k.oppdrag = null; k.framme = false;
    if (d.drivstoff !== undefined) k.drivstoff = mellom(tall(d.drivstoff, 1), 0, 1); if (d.forsyning) k.forsyning = Math.max(0, tall(d.forsyning, 0));
    return k;
  }
  // ---------- det hele ----------
  // o: { tid, vær (tilstanden fra spill/vaer.js), lag: [egne lag], kjøretøy: [egne kjøretøy], leir: { x, y } }
  function pakk(o) {
    return { versjon: VERSJON, leir: o.leir ? { x: Math.round(o.leir.x), y: Math.round(o.leir.y) } : null, tid: Math.max(0, tall(o.tid, 0)),
      vær: o.vær ? JSON.parse(JSON.stringify(o.vær)) : null, lag: (o.lag || []).map(pakkLag), kjøretøy: (o.kjøretøy || []).map(pakkKj) };
  }
  // Leser lagringen. Ødelagt, ukjent versjon eller lagret for en annen leir (et annet spill) gir null.
  function fraJSON(t, leir) {
    try { const d = typeof t === 'string' ? JSON.parse(t) : t; if (!d || d.versjon !== VERSJON) return null;
      if (leir && (!d.leir || Math.round(leir.x) !== d.leir.x || Math.round(leir.y) !== d.leir.y)) return null;
      return { versjon: VERSJON, leir: d.leir || null, tid: Math.max(0, tall(d.tid, 0)), vær: d.vær && typeof d.vær === 'object' ? d.vær : null,
        lag: (Array.isArray(d.lag) ? d.lag : []).filter(q => q && q.navn && Number.isFinite(q.x) && Number.isFinite(q.y)),
        kjøretøy: (Array.isArray(d.kjøretøy) ? d.kjøretøy : []).filter(q => q && q.navn && q.type && Number.isFinite(q.x) && Number.isFinite(q.y)) };
    } catch (e) { return null; }
  }
  // Legger det lagrede tilbake i listene. finnes: lista (lag eller kjøretøy) som allerede står i spillet; lagNy(d) lager det som mangler
  // (enheter bygget på basen etter spillstart) og gir null når det ikke går. Like navn brukes én gang hver. Gir antallet som ble satt.
  function settTilbake(lagret, finnes, bruk, lagNy) {
    const brukt = new Set(); let n = 0;
    for (const d of lagret) { let e = finnes.find(q => q.navn === d.navn && !brukt.has(q)); if (!e && lagNy) e = lagNy(d); if (!e) continue; brukt.add(e); bruk(e, d); n++; }
    return n;
  }
  const api = { VERSJON, pakk, fraJSON, pakkLag, brukLag, pakkKj, brukKj, settTilbake };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  rot.Lagring = api;
  if (typeof document === 'undefined' || typeof KROKER === 'undefined') return;

  // ---------- visningen: kobler lagringen på spillet ----------
  const NØKKEL = 'riksbrudd-verden';
  const spill = () => rot.OppstartSpill && OppstartSpill.tilstand();
  // et lagret spill fantes da siden ble lastet: da leses verden inn igjen ved første «riksbrudd-spill» (ikke når et nytt spill settes opp)
  let fortsetter = !!spill(), aktiv = false, sist = 0, av = false;
  const egneLag = () => ENHETER.filter(s => s.side === 'blå' && !s.ai && !s.karakter);
  const egneKj = () => (rot.KJORETOY || []).filter(k => k.side === 'blå');
  function lagre() {
    const S = spill(); if (!aktiv || av || !S || !S.leir) return false;
    try { localStorage.setItem(NØKKEL, JSON.stringify(pakk({ tid, vær: rot.VaerSpill ? VaerSpill.S : null, lag: egneLag(), kjøretøy: egneKj(), leir: S.leir }))); return true; } catch (e) { return false; }
  }
  function les() {
    const S = spill(); if (!S || !S.leir) return false; let d = null;
    try { d = fraJSON(localStorage.getItem(NØKKEL), S.leir); } catch (e) { d = null; }
    if (!d) return false;
    tid = d.tid;
    if (d.vær && rot.VaerSpill) { Object.assign(VaerSpill.S, d.vær); VaerSpill.straks(); }
    settTilbake(d.lag, egneLag(), brukLag, q => { const s = q.ingeniør && rot.nyttIngeniørlag ? nyttIngeniørlag(q.navn, q.x, q.y) : nyttLag(q.navn, q.x, q.y, 'blå', !!q.speider); if (!ENHETER.includes(s)) ENHETER.push(s); return s; });
    settTilbake(d.kjøretøy, egneKj(), brukKj, q => { if (!rot.Kjoretoy || !Kjoretoy.TYPER[q.type] || !(q.antall >= 1)) return null;
      try { const k = Kjoretoy.ny({ navn: q.navn, type: q.type, antall: Math.min(40, Math.round(q.antall)), x: q.x, y: q.y, retning: q.retning || 0 }); KJORETOY.push(k); return k; } catch (e) { return null; } });
    skitten = true; return true;
  }
  // etter K1 (og etter at kontrollrommet har satt inn karakteren): les verden inn én gang, og lagre fra da av
  window.addEventListener('riksbrudd-spill', () => setTimeout(() => { if (fortsetter) { fortsetter = false; les(); } aktiv = true; lagre(); }, 0));
  // lagres hvert femte sekund mens spillet går, og når siden skjules eller lukkes
  KROKER.sim.push(() => { const nå = performance.now(); if (nå - sist < 5000) return; sist = nå; lagre(); });
  window.addEventListener('pagehide', lagre);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') lagre(); });
  rot.LagringSpill = { NØKKEL, lagre, les, av(v = true) { av = v; }, aktiv: () => aktiv && !av };
})(typeof globalThis !== 'undefined' ? globalThis : this);
