// FJERNKARTET I 3D (runde 14, kritiker I og J: «mellom utsnittene står det en tom, grønn flate» og «en grå tomhet med en knivskarp
// terrengkant i ca. 30 s» når du flyr). Ringen i spill/fjern3d.js har bare én farge per arealklasse (skog = mørkegrønt), og den hører
// til utsnittet som vises – flyr du ut av utsnittet, ser du en ensfarget flate. Her ligger i tillegg et grovt terreng MED KARTBILDE
// (65 × 65 punkter, kartbilde 1024 punkter) over ringen, rundt midten av bildet, som dekker et mye større område enn utsnittet. Det bygges på et par sekunder (få fliser), og bygges på nytt når du har flydd langt. Der det
// detaljerte utsnittet ligger, tegnes det ikke (skyggeleggeren hopper over punktene), så det synes bare utenfor kanten – ingen tom flate
// og ingen knivskarp kant mens det nye utsnittet bygges. Mens et nytt utsnitt bygges og du ser utenfor det gamle, står «Laster
// landskapet …» midt på skjermen.
// Reglene (tallene) er Claudes forslag. Ingen nye lys; ett nett og én tekstur som frigjøres når de byttes ut.
(function () {
  'use strict';
  const REGLER = {
    // halve sida på fjernterrenget: faktor × utsnittets S, mellom min og maks meter
    faktor: 3, min: 5000, maks: 20000,
    // bygges på nytt når midten av bildet er så langt (andel av halve sida) fra midten av fjernterrenget
    flytt: .35,
    // punkter langs hver side, kartbildets størrelse (punkter), senket under det detaljerte (m) og bredden på overlappen (ruter)
    N: 65, TW: 1024, senk: .6, overlapp: 1.5,
    // «Laster …» når midten av bildet er lenger ut enn denne andelen av det gamle utsnittets S
    laster: .55,
  };
  const F = { mesh: null, tex: null, bygger: false, cx: 0, cy: 0, S: 0, uInn: null, feil: 0, feilVed: 0 };
  const harAlt = () => typeof R3 !== 'undefined' && R3 && R3.ut && typeof THREE !== 'undefined';

  async function bygg(cx, cy, S) {
    const N = REGLER.N, TW = REGLER.TW, steg = 2 * S / (N - 1), b = [cx - S, cy - S, cx + S, cy + S];
    // høydene: grove (32–128 m) – få fliser
    const zH = Math.max(6, Math.min(9, Math.floor(Math.log2(G.res0 / steg))));
    const høyder = lagVindu(b, false, zH, true);
    // kartbildet: som i bygg3d, men grovt
    const mpp = 2 * S / TW, zt = Math.max(ZMIN, Math.min(13, Math.floor(Math.log2(G.res0 / mpp) + .3)));
    const c = document.createElement('canvas'); c.width = c.height = TW; const g = c.getContext('2d'); g.fillStyle = HAV_CSS; g.fillRect(0, 0, TW, TW);
    // (prøvd: å lage alle flisene på nytt tok 20–30 s på en treg maskin) – først de flisene 2D-kartet alt har laget (FERDIG, grove før
    // fine), straks; de som mangler på nivå zt lages etterpå i bakgrunnen og tegnes inn i bildet etter hvert (etterFyll)
    const tegnFlis = (z, x, y, t) => { const sp = span(z); g.drawImage(t.c, (G.x0 + x * sp - (cx - S)) / mpp, ((cy + S) - (G.y0 - y * sp)) / mpp, sp / mpp + .5, sp / mpp + .5); };
    const mangler = [];
    for (let z = Math.max(ZMIN, zt - 4); z <= Math.min(ZMAX, zt + 3); z++) { const [x0, y0, x1, y1] = flisområde(b, z), [ax, ay, bx, by] = flisområde(OMRÅDE, z);
      for (let y = Math.max(y0, ay); y <= Math.min(y1, by); y++) for (let x = Math.max(x0, ax); x <= Math.min(x1, bx); x++) {
        const t = typeof FERDIG !== 'undefined' ? FERDIG.get(z + '/' + x + '/' + y) : null; if (t && t.c) tegnFlis(z, x, y, t); else if (z === zt) mangler.push([x, y]); } }
    const valg = { ...VIS, skygge: false, koter: false, traer: false, asfalt: true };
    // samme naturfarger som det detaljerte kartbildet (ellers skiller fargene seg ved kanten)
    if (typeof naturfarger === 'function') { const im = g.getImageData(0, 0, TW, TW); naturfarger(im.data, TW); g.putImageData(im, 0, 0); }
    const v = await høyder, H = new Float32Array(N * N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const h = bilin(v, cx - S + i * steg, cy + S - j * steg); H[j * N + i] = h === h ? h : 0; }
    relieff(g, H, N, steg, TW);
    return { cx, cy, S, N, H, c, etter: { zt, mangler, valg, tegnFlis, mpp } };
  }

  // relieff: lier mot nordvest lysere, mot sørøst mørkere (fra høydene, strukket over bildet) – så et grovt eller ensfarget kartbilde
  // (bare grove 2D-fliser) ikke blir en flat flate. Claudes forslag: styrke ±35 %.
  function relieff(g, H, N, steg, TW) {
    const c = document.createElement('canvas'); c.width = c.height = N; const cg = c.getContext('2d'), im = cg.createImageData(N, N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const h = (a, b) => H[Math.max(0, Math.min(N - 1, b)) * N + Math.max(0, Math.min(N - 1, a))];
      const dx = (h(i + 1, j) - h(i - 1, j)) / (2 * steg), dy = (h(i, j - 1) - h(i, j + 1)) / (2 * steg), l = Math.max(-1, Math.min(1, (-dx + dy) * 2.2)), q = (j * N + i) * 4;
      const v = 128 + l * 128 * .35; im.data[q] = im.data[q + 1] = im.data[q + 2] = v; im.data[q + 3] = 255; }
    cg.putImageData(im, 0, 0); g.save(); g.globalCompositeOperation = 'overlay'; g.imageSmoothingEnabled = true; g.drawImage(c, 0, 0, TW, TW); g.restore();
  }
  function sett(d) {
    const R = R3, geo = new THREE.PlaneGeometry(2 * d.S, 2 * d.S, d.N - 1, d.N - 1), pos = geo.attributes.position;
    // PlaneGeometry: rad for rad ovenfra (y = +S først), venstre til høyre – samme rekkefølge som H
    for (let k = 0; k < pos.count; k++) pos.setZ(k, d.H[k] - REGLER.senk);
    geo.computeVertexNormals();
    const tex = new THREE.CanvasTexture(d.c); tex.anisotropy = Math.min(4, R.renderer.capabilities.getMaxAnisotropy());
    // over ringen i fjern3d.js (den ligger 1,5 m lavere og har bare arealfarger)
    const mat = new THREE.MeshLambertMaterial({ map: tex, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
    const uInn = { value: new THREE.Vector3(0, 0, -1) };
    mat.onBeforeCompile = sh => {
      sh.uniforms.uInn = uInn;
      sh.vertexShader = 'varying vec2 vFjernW;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vFjernW = (modelMatrix * vec4(transformed, 1.0)).xy;');
      // skog sett ovenfra: grønne punkter får mørke prikker (kroner og skygger) (runde kroner i ruter på 7 m, flekker på 23 m), så skogen ikke er en flat
      // grønn flate (det detaljerte utsnittet har ekte trær) – Claudes forslag (styrke 0,3 og 0,15)
      sh.fragmentShader = 'uniform vec3 uInn;\nvarying vec2 vFjernW;\nfloat fjHash(vec2 p) { return fract(sin(dot(floor(p), vec2(12.9898, 78.233))) * 43758.5453); }\n' + sh.fragmentShader
        .replace('void main() {', 'void main() {\n  if (max(abs(vFjernW.x - uInn.x), abs(vFjernW.y - uInn.y)) < uInn.z) discard;')
        .replace('#include <map_fragment>', `#include <map_fragment>
  float fjGr = clamp((diffuseColor.g - max(diffuseColor.r, diffuseColor.b)) * 9.0, 0.0, 1.0);
  vec2 fjC = vFjernW / 7.0, fjF = fract(fjC) - 0.5 - (vec2(fjHash(fjC), fjHash(fjC + 3.1)) - 0.5) * 0.45;
  float fjKrone = (1.0 - smoothstep(0.22, 0.42, length(fjF))) * step(0.3, fjHash(fjC + 9.0));
  diffuseColor.rgb *= 1.0 - fjGr * (0.32 * fjKrone + 0.12 * step(0.6, fjHash(vFjernW / 23.0 + 7.0)));`);
    };
    mat.customProgramCacheKey = () => 'fjernkart-3';
    const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 1; mesh.name = 'fjernkart';
    kast(); R.scene.add(mesh); F.mesh = mesh; F.tex = tex; F.uInn = uInn; F.cx = d.cx; F.cy = d.cy; F.S = d.S; F.nr = (F.nr || 0) + 1; plasser(R);
    etterFyll(d, F.nr);
  }
  // flisene som manglet, tre om gangen (byggingen av det detaljerte utsnittet har forrang: venter mens R3.bygger)
  async function etterFyll(d, nr) {
    const E = d.etter, kø = E.mangler.slice(); let n = 0;
    // de nærmest midten først
    const m = [(d.cx - G.x0) / span(E.zt), (G.y0 - d.cy) / span(E.zt)]; kø.sort((a, b) => Math.hypot(a[0] - m[0], a[1] - m[1]) - Math.hypot(b[0] - m[0], b[1] - m[1]));
    await Promise.all([0, 1, 2].map(async () => { for (let q; (q = kø.shift());) {
      // (mens du ser utenfor det gamle utsnittet, er fjernkartet det du ser – da venter det ikke)
      while (typeof R3 !== 'undefined' && R3 && R3.bygger && F.nr === nr && !lasterNå(R3)) await new Promise(r => setTimeout(r, 400));
      if (F.nr !== nr || !F.tex) return; let t; try { t = await lagFlis(E.zt, q[0], q[1], E.valg); } catch (e) { continue; }
      if (F.nr !== nr || !F.tex || !t || !t.c) return;
      const g = d.c.getContext('2d'), sp = span(E.zt), X = (G.x0 + q[0] * sp - (d.cx - d.S)) / E.mpp, Y = ((d.cy + d.S) - (G.y0 - q[1] * sp)) / E.mpp, W = sp / E.mpp + .5;
      g.drawImage(t.c, X, Y, W, W);
      if (typeof naturfarger === 'function') { const x0 = Math.max(0, Math.floor(X)), y0 = Math.max(0, Math.floor(Y)), w = Math.min(d.c.width - x0, Math.ceil(W) + 1), h = Math.min(d.c.height - y0, Math.ceil(W) + 1);
        if (w > 0 && h > 0) { const im = g.getImageData(x0, y0, w, h); naturfarger(im.data, w, 0, h); g.putImageData(im, x0, y0); } }
      if (++n % 3 === 0 || !kø.length) F.tex.needsUpdate = true; } }));
    if (F.nr === nr && F.tex) F.tex.needsUpdate = true;
  }
  function kast() {
    if (!F.mesh) return; const R = R3; if (R && R.scene) R.scene.remove(F.mesh);
    F.mesh.geometry.dispose(); F.mesh.material.dispose(); if (F.tex) F.tex.dispose(); F.mesh = null; F.tex = null; F.uInn = null;
  }
  // nettet ligger i scenens meter (det detaljerte utsnittet har midten i 0, 0 og høyden u.h0 i 0)
  function plasser(R) {
    const u = R.ut; if (!F.mesh || !u) return;
    F.mesh.position.set(F.cx - u.cx, F.cy - u.cy, -u.h0 * R.EX); F.mesh.scale.set(1, 1, R.EX);
    F.uInn.value.set(0, 0, u.S - REGLER.overlapp * u.steg);
  }
  // (runde 15) flyr eller kjører du, legges midten der du er når neste utsnitt er ferdig (Forut3d.ledd), så fjernkartet foran deg er klart
  function midten(R) { const u = R.ut, b = R.bane, l = R.forut && window.Forut3d ? Forut3d.ledd(R.forut, u.S) : [0, 0]; return [u.cx + b.x + l[0], u.cy + b.y + l[1]]; }
  // (runde 15) til fots er fjernkartet skjult (du ser ikke så langt), men ikke når du kjører – da kan du komme til kanten av utsnittet
  const tilFots = R => !!R.fot && !(window.KjorSpill && KjorSpill.fører && KjorSpill.fører());
  function ønsketS(R) { return Math.max(REGLER.min, Math.min(REGLER.maks, REGLER.faktor * utsnittS(R.bane.avst))); }

  function ramme(R) {
    if (!harAlt() || !på3d) return;
    if (F.mesh) { F.mesh.visible = !tilFots(R); plasser(R); }
    if (tilFots(R) || F.bygger) return;
    if (F.feil && performance.now() - F.feilVed < Math.min(60000, 4000 * 2 ** F.feil)) return;
    const [X, Y] = midten(R), S = ønsketS(R);
    const trengs = !F.mesh || Math.hypot(X - F.cx, Y - F.cy) > F.S * REGLER.flytt || S > F.S * 1.3 || S < F.S * .5;
    if (!trengs) return;
    F.bygger = true;
    bygg(Math.round(X), Math.round(Y), S).then(d => { F.feil = 0; if (harAlt() && på3d) sett(d); })
      .catch(e => { F.feil++; F.feilVed = performance.now(); console.warn('fjernkart:', e && e.message || e); })
      .finally(() => { F.bygger = false; });
  }
  // «Laster landskapet …» midt på skjermen: et nytt utsnitt bygges og du ser utenfor det gamle (eller har zoomet langt ut)
  function lasterNå(R) {
    const u = R.ut; if (!u || R.fot || !R.bygger) return false; const b = R.bane;
    return Math.max(Math.abs(b.x), Math.abs(b.y)) > u.S * REGLER.laster || utsnittS(b.avst) > u.S * 1.6 || (typeof manglerHusNå === 'function' && manglerHusNå());
  }
  function tegn(g) {
    if (!harAlt() || !lasterNå(R3)) return;
    const t = 'Laster landskapet …'; g.save(); g.font = '600 15px "Cormorant Garamond",serif'; const w = g.measureText(t).width + 28, x = VW / 2, y = VH / 2;
    g.fillStyle = 'rgba(20,16,10,.66)'; g.strokeStyle = 'rgba(214,190,130,.6)'; g.lineWidth = 1; g.beginPath(); g.rect(x - w / 2, y - 15, w, 30); g.fill(); g.stroke();
    g.fillStyle = '#eadfc4'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, x, y + 1); g.restore();
  }
  if (typeof KROKER !== 'undefined') { KROKER.ramme3d.push(ramme); KROKER.tegn3d.push(tegn); }
  window.Fjernkart3d = { REGLER, tilstand: () => ({ har: !!F.mesh, bygger: F.bygger, cx: F.cx, cy: F.cy, S: F.S, synlig: !!(F.mesh && F.mesh.visible) }), laster: () => harAlt() && lasterNå(R3), kast, midten };
})();
