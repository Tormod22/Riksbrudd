/* Lagring av verden (feiljakt 12. nov: «omlasting nullstiller klokka, årstida, lagene og kjøretøyene»).
 * Reglene øverst er uten DOM (Node: require('./lagring'); nettleser: globalThis.Lagring), visningen nederst kobler dem på spillet.
 * Det som lagres (localStorage «riksbrudd-verden»): klokka (tid i spillminutter), årstida og været, og for egne lag og kjøretøy
 * hvor de står og hvordan de har det (mennenes helse, ammunisjon, antall biler, drivstoff og last). Karakteren, leiren, folket og
 * materialjobbene lagres som før av sine egne deler (k1–k3, ressurser).
 * Fra 16. nov lagres også: hvem som eier tettstedene, sprengt og sperret infrastruktur (en reparasjon som var i gang, må
 * startes på nytt) og oljen på basen.
 * Fra 18. nov lagres også: marsjordre i gang (målet – laget planlegger ruta på nytt og går videre), fiendens lag (motstandernes
 * lag og patruljen: sted, helse, hva de holdt på med), det motstanderne husker (AI.minne) og stillingene de har bygget.
 * IKKE lagret ennå (gjenstår): kjøreordre for kjøretøy, røverne i et angrep som er i gang, enheter i bestilling på basen,
 * minefelt og droner.
 */
(function (rot) {
  'use strict';
  const VERSJON = 1;
  const tall = (v, reserve = 0) => (Number.isFinite(+v) ? +v : reserve), mellom = (v, a, b) => Math.max(a, Math.min(b, v));
  const r1 = v => Math.round(v * 10) / 10;
  // ---------- lagene ----------
  function pakkLag(s) {
    const d = { navn: s.navn, x: r1(s.x), y: r1(s.y), leder: s.leder || 0, menn: s.menn.map(m => Object.assign({ navn: m.navn, rolle: m.rolle, hp: +(+m.hp).toFixed(3), loy: m.loy }, m.person ? { person: m.person } : {}, m.valgt ? { valgt: m.valgt } : {}, m.erf ? { erf: Math.round(m.erf * 10) / 10 } : {})) };
    if (s.fraFolk) d.fraFolk = true; if (s.utstyr) d.utstyr = s.utstyr; if (s.formasjon && s.formasjon !== 'kile') d.formasjon = s.formasjon; if (s.ombord && s.ombord.navn) d.ombord = s.ombord.navn;   // egne tropper (spill/tropper.js)
    if (s.speider) d.speider = true; if (s.ingeniør) d.ingeniør = true; if (s.nedgravd) d.nedgravd = true;
    if (s.radio) d.radio = s.radio; if (s.ammo !== undefined) d.ammo = +(+s.ammo).toFixed(3);
    if (s.strid) d.strid = s.strid;   // stridsreglene og bevæpningen (spill/strid.js)
    if (s.fanger && s.fanger.n > 0) d.fanger = { n: s.fanger.n, side: s.fanger.side }; if (s.bakhold) d.bakhold = true; if (s.krig) d.krig = s.krig;   // spill/krig-visning.js
    // (18. nov) ordren i gang: målet for marsjen. Fiendens lag: siden, og for AI-lagene hva de holdt på med.
    if (s.sti && s.sti.length > 1) { const m = s.sti[s.sti.length - 1]; d.mål = [r1(m[0]), r1(m[1])]; }
    if (s.side && s.side !== 'blå') { d.side = s.side; if (s.ai) d.ai = { hva: s.ai.hva || null, tekst: String(s.ai.tekst || '') }; if (s.slattUtMeldt) d.slåttUt = true; }
    return d;
  }
  // Setter laget slik det ble lagret. Laget står stille (ordren er ikke lagret), og sikten regnes på nytt.
  function brukLag(s, d) {
    s.x = tall(d.x, s.x); s.y = tall(d.y, s.y); s.sti = null; s.steg = null; s.seg = 0; s.prog = 0; s.timerIgjen = 0; s.siktSkitten = true;
    if (Array.isArray(d.menn) && d.menn.length) s.menn = d.menn.filter(m => m && m.navn).map(m => ({ navn: String(m.navn), rolle: String(m.rolle || 'rifle'), hp: mellom(tall(m.hp, 1), 0, 1), loy: tall(m.loy, .8), ...(m.person && typeof m.person === 'object' ? { person: m.person } : {}), ...(typeof m.valgt === 'string' ? { valgt: m.valgt } : {}), ...(m.erf > 0 ? { erf: +m.erf } : {}) }));
    if (d.fraFolk) s.fraFolk = true; if (d.utstyr && typeof d.utstyr === 'object') s.utstyr = d.utstyr; if (typeof d.formasjon === 'string') s.formasjon = d.formasjon; if (d.ombord) s.ombordNavn = String(d.ombord);
    s.leder = mellom(Math.round(tall(d.leder, 0)), 0, Math.max(0, s.menn.length - 1));
    if (d.ammo !== undefined) s.ammo = mellom(tall(d.ammo, 1), 0, 1);
    if (d.radio) s.radio = d.radio; if (d.nedgravd) s.nedgravd = true;
    if (d.strid && typeof d.strid === 'object') { s.strid = d.strid; delete s.bevSatt; }
    if (Array.isArray(d.mål) && Number.isFinite(d.mål[0]) && Number.isFinite(d.mål[1])) s.målLagret = [d.mål[0], d.mål[1]]; else delete s.målLagret;
    if (d.ai && s.ai) { s.ai.hva = d.ai.hva || null; s.ai.tekst = String(d.ai.tekst || ''); s.ai.mål = null; }
    if (d.slåttUt) s.slattUtMeldt = true;
    if (d.fanger && d.fanger.n > 0) s.fanger = { n: Math.round(tall(d.fanger.n, 0)), side: String(d.fanger.side || 'rød') }; if (d.bakhold) s.bakhold = true; if (d.krig && typeof d.krig === 'object') s.krig = d.krig;
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
      vær: o.vær ? JSON.parse(JSON.stringify(o.vær)) : null, lag: (o.lag || []).map(pakkLag), kjøretøy: (o.kjøretøy || []).map(pakkKj),
      // tettstedene som har en eier: [id, eier]; infrastrukturen som ikke er hel: nøklene («bru:123»); oljen på basen (tonn)
      tettsteder: o.tettsteder ? [...o.tettsteder].filter(([, t]) => t && t.eier).map(([id, t]) => [id, t.eier]) : [],
      infra: o.infra ? [...o.infra].filter(([, t]) => t && t.tilstand && t.tilstand !== 'hel').map(([k]) => k) : [],
      olje: o.olje === undefined || o.olje === null ? null : Math.max(0, r1(tall(o.olje, 0))),
      // (18. nov) fiendens lag, det fraksjonene husker ({ side: { sist, hatt: [id], leir } }) og stillingene deres
      fiender: (o.fiender || []).map(pakkLag), minne: pakkMinne(o.minne),
      stillinger: (o.stillinger || []).filter(q => q && Number.isFinite(q.x) && Number.isFinite(q.y)).map(q => ({ x: r1(q.x), y: r1(q.y), side: q.side, kjent: !!q.kjent })) };
  }
  function pakkMinne(M) { if (!M) return null; const ut = {};
    for (const side of Object.keys(M)) { const m = M[side]; if (!m) continue; ut[side] = { leir: !!m.leir, hatt: [...(m.hatt || [])],
      sist: m.sist && Number.isFinite(m.sist.x) ? { x: r1(m.sist.x), y: r1(m.sist.y), navn: String(m.sist.navn || ''), styrke: tall(m.sist.styrke, 1), t: tall(m.sist.t, 0) } : null }; }
    return ut; }
  // Legger minnet tilbake i AI.minne (hatt er et Set der)
  function brukMinne(M, d) { if (!M || !d) return 0; let n = 0;
    for (const side of Object.keys(M)) { const q = d[side]; if (!q || typeof q !== 'object') continue; const m = M[side]; m.leir = !!q.leir; m.hatt = new Set(Array.isArray(q.hatt) ? q.hatt : []);
      m.sist = q.sist && Number.isFinite(q.sist.x) && Number.isFinite(q.sist.y) ? { x: q.sist.x, y: q.sist.y, navn: String(q.sist.navn || ''), styrke: tall(q.sist.styrke, 1), t: tall(q.sist.t, 0) } : null; n++; }
    return n; }
  // Leser lagringen. Ødelagt, ukjent versjon eller lagret for en annen leir (et annet spill) gir null.
  function fraJSON(t, leir) {
    try { const d = typeof t === 'string' ? JSON.parse(t) : t; if (!d || d.versjon !== VERSJON) return null;
      if (leir && (!d.leir || Math.round(leir.x) !== d.leir.x || Math.round(leir.y) !== d.leir.y)) return null;
      return { versjon: VERSJON, leir: d.leir || null, tid: Math.max(0, tall(d.tid, 0)), vær: d.vær && typeof d.vær === 'object' ? d.vær : null,
        lag: (Array.isArray(d.lag) ? d.lag : []).filter(q => q && q.navn && Number.isFinite(q.x) && Number.isFinite(q.y)),
        kjøretøy: (Array.isArray(d.kjøretøy) ? d.kjøretøy : []).filter(q => q && q.navn && q.type && Number.isFinite(q.x) && Number.isFinite(q.y)),
        tettsteder: (Array.isArray(d.tettsteder) ? d.tettsteder : []).filter(q => Array.isArray(q) && q[0] !== undefined && q[0] !== null && typeof q[1] === 'string' && q[1]),
        infra: (Array.isArray(d.infra) ? d.infra : []).filter(k => typeof k === 'string' && /^[a-zæøå]+:.+/.test(k)),
        olje: Number.isFinite(d.olje) && d.olje >= 0 ? d.olje : null,
        fiender: (Array.isArray(d.fiender) ? d.fiender : []).filter(q => q && q.navn && typeof q.side === 'string' && q.side !== 'blå' && Number.isFinite(q.x) && Number.isFinite(q.y)),
        minne: d.minne && typeof d.minne === 'object' ? d.minne : null,
        stillinger: (Array.isArray(d.stillinger) ? d.stillinger : []).filter(q => q && Number.isFinite(q.x) && Number.isFinite(q.y) && typeof q.side === 'string') };
    } catch (e) { return null; }
  }
  // Legger det lagrede tilbake i listene. finnes: lista (lag eller kjøretøy) som allerede står i spillet; lagNy(d) lager det som mangler
  // (enheter bygget på basen etter spillstart) og gir null når det ikke går. Like navn brukes én gang hver. Gir antallet som ble satt.
  function settTilbake(lagret, finnes, bruk, lagNy) {
    const brukt = new Set(); let n = 0;
    for (const d of lagret) { let e = finnes.find(q => q.navn === d.navn && !brukt.has(q)); if (!e && lagNy) e = lagNy(d); if (!e) continue; brukt.add(e); bruk(e, d); n++; }
    return n;
  }
  const api = { VERSJON, pakk, fraJSON, pakkLag, brukLag, pakkKj, brukKj, settTilbake, pakkMinne, brukMinne };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  rot.Lagring = api;
  if (typeof document === 'undefined' || typeof KROKER === 'undefined') return;

  // ---------- visningen: kobler lagringen på spillet ----------
  const NØKKEL = 'riksbrudd-verden';
  const spill = () => rot.OppstartSpill && OppstartSpill.tilstand();
  // et lagret spill fantes da siden ble lastet: da leses verden inn igjen ved første «riksbrudd-spill» (ikke når et nytt spill settes opp)
  let fortsetter = !!spill(), aktiv = false, sist = 0, av = false;
  const egneLag = () => ENHETER.filter(s => s.side === 'blå' && !s.ai && !s.karakter && !s.leirvakt);   // leirvakta (spill/forsvar.js) finnes bare mens angrepet varer
  const egneKj = () => (rot.KJORETOY || []).filter(k => k.side === 'blå');
  // (18. nov) fiendens lag: motstandernes AI-lag og patruljen. Røverne i et angrep og sivile vern lagres ikke.
  const fiendeLag = () => ENHETER.filter(s => s.side !== 'blå' && !s.raid && !s.leirvakt && !s.vern && !s.post && Array.isArray(s.menn));
  let lagretFiender = null;
  function brukFiender(d) {
    if (!d) return 0;
    const n = settTilbake(d.fiender, fiendeLag(), brukLag, q => { let s = null;
      if (q.ai && rot.AI && AI.nytt && AI.sider.includes(q.side)) { s = AI.nytt(q.side, q.x, q.y); s.navn = q.navn; }
      else if (!q.ai) { s = nyttLag(q.navn, q.x, q.y, q.side); ENHETER.push(s); }
      return s; });
    if (rot.AI && AI.minne) brukMinne(AI.minne, d.minne);
    if (rot.STILLINGER && d.stillinger.length) { STILLINGER.length = 0; for (const q of d.stillinger) STILLINGER.push({ x: q.x, y: q.y, side: q.side, kjent: !!q.kjent }); }
    skitten = true; return n;
  }
  // motstanderne flyttes til leiren når spillet starter (AI.flytt, spill/fraksjoner-visning.js) – det lagrede legges inn etterpå
  if (rot.AI && AI.flytt) { const flytt = AI.flytt; AI.flytt = async function (...a) { const r = await flytt.apply(this, a); if (lagretFiender) { try { brukFiender(lagretFiender); } catch (e) { console.error(e); } } return r; }; }
  // marsjordrene som var i gang: planlegg på nytt (kartet må være lastet; prøver igjen litt senere når ruta ikke finnes ennå)
  function fortsettOrdre() { for (const s of ENHETER) { if (!s.målLagret || s.side !== 'blå') continue; const m = s.målLagret; delete s.målLagret;
    if (levende(s) && Math.hypot(m[0] - s.x, m[1] - s.y) > 30) ordre(s, m[0], m[1], true).catch(() => {}); } }
  function lagre() {
    const S = spill(); if (!aktiv || av || !S || !S.leir) return false;
    try { localStorage.setItem(NØKKEL, JSON.stringify(pakk({ tid, vær: rot.VaerSpill ? VaerSpill.S : null, lag: egneLag(), kjøretøy: egneKj(), leir: S.leir,
      tettsteder: rot.TETTSTEDER || null, infra: rot.INFRA_TILSTAND || null, olje: rot.OLJE && OLJE.BASER[0] ? OLJE.BASER[0].beholdning : null,
      fiender: fiendeLag(), minne: rot.AI && AI.minne ? AI.minne : null, stillinger: rot.STILLINGER || [] }))); return true; } catch (e) { return false; }
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
    // tettstedene, den ødelagte infrastrukturen og oljen
    if (rot.TETTSTEDER) for (const [id, eier] of d.tettsteder) TETTSTEDER.set(id, { eier, inntar: null });
    if (rot.INFRA_TILSTAND) for (const k of d.infra) INFRA_TILSTAND.set(k, { tilstand: 'sprengt' });
    if (d.olje !== null && rot.OLJE && OLJE.BASER[0]) OLJE.BASER[0].beholdning = d.olje;
    // (18. nov) fiendens lag, minnet og stillingene – og egne marsjordre som var i gang
    lagretFiender = d; try { brukFiender(d); } catch (e) { console.error(e); }
    setTimeout(fortsettOrdre, 1500);
    skitten = true; return true;
  }
  // etter K1 (og etter at kontrollrommet har satt inn karakteren): les verden inn én gang, og lagre fra da av
  window.addEventListener('riksbrudd-spill', () => setTimeout(() => { if (fortsetter) { fortsetter = false; les(); } aktiv = true; lagre(); }, 0));
  // lagres hvert femte sekund mens spillet går, og når siden skjules eller lukkes
  KROKER.sim.push(() => { const nå = performance.now(); if (nå - sist < 5000) return; sist = nå; lagre(); });
  window.addEventListener('pagehide', lagre);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') lagre(); });
  rot.LagringSpill = { NØKKEL, lagre, les, brukFiender, fortsettOrdre, fiendeLag, av(v = true) { av = v; }, aktiv: () => aktiv && !av };
})(typeof globalThis !== 'undefined' ? globalThis : this);
