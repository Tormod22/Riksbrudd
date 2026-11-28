/* STATISTIKK – innsamling og grafer (G3 del 1, 28. nov; reglene i spill/statistikk.js). window.StatistikkSpill.
 *  - Samler tall per spilldøgn mens spillet går (KROKER.sim): prøver hvert 10. spillminutt (moral, helse, folk, arbeider, syke, om
 *    byggejobbene står stille, og egne kilder fra leggTilKilde), byggejobber som blir ferdige, og ved døgnskiftet penger inn/ut per post
 *    (PengerSpill – dagboka over inn og ut), kassa og tettsteder per side. 30 døgn huskes per leir i «riksbrudd-statistikk».
 *  - Panelet #statistikk («Statistikk» i fanen Mål i Leir-menyen): én graf om gangen (velg med knappene), mørk stil, lesepausen gjelder.
 *  - StatistikkSpill.graf(el, hva) tegner en graf i et hvilket som helst element (panelet «Selskapet» kan bruke den i fanen Oversikt).
 *  - StatistikkSpill.leggTilKilde(id, () => tall, { navn, enhet, graf }) gir en ny serie (maskiner, «hvorfor saga sto» kommer slik i Ø1/F3).
 * Innsamlingen er bare lesing – den endrer ikke spillet, så den går også i testene.
 */
(function () {
  'use strict';
  if (typeof document === 'undefined' || typeof KROKER === 'undefined' || !window.Statistikk) return;
  const St = window.Statistikk, R = St.REGLER, NØKKEL = 'riksbrudd-statistikk';
  const el = (t, a = {}, ...barn) => { const e = document.createElement(t); for (const [k, v] of Object.entries(a)) { if (k === 'klasse') e.className = v; else e.setAttribute(k, v); } e.append(...barn); return e; };
  const Sp = () => (window.OppstartSpill ? OppstartSpill.tilstand() : null);
  const leirId = () => { const s = Sp(); return s && s.leir ? Math.round(s.leir.x) + ',' + Math.round(s.leir.y) : ''; };
  let S = null, klar = false, akk = 0, jobbFør = null, lagreTid = 0;
  const KILDER = new Map();

  function lagre() { if (!S) return; try { localStorage.setItem(NØKKEL, JSON.stringify({ ...S, leir: leirId() })); } catch (e) { /* fullt eller sperret */ } }
  function start() {
    const s = Sp(); if (!s || !s.leir) return; let d = null;
    try { d = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); } catch (e) { d = null; }
    S = d && d.leir === leirId() ? St.fra(d) : St.ny();
    // dagboka over inn og ut husker de siste døgnene: ta dem med når statistikken er ny (bare pengene – resten fantes ikke da)
    const nå = St.døgnNr(tid);
    if (!Object.keys(S.dager).length && window.PengerSpill && PengerSpill.døgn) for (let n = Math.max(1, nå - R.døgn); n < nå; n++) { const D = PengerSpill.døgn(n); if (D && (D.inn || D.ut)) S.dager[n] = { d: n, inn: D.inn, ut: D.ut, p: { ...D.p } }; }
    jobbFør = null; akk = R.prøveHver; klar = true; lagre();
  }
  window.addEventListener('riksbrudd-spill', () => setTimeout(start, 0));

  // ---------- det som leses fra spillet ----------
  function folkTall() {
    const F = window.FolkSpill && FolkSpill.tilstand ? FolkSpill.tilstand() : null, FR = window.FolkRegler; if (!F || !Array.isArray(F.personer)) return {};
    const P = F.personer, n = P.length, af = p => (FR && FR.arbeidsfør ? FR.arbeidsfør(p) : p.helse >= .4);
    return { moral: Number.isFinite(F.moral) ? F.moral : undefined, helse: n ? P.reduce((s, p) => s + (Number.isFinite(p.helse) ? p.helse : 1), 0) / n * 100 : undefined,
      folk: n, arbeider: P.filter(p => p.oppgave !== 'fri' && af(p)).length, syke: P.filter(p => !af(p)).length };
  }
  function jobbIder() { try { const L = window.LeirSpill && LeirSpill.tilstand(); if (!L || !window.Leir || !Leir.jobber) return null; return Leir.jobber(L).map(j => j.b.id + ':' + j.hva); } catch (e) { return null; } }
  const byggFinnes = id => { const L = window.LeirSpill && LeirSpill.tilstand(), bid = String(id).split(':')[0]; return !!(L && (L.bygg || []).some(b => String(b.id) === bid)); };
  function fastNå() { try { if (window.TidaSpill && TidaSpill.øyeblikk) return TidaSpill.øyeblikk().fast ? 1 : 0; } catch (e) { /* ingen tid */ } return undefined; }
  function tettsteder() { const T = window.TETTSTEDER, ut = { tBlå: 0, tRød: 0, tGrønn: 0 }; if (!T || typeof T.values !== 'function') return {};
    for (const t of T.values()) { if (!t) continue; if (t.eier === 'blå') ut.tBlå++; else if (t.eier === 'rød') ut.tRød++; else if (t.eier === 'grønn') ut.tGrønn++; } return ut; }
  // sluttverdiene for døgn d (penger fra dagboka, kassa og tettsteder nå)
  function slutt(d) { const D = window.PengerSpill && PengerSpill.døgn ? PengerSpill.døgn(d) : null, s = Sp();
    return { ...(D ? { inn: D.inn || 0, ut: D.ut || 0, p: { ...(D.p || {}) } } : {}), kassa: s && Number.isFinite(s.penger) ? s.penger : undefined, ...tettsteder() }; }
  function prøvNå(d) {
    const v = { ...folkTall(), fast: fastNå() };
    for (const [id, k] of KILDER) { try { const x = k.fn(); if (Number.isFinite(x)) v[id] = x; } catch (e) { /* kilden svarte ikke */ } }
    St.prøve(S, d, v);
    const J = jobbIder(); if (J && jobbFør) { const n = St.ferdigeJobber(jobbFør, J, byggFinnes); if (n) St.tell(S, d, 'bygg', n); } if (J) jobbFør = J;
  }
  KROKER.sim.push(dt => {
    if (!klar || !S || !(dt > 0)) return;
    const d = St.døgnNr(tid);
    // døgnskiftet (også når tida hoppet over flere døgn): lukk det åpne døgnet med pengene for det døgnet
    if (S.åpen && S.åpen.d < d) { St.lukk(S, slutt(S.åpen.d)); lagre(); }
    akk += dt; if (akk < R.prøveHver) return; akk = 0;
    prøvNå(d);
    const nå = performance.now(); if (nå - lagreTid > 30000) { lagreTid = nå; lagre(); }
  });
  addEventListener('pagehide', lagre);

  // ---------- raden for i dag (live) og radene til grafene ----------
  function idag() { if (!S) return null; const d = St.døgnNr(tid), r = St.snitt(S.åpen && S.åpen.d === d ? S.åpen : null) || { d, bygg: 0 }; return { ...r, ...slutt(d), d }; }
  const alleRader = () => St.rader(S, idag());

  // ---------- grafen ----------
  const FARGE = { god: '#8fbf6a', dårlig: '#d8765a', nøytral: '#c9c0a8', gull: '#e0c070', blå: '#7aa6e0', rød: '#d86a5a', grønn: '#7fc07a' };
  const STIL = { bak: '#15110b', rute: 'rgba(231,220,195,.09)', tekst: '#a99f88', lys: '#e7dcc3' };
  // tegner grafen hva i elementet el (lager et lerret og en forklaring). Gir { ok, tom } – tom når det ikke finnes tall ennå.
  function graf(el0, hva, o = {}) {
    if (!el0) return { ok: false }; const G = St.GRAFER[hva]; if (!G) { el0.textContent = 'Ukjent graf.'; return { ok: false }; }
    const L = o.rader || (S ? alleRader() : []), B = Math.max(260, Math.floor(o.bredde || el0.clientWidth || 300)), H = Math.max(150, Math.floor(o.høyde || Math.min(260, B * .55)));
    const dpr = Math.min(2, window.devicePixelRatio || 1), cv = el('canvas', { width: B * dpr, height: H * dpr, role: 'img', 'aria-label': G.navn, style: `width:${B}px;height:${H}px;display:block` });
    const g = cv.getContext('2d'); g.scale(dpr, dpr); g.fillStyle = STIL.bak; g.fillRect(0, 0, B, H);
    const forkl = el('div', { klasse: 'statforkl' });
    el0.replaceChildren(cv, forkl);
    g.font = '11px sans-serif'; g.textBaseline = 'middle';
    if (G.type === 'poster') return postGraf(g, B, H, L, forkl);
    const ser = G.serier.map(id => ({ id, def: St.SERIER[id], p: St.serie(L, id) })).filter(s => s.def);
    const alle = ser.flatMap(s => s.p.map(q => q[1]));
    if (!alle.length) { g.fillStyle = STIL.tekst; g.textAlign = 'center'; g.font = '13px sans-serif'; g.fillText('Ingen tall ennå – grafen fylles døgn for døgn.', B / 2, H / 2); forkl.textContent = G.tekst; return { ok: true, tom: true }; }
    const enhet = ser[0].def.enhet, k = St.skala(Math.min(0, ...alle), G.maks ? Math.max(G.maks, ...alle) : Math.max(...alle) * 1.05);
    const d0 = L.length ? L[0].d : 1, d1 = L.length ? L[L.length - 1].d : 1, nd = Math.max(1, d1 - d0 + 1);
    g.font = '11px sans-serif'; const vY = Math.max(...k.merker.map(m => g.measureText(St.kort(m)).width)) + 10;
    const x0 = vY, x1 = B - 8, y0 = 10, y1 = H - 22, bx = (x1 - x0) / nd, Y = v => y1 - (v - k.min) / (k.maks - k.min) * (y1 - y0), X = d => x0 + (d - d0 + .5) * bx;
    // rutenett og tall på aksen
    g.textAlign = 'right'; for (const m of k.merker) { const y = Y(m); g.strokeStyle = m === 0 ? 'rgba(231,220,195,.25)' : STIL.rute; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, Math.round(y) + .5); g.lineTo(x1, Math.round(y) + .5); g.stroke(); g.fillStyle = STIL.tekst; g.fillText(St.kort(m), x0 - 5, y); }
    // døgnene langs bunnen (høyst ca. 8 merker)
    g.textAlign = 'center'; const hver = Math.max(1, Math.ceil(nd / 8));
    for (let d = d0; d <= d1; d++) if ((d - d0) % hver === 0 || d === d1) { g.fillStyle = STIL.tekst; g.fillText((d === d1 && L[L.length - 1].delvis ? 'i dag' : 'd. ' + d), X(d), H - 9); }
    if (G.type === 'søyle') {
      const n = ser.length, w = Math.max(2, Math.min(26, bx * .8 / n));
      ser.forEach((s, i) => { g.fillStyle = FARGE[s.def.farge] || FARGE.nøytral; for (const [d, v] of s.p) { const x = X(d) - (n * w) / 2 + i * w, ya = Y(Math.max(0, v)), yb = Y(Math.min(0, v)); g.globalAlpha = L.find(r => r.d === d && r.delvis) ? .5 : .9; g.fillRect(x + .5, ya, w - 1, Math.max(1, yb - ya)); } });
      g.globalAlpha = 1;
    } else {
      for (const s of ser) { const f = FARGE[s.def.farge] || FARGE.nøytral; g.strokeStyle = f; g.fillStyle = f; g.lineWidth = 2; g.beginPath(); s.p.forEach(([d, v], i) => (i ? g.lineTo(X(d), Y(v)) : g.moveTo(X(d), Y(v)))); g.stroke();
        for (const [d, v] of s.p) { g.beginPath(); g.arc(X(d), Y(v), s.p.length > 20 ? 1.8 : 3, 0, 6.283); g.fill(); } }
    }
    // forklaringen: hver serie med siste verdi
    // siste hele døgn (eller i dag når det er alt som finnes)
    const hel = new Set(L.filter(r => !r.delvis).map(r => r.d));
    forkl.replaceChildren(...ser.map(s => { const f = FARGE[s.def.farge] || FARGE.nøytral, h = s.p.filter(q => hel.has(q[0])), q = h.length ? h[h.length - 1] : s.p[s.p.length - 1];
      return el('span', {}, el('i', { style: 'background:' + f }), s.def.navn + ': ', el('b', {}, q ? St.kort(q[1], s.def.enhet || enhet) : '–'), q && !hel.has(q[0]) ? ' (i dag)' : ''); }),
      el('small', {}, G.tekst + (hel.size ? ' Tallene over gjelder døgn ' + Math.max(...hel) + '.' : '')));
    return { ok: true, tom: false };
  }
  function postGraf(g, B, H, L, forkl) {
    const P = St.poster(L).slice(0, 8);
    if (!P.length) { g.fillStyle = STIL.tekst; g.textAlign = 'center'; g.font = '13px sans-serif'; g.fillText('Ingen penger inn eller ut ennå.', B / 2, H / 2); forkl.textContent = St.GRAFER.poster.tekst; return { ok: true, tom: true }; }
    const maks = Math.max(...P.map(p => Math.max(p.inn, p.ut))) || 1, rad = (H - 12) / P.length, navnB = Math.min(130, B * .32), mid = navnB + (B - navnB - 8) / 2, halv = (B - navnB - 16) / 2;
    g.font = '12px sans-serif';
    P.forEach((p, i) => { const y = 6 + i * rad + rad / 2, h = Math.max(4, Math.min(16, rad * .6));
      g.fillStyle = STIL.lys; g.textAlign = 'left'; g.fillText(p.post.length > 18 ? p.post.slice(0, 17) + '…' : p.post, 4, y);
      if (p.ut) { const w = p.ut / maks * halv; g.fillStyle = FARGE.dårlig; g.fillRect(mid - w, y - h / 2, w, h); }
      if (p.inn) { const w = p.inn / maks * halv; g.fillStyle = FARGE.god; g.fillRect(mid, y - h / 2, w, h); } });
    g.strokeStyle = 'rgba(231,220,195,.3)'; g.beginPath(); g.moveTo(mid + .5, 2); g.lineTo(mid + .5, H - 4); g.stroke();
    const inn = P.reduce((s, p) => s + p.inn, 0), ut = P.reduce((s, p) => s + p.ut, 0);
    forkl.replaceChildren(el('span', {}, el('i', { style: 'background:' + FARGE.god }), 'Inn: ', el('b', {}, St.kort(inn, 'kr'))), el('span', {}, el('i', { style: 'background:' + FARGE.dårlig }), 'Ut: ', el('b', {}, St.kort(ut, 'kr'))),
      el('small', {}, St.GRAFER.poster.tekst + ' Største post: ' + P[0].post + '.'));
    return { ok: true, tom: false };
  }

  // ---------- panelet ----------
  const css = el('style');
  css.textContent = `#statistikk{ position:fixed; z-index:40; left:50%; top:50%; transform:translate(-50%,-50%); width:min(660px,94vw); max-height:88vh; overflow:auto; display:none; padding:10px 12px 12px; background:#1c170f; border:1px solid #c9b26a; border-radius:6px; color:var(--ink,#e7dcc3); font-size:14px; box-shadow:0 6px 24px rgba(0,0,0,.55); }
#statistikk.på{ display:block; } #statistikk .hode{ display:flex; align-items:center; gap:8px; } #statistikk .hode b{ flex:1; font-size:16px; color:#f0e2b0; }
#statistikk button{ background:#2a2318; border:1px solid var(--rule,#4a4030); color:inherit; font:inherit; cursor:pointer; border-radius:4px; min-height:34px; padding:2px 10px; font-size:13px; }
#statistikk .valg{ display:flex; flex-wrap:wrap; gap:5px; margin:8px 0; } #statistikk .valg button.på{ border-color:#c9b26a; background:#4a3f22; color:#f0e2b0; }
#statistikk .flate{ min-height:150px; } #statistikk canvas{ border:1px solid #3a3226; border-radius:4px; max-width:100%; }
.statforkl{ display:flex; flex-wrap:wrap; gap:4px 14px; margin-top:6px; font-size:13px; } .statforkl i{ display:inline-block; width:10px; height:10px; border-radius:2px; margin-right:5px; vertical-align:-1px; }
.statforkl b{ font-weight:600; color:#f0e2b0; } .statforkl small{ flex-basis:100%; color:var(--ink-dim,#a99); font-size:12.5px; }
#statistikk .sum{ margin-top:8px; font-size:13px; color:var(--ink-dim,#a99); }
body.kort #statistikk, body.smal #statistikk{ left:0; right:0; top:auto; bottom:0; transform:none; width:auto; max-height:78vh; border-radius:10px 10px 0 0; padding-bottom:calc(12px + env(safe-area-inset-bottom,0px)); }
body.kort #statistikk .valg, body.smal #statistikk .valg{ flex-wrap:nowrap; overflow-x:auto; scrollbar-width:none; }
body.kort #statistikk .valg button, body.smal #statistikk .valg button{ flex:none; }`;
  document.head.appendChild(css);
  const panel = el('div', { id: 'statistikk', role: 'dialog', 'aria-label': 'Statistikk' }); document.body.appendChild(panel);
  let åpen = false, valgt = 'penger', sistNøkkel = '', tegnTid = 0;
  try { const v = localStorage.getItem('riksbrudd-statvalg'); if (v && St.GRAFER[v]) valgt = v; } catch (e) { /* ingen lagring */ }
  function tegnPanel(tving) {
    if (!åpen) return; if (!tving && window.pekerNede && pekerNede(panel)) return;
    const L = S ? alleRader() : [], nøkkel = valgt + '|' + JSON.stringify(L) + '|' + innerWidth; if (!tving && nøkkel === sistNøkkel) return; sistNøkkel = nøkkel;
    const x = el('button', { 'aria-label': 'Lukk' }, '×'); x.onclick = lukk;
    const vb = el('div', { klasse: 'valg', role: 'tablist' });
    for (const [id, G] of Object.entries(St.GRAFER)) { const b = el('button', { 'data-graf': id, role: 'tab', 'aria-selected': String(id === valgt), klasse: id === valgt ? 'på' : '' }, G.navn); b.onclick = () => velg(id); vb.append(b); }
    const flate = el('div', { klasse: 'flate' });
    const fullt = L.filter(r => !r.delvis).length;
    panel.replaceChildren(el('div', { klasse: 'hode' }, el('b', {}, 'Statistikk'), x), vb, flate,
      el('div', { klasse: 'sum' }, (fullt ? `${fullt} hele døgn er med (høyst ${R.døgn}). ` : 'Det første døgnet er ikke ferdig ennå. ') + '«I dag» er døgnet så langt (svakere søyle).'));
    graf(flate, valgt, { bredde: Math.min(636, panel.clientWidth - 26) });
  }
  function velg(id) { if (!St.GRAFER[id]) return false; valgt = id; try { localStorage.setItem('riksbrudd-statvalg', id); } catch (e) { /* ingen lagring */ } tegnPanel(true); return true; }
  function åpne(id) { if (id) valgt = St.GRAFER[id] ? id : valgt; åpen = true; panel.classList.add('på'); tegnPanel(true); }
  function lukk() { åpen = false; panel.classList.remove('på'); }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && åpen) lukk(); });
  setInterval(() => { if (åpen && performance.now() - tegnTid > 2000) { tegnTid = performance.now(); try { tegnPanel(); } catch (e) { console.error(e); } } }, 500);
  addEventListener('resize', () => { if (åpen) tegnPanel(true); });
  // lesepausen (spill/paneler.js lastes etter denne fila): farten går ned til 1× mens du leser grafene i 600×
  window.addEventListener('riksbrudd-spill', () => setTimeout(() => { if (window.Paneler && Paneler.LESEPAUSE && !Paneler.LESEPAUSE.paneler.includes('statistikk')) Paneler.LESEPAUSE.paneler.push('statistikk'); }, 0));

  // ---------- Leir-menyen (fanen Mål) ----------
  (window.LEIR_MENY = window.LEIR_MENY || []).push((hode, { el: e2, knapp: kn }) => {
    hode.appendChild(e2('h3', { 'data-fane': 'mål', id: 'statmeny' }, 'Statistikk'));
    const L = S ? alleRader() : [], f = L.filter(r => !r.delvis).length;
    hode.appendChild(e2('div', { klasse: 'dagbok' }, f ? `Grafer over de siste ${f} døgnene: penger inn og ut per post, kassa, moral og helse, folk i arbeid, tettsteder og bygg.` : 'Grafene fylles døgn for døgn: penger inn og ut per post, kassa, moral og helse, folk i arbeid, tettsteder og bygg.'));
    const b = kn('Vis statistikken', () => åpne()); b.id = 'statknapp'; hode.appendChild(b);
  });

  // ---------- nye serier fra andre moduler ----------
  // leggTilKilde('sagaSto', () => timer, { navn: 'Saga sto', enhet: 't', graf: 'maskiner' }) – tallet tas som snitt over døgnet
  function leggTilKilde(id, fn, o = {}) {
    if (!id || typeof fn !== 'function') return false; KILDER.set(id, { fn });
    St.leggTilSerie({ id, navn: o.navn || id, enhet: o.enhet || '', farge: o.farge, fra: r => r[id] });
    if (o.graf) { const G = St.GRAFER[o.graf]; if (G) { if (!G.serier.includes(id)) G.serier.push(id); } else St.leggTilGraf(o.graf, { navn: o.grafNavn || o.navn || o.graf, serier: [id], type: o.type || 'linje', tekst: o.tekst || '' }); }
    return true;
  }
  window.StatistikkSpill = { graf, åpne, lukk, velg, erÅpen: () => åpen, tilstand: () => S, rader: () => (S ? alleRader() : []), idag, leggTilKilde, lagre, start,
    // for testene og vakta: ta en prøve nå / lukk døgnet nå
    prøvNå: () => { if (S) prøvNå(St.døgnNr(tid)); }, lukkNå: () => (S && S.åpen ? St.lukk(S, slutt(S.åpen.d)) : null) };
})();
