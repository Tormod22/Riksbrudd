'use strict';
// 3D-modeller bygget i koden av enkle former (ingen modellfiler, ingen nedlastinger). Lista: docs/3d-modeller.md,
// oppskriften: docs/modeller-oppskrift.md. Første omgang: leiren (nr. 1–13).
//
// Bruk: window.MODELLER.brakke() gir én THREE.BufferGeometry med attributtene position, normal og color (vertex-farger 0–1).
// Alle modellene kan tegnes med samme materiale: MODELLER.materiale() (MeshLambertMaterial med vertexColors).
// Mål i meter. z peker opp, x er «framover» (inngangen/fronten vender mot +x), origo midt på bunnen (z = 0 = bakken).
// THREE finnes først når 3D er slått på: ingenting lages når fila lastes, all geometri lages inne i funksjonene.
// MODELLER.LISTE har alle modellene (med varianter) med nummeret i docs/3d-modeller.md – testsiden modeller-visning.html bruker den.
//
// Merk: samle() i index.html tar bare med position og normal (ikke farger). Derfor har denne fila sin egen samle (MODELLER.samle),
// som også tar med color, og som mørkner punktene nær bakken litt (enkel «skygge i krokene», gjør modellene mindre flate).
(function () {
  const M = window.MODELLER = window.MODELLER || {};

  // Farger: realistisk og dempet (rødmalt tre, hvit kledning, svart tak, grå betong, militærgrønt)
  const F = {
    betong: '#8f8d87', betongM: '#6c6b66', asfalt: '#3c3d3e', grus: '#7f786b', sand: '#a8946f', jord: '#5d5040',
    hvit: '#e4e1d8', hvitM: '#cfcbc0', svart: '#2a2c2e', blikk: '#7b8083', blikkM: '#565a5d', stål: '#9ba1a4', stålM: '#5e6366',
    oliven: '#4d5540', olivenM: '#3a4030', olivenL: '#646c50', presenning: '#59604a', tre: '#6e5b45', treM: '#4f4132', treL: '#8a7457',
    rød: '#7d2f25', rødL: '#b3241f', kors: '#b5191c', gul: '#c9a227', oransje: '#cf5f1f', glass: '#1f2b33', glassL: '#33454f',
    gummi: '#1c1c1d', lys: '#f1e6b8', gull: '#b89a4a', blå: '#3d5868', rust: '#7a3c24',
  };
  function rgb(f) {
    if (Array.isArray(f)) return f;
    const n = parseInt(f.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }
  // Lysere (k > 1) eller mørkere (k < 1) farge
  function tone(f, k) { const c = rgb(f); return [Math.min(1, c[0] * k), Math.min(1, c[1] * k), Math.min(1, c[2] * k)]; }

  // Gjør geometrien uindeksert, fjerner uv og fargelegger alle punktene
  function farg(g, f) {
    if (g.index) g = g.toNonIndexed();
    g.deleteAttribute('uv'); g.deleteAttribute('uv2');
    if (!g.attributes.normal) g.computeVertexNormals();
    const c = rgb(f), n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c[0]; a[i * 3 + 1] = c[1]; a[i * 3 + 2] = c[2]; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g;
  }

  // Slår sammen en liste med geometrier til én (position, normal, color). skygge: mørkner punktene nær bakken (0 = av).
  function samle(liste, skygge) {
    const ut = liste.flat(Infinity).filter(Boolean).map(g => (g.index ? g.toNonIndexed() : g));
    const n = ut.reduce((a, g) => a + g.attributes.position.count, 0);
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
    for (const g of ut) {
      pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
      if (g.attributes.color) col.set(g.attributes.color.array, o * 3); else col.fill(.6, o * 3, (o + g.attributes.position.count) * 3);
      o += g.attributes.position.count;
    }
    if (skygge) for (let i = 0; i < n; i++) {
      const k = 1 - skygge * Math.max(0, 1 - pos[i * 3 + 2] / 2.2);
      col[i * 3] *= k; col[i * 3 + 1] *= k; col[i * 3 + 2] *= k;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeBoundingBox(); g.computeBoundingSphere(); return g;
  }
  // Ferdig modell: samler delene og legger på bakkeskyggen
  const ferdig = d => samle(d, .22);

  // ---------- Hjelpere (alle returnerer en fargelagt geometri) ----------
  // Boks med bunnen på z, midt i (x, y), dreid rz rundt z-aksen
  function boks(x, y, z, sx, sy, sz, f, rz) {
    const g = new THREE.BoxGeometry(sx, sy, sz); g.translate(0, 0, sz / 2);
    if (rz) g.rotateZ(rz);
    g.translate(x, y, z); return farg(g, f);
  }
  // Stående sylinder med bunnen på z (r2 = radius øverst)
  function syl(x, y, z, r, h, f, seg, r2) {
    const g = new THREE.CylinderGeometry(r2 === undefined ? r : r2, r, h, seg || 8); g.rotateX(Math.PI / 2); g.translate(x, y, z + h / 2);
    return farg(g, f);
  }
  // Roter en geometri fra y-aksen til retningen a -> b, midt mellom punktene
  function langs(g, a, b) {
    const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
    g.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(q)); g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); return g;
  }
  const lengde = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  // Firkantet bjelke fra punkt a til b (t = tykkelse)
  function bjelke(a, b, t, f, t2) { return farg(langs(new THREE.BoxGeometry(t, lengde(a, b), t2 || t), a, b), f); }
  // Rund stav fra a til b (r = radius, seg = antall sider)
  function stav(a, b, r, f, seg, r2) { return farg(langs(new THREE.CylinderGeometry(r2 === undefined ? r : r2, r, lengde(a, b), seg || 6), a, b), f); }
  // Prisme: profilen P = [[y, z], ...] (mot klokka) trukket ut L langs x, midt på x = 0
  function prisme(P, L, f) {
    const s = new THREE.Shape(P.map(p => new THREE.Vector2(p[0], p[1])));
    const g = new THREE.ExtrudeGeometry(s, { depth: L, bevelEnabled: false });
    g.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, -L / 2, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1));
    g.computeVertexNormals(); return farg(g, f);
  }
  // Saltak med mønet langs x i høyden h over z = 0: to skrå plater (bredde B under taket, takfot over meter utenfor veggen)
  function saltak(L, B, h, f, over, tykk) {
    over = over === undefined ? .4 : over; tykk = tykk || .12;
    const a = Math.atan2(h, B / 2), s = (B / 2 + over) / Math.cos(a), ut = [];
    for (const sd of [1, -1]) {
      const g = new THREE.BoxGeometry(L + 2 * over, s, tykk); g.translate(0, s / 2, tykk / 2); g.rotateX(-a);
      if (sd < 0) g.rotateZ(Math.PI);
      g.translate(0, 0, h); ut.push(farg(g, f));
    }
    ut.push(boks(0, 0, h - .02, L + 2 * over, .22, .14, tone(f, .8)));
    return samle(ut);
  }
  // Gavl (trekanten under et saltak), mønet langs x
  const gavl = (L, B, h, f) => prisme([[-B / 2, 0], [B / 2, 0], [0, h]], L, f);
  // Flytt/drei en geometri (eller en liste) etter at den er laget
  function flytt(g, x, y, z, rz) {
    if (Array.isArray(g)) { g.forEach(d => flytt(d, x, y, z, rz)); return g; }
    if (rz) g.rotateZ(rz);
    g.translate(x || 0, y || 0, z || 0); return g;
  }
  // Ting på en vegg: delene er laget med veggen i x = 0 og stikker ut mot +x; side sier hvilken vegg ('x+', 'x-', 'y+', 'y-')
  const SIDE = { 'x+': 0, 'y+': Math.PI / 2, 'x-': Math.PI, 'y-': -Math.PI / 2 };
  const påVegg = (d, x, y, z, side) => flytt(d, x, y, z, SIDE[side]);
  // Vindu: karm (ramme) og glass. b = bredde, h = høyde, z = underkanten. ramme null: bare glass. sål: vinduskarm under.
  function vindu(x, y, z, b, h, side, ramme, glass, sål) {
    const d = [boks(.035, 0, 0, .05, b, h, glass || F.glass)];
    if (ramme !== null) d.push(boks(.02, 0, -.07, .04, b + .16, h + .14, ramme || F.hvit));
    if (sål) d.push(boks(.07, 0, -.1, .14, b + .2, .05, ramme || F.hvit));
    return påVegg(d, x, y, z, side);
  }
  // Dør med karm
  function dør(x, y, z, b, h, side, f, ramme) {
    return påVegg([boks(.02, 0, 0, .04, b + .16, h + .08, ramme || F.hvit), boks(.04, 0, 0, .05, b, h, f || F.treM),
      boks(.09, b * .35, h * .45, .06, .04, .14, F.stål)], x, y, z, side);
  }
  // Rødt kors (s = størrelse) på hvit plate (plate = true)
  function rødtKors(x, y, z, s, side, plate) {
    const d = [boks(.03, 0, s / 3, .03, s, s / 3, F.kors), boks(.03, 0, 0, .03, s / 3, s, F.kors)];
    if (plate) d.push(boks(.012, 0, -s * .15, .024, s * 1.3, s * 1.3, '#f3f1ea'));
    return påVegg(d, x, y, z, side);
  }
  // Flate fra en funksjon: punkt(u, v) -> [x, y, z] og farge(u, v) for hver trekant; tosidig gir også baksiden
  function flate(nx, ny, punkt, farge, tosidig) {
    const pos = [], col = [];
    const P = (u, v) => punkt(u / nx, v / ny);
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
      const a = P(i, j), b = P(i + 1, j), c = P(i + 1, j + 1), d = P(i, j + 1);
      const tr = [[a, b, c, (i + .67) / nx, (j + .33) / ny], [a, c, d, (i + .33) / nx, (j + .67) / ny]];
      for (const [p, q, r, u, v] of tr) {
        const k = rgb(farge(u, v));
        pos.push(...p, ...q, ...r); col.push(...k, ...k, ...k);
        if (tosidig) { pos.push(...p, ...r, ...q); col.push(...k, ...k, ...k); }
      }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
  }
  // Fast «tilfeldig» tall (samme modell hver gang)
  function frø(s) { return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; }

  // ---------- 1. Brakke: soverom, trevegger (olivengrønn kledning), blikktak. Langside med dør mot +x. 6 × 12 m. ----------
  M.brakke = function () {
    const L = 12, B = 6, H = 2.6, s = .45, V = F.oliven, d = [];
    d.push(boks(0, 0, 0, B + .2, L + .2, s, F.betongM), boks(0, 0, s, B, L, H, V));
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) d.push(boks(sx * B / 2, sy * L / 2, s, .16, .16, H, F.olivenL));
    d.push(flytt(gavl(L, B, 1.3, V), 0, 0, s + H, Math.PI / 2), flytt(saltak(L, B, 1.3, F.blikk), 0, 0, s + H, Math.PI / 2));
    for (const y of [-4.4, -2.4, 2.4, 4.4]) d.push(vindu(B / 2, y, s + 1, 1, .95, 'x+'));
    for (const y of [-4.4, -1.5, 1.5, 4.4]) d.push(vindu(-B / 2, y, s + 1, 1, .95, 'x-'));
    d.push(vindu(0, L / 2, s + 1, 1, .95, 'y+'), vindu(0, -L / 2, s + 1, 1, .95, 'y-'));
    d.push(dør(B / 2, 0, s, 1, 2.05, 'x+', F.olivenM));
    // trapp og lite tak over døra
    d.push(boks(B / 2 + .5, 0, 0, 1, 1.6, s - .15, F.betong), boks(B / 2 + .9, 0, 0, .6, 1.4, (s - .15) / 2, F.betong));
    d.push(boks(B / 2 + .5, 0, s + 2.35, 1.1, 1.8, .1, F.blikkM));
    // pipe fra ovnen
    d.push(syl(-1.4, 3, s + H + .4, .1, 1.6, F.svart, 6));
    return ferdig(d);
  };

  // ---------- 2. Hovedhus / kontor for oppdrag: to etasjer, hvit kledning, svart tak, antenne. 9 × 12 m. ----------
  M.hovedhus = function () {
    const L = 12, B = 9, H = 5.6, s = .4, h = 2.1, d = [];
    d.push(boks(0, 0, 0, B + .2, L + .2, s, F.betongM), boks(0, 0, s, B, L, H, F.hvit));
    d.push(boks(0, 0, s + 2.75, B + .08, L + .08, .14, F.hvitM));
    d.push(flytt(gavl(L, B, h, F.hvit), 0, 0, s + H, Math.PI / 2), flytt(saltak(L, B, h, F.svart, .5), 0, 0, s + H, Math.PI / 2));
    for (const y of [-4, -2, 2, 4]) d.push(vindu(B / 2, y, s + .9, 1.1, 1.3, 'x+', null));
    for (const y of [-4, -2, 0, 2, 4]) d.push(vindu(B / 2, y, s + 3.6, 1.1, 1.3, 'x+', null));
    for (const y of [-4, -1.3, 1.3, 4]) d.push(vindu(-B / 2, y, s + .9, 1.1, 1.3, 'x-', null), vindu(-B / 2, y, s + 3.6, 1.1, 1.3, 'x-', null));
    d.push(vindu(0, L / 2, s + H + .3, .8, 1, 'y+', null), vindu(0, -L / 2, s + H + .3, .8, 1, 'y-', null));
    d.push(dør(B / 2, 0, s, 1.2, 2.2, 'x+', F.svart, F.hvitM));
    d.push(boks(B / 2 + .6, 0, 0, 1.2, 2.4, s - .1, F.betong), boks(B / 2 + .65, 0, s + 2.45, 1.3, 2.2, .12, F.svart));
    // pipe og antennemast med tverrstag og parabol på mønet
    d.push(boks(0, 2.5, s + H + h - .5, .6, .6, 1.3, F.betongM));
    const z0 = s + H + h;
    d.push(stav([0, -4, z0 - .3], [0, -4, z0 + 6.5], .05, F.stål, 4));
    for (const k of [2, 3.8, 5.6]) d.push(bjelke([0, -4.7, z0 + k], [0, -3.3, z0 + k], .04, F.stål));
    d.push(stav([0, -4, z0 + 6.5], [0, -4, z0 + 7.3], .015, F.stål, 4));
    const par = syl(0, 0, 0, .45, .12, F.hvitM, 8, .35); par.rotateY(Math.PI / 2 - .5); d.push(flytt(par, .4, -4, z0 + 1.2));
    return ferdig(d);
  };

  // ---------- 3. Port med bom og vaktbu. Vegen går langs x gjennom porten (ute = +x), åpningen er 6 m (y -3 til 3). ----------
  M.port = function (åpen) {
    const d = [];
    // stolpene i hver side av åpningen (gjerdet festes her)
    for (const y of [-3.6, 3.6]) d.push(boks(0, y, 0, .5, .5, 1.3, F.betong), boks(0, y, 1.3, .6, .6, .1, F.betongM));
    // bommen: rød og hvit, dreier om tappen ved y = -3.4
    const arm = [], n = 7, Lb = 6.6;
    for (let i = 0; i < n; i++) arm.push(boks(0, (i + .5) * Lb / n, -.06, .12, Lb / n, .12, i % 2 ? '#e8e6df' : F.rødL));
    arm.push(boks(0, -.45, -.15, .3, .5, .3, F.betongM));
    const a = samle(arm); if (åpen) a.rotateX(1.35);
    d.push(flytt(a, .45, -3.4, 1.12), boks(.45, -3.6, 1.3, .25, .25, .25, F.gul));
    d.push(boks(.45, 3.4, 0, .1, .1, 1.05, F.gul), boks(.45, 3.4, .95, .1, .3, .1, F.gul));
    // vaktbua ved siden av vegen (vinduer hele vegen rundt, flatt tak med utstikk)
    const vx = -.8, vy = -5.6, d2 = [];
    d2.push(boks(0, 0, 0, 2.4, 2.4, .2, F.betongM), boks(0, 0, .2, 2.2, 2.2, 2.4, F.oliven));
    d2.push(vindu(1.1, -.35, 1.1, 1.1, 1, 'x+', F.olivenL), vindu(0, 1.1, 1.1, 1.6, 1.1, 'y+', F.olivenL), vindu(-1.1, 0, 1.1, 1.4, 1, 'x-', F.olivenL));
    d2.push(dør(0, -1.1, .2, .85, 2.0, 'y-', F.olivenM, F.olivenL));
    d2.push(boks(0, 0, 2.6, 2.9, 2.9, .16, F.svart), boks(.6, .6, 2.76, .2, .2, .3, F.stål), boks(.9, 1.05, 2.4, .25, .2, .14, F.lys));
    d.push(...flytt(d2, vx, vy, 0));
    // stoppskilt for innkjørende (vender mot +x)
    d.push(stav([2.2, -3.9, 0], [2.2, -3.9, 2.1], .04, F.stål, 4));
    const sk = syl(0, 0, 0, .38, .04, F.rødL, 8); sk.rotateY(Math.PI / 2); sk.rotateX(Math.PI / 8); d.push(flytt(sk, 2.26, -3.9, 2.1));
    d.push(flytt(farg(new THREE.CylinderGeometry(.3, .3, .02, 8).rotateZ(Math.PI / 2).rotateX(Math.PI / 8), '#e8e6df'), 2.29, -3.9, 2.1));
    return ferdig(d);
  };

  // ---------- 4. Gjerde med piggtråd: lengde L langs +y fra y = 0, utsiden (piggtråden heller ut) mot +x. ----------
  M.gjerde = function (L) {
    L = L || 10; const d = [], n = Math.max(1, Math.round(L / 3)), H = 2.1;
    for (let i = 0; i <= n; i++) {
      const y = i * L / n; d.push(boks(0, y, 0, .07, .07, H, F.stålM), bjelke([0, y, H - .05], [.38, y, H + .3], .045, F.stålM));
    }
    // netting: tråder langs og på tvers (enkel rutenetting), piggtråd på armene
    for (const z of [.08, .5, .95, 1.4, H - .05]) d.push(boks(0, L / 2, z, .018, L, .018, F.stål));
    for (let y = .75; y < L; y += .75) if (Math.abs(y / (L / n) - Math.round(y / (L / n))) > .05) d.push(boks(0, y, .08, .012, .012, H - .13, F.stål));
    for (const k of [.33, .66, 1]) d.push(boks(.38 * k, L / 2, H - .05 + .35 * k, .02, L, .02, F.stålM));
    return ferdig(d);
  };
  // Gjerde langs et omriss: punkter [[x, y], ...] i meter. lukket: også fra siste til første. Går du mot klokka rundt leiren,
  // heller piggtråden utover (høyre side av gangretningen).
  M.gjerdeLangs = function (punkter, lukket) {
    const d = [], P = lukket ? [...punkter, punkter[0]] : punkter;
    for (let i = 0; i + 1 < P.length; i++) {
      const [x0, y0] = P[i], [x1, y1] = P[i + 1], L = Math.hypot(x1 - x0, y1 - y0); if (L < .3) continue;
      const g = M.gjerde(L); g.rotateZ(Math.atan2(y1 - y0, x1 - x0) - Math.PI / 2); g.translate(x0, y0, 0); d.push(g);
    }
    return samle(d);
  };

  // ---------- 5. Vakttårn i tre med lyskaster (vender mot +x). Plattform i 5,5 m. ----------
  M.vakttårn = function () {
    const d = [], Z = 5.5, b = 1.35, t = 1.05;
    const fot = (sx, sy) => [sx * b, sy * b, 0], topp = (sx, sy) => [sx * t, sy * t, Z];
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) d.push(bjelke(fot(sx, sy), [sx * t, sy * t, Z + 2.5], .2, F.tre));
    // kryssavstivning på alle fire sider, og en ring midt på
    const hjørner = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (let i = 0; i < 4; i++) {
      const [ax, ay] = hjørner[i], [bx, by] = hjørner[(i + 1) % 4];
      d.push(bjelke(fot(ax, ay), topp(bx, by), .1, F.treM), bjelke(fot(bx, by), topp(ax, ay), .1, F.treM));
      const k = (b + t) / 2; d.push(bjelke([ax * k, ay * k, Z / 2], [bx * k, by * k, Z / 2], .1, F.treM));
    }
    // plattform, brystning av planker, tak (pyramide) og stigen
    d.push(boks(0, 0, Z, 2.7, 2.7, .15, F.treM));
    d.push(boks(1.3, 0, Z + .15, .08, 2.7, 1.05, F.tre), boks(-1.3, 0, Z + .15, .08, 2.7, 1.05, F.tre), boks(0, 1.3, Z + .15, 2.7, .08, 1.05, F.tre));
    d.push(boks(-.425, -1.3, Z + .15, 1.85, .08, 1.05, F.tre));
    d.push(boks(0, 0, Z + 1.2, 2.8, 2.8, .07, F.treL));
    const tak = new THREE.ConeGeometry(2.25, 1.1, 4); tak.rotateX(Math.PI / 2); tak.rotateZ(Math.PI / 4); d.push(flytt(farg(tak, F.svart), 0, 0, Z + 3.05));
    const st = [.9, -b - .5], st2 = [.9, -t - .2];
    for (const dx of [-.25, .25]) d.push(bjelke([st[0] + dx, st[1], 0], [st2[0] + dx, st2[1], Z + .1], .06, F.treM));
    for (let i = 1; i <= 7; i++) { const k = i / 8, yy = st[1] + (st2[1] - st[1]) * k; d.push(boks(st[0], yy, Z * k, .55, .06, .05, F.treM)); }
    // lyskaster på brystningen foran
    const lk = syl(0, 0, 0, .2, .45, F.svart, 8); lk.rotateY(Math.PI / 2); d.push(flytt(lk, 1.2, .6, Z + 1.35));
    const glass = syl(0, 0, 0, .17, .03, F.lys, 8); glass.rotateY(Math.PI / 2); d.push(flytt(glass, 1.44, .6, Z + 1.35));
    d.push(boks(1.3, .6, Z + 1.2, .1, .1, .15, F.svart));
    return ferdig(d);
  };

  // ---------- 6. Verksted / garasje med to porter mot +x (kjøretøy kjører inn). åpne = [port 1, port 2] (true = åpen). ----------
  M.verksted = function (åpne) {
    åpne = åpne || [true, false];
    const D = 12, W = 14, H = 5.4, h = 1.3, V = '#5b6658', d = [], pb = 4.4, ph = 4.5, py = [-3.5, 3.5];
    d.push(boks(0, 0, 0, D, W, .15, F.betongM), boks(D / 2 + 3, 0, 0, 6, W, .1, F.betong));
    // vegger (bakvegg, sidevegger og frontveggen bygget rundt portåpningene)
    d.push(boks(-D / 2 + .1, 0, .15, .2, W, H, V), boks(0, -W / 2 + .1, .15, D, .2, H, V), boks(0, W / 2 - .1, .15, D, .2, H, V));
    const fx = D / 2 - .1;
    d.push(boks(fx, -(W / 2 + py[1] + pb / 2) / 2, .15, .2, W / 2 - py[1] - pb / 2, ph, V));
    d.push(boks(fx, 0, .15, .2, py[1] * 2 - pb, ph, V));
    d.push(boks(fx, (W / 2 + py[1] + pb / 2) / 2, .15, .2, W / 2 - py[1] - pb / 2, ph, V));
    d.push(boks(fx, 0, .15 + ph, .2, W, H - ph, V));
    d.push(flytt(gavl(D, W, h, V), 0, 0, H + .15), flytt(saltak(D, W, h, F.blikk, .3), 0, 0, H + .15));
    py.forEach((y, i) => {
      // karm rundt porten, lampe over
      d.push(boks(D / 2 + .02, y, .15 + ph, .1, pb + .3, .15, F.blikkM));
      for (const s of [-1, 1]) d.push(boks(D / 2 + .02, y + s * (pb / 2 + .08), .15, .1, .15, ph, F.blikkM));
      d.push(boks(D / 2 + .15, y, .15 + ph + .35, .25, .4, .15, F.svart), boks(D / 2 + .15, y, .15 + ph + .3, .2, .3, .05, F.lys));
      if (åpne[i]) {
        // opprullet port øverst inne
        const r = syl(0, 0, 0, .28, pb, F.blikkM, 8); r.rotateX(Math.PI / 2); d.push(flytt(r, fx - .45, y + pb / 2, .15 + ph + .1));
      } else {
        d.push(boks(fx + .02, y, .15, .14, pb, ph, '#77807a'));
        for (let k = 1; k <= 2; k++) d.push(boks(fx + .1, y, .15 + k * ph / 3, .04, pb, .05, F.blikkM));
      }
    });
    // inne: arbeidsbenk og verktøyskap mot bakveggen
    d.push(boks(-D / 2 + .6, -3, .15, .8, 3, .9, F.treM), boks(-D / 2 + .5, 1.5, .15, .6, 1.4, 1.9, F.rød));
    // sidedør og vindusbånd på sidene
    d.push(dør(D / 2 - 2, W / 2, .15, 1, 2.1, 'y+', F.blikkM, F.blikkM));
    for (const x of [-3.5, 0]) d.push(vindu(x, W / 2, 3, 2.2, .8, 'y+', F.blikkM), vindu(x, -W / 2, 3, 2.2, .8, 'y-', F.blikkM));
    return ferdig(d);
  };

  // ---------- 7. Lagertelt, containere (olje, ammunisjon, utstyr), kassestabel og fat på pall ----------
  M.lagertelt = function () {
    const L = 8, B = 5, d = [];
    d.push(prisme([[-B / 2, 0], [B / 2, 0], [B / 2, 1.8], [0, 3.3], [-B / 2, 1.8]], L, F.presenning));
    // inngangen mot +x: duk som er rullet opp, mørk åpning
    d.push(boks(L / 2 + .01, 0, 0, .02, 1.8, 2.1, '#1d1f1a'), boks(L / 2 + .1, 0, 2.1, .2, 2, .2, F.olivenM));
    // mønestang som stikker ut, ventilhette, bardunene og pluggene
    for (const sx of [-1, 1]) d.push(stav([sx * L / 2, 0, 3.3], [sx * (L / 2 + .25), 0, 3.3], .04, F.treM, 4));
    d.push(boks(1.5, 0, 3.15, .7, .5, .35, F.olivenM));
    for (const x of [-3.5, 0, 3.5]) for (const sy of [-1, 1]) {
      d.push(bjelke([x, sy * B / 2, 1.8], [x, sy * (B / 2 + 1.3), .05], .02, '#2f3127'), boks(x, sy * (B / 2 + 1.3), 0, .06, .06, .15, F.treM));
    }
    return ferdig(d);
  };
  const CONTAINER = {
    utstyr: { f: F.blå, merke: null }, olje: { f: F.rust, merke: F.oransje }, ammunisjon: { f: F.oliven, merke: F.gul },
  };
  // innhold: 'utstyr' | 'olje' | 'ammunisjon'. 20 fot (6,06 × 2,44 × 2,59), dørene mot +x.
  M.container = function (innhold) {
    const c = CONTAINER[innhold] || CONTAINER.utstyr, L = 6.06, B = 2.44, H = 2.59, d = [], m = tone(c.f, .78);
    d.push(boks(0, 0, .1, L, B, H - .1, c.f));
    for (const sy of [-1, 1]) for (const sx of [-1, 1]) d.push(boks(sx * (L / 2 - .08), sy * (B / 2 - .08), 0, .18, .18, H, m));
    // bølgeprofil på langsidene (ribber)
    for (let i = 1; i < 10; i++) { const x = -L / 2 + i * L / 10; d.push(boks(x, 0, .25, .1, B + .05, H - .4, m)); }
    d.push(boks(0, 0, H - .14, L + .02, B + .04, .16, m), boks(0, 0, 0, L + .02, B + .04, .16, m));
    // dørene: to fløyer med låsestenger
    d.push(boks(L / 2 + .01, 0, .16, .02, .02, H - .3, '#202224'));
    for (const y of [-.85, -.35, .35, .85]) d.push(stav([L / 2 + .06, y, .2], [L / 2 + .06, y, H - .2], .025, F.stålM, 4));
    if (c.merke) {
      for (const sy of [-1, 1]) d.push(boks(1.2, sy * (B / 2 + .04), 1, .7, .02, .5, c.merke));
      if (innhold === 'ammunisjon') for (const sy of [-1, 1]) d.push(boks(-1.2, sy * (B / 2 + .035), 1.15, 1.6, .02, .2, c.merke));
    }
    return ferdig(d);
  };
  // Stabel med ammunisjonskasser på pall (1,2 × 1 m)
  M.kasser = function () {
    const d = [boks(0, 0, 0, 1.2, 1, .14, F.treL)];
    for (let z = 0; z < 3; z++) for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      if (z === 2 && i === 1 && j === 1) continue;
      const x = (i - .5) * .58, y = (j - .5) * .48, zz = .14 + z * .3;
      d.push(boks(x, y, zz, .56, .46, .28, z % 2 ? F.olivenL : F.oliven), boks(x, y, zz + .1, .57, .47, .03, F.olivenM));
    }
    d.push(boks(0, -.5, .14, .04, .01, .9, F.svart), boks(0, .5, .14, .04, .01, .9, F.svart));
    return ferdig(d);
  };
  // Fire oljefat på pall
  M.fatpall = function () {
    const d = [boks(0, 0, 0, 1.25, 1.25, .14, F.treL)];
    const f = [F.blå, F.rust, F.oliven, F.blå];
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy], i) => {
      const x = sx * .3, y = sy * .3;
      d.push(syl(x, y, .14, .29, .88, f[i], 8));
      for (const z of [.42, .7]) d.push(farg(new THREE.CylinderGeometry(.3, .3, .04, 8, 1, true).rotateX(Math.PI / 2).translate(x, y, z), tone(f[i], .75)));
      d.push(syl(x + .12, y + .1, 1.02, .04, .02, F.stål, 4));
    });
    return ferdig(d);
  };

  // ---------- 8. Sykestue: hvit, rødt kors på veggene og taket, rampe til døra. 7 × 11 m, døra mot +x. ----------
  M.sykestue = function () {
    const L = 11, B = 7, H = 2.8, s = .45, h = 1.6, d = [];
    d.push(boks(0, 0, 0, B + .2, L + .2, s, F.betongM), boks(0, 0, s, B, L, H, F.hvit));
    d.push(flytt(gavl(L, B, h, F.hvit), 0, 0, s + H, Math.PI / 2), flytt(saltak(L, B, h, F.blikkM), 0, 0, s + H, Math.PI / 2));
    for (const y of [-4, -2.2, 2.6, 4.2]) d.push(vindu(B / 2, y, s + 1, 1.1, 1, 'x+', F.hvitM));
    for (const y of [-3.5, 0, 3.5]) d.push(vindu(-B / 2, y, s + 1, 1.1, 1, 'x-', F.hvitM));
    d.push(dør(B / 2, .4, s, 1.4, 2.1, 'x+', F.hvitM, F.hvitM));
    d.push(rødtKors(B / 2, -1.1, s + 1.2, .7, 'x+'), rødtKors(0, L / 2, s + H + .15, 1, 'y+'), rødtKors(0, -L / 2, s + H + .15, 1, 'y-'));
    // kors på takflaten mot +x (følger takvinkelen)
    const a = Math.atan2(h, B / 2), kt = rødtKors(0, 0, -1, 2.2, 'x+', true); kt.forEach(g => g.rotateY(-(Math.PI / 2 - a)));
    d.push(...flytt(kt, B / 4 + .05, 0, s + H + h / 2 + .14));
    // rampe (skrå) og plattform foran døra, tak over
    d.push(boks(B / 2 + .8, .4, 0, 1.6, 2, s, F.betong));
    d.push(flytt(prisme([[0, 0], [3.2, 0], [0, s]], 1.3, F.betong), B / 2 + .8, 1.4, 0, -Math.PI / 2));
    d.push(boks(B / 2 + .7, .45, s + 2.4, 1.5, 1.9, .1, F.hvitM));
    return ferdig(d);
  };

  // ---------- 9. Treningsfelt: hinderløype (langs +x, ca. 32 m) og skytebane (skyter mot +x) ----------
  M.hinderløype = function () {
    const d = [boks(16, 0, 0, 34, 3.4, .04, F.grus)];
    // krypehinder: lave stolper med netting over
    for (const x of [1, 6]) for (const y of [-1.2, 1.2]) d.push(boks(x, y, 0, .1, .1, .6, F.treM));
    for (const y of [-1.2, -.4, .4, 1.2]) d.push(boks(3.5, y, .58, 5, .02, .02, F.svart));
    for (const x of [1, 2.7, 4.3, 6]) d.push(boks(x, 0, .58, .02, 2.4, .02, F.svart));
    // klatrevegg med støtter og tau
    d.push(boks(10, 0, 0, .2, 3, 2.3, F.tre), boks(10, 0, 2.3, .26, 3.1, .1, F.treM));
    for (const y of [-1.2, 1.2]) d.push(bjelke([10, y, 2], [11.6, y, 0], .12, F.treM));
    d.push(stav([9.85, .6, 2.3], [9.85, .6, .4], .02, '#8c7b5a', 4));
    // balansebom på bukker
    d.push(stav([14, 0, .8], [20, 0, .8], .1, F.treL, 6));
    for (const x of [14.3, 17, 19.7]) d.push(boks(x, 0, 0, .1, .1, .75, F.treM), boks(x, 0, 0, .1, .9, .1, F.treM));
    // klatrestativ med nett
    for (const y of [-1.4, 1.4]) d.push(stav([24, y, 0], [24, y, 3.6], .1, F.tre, 6));
    d.push(stav([24, -1.5, 3.5], [24, 1.5, 3.5], .09, F.tre, 6));
    for (const y of [-.9, -.3, .3, .9]) d.push(bjelke([24, y, 3.5], [25.4, y, 0], .02, '#8c7b5a'));
    for (const k of [.25, .5, .75]) d.push(bjelke([24 + 1.4 * k, -1.2, 3.5 * (1 - k)], [24 + 1.4 * k, 1.2, 3.5 * (1 - k)], .02, '#8c7b5a'));
    // dekk å løpe gjennom
    for (let i = 0; i < 4; i++) d.push(syl(28 + i * .9, (i % 2 ? .45 : -.45), 0, .38, .22, F.gummi, 6));
    return ferdig(d);
  };
  M.skytebane = function (L) {
    L = L || 25; const d = [], n = 5;
    // standplass: tak på stolper, skyteunderlag
    d.push(boks(0, 0, 0, 3, 11, .1, F.betong));
    for (const x of [-1.3, 1.3]) for (const y of [-5.3, 5.3]) d.push(boks(x, y, .1, .14, .14, 2.4, F.tre));
    const tak = boks(0, 0, 0, 3.4, 11.6, .12, F.svart); tak.rotateY(.12); d.push(flytt(tak, 0, 0, 2.5));
    d.push(boks(-1.5, 0, .1, .08, 11, 1.1, F.tre));
    for (let i = 0; i < n; i++) { const y = (i - (n - 1) / 2) * 2; d.push(boks(.6, y, .1, 1.8, .8, .04, F.olivenM)); }
    // blinkene: skive på to stolper (hvit med svart sirkel)
    for (let i = 0; i < n; i++) {
      const y = (i - (n - 1) / 2) * 2;
      d.push(boks(L, y - .4, 0, .08, .08, 1.9, F.treM), boks(L, y + .4, 0, .08, .08, 1.9, F.treM));
      d.push(boks(L - .06, y, .9, .03, 1, 1, '#d8d4c6'));
      const sv = syl(0, 0, 0, .3, .02, F.svart, 8); sv.rotateY(Math.PI / 2); d.push(flytt(sv, L - .09, y, 1.4));
    }
    // kulefang: sandvoll bak blinkene, og grusgang
    d.push(flytt(prisme([[0, 0], [5, 0], [3.5, 3], [1.5, 3]], 13, F.sand), L + 6.5, 0, 0, Math.PI / 2));
    d.push(boks(L / 2 + .9, 0, 0, L - 1.8, 10.6, .03, F.grus));
    return ferdig(d);
  };

  // ---------- 10. Helikopterplass: H i sirkel, lys rundt kanten, vindpølse ----------
  M.helikopterplass = function () {
    const d = [syl(0, 0, 0, 10.5, .15, F.betong, 20), syl(0, 0, 0, 10.5, .1, F.betongM, 20, 10.9)];
    const ring = new THREE.RingGeometry(8.2, 8.8, 24); ring.translate(0, 0, .156); d.push(farg(ring, '#e8e6df'));
    d.push(boks(0, -2.4, .15, 6, .9, .01, '#e8e6df'), boks(0, 2.4, .15, 6, .9, .01, '#e8e6df'), boks(0, 0, .15, .9, 4, .01, '#e8e6df'));
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + Math.PI / 8; d.push(boks(Math.cos(a) * 10.2, Math.sin(a) * 10.2, .1, .2, .2, .2, i % 2 ? F.lys : '#7fa16a')); }
    // vindpølsa: mast, bøyle og pølse i oransje og hvit (blåser mot +x og henger litt)
    const vx = 12.5, vy = 8, z = 5;
    d.push(stav([vx, vy, 0], [vx, vy, z + .2], .05, F.stål, 6), stav([vx, vy, z], [vx + .35, vy, z], .02, F.stål, 4));
    const del = [['#cf5f1f', .35, .3], ['#e8e6df', .3, .26], ['#cf5f1f', .26, .22], ['#e8e6df', .22, .18]];
    let x = vx + .35, zz = z;
    for (const [f, r1, r2] of del) {
      const g = new THREE.CylinderGeometry(r2, r1, .7, 8, 1, true); g.rotateZ(-Math.PI / 2); g.rotateY(.12);
      d.push(flytt(farg(g, f), x + .35, vy, zz - .04)); x += .69; zz -= .085;
    }
    return ferdig(d);
  };

  // ---------- 11. Flaggstang med gjengens eget flagg. valg: { farge, merke, merkefarge }. merke: 'sirkel' | 'kors' | 'stripe' |
  // 'stjerne' | 'trekant' | 'ingen'. Flagget blåser mot +x. ----------
  M.flaggstang = function (valg) {
    valg = Object.assign({ farge: '#3e5a3a', merke: 'sirkel', merkefarge: '#d8cfae' }, valg || {});
    const H = 8, fb = 1.8, fh = 1.2, d = [];
    d.push(boks(0, 0, 0, .6, .6, .25, F.betong), syl(0, 0, .25, .06, H - .25, '#e2e0d9', 6, .04), syl(0, 0, H, .08, .14, F.gull, 6, .03));
    // duken: bølger bare langs u (loddrette linjer er rette), så 12 strimler holder
    const P = (u, v) => [.06 + u * fb, Math.sin(u * 5.5) * .08 * u, H - .1 - fh + v * fh - .12 * u * u];
    d.push(flate(12, 1, P, () => valg.farge, true));
    // merket: trekanter i (u, v) som legges litt utenpå duken på begge sider
    const T = [], fir = (u0, v0, u1, v1) => T.push([[u0, v0], [u1, v0], [u1, v1]], [[u0, v0], [u1, v1], [u0, v1]]);
    if (valg.merke === 'sirkel' || valg.merke === 'stjerne') {
      const n = valg.merke === 'sirkel' ? 14 : 10;
      for (let i = 0; i < n; i++) {
        const r0 = valg.merke === 'stjerne' && i % 2 ? .13 : .3, r1 = valg.merke === 'stjerne' && !(i % 2) ? .13 : .3, a0 = i / n * 2 * Math.PI + Math.PI / 2, a1 = (i + 1) / n * 2 * Math.PI + Math.PI / 2;
        T.push([[.5, .5], [.5 + Math.cos(a0) * r0 / 1.5, .5 + Math.sin(a0) * r0], [.5 + Math.cos(a1) * r1 / 1.5, .5 + Math.sin(a1) * r1]]);
      }
    } else if (valg.merke === 'kors') { fir(.3, 0, .42, 1); fir(0, .4, .3, .6); fir(.42, .4, 1, .6); }
    else if (valg.merke === 'stripe') fir(0, .37, 1, .63);
    else if (valg.merke === 'trekant') T.push([[0, 0], [.48, .5], [0, 1]]);
    // del opp til biter som er smale nok til å følge bølgen (høyst 0,09 i u)
    const deler = [];
    const del = t => {
      const us = t.map(p => p[0]); if (Math.max(...us) - Math.min(...us) <= .09) { deler.push(t); return; }
      const m = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], [a, b, c] = t, ab = m(a, b), bc = m(b, c), ca = m(c, a);
      del([a, ab, ca]); del([ab, b, bc]); del([ca, bc, c]); del([ab, bc, ca]);
    };
    T.forEach(del);
    if (deler.length) {
      const pos = [], e = 1e-3, N = (u, v) => {
        const p = P(u, v), du = P(u + e, v).map((x, i) => x - p[i]), dv = P(u, v + e).map((x, i) => x - p[i]);
        const n = [du[1] * dv[2] - du[2] * dv[1], du[2] * dv[0] - du[0] * dv[2], du[0] * dv[1] - du[1] * dv[0]], l = Math.hypot(...n);
        return n.map(x => x / l);
      };
      for (const sd of [1, -1]) for (const t of deler) {
        const q = t.map(([u, v]) => { const p = P(u, v), n = N(u, v); return p.map((x, i) => x + n[i] * .012 * sd); });
        if (sd > 0) pos.push(...q[0], ...q[1], ...q[2]); else pos.push(...q[0], ...q[2], ...q[1]);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
      d.push(farg(g, valg.merkefarge));
    }
    return ferdig(d);
  };

  // ---------- 12. Drivstofftank med pumpe: liggende tank (langs y) i oppsamlingskar, pumpa foran mot +x ----------
  M.drivstofftank = function () {
    const d = [], L = 6, r = 1.25, zc = 1.75, T = F.oliven;
    d.push(boks(0, 0, 0, 4.4, 8, .12, F.betong));
    // oppsamlingskar (lav betongkant)
    d.push(boks(1.6, 0, .12, .15, 7.4, .5, F.betongM), boks(-1.6, 0, .12, .15, 7.4, .5, F.betongM));
    d.push(boks(0, 3.65, .12, 3.35, .15, .5, F.betongM), boks(0, -3.65, .12, 3.35, .15, .5, F.betongM));
    for (const y of [-2, 2]) d.push(boks(0, y, .12, 1.8, .4, .8, F.betongM));
    const tank = syl(0, 0, 0, r, L, T, 14); tank.rotateX(Math.PI / 2); tank.translate(0, L / 2, zc); d.push(tank);
    for (const y of [-2, 2]) d.push(farg(new THREE.CylinderGeometry(r + .03, r + .03, .12, 14, 1, true).translate(0, y, zc), F.olivenM));
    // mannlokk, lufterør, stige og gangbane på toppen
    d.push(syl(0, 1.2, zc + r - .1, .3, .25, F.olivenM, 8), stav([.4, -2.6, zc + r - .1], [.4, -2.6, zc + r + 1], .04, F.stål, 4));
    for (const dx of [-.25, .25]) d.push(bjelke([1.45 + .02, -2.6 + dx, 0], [1.25, -2.6 + dx, zc + r + .1], .05, F.stål));
    for (let i = 1; i < 6; i++) d.push(boks(1.43 - .035 * i, -2.6, i * .55, .05, .5, .04, F.stål));
    // pumpa: skap med display, slange og pistol, påkjørselsvern i gult
    const px = 2.9, py = 0;
    d.push(boks(px, py, .12, .6, 1, 1.7, '#9ea29f'), boks(px + .31, py, 1.2, .02, .6, .35, F.glassL), boks(px, py, 1.82, .66, 1.06, .1, F.rødL));
    d.push(boks(px + .31, py + .3, .7, .08, .1, .25, F.svart));
    d.push(stav([px + .3, py + .4, 1.5], [px + .55, py + .55, .5], .025, F.gummi, 4), stav([px + .55, py + .55, .5], [px + .36, py + .35, .78], .025, F.gummi, 4));
    for (const y of [-.9, .9]) d.push(syl(px + .7, py + y, .12, .08, .9, F.gul, 6));
    d.push(stav([1.5, -.5, .4], [px - .3, py - .2, .4], .05, F.stålM, 4));
    return ferdig(d);
  };

  // ---------- 13. Sandsekkvoll (lengde L langs y, front mot +x) og vegsperring (betongsperrer i sikksakk, skilt og lamper) ----------
  M.sandsekkvoll = function (L, rader) {
    L = L || 3; rader = rader || 5;
    const d = [], r = frø(7), sb = .6, sh = .2, fa = [F.sand, '#9d8a66', '#8f8466', '#a39370'];
    for (let j = 0; j < rader; j++) {
      const n = Math.round(L / sb), forskj = j % 2 ? sb / 2 : 0, inn = j * .04;
      for (let i = j % 2 ? -1 : 0; i < n; i++) {
        let y0 = -L / 2 + i * sb + forskj, y1 = y0 + sb; if (y1 > L / 2) y1 = L / 2;
        if (y0 < -L / 2) y0 = -L / 2;
        if (y1 - y0 < .2) continue;
        const sx = .42 - inn * .5 + r() * .04;
        // sekken: sekskantet sylinder langs y, klemt flat (runde kanter foran og bak); endeflater bare ytterst i rekka
        const ende = y0 <= -L / 2 + .01 || y1 >= L / 2 - .01, g = new THREE.CylinderGeometry(sx / 2, sx / 2, y1 - y0 - .02, 6, 1, !ende); g.rotateY(Math.PI / 6); g.scale(1, 1, sh / sx * 1.15);
        g.rotateZ((r() - .5) * .08); g.translate(-inn + (r() - .5) * .03, (y0 + y1) / 2, j * sh * .88 + sh / 2); d.push(farg(g, fa[(r() * 4) | 0]));
      }
    }
    return ferdig(d);
  };
  M.vegsperring = function () {
    const d = [];
    // betongsperre (New Jersey-profil), 3 m lang langs y
    const sperre = (x, y) => flytt(prisme([[-.3, 0], [.3, 0], [.3, .08], [.12, .3], [.08, .82], [-.08, .82], [-.12, .3], [-.3, .08]], 3, F.betong), x, y, 0, Math.PI / 2);
    d.push(sperre(0, -2.2), sperre(4, 2.2), sperre(8, -2.2));
    // stripete skiltbord på bukker og røde lamper
    for (const y of [-1.2, 1.2]) d.push(bjelke([-1.5, y, 0], [-1.5, y, 1.1], .06, F.stålM));
    for (let i = 0; i < 6; i++) d.push(boks(-1.48, -1.25 + (i + .5) * 2.5 / 6, .75, .04, 2.5 / 6, .3, i % 2 ? '#e8e6df' : F.rødL));
    for (const y of [-1.2, 1.2]) d.push(syl(-1.48, y, 1.1, .09, .12, F.rødL, 6));
    // stoppskilt, oljefat med refleksbånd og lampe
    d.push(stav([-1.8, -3.3, 0], [-1.8, -3.3, 2], .04, F.stål, 4));
    const sk = syl(0, 0, 0, .36, .04, F.rødL, 8); sk.rotateY(-Math.PI / 2); sk.rotateX(Math.PI / 8); d.push(flytt(sk, -1.84, -3.3, 2));
    for (const [x, y] of [[2, 3.6], [6, -3.6]]) d.push(syl(x, y, 0, .29, .88, F.oransje, 10), syl(x, y, .5, .3, .12, '#e8e6df', 10));
    return ferdig(d);
  };

  // ---------- Felles ----------
  M.samle = samle;
  M.FARGER = F;
  M.trekanter = g => g.attributes.position.count / 3;
  let MAT = null;
  M.materiale = () => MAT || (MAT = new THREE.MeshLambertMaterial({ vertexColors: true }));
  // Alle modellene (nr = nummeret i docs/3d-modeller.md); lag() gir geometrien. Testsiden viser dem i denne rekkefølgen.
  M.LISTE = [
    { nr: 1, navn: 'brakke', tittel: 'Brakke', lag: () => M.brakke() },
    { nr: 2, navn: 'hovedhus', tittel: 'Hovedhus / kontor', lag: () => M.hovedhus() },
    { nr: 3, navn: 'port', tittel: 'Port med bom og vaktbu', lag: () => M.port(false) },
    { nr: 3, navn: 'port-åpen', tittel: 'Port (bommen oppe)', lag: () => M.port(true) },
    { nr: 4, navn: 'gjerde', tittel: 'Gjerde med piggtråd (10 m)', lag: () => M.gjerde(10) },
    { nr: 4, navn: 'gjerde-omriss', tittel: 'Gjerde langs omriss', lag: () => M.gjerdeLangs([[-6, -5], [6, -5], [6, 2], [1, 6], [-6, 5]], true) },
    { nr: 5, navn: 'vakttårn', tittel: 'Vakttårn med lyskaster', lag: () => M.vakttårn() },
    { nr: 6, navn: 'verksted', tittel: 'Verksted / garasje', lag: () => M.verksted([true, false]) },
    { nr: 7, navn: 'lagertelt', tittel: 'Lagertelt', lag: () => M.lagertelt() },
    { nr: 7, navn: 'container-olje', tittel: 'Container (olje)', lag: () => M.container('olje') },
    { nr: 7, navn: 'container-ammunisjon', tittel: 'Container (ammunisjon)', lag: () => M.container('ammunisjon') },
    { nr: 7, navn: 'container-utstyr', tittel: 'Container (utstyr)', lag: () => M.container('utstyr') },
    { nr: 7, navn: 'kasser', tittel: 'Ammunisjonskasser', lag: () => M.kasser() },
    { nr: 7, navn: 'fatpall', tittel: 'Oljefat på pall', lag: () => M.fatpall() },
    { nr: 8, navn: 'sykestue', tittel: 'Sykestue', lag: () => M.sykestue() },
    { nr: 9, navn: 'hinderløype', tittel: 'Hinderløype', lag: () => M.hinderløype() },
    { nr: 9, navn: 'skytebane', tittel: 'Skytebane med blinker', lag: () => M.skytebane(25) },
    { nr: 10, navn: 'helikopterplass', tittel: 'Helikopterplass', lag: () => M.helikopterplass() },
    { nr: 11, navn: 'flaggstang', tittel: 'Flaggstang (sirkel)', lag: () => M.flaggstang() },
    { nr: 11, navn: 'flaggstang-kors', tittel: 'Flaggstang (kors)', lag: () => M.flaggstang({ farge: '#5b1f1c', merke: 'kors', merkefarge: '#1f1f22' }) },
    { nr: 11, navn: 'flaggstang-stjerne', tittel: 'Flaggstang (stjerne)', lag: () => M.flaggstang({ farge: '#24364a', merke: 'stjerne', merkefarge: '#c9a227' }) },
    { nr: 12, navn: 'drivstofftank', tittel: 'Drivstofftank med pumpe', lag: () => M.drivstofftank() },
    { nr: 13, navn: 'sandsekkvoll', tittel: 'Sandsekkvoll', lag: () => M.sandsekkvoll(3, 5) },
    { nr: 13, navn: 'vegsperring', tittel: 'Vegsperring', lag: () => M.vegsperring() },
  ];
})();
