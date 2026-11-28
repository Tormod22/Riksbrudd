'use strict';
/* INDUSTRIMASKINENE – visningen (28. nov, ut9-maskiner). Reglene og modellene: spill/maskiner.js (window.Maskiner).
 *  - 2D: egne symboler for maskintypene i plantegningen (Maskiner.SYMBOL: sagblad, bånd med ruller, tank, knuser-trakt, haug,
 *    kar, kroker på skinne, reol, båt …). plantegning-visning.js kaller window.PLAN2D_MØBEL for hvert møbel den tegner.
 *  - 3D: LIV – maskinene du driver selv (produksjon.js sier at maskinen går: ProduksjonSpill.status()[id].går) får delene som
 *    beveger seg (Maskiner.LIV): sagbladet roterer (sagbenken i fabrikken), stempelet på vedkløyveren går opp og ned, fyrkjelen,
 *    smia og raffineriet ryker (Effekter3d.røyk – den samme punktskyen som kamp og brann), og båndene går. Står maskinen, står delene.
 *    Ett instansnett per slag (blad, stempel, knast), ingen nye lys. Lages første gang det trengs og frigjøres når 3D slås av.
 * window.MaskinerSpill (kilder, tall, prøve, tegnet2d).
 */
(function () {
  const M = window.Maskiner; if (!M || typeof document === 'undefined') return;
  const r3 = () => (typeof R3 !== 'undefined' ? R3 : null);
  // Claudes forslag: omdreininger (radianer per sekund), stempelets takt, båndets fart (m/s), røyk hvert så mange sekund, største antall
  const LIVR = { blad: 38, stempel: 3.2, bånd: .9, røyk: .7, maks: 24, knaster: 6 };
  const T = { blad: null, stempel: null, knast: null, kilder: [], sist: 0, røykSist: 0, t: 0, tall: { blad: 0, stempel: 0, knast: 0, røyk: 0 }, prøve: null, vinkel: 0 };

  // ---------- 2D: symbolene i plantegningen ----------
  const S2 = { tegnet: 0 };
  function symbol(g, q, X, Y) {
    const s = M.SYMBOL[q.type]; if (!s || !q.P || q.P.length < 4) return;
    const A = [X(q.P[0]), Y(q.P[0])], B = [X(q.P[1]), Y(q.P[1])], D = [X(q.P[3]), Y(q.P[3])];
    const ex = [B[0] - A[0], B[1] - A[1]], ey = [D[0] - A[0], D[1] - A[1]], lb = Math.hypot(ex[0], ex[1]), ld = Math.hypot(ey[0], ey[1]);
    if (Math.min(lb, ld) < 5) return;
    // punkt i møbelets akser: u langs bredden (0–1), v langs dybden (0–1)
    const p = (u, v) => [A[0] + ex[0] * u + ey[0] * v, A[1] + ex[1] * u + ey[1] * v], cx = A[0] + (ex[0] + ey[0]) / 2, cy = A[1] + (ex[1] + ey[1]) / 2;
    const r = Math.min(lb, ld) / 2 * .78, lang = lb >= ld, lin = (a, b) => { g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); };
    g.save(); g.strokeStyle = 'rgba(240,204,130,.78)'; g.fillStyle = 'rgba(240,204,130,.18)'; g.lineWidth = 1; g.beginPath();
    switch (s) {
      case 'sag': { g.arc(cx, cy, r * .8, 0, 6.283); for (let k = 0; k < 12; k++) { const a = k * .5236; g.moveTo(cx + Math.cos(a) * r * .8, cy + Math.sin(a) * r * .8); g.lineTo(cx + Math.cos(a + .2) * r, cy + Math.sin(a + .2) * r); } break; }
      case 'bånd': { const n = Math.max(2, Math.min(14, Math.round((lang ? lb : ld) / 6))); for (let k = 1; k < n; k++) { const t = k / n; if (lang) lin(p(t, .12), p(t, .88)); else lin(p(.12, t), p(.88, t)); }
        const a = lang ? p(.25, .5) : p(.5, .25), b = lang ? p(.75, .5) : p(.5, .75); lin(a, b); const vx = b[0] - a[0], vy = b[1] - a[1], L = Math.hypot(vx, vy) || 1;
        g.moveTo(b[0] - vx / L * 5 + vy / L * 3, b[1] - vy / L * 5 - vx / L * 3); g.lineTo(b[0], b[1]); g.lineTo(b[0] - vx / L * 5 - vy / L * 3, b[1] - vy / L * 5 + vx / L * 3); break; }
      case 'tank': g.arc(cx, cy, r, 0, 6.283); g.fill(); g.moveTo(cx + r * .45, cy); g.arc(cx, cy, r * .45, 0, 6.283); break;
      case 'sylinder': { const a = lang ? p(.12, .5) : p(.5, .12), b = lang ? p(.88, .5) : p(.5, .88), w = (lang ? ld : lb) * .36; g.lineWidth = w * 2; g.lineCap = 'round'; g.strokeStyle = 'rgba(240,204,130,.25)'; lin(a, b); g.stroke(); g.beginPath(); g.lineWidth = 1; g.strokeStyle = 'rgba(240,204,130,.78)'; lin(a, b); break; }
      case 'knuser': { const a = p(.2, .2), b = p(.8, .2), c = p(.5, .8); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.closePath(); g.fill(); break; }
      case 'haug': for (const k of [1, .66, .33]) { g.moveTo(cx + r * k, cy); g.ellipse(cx, cy, r * k, r * k * .8, 0, 0, 6.283); } break;
      case 'kar': { const a = p(.15, .2), c = p(.85, .8); g.rect(Math.min(a[0], c[0]), Math.min(a[1], c[1]), Math.abs(c[0] - a[0]), Math.abs(c[1] - a[1])); for (let k = 0; k < 3; k++) { const t = .3 + k * .2, q0 = p(.2, t), q1 = p(.5, t + .05), q2 = p(.8, t); g.moveTo(q0[0], q0[1]); g.quadraticCurveTo(q1[0], q1[1], q2[0], q2[1]); } break; }
      case 'krok': { const a = lang ? p(.05, .5) : p(.5, .05), b = lang ? p(.95, .5) : p(.5, .95); lin(a, b); const n = Math.max(2, Math.round((lang ? lb : ld) / 8)); for (let k = 0; k < n; k++) { const t = (k + .5) / n, c = lang ? p(t, .5) : p(.5, t); g.moveTo(c[0] + 2, c[1]); g.arc(c[0], c[1], 2, 0, 6.283); } break; }
      case 'reol': for (const t of [.25, .5, .75]) { if (lang) lin(p(.05, t), p(.95, t)); else lin(p(t, .05), p(t, .95)); } break;
      case 'skap': { const a = p(.2, .2), c = p(.8, .8); g.rect(Math.min(a[0], c[0]), Math.min(a[1], c[1]), Math.abs(c[0] - a[0]), Math.abs(c[1] - a[1])); const k0 = p(.62, .3), k1 = p(.78, .45); g.rect(Math.min(k0[0], k1[0]), Math.min(k0[1], k1[1]), Math.abs(k1[0] - k0[0]), Math.abs(k1[1] - k0[1])); break; }
      case 'pult': lin(p(.1, .7), p(.9, .7)); for (const t of [.25, .5, .75]) { const a = p(t - .08, .3), c = p(t + .08, .55); g.rect(Math.min(a[0], c[0]), Math.min(a[1], c[1]), Math.abs(c[0] - a[0]), Math.abs(c[1] - a[1])); } break;
      case 'vifte': { g.arc(cx, cy, r, 0, 6.283); for (let k = 0; k < 3; k++) { const a = k * 2.094; g.moveTo(cx, cy); g.quadraticCurveTo(cx + Math.cos(a + .5) * r, cy + Math.sin(a + .5) * r, cx + Math.cos(a) * r * .9, cy + Math.sin(a) * r * .9); } break; }
      case 'flamme': { g.moveTo(cx, cy - r); g.quadraticCurveTo(cx + r * .9, cy + r * .2, cx, cy + r * .8); g.quadraticCurveTo(cx - r * .9, cy + r * .2, cx, cy - r); g.fill(); break; }
      case 'båt': { const a = lang ? p(.02, .5) : p(.5, .02), b = lang ? p(.98, .5) : p(.5, .98), s1 = lang ? p(.7, .1) : p(.1, .7), s2 = lang ? p(.7, .9) : p(.9, .7), h1 = lang ? p(.08, .2) : p(.2, .08), h2 = lang ? p(.08, .8) : p(.8, .08);
        g.moveTo(b[0], b[1]); g.lineTo(s1[0], s1[1]); g.lineTo(h1[0], h1[1]); g.lineTo(h2[0], h2[1]); g.lineTo(s2[0], s2[1]); g.closePath(); g.fill(); lin(a, b); break; }
      case 'valse': for (const t of [.3, .7]) { const a = lang ? p(.08, t) : p(t, .08), b = lang ? p(.92, t) : p(t, .92); lin(a, b); g.moveTo(a[0] + 2, a[1]); g.arc(a[0], a[1], 2, 0, 6.283); g.moveTo(b[0] + 2, b[1]); g.arc(b[0], b[1], 2, 0, 6.283); } break;
      case 'hjul': g.arc(cx, cy, r, 0, 6.283); lin([cx - r, cy], [cx + r, cy]); lin([cx, cy - r], [cx, cy + r]); break;
      case 'kryss': lin(p(.15, .15), p(.85, .85)); lin(p(.85, .15), p(.15, .85)); break;
      default: break;
    }
    g.stroke(); g.restore(); S2.tegnet++;
  }
  (window.PLAN2D_MØBEL = window.PLAN2D_MØBEL || []).push(symbol);

  // ---------- 3D: delene som går ----------
  const L = () => { try { return window.LeirSpill && LeirSpill.tilstand ? LeirSpill.tilstand() : null; } catch (e) { return null; } };
  const LB = () => window.Leir || null;
  // maskintypen for bygget: egen LIV-oppføring (bs_sagbenk …), ellers maskintypen i produksjon.js (sagbruk …)
  // (byggesettets deler heter «bs_sagbenk_1» – størrelsen står bakerst)
  const livFor = type => M.LIV[type] || M.LIV[String(type).replace(/_\d+$/, '')] || (LB() && LB().BYGG[type] && M.LIV[LB().BYGG[type].maskinType]) || null;
  // maskinene som går nå: [{ type, X, Y, a, n, liv }] (kartets meter, retning, etasje)
  function kilder() {
    if (T.prøve) return T.prøve;
    const l = L(), st = window.ProduksjonSpill && ProduksjonSpill.status ? ProduksjonSpill.status() : null; if (!l || !st) return [];
    const ut = [];
    for (const b of l.bygg || []) { const s = st[b.id]; if (!s || !s.går) continue; const liv = livFor(b.type); if (!liv) continue;
      ut.push({ id: b.id, type: b.type, X: b.x, Y: b.y, a: b.ret || 0, n: b.bs ? b.bs.n || 0 : 0, liv, moh: b.bs ? gulv(l, b.id) : null }); if (ut.length >= LIVR.maks) break; }
    return ut;
  }
  // gulvet under en del i byggesettet (moh.): samme grunnhøyde som byggesett-visning.js tegner huset med (ByggesettRegler.høyder);
  // regnes på nytt bare når delene eller utsnittet endres
  const GULV = { nøkkel: '', hz: null };
  function gulv(l, id) {
    const BS = window.ByggesettRegler, R = r3(), u = R && R.ut, o = l.byggesett; if (!BS || !BS.høyder || !BS.fraBygg || !u || !o || typeof hoyde3d !== 'function') return null;
    const nøkkel = l.bygg.length + ':' + u.cx + ':' + u.cy;
    if (GULV.nøkkel !== nøkkel) { GULV.nøkkel = nøkkel; try { const liste = l.bygg.filter(b => b.bs).map(b => BS.fraBygg(b, LB())).filter(Boolean); GULV.hz = BS.høyder(o, liste, (x, y) => hoyde3d(x, y, u)); } catch (e) { GULV.hz = null; } }
    const v = GULV.hz && GULV.hz.get(id); return v && Number.isFinite(v.z0) ? v.z0 : null;
  }
  function nett(R, geo, farge, n) { const m = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: farge }), n); m.count = 0; m.frustumCulled = false; m.userData.maskinLiv = true; R.scene.add(m); return m; }
  function lag(R) {
    if (T.blad && T.blad.parent === R.scene) return;
    rydd();
    // sagbladet: en tynn skive (aksen langs y) med tenner som små kasser rundt kanten
    const g0 = new THREE.CylinderGeometry(1, 1, .02, 20).toNonIndexed(), deler = [g0];
    for (let k = 0; k < 16; k++) { const t = new THREE.BoxGeometry(.12, .024, .07).toNonIndexed(); t.translate(1.02, 0, 0); t.rotateY(k / 16 * 6.283); deler.push(t); }
    const blad = window.MODELLER && MODELLER.samle ? MODELLER.samle(deler) : g0; if (blad !== g0) for (const d of deler) d.dispose();
    T.blad = nett(R, blad, 0xc9cfd2, LIVR.maks); T.stempel = nett(R, new THREE.BoxGeometry(.34, .34, .5), 0x8a9094, LIVR.maks);
    T.knast = nett(R, new THREE.BoxGeometry(.08, .5, .05), 0x2a2c2e, LIVR.maks * LIVR.knaster);
  }
  function rydd() { for (const k of ['blad', 'stempel', 'knast']) { const m = T[k]; if (!m) continue; if (m.parent) m.parent.remove(m); m.geometry.dispose(); m.material.dispose(); T[k] = null; } }
  const mx = () => new THREE.Matrix4(), q = { m: null, r: null, s: null, p: null };
  function ramme(R) {
    if (!window.THREE || !R || !R.ut || !R.scene) return;
    const nå = performance.now() / 1000, dt = Math.min(.1, T.sistRamme ? nå - T.sistRamme : 0); T.sistRamme = nå;
    // stopp i pause (tempo 0) – maskinene i spillet står da også
    const fart = typeof tempo !== 'undefined' && tempo > 0 ? 1 : 0; T.t += dt * fart;
    if (nå - T.sist > .5) { T.sist = nå; T.kilder = kilder(); }
    if (!T.kilder.length && !T.blad) return;
    lag(R); const u = R.ut;
    if (!q.m) { q.m = mx(); q.r = new THREE.Matrix4(); q.s = new THREE.Matrix4(); q.p = new THREE.Matrix4(); }
    let nb = 0, ns = 0, nk = 0, røyk = nå - T.røykSist > LIVR.røyk && fart; if (røyk) T.røykSist = nå;
    for (const k of T.kilder) {
      const x0 = k.X - u.cx, y0 = k.Y - u.cy; if (Math.abs(x0) > u.S || Math.abs(y0) > u.S) continue;
      let z0; try { z0 = k.moh !== null && k.moh !== undefined ? (k.moh + k.n * 3 - u.h0) * (R.EX || 1) : (hoyde3d(k.X, k.Y, u) - u.h0) * (R.EX || 1) + .25 + k.n * 3;
        // (ut10-fabrikkbygg) en maskin inne i et hus (fabrikkbygget): gulvet i interiøret når det er bygget
        if ((k.moh === null || k.moh === undefined) && window.Interior3d && Interior3d.høyde) { const terr = (x, y) => (hoyde3d(x + u.cx, y + u.cy, u) - u.h0) * (R.EX || 1), g = Interior3d.høyde(x0, y0, terr); if (Number.isFinite(g)) z0 = g; } } catch (e) { continue; }
      const c = Math.cos(k.a), s = Math.sin(k.a), pos = (lx, ly) => [x0 + lx * c - ly * s, y0 + lx * s + ly * c];
      for (const d of k.liv) {
        const [x, y] = pos(d.x || 0, d.y || 0);
        if (d.del === 'blad' && nb < LIVR.maks) {
          // skiva: aksen langs møbelets y (bladet står langs maskinens lengde) eller x; roterer om aksen
          q.m.makeRotationY(T.t * LIVR.blad); q.s.makeScale(d.r, 1, d.r); q.r.makeRotationZ(k.a + (d.akse === 'x' ? Math.PI / 2 : 0));
          q.p.makeTranslation(x, y, z0 + d.z); q.p.multiply(q.r).multiply(q.s).multiply(q.m); T.blad.setMatrixAt(nb++, q.p);
        } else if (d.del === 'stempel' && ns < LIVR.maks) {
          const h = (Math.sin(T.t * LIVR.stempel) * .5 + .5) * (d.slag || .3); q.r.makeRotationZ(k.a); q.p.makeTranslation(x, y, z0 + d.z + h); q.p.multiply(q.r); T.stempel.setMatrixAt(ns++, q.p);
        } else if (d.del === 'bånd') {
          // knastene på båndet går langs maskinens lengde (2,4 m) og begynner forfra
          for (let j = 0; j < LIVR.knaster && nk < T.knast.instanceMatrix.count; j++) { const t = ((T.t * LIVR.bånd / 2.4 + j / LIVR.knaster) % 1) * 2.4 - 1.2, [bx, by] = pos(t, 0);
            q.r.makeRotationZ(k.a); q.p.makeTranslation(bx, by, z0 + (d.z || 1.05)); q.p.multiply(q.r); T.knast.setMatrixAt(nk++, q.p); }
        } else if (d.del === 'røyk' && røyk && window.Effekter3d && Effekter3d.røyk) { const [X, Y] = pos(d.x || 0, d.y || 0); Effekter3d.røyk(X + u.cx, Y + u.cy, 1); T.tall.røyk++; }
      }
    }
    T.blad.count = nb; T.stempel.count = ns; T.knast.count = nk; T.tall.blad = nb; T.tall.stempel = ns; T.tall.knast = nk;
    for (const m of [T.blad, T.stempel, T.knast]) m.instanceMatrix.needsUpdate = true;
    if (nb + ns + nk) R.maskinLiv = nå;
  }
  // ---------- LYD (ut9-maskiner2): en dur fra maskinen som går nærmest deg i 3D (Web Audio, samme motor som spill/lyd.js:
  // Lyd.motor() gir ac og hovedkanalen, så ☰ «Lyd» og skjult fane demper den også). Brumming (sagtann, lavpass) + sus (støy, båndpass);
  // tonen etter delen (sagblad høyest, stempel dypest). Styrken faller med avstanden og er borte ved LYD.rekkevidde. Claudes tall.
  const LYD = { rekkevidde: 30, maks: .1, tone: { blad: 150, stempel: 62, bånd: 88, røyk: 48 } };
  const LS = { nivå: 0, tone: 0, k: null, sist: 0 };
  function lydKanal() {
    if (LS.k) return LS.k; const m = window.Lyd && Lyd.motor ? Lyd.motor() : null; if (!m || !m.ac || !m.hoved) return null; const ac = m.ac;
    const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 80; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = .8;
    const n = ac.createBufferSource(); n.buffer = m.støy; n.loop = true; const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 1.4; const ng = ac.createGain(); ng.gain.value = .35;
    const g = ac.createGain(); g.gain.value = 0; o.connect(lp); lp.connect(g); n.connect(bp); bp.connect(ng); ng.connect(g); g.connect(m.hoved); o.start(); if (m.støy) n.start();
    return (LS.k = { ac, o, g, lp });
  }
  function lyd(R, kilder) {
    let best = Infinity, tone = 0; const cam = R.cam && R.cam.position;
    if (cam && R.ut) for (const k of kilder) { const d = Math.hypot(k.X - R.ut.cx - cam.x, k.Y - R.ut.cy - cam.y); if (d < best) { best = d; tone = LYD.tone[(k.liv[0] || {}).del] || 70; } }
    const f = Math.max(0, 1 - best / LYD.rekkevidde); LS.nivå = f * f * LYD.maks; LS.tone = tone; sett(LS.nivå, tone);
  }
  function sett(nivå, tone) { const K = nivå > 0 || LS.k ? lydKanal() : null; if (!K) return; const t = K.ac.currentTime; K.g.gain.setTargetAtTime(nivå, t, .25);
    if (tone) { K.o.frequency.setTargetAtTime(tone, t, .3); K.lp.frequency.setTargetAtTime(tone * 5, t, .3); } }
  // utenfor 3D eller i skjult fane: stille
  setInterval(() => { if (LS.nivå > 0 && (typeof på3d === 'undefined' || !på3d || document.hidden || performance.now() / 1000 - (T.sistRamme || 0) > 4)) { LS.nivå = 0; sett(0, 0); } }, 500);
  if (typeof KROKER !== 'undefined') {
    KROKER.ramme3d.push(R => { try { ramme(R); } catch (e) { console.warn('maskinliv:', e.message); } });
    KROKER.ramme3d.push(R => { try { const nå = performance.now(); if (nå - LS.sist > 250) { LS.sist = nå; lyd(R, T.kilder); } } catch (e) { console.warn('maskinlyd:', e.message); } });
    // et nytt utsnitt bygger scenen på nytt: lag nettene igjen der
    KROKER.sett3d.push(() => { T.sist = 0; });
  }
  // (ut9-maskiner2) ikonene for de nye maskinene i byggesettet (Ikoner.legg, som kjeder-visning.js gjør for sine maskiner)
  const IKON = { flis: "<path d='M4 18l6-12 2 4 4-6 4 14z'/><path d='M8 18l2-3 2 3'/>", filet: "<path d='M3 12c4-5 10-5 14 0-4 5-10 5-14 0z'/><path d='M17 12l4-3v6zM7 10l6 4'/>",
    balle: "<rect x='4' y='7' width='16' height='11' rx='1'/><path d='M4 11h16M4 14h16M9 7v11M15 7v11'/>", knus: "<path d='M4 5h16l-5 8H9z'/><path d='M9 13l-2 7M15 13l2 7M10 20h4'/>" };
  const IKONBYGG = {}; for (const [d, n] of [['bs_flishogger', 'flis'], ['bs_filetmaskin', 'filet'], ['bs_ballepresse', 'balle'], ['bs_knuser', 'knus']]) { IKONBYGG[d] = n; IKONBYGG[d + '_1'] = n; }
  (function ikoner(n) { if (window.Ikoner && Ikoner.legg) Ikoner.legg(IKON, IKONBYGG); else if (n < 40) setTimeout(() => ikoner(n + 1), 500); })(0);
  window.MaskinerSpill = { lyd: () => ({ nivå: LS.nivå, tone: LS.tone, kanal: !!LS.k }), LYD, kilder, tall: () => Object.assign({}, T.tall, { kilder: T.kilder.length, t: T.t }), prøve: liste => { T.prøve = liste || null; T.sist = 0; }, tegnet2d: () => S2.tegnet,
    nullstill2d: () => { S2.tegnet = 0; }, matrise: i => { if (!T.blad || i >= T.blad.count) return null; const m = new THREE.Matrix4(); T.blad.getMatrixAt(i, m); return Array.from(m.elements); }, rydd, LIVR };
})();
