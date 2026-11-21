/* Riksbrudd – FOLKENE I LEIREN SOM FIGURER (16. nov, brukeren: «mer detaljerte karakterer»).
 * Hver person i gjengen (høyst 14) er en figur med kropp, hode med hår eller lue, sekk på noen, og armer og bein som svinger når de går.
 * (Runde 7: figuren er den felles, avrundede figuren i spill/figur3d.js – se nederst. Før: fem instansnett av kasser.)
 * De går mellom byggene, stopper opp, og går rundt hindringer. Erstatter de enkle klossfigurene fra spillet-visning.js.
 * RUNDE 4 (18. nov dag): barna og de gamle (SamfunnSpill.tilstand().avhengige, høyst 8) er også figurer – barna mindre og raskere, de
 * gamle krumme (overkroppen bøyd fram) og langsomme. Operatørene står INNE i kontrollrommet, kokken i kjøkkenet, stell og syke i
 * karantene i sykestua (eller brakka), mekanikeren i verkstedet – på en fri plass på gulvet i interiøret (Interior3d.egne(), samme plan
 * og gulvhøyde som når du går inn). Vakta står oppe på plattformen i vakttårnet og speider utover.
 */
(function () {
  'use strict';
  // RUNDE 13 (21. nov, kritiker H: «en av folkene står stiv rett foran deg» i gåmodus). Folk i leiren holder avstand til deg når du går:
  // står eller går en figur nærmere enn UNNA.avst, går den unna til et sted UNNA.til meter fra deg (bort fra deg og litt til siden),
  // og nærmere enn UNNA.inntil flyttes den straks ut (ellers står den inne i kameraet). Regelen er uten DOM (test_folk3d.js).
  // Claudes forslag (meter).
  // (runde 14, kritiker I: «en person står rett foran kameraet når gåmodus starter») de første UNNA.startTid ms du går, flyttes alle
  // nærmere enn UNNA.start m straks ut dit (første bilde har minst 2 m fri sikt), og går så videre unna
  const UNNA = { avst: 2.6, til: 4.5, inntil: 1.1, start: 2.6, startTid: 2000 };
  const STARTREGEL = { ...UNNA, avst: Math.max(UNNA.avst, UNNA.start), inntil: UNNA.start };
  // (px, py) = deg, (fx, fy) = figuren, side = −1/1 (hvilken side den går til). Gir null (lang nok unna) eller
  // { tx, ty (målet), flytt: [x, y] eller null (skyv ut straks) }.
  function unna(px, py, fx, fy, side = 1, R = UNNA) {
    let dx = fx - px, dy = fy - py, d = Math.hypot(dx, dy); if (d >= R.avst) return null;
    if (d < 1e-3) { dx = 1; dy = 0; d = 1; } const ux = dx / d, uy = dy / d;
    // bort fra deg, vridd ca. 35° til siden, så den ikke går rett fram i synsfeltet ditt
    const v = .6 * side, cx = ux * Math.cos(v) - uy * Math.sin(v), cy = ux * Math.sin(v) + uy * Math.cos(v);
    return { tx: px + cx * R.til, ty: py + cy * R.til, flytt: d < R.inntil ? [px + ux * R.inntil, py + uy * R.inntil] : null };
  }
  // tiden siden forrige bilde (sekunder), høyst DT_MAKS: før gikk figurene 0,016 s per bilde – med ett bilde i sekundet (svak maskin)
  // gikk de 2 cm i sekundet og så ut som de sto stive. Claudes forslag: 0,25 s.
  const DT_MAKS = .25;
  const dtFra = (ms, sist) => (sist ? Math.max(0, Math.min(DT_MAKS, (ms - sist) / 1000)) : .016);
  if (typeof window === 'undefined') { if (typeof module !== 'undefined') module.exports = { UNNA, STARTREGEL, unna, DT_MAKS, dtFra }; return; }
  const r3 = () => (typeof R3 !== 'undefined' ? R3 : null), MAKS = 14, MAKS_AVH = 8, ALLE = MAKS + MAKS_AVH;
  const JAKKER = [[.35, .42, .3], [.5, .32, .22], [.25, .33, .45], [.55, .5, .35], [.42, .25, .25], [.3, .3, .32], [.62, .46, .2], [.2, .36, .3], [.48, .44, .5]];
  const BUKSER = [[.2, .21, .25], [.26, .22, .17], [.16, .2, .16], [.3, .3, .32], [.18, .18, .2]];
  // barna går i friskere farger, de gamle i grått og brunt
  // hårfarger (brunt, mørkt, lyst, rødbrunt) – de gamle grå og hvite
  const HÅR = [[.22, .17, .12], [.1, .08, .07], [.62, .5, .3], [.36, .2, .1], [.3, .24, .18]], HÅR_GAMMEL = [[.72, .72, .7], [.58, .58, .57], [.88, .87, .85]];
  const BARNJAKKER = [[.75, .22, .2], [.2, .45, .75], [.85, .7, .2], [.3, .62, .35], [.7, .35, .6]], GAMLEJAKKER = [[.42, .4, .38], [.38, .3, .24], [.3, .32, .3], [.5, .46, .4]];
  // Claudes forslag: fart (m/s), størrelse og hvor krum overkroppen er (radianer fram) per slags figur
  const SLAG = { voksen: { fart: 1.25, s: 1, krum: 0 }, barn: { fart: 1.7, s: .62, krum: 0 }, gammel: { fart: .75, s: .95, krum: .32 } };
  let figurer = null, nøkkel = '', sistMs = 0, fotFra = 0;
  // PÅ PLASS (18. nov): folk holder seg ved bygget der oppgaven deres hører hjemme (vakta ved tårnet, kokken ved kjøkkenet,
  // operatørene ved kontrollrommet, byggelaget ved byggeplassen). De som er syke i karantene, står ved sykestua eller brakka.
  const ARBEIDSSTED = { vakt: ['vakttårn', 'port'], kjøkken: ['kjøkken'], stell: ['sykestue'], verksted: ['verksted'], overvåking: ['kontrollrom'], frakt: ['lagertelt', 'container'] };
  // (runde 4) disse byggene har interiør (spill/interior3d.js LEIRBYGG): her står folk inne
  const INNE = new Set(['kontrollrom', 'kjøkken', 'sykestue', 'verksted', 'brakke']);
  // halve bredden av bygget (fra fotavtrykket), så folk står like utenfor veggen – også ved det smale vakttårnet
  const halv = b => { const f = window.Leir && Leir.BYGG[b.type] && Leir.BYGG[b.type].fot; return f ? Math.max(1.5, Math.min(7, Math.max(Math.abs(f[0]), Math.abs(f[1]), Math.abs(f[2]), Math.abs(f[3])))) : 5; };
  function arbeidssted(pers, bygg, i) {
    if (!pers || !bygg.length) return null; let typer = ARBEIDSSTED[pers.oppgave];
    if (pers.karantene) typer = bygg.some(b => b.type === 'sykestue' && !(b.igjen > 0)) ? ['sykestue'] : ['brakke'];
    if (pers.oppgave === 'bygg' && !pers.karantene) { const u = bygg.filter(b => b.igjen > 0); return u.length ? u[i % u.length] : null; }
    if (!typer) return null; const B = bygg.filter(b => typer.includes(b.type) && !(b.igjen > 0)); return B.length ? B[i % B.length] : null;
  }
  const hash = (a, b) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

  // ---------- plassene inne i byggene og oppe i tårnet ----------
  const planer = new WeakMap(), tårnZ = new Map();
  // en fri plass på gulvet inne i leirbygget b til figur nr. i: { x, y (kartets meter), z (3D), a, uteX, uteY (like utenfor døra), u }
  function innePlass(b, i, R, u) {
    if (!window.Interior3d || !Interior3d.egne || !window.Interior) return null;
    const e = Interior3d.egne().find(q => q.P.bygg && q.P.bygg.i === 9000000 + b.id); if (!e) return null; const P = e.P;
    let c = planer.get(P);
    if (!c) { let pl = null; try { pl = Interior.plan(P, { i: P.bygg.i, kl: P.bygg.kl, h: P.bygg.h, dør: P.dør, senger: P.bygg.senger }); } catch (er) { pl = null; } if (!pl) return null;
      // gulvet som i interior3d.js: over det høyeste terrenget under bygget, men minst P.gulvFast
      let maks = -Infinity, mx = 0, my = 0; for (const [x, y] of P) { maks = Math.max(maks, (hoyde3d(u.cx + x, u.cy + y, u) - u.h0) * R.EX); mx += x; my += y; } mx /= P.length; my /= P.length;
      const gulv = Math.max(P.gulvFast, Math.min(maks + .06, (P.veggTopp || P.gulvFast + 2.6) - 2));
      let nx = -P.dør.uy, ny = P.dør.ux; if (nx * (P.dør.x - mx) + ny * (P.dør.y - my) < 0) { nx = -nx; ny = -ny; }
      c = { pl, gulv, mx, my, ute: [P.dør.x + nx * 1.3, P.dør.y + ny * 1.3] }; planer.set(P, c); }
    const bb = c.pl.bb; let x = null, y = null;
    for (let f = 0; f < 30 && x === null; f++) { const px = bb[0] + .4 + hash(i * 31 + f, b.id) * (bb[2] - bb[0] - .8), py = bb[1] + .4 + hash(i * 31 + f, b.id + 7) * (bb[3] - bb[1] - .8);
      if (Interior.inni(P, px, py) && Interior.avstKant(P, px, py) > .55 && !Interior.blokkert(c.pl, px, py) && Math.hypot(px - P.dør.x, py - P.dør.y) > 1.3) { x = px; y = py; } }
    if (x === null) return null;
    const gulv = P.inne && typeof P.inne.gulv === 'number' ? P.inne.gulv : c.gulv;
    return { x: u.cx + x, y: u.cy + y, z: gulv, a: Math.atan2(c.my - y, c.mx - x) + (hash(i, b.id + 3) - .5) * 2, uteX: u.cx + c.ute[0], uteY: u.cy + c.ute[1], u, b: b.id };
  }
  // vakta oppe på plattformen i vakttårnet (modeller.js: plattformen ligger 5,65 m over grunnen, ganget med nivået)
  function tårnPlass(b, i, R, u) {
    const k = 1 + ((b.nivå || 1) - 1) * .08, c = Math.cos(b.ret || 0), s = Math.sin(b.ret || 0), pk = (lx, ly) => [b.x + (lx * c - ly * s) * k, b.y + (lx * s + ly * c) * k];
    let z = tårnZ.get(b.id); if (!z || z.u !== u || z.x !== b.x || z.y !== b.y) { const G = window.LeirSpill && LeirSpill.grunn3d ? LeirSpill.grunn3d(b, u, R) : null; z = { u, x: b.x, y: b.y, topp: G ? G.topp : (hoyde3d(b.x, b.y, u) - u.h0) * R.EX }; tårnZ.set(b.id, z); }
    const lx = (hash(i, b.id) - .5) * 1.2, ly = (hash(i, b.id + 1) - .5) * 1.2, [x, y] = pk(lx, ly), [fx, fy] = pk(.9, -2.5);
    return { x, y, z: z.topp + 5.65 * k, a: Math.atan2(ly, lx) + (b.ret || 0), uteX: fx, uteY: fy, u, b: b.id, tårn: true };
  }
  function plassVed(b, i, R, u) { if (!b || b.igjen > 0) return null; if (b.type === 'vakttårn') return tårnPlass(b, i, R, u); return INNE.has(b.type) ? innePlass(b, i, R, u) : null; }

  // RUNDE 7 (20. nov, kritikerne: «menneskene er kantete klosser»): figurene er den felles, avrundede figuren i spill/figur3d.js – én
  // flokk (to nett: nær og fjern). Bevegelsen (beina og armene svinger, armene fram med en kasse når de bærer, krum overkropp for de
  // gamle, større hode på barna, vakta med gevær) regnes i skyggeleggeren; her settes bare plass, retning og stilling per figur.
  const HUD = [[.86, .69, .56], [.8, .62, .49], [.66, .48, .36], [.92, .79, .68], [.47, .33, .25]];
  // Claudes forslag: hvor mange som har langt hår, lue og sekk
  const ANDEL = { langt: .3, lue: .2, sekk: .15 };
  let flokk = null, obj = null;
  function lag(R) { if (flokk) flokk.kast(); const D = Figur3d.DEL; flokk = Figur3d.flokk(R, { maks: ALLE, kilde: 'folk3d.js', deler: D.hår | D.langt | D.lue | D.sekk | D.kasse | D.gevær }); obj = new THREE.Object3D(); figurer = null; nøkkel = ''; }
  KROKER.ramme3d.push(R => { if (!R.ut || typeof THREE === 'undefined' || !window.Figur3d || !window.FolkSpill || !window.OppstartSpill) return; const F = FolkSpill.tilstand(), S = OppstartSpill.tilstand(), leir = S && S.leir, u = R.ut; if (!F || !leir) return;
    if (!flokk || flokk.scene !== R.scene || !flokk.nær.parent) lag(R);
    const SS = window.SamfunnSpill && SamfunnSpill.tilstand && SamfunnSpill.tilstand(), AVH = SS && SS.avhengige ? SS.avhengige.slice(0, MAKS_AVH) : [];
    const nV = Math.min(MAKS, F.personer.length), n = nV + AVH.length, nær = Math.abs(leir.x - u.cx) < u.S - 60 && Math.abs(leir.y - u.cy) < u.S - 60, vis = nær && n > 0; flokk.synlig(vis); if (!vis) return;
    const pers = i => (i < nV ? F.personer[i] : AVH[i - nV]), D = Figur3d.DEL;
    const ny = F.personer.slice(0, nV).map(p => p.id).join(',') + '|' + AVH.map(a => a.id).join(',');
    if (!figurer || ny !== nøkkel) { const gamle = new Map((figurer || []).map(p => [p.nøkkel, p])); figurer = []; nøkkel = ny;
      for (let i = 0; i < n; i++) { const p = pers(i), slag = i < nV ? 'voksen' : p.type === 'barn' ? 'barn' : 'gammel', id = (i < nV ? 'p' : 'a') + (p.id || i), h = (((p.id || i) + (i < nV ? 0 : 977)) * 2654435761) >>> 0;
        const liste = slag === 'barn' ? BARNJAKKER : slag === 'gammel' ? GAMLEJAKKER : JAKKER, j = liste[h % liste.length], bk = BUKSER[(h >>> 8) % BUKSER.length], før = gamle.get(id);
        const f = før || { nøkkel: id, slag, x: leir.x + (Math.random() - .5) * 40, y: leir.y + (Math.random() - .5) * 40, tx: 0, ty: 0, vent: Math.random() * 6, a: Math.random() * 6.28, fase: 0, går: 0, s: SLAG[slag].s * (.94 + ((h >>> 16) % 13) / 100), inne: null, mål: null };
        // utseendet står fast per person: hårfarge (grått og hvitt på de gamle), hud, langt hår, lue eller sekk
        const HL = slag === 'gammel' ? HÅR_GAMMEL : HÅR, hf = HL[(h >>> 12) % HL.length], r = k => hash(h % 100000, k);
        f.farger = Figur3d.farger(j, bk, hf, HUD[(h >>> 20) % HUD.length]);
        f.maske = (r(1) < ANDEL.lue && slag !== 'barn' ? D.lue : r(2) < ANDEL.langt && slag !== 'gammel' ? D.hår | D.langt : D.hår) | (slag === 'voksen' && r(3) < ANDEL.sekk ? D.sekk : 0);
        figurer.push(f); } }
    const L = window.LeirSpill && LeirSpill.tilstand(), bygg = L && window.Leir ? L.bygg.filter(b => b.x !== undefined && !Leir.BYGG[b.type].del && Math.hypot(b.x - leir.x, b.y - leir.y) < 150) : [], nåMs = performance.now(), dt = tempo > 0 ? dtFra(nåMs, sistMs) : 0; sistMs = nåMs;
    // (runde 13) du går selv: her står du (kartets meter)
    const meg = R.fot && R.bane ? [u.cx + R.bane.x, u.cy + R.bane.y] : null;
    if (!meg) fotFra = 0; else if (!fotFra) fotFra = nåMs;
    const regel = meg && nåMs - fotFra < UNNA.startTid ? STARTREGEL : UNNA;
    const brakker = bygg.filter(b => b.type === 'brakke' && !(b.igjen > 0));
    flokk.start();
    figurer.forEach((p, i) => { let går = 0; const q = pers(i), G = SLAG[p.slag] || SLAG.voksen, syk = !!(q && q.syk);
      // et nytt utsnitt: plassen inne gjelder ikke lenger (høyden er regnet fra det gamle) – gå ut døra
      if (p.inne && p.inne.u !== u) { p.x = p.inne.uteX; p.y = p.inne.uteY; p.inne = null; p.tx = 0; }
      if (p.mål && p.mål.u !== u) p.mål = null;
      // (runde 13) står den inntil deg ute: gå unna (står tiden, flyttes bare den som er helt inntil deg – du skal ikke se rett inn i en jakke)
      if (meg && !p.inne) { const un = unna(meg[0], meg[1], p.x, p.y, i % 2 ? 1 : -1, regel);
        if (un) { if (un.flytt) { p.x = un.flytt[0]; p.y = un.flytt[1]; } p.tx = un.tx; p.ty = un.ty; p.mål = null; p.etter = null; p.omveg = 0; p.vent = 0; p.unna = true; } }
      if (p.inne) { if (p.vent > 0) p.vent -= dt; else { p.x = p.inne.uteX; p.y = p.inne.uteY; p.inne = null; p.tx = 0; p.vent = 1 + Math.random() * 3; } }
      else if (p.vent > 0) p.vent -= dt; else { const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy);
        if (p.tx && d < .6 && p.etter) { p.tx = p.etter[0]; p.ty = p.etter[1]; p.etter = null; }
        else if (p.tx && d < .6 && p.mål) { p.inne = p.mål; p.mål = null; p.omveg = 0; p.x = p.inne.x; p.y = p.inne.y; p.a = p.inne.a; p.vent = 25 + Math.random() * 60; }
        else if (!p.tx || d < .6) { velgMål(p, i, q, bygg, brakker, leir, R, u); }
        else { const v = G.fart * (syk ? .7 : 1), nx = p.x + dx / d * v * dt, ny = p.y + dy / d * v * dt; if (typeof hindring3d === 'function' && hindring3d(nx - u.cx, ny - u.cy)) {
            // på vei til døra: gå en omveg til siden (høyst fire ganger), ellers finn et nytt mål
            if (p.mål && (p.omveg || 0) < 4) { p.omveg = (p.omveg || 0) + 1; if (!p.etter) p.etter = [p.tx, p.ty]; const sd = p.omveg % 2 ? 1 : -1; p.tx = p.x - dy / d * 3 * sd; p.ty = p.y + dx / d * 3 * sd; }
            else { p.tx = 0; p.mål = null; p.etter = null; p.omveg = 0; } } else { p.x = nx; p.y = ny; let da = Math.atan2(dy, dx) - p.a; da = Math.atan2(Math.sin(da), Math.cos(da)); p.a += da * Math.min(1, dt * 6); p.fase += v * dt * 4.2; går = 1; } } }
      p.går += (går - p.går) * Math.min(1, dt * 8 + (dt ? 0 : 1));
      if (q && q.borte) return;
      // vakta i tårnet speider sakte fram og tilbake; de som står inne, snur seg litt innimellom
      const a = p.inne ? p.inne.a + Math.sin(performance.now() / (p.inne.tårn ? 4000 : 7000) + i) * (p.inne.tårn ? .7 : .4) : p.a, z = p.inne ? p.inne.z : (hoyde3d(p.x, p.y) - u.h0) * R.EX;
      // de som frakter eller bygger, bærer en kasse når de går; vakta har gevær (lavt når hun går, klart når hun står)
      const oppg = q && !q.karantene && p.slag === 'voksen' ? q.oppgave : '', bær = (oppg === 'frakt' || oppg === 'bygg') && !p.inne ? p.går : 0, vakt = oppg === 'vakt';
      obj.position.set(p.x - u.cx, p.y - u.cy, z); obj.rotation.set(0, 0, a); obj.scale.setScalar(p.s); obj.updateMatrix();
      flokk.legg(obj.matrix, { fase: p.fase, sving: p.går, bære: vakt ? 0 : bær, sikte: vakt ? .45 * (1 - p.går) : 0, krum: G.krum + (syk ? .12 : 0), barn: p.slag === 'barn' ? 1 : 0,
        maske: p.maske | (bær > .5 && !vakt ? D.kasse : 0) | (vakt ? D.gevær : 0), farger: p.farger }); });
    flokk.slutt(); });
  // hvor en figur går nå: til arbeidsplassen (inn i bygget eller opp i tårnet), et tilfeldig bygg, eller (barn og gamle) rundt brakka
  function velgMål(p, i, q, bygg, brakker, leir, R, u) {
    const rnd = Math.random; let b = null, r = 0, hos = false;
    if (p.slag === 'voksen' || (q && q.karantene)) { const jobb = arbeidssted(q, bygg, i); hos = !!jobb && rnd() < .85;
      if (hos) { const pl = plassVed(jobb, i, R, u); if (pl) { p.mål = pl; p.tx = pl.uteX; p.ty = pl.uteY; p.etter = null; p.omveg = 0; p.hos = jobb.type; return; } }
      b = hos ? jobb : bygg.length && rnd() < .75 ? bygg[Math.floor(rnd() * bygg.length)] : null; r = hos ? halv(jobb) + 1 + rnd() * 2 : b ? 7 + rnd() * 5 : rnd() * 30; }
    else { const ved = brakker.length ? brakker[Math.floor(rnd() * brakker.length)] : null;
      // barna leker rundt brakka og leiren; de gamle holder seg nær brakka og står lenge
      b = ved && rnd() < (p.slag === 'gammel' ? .85 : .6) ? ved : null; r = b ? halv(b) + 1.5 + rnd() * (p.slag === 'barn' ? 10 : 4) : rnd() * (p.slag === 'barn' ? 25 : 12); }
    const v = rnd() * 6.283; p.tx = (b ? b.x : leir.x) + Math.cos(v) * r; p.ty = (b ? b.y : leir.y) + Math.sin(v) * r; p.mål = null;
    p.etter = null; p.omveg = 0; p.vent = p.slag === 'gammel' ? 10 + rnd() * 40 : hos ? 8 + rnd() * 30 : 2 + rnd() * 14; p.hos = hos && b ? b.type : '';
  }
  window.Folk3d = { UNNA, STARTREGEL, unna, antall: () => (flokk && flokk.nær.visible ? flokk.antall() : 0), figurer: () => figurer, nett: () => (flokk ? { nær: flokk.nær, fjern: flokk.fjern } : null), flokk: () => flokk, plassVed: (b, i) => { const R = r3(); return R && R.ut ? plassVed(b, i, R, R.ut) : null; } };
})();
