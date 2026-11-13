'use strict';
// Oljeplattformene i 3D (feilretting 12. nov: ved Troll A i Nordsjøen sto det bare et navn og et kartsymbol – ingenting på sjøen).
// Innretningene fra Sokkeldirektoratet (INFRA.olje): type 0 = plattform (stålbein, dekk, moduler; boretårn når den borer, boligkvarter med
// helikopterdekk når den har det, fakkelbom når den prosesserer), type 2 = flytende innretning (produksjonsskip). Havbunnsinnretninger
// (type 1) ligger under vann, og anleggene på land (type 3) er vanlige bygg. Fjernede innretninger tegnes ikke.
// Ett samlet nett med hjørnefarger for hele utsnittet (få trekanter: ca. 450 per stor plattform). Kroker: KROKER.sett3d.
// window.Olje3d.sjekk() for testene. Reglene (hva en plattform har) er Olje3d.utstyr – uten THREE, se pipeline/fliser/test_olje3d.js.
(function (rot) {
  // hva som står på plattformen, etter funksjonene i dataene («drilling - processing - quarter …»)
  function utstyr(e) {
    const f = String((e && e.funksjon) || '').toLowerCase(), fase = String((e && e.fase) || '').toLowerCase();
    if (!e || (e.type !== 0 && e.type !== 2) || fase === 'removed') return null;
    const bor = /drilling/.test(f), bolig = /quarter/.test(f), prosess = /processing|flare/.test(f) || / FL$|-FL$/.test(String(e.navn || ''));
    return { skip: e.type === 2, bor: bor && e.type === 0, bolig: bolig || e.type === 2, fakkel: prosess || e.type === 2, stor: bor || bolig || prosess || e.type === 2 };
  }
  if (typeof module !== 'undefined') { module.exports = { utstyr }; return; }

  let mesh = null, antall = 0, liste = [];
  const STÅL = [.72, .6, .16], DEKK = [.5, .5, .5], HVIT = [.9, .9, .88], MODUL = [.56, .58, .6], MØRK = [.2, .21, .23], RØD = [.62, .16, .12], GRØNN = [.22, .4, .3], FLAMME = [1, .62, .2];
  function legg(deler, geo, farge) {
    const g = geo.index ? geo.toNonIndexed() : geo, p = g.attributes.position, k = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) k.set(farge, i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(k, 3)); deler.push(g);
  }
  const boks = (d, x, y, z, sx, sy, sz, f) => { const g = new THREE.BoxGeometry(sx, sy, sz); g.translate(x, y, z + sz / 2); legg(d, g, f); };
  // stående sylinder (three sin står langs y: legges opp langs z)
  const søyle = (d, x, y, z, r0, r1, h, f, n = 8) => { const g = new THREE.CylinderGeometry(r1, r0, h, n); g.rotateX(Math.PI / 2); g.translate(x, y, z + h / 2); legg(d, g, f); };
  // lokale koordinater: z = 0 er havflata
  function plattform(u) {
    const d = [], B = u.stor ? 44 : 24, D = u.stor ? 34 : 20, H = u.stor ? 24 : 18;
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) søyle(d, sx * (B / 2 - 4), sy * (D / 2 - 4), -8, 2.2, 1.8, H + 8, STÅL);
    // kryssavstivning mellom beina (to høyder) og dekket
    for (const z of [3, H - 5]) { boks(d, 0, -(D / 2 - 4), z, B - 8, .8, .8, STÅL); boks(d, 0, D / 2 - 4, z, B - 8, .8, .8, STÅL); boks(d, -(B / 2 - 4), 0, z, .8, D - 8, .8, STÅL); boks(d, B / 2 - 4, 0, z, .8, D - 8, .8, STÅL); }
    boks(d, 0, 0, H, B, D, 6, DEKK); boks(d, 0, 0, H + 6, B - 2, D - 2, .4, MØRK);
    if (!u.stor) { boks(d, 2, 0, H + 6, 10, 8, 5, MODUL); søyle(d, -7, 4, H + 6, .5, .5, 9, RØD, 6); return d; }
    boks(d, -4, -7, H + 6, 18, 14, 9, MODUL); boks(d, 2, 9, H + 6, 14, 10, 6, MODUL);
    if (u.bolig) { boks(d, B / 2 - 8, 0, H + 6, 12, 22, 17, HVIT); boks(d, B / 2 - 8, 0, H + 23, 12.4, 22.4, .5, MØRK);
      // helikopterdekket stikker ut over kanten
      søyle(d, B / 2 + 4, -D / 2 + 4, H + 21.5, 9, 9, .6, GRØNN, 8); boks(d, B / 2 - 1, -D / 2 + 6, H + 14, 1, 1, 7.5, STÅL); }
    if (u.bor) { søyle(d, -B / 2 + 12, 4, H + 6, 6, 1.6, 42, RØD, 4); boks(d, -B / 2 + 12, 4, H + 6, 12, 12, 7, MODUL); søyle(d, -B / 2 + 12, 4, H + 48, 1.7, 1.7, 2, HVIT, 4); }
    if (u.fakkel) { // fakkelbommen peker skrått ut fra hjørnet
      const g = new THREE.BoxGeometry(46, 1.2, 1.2); g.translate(23, 0, 0); g.rotateY(-.6); g.rotateZ(2.5); g.translate(-B / 2 + 2, D / 2 - 2, H + 6); legg(d, g, STÅL);
      const fl = new THREE.ConeGeometry(1.6, 5, 6); fl.rotateX(Math.PI / 2); fl.translate(-B / 2 + 2 + Math.cos(2.5) * Math.cos(.6) * 46, D / 2 - 2 + Math.sin(2.5) * Math.cos(.6) * 46, H + 6 + Math.sin(.6) * 46 + 2.5); legg(d, fl, FLAMME); }
    // kran
    søyle(d, 4, -D / 2 + 3, H + 6, 1.2, 1.2, 14, STÅL, 6); const kr = new THREE.BoxGeometry(24, .9, .9); kr.translate(12, 0, 0); kr.rotateY(-.45); kr.rotateZ(-.9); kr.translate(4, -D / 2 + 3, H + 20); legg(d, kr, STÅL);
    return d;
  }
  function skip() {
    const d = [], L = 210, B = 38;
    // skroget: rødt under, mørkt over, spiss baug
    boks(d, 0, 0, -6, L - 30, B, 8, RØD); boks(d, 0, 0, 2, L - 30, B, 9, MØRK);
    const baug = new THREE.CylinderGeometry(B / 2, B / 2, 17, 3); baug.rotateX(Math.PI / 2); baug.rotateZ(-Math.PI / 6); baug.scale(1.6, 1, 1); baug.translate(L / 2 - 15 + B * .4 - 6, 0, 2.5); legg(d, baug, MØRK);
    boks(d, 0, 0, 11, L - 34, B - 2, .5, DEKK);
    for (let i = 0; i < 5; i++) boks(d, -50 + i * 26, (i % 2 ? 5 : -5), 11.5, 20, 22, 8 + (i % 3) * 3, MODUL);
    boks(d, -L / 2 + 30, 0, 11.5, 16, 30, 22, HVIT); søyle(d, -L / 2 + 16, 0, 33.5, 11, 11, .6, GRØNN, 8);
    // dreieskive (turret) og fakkeltårn i baugen
    søyle(d, L / 2 - 46, 0, 11.5, 8, 8, 14, STÅL, 10); søyle(d, L / 2 - 30, 8, 11.5, 2.5, .8, 60, STÅL, 4);
    const fl = new THREE.ConeGeometry(1.8, 6, 6); fl.rotateX(Math.PI / 2); fl.translate(L / 2 - 30, 8, 74); legg(d, fl, FLAMME);
    return d;
  }
  function bygg(u, R) {
    if (mesh) { R.scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); mesh = null; } antall = 0; liste = [];
    if (!u.infra || !window.MODELLER) return;
    const alle = [], z0 = (0 - u.h0) * R.EX;
    for (const o of u.infra) { if (o.lag !== 'olje') continue; const ut = utstyr(o.e); if (!ut) continue;
      const X = o.deler[0][0], Y = o.deler[0][1], x = X - u.cx, y = Y - u.cy; if (Math.abs(x) > u.S - 30 || Math.abs(y) > u.S - 30) continue;
      // bare på sjøen (anlegg på land er vanlige bygg); fast retning per innretning
      if (hoyde3d(X, Y, u) > 1) continue;
      const v = ((o.e.id * 2654435761 >>> 0) / 4294967296) * 6.283;
      for (const g of ut.skip ? skip() : plattform(ut)) { g.rotateZ(v); g.translate(x, y, z0); alle.push(g); }
      liste.push({ navn: o.e.navn, x, y, z: z0, skip: ut.skip }); antall++; }
    if (!alle.length) return;
    mesh = new THREE.Mesh(MODELLER.samle(alle), new THREE.MeshLambertMaterial({ vertexColors: true })); mesh.name = 'oljeplattformer'; R.scene.add(mesh);
    for (const g of alle) g.dispose();
  }
  KROKER.sett3d.push((u, R) => { if (VIS.infra) bygg(u, R); else if (mesh) { R.scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); mesh = null; antall = 0; liste = []; } });
  rot.Olje3d = { utstyr, sjekk: () => ({ antall, liste, trekanter: mesh ? mesh.geometry.attributes.position.count / 3 : 0, iScene: !!(mesh && R3.scene.children.includes(mesh)) }) };
})(typeof window !== 'undefined' ? window : globalThis);
