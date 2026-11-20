/* Riksbrudd – kjøretøyene i kolonnene som ordentlige 3D-modeller (17. nov, brukeren: «gjør alt mer detaljert»).
 * Før var hver bil tre klosser (kasse, førerhus, hjul). Nå har hver type sin egen modell i ekte mål (fronten mot +x, origo midt
 * på bakken): lastebil med førerhus, ruter, speil, eksosrør, plan med lemmer og kalesje på bøyler; speiderbil med veltebøyle og
 * maskingevær; stridsvogn med skrå front, belter, løpehjul, skjørt, tårn, kanon med røykavtrekk, luker og røykkastere;
 * rakettartilleri med rørpakke som peker opp; radarbil med hytte, mast og antenne.
 * Én sammenslått geometri per type (hjørnefarger) – index.html (kjøretøy3d) tegner dem som instanser, ett tegnekall per type.
 * THREE finnes først når 3D er åpnet: modellene lages ved første bruk.
 */
(function (rot) {
  'use strict';
  const O = [.3, .36, .24], M = [.22, .27, .18], LYS_O = [.36, .42, .28], SV = [.09, .09, .1], STÅL = [.3, .32, .31], GL = [.42, .56, .64], LYKT = [.96, .94, .8], RØD = [.72, .1, .08], DUK = [.33, .37, .25], DUK2 = [.28, .32, .21];
  const farg = (g, c) => { const n = g.attributes.position.count, f = new Float32Array(n * 3); for (let q = 0; q < n; q++) f.set(c, q * 3); g.setAttribute('color', new THREE.BufferAttribute(f, 3)); return g; };
  // boks med bunnen i z (kan vris om z og vippes om y), rør langs en akse med midten i (x, y, z), hjul med felg og nav
  function boks(d, x, y, z, sx, sy, sz, c, rz, ry) { const g = new THREE.BoxGeometry(sx, sy, sz).toNonIndexed(); if (ry) g.rotateY(ry); if (rz) g.rotateZ(rz); g.translate(x, y, z + sz / 2); d.push(farg(g, c)); }
  function rør(d, x, y, z, r, l, akse, c, seg, r2) { const g = new THREE.CylinderGeometry(r2 === undefined ? r : r2, r, l, seg || 8).toNonIndexed(); if (akse === 'x') g.rotateZ(-Math.PI / 2); else if (akse === 'z') g.rotateX(Math.PI / 2); g.translate(x, y, z); d.push(farg(g, c)); }
  // (runde 10) hjulene er runde dekk med felg og nav (rundHjul under), med færre kanter enn feltbilens (mange av dem står i kolonnene)
  // (runde 11) felgen og navet bare på yttersiden (innsiden ses ikke) – halvparten av trekantene i hjulene, som var de fleste i lastebilene
  function hjul(d, x, y, r, b) { rundHjul(d, x, y, r, b, STÅL, M, 10, Math.sign(y) || 1); }

  // FØRERHUSET på lastebilene (frambygd): x0 = fronten, B = bredden. Ruter, grill, lykter, støtfanger, speil, trinn, dørsprekk, taklys.
  function førerhus(d, x0, B) { const b = B / 2, L = 2.3, xm = x0 - L / 2;
    rundBoks(d, xm, 0, 1.0, L, B - .1, 1.05, .12, O); rundBoks(d, xm - .05, 0, 2.0, L - .1, B - .16, .98, .16, O, { smal: .93 }); rundBoks(d, xm - .05, 0, 2.95, L - .3, B - .3, .1, .04, M);
    boks(d, x0 - .06, 0, 2.1, .08, B - .5, .72, GL, 0, -.12); boks(d, x0 - .03, 0, 2.1, .05, .06, .74, O, 0, -.12);
    for (const s of [-1, 1]) { boks(d, xm + .25, s * (b - .07), 2.12, 1.0, .04, .62, GL); boks(d, xm - .75, s * (b - .07), 2.2, .5, .04, .5, GL);
      boks(d, xm - .3, s * (b - .05), 1.05, .04, .03, 1.85, SV); boks(d, xm + .55, s * (b - .03), 1.75, .16, .04, .05, SV);
      boks(d, xm + .2, s * (b + .02), .62, .9, .22, .06, SV); boks(d, xm + .2, s * (b + .02), .98, .7, .18, .05, SV);
      boks(d, x0 - .25, s * (b + .18), 2.2, .06, .3, .05, SV); boks(d, x0 - .22, s * (b + .34), 2.0, .06, .14, .46, M); boks(d, x0 - .19, s * (b + .34), 2.03, .02, .11, .4, GL);
      boks(d, x0 + .01, s * (b - .42), 1.12, .06, .34, .24, LYKT); boks(d, x0 + .01, s * (b - .13), 1.14, .05, .14, .16, [.9, .55, .1]);
      boks(d, xm - .05, s * (b - .5), 3.03, .14, .12, .08, [.9, .6, .15]); }
    for (let q = -4; q <= 4; q++) boks(d, x0 + .01, q * .1, 1.25, .04, .05, .5, SV);
    boks(d, x0 + .02, 0, 1.2, .03, 1.0, .6, M); boks(d, x0 + .12, 0, .62, .26, B, .34, SV); boks(d, x0 + .26, 0, .7, .05, .5, .16, STÅL);
    boks(d, xm - .05, 0, 3.03, .1, .5, .1, [.2, .3, .6]); }

  // UNDERSTELLET: ramme, aksler med hjul (doble bak), drivstofftank, reservehjul, skjermer med skvettlapper, eksosrør bak førerhuset
  function understell(d, L, B, aksler, x0) { const b = B / 2;
    for (const s of [-1, 1]) boks(d, x0 - L / 2 + .1, s * .45, .78, L - .5, .12, .26, SV);
    for (let x = x0 - 1.2; x > x0 - L + .5; x -= 1.4) boks(d, x, 0, .82, .1, 1.0, .12, SV);
    aksler.forEach((x, i) => { rør(d, x, 0, .56, .09, B - .5, 'y', SV, 6); rør(d, x, 0, .56, .22, .4, 'y', STÅL, 8);
      // (runde 11) doble hjul bak som ett bredt dekk med en rille (to dekk kostet dobbelt så mange trekanter)
      for (const s of [-1, 1]) { if (i > 0) { hjul(d, x, s * (b - .42), .56, .76); rør(d, x, s * (b - .42), .56, .565, .04, 'y', SV, 10); } else hjul(d, x, s * (b - .22), .56, .36);
        boks(d, x, s * (b - .3), 1.16, 1.3, .6, .05, SV); boks(d, x - .68, s * (b - .3), .5, .03, .5, .5, SV); } });
    rør(d, x0 - 3.2, -(b - .32), .78, .3, 1.1, 'x', STÅL, 10); for (const q of [-.4, .4]) rør(d, x0 - 3.2 + q, -(b - .32), .78, .31, .05, 'x', SV, 10);
    boks(d, x0 - 3.3, b - .4, .55, .9, .5, .5, M); boks(d, x0 - 3.3, b - .14, .6, .7, .03, .38, SV);
    rør(d, x0 - 2.5, b - .5, 2.2, .07, 2.5, 'z', STÅL, 8); rør(d, x0 - 2.5, b - .5, 3.1, .1, .5, 'z', SV, 8); rør(d, x0 - 2.5, -(b - .5), 1.9, .2, .7, 'z', SV, 10);
    for (const s of [-1, 1]) { boks(d, x0 - L + .06, s * (b - .3), .86, .06, .3, .2, RØD); boks(d, x0 - L + .06, s * (b - .62), .86, .06, .18, .14, [.9, .55, .1]); }
    boks(d, x0 - L + .08, 0, .58, .12, B - .2, .14, SV); }

  // LASTEBIL (11 m): plan med lemmer, kalesje over planet, baklem med håndtak, tauverk langs siden.
  // (runde 11) kalesjen er én avrundet form (buet tak, runde hjørner) i stedet for flate plater og bøyler som klosser; bøylene ses som
  // svake ribber (litt mørkere bånd) over taket, de flate lemmene er som før
  function lastebil() { const d = [], L = 11, B = 2.55, x0 = L / 2, b = B / 2; førerhus(d, x0, B); understell(d, L, B, [x0 - 1.4, -2.6, -4.0], x0);
    const p0 = x0 - 2.75, p1 = -x0 + .15, pl = p0 - p1, pm = (p0 + p1) / 2;
    boks(d, pm, 0, 1.2, pl, B, .14, M);
    for (const s of [-1, 1]) { boks(d, pm, s * (b - .04), 1.3, pl, .08, .66, O); for (let x = p1 + .3; x < p0; x += 1.25) boks(d, x, s * (b + .005), 1.36, .08, .03, .58, M);
      for (let x = p1 + .6; x < p0; x += 1.5) boks(d, x, s * (b - .05), 2.05, .03, .03, .5, SV, 0, .5); }
    rundBoks(d, pm, 0, 1.5, pl - .1, B - .14, 1.86, .42, DUK, { smal: .96, fin: true });
    for (let x = p1 + .35; x < p0 - .2; x += (pl - .7) / 4) boks(d, x, 0, 3.34, .1, B - 1.1, .03, DUK2);
    boks(d, p1 + .04, 0, 1.3, .08, B, .66, O); boks(d, p1 - .005, 0, 1.75, .02, B - .5, 1.4, DUK2);
    for (const s of [-1, 1]) boks(d, p1 - .02, s * .9, 1.7, .04, .12, .08, STÅL); boks(d, p1 - .1, 0, .98, .2, 1.6, .05, SV);
    return MODELLER.samle(d); }

  // SPEIDERBIL (5,2 m): åpen terrengbil med panser, skrå frontrute, veltebøyle, maskingevær på ring, kanner, reservehjul, antenne
  function speiderbil() { const d = [], b = 1.1;
    rundBoks(d, 0, 0, .55, 4.9, 2.0, .58, .16, O); boks(d, 0, 0, .46, 4.4, 1.5, .12, SV);
    rundBoks(d, 1.6, 0, 1.08, 1.6, 1.86, .3, .12, O); boks(d, 1.6, 0, 1.4, 1.2, .6, .04, M); rundBoks(d, -.7, 0, 1.08, 3.0, 2.0, .42, .12, O);
    boks(d, .72, 0, 1.44, .06, 1.8, .62, GL, 0, -.3); boks(d, .72, 0, 1.44, .08, .06, .64, O, 0, -.3);
    for (const s of [-1, 1]) { boks(d, -.2, s * (b - .1), 1.5, .9, .05, .1, M); boks(d, -.3, s * (b - .08), 1.1, .04, .03, .4, SV);
      for (const x of [1.55, -1.55]) skjerm(d, x, s * (b - .14), .46, .56, .36, M);
      boks(d, 2.46, s * .7, .84, .06, .3, .24, LYKT); boks(d, 2.46, s * .34, .88, .05, .14, .14, [.9, .55, .1]); boks(d, -2.46, s * .78, .9, .06, .2, .24, RØD);
      boks(d, .8, s * (b + .08), 1.56, .1, .06, .2, SV); boks(d, .78, s * (b + .16), 1.62, .05, .16, .22, M);
      boks(d, -.5, s * (b - .14), 1.5, .07, .07, .75, SV); boks(d, -1.9, s * (b - .14), 1.5, .07, .07, .75, SV); boks(d, -1.2, s * (b - .14), 2.24, 1.5, .07, .07, SV);
      for (const x of [-1.5, 1.55]) hjul(d, x, s * (b - .14), .46, .32); }
    boks(d, -.5, 0, 2.24, .07, 1.9, .07, SV); boks(d, -1.9, 0, 2.24, .07, 1.9, .07, SV);
    for (let q = -3; q <= 3; q++) boks(d, 2.45, q * .09, .92, .04, .04, .3, SV);
    boks(d, 2.54, 0, .5, .16, 2.1, .2, SV); boks(d, -2.54, 0, .5, .16, 2.1, .2, SV);
    // seter, ratt, maskingevær på ring med ammunisjonskasse
    for (const s of [-.45, .45]) { boks(d, -.15, s, 1.1, .5, .5, .5, [.2, .22, .17]); boks(d, -.38, s, 1.5, .1, .5, .5, [.2, .22, .17]); }
    rør(d, .45, .45, 1.62, .17, .03, 'x', SV, 10); rør(d, -1.2, 0, 2.3, .45, .06, 'z', STÅL, 14); rør(d, -1.2, 0, 2.45, .05, .3, 'z', SV, 6);
    rør(d, -.75, 0, 2.62, .035, 1.1, 'x', SV, 6); boks(d, -1.25, 0, 2.52, .5, .12, .16, SV); boks(d, -1.2, .2, 2.5, .3, .2, .2, M);
    rør(d, -2.62, 0, 1.2, .42, .26, 'x', SV, 12); rør(d, -2.76, 0, 1.2, .22, .04, 'x', STÅL, 10);
    boks(d, -2.2, -.72, 1.5, .18, .36, .48, [.36, .12, .1]); boks(d, -2.2, .72, 1.5, .18, .36, .48, M); rør(d, -2.3, .9, 2.9, .012, 2.6, 'z', SV, 4);
    boks(d, -1.6, 0, 1.5, .9, 1.2, .3, DUK); return MODELLER.samle(d); }

  // STRIDSVOGN (7,7 m skrog, 3,6 m bred): skrog med skrå front, belter med driv- og løpehjul, skjørt, tårn med kile foran,
  // kanon med røykavtrekk og munningsbrems, to luker, maskingevær, røykkastere, kurv bak, antenner, eksos, lykter, slepevaier.
  // (runde 11) skroget, beltene, skjørtene og tårnet er avrundede former (rundBoks) i stedet for klosser: beltet er en lang, rund løkke
  // rundt hjulene, tårnet smalner oppover og heller bakover foran, kanonkappen er rund. Løpehjulene er skiver på yttersiden.
  function stridsvogn() { const d = [], b = 1.8;
    rundBoks(d, -.2, 0, .5, 6.7, 2.5, .98, .14, O, { skrå: .55 }); boks(d, 3.3, 0, .5, .9, 2.5, .12, M, 0, -.55); boks(d, -3.4, 0, .7, .4, 2.5, .6, M);
    for (const s of [-1, 1]) { const y = s * (b - .3);
      rundBoks(d, 0, y, .02, 7.0, .62, 1.04, .46, SV);
      for (let q = 0; q < 7; q++) { const x = -2.55 + q * .85, g = new THREE.CircleGeometry(.36, 12); g.rotateX(-s * Math.PI / 2); g.translate(x, y + s * .315, .48); d.push(farg(g, M));
        const nv = new THREE.CircleGeometry(.13, 6); nv.rotateX(-s * Math.PI / 2); nv.translate(x, y + s * .325, .48); d.push(farg(nv, STÅL)); }
      for (const x of [3.2, -3.2]) { const g = new THREE.CircleGeometry(.3, 10); g.rotateX(-s * Math.PI / 2); g.translate(x, y + s * .315, .6); d.push(farg(g, STÅL)); }
      rundBoks(d, -.1, s * (b + .02), .6, 6.4, .06, .5, .025, O); for (let q = 1; q < 6; q++) boks(d, -3.3 + q * 1.07, s * (b + .055), .62, .04, .01, .46, M);
      boks(d, 3.5, s * .85, 1.0, .08, .26, .2, LYKT); boks(d, -3.62, s * .9, 1.0, .06, .2, .16, RØD);
      boks(d, .4, s * 1.42, 1.5, 2.2, .04, .04, STÅL); rundBoks(d, -2.3, s * 1.3, 1.46, 1.0, .5, .3, .08, M);
      for (let q = 0; q < 4; q++) rør(d, 1.2 - q * .16, s * 1.32, 2.0 + (q % 2) * .14, .06, .3, 'x', SV, 6);
      boks(d, -3.5, s * .7, 1.2, .3, .7, .2, SV); }
    for (let q = 0; q < 5; q++) boks(d, -2.2 - q * .22, 0, 1.48, .08, 1.8, .04, SV);
    // tårnet: smalner oppover, fronten heller bakover; kanonkappen rund; kurven bak
    rundBoks(d, .2, 0, 1.46, 3.9, 2.5, .76, .24, O, { smal: .84, skrå: .9, fin: true });
    rundBoks(d, -2.0, 0, 1.6, .95, 2.2, .55, .1, M); for (let q = -4; q <= 4; q++) boks(d, -2.5, q * .26, 1.65, .04, .04, .5, SV); boks(d, -2.5, 0, 2.15, .04, 2.2, .04, SV);
    rundBoks(d, 2.15, 0, 1.62, .55, .9, .54, .22, M); rør(d, 4.8, 0, 1.89, .1, 4.6, 'x', O, 10); rør(d, 4.3, 0, 1.89, .15, .9, 'x', M, 10); rør(d, 7.0, 0, 1.89, .13, .3, 'x', SV, 10); rør(d, 2.7, 0, 1.89, .17, .5, 'x', M, 10);
    rør(d, -.1, .6, 2.26, .34, .1, 'z', M, 12); rør(d, -.1, .6, 2.34, .28, .08, 'z', O, 12); rør(d, -.3, -.6, 2.25, .32, .08, 'z', M, 12);
    for (let q = 0; q < 6; q++) boks(d, -.1 + Math.cos(q) * .36, .6 + Math.sin(q) * .36, 2.26, .08, .08, .12, GL);
    rør(d, .3, .6, 2.58, .03, 1.0, 'x', SV, 6); boks(d, -.15, .6, 2.46, .4, .1, .14, SV); boks(d, -.1, .82, 2.46, .26, .18, .18, M);
    rundBoks(d, 1.0, -.7, 2.2, .3, .36, .22, .06, M); boks(d, 1.16, -.7, 2.25, .02, .26, .14, GL);
    rør(d, -1.4, .95, 3.4, .012, 2.4, 'z', SV, 4); rør(d, -1.4, -.95, 3.1, .012, 1.8, 'z', SV, 4);
    return MODELLER.samle(d); }

  // RAKETTARTILLERI (10 m): lastebil med rørpakke (5 × 4 rør) som peker 30° opp og bakover over førerhuset, støtteben, dreieskive
  function rakettartilleri() { const d = [], L = 10, B = 2.6, x0 = L / 2; førerhus(d, x0, B); understell(d, L, B, [x0 - 1.4, -2.2, -3.6], x0);
    boks(d, -1.0, 0, 1.2, 6.6, B - .1, .16, M); rør(d, -1.6, 0, 1.44, .95, .2, 'z', STÅL, 16); rundBoks(d, -1.6, 0, 1.5, 1.2, 1.5, .5, .14, O);
    // (runde 11) rørpakken er en avrundet kasse med rørmunningene som mørke skiver (før: sylindre med lokk – 1200 trekanter)
    const g = [], v = -.5;
    rundBoks(g, 0, 0, 0, 4.6, 2.1, 1.3, .16, O); for (const x of [-1.6, 0, 1.6]) boks(g, x, 0, -.03, .12, 2.18, 1.36, M);
    for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) for (const e of [-1, 1]) { const c = new THREE.CircleGeometry(.15, 8); c.rotateY(e * Math.PI / 2); c.translate(e * 2.305, -.8 + i * .4, .25 + j * .4); g.push(farg(c, SV)); }
    for (const q of g) { q.rotateY(v); q.translate(-1.2, 0, 2.5); d.push(q); }
    for (const sy of [-1, 1]) { rundBoks(d, -1.6, sy * .95, 1.9, .5, .12, 1.0, .05, M); rør(d, -4.3, sy * 1.2, .5, .08, 1.0, 'z', STÅL, 6); boks(d, -4.3, sy * 1.2, 0, .5, .5, .06, SV); rør(d, -.6, sy * .8, 1.9, .06, 1.6, 'z', STÅL, 6); }
    rundBoks(d, 1.6, 0, 1.36, 1.2, 2.2, .7, .12, M); rundBoks(d, 1.6, 0, 2.06, 1.0, .8, .3, .12, DUK); return MODELLER.samle(d); }

  // RADARBIL (9 m): lastebil med hytte (dør, luker, kjøleanlegg), mast med stag og en stor, tiltet antenneflate, aggregat bak
  function radar() { const d = [], L = 9, B = 2.5, x0 = L / 2, b = B / 2; førerhus(d, x0, B); understell(d, L, B, [x0 - 1.4, -2.0, -3.3], x0);
    boks(d, -1.0, 0, 1.2, 6.0, B, .14, M);
    // (runde 11) hytta, taket, antenneflaten og aggregatet er avrundede former
    rundBoks(d, -.2, 0, 1.34, 4.0, B - .06, 2.04, .16, O, { fin: true }); rundBoks(d, -.2, 0, 3.32, 4.1, B, .1, .05, M);
    for (const s of [-1, 1]) { boks(d, .6, s * (b - .02), 2.3, .7, .04, .5, GL); boks(d, -1.0, s * (b - .02), 1.8, .9, .04, .9, M); for (let q = 0; q < 5; q++) boks(d, -1.0, s * (b + .0), 1.9 + q * .15, .8, .05, .04, SV); }
    boks(d, -2.22, 0, 1.4, .05, .9, 1.8, M); boks(d, -2.25, .32, 2.3, .04, .06, .16, STÅL); boks(d, -2.6, 0, 1.0, .7, .8, .06, SV); boks(d, -2.5, 0, .6, .4, .8, .05, SV);
    rundBoks(d, 1.2, 0, 3.42, 1.0, 1.2, .4, .1, STÅL); rør(d, 1.2, 0, 3.84, .4, .04, 'z', SV, 12);
    rør(d, -1.0, 0, 4.9, .14, 3.0, 'z', STÅL, 8, .1); for (const [x, y] of [[1, 0], [-.5, .87], [-.5, -.87]]) { const g = new THREE.CylinderGeometry(.025, .025, 3.2, 4).toNonIndexed(); g.rotateX(Math.PI / 2); g.rotateY(x * .38); g.rotateX(-y * .38); g.translate(-1.0 + x * .6, y * .6, 4.9); d.push(farg(g, SV)); }
    rør(d, -1.0, 0, 6.45, .3, .3, 'z', M, 10); rundBoks(d, -.85, 0, 6.2, .12, 3.4, 1.9, .05, LYS_O, { vri: -.18 }); rundBoks(d, -.95, 0, 6.2, .1, 3.5, 2.0, .05, M, { vri: -.18 });
    for (let q = -3; q <= 3; q++) boks(d, -.78, q * .5, 6.22, .04, .04, 1.86, SV, 0, -.18); for (let q = 0; q < 4; q++) boks(d, -.78 - (q * .5 + .2) * Math.sin(.18) + .02, 0, 6.4 + q * .45, .04, 3.36, .04, SV);
    rundBoks(d, -3.6, 0, 1.34, 1.3, 1.6, 1.0, .12, M); for (let q = 0; q < 5; q++) boks(d, -4.26, 0, 1.5 + q * .15, .03, 1.2, .05, SV); rør(d, -3.6, .5, 2.5, .05, .4, 'z', SV, 6);
    rør(d, .9, -.9, 4.4, .012, 2.0, 'z', SV, 4); return MODELLER.samle(d); }

  // ---------- AVRUNDEDE FORMER (runde 10, 20. nov, brukeren: «bilen ser kantete og billig ut») ----------
  // I stil med de avrundede figurene (spill/figur3d.js): myke normaler, få kanter. Brukes av feltbilen i spill/kjor.js og modellene her.
  // rundBoks: boks med avrundede kanter (radius r) – grid-punktene legges tett inntil kantene og skyves ut på en kule rundt det indre
  // hjørnet, normalen peker rett ut fra det indre. fin = 6 deler per side (ellers 4). Valg: smal = topp-bredden (0..1 av sy),
  // skrå = hvor mye fronten (+x) heller bakover per meter høyde. Bunnen i z, midten i (x, y).
  function rundBoks(d, x, y, z, sx, sy, sz, r, c, valg = {}) {
    r = Math.min(r, sx / 2 - .001, sy / 2 - .001, sz / 2 - .001); const n = valg.fin ? 6 : 4, g = new THREE.BoxGeometry(sx, sy, sz, n, n, n), P = g.attributes.position, N = g.attributes.normal;
    const hx = sx / 2, hy = sy / 2, hz = sz / 2, flytt = (v, h) => { const t = Math.abs(v) / h; if (t > .999) return v; const sg = Math.sign(v);
      if (n === 4) return t > .4 ? sg * (h - r) : v; return t > .55 ? sg * (h - (t > .8 ? .29 * r : r)) : v; };
    for (let i = 0; i < P.count; i++) { let px = flytt(P.getX(i), hx), py = flytt(P.getY(i), hy), pz = flytt(P.getZ(i), hz);
      const cx = Math.max(-hx + r, Math.min(hx - r, px)), cy = Math.max(-hy + r, Math.min(hy - r, py)), cz = Math.max(-hz + r, Math.min(hz - r, pz));
      let dx = px - cx, dy = py - cy, dz = pz - cz; const l = Math.hypot(dx, dy, dz);
      if (l > 1e-6) { dx /= l; dy /= l; dz /= l; px = cx + dx * r; py = cy + dy * r; pz = cz + dz * r; N.setXYZ(i, dx, dy, dz); }
      const tz = (pz + hz) / sz; if (valg.smal) py *= 1 - (1 - valg.smal) * tz; if (valg.skrå && px > 0) px -= valg.skrå * (pz + hz) * (px / hx);
      P.setXYZ(i, px, py, pz); }
    if (valg.vri) g.rotateY(valg.vri); g.translate(x, y, z + hz); d.push(farg(g, c)); return g; }
  // hjulet langs y: dekk med runde skuldre (dreid profil), felg med kant og nav, og noen mønsterklosser i slitebanen
  // ytre = 1 eller −1: felg og nav bare på den siden (en flat skive i stedet for en sylinder); ellers på begge sider som før
  function rundHjul(d, x, y, r, b, felg = STÅL, nav = M, seg = 16, ytre = 0) { const V = THREE.Vector2, h = b / 2, k = Math.min(r * .22, h * .8), P = [];
    const ka = seg < 12 ? 2 : 3; P.push(new V(r * .62, -h)); for (let i = 0; i <= ka; i++) { const a = -Math.PI / 2 + i / ka * Math.PI / 2; P.push(new V(r - k + Math.cos(a) * k, -h + k + Math.sin(a) * k)); }
    for (let i = 0; i <= ka; i++) { const a = i / ka * Math.PI / 2; P.push(new V(r - k + Math.cos(a) * k, h - k + Math.sin(a) * k)); } P.push(new V(r * .62, h));
    const g = new THREE.LatheGeometry(P, seg); g.translate(x, y, r); d.push(farg(g, SV));
    // felgen: en skive med kant, og navet som stikker litt ut (begge sider)
    if (ytre) { const f = new THREE.CircleGeometry(r * .62, seg - 2); f.rotateX(-ytre * Math.PI / 2); f.translate(x, y + ytre * (h - .03), r); d.push(farg(f, felg));
      const nv = new THREE.CylinderGeometry(r * .2, r * .26, .08, 6, 1, true); nv.translate(x, y + ytre * (h + .01), r); d.push(farg(nv, nav)); return; }
    for (const s of [-1, 1]) { const f = new THREE.CylinderGeometry(r * .6, r * .64, .05, seg - 2); f.translate(x, y + s * (h - .02), r); d.push(farg(f, felg));
      const nv = new THREE.CylinderGeometry(r * .2, r * .26, .08, seg < 12 ? 6 : 8); nv.translate(x, y + s * (h + .02), r); d.push(farg(nv, nav)); } }
  // skjerm over hjulet: en avrundet bue (halv torus med flatt, ovalt tverrsnitt) langs hjulet, over navet i høyden zc
  function skjerm(d, x, y, zc, r, b, c) { const g = new THREE.TorusGeometry(r, .09, 6, 12, Math.PI); g.scale(1, 1, b / .18); g.rotateX(Math.PI / 2); g.translate(x, y, zc); d.push(farg(g, c)); }
  // lykt: rund glassflate med mørk ring rundt, langs x (fronten) eller −x (baken)
  function lykt(d, x, y, z, r, c, ret = 1) { const ring = new THREE.CylinderGeometry(r * 1.25, r * 1.3, .08, 12); ring.rotateZ(-Math.PI / 2); ring.translate(x, y, z); d.push(farg(ring, SV));
    const gl = new THREE.SphereGeometry(r, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2); gl.scale(1, .45, 1); gl.rotateZ(-ret * Math.PI / 2); gl.translate(x + ret * .04, y, z); d.push(farg(gl, c)); }
  const form = { rundBoks, rundHjul, skjerm, lykt, farg, FARGE: { O, M, LYS_O, SV, STÅL, GL, LYKT, RØD, DUK, DUK2 } };

  const LAG = { lastebil, speiderbil, stridsvogn, rakettartilleri, radar }, G = {};
  function modell(type) { if (!G[type]) G[type] = (LAG[type] || lastebil)(); return G[type]; }
  rot.Kjoretoy3d = { modell, form, typer: Object.keys(LAG), trekanter: type => modell(type).attributes.position.count / 3 };
})(window);
