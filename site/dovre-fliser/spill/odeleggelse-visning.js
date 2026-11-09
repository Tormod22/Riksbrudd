'use strict';
// S5 i kartet: ingeniørlag sprenger bruer og sperrer tunneler og ferjekaier – og reparerer dem (regler: spill/odeleggelse.js).
// Et sprengt/sperret objekt sperres i vegnettet; kjøretøy som er underveis over det, kjører om eller stopper.
// Kroker: KROKER.lagKnapper (knapper i lagpanelet), KROKER.info (knapper i infrastrukturpanelet), trykk, sim, tegn, tegn3d, lagTekst.
(function () {
  const O = Odeleggelse, R = O.REGLER, T = O.ny(), ARB = new Map(), RØYK = new Map(), TYPER = ['bru', 'tunnel', 'ferjekai'];
  let velg = null;   // { s, hva } mens spilleren velger objekt på kartet
  window.INFRA_TILSTAND = T; window.INGENIØRARBEID = ARB;
  window.S5 = { start: (...a) => start(...a), endring: (...a) => endring(...a), ferjeFor: id => ferjeFor(id) };   // for sjekk.js
  const ing = nyttLag('Ingeniørlag 1', 198750, 6897060, 'blå'); ing.ingeniør = true; ENHETER.push(ing);
  window.nyttIngeniørlag = (navn, x, y) => { const s = nyttLag(navn, x, y, 'blå'); s.ingeniør = true; ENHETER.push(s); return s; };

  const navnPå = o => o.e.navn || (INFRA_NAVN[o.lag] + ' uten navn').toLowerCase().replace(/^./, c => c.toUpperCase());
  const finnObj = (lag, id) => INFRA && INFRA[lag] ? INFRA[lag].find(o => o.e.id === id) : null;
  // Nærmeste punkt på objektet (portal, brukar, kai) fra (X, Y): [x, y, avstand].
  function nærmest(o, X, Y) {
    let best = [o.deler[0][0], o.deler[0][1], Infinity];
    for (const a of o.deler) {
      if (a.length === 2) { const d = Math.hypot(a[0] - X, a[1] - Y); if (d < best[2]) best = [a[0], a[1], d]; continue; }
      for (let i = 2; i < a.length; i += 2) { const ax = a[i - 2], ay = a[i - 1], vx = a[i] - ax, vy = a[i + 1] - ay, l2 = vx * vx + vy * vy || 1,
        t = Math.max(0, Math.min(1, ((X - ax) * vx + (Y - ay) * vy) / l2)), px = ax + vx * t, py = ay + vy * t, d = Math.hypot(px - X, py - Y);
        if (d < best[2]) best = [px, py, d]; }
    }
    return best;
  }
  // Midten av en linje (etter lengde) og retningen der: [x, y, vinkel, lengde].
  function midten(a) {
    let L = 0; for (let i = 2; i < a.length; i += 2) L += Math.hypot(a[i] - a[i - 2], a[i + 1] - a[i - 1]);
    let s = L / 2;
    for (let i = 2; i < a.length; i += 2) { const l = Math.hypot(a[i] - a[i - 2], a[i + 1] - a[i - 1]);
      if (s <= l || i === a.length - 2) { const f = l ? Math.min(1, s / l) : 0; return [a[i - 2] + (a[i] - a[i - 2]) * f, a[i - 1] + (a[i + 1] - a[i - 1]) * f, Math.atan2(a[i + 1] - a[i - 1], a[i] - a[i - 2]), L]; }
      s -= l; }
    return [a[0], a[1], 0, 0];
  }
  // Ferjesambandene som går fra en kai: endepunkt innen 1 km.
  function ferjeFor(kaiId) {
    const k = finnObj('ferjekai', kaiId); if (!k || !INFRA.ferje) return [];
    const [kx, ky] = k.deler[0];
    return INFRA.ferje.filter(f => f.deler.some(a => Math.hypot(a[0] - kx, a[1] - ky) < 1000 || Math.hypot(a[a.length - 2] - kx, a[a.length - 1] - ky) < 1000)).map(f => f.e.id);
  }
  const ingeniører = () => ENHETER.filter(s => s.ingeniør && s.side === 'blå' && levende(s) && !Terreng.slattUt(s.menn));

  // ---------- arbeid ----------
  function start(s, o, hva) {
    const r = O.nyttArbeid(T, o, hva); if (r.feil) { logg(r.feil); return; }
    const før = ARB.get(s); if (før) { O.avbryt(T, før.a); ARB.delete(s); }
    const [px, py, d] = nærmest(o, s.x, s.y), w = { a: r.arbeid, o, X: px, Y: py, venter: false, påbegynt: false };
    ARB.set(s, w);
    const gjør = hva === 'ødelegg' ? O.verb(o.lag) : 'reparere', t = Math.round(r.arbeid.total / 360) / 10;
    logg(`${s.navn} skal ${gjør} ${navnPå(o)} (${nf.format(t)} t arbeid${d > R.radius * .8 ? ', marsjerer dit først' : ''}).`);
    if (d > R.radius * .8) { w.venter = true; ordre(s, px, py, true).finally(() => { w.venter = false; }); }
    if (valgt === s) visPanel(); skitten = true;
  }
  function stopp(s, grunn) {
    const w = ARB.get(s); if (!w) return; O.avbryt(T, w.a); ARB.delete(s);
    if (grunn) logg(`${s.navn}: ${grunn}`); endring(false);
  }
  // Vegnettet følger tilstandene; kjøretøy med sperret veg foran seg kjører om eller stopper.
  function endring(vegnett = true) {
    skitten = true; if (valgt && valgt.ingeniør) visPanel();
    if (!vegnett) return;
    if (typeof på3d !== 'undefined' && på3d && R3 && R3.ut && !R3.bygger) nytt3dUtsnitt(R3.ut.cx + R3.bane.x, R3.ut.cy + R3.bane.y, R3.ut.S);
    lastVegnett().then(g => { O.oppdaterVegnett(T, g, ferjeFor); omkjør(g); }).catch(() => {});
  }
  function omkjør(g) {
    const sperret = g._sperretAv || new Set();
    for (const k of KJORETOY) {
      if (!k.sti || !Kjoretoy.lenkerIgjen(k).some(e => sperret.has(e))) continue;
      const P = k.sti.P, r = Kjoretoy.planlegg(k, g, [P[P.length - 2], P[P.length - 1]]);
      if (r.feil) { Kjoretoy.stopp(k); k.oppdrag = null; logg(`${k.navn}: vegen foran er sperret, og det finnes ingen omkjøring. Kolonnen stopper.`); }
      else logg(`${k.navn} kjører om: ${nf.format(r.meter / 1000)} km igjen.`);
      if (window.valgtKjoretoy && valgtKjoretoy() === k) visKjoretoy(k);
    }
  }
  KROKER.sim.push(dt => {
    const sek = dt * 3600 / TIME;
    for (const [s, w] of ARB) {
      if (!ENHETER.includes(s) || !levende(s) || Terreng.slattUt(s.menn)) { stopp(s, 'laget er slått ut – arbeidet stopper.'); continue; }
      if (w.venter || s.planlegger) continue;
      if (s.sti) { if (w.påbegynt) stopp(s, 'arbeidet er avbrutt fordi laget flyttet seg.'); continue; }
      const res = O.arbeid(T, w.a, sek, nærmest(w.o, s.x, s.y)[2]);
      if (res === 'for langt unna') { stopp(s, w.påbegynt ? 'arbeidet er avbrutt fordi laget flyttet seg.' : `kom ikke fram til ${navnPå(w.o)}.`); continue; }
      if (!w.påbegynt) { w.påbegynt = true; logg(`${s.navn} er framme og ${w.a.hva === 'ødelegg' ? 'legger sprengladninger' : 'reparerer'} på ${navnPå(w.o)}.`); skitten = true; }
      if (res === 'ferdig') {
        ARB.delete(s);
        if (w.a.hva === 'ødelegg') { RØYK.set(O.nøkkel(w.a.lag, w.a.id), tid);
          logg(`${navnPå(w.o)} er ${O.tekst(w.a.lag, 'sprengt')}. Vegen er brutt til den blir reparert.`); }
        else { RØYK.delete(O.nøkkel(w.a.lag, w.a.id)); logg(`${navnPå(w.o)} er reparert og åpen igjen.`); }
        endring();
      }
    }
  });

  // ---------- panelene ----------
  KROKER.lagTekst.push(s => {
    if (!s.ingeniør) return null;
    const w = ARB.get(s); if (!w) return 'ingeniører';
    const p = Math.round(100 * (1 - w.a.igjen / w.a.total)), gjør = w.a.hva === 'ødelegg' ? O.verb(w.o.lag) : 'reparere';
    return `ingeniører · skal ${gjør} ${navnPå(w.o)}` + (w.påbegynt ? ` (${p} %, ${nf.format(Math.round(w.a.igjen / 360) / 10)} t igjen)` : ' (på veg)');
  });
  KROKER.lagKnapper.push((s, H) => {
    if (!s.ingeniør) return;
    for (const [hva, tekst] of [['ødelegg', 'Spreng / sperr …'], ['reparer', 'Reparer …']]) {
      const på = velg && velg.s === s && velg.hva === hva;
      H.appendChild(knapp(på ? 'Velg bru, tunnel eller kai …' : tekst, på, () => {
        velg = på ? null : { s, hva };
        if (velg) { if (!INFRA) logg('Infrastrukturen er ikke lastet ennå.'); else logg(hva === 'ødelegg' ? 'Trykk på en bru, en tunnel eller en ferjekai som skal sprenges eller sperres.' : 'Trykk på en sprengt bru eller sperret tunnel/kai som skal repareres.'); }
        visPanel(); skitten = true; }));
    }
    if (ARB.has(s)) H.appendChild(knapp('Avbryt arbeidet', false, () => { stopp(s, 'arbeidet er avbrutt.'); visPanel(); }));
  });
  // Infrastrukturpanelet: tilstand og «Spreng»/«Reparer» med nærmeste ledige ingeniørlag (virker også i 3D).
  KROKER.info.push((o, H) => {
    if (!TYPER.includes(o.lag)) return;
    const t = O.tilstand(T, o.lag, o.e.id), sub = document.getElementById('psub');
    if (t !== 'hel') sub.textContent += ' · ' + O.tekst(o.lag, t).toUpperCase();
    const lag = ingeniører(); if (!lag.length) return;
    const [mx, my] = nærmest(o, lag[0].x, lag[0].y), s = lag.slice().sort((a, b) => (ARB.has(a) - ARB.has(b)) || Math.hypot(a.x - mx, a.y - my) - Math.hypot(b.x - mx, b.y - my))[0];
    const hva = t === 'hel' ? 'ødelegg' : t === 'sprengt' ? 'reparer' : null; if (!hva) return;
    const verb = (hva === 'ødelegg' ? O.verb(o.lag) : 'reparere').replace(/e$/, '');   // spreng, sperr, reparer
    H.appendChild(knapp(`${verb.charAt(0).toUpperCase() + verb.slice(1)} med ${s.navn}`, false, () => { start(s, o, hva); visInfo(o); }));
  });
  // Trykk på kartet mens «Spreng / sperr …» eller «Reparer …» er på.
  KROKER.trykk.unshift((X, Y) => {
    if (!velg) return false;
    const { s, hva } = velg; velg = null; let best = null, bd = 30 * kam.m;
    if (INFRA) for (const lag of TYPER) for (const o of INFRA[lag] || []) {
      if (o.bb[2] < X - bd || o.bb[0] > X + bd || o.bb[3] < Y - bd || o.bb[1] > Y + bd) continue;
      const d = nærmest(o, X, Y)[2]; if (d < bd) { bd = d; best = o; }
    }
    if (!best) logg('Fant ingen bru, tunnel eller ferjekai der. Zoom inn og prøv igjen.'); else start(s, best, hva);
    if (valgt === s) visPanel(); skitten = true; return true;
  });

  // ---------- tegning ----------
  function røyk(g, x, y, r, alder) {   // tre røykdotter som stiger og blekner
    const t = performance.now() / 1000, sterk = Math.max(.25, 1 - alder / (6 * TIME));
    for (let i = 0; i < 4; i++) { const f = (t * .25 + i / 4) % 1;
      g.fillStyle = `rgba(${70 + 40 * f | 0},${66 + 38 * f | 0},${60 + 34 * f | 0},${(.55 * (1 - f) * sterk).toFixed(3)})`;
      g.beginPath(); g.arc(x + Math.sin(t + i * 1.7) * r * .4 + f * r * .8, y - f * r * 3, r * (.5 + f), 0, 6.283); g.fill(); }
  }
  function kryss(g, x, y, r, farge) {
    g.strokeStyle = 'rgba(20,16,10,.9)'; g.lineWidth = 5; g.beginPath(); g.moveTo(x - r, y - r); g.lineTo(x + r, y + r); g.moveTo(x + r, y - r); g.lineTo(x - r, y + r); g.stroke();
    g.strokeStyle = farge; g.lineWidth = 2.6; g.stroke();
  }
  function stillas(g, x, y, v, l) {   // gule stillas over gapet
    g.save(); g.translate(x, y); g.rotate(v); g.strokeStyle = '#e8c547'; g.lineWidth = 1.6;
    g.strokeRect(-l / 2, -4, l, 8); g.beginPath(); for (let s = -l / 2; s < l / 2; s += 5) { g.moveTo(s, -4); g.lineTo(s + 5, 4); } g.stroke(); g.restore();
  }
  function tegnObjekt(g, o, t, S, m, nøkkel) {
    const alder = RØYK.has(nøkkel) ? tid - RØYK.get(nøkkel) : 1e9;
    if (o.lag === 'bru') { const a = o.deler[0]; if (a.length < 4) return;
      const [X, Y, v, L] = midten(a), [x, y] = S(X, Y), l = Math.max(14, Math.min(80, L * .35 / m)), ex = Math.cos(v) * l / 2, ey = -Math.sin(v) * l / 2;
      g.lineCap = 'butt'; g.strokeStyle = 'rgba(16,12,8,.95)'; g.lineWidth = Math.max(8, Math.min(18, 11 / m)); g.beginPath(); g.moveTo(x - ex, y - ey); g.lineTo(x + ex, y + ey); g.stroke();
      g.strokeStyle = 'rgba(180,70,40,.8)'; g.lineWidth = 1.5; g.setLineDash([2, 2]); g.stroke(); g.setLineDash([]);
      if (t === 'reparasjon') stillas(g, x, y, -v, l); else if (alder < 6 * TIME) røyk(g, x, y - 4, 5, alder); else kryss(g, x, y, 5, '#c8553d');
    } else if (o.lag === 'tunnel') { for (const a of o.deler) for (const k of [0, a.length - 2]) { const [x, y] = S(a[k], a[k + 1]); kryss(g, x, y, 6, t === 'reparasjon' ? '#e8c547' : '#c8553d'); } }
    else { const [x, y] = S(o.deler[0][0], o.deler[0][1]); kryss(g, x, y, 7, t === 'reparasjon' ? '#e8c547' : '#c8553d'); }
    return alder < 6 * TIME;
  }
  KROKER.tegn.push((g, vx0, vy1) => {
    if (!INFRA) return;
    const m = kam.m, S = (X, Y) => [(X - vx0) / m, (vy1 - Y) / m]; let anim = false;
    g.save();
    for (const [k, v] of T) { const [lag, id] = k.split(':'), o = finnObj(lag, +id); if (!o) continue;
      const [x, y] = S((o.bb[0] + o.bb[2]) / 2, (o.bb[1] + o.bb[3]) / 2); if (x < -80 || y < -80 || x > VW + 80 || y > VH + 80) continue;
      if (tegnObjekt(g, o, v.tilstand, S, m, k)) anim = true; }
    // pågående arbeid: ring som fylles
    for (const [s, w] of ARB) { const [x, y] = S(w.X, w.Y); if (x < -40 || y < -40 || x > VW + 40 || y > VH + 40) continue;
      const p = 1 - w.a.igjen / w.a.total; g.lineWidth = 3; g.strokeStyle = 'rgba(20,16,10,.85)'; g.beginPath(); g.arc(x, y, 11, 0, 6.283); g.stroke();
      g.strokeStyle = w.a.hva === 'ødelegg' ? '#e0703f' : '#e8c547'; g.beginPath(); g.arc(x, y, 11, -Math.PI / 2, -Math.PI / 2 + 6.283 * Math.max(.02, p)); g.stroke();
      if (velg || valgt === s) { g.setLineDash([4, 4]); g.lineWidth = 1.2; g.beginPath(); const [a, b] = S(s.x, s.y); g.moveTo(a, b); g.lineTo(x, y); g.stroke(); g.setLineDash([]); } }
    if (velg) { g.font = 'italic 13px "Cormorant Garamond",serif'; g.textAlign = 'center'; g.fillStyle = '#f0d79a'; g.fillText(velg.hva === 'ødelegg' ? 'Velg bru, tunnel eller ferjekai' : 'Velg det som skal repareres', VW / 2, 64); }
    g.restore();
    if (anim && tempo > 0) skitten = true;   // røyken beveger seg
  });
  KROKER.tegn3d.push((g, proj) => {
    if (!INFRA) return;
    for (const [k, v] of T) { const [lag, id] = k.split(':'), o = finnObj(lag, +id); if (!o) continue;
      const pkt = lag === 'bru' ? [midten(o.deler[0])] : lag === 'tunnel' ? o.deler.flatMap(a => [[a[0], a[1]], [a[a.length - 2], a[a.length - 1]]]) : [o.deler[0]];
      for (const [X, Y] of pkt) { const q = proj(X, Y); if (!q) continue;
        if (lag === 'bru' && v.tilstand === 'sprengt') røyk(g, q[0], q[1] - 6, 7, RØYK.has(k) ? tid - RØYK.get(k) : 0);
        else kryss(g, q[0], q[1], 7, v.tilstand === 'reparasjon' ? '#e8c547' : '#c8553d'); }
    }
  });
})();
