'use strict';
// LYS OG SKYGGER I 3D (18. nov, pakke «lys»; brukeren: «få 3D til å se klart bedre ut uten å gjøre det tregere»).
//  1. SKYGGER FRA SOLA (og månen): ett skyggekart som følger kameraet (VSM: ett oppslag per punkt). Husene, trærne, bruene og leiren kaster skygge, og alt
//     som er lyssatt tar imot. Skyggekartet tegnes IKKE hvert bilde, bare når kameraet har flyttet seg et stykke, sola har flyttet seg,
//     trærne er fordelt på nytt eller et nytt utsnitt er satt inn – ellers koster skyggene bare oppslagene i bildet. Ting som beveger
//     seg (kjøretøy, soldater, dyr, trafikk) kaster derfor ikke skygge. Terrenget tar imot, men kaster ikke. Skyggen tones ut mot kanten av skyggekartet (ingen skarp kant).
//  2. TÅKE I DALENE: all tåke (three.js sin «fog») får et tillegg som er tettest nederst i terrenget og tynnes oppover – morgentåka
//     ligger i dalbunnen og følger terrenget, og om dagen er det en svak dis i lavlandet. Gjelder alt som har tåke (terreng, trær, hus).
//  3. BAKKENS TEKSTURER: atlas() gir ett bilde med fire mønstre (gress, lyng, grus, berg) som bakkens skyggelegger blander etter
//     kartfargen nær kameraet (BAKKE_FX i detaljIBakken, index.html).
// Alt følger KVAL.fx (spill/kvalitet.js): Høy og Middels, av på Lav, og kan slås av med «Lys og skygger» i ☰.
// index.html kaller Lys3d.init(R3) i init3d – før noe materiale er laget (skyggeleggerne i three.js endres).
// VAKT: GLSL tåler bare ASCII.
(function () {
  // Claudes forslag (alle tallene):
  const REGLER = {
    // halve siden av området skyggekartet dekker (meter): når du går, og fra lufta (andel av kameraavstanden, mellom min og maks)
    gåHalv: 110, luftAndel: .55, luftMin: 120, luftMaks: 700,
    // skyggekartet tegnes på nytt når midten har flyttet seg denne andelen av halve siden
    flyttAndel: .22, perSekund: 4,
    // hvor langt mot sola ting kan stå og likevel kaste skygge inn i området (meter)
    motSola: 3000,
    // sollys svakere enn dette gir ingen skygger (natt uten måne)
    minLys: .09,
    // dalens tåke: svak dis om dagen, tett morgentåke; tykkelsen på laget (meter) og hvor fort den tetner med avstanden (per meter)
    disDag: .1, disMorgen: .8, lagTykkelse: 70, perMeter: 1 / 380,
  };
  // delte uniformer: U for skyggeleggere som kobler seg på selv; DAL/DALF ligger i three.js sitt bibliotek (alle innebygde materialer)
  const U = { uFxTid: { value: 0 } };
  const DAL = new Float32Array(4), DALF = new Float32Array(3);
  const L = { REGLER, U, DAL, DALF, på: false, tegnet: 0, kaster: 0, tar: 0, halv: 0 };
  window.Lys3d = L;

  // ---------- three.js sine skyggeleggere ----------
  L.init = R => {
    if (L.koblet || typeof THREE === 'undefined') return; L.koblet = true;
    const C = THREE.ShaderChunk;
    // skyggen tones ut mot kanten av skyggekartet
    C.shadowmap_pars_fragment = C.shadowmap_pars_fragment.replace('return shadow;',
      'vec2 skKant = abs(shadowCoord.xy * 2.0 - 1.0);\n\t\tshadow = mix(shadow, 1.0, smoothstep(0.8, 1.0, max(skKant.x, skKant.y)));\n\t\treturn shadow;');
    // tåke i dalene: høyden over havet (i scenens mål) regnes ut fra kameramatrisen, så det virker for alle slags nett
    C.fog_pars_vertex = C.fog_pars_vertex.replace('varying float fogDepth;', 'varying float fogDepth;\n\tvarying float vDalZ;');
    C.fog_vertex = C.fog_vertex.replace('fogDepth = - mvPosition.z;', 'fogDepth = - mvPosition.z;\n\tvDalZ = dot(viewMatrix[2].xyz, mvPosition.xyz - viewMatrix[3].xyz);');
    C.fog_pars_fragment = C.fog_pars_fragment.replace('varying float fogDepth;', 'varying float fogDepth;\n\tvarying float vDalZ;\n\tuniform vec4 uDalT;\n\tuniform vec3 uDalF;');
    C.fog_fragment = C.fog_fragment.replace('#ifdef USE_FOG', '#ifdef USE_FOG\n\tfloat dalT = uDalT.x * exp(-max(vDalZ - uDalT.y, 0.0) / max(uDalT.z, 1.0)) * (1.0 - exp(-fogDepth * uDalT.w));\n\tgl_FragColor.rgb = mix(gl_FragColor.rgb, uDalF, clamp(dalT, 0.0, 1.0));');
    // (verdiene er tallrekker, som three.js ikke kopierer per materiale: alle materialer deler de samme)
    for (const lib of Object.values(THREE.ShaderLib)) if (lib.uniforms && lib.uniforms.fogColor) { lib.uniforms.uDalT = { value: DAL }; lib.uniforms.uDalF = { value: DALF }; }
    DAL[2] = REGLER.lagTykkelse; DAL[3] = REGLER.perMeter;
  };

  // ---------- bakkens mønstre ----------
  // 512 × 512, sømløst: r = gress (strå), g = lyng og mose (tuer med småprikker), b = grus (småstein), a = berg (sprekker og lav)
  let atlasTex = null;
  L.atlas = () => {
    if (atlasTex) return atlasTex;
    const W = 512, d = new Uint8Array(W * W * 4); let f = 20231118;
    const rnd = () => (f = (f * 16807) % 2147483647) / 2147483647, s2 = t => t * t * (3 - 2 * t);
    // sømløs verdistøy
    const støy = oktaver => { const lag = oktaver.map(n => [n, Float32Array.from({ length: n * n }, rnd)]);
      return (x, y) => { let v = 0, w = .5, sum = 0;
        for (const [n, a] of lag) { const u = x / W * n, t = y / W * n, i0 = Math.floor(u), j0 = Math.floor(t), fu = s2(u - i0), fv = s2(t - j0), q = (i, j) => a[(j % n) * n + (i % n)];
          v += w * ((q(i0, j0) * (1 - fu) + q(i0 + 1, j0) * fu) * (1 - fv) + (q(i0, j0 + 1) * (1 - fu) + q(i0 + 1, j0 + 1) * fu) * fv); sum += w; w *= .55; }
        return v / sum; }; };
    // punkter i ruter (ett per rute): avstanden til nærmeste og nest nærmeste, og nærmestes nummer
    const celler = n => { const P = Float32Array.from({ length: n * n * 3 }, rnd), c = W / n;
      return (x, y) => { const ci = Math.floor(x / c), cj = Math.floor(y / c); let d1 = 1e9, d2 = 1e9, id = 0;
        for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) { const i = ((ci + a) % n + n) % n, j = ((cj + b) % n + n) % n, k = (j * n + i) * 3;
          const dx = (ci + a + P[k]) * c - x, dy = (cj + b + P[k + 1]) * c - y, dd = dx * dx + dy * dy; if (dd < d1) { d2 = d1; d1 = dd; id = P[k + 2]; } else if (dd < d2) d2 = dd; }
        return [Math.sqrt(d1), Math.sqrt(d2), id]; }; };
    const gB = støy([8, 16, 64]), lyngN = støy([32, 64, 128]), bergN = støy([4, 8, 16, 32, 64]), bergS = støy([6, 12, 24]), bergS2 = støy([10, 20, 40]), lav = støy([16, 32]);
    const tuer = celler(18), stein = celler(56), stein2 = celler(20);
    const G = new Float32Array(W * W);
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const o = (y * W + x) * 4;
      G[y * W + x] = .14 + .24 * gB(x, y);
      // lyng: tuer (mørke mellomrom), fin struktur
      const [t1] = tuer(x, y), tue = 1 - s2(Math.min(1, t1 / 21));
      d[o + 1] = 255 * Math.min(1, .16 + .62 * tue * (.45 + .75 * lyngN(x, y)) + .1 * lyngN(y, x));
      // grus: småstein med mørk fuge, hver stein sin lysstyrke; noen større steiner oppå
      const [s1, s22, sid] = stein(x, y), kant = s2(Math.min(1, (s22 - s1) / 3.2)), [b1, b2, bid] = stein2(x, y), stor = bid > .72 ? s2(Math.min(1, (b2 - b1) / 4)) * s2(Math.max(0, 1 - b1 / 11)) : 0;
      d[o + 2] = 255 * Math.min(1, (.14 + kant * (.3 + .5 * sid)) * (1 - stor) + stor * (.5 + .45 * bid));
      // berg: grov flate, sprekker (to retninger) og lyse lavflekker
      const bn = bergN(x, y), sp = Math.min(Math.abs(bergS(x, y) - .5), Math.abs(bergS2(x, y) - .5)), sprekk = 1 - s2(Math.min(1, sp / .022)), lv = s2(Math.max(0, Math.min(1, (lav(x, y) - .6) / .1)));
      d[o + 3] = 255 * Math.max(0, Math.min(1, .3 + .5 * bn - .34 * sprekk + .22 * lv)); }
    // gress: tuer av strå som spriker ut fra samme rot – brede nederst (3 punkter), smale og lyse i tuppen
    const settG = (x, y, v) => { const q = (((Math.round(y) % W) + W) % W) * W + (((Math.round(x) % W) + W) % W); if (v > G[q]) G[q] = v; };
    for (let k = 0; k < 1900; k++) { const cx = rnd() * W, cy = rnd() * W, n = 4 + Math.floor(rnd() * 5), tl = .45 + .55 * rnd();
      for (let b = 0; b < n; b++) { const v = -1.57 + (rnd() - .5) * 2.3, len = 12 + rnd() * 26, lys = tl * (.55 + .45 * rnd()), dx = Math.cos(v), dy = Math.sin(v), bøy = (rnd() - .5) * .03;
        for (let t = 0; t < len; t++) { const x = cx + dx * t + bøy * t * t, y = cy + dy * t, val = lys * (.45 + .55 * t / len);
          settG(x, y, val); if (t < len * .7) { settG(x - dy, y + dx, val * .8); settG(x + dy, y - dx, val * .8); } } } }
    for (let k = 0; k < W * W; k++) d[k * 4] = 255 * Math.min(1, G[k]);
    // lyng: små, skarpe blad og kvister oppå tuene (korte streker, to punkter brede), noen lyse, noen mørke
    for (let k = 0; k < 11000; k++) { const x0 = rnd() * W, y0 = rnd() * W, len = 3 + rnd() * 5, v = rnd() * 6.283, dx = Math.cos(v), dy = Math.sin(v), lys = rnd() < .3 ? 30 + 50 * rnd() : 120 + 135 * rnd();
      for (let t = 0; t < len; t++) for (let o = 0; o < 2; o++) { const x = ((Math.round(x0 + dx * t - dy * o) % W) + W) % W, y = ((Math.round(y0 + dy * t + dx * o) % W) + W) % W; d[(y * W + x) * 4 + 1] = lys * (.5 + .5 * d[(y * W + x) * 4 + 1] / 255 + .25); } }
    // småprikker i lyngen (blomster og lyse blad)
    for (let k = 0; k < 2600; k++) { const x = Math.floor(rnd() * W), y = Math.floor(rnd() * W); d[(y * W + x) * 4 + 1] = 200 + 55 * rnd(); if (rnd() < .5) d[(y * W + (x + 1) % W) * 4 + 1] = 190; }
    const t = new THREE.DataTexture(d, W, W, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
    t.anisotropy = 4; t.needsUpdate = true; atlasTex = t; return t;
  };

  // ---------- skyggene ----------
  // Hvem kaster skygge? Terrenget, trærne, husene, småtingene og det som står stille fra disse filene (userData.kilde, spill/ytelse.js).
  const STILLE = /^(infra3d|kraft3d|leir-visning|anlegg3d|portal3d|gard3d|byhus|bane3d|kyst3d|vegetasjon3d)$/;
  const lyssatt = m => !!m && (m.isMeshLambertMaterial || m.isMeshPhongMaterial || m.isMeshStandardMaterial);
  function merk(R, på) {
    // (terrenget selv kaster ikke: med VSM tegnes forsidene i skyggekartet, og bratte lier ville skygge for seg selv i striper)
    const kast = new Set([R.bruMesh, ...(R.treMesh || []), ...(R.husMesh || []), ...(R.småMesh || [])]);
    for (const t of R.treLOD || []) { kast.add(t.nær); kast.add(t.fjern); }
    let nk = 0, nt = 0;
    R.scene.traverse(o => {
      if (!o.isMesh) return; const m = [].concat(o.material)[0]; if (!lyssatt(m)) return;
      let kilde = null; for (let p = o; p && !kilde; p = p.parent) kilde = p.userData && p.userData.kilde;
      const gjennom = m.transparent && !(m.alphaTest > 0);
      // (gresstustene rundt kameraet tar ikke imot skygge: mange gjennomsiktige flater oppå hverandre, og de er mørke fra før.
      // Heller ikke innsiden av hus: taket og veggene ville lagt alt der inne i skygge – interiøret har sitt eget lys.)
      const k = på && !gjennom && (kast.has(o) || STILLE.test(kilde || '')), t = på && o !== R.gressMesh && kilde !== 'interior3d';
      if (o.castShadow !== k) o.castShadow = k; if (o.receiveShadow !== t) { o.receiveShadow = t; for (const mm of [].concat(o.material)) mm.needsUpdate = true; }
      if (k) nk++; if (t) nt++;
    });
    L.kaster = nk; L.tar = nt;
  }
  function kastKart(sol) { const s = sol.shadow; if (s.map) { s.map.dispose(); s.map = null; } if (s.mapPass) { s.mapPass.dispose(); s.mapPass = null; } }
  const S = { n: 0, midt: null, halv: 0, dir: null, lod: null, sett: -1, merket: 0, myk: null };
  let v1 = null, v2 = null, v3 = null, vx = null, vy = null, vz = null;
  function skygger(R) {
    const fx = window.KVAL && KVAL.fx ? KVAL.fx : null, n = fx ? fx.skygge[VW < 900 ? 1 : 0] : 0, sol = R.sol, r = R.renderer;
    const vil = n > 0 && !!R.ut && !!R.mesh;
    if (!vil) { if (L.på) { L.på = false; sol.castShadow = false; merk(R, false); kastKart(sol); S.n = 0; } return; }
    if (!v1) { v1 = new THREE.Vector3(); v2 = new THREE.Vector3(); v3 = new THREE.Vector3(); vx = new THREE.Vector3(); vy = new THREE.Vector3(); vz = new THREE.Vector3(); }
    let ny = false, straks = false;
    if (!L.på || S.n !== n || S.myk !== fx.myk) {
      L.på = true; S.n = n; S.myk = fx.myk; r.shadowMap.enabled = true; r.shadowMap.autoUpdate = false;
      // SKYGGETYPEN (målt 18. nov med programvare-grafikk: myke skygger med mange oppslag per punkt – PCF 17, PCFSoft 9 – var det
      // klart dyreste i hele pakka). VSM: skyggekartet glattes når det tegnes (sjelden), og hvert punkt i bildet gjør ETT oppslag.
      const type = THREE.VSMShadowMap; if (r.shadowMap.type !== type) { r.shadowMap.type = type; R.scene.traverse(o => { if (o.material) for (const m of [].concat(o.material)) m.needsUpdate = true; }); }
      sol.castShadow = true; kastKart(sol); sol.shadow.mapSize.set(n, n); sol.shadow.radius = fx.myk ? 3 : 2;
      S.sett = -1; ny = true; straks = true;
    }
    // nye ting i scenen: nytt utsnitt straks, ellers en titt av og til (moduler som legger til ting litt etter litt)
    const nå = performance.now();
    if (S.sett !== R.settNr || nå - S.merket > 1500) { const før = L.kaster; S.merket = nå; merk(R, true); if (S.sett !== R.settNr) ny = straks = true; else if (før !== L.kaster) ny = true; S.sett = R.settNr; }
    // For svakt lys (natt uten måne): skyggekartet flyttes langt bort og tømmes – ingen skygger, men de samme programmene.
    // (Å slå skyggene helt av og på ved skumring og daggry ville gitt nye skyggeprogrammer for hele scenen hver gang: et hakk.)
    if (sol.intensity < REGLER.minLys) {
      if (S.mørkt && !ny) return; S.mørkt = true; S.venter = false; S.midt = null; L.mørkt = true;
      const k = sol.shadow.camera; k.left = 9e5; k.right = 9e5 + 10; k.bottom = 9e5; k.top = 9e5 + 10; k.near = 1; k.far = 10; k.updateProjectionMatrix(); r.shadowMap.needsUpdate = true; return;
    }
    if (S.mørkt) { S.mørkt = false; L.mørkt = false; ny = true; }
    // området: der du går, eller der kameraet ser fra lufta
    const b = R.bane, u = R.ut, c = R.cam.position; let halv, mx, my;
    if (R.fot) { halv = REGLER.gåHalv; R.cam.getWorldDirection(v1); const h = Math.hypot(v1.x, v1.y) || 1; mx = c.x + v1.x / h * halv * .55; my = c.y + v1.y / h * halv * .55; }
    else { halv = Math.max(REGLER.luftMin, Math.min(REGLER.luftMaks, b.avst * REGLER.luftAndel)); mx = b.x; my = b.y; }
    const mz = (hoyde3d(u.cx + mx, u.cy + my) - u.h0) * R.EX;
    // lysets retning (sola står i retning sol.position fra målet i origo)
    v2.copy(sol.position).sub(sol.target.position).normalize();
    if (!S.midt || Math.hypot(mx - S.midt[0], my - S.midt[1], mz - S.midt[2]) > S.halv * REGLER.flyttAndel || Math.abs(halv - S.halv) > S.halv * .15) ny = true;
    if (!S.dir || v2.dot(S.dir) < .99998) ny = true;
    if (R.lodVed !== S.lod) ny = true;
    if (ny) S.venter = true;
    // høyst REGLER.perSekund ganger i sekundet (snur du deg eller går, fordeles trærne på nytt hele tiden – skyggekartet skal ikke
    // tegnes i hvert bilde av den grunn); et nytt utsnitt får skyggene sine straks
    if (!S.venter || (!straks && nå - (S.sist || 0) < 1000 / REGLER.perSekund)) return;
    S.venter = false; S.sist = nå;
    S.midt = [mx, my, mz]; S.halv = halv; S.dir = (S.dir || new THREE.Vector3()).copy(v2); S.lod = R.lodVed; L.halv = halv;
    // skyggekameraet ser fra sola mot origo (three.js setter det slik); området legges til siden i kameraets egne mål, på hele punkter
    vz.copy(v2); vx.set(0, 1, 0).cross(vz).normalize(); vy.copy(vz).cross(vx);
    v3.set(mx, my, mz).sub(sol.position);
    const tex = 2 * halv / n, lx = Math.round(v3.dot(vx) / tex) * tex, ly = Math.round(v3.dot(vy) / tex) * tex, lz = -v3.dot(vz), k = sol.shadow.camera;
    k.left = lx - halv; k.right = lx + halv; k.top = ly + halv; k.bottom = ly - halv; k.near = lz - REGLER.motSola; k.far = lz + halv * 1.6 + 250; k.updateProjectionMatrix();
    const dybde = k.far - k.near; sol.shadow.bias = -(.22 + tex * .6) / dybde; sol.shadow.normalBias = Math.max(.25, tex * 1.6);
    r.shadowMap.needsUpdate = true; L.tegnet++;
  }

  // ---------- tåke i dalene ----------
  function dalen(R) {
    const fx = window.KVAL && KVAL.fx ? KVAL.fx : null, V = window.VAER, u = R.ut;
    if (!fx || !fx.bakke || !u || !R.scene.fog) { DAL[0] = 0; return; }
    if (u.dalBunn == null) { let lav = 1e9; const H = u.H; if (H) for (let k = 0; k < H.length; k += 7) { const h = H[k]; if (h > -50 && h < lav) lav = h; } u.dalBunn = lav < 1e8 ? lav : u.h0; }
    const morgen = V ? V.dalTåke || 0 : 0, tett = Math.max(REGLER.disDag, morgen * REGLER.disMorgen);
    // tåka står fra dalbunnen og et stykke opp; fargen er disens, litt lysere (tåke er lys også når himmelen bak er blå)
    DAL[0] = tett; DAL[1] = (u.dalBunn - u.h0) * R.EX + 15 + 40 * morgen; DAL[2] = REGLER.lagTykkelse * (1 + morgen); DAL[3] = REGLER.perMeter * (1 + 1.5 * morgen);
    const fc = R.scene.fog.color, lys = .12 + .1 * morgen; DALF[0] = fc.r + (1 - fc.r) * lys; DALF[1] = fc.g + (1 - fc.g) * lys; DALF[2] = fc.b + (1 - fc.b) * lys;
  }

  KROKER.ramme3d.push(R => {
    if (!L.koblet || !R.ut) return;
    U.uFxTid.value = (performance.now() / 1000) % 10000;
    skygger(R); dalen(R);
  });
  // Tall for vakta og testene
  L.sjekk = () => { const R = typeof R3 !== 'undefined' && R3; if (!R) return null; const s = R.sol.shadow;
    return { på: L.på, mørkt: !!L.mørkt, kart: s && s.map ? s.map.width : 0, kaster: L.kaster, tar: L.tar, tegnet: L.tegnet, halv: L.halv, dal: Array.from(DAL), atlas: !!atlasTex,
      glFeil: R.renderer.getContext().getError() }; };
})();
