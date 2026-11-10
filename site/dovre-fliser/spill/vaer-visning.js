'use strict';
// Vær og årstider i kartet (regler: spill/vaer.js). ☰ har «Årstid» og «Vær» (automatisk eller låst). Øverst: været og temperaturen.
// 3D: regn og snø rundt kameraet, tåke og grå himmel (lys3d leser window.VAER), snø over snøgrensen og høstfarger i bakken (VAER_U),
// snø på grantrærne, gule og røde bjørker om høsten og nakne om vinteren. Sikten til lagene korter inn (oppdaterSikt leser VAER.sikt).
(function () {
  const S = Vaer.ny('sommer'), r3 = () => (typeof R3 !== 'undefined' ? R3 : null);
  let fall = null, sistT = 0;
  const TRE_U = { uTreSno: { value: 0 }, uHostLov: { value: 0 }, uNaken: { value: 0 } };

  // Været blandes mykt over spilltiden (spill/vaer.js). 3D viser i tillegg en glattet kopi (vist) som tar igjen været på et par
  // sekunder, så også et vær valgt i menyen kommer gradvis. Sikten til lagene bruker reglenes verdi direkte.
  const VIST = ['sky', 'dis', 'regn', 'snø', 'våt', 'dalTåke', 'torden'];
  let vist = null;
  function settVist() {
    const V = window.VAER; if (!V || !vist) return;
    for (const f of VIST) V[f] = vist[f];
    V.nøkkel = S.årstid + '|' + Math.round(vist.sky * 40) + '|' + Math.round(vist.dis * 40);
  }
  function oppdater(melding) {
    const h = (6 + tid / TIME) % 24, V = Vaer.tilstand(S, h, tid), før = window.VAER;
    if (!vist) vist = {}; for (const f of VIST) if (vist[f] == null) vist[f] = V[f];
    window.VAER = { ...V, regel: { ...V }, mål: S.årstid + '|' + S.vær + '|' + Math.round(V.sikt * 20) }; settVist();
    VAER_U.uSno.value = 1; VAER_U.uSnoGrense.value = V.snøgrense; VAER_U.uHost.value = V.høst;
    TRE_U.uHostLov.value = V.høst; TRE_U.uNaken.value = S.årstid === 'vinter' ? 1 : 0;
    if (!før || før.mål !== window.VAER.mål) {
      for (const s of ENHETER) s.siktSkitten = true;
      if (melding) logg(melding + (V.sikt < 1 ? ` Sikten er ${Math.round(V.sikt * 100)} % av vanlig.` : ''));
      skitten = true;
    }
    knappÅ.textContent = 'Årstid: ' + V.årstidNavn; knappV.textContent = 'Vær: ' + (S.låst ? V.navn : 'automatisk (' + V.navn.toLowerCase() + ')');
    document.getElementById('sVaer').textContent = `${V.navn}, ${V.temp} °C`; document.getElementById('sAar').textContent = V.årstidNavn.toLowerCase();
  }

  // ---------- meny og statuslinje ----------
  const lk = document.getElementById('lagmeny'), knappÅ = document.createElement('button'), knappV = document.createElement('button');
  knappÅ.onclick = () => { const i = Vaer.REKKE.indexOf(S.årstid); Vaer.settÅrstid(S, Vaer.REKKE[(i + 1) % Vaer.REKKE.length], tid); oppdater(`Det er ${Vaer.ÅRSTIDER[S.årstid].navn.toLowerCase()}.`); };
  knappV.onclick = () => { const i = Vaer.VÆRREKKE.indexOf(S.låst || 'auto'); Vaer.låsVær(S, Vaer.VÆRREKKE[(i + 1) % Vaer.VÆRREKKE.length]); S.til = tid + 60; oppdater(`Været: ${Vaer.VÆR[S.vær].navn.toLowerCase()}.`); };
  lk.append(knappÅ, knappV);
  const st = document.createElement('div'); st.innerHTML = '<b id="sVaer">Klart</b> <span id="sAar">sommer</span>'; document.querySelector('.stats').appendChild(st);
  oppdater();

  KROKER.sim.push(() => {
    if (tid - sistT < 1 && tid >= sistT) return; sistT = tid;
    const før = S.vær; Vaer.steg(S, tid);
    oppdater(S.vær !== før ? { klart: 'Det klarner opp.', skyet: 'Det skyer over.', regn: 'Det begynner å regne.', snø: 'Det begynner å snø.', tåke: 'Tåka kommer sigende.' }[S.vær] : null);
  });

  // ---------- 2D: tåke og nedbør som et slør over kartet ----------
  KROKER.tegn.push(g => {
    const V = window.VAER; if (!V || (!V.nedbør && V.vær !== 'tåke')) return;
    g.save(); g.fillStyle = V.vær === 'tåke' ? 'rgba(205,208,210,.28)' : V.nedbør === 'snø' ? 'rgba(235,238,242,.12)' : 'rgba(120,130,140,.12)'; g.fillRect(0, 0, VW, VH); g.restore();
  });

  // ---------- 3D: trær, gress, dis og nedbør ----------
  // Grantrærne får snø på greinene over snøgrensen, bjørkene høstfarger (hver sin tone) eller står nakne om vinteren.
  function treVær(m, løv) {
    const før = m.material.onBeforeCompile;
    m.material.onBeforeCompile = (sh, r) => { if (før) før(sh, r); Object.assign(sh.uniforms, TRE_U, { uSnoGrense: VAER_U.uSnoGrense, uH0: VAER_U.uH0 });
      sh.vertexShader = 'uniform float uH0;\nvarying float vTOpp;\nvarying float vTMoh;\nvarying float vTFro;\n' + sh.vertexShader.replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        vTOpp = objectNormal.z; vTMoh = instanceMatrix[3].z + uH0; vTFro = fract(sin(instanceMatrix[3].x * 12.9898 + instanceMatrix[3].y * 78.233) * 43758.5453);`);
      sh.fragmentShader = 'uniform float uSnoGrense;\nuniform float uHostLov;\nuniform float uNaken;\nvarying float vTOpp;\nvarying float vTMoh;\nvarying float vTFro;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        float tSno = smoothstep(uSnoGrense - 60.0, uSnoGrense + 60.0, vTMoh) * smoothstep(-0.1, 0.6, vTOpp);
        ${løv ? `vec3 lovFarge = mix(vec3(0.95, 0.72, 0.18), vec3(0.85, 0.32, 0.1), step(0.7, vTFro)) * (0.75 + 0.35 * vTFro);
        diffuseColor.rgb = mix(diffuseColor.rgb, lovFarge, uHostLov * (0.55 + 0.4 * vTFro));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.42, 0.37, 0.33), uNaken * 0.85);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.92, 0.93, 0.96), tSno * uNaken * 0.5);` : `diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9, 0.92, 0.95), tSno * 0.72);`}`);
    };
    // samme funksjonstekst for gran og løv: egen nøkkel, ellers deler de program i three.js-hurtigbufferen
    m.material.customProgramCacheKey = () => 'vær|' + løv + '|' + !!før;
    m.material.needsUpdate = true;
  }
  KROKER.sett3d.push((u, R) => {
    VAER_U.uH0.value = u.h0;
    for (const m of R.treMesh || []) if ([TREGEO.gran, TREGEO['løv'], TREGEO.granEnkel, TREGEO['løvEnkel']].includes(m.geometry)) treVær(m, m.geometry === TREGEO['løv'] || m.geometry === TREGEO['løvEnkel']);
  });

  function lagFall(R) {
    const mob = VW < 700, nR = mob ? 1500 : 4000, nS = mob ? 1500 : 3500;
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nR * 6), 3));
    const regn = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xaab4bf, transparent: true, opacity: .45, depthWrite: false }));
    const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d'), gr = g.createRadialGradient(8, 8, 0, 8, 8, 8);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.5, 'rgba(255,255,255,.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 16, 16);
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nS * 3), 3));
    const snø = new THREE.Points(sg, new THREE.PointsMaterial({ size: .14, map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    for (const o of [regn, snø]) { o.frustumCulled = false; o.visible = false; R.scene.add(o); }
    let f = 99; const rnd = () => (f = (f * 16807) % 2147483647) / 2147483647, B = 45, H = 36;
    const dråper = Array.from({ length: nR }, () => [(rnd() - .5) * 2 * B, (rnd() - .5) * 2 * B, rnd() * H]);
    const fnugg = Array.from({ length: nS }, () => [(rnd() - .5) * 2 * B, (rnd() - .5) * 2 * B, rnd() * H, rnd() * 6]);
    return { regn, snø, dråper, fnugg, B, H };
  }
  let sist = 0;
  KROKER.ramme3d.push(R => {
    const V = window.VAER; if (!V || !R.ut) return;
    const nå = performance.now() / 1000, dt = Math.min(.1, nå - (sist || nå)); sist = nå;
    // den glattede kopien tar igjen reglene (ca. 1,5 s), uavhengig av tempoet
    if (vist && V.regel) { const k = Math.min(1, dt / 1.5); for (const f of VIST) vist[f] += (V.regel[f] - vist[f]) * k; settVist(); }
    // dis: tåke og nedbør trekker disen inn mot kameraet (kamera3d setter den på nytt hver ramme)
    if (V.dis < 1) { const fog = R.scene.fog; fog.far = Math.max(140, fog.far * V.dis); fog.near = Math.min(fog.near * V.dis, fog.far * .25); }
    const c = R.cam.position, bakke = hoyde3d(R.ut.cx + c.x, R.ut.cy + c.y) ;
    if (R.gressMesh && bakke > V.snøgrense) R.gressMesh.visible = false;   // gresset ligger under snøen
    if (!fall && (V.regn > .02 || V.snø > .02)) fall = lagFall(R);
    if (!fall) return;
    if (fall.regn.parent !== R.scene) { R.scene.add(fall.regn, fall.snø); }
    const regn = V.regn > .02, snø = V.snø > .02, høyt = c.z - (bakke - R.ut.h0) * R.EX > 600;
    const vx = Math.cos(V.vind.retning) * V.vind.fart, vy = Math.sin(V.vind.retning) * V.vind.fart;
    fall.regn.visible = regn && !høyt; fall.snø.visible = snø && !høyt; if (høyt || (!regn && !snø)) return;
    const { B, H } = fall, wrap = (v, m) => ((v + m) % (2 * m) + 2 * m) % (2 * m) - m;
    if (regn) { const p = fall.regn.geometry.attributes.position.array;
      // regndråpene driver med vinden og står på skrå (toppen mot vinden)
      const sx = -vx * .06, sy = -vy * .06;
      fall.dråper.forEach((d, k) => { d[2] -= 9 * dt; if (d[2] < 0) d[2] += H; d[0] += vx * dt * .8; d[1] += vy * dt * .8;
        const x = c.x + wrap(d[0] - c.x, B), y = c.y + wrap(d[1] - c.y, B), z = c.z - H / 2 + d[2];
        p.set([x, y, z, x + sx, y + sy, z + .55], k * 6); });
      fall.regn.geometry.setDrawRange(0, 2 * Math.round(fall.dråper.length * Math.min(1, V.regn * (.5 + .5 * (V.styrke || .6)))));
      fall.regn.geometry.attributes.position.needsUpdate = true; }
    if (snø) { const p = fall.snø.geometry.attributes.position.array;
      fall.fnugg.forEach((d, k) => { d[2] -= 1.1 * dt; if (d[2] < 0) d[2] += H; d[3] += dt; d[0] += vx * dt * .6; d[1] += vy * dt * .6;
        const x = c.x + wrap(d[0] + Math.sin(d[3]) * .6 - c.x, B), y = c.y + wrap(d[1] + Math.cos(d[3] * .8) * .5 - c.y, B);
        p[k * 3] = x; p[k * 3 + 1] = y; p[k * 3 + 2] = c.z - H / 2 + d[2]; });
      fall.snø.geometry.setDrawRange(0, Math.round(fall.fnugg.length * Math.min(1, V.snø)));
      fall.snø.geometry.attributes.position.needsUpdate = true; }
  });
  // straks(): 3D viser været med en gang (testene og skjermbildene)
  window.VaerSpill = { S, oppdater, straks() { vist = null; oppdater(); } };
})();
