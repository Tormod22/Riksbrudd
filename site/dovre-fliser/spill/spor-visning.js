'use strict';
// FORLATTE STEDER – visningen (R18-F, 23. nov). Reglene står i spill/spor.js (uten DOM). Lastes etter interior3d.js, leting-visning.js og
// lut-visning.js, og før meny.js.
//  - INNE: interior3d.js kaller SporSpill.inne(c) (en generator, i biter som resten av interiøret) – sporene etter det som skjedde i huset:
//    karantenelapp på døra, barnetegning, halvpakket koffert, planker for bakdøra, seng i stua, åpne og tomme matskap, kalender, brev på
//    bordet, madrasser, stearinlys, papirhauger, sperrebånd, handlekurver. Ingenting av dette sperrer deg. Første gang du går inn i et hus
//    med spor, står én stille linje øverst («Kjøkkenskapene står åpne og tomme.»).
//  - LAPPER: knappen «Les lappen» (tast N) i #inneknapper når huset har en lapp (inne, eller på døra når du står ved den). Lappene du har
//    lest, står under «Lapper» i sekken (per leir, «riksbrudd-spor»). En lapp som peker videre, merker et hus i kartet («Gjemt lager?»);
//    letingen der gir et lite lager ekstra (leting-visning.js spør SporSpill.medGjemt).
//  - TETTSTEDENE (3D, utsnitt S ≤ 2200): forlatte biler med åpen dør i gata, barrikader av møbler, håndmalte skilt og plater for vinduene.
//  - Lyden står i spill/lyd.js (Spor.lydInne).
// I testene (navigator.webdriver) vises stemningslinja ikke av seg selv (SporSpill.test = true slår den på); alt annet er som ellers.
(function () {
  const r3 = () => (typeof R3 !== 'undefined' ? R3 : null);
  const mobil = () => typeof VW !== 'undefined' && VW < 900;
  const S = window.Spor; if (!S) return;
  const NØKKEL = 'riksbrudd-spor';
  // tilstand per leir: lest = [[lapp-id, bygg, sted, kl]], mål = [{ i, x, y, lapp, fra }] (husene pekerlappene viser til, i kartets meter)
  let T = { lest: [], mål: [] }, leirId = '', klar = false;
  const leir = () => { const s = window.OppstartSpill && OppstartSpill.tilstand(); return s && s.leir ? Math.round(s.leir.x) + ',' + Math.round(s.leir.y) : 'x'; };
  const les = () => { try { const d = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); T = d && d.leir === leirId ? { lest: d.lest || [], mål: d.mål || [] } : { lest: [], mål: [] }; } catch (e) { T = { lest: [], mål: [] }; } };
  const lagre = () => { try { localStorage.setItem(NØKKEL, JSON.stringify({ leir: leirId, lest: T.lest.slice(-200), mål: T.mål.slice(-40) })); } catch (e) { /* fullt eller sperret */ } };
  function start() { leirId = leir(); les(); klar = true; }
  window.addEventListener('riksbrudd-spill', () => setTimeout(start, 0));
  const SKJULT = () => navigator.webdriver && !window.SporSpill.test;

  // ---------- nærmeste tettsted (kartnavnet) ----------
  function byer() { return typeof INFRA !== 'undefined' && INFRA && INFRA.tettsted ? INFRA.tettsted : []; }
  function stedVed(X, Y, nr = 0) { const L = byer().filter(b => b.e && b.e.navn && b.bb).map(b => [Math.hypot((b.bb[0] + b.bb[2]) / 2 - X, (b.bb[1] + b.bb[3]) / 2 - Y), b.e.navn]).sort((a, b) => a[0] - b[0]);
    const navn = [...new Set(L.map(l => l[1]))]; return navn[Math.min(nr, navn.length - 1)] || ''; }

  // ---------- SPORENE INNE (kalles fra interior3d.js byggG) ----------
  // c: { pl, P, kasse(x, y, a, [x0, x1, y0, y1, z0, z1, farge, stoff, rund]), blob(x, y, a, hb, hd), tak, dørH }
  const PAPIR = [.93, .92, .88], GUL = [.95, .86, .38], RØD = [.72, .12, .1], SVART = [.14, .14, .14], BRUN = [.45, .32, .2], PLANKE = [.56, .43, .29], BLÅ = [.2, .34, .6], GRØNN = [.25, .5, .25], KOFFERT = [[.18, .22, .3], [.45, .12, .1], [.12, .12, .12], [.3, .32, .22]];
  const TØYF = [[.62, .55, .45], [.35, .42, .55], [.55, .3, .3], [.4, .48, .36], [.75, .72, .66]];
  function* inne(c) {
    const { pl, P, kasse, blob, tak } = c, A = pl.akse, i = pl.i, kl = pl.kl, I = pl.inngang;
    const h = S.historie(kl, i), l = S.lapp(kl, i, h), ting = h.ting, rh = q => S.hash(i, 1500 + q), tekst = [];
    const sp = pl.spor = { historie: h.navn, ting: Object.keys(ting), lapp: null, tekst, deler: 0 };
    const vp = (pu, pv) => [pu * A.ux + pv * A.vx, pu * A.uy + pv * A.vy];
    const rom = re => pl.rom.filter(r => re.test(r.rolle) && r.andel >= .5 && r.areal >= 4);
    const fri = (x, y, m = .5) => Interior.inni(P, x, y) && Interior.avstKant(P, x, y) > m && !Interior.blokkert(pl, x, y);
    const punkt = (r, q, m = .6) => { for (let f = 0; f < 10; f++) { const [x, y] = vp(r.u0 + m + rh(q * 11 + f) * Math.max(.05, r.u1 - r.u0 - 2 * m), r.v0 + m + rh(q * 11 + f + 5) * Math.max(.05, r.v1 - r.v0 - 2 * m)); if (fri(x, y, m)) return [x, y]; } return null; };
    const K = (x, y, a, d) => { kasse(x, y, a, d); sp.deler++; };
    // en ting på en vegg: (x, y) på veggflaten, va langs veggen, n = normalen ut fra flaten (mot den som ser på); y-målene regnes utover fra flaten
    const påVegg = (x, y, va, nx, ny, d0, deler) => { const s = (-Math.sin(va) * nx + Math.cos(va) * ny) > 0 ? 1 : -1;
      for (const [x0, x1, y0, y1, z0, z1, f, st] of deler) K(x, y, va, [x0, x1, s > 0 ? d0 + y0 : -(d0 + y1), s > 0 ? d0 + y1 : -(d0 + y0), z0, z1, f, st || 'glatt']); };
    // et ark med noen skriblede linjer
    const ark = (x0, x1, z0, z1, f = PAPIR) => { const L = [[x0, x1, 0, .004, z0, z1, f]]; for (let z = z1 - .05; z > z0 + .04; z -= .035) L.push([x0 + .02, x1 - .02 - (z * 37 % 1) * .05, .004, .006, z - .006, z, SVART]); return L; };
    const veggTing = []; for (const v of pl.vegger || []) { const L = Math.hypot(v.bx - v.ax, v.by - v.ay); if (L > 1.4) veggTing.push(v); }
    let vNr = 0; const nesteVegg = () => veggTing.length ? veggTing[(Math.floor(rh(300) * veggTing.length) + vNr++) % veggTing.length] : null;
    // et sted på en skillevegg (t = andel langs, side ±1): gir [x, y, va, nx, ny] på flaten (5 cm fra midten)
    const veggSted = (v, t, s) => { const L = Math.hypot(v.bx - v.ax, v.by - v.ay), ex = (v.bx - v.ax) / L, ey = (v.by - v.ay) / L, nx = -ey * s, ny = ex * s; return [v.ax + ex * L * t + nx * .05, v.ay + ey * L * t + ny * .05, Math.atan2(ey, ex), nx, ny]; };
    yield 'spor';

    // KARANTENELAPP / OPPSLAG PÅ DØRA (utenfor, ved siden av døra)
    if (ting.karantene || (l && S.ute(l))) { const d = I.w / 2 + .32, x = I.x + I.ux * d + I.nx * .012, y = I.y + I.uy * d + I.ny * .012, va = Math.atan2(I.uy, I.ux), gul = ting.karantene;
      påVegg(x, y, va, I.nx, I.ny, 0, [...ark(-.105, .105, 1.3, 1.6, gul ? GUL : PAPIR), ...(gul ? [[-.105, .105, .004, .007, 1.55, 1.6, RØD]] : []), [-.012, .012, .006, .01, 1.585, 1.6, [.6, .6, .62]]]);
      // teip i kryss over karmen (to strimler, ikke i åpningen)
      if (gul) for (const sx of [-1, 1]) { const tx = I.x + I.ux * sx * (I.w / 2 + .08) + I.nx * .014, ty = I.y + I.uy * sx * (I.w / 2 + .08) + I.ny * .014; påVegg(tx, ty, va, I.nx, I.ny, 0, [[-.03, .03, 0, .004, .4, 1.9, [.9, .78, .2]]]); }
      if (gul) tekst.push('Det henger en karantenelapp på døra.');
      if (l && S.ute(l)) sp.lapp = { id: l.id, x, y, z: 1.45, ute: true };
      yield 'dørlapp'; }

    // BARNETEGNINGER (bolig: én, skole: noen i klasserommene)
    if (ting.tegning) { const n = kl === 'skole' ? 2 + Math.floor(rh(1) * 4) : 1;
      for (let q = 0; q < n; q++) { const v = nesteVegg(); if (!v) break; const [x, y, va, nx, ny] = veggSted(v, .22 + rh(10 + q) * .56, rh(20 + q) < .5 ? 1 : -1), z = kl === 'skole' ? 1.35 + rh(30 + q) * .3 : 1.05;
        påVegg(x, y, va, nx, ny, .002, [[-.15, .15, 0, .003, z, z + .21, PAPIR], [.06, .11, .003, .005, z + .14, z + .19, GUL], [-.1, -.01, .003, .005, z + .03, z + .1, RØD], [-.11, 0, .003, .005, z + .1, z + .13, BRUN],
          [-.15, .15, .003, .005, z, z + .03, GRØNN], [.03, .045, .003, .005, z + .03, z + .1, BLÅ], [.08, .095, .003, .005, z + .03, z + .08, BLÅ]]); }
      tekst.push(kl === 'skole' ? 'Barnetegningene henger fortsatt på veggene.' : 'En barnetegning henger på veggen.'); yield 'tegning'; }

    // HALVPAKKET KOFFERT (soverom, ellers stue/gang)
    if (ting.koffert) { const r = rom(/soverom/)[0] || rom(/stue|gang/)[0], p = r && punkt(r, 2, .8);
      if (p) { const a = rh(3) * 6.28, f = KOFFERT[Math.floor(rh(4) * KOFFERT.length)];
        K(p[0], p[1], a, [-.36, .36, -.23, .23, 0, .2, f, 'tøy']); K(p[0], p[1], a, [-.36, .36, -.71, -.27, 0, .05, f, 'tøy']);
        for (let q = 0; q < 4; q++) K(p[0], p[1], a, [-.3 + q * .15, -.17 + q * .15, -.18, .16 - rh(40 + q) * .1, .1, .2 + rh(50 + q) * .06, TØYF[Math.floor(rh(60 + q) * TØYF.length)], 'tøy']);
        blob(p[0], p[1], a, .45, .55); tekst.push('En halvpakket koffert ligger åpen på gulvet.'); } yield 'koffert'; }

    // BARRIKADE: plankene spikret for bakdøra fra innsiden, ellers stolene stablet inntil veggen ved døra
    if (ting.barrikade) { const bak = (pl.innganger || []).find(q => q !== I);
      if (bak) { const va = Math.atan2(bak.uy, bak.ux), x = bak.x - bak.nx * .07, y = bak.y - bak.ny * .07;
        for (const [z, sk] of [[.45, .06], [1.02, -.04], [1.6, .08]]) K(x, y, va + sk, [-(bak.w / 2 + .18), bak.w / 2 + .18, -.025, .025, z, z + .15, PLANKE, 'tre']);
        tekst.push('Bakdøra er spikret igjen fra innsiden.'); }
      else { const d = I.w / 2 + .55, x = I.x - I.nx * .45 + I.ux * d, y = I.y - I.ny * .45 + I.uy * d, va = Math.atan2(I.uy, I.ux);
        if (fri(x, y, .25)) { for (let q = 0; q < 3; q++) { const z = q * .46, v = va + (rh(70 + q) - .5) * .4; K(x, y, v, [-.22, .22, -.22, .22, z + .42, z + .46, BRUN, 'tre']); for (const sx of [-.19, .19]) for (const sy of [-.19, .19]) K(x, y, v, [sx - .02, sx + .02, sy - .02, sy + .02, z, z + .42, BRUN, 'tre']); }
          tekst.push('Stolene er stablet ved døra, som om noen holdt den igjen.'); } }
      yield 'barrikade'; }

    // SENGEN I STUA: en madrass på gulvet med dyne, bøtte og medisinflasker (noen var syke)
    if (ting.sykeseng) { const r = rom(/stue|dagligstue/)[0], p = r && punkt(r, 5, .9);
      if (p) { const a = rh(6) * 6.28, df = TØYF[Math.floor(rh(7) * TØYF.length)];
        K(p[0], p[1], a, [-.45, .45, -.95, .95, 0, .14, [.86, .85, .8], 'tøy']); K(p[0], p[1], a, [-.44, .44, -.45, .9, .14, .21, df, 'tøy']); K(p[0], p[1], a, [-.3, .3, -.92, -.6, .14, .24, [.95, .95, .93], 'tøy']);
        const c2 = Math.cos(a), s2 = Math.sin(a), bx = p[0] + c2 * .7, by = p[1] + s2 * .7;
        K(bx, by, 0, [-.14, .14, -.14, .14, 0, .28, [.55, .6, .65], 'glatt', true]);
        for (let q = 0; q < 3; q++) K(bx - s2 * (.3 + q * .08), by + c2 * (.3 + q * .08), 0, [-.025, .025, -.025, .025, 0, .1 + q * .02, q === 1 ? [.9, .9, .9] : [.55, .32, .12], 'glatt', true]);
        blob(p[0], p[1], a, .6, 1.1); tekst.push('Noen har ligget syk på en madrass i stua.'); } yield 'sykeseng'; }

    // TOMME MATSKAP: skapdørene på kjøkkenbenken står åpne, og noen tomme bokser ligger veltet på benken
    if (ting.skap) { const m = pl.møbler.find(m => m.type === 'kjøkkenbenk');
      if (m) { const n = Math.max(2, Math.round(m.b / .6)), w = m.b / n, b = m.b / 2, d = m.d / 2, c2 = Math.cos(m.a), s2 = Math.sin(m.a), lp = (lx, ly) => [m.x + lx * c2 - ly * s2, m.y + lx * s2 + ly * c2];
        for (let q = 0; q < n; q++) { if (rh(80 + q) > .75) continue; const hx = -b + q * w + .02, [x, y] = lp(hx, d); K(x, y, m.a + 1.2 + rh(90 + q) * .5, [0, w - .04, -.01, .01, .13, m.h - .07, [.97, .97, .95]]); }
        for (let q = 0; q < 3; q++) { const [x, y] = lp(-b + .3 + rh(100 + q) * (m.b - .6), -d * .3 + rh(110 + q) * d * .5); K(x, y, rh(120 + q) * 6.28, [-.05, .05, -.035, .035, m.h + 0, m.h + .07, [.72, .72, .7], 'glatt', true]); }
        tekst.push('Kjøkkenskapene står åpne og tomme.'); } yield 'skap'; }

    // KALENDER som stoppet en bestemt dato
    if (ting.kalender) { const v = nesteVegg(); let st = null;
      if (v) st = veggSted(v, .15 + rh(130) * .2, rh(131) < .5 ? 1 : -1);
      else { const a = P[0], b = P[1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L > 1.4) { const ex = (b[0] - a[0]) / L, ey = (b[1] - a[1]) / L; st = [a[0] + ex * .55 - ey * .03, a[1] + ey * .55 + ex * .03, Math.atan2(ey, ex), -ey, ex]; } }
      if (st) { const [x, y, va, nx, ny] = st, z = 1.25, D = [[-.15, .15, 0, .004, z, z + .44, PAPIR], [-.14, .14, .004, .006, z + .26, z + .43, TØYF[Math.floor(rh(132) * TØYF.length)]]];
        for (let r2 = 0; r2 < 4; r2++) D.push([-.13, .13, .004, .005, z + .04 + r2 * .055, z + .045 + r2 * .055, [.5, .5, .5]]);
        for (let k = 0; k < 5; k++) D.push([-.13 + k * .065, -.125 + k * .065, .004, .005, z + .04, z + .21, [.5, .5, .5]]);
        const kx = -.11 + Math.floor(rh(133) * 4) * .065, kz = z + .055 + Math.floor(rh(134) * 3) * .055; D.push([kx, kx + .05, .005, .007, kz, kz + .045, RØD]);
        påVegg(x, y, va, nx, ny, .002, D); sp.dato = S.dato(i).tekst; tekst.push('Kalenderen på veggen står på ' + sp.dato + '.'); }
      yield 'kalender'; }

    // MADRASSER på gulvet (folk har sovet her)
    if (ting.madrasser) { const R = kl === 'kirke' ? rom(/kirke/) : kl === 'skole' ? rom(/klasserom/).slice(0, 2) : kl === 'sykehus' ? rom(/korridor|gang/).slice(0, 1) : rom(/stue/); let n = 0;
      const per = kl === 'kirke' ? 7 : kl === 'skole' ? 4 : kl === 'sykehus' ? 3 : 2;
      for (const [rn, r] of R.entries()) for (let q = 0; q < per; q++) { const p = punkt(r, 140 + rn * 10 + q, .9); if (!p) continue; const a = Math.atan2(A.uy, A.ux) + (rh(160 + q) < .5 ? 0 : Math.PI / 2) + (rh(170 + q) - .5) * .3;
        K(p[0], p[1], a, [-.95, .95, -.4, .4, 0, .12, [.7, .72, .76], 'tøy']); if (rh(180 + q) < .7) K(p[0], p[1], a, [-.4, .9, -.39, .39, .12, .17, TØYF[Math.floor(rh(190 + q) * TØYF.length)], 'tøy']); n++; }
      if (n) tekst.push(n > 3 ? 'Madrasser ligger tett på gulvet – mange har sovet her.' : 'Noen har sovet på gulvet.'); yield 'madrasser'; }

    // STEARINLYS (kirker): en klynge brente lys med sot under
    if (ting.lys) { const r = rom(/kirke/)[0], p = r && punkt(r, 200, 1);
      if (p) { blob(p[0], p[1], 0, .55, .45); for (let q = 0; q < 12; q++) { const ax = p[0] + (rh(210 + q) - .5) * .8, ay = p[1] + (rh(220 + q) - .5) * .6, hh = .04 + rh(230 + q) * .16;
        K(ax, ay, 0, [-.025, .025, -.025, .025, 0, hh, [.92, .9, .84], 'glatt', true]); K(ax, ay, 0, [-.004, .004, -.004, .004, hh, hh + .012, SVART]); }
        tekst.push('Nedbrente lys står på gulvet foran alteret.'); } yield 'lys'; }

    // PAPIRHAUGER (kontor, sykehus)
    if (ting.papir) { const R = rom(/kontor|arkiv|resepsjon|vaktrom|stue/); let n = 0;
      for (const [rn, r] of R.slice(0, 3).entries()) for (let q = 0; q < 3; q++) { const p = punkt(r, 240 + rn * 7 + q, .5); if (!p) continue; const a = rh(250 + q) * 6.28, hh = .04 + rh(260 + q) * .18;
        K(p[0], p[1], a, [-.11, .11, -.15, .15, 0, hh, [.9, .89, .85]]); K(p[0], p[1], a + .3, [-.11, .11, -.15, .15, hh, hh + .01, PAPIR]); n++; }
      if (n) tekst.push('Papirer ligger i hauger på gulvet.'); yield 'papir'; }

    // SPERREBÅND, revet over: stumper fra karmen i en dør inne (sykehus)
    if (ting.sperrebånd && pl.dører.length) { const [x, y, ex, ey, w] = pl.dører[Math.floor(rh(270) * pl.dører.length)], va = Math.atan2(ey, ex);
      for (const s of [-1, 1]) for (let q = 0; q < 3; q++) { const t0 = s * (w / 2 - .02) - s * q * .12, t1 = t0 - s * .1; K(x + ex * (t0 + t1) / 2, y + ey * (t0 + t1) / 2, va, [-.05, .05, -.004, .004, 1.05 - q * .03, 1.1 - q * .03, q % 2 ? [.95, .95, .95] : [.85, .1, .08]]); }
      tekst.push('Sperrebåndet i døra er revet over.'); yield 'sperrebånd'; }

    // HANDLEKURVER veltet på gulvet (butikk)
    if (ting.kurver) { const r = rom(/butikk/)[0];
      if (r) { let n = 0; for (let q = 0; q < 7; q++) { const p = punkt(r, 280 + q, .6); if (!p) continue; const a = rh(290 + q) * 6.28; K(p[0], p[1], a, [-.22, .22, -.16, .16, 0, .24, [.75, .12, .1]]); n++; }
        if (n) tekst.push('Tomme handlekurver ligger strødd over gulvet.'); } yield 'kurver'; }

    // BREVET / LAPPEN INNE: på et bord (spisebord, salongbord, pult, kateter, skranke, kjøkkenbenk) eller på gulvet
    if ((ting.brev || (l && !S.ute(l)))) { const m = pl.møbler.find(m => /^(spisebord|salongbord|pult|kateter|skranke|langbord)$/.test(m.type)) || pl.møbler.find(m => m.type === 'kjøkkenbenk');
      let x, y, z, a; if (m) { x = m.x + (rh(310) - .5) * m.b * .4; y = m.y + (rh(311) - .5) * m.d * .3; z = m.h; a = m.a + (rh(312) - .5) * .6; } else { const r = pl.rom[0], p = r && punkt(r, 313, .6); if (p) { [x, y] = p; z = 0; a = rh(314) * 6.28; } }
      if (x !== undefined) { K(x, y, a, [-.105, .105, -.15, .15, z + .002, z + .005, PAPIR]); for (let q = 0; q < 4; q++) K(x, y, a, [-.08, .06 - q * .02, -.11 + q * .05, -.105 + q * .05, z + .005, z + .006, SVART]);
        K(x + .2, y + .05, a + .25, [-.11, .11, -.06, .06, z + .002, z + .006, [.88, .84, .74]]);
        if (l && !S.ute(l)) sp.lapp = { id: l.id, x, y, z: z + .05, ute: false };
        if (ting.brev && !l) tekst.push('Et brev ligger igjen på bordet.'); }
      yield 'brev'; }
    if (l && !sp.lapp) sp.lapp = { id: l.id, x: I.inn[0], y: I.inn[1], z: 1, ute: false };
  }

  // ---------- LAPPEN: knappen, panelet og lista ----------
  const css = document.createElement('style');
  css.textContent = `#inneknapper > #leseknapp{ order:0; } #leseknapp{ display:none; min-height:40px; padding:5px 16px; background:rgba(28,23,15,.92); border:1px solid #c9b26a; color:#f0e2b0; font:inherit; font-size:15px; cursor:pointer; } #leseknapp.på{ display:block; }
#lapppanel{ position:fixed; left:50%; transform:translateX(-50%); top:calc(var(--topp,58px) + 80px); z-index:9; display:none; width:min(400px,90vw); box-sizing:border-box; padding:16px 20px 14px;
  background:#e8e0c9; color:#2a241a; border:1px solid #8a7a58; box-shadow:0 6px 24px rgba(0,0,0,.55); font-family:"Cormorant Garamond",serif; }
#lapppanel.på{ display:block; } #lapppanel h3{ margin:0 26px 8px 0; font-size:19px; font-weight:700; color:#3a2f1e; } #lapppanel p{ margin:0 0 10px; font-size:18px; line-height:1.35; font-style:italic; }
#lapppanel small{ display:block; color:#6b5d44; font-size:13.5px; font-family:inherit; } #lapppanel .peker{ margin-top:8px; padding-top:6px; border-top:1px dashed #a8987a; font-style:normal; font-size:15px; }
#lapppanel .x{ position:absolute; right:4px; top:2px; background:none; border:0; color:#3a2f1e; font-size:22px; min-width:36px; min-height:36px; cursor:pointer; }
#sporlapp{ position:fixed; left:50%; transform:translateX(-50%); top:calc(var(--topp,58px) + 116px); z-index:5; padding:4px 14px; color:#e9dfc6; font-family:"Cormorant Garamond",serif; font-style:italic; font-size:18px;
  text-shadow:0 1px 3px #000, 0 0 10px #000; pointer-events:none; opacity:0; transition:opacity 1.6s; max-width:86vw; text-align:center; } #sporlapp.på{ opacity:1; }
body.kort #sporlapp{ top:calc(var(--topp,40px) + 104px); font-size:15px; } body.bærermøbel #lapppanel{ display:none; }`;
  document.head.appendChild(css);
  const lk = document.createElement('button'); lk.id = 'leseknapp'; lk.type = 'button'; lk.title = 'Les lappen (tast N)';
  const plass = () => { const r = document.getElementById('inneknapper'); if (r && lk.parentNode !== r) r.appendChild(lk); else if (!r && !lk.parentNode) document.body.appendChild(lk); };
  plass(); document.addEventListener('DOMContentLoaded', plass);
  const panel = document.createElement('div'); panel.id = 'lapppanel'; panel.setAttribute('role', 'dialog'); document.body.appendChild(panel);
  panel.addEventListener('pointerdown', e => e.stopPropagation());
  const stemning = document.createElement('div'); stemning.id = 'sporlapp'; stemning.setAttribute('role', 'status'); document.body.appendChild(stemning);
  const el = (t, tekst, kl) => { const e = document.createElement(t); if (kl) e.className = kl; if (tekst !== undefined) e.textContent = tekst; return e; };
  const NAVN = { hus: 'en bolig', leil: 'et leilighetsbygg', hytte: 'en hytte', skole: 'en skole', sykehus: 'et helsebygg', butikk: 'en butikk', kirke: 'en kirke', kontor: 'et kontorbygg', terminal: 'en terminal', låve: 'en låve', uthus: 'et uthus', industri: 'et industribygg', lager: 'et lager', hangar: 'en hangar' };
  const himmel = (dx, dy) => ['øst', 'nordøst', 'nord', 'nordvest', 'vest', 'sørvest', 'sør', 'sørøst'][((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8];
  function lukk() { panel.classList.remove('på'); panel.replaceChildren(); }
  // vis lappen: id, byggets nummer, stedet og klassen (fra lista eller fra huset du står i); pek = { tekst } om den peker videre
  function vis(id, i, sted, kl, pek) { const l = S.finn(id); if (!l) return false;
    const x = el('button', '×', 'x'); x.type = 'button'; x.setAttribute('aria-label', 'Lukk'); x.onclick = lukk;
    const n = T.lest.findIndex(r => r[0] === id && r[1] === i), deler = [x, el('h3', l.tittel), el('p', S.fyll(l, i, sted)), el('small', `Funnet i ${NAVN[kl] || 'et bygg'}${sted ? ' ved ' + sted : ''} · lapp ${n >= 0 ? n + 1 : T.lest.length} av ${T.lest.length} du har funnet`)];
    if (pek) deler.push(el('small', pek, 'peker'));
    panel.replaceChildren(...deler); panel.classList.add('på'); if (document.pointerLockElement) document.exitPointerLock(); return true; }
  // les lappen i huset P (fra planen): legg den i lista, og finn huset den peker på
  function lesHer(P, sp) { if (!klar) start(); const R = r3(), u = R && R.ut, i = P.bygg.i, kl = P.bygg.kl, l = S.finn(sp.lapp.id); if (!l || !u) return false;
    const X = u.cx + sp.lapp.x, Y = u.cy + sp.lapp.y, sted = stedVed(X, Y);
    const ny = !T.lest.some(r => r[0] === l.id && r[1] === i); if (ny) { T.lest.push([l.id, i, sted, kl]); if (S.LAPPER.length) logg(`Du fant en lapp: «${l.tittel}». Den ligger under Lapper i sekken.`); }
    let pek = null;
    if (l.peker === 'gjemt') { let m = T.mål.find(q => q.fra === i);
      if (!m && u.hus && u.hus.omriss) { const ferdig = window.LeteSpill && LeteSpill.lett ? LeteSpill.lett() : null, K = [];
        for (const Q of u.hus.omriss) { if (!Q || !Q.bygg || Q.leir) continue; let sx = 0, sy = 0; for (const p of Q) { sx += p[0]; sy += p[1]; } K.push({ i: Q.bygg.i, kl: Q.bygg.kl, x: u.cx + sx / Q.length, y: u.cy + sy / Q.length }); }
        const mm = S.pekerMål(i, X, Y, K, ferdig); if (mm) { m = { i: mm.i, x: Math.round(mm.x), y: Math.round(mm.y), lapp: l.id, fra: i }; T.mål.push(m); logg(`Lappen peker mot et hus ${Math.round(Math.hypot(mm.x - X, mm.y - Y))} m ${himmel(mm.x - X, mm.y - Y)} herfra – merket «Gjemt lager?» i kartet.`); if (typeof skitten !== 'undefined') skitten = true; } }
      pek = m ? (m.funnet ? 'Du har alt funnet det som lå gjemt.' : `Lappen peker mot et hus ca. ${Math.round(Math.hypot(m.x - X, m.y - Y) / 10) * 10} m ${himmel(m.x - X, m.y - Y)} herfra. Det er merket «Gjemt lager?» i kartet.`) : 'Du finner ikke huset lappen snakker om.'; }
    lagre(); return vis(l.id, i, sted, kl, pek); }
  // nærmeste lapp du kan lese nå: inne i huset du står i, eller på døra når du står ved den (innen 3,5 m)
  function lesbar(R) { if (!R || !R.fot || !window.Interior3d) return null; const c = R.cam.position, P0 = Interior3d.inne(c.x, c.y);
    if (P0 && P0.inne && P0.inne.spor && P0.inne.spor.lapp) return [P0, P0.inne.spor];
    for (const o of Interior3d.aktive ? Interior3d.aktive() : []) { const sp = o.plan.spor; if (!sp || !sp.lapp || !sp.lapp.ute) continue; if (Math.hypot(sp.lapp.x - c.x, sp.lapp.y - c.y) < 3.5) { const P = Interior3d.aktivP().find(Q => Q.inne === o.plan); if (P) return [P, sp]; } }
    return null; }
  let nåLesbar = null;
  lk.addEventListener('click', e => { e.preventDefault(); if (nåLesbar) lesHer(nåLesbar[0], nåLesbar[1]); });
  window.addEventListener('keydown', e => { if ((e.key === 'n' || e.key === 'N') && nåLesbar && !/INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '')) { if (panel.classList.contains('på')) lukk(); else lesHer(nåLesbar[0], nåLesbar[1]); } if (e.key === 'Escape' && panel.classList.contains('på')) lukk(); });
  // stemningslinja: én gang per hus (de to mest talende sporene), tones bort etter 7 s
  const sett = new Set(); let stemningTil = 0, sistP = null;
  function visStemning(sp, i) { if (SKJULT() || sett.has(i) || !sp.tekst.length) return; sett.add(i); const t = sp.tekst.slice(0, 2).join(' '); stemning.textContent = t; stemning.classList.add('på'); stemningTil = performance.now() + 7000; }
  if (typeof KROKER !== 'undefined') KROKER.ramme3d.push(R => {
    const L = lesbar(R); nåLesbar = L;
    const t = L ? 'Les lappen' + (L[1].lapp.ute ? ' på døra' : '') + ' (N)' : ''; if (lk.textContent !== t) lk.textContent = t; lk.classList.toggle('på', !!L && !(window.MoblerSpill && MoblerSpill.bærer && MoblerSpill.bærer()));
    if (!L && panel.classList.contains('på') && !(R && R.fot)) lukk();
    if (R && R.fot && window.Interior3d) { const P = Interior3d.inne(R.cam.position.x, R.cam.position.y); if (P !== sistP) { sistP = P; if (P && P.inne && P.inne.spor && P.bygg) visStemning(P.inne.spor, P.bygg.i); } }
    if (stemningTil && performance.now() > stemningTil) { stemningTil = 0; stemning.classList.remove('på'); } });

  // LISTA i sekken: lappene du har funnet (nyeste først), trykk = les igjen
  (window.SEKK_TILLEGG = window.SEKK_TILLEGG || []).push((p, e, kn) => { if (!klar) start();
    p.append(e('h3', {}, `Lapper du har funnet (${T.lest.length} av ${S.LAPPER.length})`));
    if (!T.lest.length) { p.append(e('small', {}, 'Ingen ennå. Noen hus har en lapp eller et brev – se etter «Les lappen» når du er inne.')); return; }
    for (const [id, i, sted, kl] of T.lest.slice().reverse().slice(0, 30)) { const l = S.finn(id); if (!l) continue;
      p.append(e('div', { klasse: 'rad' }, e('div', {}, e('b', {}, l.tittel), e('small', {}, `${NAVN[kl] ? NAVN[kl].replace(/^(en|et) /, '') : 'bygg'}${sted ? ' ved ' + sted : ''}`)), kn('Les', () => vis(id, i, sted, kl)))); } });

  // ---------- DET GJEMTE LAGERET ----------
  // leting-visning.js: f = SporSpill.medGjemt(P, f) før funnet legges i leiren
  function medGjemt(P, f) { if (!klar) start(); const m = P && P.bygg && T.mål.find(q => q.i === P.bygg.i && !q.funnet); if (!m) return f; const g = S.gjemt(P.bygg.i), ut = { ...f, tomt: false };
    for (const k of ['mat', 'diesel']) ut[k] = (f[k] || 0) + g[k]; m.funnet = true; lagre(); logg('Det var noe gjemt her, akkurat som lappen sa.'); if (typeof skitten !== 'undefined') skitten = true; return ut; }
  // kartet: et lite merke med spørsmålstegn over husene lappene peker mot
  if (typeof KROKER !== 'undefined') KROKER.tegn.push((g, vx0, vy1) => { if (!klar || !T.mål.length || typeof kam === 'undefined' || kam.m > 40) return;
    g.save(); g.font = '600 13px "Cormorant Garamond",serif'; g.textAlign = 'center';
    for (const m of T.mål) { if (m.funnet) continue; const x = (m.x - vx0) / kam.m, y = (vy1 - m.y) / kam.m; if (x < -40 || y < -40 || x > g.canvas.width + 40 || y > g.canvas.height + 40) continue;
      g.fillStyle = 'rgba(28,23,15,.85)'; g.strokeStyle = '#c9b26a'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, 9, 0, 6.283); g.fill(); g.stroke(); g.fillStyle = '#f0e2b0'; g.fillText('?', x, y + 4.5); if (kam.m < 8) g.fillText('Gjemt lager?', x, y - 14); }
    g.restore(); });

  // ---------- TETTSTEDENE I 3D ----------
  // (bygg3d) plassene: Spor.gate langs vegene i tettstedene + plater på husene i tettstedene; (sett3d) InstancedMesh per slag og ett nett per skilt
  const stat = { tid: 0 };
  if (typeof KROKER !== 'undefined') KROKER.bygg3d.push(async u => {
    u.spor = null; if (u.S > 2200 || !u.veger || !u.veger.length) return; const t0 = performance.now(), R = r3(), EX = R ? R.EX : 1;
    const ok = (x, y) => !(u.hus && typeof nærHus === 'function' && nærHus(u, x, y)) && !(u.iBekk && u.iBekk(x, y));
    const g = S.gate(u.veger, { cx: u.cx, cy: u.cy, ok, mobil: mobil() });
    if (børPuste()) await pust();
    // platene: hus i tettstedene (midten inne i et tettsted)
    const B = byer().filter(b => b.bb && b.bb[2] > u.cx - u.S && b.bb[0] < u.cx + u.S && b.bb[3] > u.cy - u.S && b.bb[1] < u.cy + u.S), plater = [], tak = S.REGLER.gate.tak.plate[mobil() ? 1 : 0];
    if (B.length && u.hus && u.hus.omriss && window.Garnison) for (const P of u.hus.omriss) { if (plater.length / 5 >= tak) break; if (!P || !P.bygg || P.leir || !/^(hus|leil|butikk|kontor|skole)$/.test(P.bygg.kl)) continue;
      const pl = S.plater(P, P.bygg.i); if (!pl.length) continue; let sx = 0, sy = 0; for (const p of P) { sx += p[0]; sy += p[1]; } if (!B.some(b => Garnison.inni(b, u.cx + sx / P.length, u.cy + sy / P.length))) continue;
      let gz = -Infinity; for (const p of P) gz = Math.max(gz, (hoyde3d(u.cx + p[0], u.cy + p[1], u) - u.h0) * EX);
      for (let q = 0; q < pl.length; q += 4) plater.push(pl[q] + Math.cos(pl[q + 2]) * .1, pl[q + 1] + Math.sin(pl[q + 2]) * .1, gz + .85, pl[q + 2], pl[q + 3]);
      if (børPuste()) await pust(); }
    // skiltene får teksten med nærmeste tettsted (eller det nest nærmeste for «Vi har dratt til …»)
    const tekster = []; for (let q = 0; q < g.skilt.length; q += 5) tekster.push(S.skiltTekst(g.skilt[q + 4], stedVed(u.cx + g.skilt[q], u.cy + g.skilt[q + 1], 1)));
    u.spor = { bil: new Float32Array(g.bil), barrikade: new Float32Array(g.barrikade), skilt: new Float32Array(g.skilt), tekster, plate: new Float32Array(plater) };
    stat.tid = Math.round(performance.now() - t0);
  });
  // modellene (x langs, +y til venstre, z opp, foten i 0), hjørnefarger
  function farg(g, f) { g = g.index ? g.toNonIndexed() : g; const n = g.attributes.position.count, c = new Float32Array(n * 3); for (let q = 0; q < n; q++) c.set(f, q * 3); g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g; }
  const boks = (x, y, z, sx, sy, sz, f, rz) => { const g = new THREE.BoxGeometry(sx, sy, sz); g.translate(0, 0, sz / 2); if (rz) g.rotateZ(rz); g.translate(x, y, z); return farg(g, f); };
  const hjul = (x, y) => { const g = new THREE.CylinderGeometry(.33, .33, .22, 10); g.translate(x, y, .33); return farg(g, [.08, .08, .08]); };
  function flett(gs) { const geo = MODELLER && MODELLER.samle ? MODELLER.samle(gs) : null; if (geo) { for (const g of gs) g.dispose(); return geo; }
    const n = gs.reduce((a, g) => a + g.attributes.position.count, 0), p = new Float32Array(n * 3), no = new Float32Array(n * 3), c = new Float32Array(n * 3); let o = 0;
    for (const g of gs) { p.set(g.attributes.position.array, o * 3); no.set(g.attributes.normal.array, o * 3); c.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; g.dispose(); }
    const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(p, 3)); out.setAttribute('normal', new THREE.BufferAttribute(no, 3)); out.setAttribute('color', new THREE.BufferAttribute(c, 3)); return out; }
  const BILF = [[.55, .56, .55], [.24, .27, .32], [.52, .14, .12], [.72, .72, .68], [.18, .25, .2], [.13, .13, .14], [.4, .36, .3], [.25, .32, .45]];
  function modeller() { const M = {}, H = [1, 1, 1], GL = [.16, .18, .2], ST = [.2, .2, .2];
    // forlatt bil med døra på venstre (+y) eller høyre side åpen, panseret litt opp
    const bil = s => [boks(0, 0, .32, 4.2, 1.74, .62, H), boks(-.25, 0, .94, 2.1, 1.58, .56, GL), boks(-.25, 0, 1.49, 2.0, 1.5, .04, H), boks(2.06, 0, .45, .08, 1.6, .2, ST), boks(-2.06, 0, .5, .08, 1.6, .2, ST),
      hjul(1.3, .82), hjul(1.3, -.82), hjul(-1.35, .82), hjul(-1.35, -.82), boks(.55, s * .87, .34, .06, .06, .9, H), boks(.55 - .5 * Math.cos(.9), s * (.87 + .5 * Math.sin(.9)), .34, 1.05, .05, .85, H, -s * .9),
      boks(1.45, 0, .94, 1.2, 1.6, .04, H, 0)];
    M.bilV = flett(bil(1)); M.bilH = flett(bil(-1));
    // barrikade av møbler: veltet sofa, skap på siden, bord med beina opp, stoler og planker (ca. 5 m bred, skaleres i x)
    const S2 = [.42, .3, .26], SK = [.6, .55, .48], BR = [.35, .26, .18], PL = [.55, .42, .28];
    M.barrikade = flett([boks(-1.6, 0, 0, 2, .85, .45, S2), boks(-1.6, -.35, .45, 2, .2, .4, S2), boks(.45, .1, 0, 1.9, .6, .62, SK, .12), boks(.45, .1, .62, 1.7, .55, .03, [.4, .36, .3], .12),
      boks(1.95, -.1, 0, 1.2, .8, .05, BR, -.2), ...[[-.5, -.3], [.5, -.3], [-.5, .3], [.5, .3]].map(([a, b]) => boks(1.95 + a * .9, -.1 + b * .9, .05, .05, .05, .6, BR)),
      boks(-.5, .2, .9, .45, .45, .05, BR), boks(-.5, .2, .45, .05, .05, .45, BR), boks(1.1, -.3, .65, 2.6, .12, .03, PL, .3), boks(-2.4, .2, .45, .12, 1.6, .03, PL, 1.3), boks(.3, -.35, 0, .5, .5, .5, [.62, .5, .35])]);
    // plate for et vindu: plank-farget plate (skaleres i x) med to lekter
    M.plate = flett([boks(0, 0, 0, 1, .03, 1.15, [.62, .5, .36]), boks(0, .02, .25, 1.05, .03, .08, [.5, .4, .28]), boks(0, .02, .85, 1.05, .03, .08, [.5, .4, .28])]);
    M.stolpe = flett([boks(-.75, 0, 0, .08, .08, 1.9, [.45, .34, .22]), boks(.75, 0, 0, .08, .08, 1.9, [.45, .34, .22])]);
    return M; }
  function skiltLerret(t, n) { const c = document.createElement('canvas'); c.width = 256; c.height = 160; const g = c.getContext('2d');
    g.fillStyle = n % 3 === 0 ? '#d9d2c0' : n % 3 === 1 ? '#a88a62' : '#c9c3b2'; g.fillRect(0, 0, 256, 160); g.strokeStyle = 'rgba(60,40,20,.35)'; g.lineWidth = 2; for (let y = 32; y < 160; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
    g.fillStyle = /SMITTE|IKKE/.test(t) ? '#8a1a12' : '#1a1712'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.translate(128, 80); g.rotate((n % 5 - 2) * .02);
    const ord = t.split(' '), linjer = []; let cur = ''; for (const w of ord) { const prøv = cur ? cur + ' ' + w : w; g.font = 'bold 34px Impact, "Arial Black", sans-serif'; if (g.measureText(prøv).width > 230 && cur) { linjer.push(cur); cur = w; } else cur = prøv; } if (cur) linjer.push(cur);
    const sz = linjer.length > 2 ? 28 : 34; g.font = `bold ${sz}px Impact, "Arial Black", sans-serif`; linjer.forEach((L, k) => g.fillText(L, 0, (k - (linjer.length - 1) / 2) * (sz + 4)));
    return c; }
  let LG = null;
  function fjern(R) { if (LG) for (const m of LG.mesh) { R.scene.remove(m); m.geometry.dispose(); for (const mt of [].concat(m.material)) { if (mt.map) mt.map.dispose(); mt.dispose(); } } LG = null; }
  if (typeof KROKER !== 'undefined') KROKER.sett3d.push((u, R) => {
    fjern(R); if (u.S > 2200 || !u.spor) return; const g = u.spor, M = modeller(), o = new THREE.Object3D(), col = new THREE.Color(); LG = { u, mesh: [] };
    const mat = () => new THREE.MeshLambertMaterial({ vertexColors: true });
    const lag = (geo, n, sett) => { if (!n) { geo.dispose(); return; } const m = new THREE.InstancedMesh(geo, mat(), n);
      for (let k = 0; k < n; k++) { const f = sett(k); o.position.set(f[0], f[1], f[2]); o.rotation.set(0, 0, f[3]); o.scale.set(f[4] || 1, 1, 1); o.updateMatrix(); m.setMatrixAt(k, o.matrix); if (f[5]) m.setColorAt(k, col.setRGB(...f[5])); }
      if (m.instanceColor) m.instanceColor.needsUpdate = true; m.frustumCulled = false; m.userData.kilde = 'spor-visning'; R.scene.add(m); LG.mesh.push(m); };
    const biler = [[], []]; for (let q = 0; q < g.bil.length; q += 6) biler[g.bil[q + 4] > 0 ? 0 : 1].push([g.bil[q], g.bil[q + 1], g.bil[q + 2], g.bil[q + 3], 1, BILF[g.bil[q + 5] % BILF.length]]);
    lag(M.bilV, biler[0].length, k => biler[0][k]); lag(M.bilH, biler[1].length, k => biler[1][k]);
    lag(M.barrikade, g.barrikade.length / 5, k => [g.barrikade[k * 5], g.barrikade[k * 5 + 1], g.barrikade[k * 5 + 2], g.barrikade[k * 5 + 3], g.barrikade[k * 5 + 4] / 5]);
    // plata står på veggen med forsiden ut: modellens +y er utover, retningen er normalen – dreies 90°
    lag(M.plate, g.plate.length / 5, k => [g.plate[k * 5], g.plate[k * 5 + 1], g.plate[k * 5 + 2], g.plate[k * 5 + 3] - Math.PI / 2, g.plate[k * 5 + 4]]);
    lag(M.stolpe, g.skilt.length / 5, k => [g.skilt[k * 5], g.skilt[k * 5 + 1], g.skilt[k * 5 + 2], g.skilt[k * 5 + 3]]);
    for (let k = 0; k < g.skilt.length / 5; k++) { const tex = new THREE.CanvasTexture(skiltLerret(g.tekster[k], k)), a = g.skilt[k * 5 + 3];
      const front = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1), new THREE.MeshLambertMaterial({ map: tex })); front.rotation.order = 'ZXY'; front.rotation.set(Math.PI / 2, 0, a); front.position.set(g.skilt[k * 5] + Math.sin(a) * .05, g.skilt[k * 5 + 1] - Math.cos(a) * .05, g.skilt[k * 5 + 2] + 1.35);
      const bak = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1), new THREE.MeshLambertMaterial({ color: 0x6e5a40 })); bak.rotation.order = 'ZXY'; bak.rotation.set(Math.PI / 2, Math.PI, a); bak.position.set(g.skilt[k * 5] + Math.sin(a) * .04, g.skilt[k * 5 + 1] - Math.cos(a) * .04, g.skilt[k * 5 + 2] + 1.35);
      for (const m of [front, bak]) { m.userData.kilde = 'spor-visning'; R.scene.add(m); LG.mesh.push(m); } }
    for (const k in M) if (M[k] && M[k].dispose && !LG.mesh.some(m => m.geometry === M[k])) M[k].dispose();
  });
  function antall() { const ut = { mesh: 0, trekanter: 0, tid: stat.tid, bil: 0, barrikade: 0, skilt: 0, plate: 0 }; if (!LG) return ut; const g = LG.u.spor;
    if (g) { ut.bil = g.bil.length / 6; ut.barrikade = g.barrikade.length / 5; ut.skilt = g.skilt.length / 5; ut.plate = g.plate.length / 5; }
    for (const m of LG.mesh) { ut.mesh++; const geo = m.geometry, n = geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3; ut.trekanter += n * (m.isInstancedMesh ? m.count : 1); } return ut; }

  window.SporSpill = { test: false, inne, medGjemt, lest: () => (klar || start(), T.lest.slice()), mål: () => (klar || start(), T.mål.slice()), lesHer, vis, lukk, lesbar: () => nåLesbar, antall,
    // til vakta: nullstill / sett tilstanden (setter den tilbake etterpå)
    tilstand: () => JSON.parse(JSON.stringify(T)), settTilstand: t => { T = JSON.parse(JSON.stringify(t)); lagre(); }, stemning: () => stemning.textContent };
})();
