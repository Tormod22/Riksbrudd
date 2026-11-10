'use strict';
// Tunnelportaler i 3D (12. nov, brukeren: «legg til flere detaljer i hele Norge»): i hver ende av hver tunnel (INFRA.tunnel, NVDB) står
// en portal i betong – en vegg på tvers av tunnelen med en mørk, buet åpning og en kort betongkappe (halvt rør) som stikker ut av fjellet.
// Retningen er fra portalen inn mot neste punkt i tunnelen. Ett samlet nett med hjørnefarger for hele utsnittet (få tegnekall).
// Kroker: KROKER.sett3d. window.Portal3d.sjekk() for testene.
(function () {
  let mesh = null, antall = 0, portaler = [];
  const BETONG = [.62, .61, .58], MØRK = [.04, .04, .05], KANT = [.5, .49, .46];
  function legg(deler, geo, farge) {
    const g = geo.index ? geo.toNonIndexed() : geo, p = g.attributes.position, k = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) k.set(farge, i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(k, 3)); deler.push(g);
  }
  // én portal i lokale koordinater: x = ut av tunnelen, y = på tvers, z = opp; foten i 0
  function portalGeo(B) {
    const d = [], r = B / 2;
    // veggen (litt bredere og høyere enn åpningen), skrått satt litt inn i fjellet
    const vegg = new THREE.BoxGeometry(1.2, B + 5, r + 4.5); vegg.translate(-.6, 0, (r + 4.5) / 2); legg(d, vegg, BETONG);
    // gesims øverst
    const ges = new THREE.BoxGeometry(1.6, B + 5.6, .5); ges.translate(-.6, 0, r + 4.5); legg(d, ges, KANT);
    // kappen: halvt rør (betong ute, mørk inni) som stikker 5 m ut, pluss rette vegger under halvsirkelen
    const L = 5, h = 1.8;
    const ute = new THREE.CylinderGeometry(r + .5, r + .5, L, 14, 1, true, 0, Math.PI); ute.rotateZ(Math.PI / 2); ute.rotateX(Math.PI / 2); ute.translate(L / 2, 0, h); legg(d, ute, BETONG);
    const inne = new THREE.CylinderGeometry(r, r, L + .05, 14, 1, true, 0, Math.PI); inne.rotateZ(Math.PI / 2); inne.rotateX(Math.PI / 2); inne.scale(1, 1, 1); inne.translate(L / 2, 0, h);
    // vend normalene inn (vi ser innsiden)
    const ip = inne.index ? inne.toNonIndexed() : inne; const a = ip.attributes.position.array; for (let i = 0; i < a.length; i += 9) for (let c = 0; c < 3; c++) { const t = a[i + 3 + c]; a[i + 3 + c] = a[i + 6 + c]; a[i + 6 + c] = t; }
    ip.computeVertexNormals(); legg(d, ip, MØRK);
    for (const s of [-1, 1]) { const v = new THREE.BoxGeometry(L, .5, h); v.translate(L / 2, s * (r + .25), h / 2); legg(d, v, BETONG); }
    // mørk åpning i veggen (rektangel + halvsirkel), like foran veggen
    const hull = new THREE.BoxGeometry(.1, B, h); hull.translate(.05, 0, h / 2); legg(d, hull, MØRK);
    const bue = new THREE.CircleGeometry(r, 14, 0, Math.PI); bue.rotateY(Math.PI / 2); bue.rotateX(Math.PI / 2); bue.translate(.06, 0, h); legg(d, bue, MØRK);
    return d;
  }
  function bygg(u, R) {
    if (mesh) { R.scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); mesh = null; } antall = 0; portaler = [];
    if (!u.infra || !window.MODELLER) return;
    const alle = [];
    for (const o of u.infra) { if (o.lag !== 'tunnel') continue; const B = o.e && o.e.type === 1 ? 4 : 9;   // gang- og sykkeltunnel smalere
      for (const a of o.deler) { const n = a.length; if (n < 4) continue;
        for (const [i, j] of [[0, 2], [n - 2, n - 4]]) {
          const X = a[i], Y = a[i + 1], x = X - u.cx, y = Y - u.cy; if (Math.abs(x) > u.S - 20 || Math.abs(y) > u.S - 20) continue;
          // retningen ut av tunnelen er bort fra neste punkt
          const v = Math.atan2(Y - a[j + 1], X - a[j]), z = (hoyde3d(X, Y, u) - u.h0) * R.EX;
          for (const g of portalGeo(B)) { g.rotateZ(v); g.translate(x, y, z - .3); alle.push(g); }
          portaler.push({ x, y, z, v }); antall++; } } }
    if (!alle.length) return;
    mesh = new THREE.Mesh(MODELLER.samle(alle), new THREE.MeshLambertMaterial({ vertexColors: true })); mesh.name = 'tunnelportaler'; R.scene.add(mesh);
    for (const g of alle) g.dispose();
  }
  KROKER.sett3d.push((u, R) => { if (VIS.infra) bygg(u, R); });
  window.Portal3d = { sjekk: () => ({ antall, iScene: !!(mesh && R3.scene.children.includes(mesh)), portaler }) };
})();
