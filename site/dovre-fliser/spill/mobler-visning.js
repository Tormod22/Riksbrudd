/* Riksbrudd – FLYTTBARE MØBLER, visningen (window.MoblerSpill). Reglene: spill/mobler.js (alle tall er Claudes forslag).
 * Brukeren 18. nov kveld: «Flyttbare møbler og alt» (som i Project Zomboid – inspirasjonen, ikke en kopi).
 *  PLUKK OPP: mens du går, kommer «Plukk opp sofaen (P)» når du står ved et møbel (inne i et bygg, eller ute når du har satt et der).
 *   Beholdere tar med seg det som ligger i dem (høyst Mobler.REGLER.innhold kg – ellers må du ta ut noe først, i lutpanelet).
 *   Store møbler bæres i armene: du går tregere, kan ikke løpe og ikke skyte (hendene er fulle). Vekta teller i det du bærer.
 *  SETT NED: et gjennomsiktig «spøkelse» av møbelet står foran deg og følger blikket; R / Q dreier det 90°, grønt = ledig, rødt = ikke plass
 *   (vegg, annet møbel, døråpning, vann, hus, for bratt). E, Enter, klikk (med låst mus) eller «Sett her» setter det ned; «Sett tilbake»
 *   legger det der det sto. Inne i et bygg følger det byggets vegger; ute står det på bakken (også i leiren din).
 *  INNE: spill/interior3d.js kaller krokene i window.INTERIOR_PLAN før et interiør bygges – her tas de flyttede møblene ut av planen de kom
 *   fra og settes inn der de står nå, så veggene, kollisjonen, 3D-bildet og beholderne (spill/lut-visning.js) følger med.
 *  UTE: møblene som står ute, er ett nett med hjørnefarger, og de som sperrer, legges i R3.hindre (du går ikke gjennom dem). Ingen lys.
 *  LAGRING per leir i «riksbrudd-mobler»: { F: de flyttede møblene (nøkkel -> bygg, X, Y i kartets meter, retning, mål), bær: det du bærer }.
 * Lastes rett etter lut-visning.js (før spillet-visning.js, så klikket som setter ned ikke også skyter).
 */
(function (rot) {
  'use strict';
  const M = rot.Mobler; if (!M || typeof document === 'undefined') return;
  const NØKKEL = 'riksbrudd-mobler', RG = M.REGLER;
  const r3 = () => (typeof R3 !== 'undefined' ? R3 : null);
  const el = (t, a = {}, ...barn) => { const e = document.createElement(t); for (const [k, v] of Object.entries(a)) { if (v === undefined || v === null || v === false) continue; if (k === 'klasse') e.className = v; else e.setAttribute(k, v); } e.append(...barn); return e; };
  const stor1 = s => s.charAt(0).toUpperCase() + s.slice(1);
  const ut = { test: false };
  let F = {}, bær = null, leirId = '', klar = false, endret = false, sistLagret = 0;

  // ---------- lagring ----------
  const lagreNå = () => { endret = false; sistLagret = performance.now(); try { localStorage.setItem(NØKKEL, JSON.stringify({ leir: leirId, F, bær })); } catch (e) { /* fullt eller sperret */ } };
  const lagre = () => { endret = true; if (performance.now() - sistLagret > 800) lagreNå(); };
  setInterval(() => { if (endret) lagreNå(); }, 1500);
  rot.addEventListener('pagehide', () => { if (endret) lagreNå(); });
  function start() {
    const O = rot.OppstartSpill && OppstartSpill.tilstand(); if (!O || !O.leir) return;
    leirId = Math.round(O.leir.x) + ',' + Math.round(O.leir.y); let d = null; try { d = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); } catch (e) { d = null; }
    F = d && d.leir === leirId && d.F && typeof d.F === 'object' ? d.F : {}; bær = d && d.leir === leirId && d.bær && d.bær.nk ? d.bær : null;
    if (bær && F[bær.nk] && F[bær.nk].i !== 'bæres') bær = null;
    klar = true; byggAlleOm(); fjernSpøkelse(); visBar();
  }
  rot.addEventListener('riksbrudd-spill', () => setTimeout(start, 0));
  // alle interiørene som står nå, bygges på nytt (ny leir, eller vakten har satt tilbake)
  function byggAlleOm() { if (!rot.Interior3d || !Interior3d.aktivP) return; for (const P of Interior3d.aktivP()) if (P.bygg) Interior3d.bygOm(P.bygg.i); uteSig = ''; }

  // ---------- kroken i interiøret: de flyttede møblene inn og ut av planen ----------
  (rot.INTERIOR_PLAN = rot.INTERIOR_PLAN || []).push((pl, P, u) => { if (P && P.bygg) M.bruk(pl, P.bygg.i, F, u.cx, u.cy); });

  // ---------- hvor du er, og møbelet du står ved ----------
  const går = () => { const Q = r3(); return !!(Q && Q.fot && Q.ut && typeof på3d !== 'undefined' && på3d && !(rot.KjorSpill && KjorSpill.fører && KjorSpill.fører())); };
  const terr = (u, x, y) => (hoyde3d(u.cx + x, u.cy + y, u) - u.h0) * (r3() ? R3.EX : 1);
  const uteListe = u => Object.entries(F).filter(([, e]) => e && e.i === null && Math.abs(e.X - u.cx) < u.S - 5 && Math.abs(e.Y - u.cy) < u.S - 5);
  const iUt = (u, nk, e) => ({ type: e.type, x: e.X - u.cx, y: e.Y - u.cy, a: e.a || 0, b: e.b, d: e.d, h: e.h, f: e.f || 0, sperrer: !!e.sperrer, nk, flyttet: true });
  // nærmeste møbel innen rekkevidde (helst det du ser mot): { m, P } inne, { m, ute: true } ute
  function nærmeste() {
    const Q = r3(); if (!klar || !går() || bær || !rot.Interior3d) return null; const u = Q.ut, x = Q.bane.x, y = Q.bane.y, a = Q.fot.a || 0, P = Interior3d.inne(x, y);
    let best = null, bs = Infinity;
    const vurder = (m, kilde) => { const d = M.avstand(m, x, y); if (d > RG.nær) return; const l = Math.hypot(m.x - x, m.y - y) || 1, mot = ((m.x - x) * -Math.sin(a) + (m.y - y) * Math.cos(a)) / l, s = d - .35 * Math.max(0, mot); if (s < bs) { bs = s; best = { m, ...kilde }; } };
    if (P && P.inne) { for (const m of P.inne.møbler) if (m.nk) vurder(m, { P }); }
    else for (const [nk, e] of uteListe(u)) vurder(iUt(u, nk, e), { ute: true });
    return best;
  }

  // ---------- å plukke opp, bære og sette ned ----------
  const si = t => { if (t) logg(t); if (bar) { meld = t; meldTil = performance.now() + 4000; visBar(); } };
  const erBeholder = type => !!(rot.Lut && Lut.BEHOLDERE[type]);
  const lutKlar = () => !!(rot.LutSpill && LutSpill.klar && LutSpill.klar());
  const sperrerType = (type, m) => !!(rot.Interior && Interior.MØBLER[type] ? Interior.MØBLER[type][3] : m && m.sperrer);
  function plukkOpp(c) {
    c = c || nærmeste(); if (!c || bær || !klar) return false; const Q = r3(), u = Q.ut, m = c.m, nk = m.nk;
    const inn = erBeholder(m.type) && lutKlar() ? LutSpill.løft(nk, c.P, m.type) : { kg: 0 }, k = M.kanBære(m, inn.kg);
    if (!k.ok) { si(k.grunn); return false; }
    // hvor det sto (til «Sett tilbake»): fra planen (orig) eller fra et tidligere flytt
    const fra = F[nk] ? { ...F[nk] } : { i: c.P && c.P.bygg ? c.P.bygg.i : null, X: m.x + u.cx, Y: m.y + u.cy, a: m.a || 0, orig: true };
    if (erBeholder(m.type) && lutKlar()) LutSpill.tattOpp(nk, c.P, m.type);
    const aks = c.P && c.P.inne ? Math.atan2(c.P.inne.akse.uy, c.P.inne.akse.ux) : 0;
    bær = { nk, type: m.type, b: m.b, d: m.d, h: m.h, f: m.f || 0, sperrer: sperrerType(m.type, m), innKg: Math.round(inn.kg * 10) / 10, kg: Math.round(k.kg * 10) / 10, stor: k.stor, fra, k: Math.round(((m.a || 0) - aks) / (Math.PI / 2)) };
    F[nk] = { i: 'bæres', type: m.type, b: m.b, d: m.d, h: m.h, f: m.f || 0, sperrer: bær.sperrer };
    if (c.P && c.P.bygg) Interior3d.bygOm(c.P.bygg.i); else uteSig = '';
    lagreNå(); if (rot.LutSpill && LutSpill.oppdaterKnapp) LutSpill.oppdaterKnapp();
    si(`Du løfter ${M.navn(m.type)}${bær.innKg ? ` med det som ligger i (${String(bær.innKg).replace('.', ',')} kg)` : ''}. ${bær.stor ? 'Det er stort: du går tregere og kan verken løpe eller skyte. ' : ''}R dreier, E setter ned.`);
    visBar(); return true;
  }
  function settNed() {
    if (!bær) return false; const T = bær.mål; if (!T) { si('Se dit du vil sette det.'); return false; } if (!T.ok) { si(T.grunn || 'Ikke plass her.'); return false; }
    const u = R3.ut, nk = bær.nk, type = bær.type;
    F[nk] = { i: T.P ? T.P.bygg.i : null, X: Math.round((T.m.x + u.cx) * 100) / 100, Y: Math.round((T.m.y + u.cy) * 100) / 100, a: Math.round(T.m.a * 1000) / 1000, type, b: bær.b, d: bær.d, h: bær.h, f: bær.f, sperrer: bær.sperrer };
    if (erBeholder(type) && lutKlar()) LutSpill.sattNed(nk, type);
    bær = null; fjernSpøkelse(); if (T.P) Interior3d.bygOm(T.P.bygg.i); else uteSig = '';
    lagreNå(); si(`${stor1(M.navn(type))} står ${T.P ? 'der du satte det' : 'ute der du satte det'}.`); visBar(); return true;
  }
  function settTilbake() {
    if (!bær) return false; const f = bær.fra, nk = bær.nk, type = bær.type;
    if (f.orig) delete F[nk]; else { F[nk] = { ...f }; delete F[nk].orig; }
    if (erBeholder(type) && lutKlar()) LutSpill.sattNed(nk, type);
    bær = null; fjernSpøkelse(); if (typeof f.i === 'number') Interior3d.bygOm(f.i); uteSig = '';
    lagreNå(); si(`${stor1(M.navn(type))} står der det sto.`); visBar(); return true;
  }
  function roter(s = 1) { if (!bær) return; bær.k = ((bær.k || 0) + s + 4) % 4; sistSjekk = 0; }

  // ---------- spøkelset (3D) ----------
  let spøk = null, spøkMat = null, sistSjekk = 0, vannFor = null, vannFn = null;
  function fjernSpøkelse() { if (spøk) { if (spøk.parent) spøk.parent.remove(spøk); spøk.geometry.dispose(); spøk = null; } }
  function plassér(R) {
    const u = R.ut, x = R.bane.x, y = R.bane.y, P = Interior3d.inne(x, y), aks = P && P.inne ? Math.atan2(P.inne.akse.uy, P.inne.akse.ux) : 0;
    // (på telefon på høykant er synsfeltet smalt: spøkelset står lenger ut, så det ikke dekker bildet)
    const smal = typeof VW !== 'undefined' && typeof VH !== 'undefined' ? VW < 700 || VW < VH : false;
    const g = M.foran(x, y, R.fot.a || 0, bær, bær.k || 0, aks, smal ? RG.foranSmal : RG.foran), m = { type: bær.type, x: g.x, y: g.y, a: g.a, b: bær.b, d: bær.d, h: bær.h };
    let res, z;
    const PG = Interior3d.inne(g.x, g.y);
    if (P && P.inne) { if (PG !== P) res = { ok: false, grunn: 'Det går gjennom veggen – gå lenger inn.' }; else res = M.kanSettes(P.inne, m, Interior, bær.nk); z = P.inne.gulv; }
    else if (PG) { res = { ok: false, grunn: 'Gå inn i bygget for å sette det der.' }; z = terr(u, g.x, g.y); }
    else {
      if (vannFor !== u) { vannFor = u; vannFn = rot.Gange && Gange.vannVed ? Gange.vannVed(u) : () => false; }
      const fri = (px, py) => !vannFn(px, py) && !(typeof hindring3d === 'function' && hindring3d(px, py)) && !Interior3d.inne(px, py);
      res = M.kanSettesUte(m, fri, (px, py) => terr(u, px, py)); z = res.z !== undefined && res.ok ? res.z : terr(u, g.x, g.y);
    }
    if (res.ok && M.avstand(m, x, y) < .25) res = { ok: false, grunn: 'Du står i veien.' };
    bær.mål = { m, z, ok: !!res.ok, grunn: res.grunn || '', P: P && P.inne ? P : null };
  }
  function ramme(R) {
    if (!klar) return;
    if (R.ut && R.scene && typeof THREE !== 'undefined') oppdaterUte(false, R);
    if (!bær || !R.fot || !R.ut || !rot.Interior3d || typeof THREE === 'undefined') { fjernSpøkelse(); return; }
    const t = performance.now(); if (t - sistSjekk > 110) { sistSjekk = t; try { plassér(R); } catch (e) { console.warn('møbler:', e); bær.mål = null; } visBar(); }
    const T = bær.mål; if (!T) return;
    // (gjennomsiktig med møbelets farger og en grønn eller rød glød oppå, så formen synes og fargen sier ja/nei – også i mørke rom)
    if (!spøk) { if (!spøkMat) spøkMat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: .55, depthWrite: false });
      spøk = new THREE.Mesh(Interior3d.møbelGeo(bær), spøkMat); spøk.renderOrder = 5; spøk.frustumCulled = false; spøk.userData.møbelSpøkelse = true; R.scene.add(spøk); }
    if (spøk.parent !== R.scene) R.scene.add(spøk);
    spøk.position.set(T.m.x, T.m.y, T.z + .01); spøk.rotation.set(0, 0, T.m.a); spøkMat.color.setRGB(T.ok ? .6 : 1, T.ok ? 1 : .55, T.ok ? .6 : .5); spøkMat.emissive.setRGB(T.ok ? .08 : .5, T.ok ? .42 : .06, T.ok ? .1 : .04);
  }
  KROKER.ramme3d.push(ramme);

  // ---------- møblene ute: ett nett, og hindringer for dem som sperrer ----------
  let uteMesh = null, uteMat = null, uteSig = '', uteHindre = null, uteObj = [];
  function oppdaterUte(tving, R) {
    R = R || r3(); if (!R || !R.ut || !R.scene || !rot.Interior3d) return; const u = R.ut, liste = uteListe(u);
    const sig = (liste.length ? u.cx + ',' + u.cy + '|' : '') + liste.map(([nk, e]) => nk + ':' + e.X + ':' + e.Y + ':' + e.a).join('|');
    if (!tving && sig === uteSig && uteHindre === R.hindre && (!uteMesh || uteMesh.parent === R.scene)) return; uteSig = sig;
    if (uteMesh) { if (uteMesh.parent) uteMesh.parent.remove(uteMesh); uteMesh.geometry.dispose(); uteMesh = null; }
    if (uteHindre) for (const [k, o] of uteObj) { const A = uteHindre.get(k), i = A ? A.indexOf(o) : -1; if (i >= 0) A.splice(i, 1); }
    uteObj = []; uteHindre = R.hindre; if (!liste.length) return;
    const geos = [];
    for (const [nk, e] of liste) { const m = iUt(u, nk, e); let z = -Infinity; for (const [px, py] of M.hjørner(m)) z = Math.max(z, terr(u, px, py)); z = Math.max(z, terr(u, m.x, m.y));
      const g = Interior3d.møbelGeo(m); g.rotateZ(m.a); g.translate(m.x, m.y, z); geos.push(g);
      if (m.sperrer && R.hindre) { const o = { P: M.hjørner(m), møbel: nk }; let ax = Infinity, ay = Infinity, bx = -Infinity, by = -Infinity; for (const p of o.P) { ax = Math.min(ax, p[0]); bx = Math.max(bx, p[0]); ay = Math.min(ay, p[1]); by = Math.max(by, p[1]); }
        for (let a = Math.floor(ax / 20); a <= Math.floor(bx / 20); a++) for (let q = Math.floor(ay / 20); q <= Math.floor(by / 20); q++) { const k = a + ',' + q; if (!R.hindre.has(k)) R.hindre.set(k, []); R.hindre.get(k).push(o); uteObj.push([k, o]); } } }
    if (!uteMat) uteMat = new THREE.MeshLambertMaterial({ vertexColors: true });
    uteMesh = new THREE.Mesh(MODELLER.samle(geos), uteMat); uteMesh.userData.møbler = true; R.scene.add(uteMesh); for (const g of geos) g.dispose();
  }

  // ---------- knappene ----------
  const css = document.createElement('style');
  css.textContent = `#mobelknapp{ position:fixed; left:50%; transform:translateX(-50%); bottom:calc(250px + env(safe-area-inset-bottom,0px)); z-index:6; display:none; min-width:200px; min-height:40px; padding:5px 16px; background:rgba(28,23,15,.92); border:1px solid #8fa86a; color:#e3efc9; font:inherit; font-size:15px; cursor:pointer; }
#mobelknapp.på{ display:block; } body.kort #mobelknapp{ bottom:calc(380px + env(safe-area-inset-bottom,0px)); font-size:14px; min-width:160px; }
#mobelbar{ position:fixed; left:50%; transform:translateX(-50%); top:calc(var(--topp,58px) + 52px); z-index:7; display:none; width:min(520px,94vw); box-sizing:border-box; padding:7px 10px; background:rgba(24,20,13,.94); border:1px solid #c9b26a; color:var(--ink,#e7dcc3); font-size:14px; text-align:center; }
#mobelbar.på{ display:block; } #mobelbar .linje{ margin-bottom:5px; } #mobelbar .linje b{ color:#f0e2b0; } #mobelbar .st{ display:block; font-size:13px; margin-top:2px; } #mobelbar .st.ok{ color:#9fd47a; } #mobelbar .st.nei{ color:#f08a70; }
#mobelbar .kn{ display:flex; gap:6px; justify-content:center; } #mobelbar button{ flex:1; min-height:38px; background:#2a2318; border:1px solid var(--rule,#4a4030); color:var(--ink,#e7dcc3); font:inherit; font-size:14px; cursor:pointer; } #mobelbar button.hoved{ border-color:#9fd47a; color:#e3efc9; }
#mobelbar .meld{ font-size:12px; color:#f0e2b0; margin-top:4px; }
body.kort #mobelbar{ top:auto; bottom:calc(184px + env(safe-area-inset-bottom,0px)); left:8px; right:8px; transform:none; width:auto; font-size:12px; padding:4px 6px; }
body.kort #mobelbar .linje{ margin-bottom:3px; } body.kort #mobelbar .st{ display:inline; margin-left:6px; font-size:12px; } body.kort #mobelbar button{ min-height:34px; font-size:13px; }
body.bærermøbel #skytknapp, body.bærermøbel #byttvapen, body.bærermøbel #letknapp, body.bærermøbel #sikreknapp, body.bærermøbel #kjorknapp, body.bærermøbel #innelapp, body.bærermøbel #lutknapp{ display:none !important; }
@media (max-height:560px){ body.kort #mobelbar{ top:calc(var(--topp,40px) + 4px); width:min(420px,60vw); } body.kort #mobelknapp{ bottom:calc(150px + env(safe-area-inset-bottom,0px)); left:auto; right:120px; transform:none; } }`;
  document.head.appendChild(css);
  const knapp = el('button', { id: 'mobelknapp', type: 'button' }); document.body.appendChild(knapp);
  const bar = el('div', { id: 'mobelbar', role: 'group', 'aria-label': 'Møbelet du bærer' }); document.body.appendChild(bar);
  let knappFor = null, meld = '', meldTil = 0, sistBar = '';
  const grov = () => !!(rot.matchMedia && matchMedia('(pointer: coarse)').matches);
  function oppdaterKnapp() {
    const lutÅpen = rot.LutSpill && LutSpill.erÅpen && LutSpill.erÅpen(), c = !lutÅpen ? nærmeste() : null; knappFor = c;
    if (!c) { knapp.classList.remove('på'); return; }
    const t = `Plukk opp ${M.navn(c.m.type)}${grov() ? '' : ' (P)'}`; if (knapp.textContent !== t) knapp.textContent = t; knapp.classList.add('på');
  }
  knapp.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); plukkOpp(knappFor || nærmeste()); oppdaterKnapp(); });
  function visBar() {
    const vis = !!bær && går(); bar.classList.toggle('på', vis); document.body.classList.toggle('bærermøbel', vis); if (!vis) { sistBar = ''; return; }
    const T = bær.mål, st = !T ? '' : T.ok ? 'Ledig – her kan det stå' : T.grunn || 'Ikke plass her', m = meld && performance.now() < meldTil ? meld : '';
    const nøkkel = [bær.nk, bær.kg, st, T && T.ok, m, grov()].join('|'); if (nøkkel === sistBar) return; sistBar = nøkkel;
    const g = grov();
    bar.replaceChildren(el('div', { klasse: 'linje' }, 'Du bærer ', el('b', {}, M.navn(bær.type)), ` · ${String(bær.kg).replace('.', ',')} kg${bær.stor ? ' · i armene' : ''}`, el('span', { klasse: 'st ' + (T && T.ok ? 'ok' : 'nei') }, st)),
      el('div', { klasse: 'kn' }, btn(g ? 'Sett her' : 'Sett her (E)', () => settNed(), 'sett', 'hoved'), btn(g ? 'Roter' : 'Roter (R)', () => roter(1), 'roter'), btn('Sett tilbake', () => settTilbake(), 'tilbake')),
      m ? el('div', { klasse: 'meld' }, m) : '');
  }
  const btn = (tekst, fn, id, kl) => { const b = el('button', { type: 'button', 'data-mobel': id, klasse: kl }, tekst); b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); fn(); visBar(); }); return b; };
  setInterval(() => { oppdaterKnapp(); visBar(); }, 300);

  // ---------- tastene: P plukker opp; mens du bærer: E/Enter setter ned, R/Q dreier. Klikk med låst mus setter ned (og skyter ikke) ----------
  rot.addEventListener('keydown', e => {
    if (!klar || /INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '') || e.ctrlKey || e.metaKey || e.altKey || !går()) return; const k = e.key.toLowerCase();
    if (bær) { if (k === 'e' || k === 'enter') { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) settNed(); }
      else if (k === 'r' || k === 'q') { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) roter(k === 'r' ? 1 : -1); } return; }
    if (k === 'p' && !e.repeat) { const c = nærmeste(); if (c) { e.preventDefault(); e.stopImmediatePropagation(); plukkOpp(c); } }
  }, true);
  rot.addEventListener('pointerdown', e => { const c = document.getElementById('c3'); if (bær && e.button === 0 && c && document.pointerLockElement === c && går()) { e.preventDefault(); e.stopImmediatePropagation(); settNed(); } }, true);

  Object.assign(ut, { start, plukkOpp, settNed, settTilbake, roter, nærmeste, ramme, oppdaterUte, oppdaterKnapp, visBar, klar: () => klar,
    bærer: () => !!bær, bæres: () => bær, hender: () => !!bær, stor: () => !!(bær && bær.stor), fart: () => (bær && bær.stor ? RG.fart : 1), kg: () => (bær ? bær.kg : 0),
    F: () => F, uteMesh: () => uteMesh, spøkelse: () => spøk,
    // til vakten: sett tilstanden (F, bær) og bygg interiørene på nytt
    settTilstand: (f, b) => { F = f || {}; bær = b || null; fjernSpøkelse(); byggAlleOm(); lagreNå(); visBar(); }, byggAlleOm });
  rot.MoblerSpill = ut;
})(typeof window !== 'undefined' ? window : globalThis);
