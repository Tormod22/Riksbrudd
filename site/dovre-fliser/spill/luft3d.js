'use strict';
// LYS GJENNOM SKYENE, BYGER OG DIS I 3D (R19-2, 24. nov; brukerens bilder fra en fjelltur). Reglene står i spill/luft.js.
//  1. LYSSTRIPER: svake, additive stråler fra sola gjennom hull i skyene ned mot bakken når det er delvis skyet og sola står lavt til
//     middels høyt. Én flate per stripe som dreier seg om stråleaksen mot kameraet; sterkest når du ser mot sola. De driver med skyene.
//  2. BYGER: grå (regn) eller hvite (snø) slør fra skybasen ned mot bakken i det fjerne, som driver med vinden over dalen. Driver en
//     byge over der du står, får du regnet eller snøen rundt kameraet (spill/vaer-visning.js leser window.BYGE) og kortere sikt en stund.
//  3. DIS I LAG: three.js sin tåke får et blått luftperspektiv foran seg (1 − e^(−d/L), tettest nede i dalene), så åsrygger bak hverandre
//     skilles i lag. Det begynner først et stykke ute (Luft.disStart), så nært terreng er klart i klart vær. Gjelder alt som har tåke.
// Kostnad: to små tegnekall (høyst 18 striper og 10 byger) og en eksponentialfunksjon per punkt i tåka. Lav grafikk: ingen striper, færre byger.
// index.html kaller Luft3d.init(R3) i init3d (etter Lys3d.init) – før noe materiale er laget.
// I testene (navigator.webdriver) er det ingen byger og ingen striper før Luft3d.test = true; disen er med.
// VAKT: GLSL tåler bare ASCII.
(function () {
  const glatt = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }, trinn = (a, b, x) => glatt((x - a) / (b - a));
  const mob = () => (typeof VW !== 'undefined' ? VW : 1200) < 900;
  // Claudes forslag (alle tallene):
  const VIS = {
    // skybasen i scenen (samme høyde som skylaget i spill/natt3d.js), og minst så høyt over bakken (m)
    skyH: 1500, overBakke: 650,
    // bygenes slør: sterkest (alfa), hvor mye mørkere enn disen regnslør er; striper: lysstyrken (ganger sollyset)
    bygeAlfa: .78, regnMørk: .6, stråleLys: .22,
    // høyst så mange [PC, mobil]; Lav grafikk: byger ganges med lavAndel, ingen striper
    maksByger: [10, 6], maksStriper: [18, 10], lavAndel: .4,
    // inne i en byge: sikten (tåkas ytterkant) ganges ned med inntil så mye
    siktInne: .55,
    // inne i en byge: så mye av sollyset og himmelens lys som tas bort
    solInne: .6, himmelInne: .35,
    // nedbøren rundt kameraet begynner når bygen er så sterk over deg
    dråpeFra: .12,
    // disen: høyden (m i scenen) der den er tettest, og hvor fort den tynnes oppover (m)
    disBunn: -150, disTynnes: 1600,
  };
  const på = () => !navigator.webdriver || Luft3d.test === true;
  const lav = () => !!(window.KVAL && KVAL.nivå === 'lav');

  // ---------- dis i lag: tillegg i three.js sin tåke ----------
  // uLuftF = (styrke, farge r, g, b), uLuftL = (start i m, 1 / lengden, dalbunnen i scenen, 1 / tynningen). Tallrekker deles av alle materialer.
  const LF = new Float32Array(4), LL = new Float32Array([1300, 1 / 15000, VIS.disBunn, 1 / VIS.disTynnes]);
  let koblet = false;
  function init() {
    if (koblet || typeof THREE === 'undefined') return; koblet = true;
    const C = THREE.ShaderChunk;
    C.fog_pars_vertex = C.fog_pars_vertex.replace('varying float fogDepth;', 'varying float fogDepth;\n\tvarying float vLuftZ;');
    C.fog_vertex = C.fog_vertex.replace('fogDepth = - mvPosition.z;', 'fogDepth = - mvPosition.z;\n\tvLuftZ = dot(viewMatrix[2].xyz, mvPosition.xyz - viewMatrix[3].xyz);');
    C.fog_pars_fragment = C.fog_pars_fragment.replace('varying float fogDepth;', 'varying float fogDepth;\n\tvarying float vLuftZ;\n\tuniform vec4 uLuftF;\n\tuniform vec4 uLuftL;');
    // først (før tåka i dalene og den vanlige tåka): det blå luftperspektivet
    C.fog_fragment = C.fog_fragment.replace('#ifdef USE_FOG', '#ifdef USE_FOG\n\tif (uLuftF.x > 0.0) {\n\tfloat luftA = uLuftF.x * (1.0 - exp(-max(fogDepth - uLuftL.x, 0.0) * uLuftL.y)) * (0.55 + 0.45 * exp(-max(vLuftZ - uLuftL.z, 0.0) * uLuftL.w));\n\tgl_FragColor.rgb = mix(gl_FragColor.rgb, uLuftF.yzw, luftA);\n\t}');
    const lag = () => ({ uLuftF: { value: LF }, uLuftL: { value: LL } });
    for (const lib of Object.values(THREE.ShaderLib)) if (lib.uniforms && lib.uniforms.fogColor) Object.assign(lib.uniforms, lag());
    Object.assign(THREE.UniformsLib.fog, lag());
  }
  KROKER.lys3d.push((R, L) => {
    const V = window.VAER, fc = R.scene.fog ? R.scene.fog.color : null;
    const dagL = trinn(-14, 6, L.e), d = Luft.dis(V, dagL, L.sky, fc ? [fc.r, fc.g, fc.b] : null);
    LF[0] = d.k; LF[1] = d.farge[0]; LF[2] = d.farge[1]; LF[3] = d.farge[2]; LL[1] = 1 / Luft.REGLER.dis.lengde;
    // sollyset slik lys3d (og natt3d) satte det – bygen over deg demper det i ramme3d
    T.solBase = R.sol.intensity;
  });

  // ---------- byger og striper: én flate per stk., plassen per instans ----------
  function flate() {
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); g.setIndex([0, 1, 2, 0, 2, 3]);
    return g;
  }
  function lagNett(R, n, vs, fs, uniforms, blanding) {
    const g = flate();
    g.setAttribute('iPos', new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('iDat', new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4));
    g.instanceCount = 0;
    const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms, vertexShader: vs, fragmentShader: fs, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: blanding || THREE.NormalBlending }));
    m.frustumCulled = false; m.renderOrder = 2; m.visible = false; R.scene.add(m); return m;
  }
  const FOG_U = () => ({ uFogF: { value: new THREE.Color() }, uFogA: { value: new THREE.Vector2(4000, 9000) } });
  // Bygene: iPos = (x, y, skybasen), iDat = (radius, styrke, snø 0/1, frø). Sløret står loddrett og dreier mot kameraet; nederst driver
  // det med vinden (uHeld). Det tones bort når kameraet er inne i bygen (da tar regnet rundt kameraet over).
  const BYGE_VS = `attribute vec3 iPos; attribute vec4 iDat; uniform vec2 uHeld; varying vec2 vUv; varying float vA; varying float vDyb; varying float vSno; varying float vFro;
    void main() { vUv = uv; vec2 tk = cameraPosition.xy - iPos.xy; float dk = length(tk);
      vec2 side = dk > 1.0 ? vec2(-tk.y, tk.x) / dk : vec2(1.0, 0.0);
      float zB = -800.0, z = mix(zB, iPos.z, uv.y);
      vec2 xy = iPos.xy + side * (uv.x - 0.5) * 2.0 * iDat.x + uHeld * (1.0 - uv.y) * (iPos.z - zB);
      vec4 mv = viewMatrix * vec4(xy, z, 1.0); vDyb = -mv.z;
      vA = iDat.y * smoothstep(iDat.x * 0.7, iDat.x * 1.8, dk); vSno = iDat.z; vFro = iDat.w;
      gl_Position = projectionMatrix * mv; }`;
  const BYGE_FS = `uniform vec3 uRegn; uniform vec3 uSno; uniform vec3 uFogF; uniform vec2 uFogA; uniform float uMaks; uniform float uTid;
    varying vec2 vUv; varying float vA; varying float vDyb; varying float vSno; varying float vFro;
    void main() { float x = vUv.x, y = vUv.y;
      // myk, uregelmessig kant (ikke en firkant), noen brede folder, svake striper i regn; tettest nede, tones inn i skybasen øverst
      float k0 = 0.42 + 0.12 * sin(y * 3.1 + vFro * 5.0);
      float kant = smoothstep(0.0, k0, x) * smoothstep(1.0, 1.0 - k0, x);
      float folder = 0.7 + 0.3 * sin(x * 7.0 + vFro * 6.3 + sin(y * 2.3 + vFro * 4.0 + uTid * 0.05) * 1.6) * sin(x * 3.3 + vFro * 2.1);
      float strek = mix(0.9 + 0.1 * sin(x * 47.0 + y * 6.0 + vFro * 17.0), 1.0, vSno);
      float topp = smoothstep(1.0, 0.72, y) * mix(0.5, 1.0, smoothstep(0.85, 0.35, y));
      float a = vA * kant * folder * strek * topp * uMaks;
      float f = smoothstep(uFogA.x, uFogA.y, vDyb);
      vec3 farge = mix(mix(uRegn, uSno, vSno), uFogF, f * 0.75);
      a *= 1.0 - 0.65 * f; if (a < 0.004) discard;
      gl_FragColor = vec4(farge, a); }`;
  // Stripene: iPos = punktet på bakken, iDat = (bredde, styrke, frø, –). Flaten går fra bakken opp langs retningen mot sola til skybasen,
  // er bredest nede og dreier om aksen mot kameraet. uSol = retningen mot sola.
  const STRÅLE_VS = `attribute vec3 iPos; attribute vec4 iDat; uniform vec3 uSol; uniform float uTopp; varying vec2 vUv; varying float vA; varying float vDyb; varying float vFro;
    void main() { vUv = uv; vec3 S = normalize(uSol);
      float L = clamp((uTopp - iPos.z) / max(S.z, 0.1), 300.0, 9000.0);
      vec3 p = iPos + S * (uv.y * L);
      vec3 tk = normalize(cameraPosition - p), side = cross(S, tk); float sl = length(side); side = sl > 0.001 ? side / sl : vec3(1.0, 0.0, 0.0);
      p += side * (uv.x - 0.5) * iDat.x * (1.0 + 0.6 * (1.0 - uv.y));
      vec3 vd = normalize(p - cameraPosition); float mot = max(0.0, dot(vd, S));
      vA = iDat.y * (0.18 + 0.82 * pow(mot, 3.0)) * smoothstep(250.0, 900.0, length(p - cameraPosition)); vFro = iDat.z;
      vec4 mv = viewMatrix * vec4(p, 1.0); vDyb = -mv.z; gl_Position = projectionMatrix * mv; }`;
  const STRÅLE_FS = `uniform vec3 uLys; uniform vec2 uFogA; varying vec2 vUv; varying float vA; varying float vDyb; varying float vFro;
    void main() { float x = vUv.x, y = vUv.y, s = sin(3.14159 * x);
      float tvers = s * s * (0.7 + 0.3 * sin(x * 9.0 + vFro * 7.0));
      float langs = smoothstep(0.0, 0.35, y) * smoothstep(1.0, 0.72, y);
      float a = vA * tvers * langs * (1.0 - 0.7 * smoothstep(uFogA.x, uFogA.y * 1.2, vDyb));
      if (a < 0.003) discard;
      gl_FragColor = vec4(uLys * a, 1.0); }`;

  const T = { byger: null, striper: null, D: [0, 0], sistTid: null, liste: [], stråler: [], her: { mengde: 0, byge: null }, meldt: -1e9, inne: false };
  window.BYGE = { regn: 0, snø: 0, mengde: 0, type: null };
  function lag(R) {
    T.byger = lagNett(R, 16, BYGE_VS, BYGE_FS, { ...FOG_U(), uHeld: { value: new THREE.Vector2() }, uRegn: { value: new THREE.Color() }, uSno: { value: new THREE.Color() }, uMaks: { value: VIS.bygeAlfa }, uTid: { value: 0 } });
    T.byger.name = 'byger';
    T.striper = lagNett(R, 24, STRÅLE_VS, STRÅLE_FS, { ...FOG_U(), uSol: { value: new THREE.Vector3(0, 0, 1) }, uTopp: { value: VIS.skyH }, uLys: { value: new THREE.Color() } }, THREE.AdditiveBlending);
    T.striper.name = 'lysstriper';
  }
  const bakkeZ = (R, X, Y) => { const u = R.ut, h = hoyde3d(X, Y, u); return Number.isFinite(h) ? (h - u.h0) * R.EX : 0; };

  KROKER.ramme3d.push(R => {
    if (!R.ut) return; const V = window.VAER, u = R.ut, c = R.cam.position;
    // disen begynner et stykke ute: når du går ca. 1,3 km, fra lufta litt innenfor kameraavstanden (bakken midt i bildet er klar)
    LL[0] = Luft.disStart(!!R.fot, R.bane ? R.bane.avst : 0);
    if (!V || !på()) { if (T.byger) T.byger.visible = T.striper.visible = false; settBy(0, null); T.her = { mengde: 0, byge: null }; if (T.solBase != null) R.sol.intensity = T.solBase; return; }
    if (!T.byger) lag(R);
    // skyene driver i spilltid (som skyskyggene i spill/natt3d.js)
    const dTid = T.sistTid == null ? 0 : Math.max(0, Math.min(30, tid - T.sistTid)); T.sistTid = tid;
    const vf = V.vind ? V.vind.fart : 3, vr = V.vind ? V.vind.retning : .4;
    if (dTid) { const d = Luft.drift(vf, vr, dTid); T.D[0] += d[0]; T.D[1] += d[1]; }
    const X = u.cx + c.x, Y = u.cy + c.y, fc = R.scene.fog.color, mørk = window.NATT ? NATT.mørke || 0 : 0, lys = 1 - .8 * mørk;
    const iMob = mob() ? 1 : 0;
    // --- byger ---
    let maksB = VIS.maksByger[iMob]; if (lav()) maksB = Math.max(2, Math.round(maksB * VIS.lavAndel));
    T.liste = Luft.byger(X, Y, T.D, tid, Luft.bygeMengde(V), maksB);
    const gb = T.byger.geometry, pb = gb.attributes.iPos.array, db = gb.attributes.iDat.array;
    let n = 0;
    for (const b of T.liste) {
      const zg = bakkeZ(R, b.x, b.y), moh = zg / R.EX + u.h0;
      b.type = Luft.type(moh, V.snøgrense, V.årstid);
      pb[n * 3] = b.x - u.cx; pb[n * 3 + 1] = b.y - u.cy; pb[n * 3 + 2] = Math.max(VIS.skyH, zg + VIS.overBakke);
      db[n * 4] = b.r; db[n * 4 + 1] = b.a; db[n * 4 + 2] = b.type === 'snø' ? 1 : 0; db[n * 4 + 3] = b.frø; n++;
    }
    gb.instanceCount = n; gb.attributes.iPos.needsUpdate = gb.attributes.iDat.needsUpdate = true; T.byger.visible = n > 0;
    if (n) { const U = T.byger.material.uniforms, held = Math.min(.5, vf * .03);
      U.uHeld.value.set(Math.cos(vr) * held, Math.sin(vr) * held); U.uTid.value = performance.now() / 1000 % 10000;
      U.uRegn.value.setRGB(fc.r * VIS.regnMørk, fc.g * VIS.regnMørk, fc.b * VIS.regnMørk * 1.04).multiplyScalar(lys);
      U.uSno.value.setRGB(fc.r * .4 + .58, fc.g * .4 + .59, fc.b * .4 + .6).multiplyScalar(lys);
      U.uFogF.value.copy(fc); U.uFogA.value.set(R.scene.fog.near, R.scene.fog.far); }
    // --- står du i en byge? ---
    const h = Luft.her(T.liste, X, Y); T.her = h; settBy(h.mengde, h.byge ? h.byge.type : null);
    if (h.mengde > .05) { const fog = R.scene.fog, k = 1 - VIS.siktInne * h.mengde; fog.far = Math.max(150, fog.far * k); fog.near = Math.min(fog.near, fog.far * .35); }
    // under bygen: sola skygges bort og himmelen blir grå (lys3d/natt3d setter verdiene på nytt – her ganges de ned for dette bildet)
    const mh = h.mengde;
    if (T.solBase != null) R.sol.intensity = T.solBase * (1 - VIS.solInne * mh);
    if (mh > .01) { R.kuppel.material.color.multiplyScalar(1 - VIS.himmelInne * mh); if (R.scene.background && R.scene.background.isColor) R.scene.background.lerp(fc, mh * .6); }
    const inne = h.mengde > .3;
    if (inne && !T.inne && tid - T.meldt > 20 && typeof logg === 'function') { T.meldt = tid; logg(h.byge.type === 'snø' ? 'En snøbyge driver inn over deg.' : 'En regnbyge driver inn over deg.'); }
    T.inne = inne;
    // --- lysstriper ---
    const e = window.NATT && Number.isFinite(NATT.e) ? NATT.e : 30;
    const styrke = lav() ? 0 : Luft.striper(V, e), gs = T.striper.geometry, ps = gs.attributes.iPos.array, ds = gs.attributes.iDat.array;
    T.stråler = styrke > .01 ? Luft.stråler(X, Y, T.D, tid, styrke, VIS.maksStriper[iMob]) : [];
    let m = 0;
    for (const s of T.stråler) { ps[m * 3] = s.x - u.cx; ps[m * 3 + 1] = s.y - u.cy; ps[m * 3 + 2] = bakkeZ(R, s.x, s.y); ds[m * 4] = s.b; ds[m * 4 + 1] = s.a; ds[m * 4 + 2] = s.frø; m++; }
    gs.instanceCount = m; gs.attributes.iPos.needsUpdate = gs.attributes.iDat.needsUpdate = true; T.striper.visible = m > 0;
    if (m) { const U = T.striper.material.uniforms, sp = R.sol.position;
      U.uSol.value.set(sp.x, sp.y, sp.z).normalize(); U.uTopp.value = Math.max(VIS.skyH, c.z + 200);
      U.uLys.value.copy(R.sol.color).multiplyScalar(VIS.stråleLys * Math.min(1.2, R.sol.intensity * 1.4));
      U.uFogA.value.set(R.scene.fog.near, R.scene.fog.far); }
  });
  // (ytterst i bygen ingen dråper: noen få spredte dråper rundt et kamera i lufta så ut som hvite pinner)
  function settBy(m, type) { const B = window.BYGE, n = Math.max(0, (m - VIS.dråpeFra) / (1 - VIS.dråpeFra)); B.mengde = m; B.type = type; B.regn = type === 'regn' ? n : 0; B.snø = type === 'snø' ? n : 0; }

  // For testene og vakta: hva som vises nå
  window.Luft3d = { init, VIS, LF, LL, T, test: false,
    sjekk: () => ({ byger: T.byger && T.byger.visible ? T.byger.geometry.instanceCount : 0, striper: T.striper && T.striper.visible ? T.striper.geometry.instanceCount : 0,
      dis: LF[0], disFarge: [LF[1], LF[2], LF[3]], disStart: LL[0], her: T.her.mengde, type: T.her.byge ? T.her.byge.type : null, D: T.D.slice() }),
    // flytt skyene så den kraftigste bygen står rett over punktet (X, Y) i kartet (vakta og skjermbildene)
    bygeOver(X, Y) { const l = T.liste; if (!l.length) return false; const b = l.reduce((a, x) => (x.a > a.a ? x : a), l[0]); T.D[0] += X - b.x; T.D[1] += Y - b.y; return true; } };
})();
