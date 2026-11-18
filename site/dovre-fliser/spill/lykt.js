/* Riksbrudd – LOMMELYKTA (18. nov kveld, runde 5: «forbedre enda mer» – lommelykta fra husene skal virke).
 * Reglene øverst uten DOM (Node: require('./lykt'); nettleser: globalThis.Lykt), visningen (LyktSpill) nederst. Test: pipeline/fliser/test_lykt.js.
 *  Har du en lommelykt i sekken (lommene/beltet), slår L (PC) eller knappen «Lykt» (raden til venstre når du går) den av og på.
 *  BATTERIENE: et sett varer REGLER.timer spilltimer med lykta på. «Bytt batterier» (lutpanelet eller sekken) bruker én pakke batterier.
 *  OM NATTA (NATT.mørke i 3D, ellers krigens natt etter klokka): du ser lenger (karakterlaget: KROKER.sikt), og bakken foran deg lyses
 *   opp i 3D – en lyskjegle lagt på bakken/gulvet (to flate nett: ett som legger til lys, ett som ganger opp det som er der; samme
 *   blanding som lysflekkene under gatelysene i spill/natt3d.js). Ingen nye lys i scenen. MEN fiendene ser deg lettere: lykta tar bort
 *   mørkets vern og gjør deg synlig lenger unna (Eventyr-snikingen i spill/eventyr-visning.js ganger med LyktSpill.røper()).
 * Lagres per leir i «riksbrudd-lykt». Alle tallene er Claudes forslag.
 */
(function (rot) {
  'use strict';
  // Claudes forslag, alle sammen
  const REGLER = {
    timer: 8,          // spilltimer lys per sett batterier
    sikt: .45,         // om natta ser karakterlaget opptil 45 % lenger med lykta på
    røper: .9,         // om natta ser fiendene deg opptil 90 % lenger unna (og mørket skjuler deg ikke)
    lengde: 22,        // m lyskjegle på bakken
    bredde: 9,         // m bred der den er bredest
    lav: .15,          // under denne andelen batteri blinker lyset svakere
  };
  const klem = (v, a, b) => Math.max(a, Math.min(b, v));
  // batteriet etter dt spillminutter med lykta på (0–1)
  const tøm = (b, dt) => klem(b - dt / (REGLER.timer * 60), 0, 1);
  // lysstyrken (0–1) etter batteriet: svakere den siste biten
  const styrke = b => (b <= 0 ? 0 : b >= REGLER.lav ? 1 : .45 + .55 * b / REGLER.lav);
  // faktor på karakterlagets sikt og på hvor langt unna fiendene ser deg, etter mørket (0–1) og lysstyrken
  const sikt = (mørke, s) => 1 + REGLER.sikt * klem(mørke, 0, 1) * s;
  const røper = (mørke, s) => 1 + REGLER.røper * klem(mørke, 0, 1) * s;
  // timer igjen
  const igjen = b => b * REGLER.timer;
  const api = { REGLER, tøm, styrke, sikt, røper, igjen };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  rot.Lykt = api;

  // ---------- visningen ----------
  if (typeof document === 'undefined') return;
  const NØKKEL = 'riksbrudd-lykt', r3 = () => (typeof R3 !== 'undefined' ? R3 : null);
  let S = { på: false, batteri: 1 }, leirId = '', klar = false, sistLagret = 0;
  const lagre = () => { sistLagret = performance.now(); try { localStorage.setItem(NØKKEL, JSON.stringify({ leir: leirId, ...S })); } catch (e) { /* fullt eller sperret */ } };
  function start() { const O = rot.OppstartSpill && OppstartSpill.tilstand(); if (!O || !O.leir) return; leirId = Math.round(O.leir.x) + ',' + Math.round(O.leir.y);
    let d = null; try { d = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); } catch (e) { d = null; }
    S = d && d.leir === leirId ? { på: !!d.på, batteri: klem(+d.batteri || 0, 0, 1) } : { på: false, batteri: 1 }; klar = true; }
  rot.addEventListener('riksbrudd-spill', () => setTimeout(start, 0));
  const ting = () => (rot.UtstyrSpill && UtstyrSpill.klar && UtstyrSpill.klar() ? UtstyrSpill.tilstand().ting : null);
  const har = () => { const t = ting(); return !!(t && t.lommelykt > 0); };
  const går = () => { const Q = r3(); return !!(Q && Q.fot && typeof på3d !== 'undefined' && på3d); };
  const mørke = () => (rot.NATT && isFinite(NATT.mørke) && typeof på3d !== 'undefined' && på3d ? NATT.mørke : rot.Krig && Krig.natt && Krig.klokkeTime && typeof tid !== 'undefined' ? Krig.natt(Krig.klokkeTime(tid)) || 0 : 0);
  const lyser = () => klar && S.på && S.batteri > 0 && har();
  const s = () => (lyser() ? styrke(S.batteri) : 0);
  function slå(v) {
    if (!klar) return false; if (!har()) { logg('Du har ingen lommelykt. Lommelykter finner du i nattbord, skap og verktøybenker.'); return false; }
    const ny = v === undefined ? !S.på : !!v; if (ny && S.batteri <= 0) { logg('Batteriene i lykta er tomme. Bytt batterier (lutpanelet eller sekken).'); S.på = false; return false; }
    S.på = ny; lagre(); logg(ny ? `Lommelykta er på (${tall(igjen(S.batteri))} timer igjen på batteriene).` : 'Lommelykta er av.'); return S.på;
  }
  const tall = v => String(Math.round(v * 10) / 10).replace('.', ',');
  // nye batterier: én pakke fra sekken
  function bytt() { const t = ting(); if (!t || !(t.batterier > 0)) { logg('Du har ingen batterier.'); return false; } if (S.batteri >= .999) { logg('Batteriene i lykta er nye.'); return false; }
    t.batterier--; if (!t.batterier) delete t.batterier; S.batteri = 1; lagre(); if (rot.UtstyrSpill) { UtstyrSpill.lagre(); UtstyrSpill.vis(); } logg(`Nye batterier i lykta (${REGLER.timer} timer).`); return true; }
  // batteriet tømmes med spilltiden mens lykta er på (KROKER.sim: dt i spillminutter)
  KROKER.sim.push(dt => { if (!lyser() || !(dt > 0)) return; const før = S.batteri; S.batteri = tøm(S.batteri, dt);
    if (S.batteri <= 0) { S.på = false; lagre(); logg('Batteriene i lommelykta er tomme.'); } else if (før >= REGLER.lav && S.batteri < REGLER.lav) logg('Lommelykta blir svakere – batteriene er snart tomme.');
    if (performance.now() - sistLagret > 10000) lagre(); });
  // om natta ser du lenger med lykta (bare karakterlaget)
  KROKER.sikt.push(lag => (lag && lag.karakter && lyser() ? sikt(mørke(), s()) : 1));
  // L slår av og på mens du går (før hurtigtasten L for Leiren); ikke når du ikke har noen lykt
  rot.addEventListener('keydown', e => { if (!klar || !går() || e.repeat || e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '')) return;
    if ((e.key === 'l' || e.key === 'L') && har()) { e.preventDefault(); e.stopImmediatePropagation(); slå(); } }, true);
  // raden til venstre når du går (spill/eventyr-visning.js spør her)
  function rad() { if (!klar || !har()) return []; const pc = typeof VW !== 'undefined' ? VW >= 900 : true, b = Math.round(S.batteri * 100);
    const d = [['knapp', `${S.på ? 'Lykt av' : 'Lykt på'}${pc ? ' (L)' : ''} · ${b} %`, 'lykt', S.på ? '' : mørke() > .4 ? 'viktig' : '']];
    if (S.batteri < .5 && (ting().batterier || 0) > 0) d.push(['knapp', 'Bytt batterier', 'lyktbatteri', S.batteri <= 0 ? 'viktig' : '']); return d; }

  // ---------- 3D: lyskjeglen på bakken ----------
  // To nett med samme flate (seks biter langs strålen, så den følger bakken): ett adderer et varmt lys, ett ganger opp det som er der.
  let kjegle = null, kjegleTex = null;
  function tekstur() { const W = 64, H = 128, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), im = g.createImageData(W, H);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const t = j / (H - 1), u = (i + .5) / W * 2 - 1, br = .18 + .82 * Math.sqrt(t), kant = 1 - Math.min(1, Math.abs(u) / br), lang = Math.pow(1 - t, .7) * Math.min(1, t * 7 + .25);
      const v = Math.max(0, Math.pow(kant, 1.4) * lang), k = (j * W + i) * 4; im.data[k] = 255 * v; im.data[k + 1] = 236 * v; im.data[k + 2] = 196 * v; im.data[k + 3] = 255; }
    g.putImageData(im, 0, 0); const T = new THREE.CanvasTexture(c); T.flipY = false; T.wrapS = T.wrapT = THREE.ClampToEdgeWrapping; return T; }
  const BITER = 6;
  function lag(R) {
    if (!kjegleTex) kjegleTex = tekstur();
    const geo = new THREE.BufferGeometry(), pos = new Float32Array(BITER * 6 * 3), uv = new Float32Array(BITER * 6 * 2);
    for (let q = 0; q < BITER; q++) { const v0 = q / BITER, v1 = (q + 1) / BITER; [[0, v0], [1, v0], [1, v1], [0, v0], [1, v1], [0, v1]].forEach(([a, b], k) => uv.set([a, b], (q * 6 + k) * 2)); }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    const felles = { map: kjegleTex, transparent: true, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -7, polygonOffsetUnits: -7 };
    const leggTil = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ ...felles, blending: THREE.AdditiveBlending, opacity: .5 }));
    const gang = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ ...felles, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.DstColorFactor, blendDst: THREE.OneFactor }));
    for (const m of [leggTil, gang]) { m.frustumCulled = false; m.renderOrder = 2; m.userData.lykt = true; }
    kjegle = { geo, leggTil, gang, scene: null };
  }
  function fjern() { if (!kjegle) return; for (const m of [kjegle.leggTil, kjegle.gang]) { if (m.parent) m.parent.remove(m); m.material.dispose(); } kjegle.geo.dispose(); kjegle = null; }
  KROKER.ramme3d.push(R => {
    const m = mørke(), st = s(), vis = !!(R.fot && R.ut && st > 0 && m > .05 && !(rot.KjorSpill && KjorSpill.fører && KjorSpill.fører()));
    if (!vis) { if (kjegle) { kjegle.leggTil.visible = kjegle.gang.visible = false; } return; }
    if (!kjegle) lag(R); if (kjegle.scene !== R.scene) { for (const q of [kjegle.leggTil, kjegle.gang]) R.scene.add(q); kjegle.scene = R.scene; }
    const u = R.ut, x = R.bane.x, y = R.bane.y, a = R.fot.a || 0, fx = -Math.sin(a), fy = Math.cos(a), sx = Math.cos(a), sy = Math.sin(a);
    // lengden etter hvor langt ned du ser (ser du rett ned, er kjeglen kort), og kortere inne
    const inne = rot.Interior3d && Interior3d.inne(x, y), L = REGLER.lengde * (inne ? .45 : 1) * klem(1.2 + (R.fot.pitch || 0) * 1.4, .35, 1), B = REGLER.bredde * (inne ? .5 : 1);
    const terr = (px, py) => (hoyde3d(u.cx + px, u.cy + py, u) - u.h0) * R.EX, høyde = (px, py) => { const g = rot.Interior3d ? Interior3d.høyde(px, py, terr) : null; return (g === null ? terr(px, py) : g) + .06; };
    const P = kjegle.geo.attributes.position, A = P.array, pkt = (t, side) => { const d = .4 + t * L, w = (.18 + .82 * Math.sqrt(t)) * B / 2 * side, px = x + fx * d + sx * w, py = y + fy * d + sy * w; return [px, py, høyde(px, py)]; };
    for (let q = 0; q < BITER; q++) { const v0 = q / BITER, v1 = (q + 1) / BITER, a0 = pkt(v0, -1), b0 = pkt(v0, 1), b1 = pkt(v1, 1), a1 = pkt(v1, -1); [a0, b0, b1, a0, b1, a1].forEach((p, k) => A.set(p, (q * 6 + k) * 3)); }
    P.needsUpdate = true; kjegle.geo.computeBoundingSphere();
    const k = Math.min(1, m * 1.3) * st; kjegle.leggTil.material.opacity = .42 * k; kjegle.gang.material.color.setScalar(1.6 * k); kjegle.leggTil.visible = kjegle.gang.visible = true;
  });
  rot.addEventListener('pagehide', () => { if (klar) lagre(); });

  rot.LyktSpill = { start, slå, bytt, rad, har, lyser, på: () => lyser(), S: () => S, styrke: s, mørke, fjern, kjegle: () => kjegle,
    // hvor mye lenger unna fiendene ser deg (spill/eventyr-visning.js), og om mørket skjuler deg
    røper: () => (lyser() ? røper(mørke(), s()) : 1), settS: d => { S = { ...S, ...d }; lagre(); } };
})(typeof globalThis !== 'undefined' ? globalThis : this);
