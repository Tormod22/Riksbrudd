// VAKT kysten og kaiene (runde 15, spill/kyst.js + kyst3d.js): ekte kaier bare der kaidataene sier det. Dovre-siden har ingen kyst, så
// vakten lager en kunstig kyst (sjø øst for en buktet strandlinje) og et prøvekaipunkt: (1) reglene gir kaibiter med fronten i vannkanten,
// flatt dekke 1,3–2,6 moh. og utstyr, bare nær kaipunktet; (2) uten kaidata ingen kai; (3) Kyst3d.kaiPlass hever høydegitteret under
// dekket og senker det rett foran fronten (terrenget skrår ikke ned i sjøen der det er kai), og dekket stopper før en veg.
// Alt settes tilbake (kaidataene).
module.exports = { navn: 'kysten og kaiene', kjør: async (pg, profil) => {
  const data = await pg.evaluate(async () => {
    const o = { feil: [] }, ok = (b, t) => { if (!b) o.feil.push(t); };
    if (!window.Kyst || !Kyst.plasserKai || !window.Kyst3d || !Kyst3d.kaiPlass || !window.KaierSpill) { o.feil.push('modulene mangler'); return o; }
    const K0 = KaierSpill.data();
    try {
      // kunstig kyst i lokale meter: land vest for x = strand(y), sjø øst; terrenget stiger 8 cm per meter inn på land
      const strand = y => 40 * Math.sin(y / 90), sjø = (x, y) => x > strand(y), moh = (x, y) => sjø(x, y) ? 0 : Math.max(.4, (strand(y) - x) * .08);
      const kp = { x: strand(100) - 3, y: 100, t: 1, l: 120 };
      const v = { S: 800, cx: 0, cy: 0, mobil: profil !== 'PC', sjø, moh, by: () => true };
      const a = Kyst.plasserKai(Object.assign({ kaier: [kp] }, v)); o.biter = a.biter.length;
      ok(a.biter.length >= 6, 'kaibiter ved kaipunktet: ' + a.biter.length);
      ok(a.biter.every(b => Math.hypot(b.x - kp.x, b.y - kp.y) < 140), 'kai bare nær kaipunktet');
      ok(a.biter.every(b => !sjø(b.x - Math.cos(b.a) * 3, b.y - Math.sin(b.a) * 3) && sjø(b.x + Math.cos(b.a) * 3, b.y + Math.sin(b.a) * 3)), 'fronten står i vannkanten');
      ok(a.biter.every(b => b.z >= 1.3 && b.z <= 2.6), 'dekket 1,3–2,6 moh.');
      ok(Kyst.plasserKai(Object.assign({ kaier: [] }, v)).biter.length === 0, 'ingen kaidata gir ingen kai');
      // 3D-plasseringen på et prøveutsnitt: høydegitter på 4 m, en veg 8 m inn på land langs stranda ved y 60–140
      const N = 401, steg = 4, S = 800, H = new Float32Array(N * N);
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) H[j * N + i] = moh(-S + i * steg, S - j * steg);
      const u = { cx: 1e7, cy: 1e7, S, N, steg, H, h0: 0, hus: null, påVeg: (x, y) => y > 60 && y < 140 && Math.abs(x - (strand(y) - 8)) < 3 };
      KaierSpill.settData({ n: 1, navn: [], d: [Math.round(u.cx + kp.x), Math.round(u.cy + kp.y), 1, 120, 0] });
      const kv = { S, cx: u.cx, cy: u.cy, mobil: v.mobil, sjø, moh: (x, y) => { const fx = (x + S) / steg, fy = (S - y) / steg, i = Math.max(0, Math.min(N - 2, Math.floor(fx))), j = Math.max(0, Math.min(N - 2, Math.floor(fy))); return H[j * N + i]; }, by: () => true };
      const kai = await Kyst3d.kaiPlass(u, kv, []);
      ok(kai && kai.biter.length >= 6, '3D: kaibiter i prøveutsnittet: ' + (kai ? kai.biter.length : 0));
      if (kai) { o.endret = kai.endret;
        let under = 0, foran = 0, n = 0;
        for (const b of kai.biter) { const c = Math.cos(b.a), s = Math.sin(b.a), hv = (l) => kv.moh(b.x + c * l, b.y + s * l);
          n++; if (hv(-1.5) < b.z - .5) under++; if (hv(1.5) > 0) foran++; }
        ok(n && under === 0, `3D: terrenget under dekket er hevet (${under} av ${n} for lavt)`);
        ok(n && foran === 0, `3D: terrenget rett foran fronten er under vannflaten (${foran} av ${n} over)`);
        // dekket stopper før vegen (8 m inn) der vegen går
        const vegBiter = kai.biter.filter(b => b.y > 70 && b.y < 130); o.vegDybde = vegBiter.map(b => b.d);
        ok(vegBiter.length && vegBiter.every(b => b.d < 8), 'dekket stopper før vegen: ' + o.vegDybde.join(','));
      }
      if (typeof THREE !== 'undefined') for (const st of ['betong', 'mur', 'tre']) { const G = Kyst3d.kantGeo(st); ok(G.pos.length > 30 && G.pos.every(Number.isFinite), 'kantGeo ' + st); }
    } catch (e) { o.feil.push('unntak: ' + e.message); }
    finally { KaierSpill.settData(K0); }
    return o;
  });
  return { ok: !data.feil.length, tekst: data.feil.length ? data.feil.join('; ') : `kaier: ${data.biter} biter, gitter endret ${data.endret} punkter`, data };
} };
