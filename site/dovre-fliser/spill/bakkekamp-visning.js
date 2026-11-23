/* Riksbrudd – KAMP PÅ BAKKEN (W2, 22. nov, R17-3): visningen. Reglene står i spill/bakkekamp.js (Bakkekamp).
 * Gjelder når du går selv i 3D:
 *  - DEKNING: hindringene rundt deg (husveggene og trærne i R3.hindre, parkerte biler u.hus.biler, kjøretøy i KJORETOY og steinene
 *    u.smått.stein) leses inn hvert 0,3 s. kampSteg i spillet-visning.js ganger skaden fra hver fiende med BakkekampSpill.dekning(d, e, f);
 *    eventyr-visning.js bruker da ikke sin egen «vegg» (den ville telt to ganger). «I dekning (vegg)» står i helseruta (narhud).
 *  - SIKTEKIKKERT: høyre museknapp (holdes) på PC, knappen «Sikt» på telefon. gange.js spør BakkekampSpill.fov() og følsomhet(),
 *    skyt() i spillet-visning.js ganger treffsjansen med BakkekampSpill.treff(avst). Våpen med kikkert får en svart ring rundt bildet.
 *  - GRANATER: ny ting i sekken (Utstyr.TING.granat; kjøpes i Leir-menyen). G på PC, knappen «Granat» på telefon. Buen regnes i
 *    Bakkekamp.Granat, eksplosjonen med Effekter3d (spill/effekter3d.js), skaden på alle lag innen radiusen – også dine egne – og deg.
 *  - LAGKAMERATER: J (eller knappen «Lag») åpner en liten meny: velg lag i nærheten og gi «Følg meg», «Hold her» eller «Angrip dit».
 *    Ordrene går gjennom KOMMANDO (spill/kommando-visning.js); lagene skyter etter de vanlige kampreglene.
 *  - TREFFMARKØR OG SKADEINDIKATOR: kort kryss midt i bildet når du treffer (rødt når en mann faller), rød bue på skjermkanten mot
 *    den som skyter på deg.
 * I testene (navigator.webdriver) får du ingen granater av deg selv (BakkekampSpill.test = true slår det på). Tall: Claudes forslag.
 */
(function (rot) {
  'use strict';
  const B = rot.Bakkekamp; if (!B) return;
  const { REGLER, Dekning, Kikkert, Granat, Følge, Indikator, Lagkamp, Undertrykk, Fiende3d } = B;
  const api = { test: false }, auto = () => !navigator.webdriver || api.test;
  const tilfV = (typeof Tilfeldig !== 'undefined' && Tilfeldig.verden) || Math.random;
  const r3 = () => (typeof R3 !== 'undefined' ? R3 : null);
  const går = () => { const Q = r3(); return !!(Q && Q.fot && Q.ut && typeof på3d !== 'undefined' && på3d); };
  const fører = () => !!(rot.KjorSpill && KjorSpill.fører && KjorSpill.fører());
  const deg = () => { const Q = r3(); return Q && Q.fot && Q.ut ? { x: Q.ut.cx + Q.bane.x, y: Q.ut.cy + Q.bane.y } : null; };
  const K = () => (rot.SpilletSpill && SpilletSpill.K ? SpilletSpill.K() : null);
  const U = () => (rot.UtstyrSpill && UtstyrSpill.klar && UtstyrSpill.klar() ? UtstyrSpill : null);
  const våpenId = () => { const u = U(); return u ? u.aktivt().v.id : 'gevær'; };
  const smal = () => (typeof VW !== 'undefined' ? VW : innerWidth) < 900;
  const sek = () => performance.now() / 1000;

  // ---------- granaten i sekken ----------
  // Granatene henger i et eget granatbelte (høyst REGLER.granat.belte), ikke i lommene: del = true holder dem utenfor sekkens vanlige kjøp
  // (lommene er fulle uten sekk på ryggen), og kjøpet står for seg i Leir-menyen nedenfor. Vekta telles med som alt annet.
  if (rot.Utstyr && Utstyr.TING && !Utstyr.TING.granat) { const G = REGLER.granat; Utstyr.TING.granat = { navn: 'Håndgranat', enhet: 'stk.', vekt: G.vekt, pris: G.pris, pakke: G.pakke, del: true }; }
  function leggBelte(n) { const u = U(); if (!u) return 0; const I = u.tilstand(), har = I.ting.granat || 0, t = Math.max(0, Math.min(n, REGLER.granat.belte - har)); if (t) { I.ting.granat = har + t; u.lagre(); u.vis(); } return t; }
  api.leggBelte = leggBelte;
  (rot.LEIR_MENY = rot.LEIR_MENY || []).push((hode, { el: e, knapp: kn }) => { if (!U()) return; const G = REGLER.granat, har = antallGranater(), kr = v => (rot.Leir ? Leir.kroner(v) : v + ' kr');
    hode.append(e('h3', { 'data-fane': 'lager' }, 'Håndgranater'), e('div', { klasse: 'utstyr' }, e('div', {}, e('b', {}, 'Håndgranat'), e('small', {}, `Kastes med G (knappen «Granat» på telefon) når du går selv. Granatbeltet: ${har} av ${G.belte}.`)),
      kn(`Kjøp ${G.pakke} · ${kr(G.pris * G.pakke)}`, () => { const n = Math.min(G.pakke, G.belte - antallGranater()); if (!n) return logg(`Granatbeltet er fullt (${G.belte}).`); if (!OppstartSpill.betal(G.pris * n)) return logg(`Ikke nok penger (${kr(G.pris * n)}).`); leggBelte(n); logg(`${n} håndgranater kjøpt.`); if (rot.LeirSpill && LeirSpill.visMeny) LeirSpill.visMeny(); }))); });
  // nye leirer får to granater én gang (husket per leir i «riksbrudd-bakkekamp»)
  function gi() { const u = U(), S = rot.OppstartSpill && OppstartSpill.tilstand(); if (!u || !S || !S.leir || !auto()) return; const id = Math.round(S.leir.x) + ',' + Math.round(S.leir.y);
    let d = null; try { d = JSON.parse(localStorage.getItem('riksbrudd-bakkekamp') || 'null'); } catch (e) { /* skadet */ } if (d && d.leir === id && d.gitt) return;
    leggBelte(REGLER.granat.startAntall); try { localStorage.setItem('riksbrudd-bakkekamp', JSON.stringify({ leir: id, gitt: true })); } catch (e) { /* fullt */ } }
  rot.addEventListener('riksbrudd-spill', () => setTimeout(gi, 500));
  const antallGranater = () => { const u = U(); return u ? u.tilstand().ting.granat || 0 : 0; };

  // ---------- dekning ----------
  let hindre = [], hindreTid = 0, sistDekning = null, kandidater = [];
  // hindringene innen 12 m av deg, i koordinater der du står i (0, 0)
  function lesHindre() { const Q = r3(), d = deg(); hindre = []; if (!Q || !Q.ut || !d) return; const u = Q.ut, lx = d.x - u.cx, ly = d.y - u.cy, N = 12, D = REGLER.dekning;
    const nær = (x, y) => Math.abs(x - lx) < N && Math.abs(y - ly) < N;
    if (Q.hindre) { const sett = new Set(); for (let a = Math.floor((lx - N) / 20); a <= Math.floor((lx + N) / 20); a++) for (let c = Math.floor((ly - N) / 20); c <= Math.floor((ly + N) / 20); c++) for (const o of Q.hindre.get(a + ',' + c) || []) {
      if (sett.has(o)) continue; sett.add(o);
      if (o.P) { const b = o.bb; if (b && (b[0] > lx + N || b[2] < lx - N || b[1] > ly + N || b[3] < ly - N)) continue; hindre.push({ type: 'hus', P: o.P.map(p => [p[0] - lx, p[1] - ly]) }); }
      else if (nær(o.x, o.y)) hindre.push({ type: 'tre', x: o.x - lx, y: o.y - ly, r: D.treR }); } }
    const b = u.hus && u.hus.biler; if (b) for (let k = 0; k + 4 < b.length; k += 5) if (nær(b[k], b[k + 1])) hindre.push({ type: 'bil', x: b[k] - lx, y: b[k + 1] - ly, r: D.bilR });
    const st = u.smått && u.smått.stein; if (st) for (let k = 0; k + 4 < st.length; k += 5) if (nær(st[k], st[k + 1])) hindre.push({ type: 'stein', x: st[k] - lx, y: st[k + 1] - ly, r: D.steinR });
    if (typeof KJORETOY !== 'undefined') for (const kj of KJORETOY) if (kj && Number.isFinite(kj.x) && Math.hypot(kj.x - d.x, kj.y - d.y) < N) hindre.push({ type: 'bil', x: kj.x - d.x, y: kj.y - d.y, r: D.bilR });
    hindreTid = sek(); }
  const inne = () => { const Q = r3(); return !!(rot.Interior3d && Interior3d.inne && Q && Q.bane && Interior3d.inne(Q.bane.x, Q.bane.y)); };
  const stilling = () => (rot.Gange && Gange.stilling ? Gange.stilling() : 'stå');
  // dekningen mot én fiende (faktor på skaden); f = faktoren fra sniking (0 = de har ikke sett deg). Huskes for skadeindikatoren.
  function dekningMot(d, e) { if (!går() || fører() || inne() || !d || !e) return null; if (sek() - hindreTid > .3) lesHindre(); return Dekning.finn(e.x - d.x, e.y - d.y, Dekning.prøver(hindre), stilling()); }
  api.dekning = (d, e, f = 1) => { const r = dekningMot(d, e), fak = r ? r.faktor : 1; if (f > 0 && d && e && Math.hypot(e.x - d.x, e.y - d.y) < 300) kandidater.push({ x: e.x, y: e.y, w: f * fak }); return fak; };

  // ---------- siktekikkert ----------
  let sikter = false;
  const kanSikte = () => går() && !fører() && !(rot.MoblerSpill && MoblerSpill.hender());
  api.sikter = () => sikter && kanSikte();
  api.kikkertPå = () => api.sikter() && !!Kikkert.def(våpenId());
  api.fov = basis => Kikkert.fov(basis, våpenId(), api.sikter());
  api.følsomhet = () => Kikkert.følsomhet(våpenId(), api.sikter());
  api.treff = avst => { const u = U(); const V = u ? u.aktivt().def : null; return Kikkert.treff(våpenId(), avst, V ? V.rekkevidde : 350, api.sikter()); };
  api.sikt = v => { sikter = !!v && kanSikte(); siktKnapp.classList.toggle('aktiv', sikter); ring.classList.toggle('på', api.kikkertPå()); };
  const c3 = () => document.getElementById('c3');
  rot.addEventListener('pointerdown', e => { if (e.button === 2 && e.pointerType === 'mouse' && går() && e.target === c3()) { api.sikt(true); e.preventDefault(); } }, true);
  rot.addEventListener('pointerup', e => { if (e.button === 2 && sikter) api.sikt(false); }, true);
  rot.addEventListener('mouseup', e => { if (e.button === 2 && sikter) api.sikt(false); }, true);
  rot.addEventListener('contextmenu', e => { if (går() && (e.target === c3() || document.pointerLockElement)) e.preventDefault(); }, true);
  rot.addEventListener('blur', () => api.sikt(false));

  // ---------- knapper på telefon og menyen for lagkameratene ----------
  const el = (tag, eg = {}, ...barn) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(eg)) { if (k === 'klasse') e.className = v; else e.setAttribute(k, v); } e.append(...barn); return e; };
  const css = document.createElement('style');
  css.textContent = `.bkknapp{ position:fixed; z-index:5; display:none; width:58px; height:58px; border-radius:50%; border:2px solid rgba(231,220,195,.6); background:rgba(20,16,10,.55); color:#f0e2b0; font:600 12px sans-serif; touch-action:none; padding:0; }
.bkknapp.på{ display:block; } .bkknapp.aktiv{ background:rgba(201,178,106,.55); color:#1c170f; } .bkknapp small{ display:block; font-size:10px; opacity:.85; }
#siktknapp{ right:160px; bottom:calc(132px + env(safe-area-inset-bottom,0px)); } #granatknapp{ right:160px; bottom:calc(198px + env(safe-area-inset-bottom,0px)); } #lagkamknapp{ right:160px; bottom:calc(264px + env(safe-area-inset-bottom,0px)); }
body.kort #siktknapp{ right:calc(152px + env(safe-area-inset-right,0px)); bottom:calc(140px + env(safe-area-inset-bottom,0px)); } body.kort #granatknapp{ right:calc(12px + env(safe-area-inset-right,0px)); bottom:calc(206px + env(safe-area-inset-bottom,0px)); } body.kort #lagkamknapp{ right:calc(12px + env(safe-area-inset-right,0px)); bottom:calc(140px + env(safe-area-inset-bottom,0px)); }
@media (orientation: landscape){ body.kort #siktknapp{ right:calc(82px + env(safe-area-inset-right,0px)); bottom:calc(206px + env(safe-area-inset-bottom,0px)); } }
#lagkam{ position:fixed; left:50%; transform:translateX(-50%); bottom:calc(168px + env(safe-area-inset-bottom,0px)); z-index:12; display:none; width:min(360px,92vw); padding:8px 10px; background:rgba(28,23,15,.94); border:1px solid #c9b26a; color:#e7dcc3; font-size:14px; }
#lagkam.på{ display:block; } #lagkam h3{ margin:0 0 4px; font-size:14px; letter-spacing:.05em; text-transform:uppercase; color:#c9b26a; } #lagkam .lag{ display:flex; flex-wrap:wrap; gap:5px; margin:4px 0 8px; }
#lagkam button{ background:#2a2318; border:1px solid #4a4030; color:#e7dcc3; min-height:36px; padding:3px 10px; font:inherit; cursor:pointer; } #lagkam .lag button.valgt{ border-color:#c9b26a; background:#4a3d22; }
#lagkam .ordre{ display:flex; gap:6px; } #lagkam .ordre button{ flex:1; font-weight:600; } #lagkam small{ display:block; color:#a99; margin-top:6px; }
#kikkertring{ position:fixed; inset:0; z-index:1; pointer-events:none; display:none; background:radial-gradient(circle closest-side at 50% 50%, transparent 0 87%, rgba(0,0,0,.55) 88%, rgba(0,0,0,.96) 90%); } #kikkertring.på{ display:block; } body.foto #kikkertring{ display:none !important; }
#nhud .dekn{ margin-top:4px; font-size:12.5px; color:#cfe3a8; letter-spacing:.03em; } #nhud .dekn:empty{ display:none; }`;
  document.head.appendChild(css);
  const siktKnapp = el('button', { id: 'siktknapp', klasse: 'bkknapp', type: 'button', title: 'Sikt (høyre museknapp)' }, 'Sikt');
  const granatKnapp = el('button', { id: 'granatknapp', klasse: 'bkknapp', type: 'button', title: 'Kast en granat (G)' }, 'Granat');
  const lagKnapp = el('button', { id: 'lagkamknapp', klasse: 'bkknapp', type: 'button', title: 'Lagkamerater (J)' }, 'Lag');
  const meny = el('div', { id: 'lagkam', role: 'dialog', 'aria-label': 'Lagkamerater' });
  const ring = el('div', { id: 'kikkertring' });
  document.body.append(siktKnapp, granatKnapp, lagKnapp, meny, ring);
  for (const b of [siktKnapp, granatKnapp, lagKnapp, meny]) b.addEventListener('pointerdown', e => e.stopPropagation());
  siktKnapp.addEventListener('pointerdown', e => { e.preventDefault(); api.sikt(!sikter); });
  granatKnapp.addEventListener('pointerdown', e => { e.preventDefault(); api.kast(); });
  lagKnapp.addEventListener('pointerdown', e => { e.preventDefault(); api.meny(!menyÅpen); });

  // ---------- granater ----------
  const flyr = []; let sistKast = 0, granatGeo = null, granatMat = null;
  api.kast = () => {
    const Q = r3(); if (!går() || fører() || (rot.MoblerSpill && MoblerSpill.hender())) return false;
    if (sek() - sistKast < REGLER.granat.ventMellom) return false;
    const u = U(); if (!u || !antallGranater()) { if (typeof logg === 'function') logg('Du har ingen granater. Kjøp dem i Leir-menyen (fanen Lager).'); return false; }
    u.tilstand().ting.granat -= 1; if (!u.tilstand().ting.granat) delete u.tilstand().ting.granat; if (u.lagre) u.lagre(); sistKast = sek();
    const p = Q.cam.position, g = Granat.kast(p.x, p.y, p.z - .15, Q.fot.a, Q.fot.pitch || 0);
    if (typeof THREE !== 'undefined' && Q.scene) { granatGeo = granatGeo || new THREE.SphereGeometry(.09, 8, 6); granatMat = granatMat || new THREE.MeshLambertMaterial({ color: 0x3b4a2a });
      g.mesh = new THREE.Mesh(granatGeo, granatMat); g.mesh.position.set(g.x, g.y, g.z); Q.scene.add(g.mesh); }
    g.ut = Q.ut; flyr.push(g); if (rot.EventyrSpill && EventyrSpill.skudd) EventyrSpill.skudd({}); return true; };
  // bakkens høyde i scenen (lokale meter; scenens z = (moh. − utsnittets h0) × EX)
  function bakke(x, y) { const Q = r3(); if (!Q || !Q.ut || typeof hoyde3d !== 'function') return 0; const v = hoyde3d(x + Q.ut.cx, y + Q.ut.cy); return Number.isFinite(v) ? (v - (Q.ut.h0 || 0)) * (Q.EX || 1) : 0; }
  function smell(g) { const Q = r3(), u = g.ut, X = g.x + u.cx, Y = g.y + u.cy, G = REGLER.granat; let rammet = 0, falt = 0;
    try { if (rot.Effekter3d) { Effekter3d.eksplosjon(X, Y, 5); if (Effekter3d.krater) Effekter3d.krater(X, Y, 1.4, true); } } catch (e) { /* effekten er ikke viktig */ }
    // laget som kastet granaten (g.fra), kaster den bort fra seg og rammes ikke
    if (typeof ENHETER !== 'undefined') for (const s of ENHETER) { if (!s || s.karakter || !s.menn || !levende(s) || s === g.fra) continue; const d = Math.hypot(s.x - X, s.y - Y); if (d > G.radius + 4) continue;
      const før = s.menn.filter(m => m.hp > 0).length, n = Granat.rammLag(s.menn, d, tilfV, 6), etter = s.menn.filter(m => m.hp > 0).length; rammet += n; falt += før - etter;
      if (n && s.side !== 'blå' && !g.fiende) { const k = K(); if (k) k.treff = performance.now(); if (før > etter) drapTid = sek(); if (rot.EventyrSpill && EventyrSpill.felt) for (let i = 0; i < før - etter; i++) EventyrSpill.felt(); }
      if (n && typeof logg === 'function') logg(`Granaten rammet ${n} mann i ${s.navn}${levende(s) ? '' : ' – laget er slått ut'}.`); }
    const d = deg(), k = K(); if (d && k) { const dd = Math.hypot(d.x - X, d.y - Y), dek = granatDekning(d, X, Y, dd), s0 = Math.round(Granat.skadeDeg(dd) * dek.faktor); smellLyd(dd);
      // helsa går aldri under 5 av en granat; meldingen sier det du faktisk mistet
      const hpFør = k.hp, s = s0 > 0 ? Math.round(hpFør - Math.max(5, hpFør - s0)) : 0;
      if (s0 > 0) { k.hp = Math.max(5, k.hp - s0); k.skadd = performance.now(); Indikator.legg(buer, Math.atan2(Y - d.y, X - d.x), 1, sek()); if (typeof logg === 'function') logg(`Du ble skadet av granaten${g.fra ? ' fra ' + g.fra.navn : ''} (−${s} helse)${dek.type ? ' – ' + (Dekning.REGLER_NAVN(dek.type)) + ' tok av for det verste' : ''}.`); }
      else if (g.fiende && dd < REGLER.granat.radius + 6 && dek.type && typeof logg === 'function') logg(`Granaten gikk av ${Math.round(dd)} m unna – ${Dekning.REGLER_NAVN(dek.type)} tok trykket.`); }
    if (typeof skitten !== 'undefined') skitten = true; return { rammet, falt }; }
  api.smell = (X, Y) => { const Q = r3(); if (!Q || !Q.ut) return null; return smell({ x: X - Q.ut.cx, y: Y - Q.ut.cy, ut: Q.ut }); };
  function stegGranater(dt) { const Q = r3();
    for (let i = flyr.length - 1; i >= 0; i--) { const g = flyr[i];
      if (!Q || Q.ut !== g.ut) { if (g.mesh && g.mesh.parent) g.mesh.parent.remove(g.mesh); flyr.splice(i, 1); continue; }
      const ferdig = Granat.steg(g, dt, bakke); if (g.mesh) g.mesh.position.set(g.x, g.y, g.z);
      if (ferdig) { if (g.mesh && g.mesh.parent) g.mesh.parent.remove(g.mesh); flyr.splice(i, 1); smell(g); } } }

  // ---------- lagkamerater ----------
  let menyÅpen = false, valgte = new Set(), menyNøkkel = '';
  const følger = new Map();   // lag -> sekunder for siste ordre
  const nid = s => (rot.KOMMANDO && KOMMANDO.nid ? KOMMANDO.nid(s) : null);
  function send(s, type, x, y) { if (rot.KOMMANDO) { const r = KOMMANDO({ type, lag: nid(s), x, y, stille: type === 'ordre' && følger.has(s) }); return r && r.ok !== false; }
    if (type === 'stopp') { s.sti = null; return true; } if (typeof ordre === 'function') { ordre(s, x, y, true); return true; } return false; }
  const kandidater2 = () => { const d = deg(); return d && typeof ENHETER !== 'undefined' ? Følge.kandidater(ENHETER, 'blå', d.x, d.y).slice(0, 4) : []; };
  function blikkAvstand() { const Q = r3(), d = deg(); if (!Q || !d) return 150; const a = Q.fot.a, p = Q.fot.pitch || 0, z0 = Q.cam.position.z;
    for (let s = 5; s <= REGLER.følge.angrepMaks; s += 5) { const h = Math.cos(p) * s, x = Q.bane.x - Math.sin(a) * h, y = Q.bane.y + Math.cos(a) * h; if (z0 + Math.sin(p) * s <= bakke(x, y)) return s; } return REGLER.følge.angrepMaks; }
  api.gi = (hva, lag) => { const d = deg(), Q = r3(); if (!d || !Q) return 0; const liste = lag || kandidater2().filter(s => valgte.has(s)); let n = 0;
    for (const s of liste) { if (hva === 'følg') { følger.set(s, -99); n++; }
      else if (hva === 'hold') { følger.delete(s); if (send(s, 'stopp')) n++; }
      else if (hva === 'angrip') { følger.delete(s); const m = Følge.angrepMål(d.x, d.y, Q.fot.a, blikkAvstand()); if (send(s, 'ordre', m.x, m.y)) n++; } }
    if (n && typeof logg === 'function') logg(`${liste.map(s => s.navn).join(', ')}: ${hva === 'følg' ? 'følger deg' : hva === 'hold' ? 'holder her' : 'angriper dit du ser'}.`);
    if (hva === 'følg') følgSteg(true); api.meny(false); return n; };
  // går du ikke lenger (i 3 s – gåmodus kan blinke av og på når utsnittet byttes), holder lagene stillingen
  let ikkeGått = 0;
  function følgSteg(straks) { const d = deg(), Q = r3(); if (!følger.size) return; if (!d || !Q || !går()) { if (!ikkeGått) ikkeGått = sek(); if (sek() - ikkeGått > 3) { ikkeGått = 0; for (const s of følger.keys()) send(s, 'stopp'); if (typeof logg === 'function') logg('Lagene som fulgte deg, holder stillingen.'); følger.clear(); } return; }
    ikkeGått = 0; let nr = 0; for (const [s, t] of følger) { if (!levende(s)) { følger.delete(s); continue; } const m = Følge.mål(d.x, d.y, Q.fot.a, nr++); if (straks || Følge.nyOrdre(s, m, sek() - t)) { følger.set(s, sek()); send(s, 'ordre', m.x, m.y); } } }
  api.meny = v => { menyÅpen = !!v && går(); meny.classList.toggle('på', menyÅpen); lagKnapp.classList.toggle('aktiv', menyÅpen); menyNøkkel = ''; if (menyÅpen) { const k = kandidater2(); if (!k.some(s => valgte.has(s))) valgte = new Set(k.slice(0, 1)); visMeny(); } };
  function visMeny() { if (!menyÅpen) return; const k = kandidater2(), nøkkel = k.map(s => s.navn + (valgte.has(s) ? '*' : '') + (følger.has(s) ? 'f' : '')).join('|'); if (nøkkel === menyNøkkel || (rot.pekerNede && pekerNede(meny))) return; menyNøkkel = nøkkel; meny.innerHTML = '';
    const knapp = (t, f, kl) => { const b = el('button', { type: 'button', klasse: kl || '' }, t); b.onclick = f; return b; };
    meny.append(el('h3', {}, 'Lagkamerater'));
    if (!k.length) { meny.append(el('small', {}, `Ingen egne lag innen ${REGLER.følge.nær} m.`), knapp('Lukk', () => api.meny(false))); return; }
    meny.append(el('div', { klasse: 'lag' }, ...k.map(s => { const d = deg(), a = d ? Math.round(Math.hypot(s.x - d.x, s.y - d.y)) : 0; return knapp(`${s.navn} · ${a} m${følger.has(s) ? ' · følger' : ''}`, () => { if (valgte.has(s)) valgte.delete(s); else valgte.add(s); menyNøkkel = ''; visMeny(); }, valgte.has(s) ? 'valgt' : ''); })));
    meny.append(el('div', { klasse: 'ordre' }, ...Følge.ORDRE.map(([id, t], i) => knapp(`${i + 1}. ${t}`, () => api.gi(id)))));
    meny.append(el('small', {}, smal() ? 'Velg lag, så en ordre. «Angrip dit» går dit du ser.' : 'Velg lag, så 1–3. «Angrip dit» går dit du ser. J eller Esc lukker.')); }

  // ---------- taster ----------
  // G kaster en granat og J åpner lagmenyen når du går (G går ellers ut av gåmodus – se spill/taster.js; Esc og «Gå» gjør fortsatt det)
  rot.addEventListener('keydown', e => { if (!går() || e.ctrlKey || e.metaKey || e.altKey) return; const t = e.target, tg = t && t.tagName; if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT') return; const k = e.key.toLowerCase();
    if (k === 'g' && !fører()) { if (!e.repeat) api.kast(); e.preventDefault(); e.stopImmediatePropagation(); }
    else if (k === 'j' && !e.repeat) { api.meny(!menyÅpen); e.preventDefault(); e.stopImmediatePropagation(); }
    else if (menyÅpen && /^[1-3]$/.test(k)) { api.gi(Følge.ORDRE[+k - 1][0]); e.preventDefault(); e.stopImmediatePropagation(); }
    else if (menyÅpen && k === 'escape') { api.meny(false); e.preventDefault(); e.stopImmediatePropagation(); } }, true);

  // ---------- treffmarkør, skadeindikator og dekningen i helseruta ----------
  const buer = []; let sistTreff = 0, treffTid = -9, drapTid = -9, sistSkadd = 0, døde = 0;
  const dødeNå = () => (typeof ENHETER === 'undefined' ? 0 : ENHETER.reduce((n, s) => n + (s.side !== 'blå' && s.menn ? s.menn.filter(m => !(m.hp > 0)).length : 0), 0));
  function markørSteg() { const k = K(); if (!k) return; const nå = sek();
    if (k.treff && k.treff !== sistTreff) { sistTreff = k.treff; treffTid = nå; const n = dødeNå(); if (n > døde) drapTid = nå; døde = n; } else if (nå - treffTid > 1) døde = dødeNå();
    if (k.skadd && k.skadd !== sistSkadd) { sistSkadd = k.skadd; const d = deg(), tot = kandidater.reduce((s, q) => s + q.w, 0) || 1; if (d) for (const q of kandidater) if (q.w > 0) Indikator.legg(buer, Math.atan2(q.y - d.y, q.x - d.x), Math.min(1, .35 + q.w / tot), nå); }
    kandidater = []; }
  let dekEl = null;
  function dekningTekst() { if (!dekEl) { const h = document.querySelector('#nhud .helse'); if (!h) return; dekEl = el('div', { klasse: 'dekn' }); h.appendChild(dekEl); }
    let t = ''; const d = deg();
    if (går() && d && typeof ENHETER !== 'undefined') { let best = null, bd = 300; for (const e of ENHETER) if (e.side !== 'blå' && levende(e)) { const a = Math.hypot(e.x - d.x, e.y - d.y); if (a < bd && (typeof synlig !== 'function' || synlig(e))) { bd = a; best = e; } }
      sistDekning = best ? dekningMot(d, best) : null; t = Dekning.tekst(sistDekning); }
    const n = antallGranater(); if (går() && n) t += (t ? ' · ' : '') + `${n} granat${n === 1 ? '' : 'er'}${smal() ? '' : ' (G)'}`;
    if (dekEl.textContent !== t) dekEl.textContent = t; }
  KROKER.tegn3d.push(g => { if (!går()) return; const nå = sek(), W = typeof VW !== 'undefined' ? VW : innerWidth, H = typeof VH !== 'undefined' ? VH : innerHeight, cx = W / 2, cy = H / 2, Q = r3();
    // kikkerten: trådkorset (den svarte ringen er #kikkertring, et eget lag under knappene – lerretet er klippet rundt skjermrutene)
    if (api.kikkertPå()) { const r = Math.min(W, H) * .44; g.save();
      g.strokeStyle = 'rgba(0,0,0,.85)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx - r, cy); g.lineTo(cx - 6, cy); g.moveTo(cx + 6, cy); g.lineTo(cx + r, cy); g.moveTo(cx, cy - r); g.lineTo(cx, cy - 6); g.moveTo(cx, cy + 6); g.lineTo(cx, cy + r); g.stroke();
      for (let i = 1; i <= 4; i++) { g.beginPath(); g.moveTo(cx - 4, cy + i * r / 8); g.lineTo(cx + 4, cy + i * r / 8); g.stroke(); } g.restore(); }
    // treffmarkøren
    const drept = nå - drapTid < REGLER.markør.drept, al = Indikator.markør(nå - (drept ? drapTid : treffTid), drept);
    if (al > 0) { const s = drept ? 11 : 8, i0 = 5; g.save(); g.globalAlpha = al; g.strokeStyle = drept ? '#ff5a46' : '#ffffff'; g.lineWidth = drept ? 3 : 2.2; g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 3; g.beginPath();
      for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { g.moveTo(cx + sx * i0, cy + sy * i0); g.lineTo(cx + sx * (i0 + s), cy + sy * (i0 + s)); } g.stroke(); g.restore(); }
    // skadeindikatoren: røde buer på kanten mot skytterne
    const d = deg(), A = Indikator.aktive(buer, nå); if (A.length && d && Q) { const r = Math.min(W, H) * .36; g.save(); g.lineCap = 'round';
      for (const b of A) { const th = Indikator.vinkel(Math.cos(b.v), Math.sin(b.v), Q.fot.a), m = th - Math.PI / 2; g.strokeStyle = `rgba(215,38,28,${(b.alfa * .85).toFixed(3)})`; g.lineWidth = 9; g.beginPath(); g.arc(cx, cy, r, m - .28, m + .28); g.stroke(); }
      g.restore(); }
  });
  // granatene har sin egen klokke (3D tegner bare fire bilder i sekundet når ingenting rører seg – sistAktiv holder tegningen i gang mens den flyr), i små steg
  setInterval(() => { const nå = sek(), dt = Math.min(1, Math.max(0, nå - (api._sist || nå))); api._sist = nå; if (!flyr.length) return; for (let t = dt; t > 1e-6; t -= 1 / 30) stegGranater(Math.min(1 / 30, t)); if (typeof sistAktiv !== 'undefined') sistAktiv = performance.now(); }, 33);
  setInterval(() => { const g = går(), vis = g && smal() && !fører(); siktKnapp.classList.toggle('på', vis); granatKnapp.classList.toggle('på', vis && antallGranater() > 0); lagKnapp.classList.toggle('på', g && smal());
    granatKnapp.innerHTML = ''; granatKnapp.append('Granat', el('small', {}, String(antallGranater())));
    if (!kanSikte() && sikter) api.sikt(false); ring.classList.toggle('på', api.kikkertPå()); if (!g && menyÅpen) api.meny(false); markørSteg(); dekningTekst(); visMeny(); }, 100);
  setInterval(() => følgSteg(false), 1000);
  // ---------- R18-C: dekning mot granater, granater i lagkampen, maskingevær og fiendens granater ----------
  // Dekning mot en granat gjelder bare når veggen (bilen, steinen) står MELLOM deg og granaten – hele veien, ikke bare de første metrene.
  // Inne i et hus tar veggene av for en granat som går av ute (og omvendt).
  Dekning.REGLER_NAVN = t => REGLER.dekning.navn[t] || t;
  function granatDekning(d, X, Y, dd) { if (inne()) return dd > 2 ? { faktor: Dekning.typeFaktor('hus', 'stå'), type: 'hus' } : { faktor: 1, type: null };
    if (!går() || fører()) return { faktor: 1, type: null }; lesHindre(); const r = Dekning.finn(X - d.x, Y - d.y, Dekning.prøver(hindre), stilling(), dd); return r ? { faktor: r.faktor, type: r.type } : { faktor: 1, type: null }; }
  api.granatDekning = (X, Y) => { const d = deg(); return d ? granatDekning(d, X, Y, Math.hypot(X - d.x, Y - d.y)) : null; };
  // smellet: lavt drønn med et skarpt knall først, svakere langt unna (egen lydkilde, som skuddene i spillet-visning.js)
  let lydK = null;
  function smellLyd(dd) { try { if (localStorage.getItem('riksbrudd-lyd') === 'av' || navigator.webdriver) return; lydK = lydK || new (rot.AudioContext || rot.webkitAudioContext)(); const ac = lydK, n = Math.floor(ac.sampleRate * 1.4), b = ac.createBuffer(1, n, ac.sampleRate), q = b.getChannelData(0);
    // støyen her er bare lyd (utseende), ikke en spillregel
    for (let i = 0; i < n; i++) q[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.4);
    const kilde = ac.createBufferSource(), lp = ac.createBiquadFilter(), gn = ac.createGain(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(2400, ac.currentTime); lp.frequency.exponentialRampToValueAtTime(120, ac.currentTime + 1.2);
    gn.gain.value = Math.max(.05, Math.min(.7, 9 / Math.max(6, dd))); kilde.buffer = b; kilde.connect(lp).connect(gn).connect(ac.destination); kilde.start(); } catch (e) { /* ingen lyd */ } }

  const nåTid = () => (typeof tid !== 'undefined' ? tid : 0);
  const synligLag = s => (typeof synlig === 'function' ? synlig(s) : true);
  const blink = [];   // { X, Y, t } – kort blink i kartet der en granat gikk av i lagkampen
  if (typeof KROKER !== 'undefined') {
    // etter hver salve i kamprunden (spill/simulering.js): maskingeværene holder målet nede, og på kort hold brukes granatene
    (KROKER.salve = KROKER.salve || []).push((a, b, d, f, rng, t) => { if (!auto()) return 0;
      for (const s of [a, b]) if (!s.strid && rot.StridSpill && StridSpill.regel) try { StridSpill.regel(s); } catch (e) { /* uten stridsregler */ }
      Undertrykk.salve(a, b, d, t);
      const r = Lagkamp.runde(a, b, d, f, rng); if (!r.kastet) return 0;
      const vis = a.side === 'blå' || b.side === 'blå' || synligLag(a) || synligLag(b);
      if (vis) { blink.push({ X: b.x, Y: b.y, t: performance.now(), n: r.kastet }); if (blink.length > 24) blink.shift(); if (typeof skitten !== 'undefined') skitten = true; }
      if (typeof logg === 'function') { const gr = r.kastet === 1 ? 'en granat' : r.kastet + ' granater', tr = r.treff ? ` – ${r.treff} treff` : ' – bom';
        if (a.side === 'blå') logg(`${a.navn} kaster ${gr} mot ${synligLag(b) ? b.navn : 'fienden'} (${Math.round(d)} m)${tr}.${a.granater ? '' : ' Tom for granater.'}`);
        else if (b.side === 'blå') logg(`${synligLag(a) ? a.navn : 'Fienden'} kaster ${gr} mot ${b.navn} (${Math.round(d)} m)${tr}.`); }
      return r.treff; });
    // undertrykt: treffer dårligere og går saktere en stund
    KROKER.ild.push(a => (auto() ? Undertrykk.ild(a, nåTid()) : 1));
    (KROKER.fart = KROKER.fart || []).push(s => (auto() ? Undertrykk.fart(s, nåTid()) : 1));
    // granatene fylles når laget får ammunisjon (forsyning fra base, leir eller tettsted – spill/forsyning.js hever s.ammo)
    KROKER.sim.push(api.fyllSteg = () => { if (typeof ENHETER === 'undefined') return; for (const s of ENHETER) { if (!s || s.karakter) continue; const am = s.ammo === undefined ? 1 : s.ammo;
      if (s.grAmmo !== undefined && am > s.grAmmo + 1e-3 && Number.isFinite(s.granater) && s.granater < Lagkamp.start(s)) { Lagkamp.fyll(s); if (s.side === 'blå' && typeof logg === 'function') logg(`${s.navn} har fått nye granater (${s.granater}).`); }
      s.grAmmo = am; } });
    KROKER.lagTekst.push(s => { if (!s || s.karakter || !s.menn) return null; const t = []; if (s.side === 'blå' || Number.isFinite(s.granater)) { const n = Lagkamp.antall(s); if (s.side === 'blå') t.push(n ? `${n} granat${n === 1 ? '' : 'er'}` : 'ingen granater'); }
      const u = Undertrykk.tekst(s, nåTid()); if (u) t.push(u.charAt(0).toLowerCase() + u.slice(1)); return t.length ? t.join(' · ') : null; });
    // blinket i kartet: en gul stjerne som vokser og tones ut på 1,2 s
    KROKER.tegn.push((g, vx0, vy1) => { const nå = performance.now(); if (!blink.length || typeof kam === 'undefined') return;
      for (let i = blink.length - 1; i >= 0; i--) { const b = blink[i], a = (nå - b.t) / 1200; if (a >= 1) { blink.splice(i, 1); continue; }
        const x = (b.X - vx0) / kam.m, y = (vy1 - b.Y) / kam.m, r = 6 + 18 * a; g.save(); g.globalAlpha = 1 - a; g.fillStyle = 'rgba(255,214,90,.85)'; g.strokeStyle = 'rgba(255,120,40,.95)'; g.lineWidth = 2;
        g.beginPath(); for (let k = 0; k < 16; k++) { const v = k * Math.PI / 8, rr = k % 2 ? r * .45 : r; g.lineTo(x + Math.cos(v) * rr, y + Math.sin(v) * rr); } g.closePath(); g.fill(); g.stroke(); g.restore(); } });
    setInterval(() => { if (blink.length && typeof skitten !== 'undefined') skitten = true; }, 120);
  }
  api.blink = () => blink;
  // ditt lette maskingevær: hvert skudd mot et lag holder det nede litt (spillet-visning.js skyt)
  api.skudd = (W, e) => { if (!W || !W.undertrykk || !e) return 0; const U2 = REGLER.undertrykk; return Undertrykk.legg(e, U2.spillerSkudd, nåTid(), U2.spillerVarighet); };
  // ildkraften et fiendelag har mot deg i 3D (kampSteg): samme våpentabell som 2D-kampen (Terreng.treffsjanse) og samme undertrykking
  api.ildkraft = (e, avst) => { const n = e.menn.filter(m => m.hp > 0).length; if (!auto()) return n; return Fiende3d.ildkraft(e.menn, avst, rot.Terreng) * Undertrykk.ild(e, nåTid()); };

  // FIENDENS GRANATER når du går: et fiendelag innen 15–35 m som har oppdaget deg (sniking: EventyrSpill.fiendeFaktor), kaster av og til en
  // av sine egne granater (samme antall som i lagkampen). «Granat!» på skjermen og en rød bue mot kasteren, så du rekker å flytte deg.
  function fiendeKast(e, d) { const Q = r3(); if (!Q || !Q.ut) return null; const u = Q.ut, F = REGLER.fiende3d, sx = e.x - u.cx, sy = e.y - u.cy, m = Fiende3d.mål(Q.bane.x, Q.bane.y, tilfV);
    const g = Fiende3d.kast(sx, sy, bakke(sx, sy) + F.høyde, m.x, m.y, bakke(m.x, m.y) + .1); g.ut = u; g.fra = e;
    if (typeof THREE !== 'undefined' && Q.scene) { granatGeo = granatGeo || new THREE.SphereGeometry(.09, 8, 6); granatMat = granatMat || new THREE.MeshLambertMaterial({ color: 0x3b4a2a }); g.mesh = new THREE.Mesh(granatGeo, granatMat); g.mesh.position.set(g.x, g.y, g.z); Q.scene.add(g.mesh); }
    e.granater = Lagkamp.antall(e) - 1; e.sistGranat = sek(); flyr.push(g); Indikator.legg(buer, Math.atan2(e.y - d.y, e.x - d.x), 1, sek()); varselTid = sek();
    if (typeof logg === 'function') logg(`Granat! ${synligLag(e) ? e.navn : 'Fienden'} kastet en granat mot deg – kom deg unna eller i dekning.`);
    if (typeof sistAktiv !== 'undefined') sistAktiv = performance.now(); return g; }
  let varselTid = -9;
  api.fiendeKast = e => { const d = deg(); return e && d ? fiendeKast(e, d) : null; };
  function fiendeSteg() { if (!auto() || !går() || fører() || (typeof tempo !== 'undefined' && !(tempo > 0)) || typeof ENHETER === 'undefined') return; const d = deg(); if (!d) return;
    const EV = rot.EventyrSpill && EventyrSpill.fiendeFaktor ? EventyrSpill : null;
    for (const e of ENHETER) { if (!e || e.side === 'blå' || e.karakter || !levende(e) || !e.menn) continue; const avst = Math.hypot(e.x - d.x, e.y - d.y); if (avst > REGLER.fiende3d.til) continue;
      if (rot.AI && typeof AI.hvile === 'function' && AI.hvile(e.side, 'blå')) continue; if (Lagkamp.antall(e) <= 0) continue;
      const f = EV ? EV.fiendeFaktor(d, e) : (synligLag(e) ? 1 : 0); if (!(f > 0)) continue;
      if (Fiende3d.kaster(avst, sek() - (e.sistGranat || -99), Math.min(1, f) * Undertrykk.ild(e, nåTid()), tilfV())) fiendeKast(e, d); } }
  setInterval(fiendeSteg, 1000);
  // «GRANAT!» midt på skjermen mens en fiendegranat flyr: pil mot granaten (sett fra blikket), avstand og sekunder til smellet
  KROKER.tegn3d.push(g => { if (!går()) return; const Q = r3(), d = deg(); if (!Q || !d) return; const fg = flyr.filter(q => q.fiende && q.ut === Q.ut); if (!fg.length) return;
    const W = typeof VW !== 'undefined' ? VW : innerWidth, H = typeof VH !== 'undefined' ? VH : innerHeight, cx = W / 2, cy = H * .3;
    let best = null, bd = Infinity; for (const q of fg) { const dd = Math.hypot(q.x - Q.bane.x, q.y - Q.bane.y); if (dd < bd) { bd = dd; best = q; } }
    const th = Indikator.vinkel(best.x - Q.bane.x, best.y - Q.bane.y, Q.fot.a), fare = bd < REGLER.granat.radius, blink2 = (sek() * 4) % 2 < 1.2;
    g.save(); g.textAlign = 'center'; g.font = '700 26px sans-serif'; g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,.75)'; g.fillStyle = fare ? (blink2 ? '#ff4a36' : '#ffb04a') : '#ffd27a';
    g.strokeText('GRANAT!', cx, cy); g.fillText('GRANAT!', cx, cy);
    g.font = '600 14px sans-serif'; const t2 = `${Math.round(bd)} m · ${Fiende3d.igjen(best).toFixed(1).replace('.', ',')} s${fare ? ' – løp!' : ''}`; g.strokeText(t2, cx, cy + 20); g.fillText(t2, cx, cy + 20);
    // pila peker dit granaten er (opp = foran deg)
    g.translate(cx, cy + 48); g.rotate(th); g.fillStyle = fare ? '#ff4a36' : '#ffd27a'; g.beginPath(); g.moveTo(0, -16); g.lineTo(10, 6); g.lineTo(0, 1); g.lineTo(-10, 6); g.closePath(); g.stroke(); g.fill(); g.restore(); });

  Object.assign(api, { treffAlfa: () => Indikator.markør(sek() - treffTid, false), treffSist: () => Math.max(0, treffTid), følger: () => [...følger.keys()], hindre: () => (lesHindre(), hindre), buer: () => buer, flyr: () => flyr, sistDekning: () => sistDekning, lesHindre, antallGranater, varselTid: () => varselTid });
  rot.BakkekampSpill = api;
})(typeof window !== 'undefined' ? window : globalThis);
