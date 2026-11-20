/* Riksbrudd – FIGURENE I 3D (runde 7, 20. nov natt). Kritikerne 19. nov: «menneskene og geværet er kantete klosser som hører hjemme
 * i et helt annet spill». Én felles figur for folk i leiren, barn og gamle (spill/folk3d.js) og soldatene på alle sider (soldater3d i
 * index.html): avrundede former (lemmer som smale kapsler, avrundet overkropp, hode, skuldre og hender), myke normaler og naturlige
 * proporsjoner. Hjelm, hår, lue, sekk, gevær og kasse er deler som slås av og på per figur.
 *
 * Slik virker det: ÉN geometri per detaljnivå (nær og fjern), tegnet som InstancedMesh – to tegnekall per flokk. Bevegelsen regnes i
 * skyggeleggeren (vertex shader), ikke i JavaScript: per hjørne sier aLem = (ledd, fargekanal, del) hvilket lem hjørnet hører til, og
 * per figur gir aGang = (fase, sving, sikte, bære) og aPose = (krum, kne, maske, barn) stillingen. aFarge = fire pakkede farger
 * (jakke, bukse, hår, hud). Ingen geometri bygges per bilde.
 *   gå: beina og armene svinger (fase og sving), stå: sving 0, sikte: geværet opp til skulderen (sikte 1) eller lavt (0),
 *   bære: armene fram (med kasse når delen er på), knele: kne 1 (sårede), ligge: figuren legges ned med matrisen (falne).
 * Reglene øverst (pakk, ik, holdning) er uten DOM og testes i Node: pipeline/fliser/test_figur3d.js.
 */
(function (rot) {
  'use strict';
  // Claudes forslag: mål for en voksen figur (skala 1, meter), detaljnivå og gange – samlet her
  const REGLER = {
    hofteY: .1, hofteZ: .92, kneZ: .5, livZ: .98, skulderY: .205, skulderZ: 1.42, albueZ: 1.13, hånd: .3, nakkeZ: 1.5,
    // hvor langt fra kameraet en figur får full detalj (m); kantene per detaljnivå står i NIVÅ under
    nærPC: 25, nærMobil: 18,
    // høyst så mange figurer med full detalj samtidig (de nærmeste)
    maksNærPC: 12, maksNærMobil: 6,
    // gangen (radianer): lårene, kneet, armene og albuen
    lår: .5, kne: .85, arm: .45, albue: .35,
    // knele (sårede): kroppen senkes så høyre kne står i bakken
    senk: .43,
    // geværet: grepet (der høyre hånd er) og vinklene, lavt på marsj og oppe ved skulderen når laget skyter; venstre hånd på forskjeftet
    // (kolben skal ligge i skulderen når laget sikter: grepet langt nok fram og litt til høyre, løpet litt inn mot midten)
    lav: { G: [.17, -.1, 1.12], helling: -.35, gir: .3 }, opp: { G: [.34, -.11, 1.38], helling: 0, gir: .05 }, forskjefte: [.16, 0, .02],
    // bære: overarmen fram, underarmen vannrett, hendene litt innover
    bære: [.35, 1.25, .25],
  };
  // delene som kan slås av og på (bit i maska)
  const DEL = { hjelm: 1, hår: 2, sekk: 4, gevær: 8, kasse: 16, lue: 32, langt: 64 };
  // leddene (aLem.x)
  const LEDD = { fast: 0, kropp: 1, hode: 2, lårV: 3, lårH: 4, leggV: 5, leggH: 6, overV: 7, overH: 8, underV: 9, underH: 10, våpen: 11 };
  // fargekanalene (aLem.y): hjørnefargen ganges med figurens farge i kanalen
  const KANAL = { fast: 0, jakke: 1, bukse: 2, hår: 3, hud: 4 };

  // farge 0–1 pakket i ett tall (8 bit per farge, nøyaktig i et 32-bits flyttall)
  const pakk = c => Math.round(Math.max(0, Math.min(1, c[0])) * 255) * 65536 + Math.round(Math.max(0, Math.min(1, c[1])) * 255) * 256 + Math.round(Math.max(0, Math.min(1, c[2])) * 255);
  const pakkUt = v => [Math.floor(v / 65536) / 255, Math.floor((v % 65536) / 256) / 255, (v % 256) / 255];
  // to ledd (overarm a, underarm b) fra skulderen S til hånda i T: [overarm fram, albue, dreining innover] – samme regning som i skyggeleggeren
  function ik(S, T, a = REGLER.skulderZ - REGLER.albueZ, b = REGLER.hånd) {
    const tx = T[0] - S[0], ty = T[1] - S[1], tz = T[2] - S[2], gir = Math.atan2(ty, tx), xp = Math.hypot(tx, ty), D = Math.min(Math.hypot(xp, tz), a + b - 1e-4);
    const un = Math.PI - Math.acos(Math.max(-1, Math.min(1, (a * a + b * b - D * D) / (2 * a * b)))), ov = Math.atan2(xp, -tz) - Math.atan2(b * Math.sin(un), a + b * Math.cos(un));
    return [ov, un, gir];
  }
  // hånda for vinklene (kontroll av ik): skulder S, [ov, un, gir]
  function hånd(S, v, a = REGLER.skulderZ - REGLER.albueZ, b = REGLER.hånd) {
    const [ov, un, g] = v, xp = a * Math.sin(ov) + b * Math.sin(ov + un), z = -a * Math.cos(ov) - b * Math.cos(ov + un);
    return [S[0] + xp * Math.cos(g), S[1] + xp * Math.sin(g), S[2] + z];
  }
  // et punkt på geværet (lokalt: grepet i origo, løpet langs +x) i figurens rom for en stilling { G, helling, gir }
  function påVåpen(p, st) { const c = Math.cos(st.helling), s = Math.sin(st.helling), x = p[0] * c - p[2] * s, z = p[0] * s + p[2] * c, cg = Math.cos(st.gir), sg = Math.sin(st.gir);
    return [st.G[0] + x * cg - p[1] * sg, st.G[1] + x * sg + p[1] * cg, st.G[2] + z]; }
  // armvinklene for en geværstilling: [venstre(ov, un, gir), høyre(ov, un, gir)]
  function armer(st) { const sv = [0, REGLER.skulderY, REGLER.skulderZ], sh = [0, -REGLER.skulderY, REGLER.skulderZ];
    return [ik(sv, påVåpen(REGLER.forskjefte, st)), ik(sh, st.G)]; }
  // stillingen for en soldat: på marsj bæres våpenet lavt og beina går, i ildkamp sikter de, ellers står de klare; sårede kneler
  function holdning(går, skyter, såret) { return { sving: går && !såret ? 1 : 0, sikte: skyter ? 1 : går ? 0 : .45, kne: såret ? 1 : 0 }; }
  const REG = { REGLER, DEL, LEDD, KANAL, pakk, pakkUt, ik, hånd, påVåpen, armer, holdning };
  if (typeof module !== 'undefined' && module.exports && typeof window === 'undefined') { module.exports = REG; return; }

  // ---------- visningen (three.js; THREE finnes først når 3D er åpnet) ----------
  const f6 = x => (Math.round(x * 1e5) / 1e5).toFixed(5);
  // skyggelegger-kode: leddene, armene og våpenet (vinklene for geværet regnes én gang her og settes inn som tall)
  function glsl() {
    const L = armer(REGLER.lav), O = armer(REGLER.opp), R = REGLER, v3 = a => `vec3(${a.map(f6).join(',')})`;
    // (målt med programvare-grafikk: hvert hjørne regnes for hver trekant, så sinus/cosinus regnes én gang per vinkel og brukes for både
    // punktet og normalen; hofta og faste deler hopper rett ut)
    return `attribute vec3 aLem;
attribute vec4 aGang;
attribute vec4 aPose;
attribute vec4 aFarge;
vec2 fCS(float a) { return vec2(cos(a), sin(a)); }
void fR(inout vec3 p, inout vec3 n, vec3 o, vec2 cs) { vec3 q = p - o; p = vec3(q.x * cs.x - q.z * cs.y, q.y, q.x * cs.y + q.z * cs.x) + o; n = vec3(n.x * cs.x - n.z * cs.y, n.y, n.x * cs.y + n.z * cs.x); }
void fG(inout vec3 p, inout vec3 n, vec3 o, vec2 cs) { vec3 q = p - o; p = vec3(q.x * cs.x - q.y * cs.y, q.x * cs.y + q.y * cs.x, q.z) + o; n = vec3(n.x * cs.x - n.y * cs.y, n.x * cs.y + n.y * cs.x, n.z); }
float fBit(float m, float b) { return mod(floor(m / b + 0.001), 2.0); }
vec3 fPakk(float v) { float r = floor(v / 65536.0 + 0.00001); float g = floor((v - r * 65536.0) / 256.0 + 0.00001); return vec3(r, g, v - r * 65536.0 - g * 256.0) / 255.0; }
void figur(inout vec3 p, inout vec3 n) {
  float lem = aLem.x, f = aGang.x, A = aGang.y, sikt = aGang.z, kne = aPose.y;
  if (lem > 2.5 && lem < 6.5) {
    float side = mod(lem, 2.0) > 0.5 ? 1.0 : -1.0, fs = side > 0.0 ? f : f + 3.14159;
    if (lem > 4.5) fR(p, n, vec3(0.0, side * ${f6(R.hofteY)}, ${f6(R.kneZ)}), fCS(mix(-max(0.0, cos(fs + 0.5)) * ${f6(R.kne)} * A, side > 0.0 ? -1.45 : -1.75, kne)));
    fR(p, n, vec3(0.0, side * ${f6(R.hofteY)}, ${f6(R.hofteZ)}), fCS(mix(sin(fs) * ${f6(R.lår)} * A, side > 0.0 ? 1.45 : 0.22, kne)));
  } else if (lem > 0.5) {
    float krum = aPose.x;
    if (lem > 6.5 && lem < 10.5) {
      float side = mod(lem, 2.0) > 0.5 ? 1.0 : -1.0;
      vec3 v;
      if (fBit(aPose.z, 8.0) > 0.5) v = side > 0.0 ? mix(${v3(L[0])}, ${v3(O[0])}, sikt) : mix(${v3(L[1])}, ${v3(O[1])}, sikt);
      else { float sv = sin(side > 0.0 ? f + 3.14159 : f) * A; v = mix(vec3(sv * ${f6(R.arm)}, 0.12 + max(0.0, sv) * ${f6(R.albue)}, 0.0), vec3(${f6(R.bære[0])}, ${f6(R.bære[1])}, -side * ${f6(R.bære[2])}), aGang.w); }
      vec3 S = vec3(0.0, side * ${f6(R.skulderY)}, ${f6(R.skulderZ)});
      if (lem > 8.5) fR(p, n, vec3(0.0, side * ${f6(R.skulderY)}, ${f6(R.albueZ)}), fCS(v.y));
      fR(p, n, S, fCS(v.x));
      if (v.z != 0.0) fG(p, n, S, fCS(v.z));
    } else if (lem > 10.5) {
      fR(p, n, vec3(0.0), fCS(mix(${f6(R.lav.helling)}, ${f6(R.opp.helling)}, sikt)));
      fG(p, n, vec3(0.0), fCS(mix(${f6(R.lav.gir)}, ${f6(R.opp.gir)}, sikt)));
      p += mix(${v3(R.lav.G)}, ${v3(R.opp.G)}, sikt);
    } else if (lem > 1.5) {
      vec3 N = vec3(0.0, 0.0, ${f6(R.nakkeZ)});
      float hk = -krum * 0.6 + sikt * 0.18 * fBit(aPose.z, 8.0);
      if (hk != 0.0) fR(p, n, N, fCS(hk));
      p = N + (p - N) * (1.0 + 0.22 * aPose.w);
    }
    if (krum != 0.0) fR(p, n, vec3(0.0, 0.0, ${f6(R.livZ)}), fCS(krum));
  }
  p.z -= ${f6(R.senk)} * kne;
}
`;
  }
  let MAT = null, GLSL = null;
  // ett materiale for alle figurene (hjørnefarger, Lambert som resten av scenen)
  function materiale() {
    if (MAT) return MAT; GLSL = GLSL || glsl();
    const m = new THREE.MeshLambertMaterial({ vertexColors: true });
    m.onBeforeCompile = sh => {
      sh.vertexShader = GLSL + sh.vertexShader
        .replace('#include <color_vertex>', `#include <color_vertex>
  { float fk = aLem.y; if (fk > 0.5) vColor.xyz *= fk < 1.5 ? fPakk(aFarge.x) : fk < 2.5 ? fPakk(aFarge.y) : fk < 3.5 ? fPakk(aFarge.z) : fPakk(aFarge.w); }`)
        .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
  vec3 fPos = vec3(position);
  figur(fPos, objectNormal);`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
  transformed = fPos;
  if (aLem.z > 0.5 && fBit(aPose.z, aLem.z) < 0.5) transformed = vec3(0.0);`);
    };
    m.customProgramCacheKey = () => 'figur3d-2';
    m.userData.figur = true; MAT = m; return m;
  }

  // ---------- formene (alle gir indeksert geometri med position, normal, color, aLem) ----------
  const merk = (g, farge, ledd, kanal, del) => {
    if (g.attributes.uv) g.deleteAttribute('uv'); const n = g.attributes.position.count, c = new Float32Array(n * 3), l = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { c.set(farge, i * 3); l[i * 3] = ledd; l[i * 3 + 1] = kanal; l[i * 3 + 2] = del; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3)); g.setAttribute('aLem', new THREE.BufferAttribute(l, 3)); return g;
  };
  // kapsel langs z fra z0 (radius r0) til z1 (radius r1) med runde ender; sx/sy gjør tverrsnittet ovalt
  function kapsel(seg, r0, r1, z0, z1, sx = 1, sy = 1, ender = 2) {
    const P = [], V = THREE.Vector2;
    for (let i = 0; i <= ender; i++) { const a = -Math.PI / 2 + i / ender * Math.PI / 2; P.push(new V(Math.max(.0008, r0 * Math.cos(a)), z0 + r0 * Math.sin(a))); }
    for (let i = 0; i <= ender; i++) { const a = i / ender * Math.PI / 2; P.push(new V(Math.max(.0008, r1 * Math.cos(a)), z1 + r1 * Math.sin(a))); }
    const g = new THREE.LatheGeometry(P, seg); g.rotateX(Math.PI / 2); if (sx !== 1 || sy !== 1) g.scale(sx, sy, 1); return g;
  }
  // dreid flate etter en profil [[radius, z], ...] (overkropp, kolbe)
  function dreid(seg, prof, sx = 1, sy = 1) { const g = new THREE.LatheGeometry(prof.map(([r, z]) => new THREE.Vector2(Math.max(.0008, r), z)), seg); g.rotateX(Math.PI / 2); if (sx !== 1 || sy !== 1) g.scale(sx, sy, 1); return g; }
  function kule(seg, r, x, y, z, sx = 1, sy = 1, sz = 1, del) { const g = del ? new THREE.SphereGeometry(r, seg, Math.max(3, Math.round(seg * .6)), 0, Math.PI * 2, 0, Math.PI * del) : new THREE.SphereGeometry(r, seg, Math.max(3, Math.round(seg * .6)));
    g.rotateX(Math.PI / 2); g.scale(sx, sy, sz); g.translate(x, y, z); return g; }
  // legg en kapsel mellom to punkter (for armer på våpenet, løp og kolbe langs x)
  function langs(g, ax) { if (ax === 'x') g.rotateY(Math.PI / 2); else if (ax === 'y') g.rotateX(-Math.PI / 2); return g; }
  // slår sammen indekserte geometrier (beholder indeksen: færre hjørner å regne på i skyggeleggeren)
  function samle(liste) {
    let n = 0, ni = 0; for (const g of liste) { n += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), lem = new Float32Array(n * 3), idx = n > 65535 ? new Uint32Array(ni) : new Uint16Array(ni); let o = 0, oi = 0;
    for (const g of liste) { const c = g.attributes.position.count; pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); col.set(g.attributes.color.array, o * 3); lem.set(g.attributes.aLem.array, o * 3);
      if (g.index) for (let i = 0; i < g.index.count; i++) idx[oi++] = g.index.array[i] + o; else for (let i = 0; i < c; i++) idx[oi++] = i + o; o += c; g.dispose(); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('aLem', new THREE.BufferAttribute(lem, 3)); g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, .9), 1.4); return g;
  }

  // ---------- figuren: nær = full detalj, fjern = enklere (samme ledd og deler, så stillingen er lik) ----------
  // Farger: hvit = figurens egen farge i kanalen; tall under 1 gjør den delen mørkere (lommer, mansjetter, hjelmen)
  // detaljnivåene: kanter rundt på lemmene (lem), kroppen (kropp), hodet og kulene; ende = ringer i de runde endene
  const NIVÅ = { pcNær: { lem: 6, ende: 2, kropp: 10, hode: 10, kule: 6, detalj: true }, pcFjern: { lem: 4, ende: 1, kropp: 6, hode: 6, kule: 4, detalj: false },
    mobNær: { lem: 5, ende: 2, kropp: 8, hode: 8, kule: 5, detalj: true }, mobFjern: { lem: 4, ende: 1, kropp: 5, hode: 5, kule: 4, detalj: false } };
  // deler: bare delene flokken kan bruke (bitene i DEL) kommer med i geometrien
  function figurGeo(nær, deler = 127) {
    const mob = typeof VW !== 'undefined' && VW > 0 && VW < 700, N = NIVÅ[(mob ? 'mob' : 'pc') + (nær ? 'Nær' : 'Fjern')], d = [], R = REGLER, L = LEDD, K = KANAL, e = N.ende, lm = N.lem, kl = N.kule, dt = N.detalj;
    const hv = [1, 1, 1], put = (g, f, l, k, del = 0) => { if (del && !(deler & del)) g.dispose(); else d.push(merk(g, f, l, k, del)); }, hY = R.hofteY, sY = R.skulderY;
    // ring: åpen sylinder (belte, hjelmkant, luebrett) – to punkter i profilen
    const ring = (seg, r, z0, z1, sx = 1, sy = 1) => dreid(seg, [[r, z0], [r, z1]], sx, sy);
    // hofta og buksa (står fast) med belte
    put(dreid(Math.max(6, N.kropp - 2), dt ? [[0, .84], [.12, .85], [.155, .9], [.155, .96], [.145, 1.02]] : [[0, .84], [.155, .9], [.145, 1.02]], .7, 1), hv, L.fast, K.bukse);
    if (dt) put(ring(N.kropp, .152, .97, .995, .72, 1.02), [.16, .14, .12], L.fast, K.fast);
    // overkroppen: smalt liv, bredere bryst og skuldre som går over i armene – dreid profil, flatere forfra og bakfra
    put(dreid(N.kropp, dt ? [[.137, .96], [.142, 1.02], [.156, 1.12], [.175, 1.24], [.19, 1.33], [.19, 1.39], [.165, 1.445], [.1, 1.485], [.055, 1.5]]
      : [[.137, .96], [.156, 1.12], [.19, 1.33], [.17, 1.44], [.06, 1.5]], .66, 1), hv, L.kropp, K.jakke);
    if (dt) for (const sy of [-1, 1]) put(kule(kl, .07, 0, sy * .185, 1.385, 1, 1, .85), hv, L.kropp, K.jakke);
    // halsen og hodet: hodeskalle, kjeve, nese, ører og øyne (de små bare nær)
    if (dt) put(kapsel(lm, .045, .042, R.nakkeZ - .03, R.nakkeZ + .07, 1, 1, 1), hv, L.hode, K.hud);
    put(kule(N.hode, .1, .012, 0, 1.635, 1, .9, 1.1), hv, L.hode, K.hud);
    if (dt) { put(kule(kl, .07, .04, 0, 1.565, .95, 1.05, .8), [.96, .96, .96], L.hode, K.hud);
      put(kule(4, .02, .11, 0, 1.615, 1.1, .75, 1.4), [.93, .93, .93], L.hode, K.hud);
      for (const sy of [-1, 1]) { put(kule(4, .024, .0, sy * .093, 1.625, .6, .5, 1), [.9, .9, .9], L.hode, K.hud); put(kule(4, .011, .098, sy * .037, 1.648, .6, 1, .8), [.14, .12, .11], L.hode, K.fast); } }
    // beina: lår og legg med støvel (leggen har origo i kneet, låret i hofta – skyggeleggeren bøyer dem der)
    for (const [sy, lå, le] of [[1, L.lårV, L.leggV], [-1, L.lårH, L.leggH]]) {
      const lår = kapsel(lm, .07, .088, R.kneZ + .02, R.hofteZ - .06, 1, .95, e); lår.translate(0, sy * hY, 0); put(lår, hv, lå, K.bukse);
      const legg = kapsel(lm, .056, .066, .13, R.kneZ, 1, .95, e); legg.translate(-.005, sy * hY, 0); put(legg, hv, le, K.bukse);
      put(kule(kl, .06, .045, sy * hY, .062, 2.05, 1.05, 1), [.11, .1, .09], le, K.fast);
    }
    // armene: overarm (skulderen) og underarm med hånd (albuen)
    for (const [sy, ov, un] of [[1, L.overV, L.underV], [-1, L.overH, L.underH]]) {
      const o = kapsel(lm, .047, .055, R.albueZ, R.skulderZ - .05, 1, 1, e); o.translate(0, sy * sY, 0); put(o, hv, ov, K.jakke);
      const u = kapsel(lm, .038, .046, R.skulderZ - .29 - R.hånd + .07, R.albueZ, 1, 1, e); u.translate(0, sy * sY, 0); put(u, hv, un, K.jakke);
      put(kule(kl, .043, .008, sy * sY, R.albueZ - R.hånd, .75, .6, 1.15), hv, un, K.hud);
    }
    // hår (kort; «langt» legger til en hestehale/langt hår bak), lue og hjelm
    { const h = kule(N.hode, .109, 0, 0, 0, 1.04, .94, 1.08, .56); h.rotateY(-.42); h.translate(.0, 0, 1.645); put(h, hv, L.hode, K.hår, DEL.hår); }
    { const b = kapsel(lm, .05, .06, 1.42, 1.62, .8, 1.5, e); b.translate(-.075, 0, 0); put(b, hv, L.hode, K.hår, DEL.langt); }
    put(kule(N.hode, .115, 0, 0, 1.655, 1.02, .95, 1.15, .52), [.9, .9, .9], L.hode, K.jakke, DEL.lue); put(ring(N.hode, .118, 1.64, 1.69, 1.02, .95), [.75, .75, .75], L.hode, K.jakke, DEL.lue);
    // hjelmen i mørk oliven (som en ekte stålhjelm), kanten i sidens farge
    put(kule(N.hode, .13, -.008, 0, 1.655, 1.06, 1, .95, .5), [.27, .29, .22], L.hode, K.fast, DEL.hjelm); put(ring(N.hode, .14, 1.64, 1.655, 1.04, 1), [.55, .55, .55], L.hode, K.jakke, DEL.hjelm);
    // sekk med sovepose på toppen
    put(kapsel(Math.max(6, kl + 2), .085, .085, 1.07, 1.31, 1.05, 1.75, e).translate(-.195, 0, 0), [.29, .32, .23], L.kropp, K.fast, DEL.sekk);
    if (dt) put(langs(kapsel(lm, .052, .052, -.15, .15, 1, 1, 1), 'y').translate(-.21, 0, 1.43), [.34, .3, .22], L.kropp, K.fast, DEL.sekk);
    // kassen du bærer foran deg
    { const b = new THREE.BoxGeometry(.3, .22, .24); b.translate(.37, 0, 1.06); put(b, [.45, .34, .2], L.kropp, K.fast, DEL.kasse); }
    // geværet: lokalt, grepet (høyre hånd) i origo og løpet langs +x – avrundet kolbe, kasse, forskjefte, løp, magasin, grep og sikter
    { const st = [.11, .11, .12], sv = [.17, .16, .14], gs = Math.max(4, lm);
      put(langs(kapsel(gs, .028, .03, -.05, .17, 1, 1, 1), 'x').scale(1, .8, 1.25).translate(0, 0, .06), st, L.våpen, K.fast, DEL.gevær);
      put(langs(kapsel(Math.max(4, gs - 1), .01, .01, .17, .64, 1, 1, 1), 'x').translate(0, 0, .065), st, L.våpen, K.fast, DEL.gevær);
      put(langs(dreid(gs, dt ? [[.026, .04], [.034, .09], [.046, .2], [.05, .25], [.008, .255]] : [[.026, .04], [.05, .25], [.008, .255]]), 'x').rotateY(Math.PI).scale(1, .45, 1).rotateY(.05).translate(-.03, 0, .045), sv, L.våpen, K.fast, DEL.gevær);
      if (dt) { put(langs(dreid(gs, [[.026, .17], [.03, .2], [.029, .38], [.022, .41]]), 'x').scale(1, .85, 1.05).translate(0, 0, .055), sv, L.våpen, K.fast, DEL.gevær);
        const gr = kapsel(4, .017, .019, -.06, .02, 1, .8, 1); gr.rotateY(-.3); put(gr, sv, L.våpen, K.fast, DEL.gevær);
        const mg = new THREE.BoxGeometry(.045, .024, .13); mg.rotateY(.3); mg.translate(.1, 0, -.01); put(mg, st, L.våpen, K.fast, DEL.gevær);
        const k = new THREE.BoxGeometry(.008, .008, .035); k.translate(.6, 0, .09); put(k, st, L.våpen, K.fast, DEL.gevær); const b = new THREE.BoxGeometry(.03, .03, .022); b.translate(.03, 0, .1); put(b, st, L.våpen, K.fast, DEL.gevær); }
    }
    return samle(d);
  }
  const GEO = {};
  // geometrien for nær/fjern lages én gang; hver flokk får sin egen BufferGeometry som deler de samme hjørnelistene
  function geo(nær, deler = 127) { const k = (nær ? 'n' : 'f') + (typeof VW !== 'undefined' && VW > 0 && VW < 700 ? 'm' : 'p') + deler; return GEO[k] || (GEO[k] = figurGeo(nær, deler)); }

  const flokker = new Set();
  // En flokk: to InstancedMesh (nær og fjern) med plass til maks figurer. start() hver ramme, legg(matrise, valg) per figur, slutt().
  // deler = bitene (DEL) flokken bruker – de andre delene tas ikke med i geometrien (soldatene har ikke hår og lue, folkene ikke hjelm).
  function flokk(R, { maks = 100, kilde = 'figur3d', deler = 127 } = {}) {
    const lag = nær => { const b = geo(nær, deler), g = new THREE.BufferGeometry(); for (const k of ['position', 'normal', 'color', 'aLem']) g.setAttribute(k, b.attributes[k]); g.setIndex(b.index); g.boundingSphere = b.boundingSphere;
      const A = { aGang: new THREE.InstancedBufferAttribute(new Float32Array(maks * 4), 4), aPose: new THREE.InstancedBufferAttribute(new Float32Array(maks * 4), 4), aFarge: new THREE.InstancedBufferAttribute(new Float32Array(maks * 4), 4) };
      for (const k in A) { A[k].setUsage(THREE.DynamicDrawUsage); g.setAttribute(k, A[k]); }
      const m = new THREE.InstancedMesh(g, materiale(), maks); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.count = 0; m.userData.kilde = kilde; m.userData.figur = true; R.scene.add(m); return { m, A, n: 0 }; };
    const N = lag(true), F = lag(false), mob = typeof VW !== 'undefined' && VW < 700, nær2 = (mob ? REGLER.nærMobil : REGLER.nærPC) ** 2, maksNær = mob ? REGLER.maksNærMobil : REGLER.maksNærPC;
    // figurene innenfor nær-avstanden venter til slutt(): de nærmeste maksNær får full detalj, resten fjernnettet (en folkemengde rett ved
    // deg skal ikke koste mer enn noen få detaljerte figurer). Gjenbrukte poster, ingen nye objekter per bilde.
    const vent = [], post = () => ({ d: 0, e: new Float32Array(16), v: new Float32Array(12) }); let nv = 0;
    const skriv = (T, e, v) => { const i = T.n++, k = i * 4; T.m.instanceMatrix.array.set(e, i * 16); T.A.aGang.array.set(v.subarray(0, 4), k); T.A.aPose.array.set(v.subarray(4, 8), k); T.A.aFarge.array.set(v.subarray(8, 12), k); };
    const fl = { maks, nær: N.m, fjern: F.m, scene: R.scene, n: 0,
      start() { N.n = F.n = 0; fl.n = 0; nv = 0; },
      // m: THREE.Matrix4 (figurens plass, retning og størrelse). o: { fase, sving, sikte, bære, krum, kne, maske, barn, farger: [jakke, bukse, hår, hud] pakket }
      legg(m, o) { if (fl.n >= maks) return false; fl.n++; const e = m.elements, c = R.cam.position, dx = e[12] - c.x, dy = e[13] - c.y, dz = e[14] - c.z, d = dx * dx + dy * dy + dz * dz;
        const q = d < nær2 ? (vent[nv] || (vent[nv] = post())) : (fl.tmp || (fl.tmp = post())), v = q.v, fa = o.farger; if (d < nær2) nv++; q.d = d; q.e.set(e);
        v[0] = o.fase || 0; v[1] = o.sving || 0; v[2] = o.sikte || 0; v[3] = o.bære || 0; v[4] = o.krum || 0; v[5] = o.kne || 0; v[6] = o.maske || 0; v[7] = o.barn || 0; v[8] = fa[0]; v[9] = fa[1]; v[10] = fa[2]; v[11] = fa[3];
        if (d >= nær2) skriv(F, q.e, v); return true; },
      slutt() { if (nv > maksNær) { const L = vent.slice(0, nv).sort((a, b) => a.d - b.d); for (let i = 0; i < nv; i++) skriv(i < maksNær ? N : F, L[i].e, L[i].v); } else for (let i = 0; i < nv; i++) skriv(N, vent[i].e, vent[i].v);
        for (const T of [N, F]) { T.m.count = T.n; T.m.instanceMatrix.needsUpdate = true; for (const k in T.A) T.A[k].needsUpdate = true; } },
      synlig(v) { N.m.visible = F.m.visible = !!v; },
      antall: () => N.n + F.n, nærAntall: () => N.n,
      // trekanter per figur (nær, fjern)
      trekanter: () => [N.m.geometry.index.count / 3, F.m.geometry.index.count / 3],
      // (runde 11) geometrien frigjøres også (før ble to geometrier liggende igjen på grafikkortet hver gang en flokk ble kastet); de felles
      // hjørnelistene lastes opp igjen av den neste flokken som bruker dem
      kast() { for (const T of [N, F]) { if (T.m.parent) T.m.parent.remove(T.m); for (const k in T.A) T.m.geometry.deleteAttribute(k); T.m.geometry.dispose(); T.m.dispose && T.m.dispose(); } flokker.delete(fl); },
    };
    flokker.add(fl); return fl;
  }
  // fargene pakket én gang: [jakke, bukse, hår, hud] (0–1)
  const farger = (j, b, h, hud) => [pakk(j), pakk(b), pakk(h || [.2, .16, .12]), pakk(hud || [.86, .69, .56])];
  rot.Figur3d = Object.assign({}, REG, { flokk, farger, materiale, geo, form: { kapsel, dreid, kule, langs, samle, merk },
    alle: () => [...flokker].filter(f => f.nær.parent).flatMap(f => [f.nær, f.fjern]), flokker: () => [...flokker] });
})(typeof window !== 'undefined' ? window : globalThis);
