// VAKT «stier» (R19-5, stier og merking fra OpenStreetMap):
//  - reglene (Sti3dRegler) og knappen «Stier» i ☰ (VIS.sti) finnes
//  - 2D: tegnStier (kartflis.js) tegner merkede stier røde og umerkede mørke på et prøvelerret
//  - gange: på stien går det fortere enn ved siden av (Sti3d.fart)
//  - 3D (når et utsnitt finnes): et prøveutsnitt med en merket sti gir båndet over terrengnettet, T-merker på stein/varde og
//    vaier på et utsatt strekk; når utsnittet har ekte stier (utveg-flisene lastet), står ingen trær i dem
// Endrer ingenting i spillet (prøvenettene frigjøres straks, VIS.sti settes tilbake).
module.exports = { navn: 'stier: 2D, 3D, merking og fart', kjør: async (pg, profil) => {
  const d = await pg.evaluate(async () => {
    const ut = { feil: [] }, krev = (ok, tekst) => { if (!ok) ut.feil.push(tekst); };
    krev(window.Sti3dRegler && window.Sti3d, 'Sti3dRegler / Sti3d mangler (spill/sti3d.js er ikke lastet)');
    krev(typeof VIS !== 'undefined' && 'sti' in VIS, 'VIS.sti mangler');
    krev([...document.querySelectorAll('#lagmeny button')].some(b => /Stier/.test(b.textContent)), 'knappen «Stier» mangler i ☰');
    krev(typeof tegnStier === 'function', 'tegnStier (kartflis.js) mangler');
    if (ut.feil.length) return ut;
    // 2D: to stier tvers over et lerret på 256 punkt (merket øverst, umerket nederst)
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#a8b48a'; g.fillRect(0, 0, 256, 256);
    tegnStier(g, [{ e: { m: 1, t: 0, s: 2 }, deler: [[[0, 60], [256, 60]]] }, { e: { m: 0, t: 0, s: 1 }, deler: [[[0, 190], [256, 190]]] }], p => p, 14, 1);
    const px = (y) => { const a = g.getImageData(0, y - 1, 256, 3).data; let rød = 0, mørk = 0; for (let k = 0; k < a.length; k += 4) { if (a[k] > 150 && a[k + 1] < 90) rød++; if (a[k] < 110 && a[k + 1] < 90) mørk++; } return { rød, mørk }; };
    const o = px(60), n = px(190); ut.px = { o, n };
    krev(o.rød > 100, 'den merkede stien er ikke rød i 2D');
    krev(n.mørk > 100 && n.rød < 20, 'den umerkede stien er ikke mørk/stiplet i 2D');
    krev(o.rød < 3 * 256 * .95, 'den merkede stien er ikke stiplet');
    // farten på stien
    const R = Sti3dRegler.rutenett([{ P: Sti3dRegler.tett([[0, 0], [60, 0]]), w: .7, t: 0 }]);
    krev(Sti3d.fart({ stiRute: R }, 30, 0) > 1 && Sti3d.fart({ stiRute: R }, 30, 6) === 1, 'gangfarten er ikke høyere på stien');
    // 3D
    if (typeof R3 !== 'undefined' && R3 && R3.ut && R3.scene && window.THREE) {
      const u0 = R3.ut, u = Object.assign({}, u0);
      // en merket sti fra midten 120 m østover, og et strekk med stup like ved (høydene i nettet endres ikke – utsatt prøves på reglene)
      const P = Sti3dRegler.tett([[-60, 10], [60, 10]]);
      u.stier = [{ P, e: { m: 1, t: 0, s: 3, v: 1 }, w: .7, t: 0 }];
      u.stiMerker = [{ type: 'stein', x: -20, y: 11.3, mot: -Math.PI / 2, r: 1 }, { type: 'varde', x: 30, y: 8.7, mot: Math.PI / 2, r: 1 }];
      const r = Sti3d.prøvNett(u); ut.r = r;
      krev(r.slag.bånd === 1 && r.trekanter >= (P.length - 1) * 4, 'stibåndet ble ikke laget');
      krev(r.under === 0, `${r.under} av ${r.punkt} punkt i stibåndet ligger under terrengnettet`);
      krev((r.slag.instanser || 0) >= 4, 'steinen, varden og T-merkene ble ikke laget');
      krev(Sti3dRegler.utsatt(100, 92, 101, 3), 'et stup ved en vanskelig sti gir ikke vaier');
      // ekte stier: ingen trær i stien
      if (u0.stier && u0.stier.length && u0.trær) { let i = 0; const q = (x, y) => { const n2 = Sti3dRegler.nærmest(u0.stiRute, x, y); return n2 && n2.d < -.05; };
        for (const k in u0.trær) { const a = u0.trær[k]; for (let j = 0; j < a.length; j += 5) if (q(a[j], a[j + 1])) i++; }
        ut.ekte = { stier: u0.stier.length, merker: (u0.stiMerker || []).length, trærISti: i }; krev(i === 0, `${i} trær står i stien`); }
    } else ut.uten3d = true;
    return ut;
  });
  return { ok: !d.feil.length, tekst: d.feil.length ? d.feil.join('; ') : `ok (2D rød ${d.px.o.rød} / mørk ${d.px.n.mørk}${d.r ? `, 3D ${d.r.trekanter} trekanter, ${d.r.slag.instanser} merker` : ', uten 3D'}${d.ekte ? `, ekte: ${d.ekte.stier} stier, ${d.ekte.merker} merker` : ''})`, data: d };
} };
