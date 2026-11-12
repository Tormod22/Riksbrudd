'use strict';
// Materialer fra verden i kartet og 3D (regler: spill/ressurser.js). I Leir-menyen: «Hogst …» (trykk i skogen der det skal hogges, velg
// størrelsen på feltet) og «Riv hus …» (trykk på et forlatt hus). Panelet viser hva det gir, hvor lang tid arbeidet og frakten tar, og
// hva det koster å kjøpe like mye. Arbeidet gjøres av folk på oppgavene 'hogst'/'riving' (window.Folk; uten Folk to på hver), frakten
// av folk på 'frakt' til fots eller av en lastebil (oppdrag type 'ressurs'). Materialene legges i leirens lager (Leir.leggInn).
// 2D: hogstfelt (lysbrun flate med stubber), ruiner der husene er revet, haugene. 3D: trærne forsvinner etter hvert som det hogges
// (stubber igjen), revne hus er borte (window.HUS_BORT, lest av hus3d og finnBygg i index.html) og står som ruin med grunnmur og steinhaug.
// Lagres i nettleseren («riksbrudd-ressurser»).
(function () {
  const RS = Ressurser, NØKKEL = 'riksbrudd-ressurser', r3 = () => (typeof R3 !== 'undefined' ? R3 : null);
  let R = RS.ny(), velg = null, valgt = null, akk = 0, sistTegn = 0, sistFram = new Map();
  window.HUS_BORT = new Set();
  const spill = () => window.OppstartSpill && OppstartSpill.tilstand();
  const leirXY = () => { const S = spill(); return S && S.leir ? { x: S.leir.x, y: S.leir.y } : null; };
  const L = () => window.LeirSpill && LeirSpill.tilstand();
  const lagre = () => { try { localStorage.setItem(NØKKEL, RS.tilJSON(R)); } catch (e) { /* privat vindu */ } };
  const les = () => { try { return RS.fraJSON(localStorage.getItem(NØKKEL)); } catch (e) { return null; } };
  const oppdaterBort = () => { window.HUS_BORT = RS.revetSett(R); };
  const folk = o => (window.Folk ? Folk.arbeidere(o) : RS.REGLER.reserve), tempo = o => (window.Folk && Folk.tempo ? Folk.tempo(o) : 1);
  const tall = v => (Math.round(v * 10) / 10).toLocaleString('nb-NO');
  const matTekst = m => RS.MAT.filter(k => (m[k] || 0) >= .05).map(k => `${tall(m[k])} ${Leir.MATERIALER[k].enhet} ${Leir.MATERIALER[k].navn.toLowerCase()}`).join(', ') || 'ingenting';
  const timer = t => (!isFinite(t) ? 'aldri (ingen folk)' : t < 1 ? `${Math.max(1, Math.round(t * 60))} min` : `${tall(t)} t`);
  const hash = (x, y) => { let n = (Math.round(x * 10) * 73856093) ^ (Math.round(y * 10) * 19349663); n = Math.imul(n ^ (n >>> 13), 0x5bd1e995); n ^= n >>> 15; return (n >>> 0) / 4294967296; };
  const pip = (P, x, y) => { let inn = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) inn = !inn; return inn; };
  const ledigBil = () => (window.KJORETOY || []).find(k => k.side === 'blå' && k.type === 'lastebil' && k.antall && !k.oppdrag && !(window.Forsyning && Forsyning.drivstoff(k) <= 0));

  // ---------- stil og panelet ----------
  const css = document.createElement('style');
  css.textContent = `#ressursvalg{ position:fixed; left:50%; transform:translateX(-50%); bottom:calc(70px + env(safe-area-inset-bottom,0px)); z-index:11; display:none; background:var(--panel);
  border:1px solid var(--hover); padding:10px 14px; color:var(--ink); max-width:min(600px,94vw); max-height:46vh; overflow-y:auto; text-align:center; box-sizing:border-box; }
#ressursvalg.på{ display:block; } #ressursvalg small{ color:var(--ink-dim); display:block; margin-top:2px; line-height:1.35; }
#ressursvalg button, #leirmeny .ressurs button{ background:#2a2318; border:1px solid var(--rule); color:var(--ink); min-height:40px; padding:4px 12px; cursor:pointer; font:inherit; margin:6px 3px 0; }
#ressursvalg button.på{ border-color:var(--hover); color:var(--hover); } #ressursvalg button:disabled{ opacity:.45; cursor:default; }
#leirmeny .ressurs{ font-size:13.5px; } #leirmeny .ressurs .jobb{ margin:3px 0; color:var(--ink); } #leirmeny .ressurs button{ margin:2px 4px 2px 0; min-height:34px; padding:2px 10px; font-size:13px; }
body.kort #ressursvalg{ bottom:calc(6px + env(safe-area-inset-bottom,0px)); padding:6px 8px; font-size:13px; max-height:44vh; } body.kort #ressursvalg button{ min-height:34px; padding:2px 8px; margin:4px 2px 0; }`;
  document.head.appendChild(css);
  const el = (tag, eg = {}, ...barn) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(eg)) { if (k === 'klasse') e.className = v; else e.setAttribute(k, v); } e.append(...barn); return e; };
  const kn = (t, f, eg = {}) => { const b = el('button', { type: 'button', ...eg }, t); b.onclick = f; return b; };
  const banner = el('div', { id: 'ressursvalg', role: 'dialog', 'aria-label': 'Materialer fra verden' }); document.body.appendChild(banner);
  const lukk = () => { velg = null; valgt = null; banner.classList.remove('på'); skitten = true; };

  // Leir-menyen: egen del «Materialer fra verden» (krok LEIR_MENY i leir-visning.js)
  (window.LEIR_MENY = window.LEIR_MENY || []).push(hode => {
    if (!leirXY()) return;
    const d = el('div', { klasse: 'ressurs' }, el('h3', {}, 'Materialer fra verden'),
      el('div', { klasse: 'igang' }, `Hogg skog og riv forlatte hus innen ${RS.REGLER.maksAvstand / 1000} km fra leiren i stedet for å kjøpe. Folk: ${folk('hogst')} på hogst, ${folk('riving')} på riving, ${folk('frakt')} på frakt.`),
      kn('Hogst …', () => startVelg('hogst'), { id: 'r-hogst' }), kn('Riv hus …', () => startVelg('riving'), { id: 'r-riv' }));
    for (const j of R.jobber) d.appendChild(el('div', { klasse: 'jobb' }, jobbLinje(j), ' ', kn('Vis', () => { visJobb(j.id); })));
    hode.appendChild(d);
  });
  function jobbLinje(j) {
    const navn = j.type === 'hogst' ? `Hogst (${j.r} m)` : `Riving: ${husNavn(j.hus)}`, f = RS.fram(j), h = RS.iHaug(j);
    return `${navn} – ${j.stoppet ? 'stoppet' : f >= 1 ? 'arbeidet er ferdig' : `${Math.round(f * 100)} %` + (folk(j.type) ? '' : ` – venter: ingen har oppgaven «${j.type}» (sett noen i Folk)`)}${h > .05 ? `, ${tall(h)} venter på frakt` : ''}${j.bil ? ` (${j.bil})` : ''}`;
  }
  const husNavn = h => ((typeof BYGGTYPE !== 'undefined' && BYGGTYPE[h.t]) || 'Bygg').toLowerCase();
  function startVelg(type) {
    if (window.LeirSpill) LeirSpill.avbryt();
    const m = document.getElementById('leirmeny'), k = document.getElementById('leirknapp'); if (m && m.classList.contains('på') && k) k.click();
    velg = { type, r: 35, frakt: 'fots', x: null }; valgt = null; visVelg();
  }
  function visVelg() {
    const v = velg; banner.innerHTML = ''; banner.classList.add('på');
    if (v.x === null) banner.append(el('div', {}, v.type === 'hogst' ? 'Trykk i skogen der det skal hogges.' : 'Trykk på et forlatt hus som skal rives.'));
    else {
      banner.append(el('div', {}, el('b', {}, v.type === 'hogst' ? `Hogstfelt, ${v.r} m radius` : `Rive ${v.hus ? husNavn(v.hus) : 'huset'}`), v.feil ? ` – ${v.feil}` : ` – ${matTekst(v.ut.mat)}`));
      if (!v.feil) { const n = folk(v.type) * tempo(v.type), fk = v.frakt === 'lastebil' ? null : RS.fotsTimer(RS.sum(v.ut.mat), v.avst, folk('frakt') * tempo('frakt'));
        banner.append(el('small', {}, `Arbeid: ${tall(v.ut.timer)} arbeidstimer – med ${folk(v.type)} på ${v.type} ca. ${timer(n > 0 ? v.ut.timer / n : Infinity)}` + (v.type === 'riving' ? ` · ${tall(v.areal)} m² grunnflate` : ` · ${Math.round(v.skog * 100)} % skog`)),
          el('small', {}, `Frakt ${Math.round(v.avst)} m: ` + (v.avst <= RS.REGLER.nær ? 'bæres rett i lageret' : v.frakt === 'lastebil' ? `med ${v.bil ? v.bil.navn : 'lastebil'}` : `til fots med ${folk('frakt')} på frakt ca. ${timer(fk)}`)),
          el('small', {}, `Å kjøpe like mye koster ${Leir.kroner(RS.kjøpsverdi(v.ut.mat, Leir.MATERIALER))}.`)); }
      if (v.type === 'hogst') for (const r of RS.REGLER.hogst.radier) banner.append(kn(`${r} m`, () => { v.r = r; prøv(); }, v.r === r ? { klasse: 'på' } : {}));
      if (!v.feil && v.avst > RS.REGLER.nær) { const bil = ledigBil();
        banner.append(kn(v.frakt === 'lastebil' ? 'Frakt: lastebil' : 'Frakt: til fots', () => { v.frakt = v.frakt === 'lastebil' ? 'fots' : 'lastebil'; v.bil = v.frakt === 'lastebil' ? ledigBil() : null; visVelg(); }, bil || v.frakt === 'lastebil' ? {} : { disabled: '', title: 'Ingen ledig lastebil' })); }
      if (!v.feil) banner.append(kn(v.type === 'hogst' ? 'Start hogst' : 'Start riving', start, { id: 'r-start' }));
    }
    banner.append(kn('Avbryt', lukk)); skitten = true;
  }
  // Hvor mye av feltet som er skog (32 m-rutene i kartet) og ikke hogd eller i et annet hogstfelt fra før – punkter hver 4. m
  async function skogAndel(x, y, r) {
    const v = await lagVindu([x - r - 40, y - r - 40, x + r + 40, y + r + 40], false, 9); let n = 0, s = 0;
    for (let dy = -r; dy <= r; dy += 4) for (let dx = -r; dx <= r; dx += 4) { if (dx * dx + dy * dy > r * r) continue; n++; const X = x + dx, Y = y + dy;
      if (!RS.ledigSkog(R, X, Y, hash(X, Y))) continue;
      const [i, j] = Terreng.rute(v, X, Y); if (i >= 0 && j >= 0 && i < v.w && j < v.h && v.K[j * v.w + i] === 1) s++; }
    return n ? s / n : 0;
  }
  async function prøv() {
    const v = velg, lx = leirXY(); if (!v || v.x === null) return visVelg();
    if (v.type === 'hogst') { v.skog = await skogAndel(v.x, v.y, v.r); if (velg !== v) return; v.ut = RS.hogstUtbytte(v.r, v.skog); v.avst = lx ? Math.hypot(v.x - lx.x, v.y - lx.y) : 0;
      v.feil = !lx ? 'Sett opp leiren først.' : v.avst > RS.REGLER.maksAvstand ? `For langt fra leiren (${tall(v.avst / 1000)} km, høyst ${RS.REGLER.maksAvstand / 1000} km).` : v.skog < RS.REGLER.hogst.minSkog ? (v.skog > 0 ? 'For lite skog igjen her.' : 'Det er ikke skog her.') : null; }
    else { let b = null; try { b = await finnBygg(v.x, v.y); } catch (e) { b = null; } if (velg !== v) return;
      if (!b) { v.hus = null; v.feil = 'Fant ikke noe hus her.'; return visVelg(); }
      v.hus = { i: b.o.e.i, P: b.P.slice(0, -1), t: b.o.e.t, h: b.o.e.h || 6 }; v.areal = RS.areal(v.hus.P); const c = RS.midt(v.hus.P); v.avst = lx ? Math.hypot(c.x - lx.x, c.y - lx.y) : 0;
      v.ut = RS.husUtbytte(v.hus.t, v.areal, v.hus.h); v.feil = !lx ? 'Sett opp leiren først.' : v.ut.feil || (v.avst > RS.REGLER.maksAvstand ? `For langt fra leiren (${tall(v.avst / 1000)} km, høyst ${RS.REGLER.maksAvstand / 1000} km).` : null)
        || (R.jobber.some(j => j.hus && j.hus.i === v.hus.i) ? 'Huset rives allerede.' : null); }
    if (v.frakt === 'lastebil' && !v.bil) { v.bil = ledigBil(); if (!v.bil) v.frakt = 'fots'; }
    visVelg();
  }
  function start() {
    const v = velg; if (!v || v.feil) return; const lx = leirXY();
    const r = v.type === 'hogst' ? RS.startHogst(R, { x: v.x, y: v.y, r: v.r, skog: v.skog }, lx) : RS.startRiving(R, v.hus, lx);
    if (r.feil) { v.feil = r.feil; return visVelg(); }
    const j = r.jobb; logg(`${v.type === 'hogst' ? 'Hogst' : 'Riving'} startet: gir ${matTekst(j.mat)}${folk(v.type) ? '' : ` – men ingen har oppgaven «${v.type}»`}.`);
    if (v.frakt === 'lastebil' && v.bil && j.avst > RS.REGLER.nær) sendBil(v.bil, j.id);
    lagre(); lukk(); bygg3dDel();
  }
  function sendBil(kj, id) {
    window.lastVegnett().then(g => { const r = RS.lastebil(R, kj, id, g, Kjoretoy, leirXY()); logg(r.feil ? `${kj.navn}: ${r.feil}` : `${kj.navn} frakter materialene til leiren.`); lagre(); skitten = true; }).catch(() => {});
  }
  // Panelet for en jobb (trykk på feltet eller huset, eller «Vis» i menyen)
  function visJobb(id) {
    const j = RS.finn(R, id); if (!j) { valgt = null; banner.classList.remove('på'); return; } valgt = id; velg = null;
    banner.innerHTML = ''; banner.classList.add('på'); const n = folk(j.type) * tempo(j.type);
    banner.append(el('div', {}, el('b', {}, j.type === 'hogst' ? `Hogstfelt (${j.r} m)` : `Riving: ${husNavn(j.hus)}`), ' – ' + jobbLinje(j).split(' – ')[1]),
      el('small', {}, `Gir ${matTekst(j.mat)}; levert ${matTekst(j.levert)}.` + (j.gjort < j.arbeid && !j.stoppet ? ` Igjen: ${timer(RS.timerMed(j, n))} med ${folk(j.type)} på ${j.type}.` : '')));
    if (j.avst > RS.REGLER.nær && RS.iHaug(j) > .05 && j.frakt !== 'lastebil') { const b = ledigBil(); banner.append(kn(b ? `Send ${b.navn}` : 'Ingen ledig lastebil', () => { sendBil(b, j.id); visJobb(j.id); }, b ? {} : { disabled: '' })); }
    if (!j.stoppet && j.gjort < j.arbeid) banner.append(kn('Stopp arbeidet', () => { RS.avbryt(R, j.id); lagre(); bygg3dDel(); logg('Arbeidet er stoppet; det som er gjort, fraktes fortsatt hjem.'); visJobb(j.id); }));
    banner.append(kn('Lukk', lukk)); skitten = true;
  }

  // ---------- trykk i kartet og i 3D ----------
  function trykk(X, Y) {
    if (velg) { velg.x = X; velg.y = Y; prøv(); return true; }
    const j = R.jobber.find(q => (q.type === 'hogst' ? Math.hypot(X - q.x, Y - q.y) < q.r : pip(q.hus.P, X, Y)));
    if (j && !(window.LeirSpill && LeirSpill.plassering())) { visJobb(j.id); return true; }
    if (valgt) { valgt = null; banner.classList.remove('på'); }
    return false;
  }
  KROKER.trykk.unshift(trykk); KROKER.trykk3d.unshift(trykk);
  window.addEventListener('keydown', e => { if ((velg || valgt) && e.key === 'Escape') lukk(); });

  // ---------- tiden ----------
  KROKER.sim.push(dt => {
    if (!spill() || !L()) return; const lx = leirXY(), Lr = L(), leggInn = (k, m) => Leir.leggInn(Lr, k, m);
    const hend = RS.steg(R, dt, { arbeidere: folk, tempo, leir: lx, leggInn });
    for (const k of window.KJORETOY || []) if (k.oppdrag && k.oppdrag.type === 'ressurs') hend.push(...RS.bilSteg(R, k, window.VEGNETT, dt * 3600 / TIME, Kjoretoy, lx, leggInn).map(h => ({ ...h, bil: k })));
    let endret = false;
    for (const h of hend) {
      if (h.hva === 'ferdig') { endret = true; logg(h.jobb.type === 'hogst' ? `Hogstfeltet er hogd: ${matTekst(h.jobb.mat)}.` : `${husNavn(h.jobb.hus)[0].toUpperCase() + husNavn(h.jobb.hus).slice(1)} er revet: ${matTekst(h.jobb.mat)}.`);
        if (h.jobb.type === 'riving') { oppdaterBort(); husPåNytt(); } }
      if (h.hva === 'fullt' && !h.jobb.meldtFullt) { h.jobb.meldtFullt = true; logg('Lageret i leiren er fullt: materialene venter. Bygg lagertelt eller containere.'); }
      if (h.hva === 'levert') h.jobb.meldtFullt = false;
      if (h.hva === 'feil') logg(`${h.bil.navn}: ${h.melding}`);
      if (h.hva === 'slutt') logg(`${h.bil.navn} er ferdig med frakten.`);
      if (h.hva === 'tømt') endret = true;
    }
    // trærne forsvinner etter hvert: 3D ryddes for hver 5 % framdrift
    for (const j of R.jobber) if (j.type === 'hogst') { const f = Math.floor(RS.fram(j) * 20); if (sistFram.get(j.id) !== f) { sistFram.set(j.id, f); ryddHogst(); } }
    akk += dt; if (akk >= 10 || endret) { akk = 0; lagre(); }
    if (performance.now() - sistTegn > 1000) { sistTegn = performance.now(); skitten = true; if (valgt && !pekerNede(document.getElementById('ressursvalg'))) visJobb(valgt); oppdaterHauger(); }
  });
  if (window.KJ_TEKST) KJ_TEKST.push(k => RS.bilTekst(k));

  // ---------- kartet ----------
  KROKER.tegn.push((g, vx0, vy1) => {
    const m = kam.m, sx = X => (X - vx0) / m, sy = Y => (vy1 - Y) / m, ute = (x, y, r) => sx(x + r) < -20 || sx(x - r) > VW + 20 || sy(y - r) < -20 || sy(y + r) > VH + 20;
    const stubber = (x, y, r, andel) => { if (m > 1.5) return; g.fillStyle = '#6b5a3c'; const st = Math.max(3, 4 * m);
      for (let dy = -r; dy <= r; dy += st) for (let dx = -r; dx <= r; dx += st) { const X = x + dx + (hash(x + dx, y + dy) - .5) * st, Y = y + dy + (hash(y + dy, x + dx) - .5) * st;
        if (!RS.iFelt({ x, y, r }, X, Y) || hash(X, Y) > andel * .6) continue; g.beginPath(); g.arc(sx(X), sy(Y), Math.max(1, .35 / m), 0, 6.283); g.fill(); } };
    // det ujevne omrisset av feltet (RS.kant)
    const omriss = f => { g.beginPath(); for (let k = 0; k <= 48; k++) { const a = k / 48 * 6.283, rr = f.r * RS.kant(f, a); const X = sx(f.x + Math.cos(a) * rr), Y = sy(f.y + Math.sin(a) * rr); k ? g.lineTo(X, Y) : g.moveTo(X, Y); } g.closePath(); };
    const felt = (x, y, r, andel, aktiv) => { if (ute(x, y, r)) return; g.save(); omriss({ x, y, r });
      g.fillStyle = `rgba(150,136,94,${.2 + .5 * andel})`; g.fill(); if (aktiv) { g.setLineDash([5, 4]); g.strokeStyle = '#f0d79a'; g.lineWidth = 1.6; g.stroke(); } g.restore(); stubber(x, y, r, andel); };
    for (const f of R.hogd) felt(f.x, f.y, f.r, f.andel === undefined ? 1 : f.andel, false);
    for (const j of R.jobber) if (j.type === 'hogst') felt(j.x, j.y, j.r, RS.fram(j), true);
    const poly = (P, fyll, strek, stipl) => { g.save(); g.beginPath(); P.forEach(([x, y], i) => (i ? g.lineTo(sx(x), sy(y)) : g.moveTo(sx(x), sy(y)))); g.closePath();
      if (fyll) { g.fillStyle = fyll; g.fill(); g.strokeStyle = fyll; g.lineWidth = 3; g.stroke(); } if (strek) { if (stipl) g.setLineDash([4, 3]); g.strokeStyle = strek; g.lineWidth = 1.5; g.stroke(); } g.restore(); };
    // ruinene dekker huset i kartflisene: grus, brutt grunnmur og steinhaug
    for (const q of R.revet) { const c = RS.midt(q.P); if (ute(c.x, c.y, 60)) continue; poly(q.P, '#a59d8a', '#6f685c', true);
      if (m < 1.5) { g.fillStyle = '#7d766a'; const A = RS.areal(q.P), n = Math.min(40, Math.max(4, A / 12)); for (let k = 0; k < n; k++) { const a = hash(q.i, k) * 6.283, d = Math.sqrt(hash(k, q.i)) * Math.sqrt(A) * .3;
        g.beginPath(); g.arc(sx(c.x + Math.cos(a) * d), sy(c.y + Math.sin(a) * d), Math.max(1.2, .6 / m), 0, 6.283); g.fill(); } } }
    for (const j of R.jobber) if (j.type === 'riving') poly(j.hus.P, null, j.id === valgt ? '#f0d79a' : '#e8a25a', true);
    // haugene som venter på frakt, og prosent/navn nær
    for (const j of R.jobber) { if (ute(j.x, j.y, 10)) continue; const h = RS.iHaug(j);
      if (h > .05) { g.fillStyle = '#8a6a3e'; g.strokeStyle = '#2a2318'; g.lineWidth = 1; g.beginPath(); g.rect(sx(j.x) - 5, sy(j.y) - 4, 10, 8); g.fill(); g.stroke(); }
      if (m < 2.5) { const t = (j.type === 'hogst' ? 'hogst ' : 'riving ') + (j.stoppet ? 'stoppet' : `${Math.round(RS.fram(j) * 100)} %`) + (h > .05 ? ` · ${tall(h)} i haug` : '');
        g.font = '12px sans-serif'; g.textAlign = 'center'; g.fillStyle = '#f2ead6'; g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 3; g.strokeText(t, sx(j.x), sy(j.y) - 9); g.fillText(t, sx(j.x), sy(j.y) - 9); } }
    // det som velges nå
    const v = velg; if (v && v.x !== null) { const ok = !v.feil;
      if (v.type === 'hogst') { g.save(); g.beginPath(); g.arc(sx(v.x), sy(v.y), v.r / m, 0, 6.283); g.fillStyle = ok ? 'rgba(110,200,105,.3)' : 'rgba(224,96,74,.3)'; g.fill(); g.strokeStyle = ok ? '#7fd17a' : '#e0604a'; g.lineWidth = 2; g.stroke(); g.restore(); }
      else if (v.hus) poly(v.hus.P, ok ? 'rgba(110,200,105,.35)' : 'rgba(224,96,74,.35)', ok ? '#7fd17a' : '#e0604a'); }
  });

  // ---------- 3D ----------
  // u.trær: [x, y, z, h, d] per tre i utsnittets meter; ett tre er hogd når det ligger i et hogd felt (eller et påbegynt felt, etter framdriften)
  const hogdLokal = u => (x, y) => RS.erHogd(R, x + u.cx, y + u.cy, hash(x + u.cx, y + u.cy));
  const sisteU = [];
  const krok3d = async (u, d) => {
    // bare det siste utsnittet huskes (testene slår det opp): fire gamle utsnitt holdt flere hundre MB i minnet (12. nov)
    sisteU[0] = u; u.stubber = []; const er = hogdLokal(u), stor = u.S + 60, nær = q => Math.abs(q.x - u.cx) < stor + (q.r || 60) && Math.abs(q.y - u.cy) < stor + (q.r || 60);
    const felt = [...R.hogd, ...R.jobber.filter(j => j.type === 'hogst')].filter(nær);
    if (felt.length && u.trær) for (const k in u.trær) { const a = u.trær[k], ut = [];
      for (let q = 0; q < a.length; q += 5) { if (er(a[q], a[q + 1])) { if (u.stubber.length < 3 * (VW < 900 ? 1500 : 4000)) u.stubber.push(a[q], a[q + 1], a[q + 2]); continue; } for (let s = 0; s < 5; s++) ut.push(a[q + s]); }
      u.trær[k] = new Float32Array(ut); }
    if (felt.length && u.smått && u.smått.busk) { const a = u.smått.busk, ut = []; for (let q = 0; q < a.length; q += 5) if (!er(a[q], a[q + 1])) for (let s = 0; s < 5; s++) ut.push(a[q + s]); u.smått.busk = new Float32Array(ut); }
    // bakken: hogstflate (lyng, kvist og bar) og grus der husene er revet
    const px = d && d.px, TW = d && d.TW; if (!px) return; const mpp = 2 * u.S / TW, X0 = u.cx - u.S, Y1 = u.cy + u.S;
    for (const f of felt) { const andel = f.type === 'hogst' ? RS.fram(f) : f.andel === undefined ? 1 : f.andel; if (andel < .05) continue;
      const i0 = Math.max(0, Math.floor((f.x - f.r - X0) / mpp)), i1 = Math.min(TW - 1, Math.ceil((f.x + f.r - X0) / mpp)), j0 = Math.max(0, Math.floor((Y1 - f.y - f.r) / mpp)), j1 = Math.min(TW - 1, Math.ceil((Y1 - f.y + f.r) / mpp));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const X = X0 + (i + .5) * mpp, Y = Y1 - (j + .5) * mpp, dd = Math.hypot(X - f.x, Y - f.y) / (f.r * RS.kant(f, Math.atan2(Y - f.y, X - f.x))); if (dd > 1) continue;
        // hogstflate: mørk lyng og gras med flekker av kvist og bar, myk kant
        const q = (j * TW + i) * 4, n = hash(Math.floor(X * 2), Math.floor(Y * 2)), n2 = hash(Math.floor(X / 3), Math.floor(Y / 3)), kvist = n > .8, w = Math.min(1, (1 - dd) * 5) * (.3 + .45 * andel);
        const c = kvist ? [70, 58, 40] : n2 > .55 ? [88, 82, 54] : [74, 78, 48];
        for (let s = 0; s < 3; s++) px[q + s] += (c[s] - px[q + s]) * w; } }
    for (const q of R.revet) { const c = RS.midt(q.P); if (Math.abs(c.x - u.cx) > stor || Math.abs(c.y - u.cy) > stor) continue;
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const [x, y] of q.P) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      const M = 2.5; for (let j = Math.max(0, Math.floor((Y1 - y1 - M) / mpp)); j <= Math.min(TW - 1, Math.ceil((Y1 - y0 + M) / mpp)); j++) for (let i = Math.max(0, Math.floor((x0 - M - X0) / mpp)); i <= Math.min(TW - 1, Math.ceil((x1 + M - X0) / mpp)); i++) {
        const X = X0 + (i + .5) * mpp, Y = Y1 - (j + .5) * mpp, inn = pip(q.P, X, Y), n = hash(Math.floor(X * 3), Math.floor(Y * 3)); let w = inn ? .95 : 0;
        if (!inn) { let dmin = Infinity; for (let a = 0; a < q.P.length; a++) { const [ax, ay] = q.P[a], [bx, by] = q.P[(a + 1) % q.P.length], vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy || 1, t = Math.max(0, Math.min(1, ((X - ax) * vx + (Y - ay) * vy) / l2)); dmin = Math.min(dmin, Math.hypot(ax + vx * t - X, ay + vy * t - Y)); }
          w = dmin < M ? .8 * (1 - dmin / M) : 0; }
        if (!w) continue; const p = (j * TW + i) * 4, c = n > .7 ? [92, 88, 80] : [112, 106, 94]; for (let s = 0; s < 3; s++) px[p + s] += (c[s] - px[p + s]) * w; } }
  };
  KROKER.bygg3d.push(krok3d);
  let nett = [];
  function fjern3d(R3_) { for (const m of nett) { R3_.scene.remove(m); m.geometry.dispose(); if (m.userData.egetMat) m.material.dispose(); } nett = []; }
  // Ruinene: brutt grunnmur rundt omrisset (betong- og stålbygg står høyere), og en steinhaug inne i tomta. Ett samlet nett.
  function ruiner(u, R3_) {
    const M = window.MODELLER; if (!M) return null; const d = [], stor = u.S + 60;
    const boks = (x, y, z, sx, sy, sz, rot, c) => { const g = new THREE.BoxGeometry(sx, sy, sz).toNonIndexed(); g.translate(0, 0, sz / 2); g.rotateZ(rot); g.translate(x, y, z); const n = g.attributes.position.count, f = new Float32Array(n * 3); for (let i = 0; i < n; i++) f.set(c, i * 3); g.setAttribute('color', new THREE.BufferAttribute(f, 3)); d.push(g); };
    for (const q of R.revet) { const c = RS.midt(q.P); if (Math.abs(c.x - u.cx) > stor || Math.abs(c.y - u.cy) > stor) continue;
      const tung = q.gruppe !== 'tre', mur = [.5, .49, .46], z0 = P => (hoyde3d(P[0], P[1], u) - u.h0) * R3_.EX;
      for (let a = 0; a < q.P.length; a++) { const A = q.P[a], B = q.P[(a + 1) % q.P.length], l = Math.hypot(B[0] - A[0], B[1] - A[1]); if (l < .5) continue;
        const ret = Math.atan2(B[1] - A[1], B[0] - A[0]), n = Math.max(1, Math.round(l / 2.5));
        for (let s = 0; s < n; s++) { const t = (s + .5) / n, x = A[0] + (B[0] - A[0]) * t, y = A[1] + (B[1] - A[1]) * t, h = hash(x, y), hh = (tung ? .5 + h * h * 2.2 : .35 + h * .5);
          if (h < .12) continue; boks(x - u.cx, y - u.cy, z0([x, y]) - .8, l / n * (h < .25 ? .6 : 1.02), .3, hh + .8, ret, mur.map(v => v * (.85 + h * .25))); } }
      const A = RS.areal(q.P), k = Math.min(36, Math.max(6, Math.round(A / 8))), zc = z0([c.x, c.y]), fc = tung ? [.55, .53, .5] : [.42, .34, .25];
      for (let s = 0; s < k; s++) { const a = hash(q.i, s) * 6.283, r = Math.sqrt(hash(s, q.i)) * Math.sqrt(A) * .32, x = c.x + Math.cos(a) * r, y = c.y + Math.sin(a) * r, h = hash(x, y);
        if (!pip(q.P, x, y)) continue; const z = 1 - r / (Math.sqrt(A) * .45); boks(x - u.cx, y - u.cy, zc - .2, .6 + h * 1.4, .4 + h * .9, .3 + Math.max(0, z) * 1.3 * h, h * 6, fc.map(v => v * (.8 + h * .4))); } }
    if (!d.length) return null; const m = new THREE.Mesh(M.samle(d, .2), M.materiale()); m.userData.ruin = true; return m;
  }
  // Stubber der det er hogd (InstancedMesh) og tømmerstabler ved haugene
  function stubber(u) {
    const s = u.stubber || [], n = s.length / 3; if (!n) return null;
    const g = new THREE.CylinderGeometry(.17, .23, .55, 7); g.rotateX(Math.PI / 2); g.translate(0, 0, .2);
    const m = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ color: 0x7a6142 }), n), mm = new THREE.Matrix4();
    for (let k = 0; k < n; k++) { const h = hash(s[k * 3], s[k * 3 + 1]), sk = .8 + h * .6; mm.makeScale(sk, sk, .7 + h * .6); mm.setPosition(s[k * 3], s[k * 3 + 1], s[k * 3 + 2]); m.setMatrixAt(k, mm); }
    m.userData.egetMat = true; m.frustumCulled = false; return m;
  }
  function hauger(u, R3_) {
    const M = window.MODELLER; if (!M) return null; const d = [];
    for (const j of R.jobber) { const h = RS.iHaug(j); if (h < .3 || Math.abs(j.x - u.cx) > u.S || Math.abs(j.y - u.cy) > u.S) continue;
      const z = (hoyde3d(j.x, j.y, u) - u.h0) * R3_.EX, x = j.x - u.cx + (j.type === 'hogst' ? j.r * .6 : 0), y = j.y - u.cy, tre = j.haug.tre / h, rader = Math.min(6, Math.max(1, Math.round(Math.sqrt(h))));
      for (let r = 0; r < rader; r++) for (let k = 0; k < rader - r + 2; k++) {
        const g = new THREE.CylinderGeometry(.22, .22, 4.5, 7).toNonIndexed(); g.rotateZ(Math.PI / 2); const c = tre > .5 ? [.55, .42, .27] : [.52, .5, .47];
        g.translate(x + (k - (rader - r + 1) / 2) * .46, y, z + .22 + r * .4); const n = g.attributes.position.count, f = new Float32Array(n * 3); for (let i = 0; i < n; i++) f.set(c, i * 3); g.setAttribute('color', new THREE.BufferAttribute(f, 3)); d.push(g); } }
    if (!d.length) return null; const m = new THREE.Mesh(M.samle(d), M.materiale()); m.userData.haug = true; return m;
  }
  function sett(u, R3_) {
    fjern3d(R3_); for (const f of [ruiner, stubber, hauger]) { let m = null; try { m = f(u, R3_); } catch (e) { console.error(e); } if (m) { R3_.scene.add(m); nett.push(m); } }
  }
  KROKER.sett3d.push((u, R3_) => sett(u, R3_));
  let sistHaug = '';
  function oppdaterHauger() { const R3_ = r3(); if (!R3_ || !R3_.ut || !window.THREE) return; const k = R.jobber.map(j => Math.round(RS.iHaug(j))).join(); if (k === sistHaug) return; sistHaug = k;
    const i = nett.findIndex(m => m.userData.haug); if (i >= 0) { R3_.scene.remove(nett[i]); nett[i].geometry.dispose(); nett.splice(i, 1); } const m = hauger(R3_.ut, R3_); if (m) { R3_.scene.add(m); nett.push(m); } }
  // Trærne i scenen som nå er hogd, tas bort (som ryddTrær i leir-visning.js), og stubbene legges inn
  function ryddHogst() {
    const R3_ = r3(); if (!R3_ || !R3_.ut || !window.THREE || R3_.bygger) return; const u = R3_.ut, er = hogdLokal(u), null16 = new Float32Array(16); u.stubber = u.stubber || [];
    for (const t of R3_.treLOD || []) for (let k = 0; k < t.n; k++) { const x = t.data[k * 5], y = t.data[k * 5 + 1]; if (t.M[k * 16 + 15] !== 0 && er(x, y)) { t.M.set(null16, k * 16); u.stubber.push(x, y, t.data[k * 5 + 2]); } }
    R3_.lodVed = null;
    const mm = new THREE.Matrix4(), v = new THREE.Vector3(), nullM = new THREE.Matrix4().makeScale(0, 0, 0);
    for (const m of [...(R3_.treMesh || []), ...(R3_.småMesh || [])]) { if (!m.isInstancedMesh || (R3_.treLOD || []).some(t => t.nær === m || t.fjern === m)) continue;
      let endret = false; for (let k = 0; k < m.count; k++) { m.getMatrixAt(k, mm); v.setFromMatrixPosition(mm); if (mm.elements[0] !== 0 && er(v.x, v.y)) { m.setMatrixAt(k, nullM); endret = true; } }
      if (endret) m.instanceMatrix.needsUpdate = true; }
    const i = nett.findIndex(m => m.isInstancedMesh); if (i >= 0) { R3_.scene.remove(nett[i]); nett[i].geometry.dispose(); nett[i].material.dispose(); nett.splice(i, 1); }
    const m = stubber(u); if (m) { R3_.scene.add(m); nett.push(m); } skitten = true;
  }
  // et revet hus: hele utsnittet bygges på nytt (husene er ett samlet nett), som når en bru sprenges (odeleggelse-visning.js)
  function husPåNytt() { const R3_ = r3(); if (typeof på3d !== 'undefined' && på3d && R3_ && R3_.ut && !R3_.bygger) nytt3dUtsnitt(R3_.ut.cx + R3_.bane.x, R3_.ut.cy + R3_.bane.y, R3_.ut.S); }
  function bygg3dDel() { const R3_ = r3(); if (R3_ && R3_.ut && window.THREE) { ryddHogst(); sistHaug = ''; oppdaterHauger(); } }

  // ---------- start ----------
  function startSpill() { R = les() || RS.ny(); oppdaterBort(); sistFram = new Map(); }
  startSpill();
  window.addEventListener('riksbrudd-spill', startSpill);
  window.RessursSpill = { tilstand: () => R, sett: n => { R = n; oppdaterBort(); lagre(); }, startVelg, trykk, prøv, start, visJobb, lukk, velg: () => velg, lagre, les,
    skogAndel, ryddHogst, krok3d, sisteU: (cx, cy) => sisteU.find(u => cx === undefined || (u.cx === cx && u.cy === cy)) || null, ruinTrekanter: u => { const m = ruiner(u, r3()); if (!m) return 0; const n = m.geometry.attributes.position.count / 3; m.geometry.dispose(); return n; }, sjekk3d: () => ({ nett: nett.length, stubber: (r3() && r3().ut && r3().ut.stubber || []).length / 3, ruiner: nett.some(m => m.userData.ruin) }) };
})();
