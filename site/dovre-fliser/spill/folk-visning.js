'use strict';
// Leirens folk (regler: spill/folk.js). «Folk» i Leir-menyen åpner panelet: moral, senger, mat, varme og helse, hva som mangler,
// kjøp mat og rekruttering, oppgavene med − / + (to på «bygg» = ett byggelag), og hvem som finnes. Øverst: antall folk (⚠ når noe mangler).
// Byggene virker gjennom folket: vakttårn med vakt gir egne lag i nærheten lengre sikt (KROKER.sikt) og flere treff (KROKER.ild), og
// vaktene ser fiender nær leiren (KROKER.ser); sandsekkvollen gir lagene bak den færre treff; sykestua med folk på «stell» leger sårede
// soldater i lagene ved leiren. Kjøkkenet er et nytt bygg (3D-modellen MODELLER.kjøkken lages her).
// Folket lagres i leiren (L.folk i «riksbrudd-k2»). window.Folk er avtalen med de andre delene: arbeidere(oppgave), tempo(oppgave), liste().
(function () {
  const FR = FolkRegler, LB = Leir;
  let F = null, åpen = false, visFolk = false, alleMangler = false, akk = 0, sist = 0, vist = '';
  const L = () => (window.LeirSpill ? LeirSpill.tilstand() : null);
  const spill = () => window.OppstartSpill && OppstartSpill.tilstand();
  const nf = (v, d = 0) => v.toLocaleString('nb-NO', { maximumFractionDigits: d });
  const årstid = () => (window.VAER && VAER.årstid) || 'sommer';
  // senger i egenbygde rom (spill/byggesett.js, del 2), hvis de finnes – men ikke når Leir.plasser allerede har dem med
  // (byggesett.js legger rommene inn i Leir.plasser; før ble de telt to ganger)
  function ekstraSenger() { if (LB.plasser && LB.plasser.byggesett) return 0; try { const r = window.Byggesett && Byggesett.rom ? Byggesett.rom() : null; return Array.isArray(r) ? r.reduce((s, q) => s + (+q.senger || 0), 0) : 0; } catch (e) { return 0; } }
  const valg = () => ({ årstid: årstid(), mangler: window.LeirSpill ? LeirSpill.siste().mangler : new Set(), ekstraSenger: ekstraSenger() });

  // ---------- stil ----------
  const css = document.createElement('style');
  css.textContent = `#folkmeny{ position:fixed; left:10px; top:calc(var(--topp,58px) + 6px); bottom:calc(60px + env(safe-area-inset-bottom,0px)); width:min(370px, calc(100vw - 20px));
  box-sizing:border-box; z-index:7; display:none; background:var(--panel); border:1px solid var(--rule); color:var(--ink); overflow-y:auto; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; touch-action:pan-y; padding:10px 12px 12px; }
#folkmeny.på{ display:block; }
#folkmeny h2{ margin:0; font-family:"IM Fell English",serif; font-weight:400; font-size:22px; }
#folkmeny h3{ margin:10px 0 3px; font-size:14px; color:var(--hover); font-weight:600; }
#folkmeny button{ background:#2a2318; border:1px solid var(--rule); color:var(--ink); min-height:38px; padding:4px 10px; cursor:pointer; font:inherit; }
#folkmeny button:disabled{ opacity:.45; cursor:default; }
#folkmeny .lukk{ float:right; min-height:36px; border:none; background:none; font-size:22px; }
#folkmeny .tilbake{ float:right; min-height:32px; font-size:13px; margin-right:4px; }
#folkmeny .status{ font-size:14px; color:var(--ink-dim); line-height:1.45; margin-top:4px; }
#folkmeny .moral{ display:flex; align-items:center; gap:8px; margin:6px 0 2px; font-size:14px; }
#folkmeny .moral .strek{ flex:1; height:9px; background:#3a3226; position:relative; }
#folkmeny .moral .strek i{ position:absolute; left:0; top:0; bottom:0; }
#folkmeny .mangler{ font-size:13px; color:#e8a46a; margin:2px 0; line-height:1.35; }
#folkmeny .rad{ display:flex; gap:6px; flex-wrap:wrap; margin-top:6px; }
#folkmeny .opp{ display:grid; grid-template-columns:1fr 40px 26px 40px; align-items:center; gap:4px; padding:3px 0; border-bottom:1px solid #3a3226; }
#folkmeny .opp b{ font-weight:600; font-size:14.5px; } #folkmeny .opp small{ display:block; color:var(--ink-dim); font-size:12px; line-height:1.25; }
#folkmeny .opp span.n{ text-align:center; font-size:16px; font-weight:600; }
#folkmeny .opp button{ min-height:38px; padding:0; font-size:19px; }
#folkmeny .person{ font-size:13px; padding:3px 0; border-bottom:1px solid #2e281e; line-height:1.3; } #folkmeny .person small{ color:var(--ink-dim); }
#folkmeny .person.syk{ color:#e8a46a; }
body.kort #folkmeny{ top:calc(var(--topp,44px) + 4px); bottom:calc(6px + env(safe-area-inset-bottom,0px)); left:calc(8px + env(safe-area-inset-left,0px)); padding:8px 10px 10px; }
body.kort #folkmeny h2{ font-size:19px; } body.kort #folkmeny .opp button{ min-height:34px; } body.kort #folkmeny .opp{ grid-template-columns:1fr 36px 24px 36px; }`;
  document.head.appendChild(css);
  const el = (tag, eg = {}, ...barn) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(eg)) { if (k === 'klasse') e.className = v; else e.setAttribute(k, v); } e.append(...barn); return e; };
  const knapp = (t, f, eg = {}) => { const b = el('button', { type: 'button', ...eg }, t); b.onclick = f; return b; };
  const panel = el('div', { id: 'folkmeny', role: 'dialog', 'aria-label': 'Folk' }); document.body.appendChild(panel);
  const st = el('div', {}, el('b', { id: 'sFolk' }, '–'), ' ', el('span', {}, 'folk')); st.hidden = true; document.querySelector('.stats').appendChild(st);

  // ---------- panelet ----------
  function åpne(på) {
    åpen = på === undefined ? !åpen : !!på; panel.classList.toggle('på', åpen);
    if (åpen) { const lm = document.getElementById('leirmeny'), lk = document.getElementById('leirknapp'); if (lm && lm.classList.contains('på') && lk) lk.click(); vis(); }
  }
  // Hva som mangler, med hva du kan gjøre
  function mangler(B) {
    const ut = [], s = F.sist || {};
    if (B.utenSeng) ut.push(`${B.utenSeng} sover i telt: bygg en brakke (eller oppgrader).`);
    if (s.sult) ut.push('Tom for mat! Kjøp mat eller bygg drivhus.'); else if (B.dager < 2) ut.push(`Maten varer under ${B.dager < 1 ? 'ett døgn' : 'to døgn'}: kjøp mat eller bygg drivhus.`);
    if (s.kald > .05) ut.push('Folk fryser: legg inn ved (tre) eller drivstoff' + (B.utenSeng ? ', og bygg brakker.' : '.'));
    if (!B.kjøkken) ut.push(B.ferdige('kjøkken') ? 'Kjøkkenet har ikke strøm: maten lages på bål.' : 'Ingen kjøkken: maten lages på bål (bygg et kjøkken for varm mat og mindre svinn).');
    else if (!B.bemannet) ut.push('Kjøkkenet står tomt: sett noen på «kjøkken».');
    if (B.syke && !FR.arbeidere(F, 'stell')) ut.push(`${B.syke} er syke eller skadet: sett noen på «stell»${B.sykestue ? '' : B.ferdige('sykestue') ? ' (sykestua har ikke strøm)' : ' (best med sykestue)'}.`);
    if (FR.arbeidere(F, 'verksted') && !B.verksted) ut.push(B.ferdige('verksted') ? 'Verkstedet har ikke strøm.' : 'Folk på «verksted» trenger et verksted med strøm.');
    if (B.tårn > B.bemannedeTårn) ut.push(`${B.tårn - B.bemannedeTårn} vakttårn står ubemannet: sett flere på «vakt».`);
    if (!FR.arbeidere(F, 'bygg')) ut.push('Ingen på «bygg»: ingenting blir bygget.');
    if (FR.nød(F)) ut.unshift(F.personer.length ? `Bare ${F.personer.length} igjen i gjengen: rekrutter flere (ingen krav om seng når dere er færre enn tre).` : 'Gjengen er tom: rekrutter nye folk (de første tre trenger ikke seng).');
    return ut;
  }
  function vis() {
    if (!åpen) return; const rulle = panel.scrollTop; panel.innerHTML = '';
    const Lr = L(); if (!F || !Lr) { panel.append(knapp('×', () => åpne(false), { klasse: 'lukk', 'aria-label': 'Lukk' }), el('h2', {}, 'Folk'), el('div', { klasse: 'status' }, 'Start et spill først.')); return; }
    const B = FR.behov(F, Lr, valg()), s = F.sist || {}, n = F.personer.length, pil = F.mål > F.moral + 1 ? ' ↑' : F.mål < F.moral - 1 ? ' ↓' : '';
    const farge = F.moral >= 60 ? '#7fb06a' : F.moral >= 35 ? '#d6b25a' : '#d0684a';
    panel.append(knapp('×', () => åpne(false), { klasse: 'lukk', 'aria-label': 'Lukk' }), knapp('‹ Leiren', () => { åpne(false); const lk = document.getElementById('leirknapp'); if (lk) lk.click(); }, { klasse: 'tilbake' }),
      el('h2', {}, `Folk (${n})`));
    const strek = el('span', { klasse: 'strek' }, el('i', { style: `width:${Math.round(F.moral)}%;background:${farge}` }));
    panel.append(el('div', { klasse: 'moral' }, el('span', {}, `Moral ${Math.round(F.moral)}${pil}`), strek));
    const varme = B.fyring ? (s.kald > .05 ? 'mangler' : `${nf(B.ved, 1)} m³ ved eller ${nf(B.drivstoff)} l per døgn`) : 'trengs ikke nå';
    const sh = F.personer.reduce((a, p) => a + p.helse, 0) / Math.max(1, n);
    const linjer = [`Senger: ${Math.min(n, B.senger)} av ${n}` + (B.senger > n ? ` (${B.senger - n} ledige)` : ''),
      `Mat: ${nf(F.mat)} rasjoner` + (B.dager === Infinity ? ' (drivhusene holder)' : ` (ca. ${nf(B.dager, 1)} døgn)`) + (B.drivhus ? ` · drivhus +${nf(B.drivhus, 1)}/døgn` : '') + (B.varmMat ? ' · varm mat' : ''),
      `Varme: ${varme}`, `Helse: ${n ? Math.round(sh * 100) + ' %' : '–'}` + (B.syke ? ` · ${B.syke} syke/skadet` : '') + (B.sykestue ? ' · sykestue' : ''),
      `Vakttårn: ${B.bemannedeTårn} av ${B.tårn} bemannet` + (F.borte ? ` · ${F.borte} har forlatt gjengen` : '')];
    // lav skjerm (telefon): status som ett avsnitt og høyst to ting som mangler, så oppgavene synes uten å bla langt
    const kort = document.body.classList.contains('kort'), mg = mangler(B);
    panel.append(kort ? el('div', { klasse: 'status' }, linjer.join(' · ')) : el('div', { klasse: 'status' }, ...linjer.flatMap((t, i) => (i ? [el('br'), t] : [t]))));
    for (const t of kort && !alleMangler ? mg.slice(0, 2) : mg) panel.append(el('div', { klasse: 'mangler' }, t));
    if (kort && !alleMangler && mg.length > 2) { const m = el('div', { klasse: 'mangler', style: 'cursor:pointer;text-decoration:underline' }, `… og ${mg.length - 2} til`); m.onclick = () => { alleMangler = true; vis(); }; panel.append(m); }
    const matN = 50, kjøp = knapp(`Kjøp ${matN} rasjoner (${LB.kroner(matN * FR.R.matPris)})`, () => { const r = FR.kjøpMat(F, matN, OppstartSpill.betal); logg(r.feil || `Kjøpte ${r.rasjoner} rasjoner mat for ${LB.kroner(r.pris)}.`); lagre(); vis(); }, { id: 'kjøpmat' });
    const rek = knapp(`Rekrutter (${LB.kroner(FR.R.rekruttPris)})`, () => { const r = FR.rekrutter(F, Lr, OppstartSpill.betal, valg());
      logg(r.feil || `${r.person.navn} (${r.person.yrke}) er med i gjengen` + (r.nød ? ` og går på «${FR.OPPGAVE[r.person.oppgave].navn.toLowerCase()}»` + (r.pris ? '.' : ' (gratis: kassa er tom).') : '.')); lagre(); vis(); visStatus(); }, { id: 'rekrutter' });
    // færre enn tre i gjengen: rekruttering er alltid mulig (FR.kanRekruttere), så spillet ikke låser seg
    const hvorfor = FR.kanRekruttere(F, Lr, valg()); rek.disabled = !!hvorfor; if (hvorfor) rek.title = hvorfor;
    panel.append(el('div', { klasse: 'rad' }, kjøp, rek));
    // oppgavene: − antall +
    panel.append(el('h3', {}, 'Oppgaver'));
    for (const o of FR.OPPGAVER) {
      const antall = F.personer.filter(p => p.oppgave === o).length, a = FR.arbeidere(F, o), t = FR.tempo(F, o), O = FR.OPPGAVE[o];
      const info = o === 'bygg' ? `${FR.byggelag(F)} byggelag` + (a ? ` · tempo ${nf(FR.byggTempo(F), 2)}` : '') : o === 'fri' ? O.tekst : a ? `tempo ${nf(t, 2)} · ${O.tekst.toLowerCase()}` : O.tekst;
      const minus = knapp('−', () => { FR.minus(F, o); endret(); }, { 'aria-label': `Færre på ${O.navn.toLowerCase()}`, 'data-o': o, klasse: 'minus' });
      const pluss = knapp('+', () => { FR.pluss(F, o); endret(); }, { 'aria-label': `Flere på ${O.navn.toLowerCase()}`, 'data-o': o, klasse: 'pluss' });
      minus.disabled = !antall; pluss.disabled = o === 'fri' ? n - antall === 0 : antall === n;
      panel.append(el('div', { klasse: 'opp' }, el('div', {}, el('b', {}, O.navn), el('small', {}, info + (antall > a ? ` · ${antall - a} syke` : ''))), minus, el('span', { klasse: 'n' }, String(antall)), pluss));
    }
    // folkene
    panel.append(el('div', { klasse: 'rad' }, knapp(visFolk ? `Skjul folkene` : `Vis folkene (${n})`, () => { visFolk = !visFolk; vis(); }, { id: 'visfolk' })));
    if (visFolk) for (const p of F.personer) {
      const best = Object.entries(p.ferd).sort((a, b) => b[1] - a[1])[0];
      panel.append(el('div', { klasse: 'person' + (p.helse < FR.R.arbeidsfør ? ' syk' : '') }, `${p.navn}, ${p.alder} – ${FR.OPPGAVE[p.oppgave].navn.toLowerCase()}`,
        el('small', {}, ` · ${p.yrke}, best på ${FR.OPPGAVE[best[0]].navn.toLowerCase()} · helse ${Math.round(p.helse * 100)} %${p.seng ? '' : ' · telt'}`)));
    }
    panel.scrollTop = rulle;
  }
  function endret() { lagre(); vis(); visStatus(); skitten = true; }
  const lagre = () => { if (window.LeirSpill) LeirSpill.lagre(); };
  function visStatus() {
    st.hidden = !F; if (!F) return; const Lr = L(), B = Lr ? FR.behov(F, Lr, valg()) : null;
    const varsel = B && (B.utenSeng || (F.sist && (F.sist.sult || F.sist.kald > .05)) || B.dager < 1 || F.moral < 35);
    const t = `${F.personer.length}` + (varsel ? ' ⚠' : ''); if (t !== vist) { vist = t; document.getElementById('sFolk').textContent = t; }
    st.title = `Moral ${Math.round(F.moral)}`;
  }
  // Raden i Leir-menyen (leir-visning.js kaller denne)
  function menyRad() {
    const n = F ? F.personer.length : 0;
    return el('div', { style: 'margin-top:6px' }, knapp(F ? `Folk (${n}) – moral ${Math.round(F.moral)} ›` : 'Folk', () => åpne(true), { id: 'folkknapp' }));
  }

  // ---------- tiden ----------
  const meldt = new Map();
  KROKER.sim.push(dt => {
    const Lr = L(); if (!F || !Lr || !spill()) return;
    akk += dt;
    if (akk >= 1) { const r = FR.steg(F, Lr, akk, valg()); akk = 0;
      for (const h of r.hendelser) logg(h); if (r.hendelser.length) lagre(); }
    soldater(dt); vakter();
    if (performance.now() - sist > 1000) { sist = performance.now(); visStatus(); vis(); forsvarNå = null; }
  });
  // sykestua med folk på «stell» leger sårede soldater i egne lag innen 150 m (fra 50 % til helt på ca. 5 timer)
  function soldater(dt) {
    const Lr = L(), stell = FR.arbeidere(F, 'stell'); if (!stell) return;
    const ss = Lr.bygg.filter(b => b.type === 'sykestue' && LB.virker(b) && !LeirSpill.siste().mangler.has(b.id)); if (!ss.length) return;
    const fart = .1 * FR.tempo(F, 'stell') * Math.min(2, stell) * dt / 60;
    for (const s of ENHETER) { if (s.side !== 'blå' || !ss.some(b => Math.hypot(b.x - s.x, b.y - s.y) < 150)) continue;
      for (const m of s.menn) if (m.hp > 0 && m.hp < 1) { m.hp = Math.min(1, m.hp + fart); if (m.hp >= 1) logg(`${m.navn} (${s.navn}) er ferdig stelt på sykestua.`); } }
  }
  // vaktene melder fiender nær leiren (én gang i timen per fiende)
  function vakter() {
    const S = spill(), f = forsvar(); if (!f.varsling || !S || !S.leir) return;
    for (const e of ENHETER) { if (e.side === 'blå' || !levende(e)) continue; const d = Math.hypot(e.x - S.leir.x, e.y - S.leir.y);
      if (d < f.varsling && !(meldt.get(e) > tid - 60)) { meldt.set(e, tid); logg(`Vakta melder: ${e.navn} ${nf(Math.round(d / 10) * 10)} m fra leiren!`); } }
  }

  // ---------- forsvar: vakttårn og sandsekker ----------
  let forsvarNå = null;
  const forsvar = () => { const Lr = L(); if (!F || !Lr) return { tårn: [], sekker: [], varsling: 0 }; return forsvarNå || (forsvarNå = FR.forsvar(F, Lr)); };
  const nær = (liste, s, r) => liste.some(b => Math.hypot(b.x - s.x, b.y - s.y) < r);
  KROKER.sikt.push(s => (s.side === 'blå' && nær(forsvar().tårn, s, 150) ? 1.25 : 1));
  KROKER.ild.push((a, b) => {
    let f = 1; if (a.side === 'blå' && nær(forsvar().tårn, a, 100)) f *= 1.2;
    if (b.side === 'blå' && nær(forsvar().sekker, b, 15)) f *= .6; return f;
  });
  KROKER.ser.push(e => { const S = spill(), f = forsvar(); return !!(f.varsling && S && S.leir && e.side !== 'blå' && Math.hypot(e.x - S.leir.x, e.y - S.leir.y) < f.varsling); });

  // ---------- 3D: kjøkkenet (rødmalt trehus med pipe og tak over døra) ----------
  if (window.MODELLER) MODELLER.kjøkken = function () {
    const d = [], hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
    const farg = (g, c) => { if (g.index) g = g.toNonIndexed(); if (!g.attributes.normal) g.computeVertexNormals(); const n = g.attributes.position.count, f = new Float32Array(n * 3); for (let i = 0; i < n; i++) f.set(c, i * 3); g.setAttribute('color', new THREE.BufferAttribute(f, 3)); g.deleteAttribute('uv'); return g; };
    const boks = (x, y, z, sx, sy, sz, c, ry) => { const g = new THREE.BoxGeometry(sx, sy, sz); g.translate(0, 0, sz / 2); if (ry) g.rotateY(ry); g.translate(x, y, z); d.push(farg(g, hex(c))); };
    boks(0, 0, 0, 7.2, 9.2, .25, '#8f8d87');
    boks(-.4, 0, .25, 5.6, 8.4, 2.6, '#7d2f25');
    for (const y of [-2.6, 0, 2.6]) { boks(2.42, y, 1.1, .08, 1.1, .9, '#1f2b33'); boks(2.43, y, 1.05, .06, 1.25, .08, '#e4e1d8'); boks(2.43, y, 2.02, .06, 1.25, .08, '#e4e1d8'); }
    for (const y of [-2.2, 2.2]) boks(-3.22, y, 1.1, .08, 1.1, .9, '#1f2b33');
    boks(2.44, -1.3, .25, .08, 1, 2, '#4f4132');
    // saltak (mønet langs y) og takutstikk
    for (const sd of [-1, 1]) { const g = new THREE.BoxGeometry(3.5, 9.0, .16); g.translate(0, 0, .08); g.rotateY(sd * .52); g.translate(-.4 + sd * 1.48, 0, 3.67); d.push(farg(g, hex('#2a2c2e'))); }
    // gavlene (trekanter, begge sider)
    for (const sd of [-1, 1]) { const y = sd * 4.2, h = 1.6, A = [-3.2, y, 2.85], Bp = [2.4, y, 2.85], C = [-.4, y, 2.85 + h];
      for (const P of [[A, Bp, C], [A, C, Bp]]) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P.flat()), 3)); g.computeVertexNormals(); d.push(farg(g, hex('#7d2f25'))); } }
    // pipe og røykhette, tak over døra med to stolper, benk og bord ute
    boks(-1.8, 2.4, 3, .5, .5, 2.1, '#5e6366'); boks(-1.8, 2.4, 5.1, .75, .75, .12, '#3c3d3e');
    boks(3.05, -1.3, 2.35, 1.3, 2.2, .1, '#4f4132'); for (const y of [-2.25, -.35]) boks(3.55, y, .25, .12, .12, 2.1, '#6e5b45');
    boks(3.05, 2.2, .25, .9, 2.2, .75, '#8a7457'); boks(3.05, 2.2, 1, 1.1, 2.4, .07, '#8a7457');
    return MODELLER.samle(d, .22);
  };

  // ---------- start ----------
  function start() {
    const Lr = L(); if (!Lr || !spill()) { F = null; visStatus(); return; }
    // samme frø per leir (fra leirens plass), så en ny leir et annet sted får andre folk
    const S = spill(), frø = S.leir ? (Math.round(S.leir.x) * 31 + Math.round(S.leir.y)) >>> 0 : 1987;
    F = (Lr.folk && FR.fraJSON(Lr.folk)) || FR.ny(frø); Lr.folk = F; meldt.clear(); forsvarNå = null; lagre(); visStatus(); vis();
  }
  window.addEventListener('riksbrudd-spill', start);
  window.FolkSpill = { start, åpne, vis, menyRad, tilstand: () => F, valg, forsvar: () => forsvar() };
  // Avtalen med de andre delene (byggesett, materialer): tåler at spillet ikke er startet (da 0)
  window.Folk = {
    arbeidere: o => (F ? FR.arbeidere(F, o) : 0),
    tempo: o => (F ? FR.tempo(F, o) : 0),
    liste: () => (F ? F.personer : []),
    moral: () => (F ? F.moral : 0),
    byggelag: () => (F ? FR.byggelag(F) : 0),
    OPPGAVER: FR.OPPGAVER,
  };
})();
