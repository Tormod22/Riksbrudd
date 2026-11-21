// VAKT «elv» (runde 15, 21. nov kveld, brukeren: «Har elver vann som er i bevegelse nedover, eller ikke?»):
//  - strømmen i brede elver (spill/elvestrom.js) prøves på EKTE data uten 3D: NVE-midtlinjene for Lågen ved Dombås (BEKKER, reservefila
//    på testsiden), terrenget fra lagVindu (8 m-ruter) og vannet fra terrengklassene (32 m-ruter, klasse 3 = vann). Krav: strøm finnes, høyden stiger aldri langs
//    strømmen, terrenget i enden er ikke høyere enn i starten, ingen strøm midt i åpent vann (innsjø), fart og skum innenfor rimelige tall.
//  - er 3D på og utsnittet har strømlaget: Elvestrom3d.sjekk() – nettet i scenen, 0 biter oppover, 0 punkt i innsjø.
// Endrer ingenting i spillet.
module.exports = { navn: 'elv: strøm nedover i brede elver', kjør: async (pg, profil) => {
  const d = await pg.evaluate(async () => {
    const ut = { feil: [] }, krev = (ok, tekst) => { if (!ok) ut.feil.push(tekst); };
    krev(window.Elvestrom && Elvestrom.bånd && Elvestrom.kjede, 'Elvestrom (spill/elvestrom.js) mangler');
    krev(window.Elvestrom3d && Elvestrom3d.sjekk, 'Elvestrom3d (bekker-visning.js) mangler');
    krev(window.BEKKER && BEKKER.hent, 'BEKKER (bekkedataene) mangler');
    if (ut.feil.length) return ut;
    const bb = [189500, 6892500, 195500, 6898500];
    const biter = await BEKKER.hent(bb, [0, 1]), linjer = [];
    for (const B of biter) for (const l of Bekker.i(B, bb)) if (l.type === 1 && l.orden >= 5) linjer.push({ P: l.P, b: l.b, orden: l.orden });
    ut.linjer = linjer.length; krev(linjer.length >= 5, `fant bare ${linjer.length} elvemidtlinjer ved Dombås`);
    // (fiks 15) terrengklassene finnes bare til z9 (32 m-ruter; lagVindu henter dem ikke finere) – med z11 var alt «land» og det ble aldri
    // strøm. Vannet leses derfor fra z9-vinduet, høyden fra z11 (8 m).
    const v = await lagVindu(bb, false, 11), vk = await lagVindu(bb, false, 9);
    const rute = (w, x, y) => { const i = Math.floor((x - w.x0) / w.r), j = Math.floor((w.y0 - y) / w.r); return i >= 0 && j >= 0 && i < w.w && j < w.h ? j * w.w + i : -1; };
    // (fiks 15) På Dovre-testsiden ligger Lågen IKKE i kartets vannflate (3D-utsnittet ved Dombås har u.harVann = false): elva tegnes der
    // som bekkens vannbånd, som har sin egen rennende krusning. Strømlaget gjelder elver som ligger i kartets vann (Glomma, Nidelva …).
    // For å prøve reglene på ekte NVE-linjer og ekte terreng regnes derfor elva selv som vann: alt innenfor halve NVE-bredden (+ 3 m)
    // fra midtlinjene i ruter på 4 m, i tillegg til vannet i terrengklassene.
    const RB = 4, BW = Math.ceil((bb[2] - bb[0]) / RB), BH = Math.ceil((bb[3] - bb[1]) / RB), band = new Uint8Array(BW * BH);
    for (const l of linjer) { const r = (l.b || 10) / 2 + 3, rc = Math.ceil(r / RB);
      for (let k = 1; k < l.P.length; k++) { const [ax, ay] = l.P[k - 1], [bx2, by2] = l.P[k], n = Math.max(1, Math.ceil(Math.hypot(bx2 - ax, by2 - ay) / 2));
        for (let q = 0; q <= n; q++) { const x = ax + (bx2 - ax) * q / n, y = ay + (by2 - ay) * q / n, ci = Math.floor((x - bb[0]) / RB), cj = Math.floor((bb[3] - y) / RB);
          for (let dj = -rc; dj <= rc; dj++) for (let di = -rc; di <= rc; di++) { const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= BW || j >= BH) continue;
            if (Math.hypot((i + .5) * RB + bb[0] - x, bb[3] - (j + .5) * RB - y) <= r) band[j * BW + i] = 1; } } } }
    const iBand = (x, y) => { const i = Math.floor((x - bb[0]) / RB), j = Math.floor((bb[3] - y) / RB); return i >= 0 && j >= 0 && i < BW && j < BH && band[j * BW + i] === 1; };
    const vann = (x, y) => { if (iBand(x, y)) return true; const k = rute(vk, x, y); return k >= 0 && vk.K[k] === 3; };
    const høyde = (x, y) => { const k = rute(v, x, y); return k >= 0 ? v.H[k] : NaN; };
    // åpent vann: minst 90 % vann innenfor 150 m (prøvepunkter i to ringer)
    const åpent = (x, y) => { let n = 0, s = 0; for (const r of [75, 150]) for (let a = 0; a < 16; a++) { n++; if (vann(x + r * Math.cos(a * Math.PI / 8), y + r * Math.sin(a * Math.PI / 8))) s++; } return s / n >= .9; };
    const elver = Elvestrom.kjede(linjer); ut.elver = elver.length;
    let bitTall = 0, punkt = 0, oppover = 0, iÅpent = 0, enden = 0, skum = 0, fartMaks = 0, fartMin = 99;
    for (const e of elver) for (const b of Elvestrom.bånd(Bekker.myk(e.P), { vann, høyde, b: e.b, orden: e.orden })) {
      bitTall++;
      for (let k = 0; k < b.P.length; k++) { punkt++;
        if (k && b.P[k][2] > b.P[k - 1][2] + 1e-6) oppover++;
        if (b.tone[k] > 0) { if (åpent(b.P[k][0], b.P[k][1])) iÅpent++; fartMaks = Math.max(fartMaks, b.fart[k]); fartMin = Math.min(fartMin, b.fart[k]); }
        if (b.skum[k] > .3) skum++; }
      // terrenget selv (ikke den glattede profilen) i endene av en lang bit
      const L = b.L[b.L.length - 1] - b.L[0];
      if (L > 400) { const z0 = høyde(b.P[0][0], b.P[0][1]), z1 = høyde(b.P[b.P.length - 1][0], b.P[b.P.length - 1][1]); if (z1 > z0 + 2) enden++; }
    }
    Object.assign(ut, { biter: bitTall, punkt, oppover, iÅpent, enden, skum, fart: [+fartMin.toFixed(2), +fartMaks.toFixed(2)] });
    krev(bitTall >= 1 && punkt >= 100, `ingen strøm i Lågen ved Dombås (${bitTall} biter, ${punkt} punkt)`);
    krev(oppover === 0, `strømmen går oppover i ${oppover} punkt`);
    krev(enden === 0, `${enden} lange biter ender høyere i terrenget enn de starter`);
    krev(iÅpent === 0, `${iÅpent} punkt med strøm midt i åpent vann (innsjø)`);
    krev(fartMin >= Elvestrom.REGLER.FART_MIN && fartMaks <= Elvestrom.REGLER.FART_MAKS, `farten utenfor grensene (${fartMin}–${fartMaks} m/s)`);
    // 3D: det som faktisk ligger i utsnittet
    if (typeof R3 !== 'undefined' && R3 && R3.ut && R3.ut.elvStrøm) {
      const s = Elvestrom3d.sjekk(); ut.i3d = s;
      krev(s.iScenen && s.trekanter > 0, 'strømlaget er ikke i 3D-scenen');
      krev(s.oppover === 0 && s.iSjø === 0, `3D: ${s.oppover} punkt oppover, ${s.iSjø} i innsjø`);
    }
    return ut;
  });
  const ok = !d.feil.length;
  return { ok, tekst: ok ? `elv: ${d.elver} elver, ${d.biter} biter med strøm, ${d.punkt} punkt, fart ${d.fart && d.fart.join('–')} m/s, ${d.skum} punkt med skum` + (d.i3d ? `, 3D ${d.i3d.trekanter} trekanter` : '') : d.feil.join('; '), data: d };
} };
