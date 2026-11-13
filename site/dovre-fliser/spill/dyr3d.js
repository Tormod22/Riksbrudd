'use strict';
// Dyr i 3D (nær kameraet, utsnitt S ≤ 2200): sau på hei, snaufjell og innmark om sommeren og høsten, kyr på innmarka om sommeren,
// villrein på høyfjellet og moskus ved Snøhetta året rundt, og en sjelden elg i skogkanten. Reglene (hvor, flokk, flukt) i spill/dyr.js.
// Kroker: KROKER.bygg3d (finner flokkene og en maske over vann og veg), KROKER.sett3d (lager nettene), KROKER.ramme3d (flytter dyrene).
// Hvert dyr er én instans i ett nett per art; beina svinger og hodet går ned (beiting) i en liten tilføyelse i vertex-shaderen.
(function () {
  const W = 1024;
  const maks = () => (VW < 900 ? 150 : 400);
  let D = null, sist = 0;

  // ---------- utsnittet: maske (vann, veg, asfalt), hindringer (hus og trær), flokkenes plasser ----------
  KROKER.bygg3d.push(async (u, { px, TW }) => {
    if (u.S > 2200) return;
    const b = [u.cx - u.S - 60, u.cy - u.S - 60, u.cx + u.S + 60, u.cy + u.S + 60], kv = await lagVindu(b, false, 9);
    const m = new Uint8Array(W * W), celle = 2 * u.S / W, st = TW / W;
    for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
      const q = (Math.floor((j + .5) * st) * TW + Math.floor((i + .5) * st)) * 4, R = px[q], G = px[q + 1], B = px[q + 2];
      const vann = B > R + 18 && B > G + 4, grå = Math.abs(R - G) + Math.abs(G - B) < 14 && .3 * R + .59 * G + .11 * B < 120;
      if (vann || grå) m[j * W + i] = 1;
      else if (u.påVeg && u.påVeg(-u.S + (i + .5) * celle, u.S - (j + .5) * celle)) m[j * W + i] = 2;
    }
    // tunet rundt husene (omrisset + 6 m) er stengt for dyrene, så de ikke står inntil veggene
    for (const P of (u.hus && u.hus.omriss) || []) { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of P) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      for (let j = Math.max(0, Math.floor((u.S - y1 - 6) / celle)); j <= Math.min(W - 1, Math.floor((u.S - y0 + 6) / celle)); j++)
        for (let i = Math.max(0, Math.floor((x0 - 6 + u.S) / celle)); i <= Math.min(W - 1, Math.floor((x1 + 6 + u.S) / celle)); i++) m[j * W + i] = 3; }
    // flyplassen: 120 m rundt rullebaner, taksebaner og oppstillingsplasser (u.flyplass fra spill/anlegg3d.js) er stengt
    for (const P of u.flyplass || []) { const r = 120, rc = Math.ceil(r / celle);
      for (let q = 1; q < P.length; q++) { const [ax, ay] = P[q - 1], [bx, by] = P[q], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 40));
        for (let s = 0; s <= n; s++) { const ci = Math.floor((ax + (bx - ax) * s / n + u.S) / celle), cj = Math.floor((u.S - (ay + (by - ay) * s / n)) / celle);
          for (let dj = -rc; dj <= rc; dj++) for (let di = -rc; di <= rc; di++) { const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= W || j >= W || di * di + dj * dj > rc * rc) continue; if (!m[j * W + i]) m[j * W + i] = 4; } } } }
    u.dyrMaske = { m, celle };
    // tettstedene: ingen beitedyr, elg, rundballer eller gårdsgjerder inne i byen (feiljakten 12. nov: 99 sauer i Tromsø sentrum)
    const byer = typeof INFRA !== 'undefined' && INFRA && INFRA.tettsted && window.Garnison ? INFRA.tettsted.filter(t => t.bb[2] > u.cx - u.S && t.bb[0] < u.cx + u.S && t.bb[3] > u.cy - u.S && t.bb[1] < u.cy + u.S) : [];
    // svaret huskes i ruter på 16 m (lovlig() kalles for hvert dyr mens de går)
    const NB = Math.ceil(2 * u.S / 16), byRute = new Uint8Array(NB * NB);
    u.iBy = byer.length ? (x, y) => { const i = Math.floor((x + u.S) / 16), j = Math.floor((y + u.S) / 16); if (i < 0 || j < 0 || i >= NB || j >= NB) return false; const q = j * NB + i;
      if (!byRute[q]) byRute[q] = byer.some(t => Garnison.inni(t, (i + .5) * 16 - u.S + u.cx, (j + .5) * 16 - u.S + u.cy)) ? 2 : 1;
      return byRute[q] === 2; } : null;
    u.dyrRute = hindringer(u);
    const klasse = (X, Y) => { const i = Math.floor((X - kv.x0) / kv.r), j = Math.floor((kv.y0 - Y) / kv.r); return i < 0 || j < 0 || i >= kv.w || j >= kv.h ? 255 : kv.K[j * kv.w + i]; };
    const gårder = []; for (const P of (u.hus && u.hus.omriss) || []) { let x = 0, y = 0; for (const p of P) { x += p[0]; y += p[1]; } gårder.push([x / P.length, y / P.length]); }
    const nærGård = (x, y) => gårder.some(g => Math.abs(g[0] - x) < 260 && Math.abs(g[1] - y) < 260);
    const steder = [];
    for (const art of Dyr.REKKE) {
      const A = Dyr.ARTER[art];
      for (const [bx, by, X0, Y0, B] of Dyr.blokker(art, [u.cx - u.S, u.cy - u.S, u.cx + u.S, u.cy + u.S])) {
        const f = Dyr.flokkIBlokk(art, bx, by); if (!f) continue;
        for (const [a, c] of f.plasser) {
          const X = X0 + a * B, Y = Y0 + c * B, x = X - u.cx, y = Y - u.cy; if (Math.abs(x) > u.S * .9 || Math.abs(y) > u.S * .9) continue;
          const k = klasse(X, Y), kant = k === 1 && [[32, 0], [-32, 0], [0, 32], [0, -32]].some(([dx, dy]) => { const n = klasse(X + dx, Y + dy); return n !== 1 && n !== 3 && n !== 255; });
          // årstiden sjekkes når dyrene vises (de som hører til årstiden); her: en årstid arten finnes i
          const s = { moh: hoyde3d(X, Y, u), klasse: k, årstid: A.årstider[A.årstider.includes('sommer') ? A.årstider.indexOf('sommer') : 0], x: X, y: Y, kant, gård: A.gård || art === 'sau' ? nærGård(x, y) : false };
          if (!Dyr.kanVære(art, s) || !lovlig(u, x, y)) continue;
          steder.push({ art, x, y, n: f.n, frø: f.frø }); break;
        }
      }
    }
    u.dyrSteder = steder;
  });

  // Kan et dyr stå her (x, y relativt til utsnittets midte)? Ikke i vann, på veg eller asfalt, i hus, i et tre, i bratt ur
  function lovlig(u, x, y) {
    const M = u.dyrMaske; if (!M || Math.abs(x) > u.S * .96 || Math.abs(y) > u.S * .96) return false;
    const i = Math.floor((x + u.S) / M.celle), j = Math.floor((u.S - y) / M.celle); if (M.m[j * W + i]) return false;
    if (hindring3d(x, y, u.dyrRute) || (u.iBekk && u.iBekk(x, y)) || (u.iBy && u.iBy(x, y))) return false;
    const h = X => hoyde3d(X[0] + u.cx, X[1] + u.cy, u), h0 = h([x, y]);
    return Math.abs(h([x + 2, y]) - h0) < 1.5 && Math.abs(h([x, y + 2]) - h0) < 1.5;
  }
  // Flokkene for en årstid: nærmest midten først, til taket (PC 400, mobil 150) er nådd
  function plasser(u, årstid) {
    const ut = []; let n = 0; if (!u || !u.dyrSteder) return ut;
    const liste = u.dyrSteder.filter(s => Dyr.iSesong(s.art, årstid)).sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y));
    for (const s of liste) {
      const k = Math.min(s.n, maks() - n); if (k <= 0) break;
      const F = Dyr.nyFlokk(s.art, s.x, s.y, k, Dyr.tilfeldig(s.frø), (x, y) => lovlig(u, x, y));
      if (F.dyr.length) { ut.push(F); n += F.dyr.length; }
    }
    return ut;
  }

  // ---------- modellene (z opp, snuten mot +x, føttene i 0) ----------
  // Hver del: geometri, farge (eller funksjon av punktet), pels (0–1: hvor mye flokkfargen/dyrets farge virker), bein (+1/−1 svinger i
  // motsatt takt, diagonalt som når dyr går), hofte (høyden beinet svinger om), hode (1 = følger hodet ned når dyret beiter)
  const kasse = (x, y, z, sx, sy, sz) => { const g = new THREE.BoxGeometry(sx, sy, sz); g.translate(x, y, z + sz / 2); return g; };
  const kule = (x, y, z, rx, ry, rz, a = 8, b = 6) => { const g = new THREE.SphereGeometry(1, a, b); g.scale(rx, ry, rz); g.translate(x, y, z); return g; };
  const bein = (xs, ys, h, t, farge, pels, hov) => { const ut = [];
    for (const x of xs) for (const y of ys) { const s = (x > 0) === (y > 0) ? 1 : -1; ut.push([kasse(x, y, 0, t, t, h), farge, { pels, bein: s, hofte: h }]);
      if (hov) ut.push([kasse(x, y, 0, t * 1.15, t * 1.15, .07), hov, { pels: 0, bein: s, hofte: h }]); }
    return ut; };
  const MODELL = {
    sau: () => ({ nakke: [.36, .64], vinkel: 1.25, senk: .18, deler: [
      [kule(0, 0, .66, .52, .31, .28), (x, y, z) => { const n = .5 + .5 * Math.sin(x * 31 + y * 23 + z * 41); return [.9 + .06 * n, .88 + .06 * n, .82 + .05 * n]; }, { pels: 1 }],
      [kule(-.32, 0, .64, .26, .28, .25, 6, 4), [.9, .88, .82], { pels: 1 }],
      [kule(.38, 0, .76, .2, .15, .15, 6, 4), [.9, .88, .82], { pels: 1, hode: 1 }],
      [kasse(.6, 0, .7, .28, .15, .17), [.86, .82, .76], { pels: .55, hode: 1 }],
      [kasse(.75, 0, .7, .05, .11, .09), [.28, .22, .21], { pels: 0, hode: 1 }],
      [kasse(.52, .1, .82, .07, .13, .03), [.8, .74, .68], { pels: .55, hode: 1 }], [kasse(.52, -.1, .82, .07, .13, .03), [.8, .74, .68], { pels: .55, hode: 1 }],
      [kasse(-.55, 0, .52, .07, .07, .16), [.85, .82, .76], { pels: 1 }],
      ...bein([.28, -.3], [.13, -.13], .47, .075, [.74, .7, .64], .55, [.2, .17, .15])] }),
    ku: () => ({ nakke: [.8, 1.18], vinkel: 1, senk: .4, deler: [
      [kule(0, 0, 1.08, .92, .37, .4), [.94, .92, .88], { pels: (x, y, z) => z < .86 || (Math.sin(x * 4.3 + y * 2) > .6 && z < 1.2) ? 0 : 1 }],
      [kule(-.55, 0, 1.08, .42, .36, .38, 6, 4), [.94, .92, .88], { pels: (x, y, z) => z < .86 ? 0 : 1 }],
      [kule(.75, 0, 1.18, .3, .3, .3, 6, 4), [1, 1, 1], { pels: 1, hode: 1 }],
      [kasse(1.08, 0, .98, .5, .3, .34), [.95, .93, .9], { pels: .8, hode: 1 }],
      [kasse(1.35, 0, .98, .1, .27, .2), [.72, .54, .5], { pels: 0, hode: 1 }],
      [kasse(.98, .2, 1.24, .06, .18, .07), [1, 1, 1], { pels: 1, hode: 1 }], [kasse(.98, -.2, 1.24, .06, .18, .07), [1, 1, 1], { pels: 1, hode: 1 }],
      [kasse(-.5, 0, .56, .32, .26, .14), [.82, .6, .56], { pels: 0 }],
      [kasse(-.89, 0, .82, .05, .05, .58), [1, 1, 1], { pels: 1 }],
      ...bein([.68, -.68], [.23, -.23], .72, .13, [.93, .9, .86], .3, [.15, .13, .12])] }),
    rein: () => {
      const gevir = []; for (const s of [1, -1]) {
        const g = new THREE.BoxGeometry(.045, .045, .75); g.translate(0, 0, .37); g.rotateY(-.55); g.rotateX(s * .3); g.translate(.88, s * .08, 1.42); gevir.push([g, [.6, .52, .4], { pels: 0, hode: 1 }]);
        const t = new THREE.BoxGeometry(.035, .035, .3); t.translate(0, 0, .15); t.rotateY(.5); t.translate(.82, s * .14, 1.62); gevir.push([t, [.6, .52, .4], { pels: 0, hode: 1 }]);
        const k = new THREE.BoxGeometry(.035, .035, .28); k.translate(0, 0, .14); k.rotateY(-.1); k.rotateX(s * .5); k.translate(.62, s * .25, 1.82); gevir.push([k, [.6, .52, .4], { pels: 0, hode: 1 }]); }
      return { nakke: [.58, 1.12], vinkel: 1.15, senk: .45, deler: [
        [kule(0, 0, 1.05, .75, .3, .32), (x, y, z) => z < .92 ? [.8, .77, .7] : x < -.55 ? [.86, .84, .78] : [.47, .42, .35], { pels: 1 }],
        [kule(.65, 0, 1.2, .3, .17, .2, 6, 4), [.76, .73, .66], { pels: .6, hode: 1 }],
        [kasse(.98, 0, 1.18, .4, .18, .2), (x, y, z) => x > 1.1 ? [.32, .28, .24] : [.46, .41, .34], { pels: .5, hode: 1 }],
        [kasse(.84, .11, 1.38, .06, .14, .04), [.46, .41, .34], { pels: .5, hode: 1 }], [kasse(.84, -.11, 1.38, .06, .14, .04), [.46, .41, .34], { pels: .5, hode: 1 }],
        [kasse(-.76, 0, 1, .06, .1, .14), [.9, .88, .84], { pels: 0 }],
        ...gevir,
        ...bein([.5, -.5], [.14, -.14], .88, .075, [.5, .45, .38], .5, [.18, .16, .14])] };
    },
    moskus: () => {
      // lav, bred kropp med lang pels som henger nesten til bakken (skjørt), pukkel over skuldrene og lys sal på ryggen
      // en avlang kule der undersiden er trukket ned og ut (pelsen henger), med ujevn frynsekant
      const k = new THREE.SphereGeometry(1, 10, 7), p = k.attributes.position;
      for (let i = 0; i < p.count; i++) { let x = p.getX(i) * .98, y = p.getY(i) * .52, z = p.getZ(i) * .5;
        if (z < 0) { const f = -z / .5; z *= 1.3 + .12 * Math.sin(x * 13 + y * 9); y *= 1 + .14 * f; x *= 1 + .05 * f; }
        p.setXYZ(i, x, y, z + .92); }
      k.computeVertexNormals();
      return { nakke: [.72, .82], vinkel: .7, senk: .12, deler: [
        [k, (x, y, z) => z < .6 ? [.14, .1, .07] : [.21, .16, .11], { pels: 1 }],
        [kule(.38, 0, 1.25, .62, .44, .3, 6, 4), [.28, .22, .15], { pels: 1 }],
        [kule(-.38, 0, 1.25, .5, .38, .14, 6, 4), [.52, .44, .33], { pels: .6 }],
        [kasse(1, 0, .52, .46, .44, .44), (x, y, z) => x > 1.15 && z < .7 ? [.3, .26, .22] : [.17, .13, .09], { pels: 1, hode: 1 }],
        [kasse(.94, 0, .9, .22, .5, .1), [.6, .55, .46], { pels: 0, hode: 1 }],
        [kasse(.98, .3, .68, .1, .09, .3), [.55, .5, .42], { pels: 0, hode: 1 }], [kasse(.98, -.3, .68, .1, .09, .3), [.55, .5, .42], { pels: 0, hode: 1 }],
        ...bein([.6, -.6], [.28, -.28], .42, .14, [.72, .66, .55], 0, [.15, .13, .11])] };
    },
    elg: () => {
      const skovl = []; for (const s of [1, -1]) { const g = new THREE.BoxGeometry(.42, .5, .05); g.rotateX(s * -.55); g.translate(1.2, s * .4, 2.12); skovl.push([g, [.64, .57, .44], { pels: 0, hode: 1 }]);
        const st = new THREE.BoxGeometry(.06, .2, .06); st.translate(1.2, s * .16, 2.02); skovl.push([st, [.6, .53, .42], { pels: 0, hode: 1 }]); }
      return { nakke: [.95, 1.85], vinkel: 1, senk: .65, deler: [
        [kule(0, 0, 1.68, 1.05, .38, .46), [.25, .18, .12], { pels: 1 }],
        [kule(.55, 0, 1.95, .48, .33, .36, 6, 4), [.22, .16, .1], { pels: 1 }],
        [kule(1, 0, 1.86, .36, .2, .24, 6, 4), [.22, .16, .1], { pels: 1, hode: 1 }],
        [kasse(1.38, 0, 1.6, .62, .24, .32), [.21, .15, .1], { pels: 1, hode: 1 }],
        [kasse(1.66, 0, 1.52, .2, .28, .3), [.26, .2, .14], { pels: 1, hode: 1 }],
        [kasse(1.2, 0, 1.32, .08, .06, .26), [.18, .13, .09], { pels: 1, hode: 1 }],
        [kasse(1.18, .16, 1.94, .07, .2, .05), [.22, .16, .1], { pels: 1, hode: 1 }], [kasse(1.18, -.16, 1.94, .07, .2, .05), [.22, .16, .1], { pels: 1, hode: 1 }],
        ...skovl,
        ...bein([.75, -.75], [.2, -.2], 1.22, .13, [.58, .53, .46], 0, [.12, .1, .09])] };
    },
  };
  // pelsfargen per dyr (ganges med modellens farge der pels > 0)
  const FARGER = {
    sau: r => r < .76 ? [1, 1, 1] : r < .85 ? [.17, .16, .15] : r < .93 ? [.5, .36, .25] : [.62, .6, .57],
    ku: r => r < .68 ? [.48, .14, .08] : r < .88 ? [.14, .13, .13] : [.4, .27, .18],
    rein: r => [.9 + r * .2, .9 + r * .18, .88 + r * .16], moskus: r => [.85 + r * .25, .85 + r * .22, .85 + r * .2], elg: r => [.85 + r * .3, .85 + r * .28, .85 + r * .25],
  };
  const GEO = {};
  function geometri(art) {
    if (GEO[art]) return GEO[art];
    const M = MODELL[art](), deler = M.deler.map(([g, farge, o]) => { g = g.index ? g.toNonIndexed() : g; g.computeVertexNormals(); return [g, farge, o]; });
    const n = deler.reduce((a, [g]) => a + g.attributes.position.count, 0), A = { position: 3, normal: 3, color: 3, aPels: 1, aBein: 1, aHofte: 1, aHode: 1 }, ut = {};
    for (const k in A) ut[k] = new Float32Array(n * A[k]);
    let o = 0;
    for (const [g, farge, op] of deler) { const p = g.attributes.position, c = p.count;
      ut.position.set(p.array, o * 3); ut.normal.set(g.attributes.normal.array, o * 3);
      for (let i = 0; i < c; i++) { const f = typeof farge === 'function' ? farge(p.getX(i), p.getY(i), p.getZ(i)) : farge;
        ut.color.set(f, (o + i) * 3); ut.aPels[o + i] = typeof op.pels === 'function' ? op.pels(p.getX(i), p.getY(i), p.getZ(i)) : op.pels; ut.aBein[o + i] = op.bein || 0; ut.aHofte[o + i] = op.hofte || 0; ut.aHode[o + i] = op.hode || 0; }
      o += c; }
    const geo = new THREE.BufferGeometry(); for (const k in A) geo.setAttribute(k, new THREE.BufferAttribute(ut[k], A[k]));
    return (GEO[art] = { geo, M, trekanter: n / 3 });
  }
  // Materialet: Lambert med hjørnefarger. I shaderen svinger beina og hodet går ned (aGang: x er fasen, y hvor mye beina svinger, z hvor langt hodet er nede).
  // Bare ASCII-navn i GLSL.
  function materiale(M) {
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    mat.onBeforeCompile = sh => {
      sh.uniforms.uNakke = { value: new THREE.Vector2(M.nakke[0], M.nakke[1]) }; sh.uniforms.uVinkel = { value: M.vinkel }; sh.uniforms.uSenk = { value: M.senk };
      sh.vertexShader = 'attribute vec3 aGang;\nattribute float aPels;\nattribute float aBein;\nattribute float aHofte;\nattribute float aHode;\nuniform vec2 uNakke;\nuniform float uVinkel;\nuniform float uSenk;\n'
        + sh.vertexShader.replace('#include <color_vertex>', `vColor = vec3(1.0);
          vColor *= color;
          #ifdef USE_INSTANCING_COLOR
            vColor *= mix(vec3(1.0), instanceColor.xyz, aPels);
          #endif`).replace('#include <begin_vertex>', `#include <begin_vertex>
          float sving = aBein * sin(aGang.x) * 0.5 * aGang.y;
          transformed.x += (aHofte - transformed.z) * sving;
          if (aHode > 0.5) {
            float th = aGang.z * uVinkel, cs = cos(th), sn = sin(th);
            vec2 rr = vec2(transformed.x - uNakke.x, transformed.z - uNakke.y);
            transformed.x = uNakke.x + rr.x * cs + rr.y * sn;
            transformed.z = uNakke.y - rr.x * sn + rr.y * cs - aGang.z * uSenk;
          }`);
    };
    return mat;
  }
  function lagNett(art, n) {
    const { geo, M } = geometri(art), g = geo.clone();
    g.setAttribute('aGang', new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3));
    const m = new THREE.InstancedMesh(g, materiale(M), n);
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3);
    m.frustumCulled = false; m.count = 0; return m;
  }

  // ---------- inn i scenen ----------
  function fjern(R) { if (D) for (const m of Object.values(D.mesh)) { R.scene.remove(m); m.geometry.dispose(); m.material.dispose(); } D = null; }
  function velg(årstid) {
    D.årstid = årstid; D.flokker = plasser(D.u, årstid);
    const tall = {}; for (const F of D.flokker) tall[F.art] = (tall[F.art] || 0) + F.dyr.length;
    for (const art of Dyr.REKKE) {
      if (!tall[art]) { if (D.mesh[art]) D.mesh[art].count = 0; continue; }
      if (!D.mesh[art] || D.mesh[art].instanceMatrix.count < tall[art]) {
        if (D.mesh[art]) { D.R.scene.remove(D.mesh[art]); D.mesh[art].geometry.dispose(); }
        D.mesh[art] = lagNett(art, Math.max(tall[art], 16)); D.R.scene.add(D.mesh[art]);
      }
      // farge per dyr (fast for flokken), unge dyr er mindre
      const m = D.mesh[art], c = new THREE.Color(); let k = 0;
      for (const F of D.flokker) if (F.art === art) { const rnd = Dyr.tilfeldig(Math.floor(F.x * 131 + F.y * 7));
        for (const d of F.dyr) { const f = FARGER[art](rnd()); c.setRGB(f[0], f[1], f[2]); m.setColorAt(k, c); d.nr = k++; } }
      m.count = k; m.instanceColor.needsUpdate = true;
    }
  }
  KROKER.sett3d.push((u, R) => { fjern(R); if (u.S > 2200 || !u.dyrSteder) return; D = { u, R, mesh: {}, flokker: [] }; velg((window.VAER && VAER.årstid) || 'sommer'); });

  // ---------- hver ramme ----------
  let o3 = null;
  KROKER.ramme3d.push(R => {
    if (!D || D.u !== R.ut) return;
    if (!o3) o3 = new THREE.Object3D();
    const nå = performance.now() / 1000, dt = Math.min(.1, nå - (sist || nå)), u = D.u; sist = nå;
    const år = (window.VAER && VAER.årstid) || 'sommer'; if (år !== D.årstid) velg(år);
    // farer: du selv når du går (på huk kommer du nærmere), og skudd i kampene
    const fare = [], skudd = [];
    if (R.fot) { const k = window.Gange && Gange.kropp && Gange.kropp(); fare.push(k ? [k.x, k.y, k.huk ? .5 : k.løper ? 1.4 : 1] : [R.bane.x, R.bane.y, 1]); }
    if (typeof SKUDD !== 'undefined') for (const s of SKUDD) for (const e of [s.a, s.b]) if (e && Math.abs(e.x - u.cx) < u.S + 300 && Math.abs(e.y - u.cy) < u.S + 300) skudd.push([e.x - u.cx, e.y - u.cy]);
    const lov = (x, y) => lovlig(u, x, y), rnd = Math.random, c = R.cam.position;
    const bakke = (x, y) => (hoyde3d(x + u.cx, y + u.cy) - u.h0) * R.EX;
    for (const F of D.flokker) {
      // flokker langt unna kameraet (over 1,2 km) tas bare hver fjerde ramme
      const langt = Math.hypot(F.x - c.x, F.y - c.y) > 1200; F.spart = (F.spart || 0) + dt; if (langt && Math.random() > .25) continue;
      Dyr.steg(F, F.spart, rnd, { fare, skudd, lovlig: lov }); F.spart = 0;
      const A = Dyr.ARTER[F.art], m = D.mesh[F.art]; if (!m) continue; const ag = m.geometry.attributes.aGang;
      for (const d of F.dyr) {
        const cs = Math.cos(d.v), sn = Math.sin(d.v), L = A.L * .45, z = bakke(d.x, d.y), helning = Math.atan2(bakke(d.x + cs * L, d.y + sn * L) - bakke(d.x - cs * L, d.y - sn * L), 2 * L);
        o3.position.set(d.x, d.y, z - .02); o3.rotation.set(0, -helning, d.v, 'ZYX'); o3.scale.setScalar(d.ung ? .66 : 1); o3.updateMatrix(); m.setMatrixAt(d.nr, o3.matrix);
        ag.setXYZ(d.nr, d.fase, Math.min(1.25, d.fart / (A.fart.gå * .8)), d.hode);
      }
      m.instanceMatrix.needsUpdate = true; ag.needsUpdate = true;
    }
  });

  // ---------- for vakt og tester ----------
  // dyrene (x, y, z) i et utsnitt for en årstid, uten å vise dem: { sau: Float32Array, … }
  function punkter(u, årstid = 'sommer') {
    const ut = {}; for (const F of plasser(u, årstid)) { const a = ut[F.art] || (ut[F.art] = []);
      for (const d of F.dyr) a.push(d.x, d.y, (hoyde3d(d.x + u.cx, d.y + u.cy, u) - u.h0) * R3.EX); }
    for (const k in ut) ut[k] = new Float32Array(ut[k]); return ut;
  }
  function antall() { const ut = {}; if (D) for (const F of D.flokker) ut[F.art] = (ut[F.art] || 0) + F.dyr.length; return ut; }
  // alle modellene kompileres i en egen scene (shaderfeil kommer som feil i nettleseren)
  function prøvShadere(R) {
    const sc = new THREE.Scene(), ut = {}; sc.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1));
    for (const art of Dyr.REKKE) { const m = lagNett(art, 2); m.count = 2; sc.add(m); ut[art] = Math.round(geometri(art).trekanter); }
    R.renderer.compile(sc, R.cam);
    sc.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
    return ut;
  }
  window.Dyr3d = { plasser, punkter, antall, prøvShadere, lovlig, flokker: () => (D ? D.flokker : []) };
})();
