'use strict';
// K2 – leiren (regler: spill/leir.js). Knappen «Leir» øverst åpner byggemenyen: velg et bygg, trykk på kartet (2D eller 3D), se
// skissen (grønn = kan bygges, rød = ikke), roter og bekreft. Pengene trekkes fra kassa (OppstartSpill.betal), bygget reiser seg i
// spilltiden og står i 3D (modellene i spill/modeller.js, og egne her for aggregat, solceller, kameramast, radiomast og drivhus).
// Trær og busker der et bygg står, fjernes. Strøm og drivstoff vises øverst og i menyen. Lagres i nettleseren («riksbrudd-k2»).
// Kroker: KROKER.sim (bygging og strøm), KROKER.trykk/trykk3d (plassering), KROKER.tegn (kartet), KROKER.bygg3d/sett3d (3D).
(function () {
  const LB = Leir, NØKKEL = 'riksbrudd-k2', r3 = () => (typeof R3 !== 'undefined' ? R3 : null);
  let L = null, plassering = null, sist = null, akk = 0, meny = false;
  const spill = () => window.OppstartSpill && OppstartSpill.tilstand();
  const les = () => { try { return LB.fraJSON(localStorage.getItem(NØKKEL)); } catch (e) { return null; } };
  const lagre = () => { try { localStorage.setItem(NØKKEL, LB.tilJSON(L)); } catch (e) { /* privat vindu */ } };

  // ---------- stil og knapper ----------
  const css = document.createElement('style');
  css.textContent = `#leirmeny{ position:fixed; left:10px; top:calc(var(--topp,58px) + 6px); bottom:calc(60px + env(safe-area-inset-bottom,0px)); width:min(340px, calc(100vw - 20px));
  z-index:6; display:none; flex-direction:column; background:var(--panel); border:1px solid var(--rule); color:var(--ink); }
#leirmeny.på{ display:flex; }
#leirmeny .hode{ padding:10px 12px 6px; border-bottom:1px solid var(--rule); }
#leirmeny h2{ margin:0; font-family:"IM Fell English",serif; font-weight:400; font-size:22px; }
#leirmeny .status{ font-size:14px; color:var(--ink-dim); margin-top:4px; line-height:1.45; }
#leirmeny .liste{ overflow:auto; padding:6px 8px 10px; }
#leirmeny .bygg{ display:flex; gap:8px; align-items:center; padding:6px 4px; border-bottom:1px solid #3a3226; }
#leirmeny .bygg div{ flex:1; min-width:0; } #leirmeny .bygg b{ font-weight:600; } #leirmeny .bygg small{ display:block; color:var(--ink-dim); font-size:12.5px; }
#leirmeny button, #byggvalg button{ background:#2a2318; border:1px solid var(--rule); color:var(--ink); min-height:40px; padding:4px 12px; cursor:pointer; font:inherit; }
#leirmeny button:disabled{ opacity:.45; cursor:default; }
#leirmeny .lukk{ float:right; min-height:36px; border:none; background:none; font-size:22px; }
#leirmeny .igang{ font-size:13.5px; color:var(--ink); margin:4px 0 0; }
#byggvalg{ position:fixed; left:50%; transform:translateX(-50%); bottom:calc(70px + env(safe-area-inset-bottom,0px)); z-index:11; display:none; background:var(--panel);
  border:1px solid var(--hover); padding:10px 14px; color:var(--ink); max-width:min(560px,92vw); text-align:center; }
#byggvalg.på{ display:block; } #byggvalg button{ margin:6px 4px 0; }`;
  document.head.appendChild(css);
  const el = (tag, eg = {}, ...barn) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(eg)) { if (k === 'klasse') e.className = v; else if (k.startsWith('on')) e[k] = v; else e.setAttribute(k, v); } e.append(...barn); return e; };
  const knapp = (t, f, eg = {}) => { const b = el('button', { type: 'button', ...eg }, t); b.onclick = f; return b; };
  const menyEl = el('div', { id: 'leirmeny', role: 'dialog', 'aria-label': 'Leiren' }); document.body.appendChild(menyEl);
  const banner = el('div', { id: 'byggvalg' }); document.body.appendChild(banner);
  const leirKnapp = el('button', { id: 'leirknapp', title: 'Bygg leiren' }, 'Leir'); leirKnapp.hidden = true;
  document.querySelector('.knapper').insertBefore(leirKnapp, document.getElementById('meny'));
  leirKnapp.onclick = () => { meny = !meny; menyEl.classList.toggle('på', meny); leirKnapp.classList.toggle('på', meny); if (meny) visMeny(); };
  const st = el('div', {}, el('b', { id: 'sStrom' }, '–'), ' ', el('span', {}, 'strøm')); st.hidden = true; document.querySelector('.stats').appendChild(st);

  // ---------- strøm og sol ----------
  let siste = { prod: 0, kapasitet: 0, behov: 0, mangler: new Set(), sol: 0 };
  function solNå() {
    const h = (6 + tid / TIME) % 24, V = window.VAER, e = V && window.Vaer ? Vaer.solHøyde(V.dag, h) : 40 * Math.cos((h - 13) / 12 * Math.PI);
    return Math.max(0, Math.min(1, e / 25)) * (V ? 1 - .7 * Math.max(0, (V.sky - .3) / .7) : 1);
  }
  const kw = v => v.toLocaleString('nb-NO', { maximumFractionDigits: 1 });
  function visStatus() {
    st.hidden = !L || !L.bygg.length; if (st.hidden) return;
    const m = siste.mangler.size; document.getElementById('sStrom').textContent = `${kw(siste.prod)}/${kw(siste.behov)} kW` + (m ? ' ⚠' : '');
  }
  KROKER.sim.push(dt => {
    if (!L || !spill()) return;
    siste = LB.steg(L, dt, solNå());
    for (const b of siste.nyFerdig) { logg(`${LB.BYGG[b.type].navn} er ferdig bygget.`); bygg3dPåNytt(); }
    akk += dt; if (akk >= 10 || siste.nyFerdig.length) { akk = 0; lagre(); }
    if (performance.now() - (sist || 0) > 1000) { sist = performance.now(); visStatus(); if (meny) visMeny(); skitten = true; }
  });

  // ---------- menyen ----------
  function visMeny() {
    const S = spill(); menyEl.innerHTML = '';
    const igang = L.bygg.filter(b => !LB.ferdig(b)), kap = LB.kapasitet(L);
    const status = el('div', { klasse: 'status' },
      `Kassa: ${LB.kroner(S.penger)}`, el('br'),
      `Strøm: ${kw(siste.prod)} kW brukt av ${kw(siste.behov)} kW behov (kan gi ${kw(siste.kapasitet)} kW)`, el('br'),
      siste.mangler.size ? el('span', { style: 'color:#e88a6a' }, `${siste.mangler.size} bygg mangler strøm`) : 'Alle bygg har strøm', el('br'),
      `Drivstoff: ${Math.floor(L.drivstoff).toLocaleString('nb-NO')} l av ${kap.toLocaleString('nb-NO')} l`, el('br'),
      `Sengeplasser: ${LB.plasser(L)}`);
    const kjøp = knapp(`Kjøp 500 l drivstoff (${LB.kroner(500 * LB.DRIVSTOFF.prisPerLiter)})`, () => {
      const r = LB.kjøpDrivstoff(L, 500, OppstartSpill.betal); logg(r.feil || `Kjøpte ${r.liter} l drivstoff for ${LB.kroner(r.pris)}.`); lagre(); visMeny(); });
    kjøp.disabled = kap - L.drivstoff < 1;
    const hode = el('div', { klasse: 'hode' }, knapp('×', () => leirKnapp.onclick(), { klasse: 'lukk', 'aria-label': 'Lukk' }), el('h2', {}, 'Leiren'), status, el('div', { style: 'margin-top:6px' }, kjøp));
    for (const b of igang) hode.appendChild(el('div', { klasse: 'igang' }, `Bygges: ${LB.BYGG[b.type].navn} – ${Math.round(LB.framdrift(b) * 100)} % (${tidTekst(b.igjen)} igjen)`));
    const liste = el('div', { klasse: 'liste' }), bonus = OppstartSpill.bonus();
    for (const [id, B] of Object.entries(LB.BYGG)) {
      const k = LB.kostnad(id, 1, bonus), pris = B.linje ? `${LB.kroner(B.prisPerMeter)} per meter` : `${LB.kroner(k.pris)} · ${tidTekst(k.timer * 60)}`;
      const strøm = B.kw > 0 ? ` · gir ${kw(B.kw)} kW` : B.kw < 0 ? ` · bruker ${kw(-B.kw)} kW` : '';
      const b = knapp('Bygg', () => startPlassering(id)); b.disabled = !B.linje && S.penger < k.pris;
      liste.appendChild(el('div', { klasse: 'bygg' }, el('div', {}, el('b', {}, B.navn), el('small', {}, pris + strøm), el('small', {}, B.tekst)), b));
    }
    menyEl.append(hode, liste);
  }
  const tidTekst = min => min >= 60 ? `${kw(min / 60)} t` : `${Math.ceil(min)} min`;

  // ---------- plassering ----------
  function startPlassering(type) {
    plassering = { type, ret: 0, x: null, y: null, punkter: LB.BYGG[type].linje ? [] : null, feil: null };
    meny = false; menyEl.classList.remove('på'); leirKnapp.classList.remove('på');
    visBanner(LB.BYGG[type].linje ? 'Trykk der gjerdet skal begynne.' : `Trykk der ${LB.BYGG[type].navn.toLowerCase()} skal stå.`);
  }
  function visBanner(tekst, kan) {
    banner.innerHTML = ''; banner.classList.add('på'); banner.append(el('div', {}, tekst));
    const p = plassering;
    if (kan) banner.append(knapp('Bygg her', bekreft));
    if (p && !LB.BYGG[p.type].linje && p.x !== null) banner.append(knapp('Roter', () => { p.ret = (p.ret + Math.PI / 4) % (2 * Math.PI); prøv(); }));
    banner.append(knapp('Avbryt', () => { plassering = null; banner.classList.remove('på'); skitten = true; }));
  }
  async function klasseVed(x, y) { try { const v = await lagVindu([x - 64, y - 64, x + 64, y + 64], false); const [i, j] = Terreng.rute(v, x, y); return v.K[j * v.w + i]; } catch (e) { return undefined; } }
  // Kartets klasse (vann) og eksisterende hus for punktene i bygget (hentes før regelsjekken, som er uten nettverk)
  async function kartFor(punkter) {
    const kl = new Map(), hus = new Set();
    for (const [x, y] of punkter) { kl.set(x + ',' + y, await klasseVed(x, y)); try { const h = await finnBygg(x, y); if (h && pip(h.P, x, y)) hus.add(x + ',' + y); } catch (e) { /* ingen husdata */ } }
    return { klasse: (x, y) => kl.get(x + ',' + y), iHus: (x, y) => hus.has(x + ',' + y) };
  }
  const pip = (P, x, y) => { let inn = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) inn = !inn; return inn; };
  async function prøv() {
    const p = plassering; if (!p) return;
    const b = LB.BYGG[p.type].linje ? { type: p.type, punkter: p.punkter } : { type: p.type, x: p.x, y: p.y, ret: p.ret };
    if (LB.BYGG[p.type].linje && p.punkter.length < 2) { visBanner('Trykk der gjerdet skal slutte.'); skitten = true; return; }
    const punkter = LB.BYGG[p.type].linje ? p.punkter : [...LB.hjørner(b), [b.x, b.y]], v = await kartFor(punkter);
    p.feil = LB.kanBygge(L, b, v); p.kart = v; skitten = true;
    const k = LB.kostnad(p.type, LB.BYGG[p.type].linje ? LB.lengde(p.punkter) : 0, OppstartSpill.bonus());
    visBanner(p.feil || `${LB.BYGG[p.type].navn}: ${LB.kroner(k.pris)}, ferdig om ${tidTekst(k.timer * 60)}.` + (LB.BYGG[p.type].linje ? ` (${Math.round(LB.lengde(p.punkter))} m)` : ''), !p.feil);
  }
  function trykk(X, Y) {
    const p = plassering; if (!p) return false;
    if (LB.BYGG[p.type].linje) { if (p.punkter.length >= 2) p.punkter = []; p.punkter.push([X, Y]); } else { p.x = X; p.y = Y; }
    prøv(); return true;
  }
  KROKER.trykk.push(trykk); KROKER.trykk3d.push(trykk);
  function bekreft() {
    const p = plassering; if (!p || p.feil) return;
    const b = LB.BYGG[p.type].linje ? { type: p.type, punkter: p.punkter } : { type: p.type, x: p.x, y: p.y, ret: p.ret };
    const r = LB.bygg(L, b, OppstartSpill.betal, OppstartSpill.bonus(), p.kart || {});
    if (r.feil) { visBanner(r.feil); return; }
    logg(`${LB.BYGG[p.type].navn} bygges: ${LB.kroner(r.bygg.pris)}, ferdig om ${tidTekst(r.bygg.totalt)}.`);
    plassering = null; banner.classList.remove('på'); lagre(); visStatus(); bygg3dPåNytt(true); skitten = true;
  }

  // ---------- kartet ----------
  function farge(a) { const S = spill(); return S ? Oppstart.hovedfarge(S.fraksjon.flagg) : '#5b7ea8'; }
  KROKER.tegn.push((g, vx0, vy1) => {
    if (!L) return; const m = kam.m, sx = X => (X - vx0) / m, sy = Y => (vy1 - Y) / m;
    const tegn1 = (b, skisse, ok) => {
      const B = LB.BYGG[b.type];
      if (B.linje) { if (!b.punkter || b.punkter.length < 1) return; g.save(); g.strokeStyle = skisse ? (ok ? '#7fd17a' : '#e0604a') : '#cfc6b0'; g.lineWidth = Math.max(1.5, 1.2 / m); g.setLineDash([6, 3]);
        g.beginPath(); g.moveTo(sx(b.punkter[0][0]), sy(b.punkter[0][1])); for (const q of b.punkter.slice(1)) g.lineTo(sx(q[0]), sy(q[1])); g.stroke(); g.restore(); return; }
      const P = LB.hjørner(b).map(([x, y]) => [sx(x), sy(y)]); if (P.every(([x, y]) => x < -50 || y < -50 || x > VW + 50 || y > VH + 50)) return;
      g.save(); g.beginPath(); g.moveTo(...P[0]); for (const q of P.slice(1)) g.lineTo(...q); g.closePath();
      g.fillStyle = skisse ? (ok ? 'rgba(110,200,105,.45)' : 'rgba(224,96,74,.45)') : farge(); g.globalAlpha = skisse ? 1 : LB.ferdig(b) ? .85 : .35 + .5 * LB.framdrift(b); g.fill(); g.globalAlpha = 1;
      g.strokeStyle = siste.mangler.has(b.id) ? '#e0604a' : '#efe6cf'; g.lineWidth = 1.2; g.stroke();
      if (m < 1.2) { g.font = '12px sans-serif'; g.textAlign = 'center'; g.fillStyle = '#f2ead6'; g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 3; const t = B.navn + (LB.ferdig(b) ? '' : ` ${Math.round(LB.framdrift(b) * 100)} %`);
        g.strokeText(t, sx(b.x), sy(b.y) + 4); g.fillText(t, sx(b.x), sy(b.y) + 4); }
      g.restore(); };
    for (const b of L.bygg) tegn1(b, false);
    const p = plassering; if (p && (p.x !== null || (p.punkter && p.punkter.length))) tegn1(LB.BYGG[p.type].linje ? { type: p.type, punkter: p.punkter } : { type: p.type, x: p.x, y: p.y, ret: p.ret }, true, !p.feil);
  });

  // ---------- 3D ----------
  // egne enkle modeller (vertex-farger, origo midt på bunnen, fronten mot +x) for byggene som ikke finnes i spill/modeller.js
  const boks = (d, x, y, z, sx, sy, sz, c) => { const g = new THREE.BoxGeometry(sx, sy, sz).toNonIndexed(); g.translate(x, y, z + sz / 2); const n = g.attributes.position.count, f = new Float32Array(n * 3); for (let i = 0; i < n; i++) f.set(c, i * 3); g.setAttribute('color', new THREE.BufferAttribute(f, 3)); d.push(g); };
  const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
  const EGNE = {
    aggregat: () => { const d = []; boks(d, 0, 0, 0, 3.2, 2, .2, [.4, .4, .38]); boks(d, 0, 0, .2, 3, 1.8, 1.7, hex('#4f6a3a')); boks(d, 1.51, 0, .5, .05, 1.4, 1.1, [.15, .15, .15]); boks(d, -1, .5, 1.9, .18, .18, .9, [.2, .2, .2]); return d; },
    solcelle: () => { const d = []; for (const x of [-2.7, 0, 2.7]) { boks(d, x, -1, 0, .1, .1, .8, [.5, .5, .5]); boks(d, x, 1, 0, .1, .1, 1.8, [.5, .5, .5]); }
      const g = new THREE.BoxGeometry(8, 3.6, .08).toNonIndexed(); g.rotateX(-.45); g.translate(0, 0, 1.35); const n = g.attributes.position.count, f = new Float32Array(n * 3); for (let i = 0; i < n; i++) f.set([.1, .16, .3], i * 3); g.setAttribute('color', new THREE.BufferAttribute(f, 3)); d.push(g); return d; },
    kameramast: () => { const d = []; boks(d, 0, 0, 0, .5, .5, .3, [.45, .45, .43]); boks(d, 0, 0, .3, .15, .15, 6, [.55, .56, .57]); boks(d, .3, 0, 6.1, .6, .25, .25, [.85, .85, .82]); boks(d, .62, 0, 6.15, .05, .16, .16, [.05, .05, .08]); return d; },
    radiomast: () => { const d = [], H = 24; boks(d, 0, 0, 0, 1.4, 1.4, .3, [.45, .45, .43]);
      for (const [x, y] of [[-.5, -.5], [.5, -.5], [.5, .5], [-.5, .5]]) boks(d, x, y, .3, .08, .08, H, [.75, .2, .15]);
      for (let z = 2; z < H; z += 3) { boks(d, 0, -.5, z, 1, .06, .06, [.8, .8, .78]); boks(d, 0, .5, z, 1, .06, .06, [.8, .8, .78]); boks(d, -.5, 0, z, .06, 1, .06, [.8, .8, .78]); boks(d, .5, 0, z, .06, 1, .06, [.8, .8, .78]); }
      boks(d, 0, 0, H + .3, .08, .08, 4, [.3, .3, .3]); return d; },
    drivhus: () => { const d = [], ramme = [.82, .84, .82], glass = [.62, .78, .74]; boks(d, 0, 0, 0, 6, 10, .3, [.45, .43, .4]); boks(d, 0, 0, .3, 5.8, 9.8, 2.4, glass);
      for (const sd of [-1, 1]) { const g = new THREE.BoxGeometry(3.3, 9.8, .06).toNonIndexed(); g.rotateY(sd * .55); g.translate(sd * 1.4, 0, 3.4); const n = g.attributes.position.count, f = new Float32Array(n * 3); for (let i = 0; i < n; i++) f.set(glass.map(v => v * 1.08), i * 3); g.setAttribute('color', new THREE.BufferAttribute(f, 3)); d.push(g); }
      for (let y = -4.8; y <= 4.9; y += 1.6) boks(d, 0, y, .3, 6, .08, 2.5, ramme); return d; },
  };
  function modell(b) {
    const B = LB.BYGG[b.type], M = window.MODELLER; if (!M) return null;
    if (B.linje) return M.gjerdeLangs(b.punkter.map(([x, y]) => [x - b.punkter[0][0], y - b.punkter[0][1]]), false);
    if (EGNE[B.modell]) return M.samle(EGNE[B.modell]());
    if (B.modell === 'port') return M.port(false); if (B.modell === 'verksted') return M.verksted([false, false]); if (B.modell === 'container') return M.container('utstyr');
    if (B.modell === 'sandsekkvoll') return M.sandsekkvoll(8, 2);
    return M[B.modell] ? M[B.modell]() : null;
  }
  let mesh = [], ute = null;
  function lagLeir3d(u, R) {
    for (const m of mesh) { R.scene.remove(m); m.geometry.dispose(); } mesh = [];
    if (!L || !window.MODELLER) return; const mat = MODELLER.materiale();
    for (const b of L.bygg) {
      const x = b.x - u.cx, y = b.y - u.cy; if (Math.abs(x) > u.S - 5 || Math.abs(y) > u.S - 5) continue;
      let g; try { g = modell(b); } catch (e) { console.error(e); continue; } if (!g) continue;
      const m = new THREE.Mesh(g, mat), z = (hoyde3d(b.x, b.y, u) - u.h0) * R.EX;
      m.position.set(x, y, z - .05); m.rotation.z = b.ret || 0;
      // under bygging: reiser seg etter framdriften (minst en grunnmur)
      m.scale.z = LB.ferdig(b) ? 1 : Math.max(.08, LB.framdrift(b)); m.userData.id = b.id; R.scene.add(m); mesh.push(m);
    }
    ute = u;
  }
  // Fjerner trær, steiner og busker inne i byggene (med 5 m margin) og midt i leiren – både når 3D-utsnittet bygges og når et nytt bygg settes opp
  function innenfor(u) {
    const P = (L ? L.bygg : []).filter(b => !LB.BYGG[b.type].linje).map(b => { const B = LB.BYGG[b.type], f = B.fot, c = Math.cos(b.ret || 0), s = Math.sin(b.ret || 0);
      return [[f[0] - 5, f[2] - 5], [f[1] + 5, f[2] - 5], [f[1] + 5, f[3] + 5], [f[0] - 5, f[3] + 5]].map(([a, d]) => [b.x - u.cx + a * c - d * s, b.y - u.cy + a * s + d * c]); });
    // og en ryddet plass på 30 m rundt midten av leiren (der flagget står)
    const S = spill(), lx = S && S.leir ? S.leir.x - u.cx : 1e9, ly = S && S.leir ? S.leir.y - u.cy : 1e9;
    return (x, y) => Math.hypot(x - lx, y - ly) < 30 || P.some(Q => pip(Q, x, y));
  }
  KROKER.bygg3d.push(async u => {
    if (!L || !spill()) return; const inni = innenfor(u);
    const sil = data => { const ut = []; for (let k = 0; k < data.length; k += 5) if (!inni(data[k], data[k + 1])) for (let q = 0; q < 5; q++) ut.push(data[k + q]); return new Float32Array(ut); };
    if (u.trær) { u.trær.gran = sil(u.trær.gran); u.trær.løv = sil(u.trær.løv); }
    if (u.smått) { u.smått.stein = sil(u.smått.stein); u.smått.busk = sil(u.smått.busk); }
  });
  function ryddTrær(R) {
    const u = R.ut; if (!u) return; const inni = innenfor(u), null16 = new Float32Array(16);
    for (const t of R.treLOD || []) for (let k = 0; k < t.n; k++) if (inni(t.data[k * 5], t.data[k * 5 + 1])) t.M.set(null16, k * 16);
    R.lodVed = null;
    const mm = new THREE.Matrix4(), v = new THREE.Vector3(), nullM = new THREE.Matrix4().makeScale(0, 0, 0);
    for (const m of [...(R.treMesh || []), ...(R.småMesh || [])]) { if (!m.isInstancedMesh || (R.treLOD || []).some(t => t.nær === m || t.fjern === m)) continue;
      let endret = false; for (let k = 0; k < m.count; k++) { m.getMatrixAt(k, mm); v.setFromMatrixPosition(mm); if (inni(v.x, v.y)) { m.setMatrixAt(k, nullM); endret = true; } }
      if (endret) m.instanceMatrix.needsUpdate = true; }
  }
  KROKER.sett3d.push((u, R) => lagLeir3d(u, R));
  // når et bygg settes opp eller blir ferdig: bare leirens nett lages på nytt (og trærne der ryddes)
  function bygg3dPåNytt(nytt) { const R = r3(); if (!R || !R.ut || !window.THREE) return; lagLeir3d(R.ut, R); if (nytt) ryddTrær(R); }
  // byggene vokser mens de bygges (oppdateres hvert sekund)
  setInterval(() => { const R = r3(); if (!R || !L) return; for (const m of mesh) { const b = L.bygg.find(q => q.id === m.userData.id); if (b && !LB.ferdig(b)) m.scale.z = Math.max(.08, LB.framdrift(b)); } }, 1000);

  // ---------- start ----------
  function start() {
    const S = spill(); leirKnapp.hidden = !S; if (!S) return;
    L = les() || LB.ny(); siste = LB.steg(L, 0, solNå()); visStatus(); bygg3dPåNytt();
  }
  window.LeirSpill = { start, tilstand: () => L, startPlassering, trykk, bekreft, prøv, plassering: () => plassering, siste: () => siste, lagre };
  // K1 sier fra når spillet er klart (lagret spill lest inn, eller ny leir satt opp)
  window.addEventListener('riksbrudd-spill', start);
})();
