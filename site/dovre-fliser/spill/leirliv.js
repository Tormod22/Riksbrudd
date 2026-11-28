/* Riksbrudd – LIV I LEIREN (ut9-liv, 28. nov, brukeren: «legg til detaljer og liv i spillet»): regler uten DOM.
 * Node: require('./leirliv'); nettleser: globalThis.Leirliv. Visningen står i spill/leirliv3d.js (3D) og spill/leirliv2d.js (kartet).
 *
 * Hva reglene sier:
 *  - STILLING: hva en person i leiren gjør med kroppen ut fra plassen i døgnplanen (spill/folkgang.js): ligger i køya når hen sover i en
 *    brakke, sitter ved bordet når hen spiser i kjøkkenet, står med kikkert oppe i vakttårnet, bærer planker (byggelaget) eller kasse (frakt).
 *  - RØYK fra kjøkkenets pipe ved måltidene og om kvelden, og fra fyrkjelen når det er kaldt og mørkt (kvelden og natta).
 *  - LYS i vinduene til leirens bygg når det er mørkt og folk er våkne (brakka slukker ved leggetid, vakttårnet og kontrollrommet aldri).
 *  - PLASSER for småting: vasketøy på snor ved brakka, kasser og verktøy rundt byggeplassene – aldri inni et bygg, aldri over en annen ting.
 *  - HUNDER: én hund i en leir med minst 6 personer, to med minst 16; de rusler mellom bålet, folkene og byggene og legger seg om natta.
 * Alle tall er Claudes forslag (REGLER).
 */
(function (rot) {
  'use strict';
  // ---------- REGLER (alle tallene er Claudes forslag) ----------
  const REGLER = {
    // måltidene (klokketimer): kjøkkenpipa ryker da, og hele kvelden
    måltid: [[6.5, 8.5], [11, 13], [16.5, 19.5]], kveld: [17, 23],
    // fyrkjelen ryker fra kvelden til morgenen (varme i byggene), og alltid når den brenner (produksjon)
    kjeleNatt: [16, 8],
    // røyken: så mange røykdotter per pipe, så lenge en dott lever (s), så høyt den stiger (m/s) og hvor bred den blir (m)
    røyk: { dotter: 14, liv: 9, stig: .55, bredde: [.5, 2.6] },
    // lys i vinduene: når mørket (NATT.mørke, 0–1) er over dette; brakka slukker mellom leggetid og morgen (folk sover)
    lysMørke: .18, leggetid: [23.5, 5.5],
    // byggene som har vinduer med lys (vinduene står i VINDU under)
    lysBygg: { brakke: 1, sykestue: 1, verksted: 1 },
    // så stor andel av vinduene har lys (resten er mørke rom)
    vinduAndel: .7,
    alltidLys: ['vakttårn', 'kontrollrom', 'sykestue'],
    // småting: så langt ut fra veggen (m), så mye luft rundt (m) og så mange forsøk
    ut: 1.6, luft: .8, forsøk: 12,
    // vasketøyet: snora er så lang (m), stolpene så høye (m); ett per brakke
    snor: { lengde: 4.2, høyde: 1.75, plagg: 5 },
    // byggeplassen: så mange kasser/verktøy rundt et bygg under arbeid
    byggeplass: { ting: 4 },
    // hundene
    hund: { én: 6, to: 16, fart: 1.1, løp: 2.6, vent: [4, 16], radius: 22, nærFolk: 2.2, sov: [22.5, 6] },
  };
  const R = REGLER;
  const iTid = (h, [a, b]) => (a <= b ? h >= a && h < b : h >= a || h < b);
  const hash = (a, b) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

  // ---------- stilling ----------
  // plass: fra FolkgangSpill.plass(p) ({ hva, inne, bygg, går, sover, framme }), oppgave: personens oppgave, byggType: typen til bygget hen er i,
  // tårn: står oppe i vakttårnet. Gir 'ligger', 'sitter', 'kikkert', 'planker', 'kasse' eller ''.
  function stilling(plass, oppgave, byggType, tårn) {
    if (!plass) return '';
    if (plass.inne && byggType === 'brakke' && (plass.sover || plass.hva === 'søvn')) return 'ligger';
    if (plass.inne && plass.hva === 'mat' && /kjøkken|kantine/.test(byggType || '')) return 'sitter';
    if (tårn && oppgave === 'vakt') return 'kikkert';
    if (plass.går && oppgave === 'bygg') return 'planker';
    if (plass.går && oppgave === 'frakt') return 'kasse';
    return '';
  }

  // ---------- røyk ----------
  // hvor mye det ryker (0–1) fra et bygg av typen klokka h (timer); brenner = fyrkjelen går (produksjon), kaldt = ikke sommer
  function røyk(type, h, brenner, kaldt) {
    if (type === 'kjøkken' || type === 'feltkjøkken' || type === 'kantine') return R.måltid.some(t => iTid(h, t)) ? 1 : iTid(h, R.kveld) ? .5 : 0;
    if (type === 'fyrkjele') return brenner ? 1 : iTid(h, R.kjeleNatt) ? .7 : 0;
    // brakka: ovnen fyres om kvelden og natta når det er kaldt (kaldt = vinter, vår eller høst)
    if (type === 'brakke') return kaldt && iTid(h, R.kjeleNatt) ? .45 : 0;
    return 0;
  }
  // pipene i byggets egne meter (x, y, z) – fra modellene i spill/modeller-leir2.js (kjøkkenets pipe, aggregatets eksosrør)
  const PIPE = { kjøkken: [-2.6, 2.6, 4.7], fyrkjele: [-1, .5, 2.95], brakke: [-1.4, 3, 4.45] };

  // ---------- lys i vinduene ----------
  // lyser vinduene i et bygg av typen klokka h med mørket m (0–1)? Bygg under arbeid lyser ikke.
  function lys(type, h, m, ferdig = true) {
    if (!ferdig || !R.lysBygg[type] || m < R.lysMørke) return false;
    if (R.alltidLys.includes(type)) return true;
    return !iTid(h, R.leggetid);
  }
  // vinduene på et bygg: [{ lx, ly, z, a, w, h }] i byggets egne meter (a = retningen veggen vender ut, z = midten av glasset over grunnen),
  // lest av modellene i spill/modeller-leir2.js (vind(x, y, z, b, h, side): glasset fra z til z + h). Bygg uten tabell har ingen.
  const VINDU = {
    brakke: { w: .9, h: .9, z: 1.95, sider: [[3, [-4, -1.3, 1.3, 4]], [-3, [-4, -1.3, 1.3, 4]]], ender: [[6, 0], [-6, 0]] },
    sykestue: { w: 1.1, h: 1, z: 1.95, sider: [[3.5, [-4.2, -2.4, 2.6, 4.2]], [-3.5, [-3.5, 0, 3.5]]] },
    verksted: { w: 2.2, h: .8, z: 3.4, ender: [[7, -3.5], [7, 0], [-7, -3.5], [-7, 0]] },
  };
  function vinduer(type) {
    const V = VINDU[type]; if (!V) return []; const ut = [];
    for (const [x, ys] of V.sider || []) for (const y of ys) ut.push({ lx: x + Math.sign(x) * .1, ly: y, z: V.z, a: x > 0 ? 0 : Math.PI, w: V.w, h: V.h });
    for (const [y, x] of V.ender || []) ut.push({ lx: x, ly: y + Math.sign(y) * .1, z: V.z, a: y > 0 ? Math.PI / 2 : -Math.PI / 2, w: V.w, h: V.h });
    return ut;
  }
  // brenner lyset bak vindu nr. k i bygg nr. id? (ikke alle – noen rom er mørke; i vakttårn/kontrollrom/sykestue alle)
  const vinduPå = (type, id, k) => R.alltidLys.includes(type) || hash(id, k + 17) < R.vinduAndel;

  // ---------- plasser for småting ----------
  // et punkt i byggets egne meter til kartets meter
  const tilKart = (b, lx, ly) => { const c = Math.cos(b.ret || 0), s = Math.sin(b.ret || 0); return [b.x + lx * c - ly * s, b.y + lx * s + ly * c]; };
  // er (x, y) inni et av polygonene (med margin m)?
  function inni(P, x, y) { let inn = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inn = !inn; } return inn; }
  function avstPoly(P, x, y) { let d = Infinity; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [ax, ay] = P[j], [bx, by] = P[i], vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / L2)); d = Math.min(d, Math.hypot(ax + vx * t - x, ay + vy * t - y)); } return inni(P, x, y) ? -d : d; }
  // fri: en sirkel med radius r rundt (x, y) er utenfor alle byggene (polygoner fra hjørner) og ikke nær en ting som alt er satt
  function fri(x, y, r, polys, satt, fritt) {
    for (const P of polys) if (avstPoly(P, x, y) < r) return false;
    for (const t of satt) if (Math.hypot(t.x - x, t.y - y) < r + t.r) return false;
    return !fritt || fritt(x, y, r);
  }
  // plassen til ting av slaget k ved bygget b: { x, y, a, r } eller null. fot = [x0, x1, y0, y1], polys = alle byggenes hjørner,
  // satt = ting som alt står (de fylles på), fritt(x, y, r) = en ekstra sjekk (vann, veg, hus i kartet) fra visningen.
  function plassVed(b, fot, k, polys, satt, fritt, nr = 0) {
    const [x0, x1, y0, y1] = fot, r = k === 'snor' ? R.snor.lengde / 2 + .2 : .7;
    for (let f = 0; f < R.forsøk; f++) {
      const side = (Math.floor(hash(b.id * 7 + nr, f) * 4) + f) % 4, t = .15 + .7 * hash(b.id + nr * 13, f + 31), ut = R.ut + r + hash(b.id, f + 61) * 1.5;
      // sidene: 0 = +x, 1 = −x, 2 = +y, 3 = −y; snora står parallelt med veggen
      const lx = side === 0 ? x1 + ut : side === 1 ? x0 - ut : x0 + (x1 - x0) * t, ly = side === 2 ? y1 + ut : side === 3 ? y0 - ut : y0 + (y1 - y0) * t;
      const [x, y] = tilKart(b, lx, ly), a = (b.ret || 0) + (side < 2 ? Math.PI / 2 : 0);
      if (fri(x, y, r + R.luft * .5, polys, satt, fritt)) { const p = { x, y, a, r, k, bygg: b.id }; satt.push(p); return p; }
    }
    return null;
  }
  // alle småtingene i leiren: vasketøy ved hver ferdige brakke, kasser og verktøy ved byggene under arbeid.
  // bygg: [{ id, type, x, y, ret, ferdig, fot }], hjørner(b) gir polygonet. Gir [{ x, y, a, r, k ('snor' | 'kasse' | 'verktøy' | 'bukk'), bygg }].
  function småting(bygg, hjørner, fritt) {
    const polys = bygg.map(b => hjørner(b)).filter(P => P && P.length >= 3), satt = [];
    for (const b of bygg) {
      if (!b.fot) continue;
      if (b.type === 'brakke' && b.ferdig) plassVed(b, b.fot, 'snor', polys, satt, fritt);
      if (!b.ferdig) for (let i = 0; i < R.byggeplass.ting; i++) plassVed(b, b.fot, ['kasse', 'verktøy', 'bukk', 'kasse'][i % 4], polys, satt, fritt, i + 1);
    }
    return satt;
  }

  // ---------- hundene ----------
  const antallHunder = n => (n >= R.hund.to ? 2 : n >= R.hund.én ? 1 : 0);
  function nyHund(nr, leir) { const a = hash(nr, 3) * 6.283; return { nr, x: leir.x + Math.cos(a) * 5, y: leir.y + Math.sin(a) * 5, a, tx: null, ty: null, vent: 2 + nr, går: 0, ligger: 0, løper: 0 }; }
  // sovestedet: første frie punkt på ringer rundt leirens midte (hunden nr. 1 begynner på motsatt side)
  function sovPlass(nr, ctx) {
    for (const r of [2.5, 4, 6, 9, 13]) for (let k = 0; k < 8; k++) { const a = (k + (nr ? 4 : 0)) * Math.PI / 4 + .4, x = ctx.leir.x + Math.cos(a) * r, y = ctx.leir.y + Math.sin(a) * r; if (!ctx.fri || ctx.fri(x, y)) return [x, y]; }
    return [ctx.leir.x, ctx.leir.y];
  }
  // ett steg (dt sekunder) for hunden h. ctx: { leir, h (klokka), folk: [[x, y]], bygg: [[x, y]], fri(x, y), rnd }
  function hundSteg(h, dt, ctx) {
    const H = R.hund, rnd = ctx.rnd || Math.random, natt = iTid(ctx.h, H.sov);
    if (natt) { h.går = 0; h.løper = 0;
      // om natta: går til en fri plass ved bålet (leirens midte) og legger seg
      if (!h.sov) h.sov = sovPlass(h.nr, ctx);
      const d = Math.hypot(h.sov[0] - h.x, h.sov[1] - h.y);
      if (d > .6) { if (h.tx === null || Math.hypot(h.tx - h.sov[0], h.ty - h.sov[1]) > .1) { h.tx = h.sov[0]; h.ty = h.sov[1]; h.vent = 0; } } else { h.ligger = Math.min(1, h.ligger + dt); return h; } }
    else { h.sov = null; if (h.ligger > 0 && h.vent > 0) { h.vent -= dt; return h; } }
    if (h.tx === null) {
      if (h.vent > 0) { h.vent -= dt; h.går = 0; return h; }
      // velg et nytt mål: en person (halvparten av gangene), et bygg, eller bålet
      const v = rnd(); let m = null;
      if (v < .5 && ctx.folk.length) { const p = ctx.folk[Math.floor(rnd() * ctx.folk.length)], a = rnd() * 6.283; m = [p[0] + Math.cos(a) * H.nærFolk, p[1] + Math.sin(a) * H.nærFolk]; }
      else if (v < .8 && ctx.bygg.length) { const b = ctx.bygg[Math.floor(rnd() * ctx.bygg.length)], a = rnd() * 6.283; m = [b[0] + Math.cos(a) * 9, b[1] + Math.sin(a) * 9]; }
      else { const a = rnd() * 6.283, r = 3 + rnd() * 5; m = [ctx.leir.x + Math.cos(a) * r, ctx.leir.y + Math.sin(a) * r]; }
      // aldri langt fra leiren
      const dl = Math.hypot(m[0] - ctx.leir.x, m[1] - ctx.leir.y); if (dl > H.radius) { m[0] = ctx.leir.x + (m[0] - ctx.leir.x) * H.radius / dl; m[1] = ctx.leir.y + (m[1] - ctx.leir.y) * H.radius / dl; }
      if (!ctx.fri || ctx.fri(m[0], m[1])) { h.tx = m[0]; h.ty = m[1]; h.løper = rnd() < .2 ? 1 : 0; h.ligger = 0; } else { h.vent = .5; return h; }
    }
    const dx = h.tx - h.x, dy = h.ty - h.y, d = Math.hypot(dx, dy), v = h.løper ? H.løp : H.fart;
    if (d < .3) { h.tx = h.ty = null; h.går = 0; h.vent = H.vent[0] + rnd() * (H.vent[1] - H.vent[0]); if (!natt && rnd() < .35) h.ligger = 1; return h; }
    const st = Math.min(d, v * dt); let ret = Math.atan2(dy, dx), nx = h.x + Math.cos(ret) * st, ny = h.y + Math.sin(ret) * st;
    // et bygg eller en hindring i veien: gå rundt (skrått til samme side som sist), ellers finn et nytt mål
    if (ctx.fri && !ctx.fri(nx, ny)) { let fant = false; const sd = h.side || 1;
      for (const t of [sd, -sd]) for (const v of [.6, 1.1, 1.6, 2.1]) { if (fant) break; const r2 = ret + v * t, x2 = h.x + Math.cos(r2) * st, y2 = h.y + Math.sin(r2) * st;
        if (ctx.fri(x2, y2)) { fant = true; ret = r2; nx = x2; ny = y2; h.side = t; } }
      if (!fant) { h.tx = h.ty = null; h.vent = .3; h.går = 0; return h; } }
    h.x = nx; h.y = ny; let da = ret - h.a; da = Math.atan2(Math.sin(da), Math.cos(da)); h.a += da * Math.min(1, dt * 5); h.går = h.løper ? 2 : 1; h.ligger = 0;
    return h;
  }

  const api = { REGLER, stilling, røyk, PIPE, lys, VINDU, vinduer, vinduPå, tilKart, inni, avstPoly, fri, plassVed, småting, antallHunder, nyHund, hundSteg, iTid, hash };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else rot.Leirliv = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
