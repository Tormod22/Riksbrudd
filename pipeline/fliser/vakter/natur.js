// VAKT «natur» (18. nov): trær med bladtekstur, gress med vind og lyng, soldater som rører seg, effekter (støv, spor, skudd, kratere,
// brente områder) og fjern skog. Runde 5: stranda (u.strand), planter ikke i hus lagt inn etterpå, låvens innhold (regler). Tåler at 3D er av (da prøves bare reglene og at delene finnes) og setter alt tilbake.
module.exports = { navn: 'natur: trær, gress, figurer, effekter og fjern skog', kjør: async (pg, profil) => {
  const d = await pg.evaluate(async () => {
    const ut = { feil: [] }, krev = (ok, tekst) => { if (!ok) ut.feil.push(tekst); };
    krev(window.Effekter && window.Effekter3d && window.FjernBy && window.FjernBy3d, 'modulene mangler');
    krev(typeof TreDeler === 'object' && typeof TreDeler.kort === 'function', 'TreDeler mangler');
    if (ut.feil.length) return ut;
    // reglene: tolerant lesing av brente områder, underlag, fjern skog
    krev(Effekter.områder(undefined).length === 0 && Effekter.områder([{ x: 1, y: 2 }, { x: 'a' }, null]).length === 1, 'områder() er ikke tolerant');
    krev(Effekter.underlag('asfalt', false, 0).støv === 0 && Effekter.underlag('grus', false, 0).støv === 1, 'underlag');
    krev(FjernBy.inneAndel(1) === 0 && FjernBy.inneAndel(.4) > 0, 'inneAndel');
    krev(window.Kartbilde && typeof Kartbilde.strandG === 'function' && window.Lave3d && typeof Lave3d.plasser === 'function', 'strandG eller Lave3d mangler');
    const R = typeof R3 !== 'undefined' && R3 && R3.ut && på3d ? R3 : null; ut.i3d = !!R;
    if (!R) return ut;
    const ramme = () => new Promise(r => { const t = setTimeout(r, 2500); requestAnimationFrame(() => { clearTimeout(t); r(); }); });
    // trærne: bladtekstur og uv på de nære modellene, og nettene i scenen bruker den
    const gran = TREGEO.gran, løv = TREGEO['løv'];
    krev(!gran || (gran.userData.blad && gran.attributes.uv), 'grana mangler bladtekstur'); krev(!løv || (løv.userData.blad && løv.attributes.uv), 'bjørka mangler bladtekstur');
    ut.blad = (R.treMesh || []).filter(m => m.material.alphaMap).length; ut.uten = (R.treMesh || []).filter(m => m.geometry.userData.blad && !m.material.alphaMap).length;
    krev(ut.uten === 0, ut.uten + ' trenett med kort uten bladtekstur');
    ut.tre = gran ? gran.attributes.position.count / 3 : 0; krev(!gran || (ut.tre > 40 && ut.tre < 260), 'grana har ' + ut.tre + ' trekanter');
    // soldatene: nettene med ganglaget (runde 7: den felles figuren i figur3d.js gir to nett – nær og fjern – i stedet for fem)
    ut.soldat = (R.solMesh || []).reduce((a, m) => a + (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3, 0);
    krev(!R.solMesh || (R.solMesh.length >= 1 && R.solMesh.every(m => m.geometry.attributes.aLem && m.geometry.attributes.aGang) && ut.soldat > 400 && ut.soldat < 6000), 'soldatfigurene: ' + ut.soldat + ' trekanter');
    // gresset: felt-attributtet finnes når gresset er laget
    krev(!R.gressMesh || !!R.gressMesh.geometry.attributes.aFelt, 'gresset mangler aFelt');
    // effekter: krater, brent område, brann og et skudd – og alt bort igjen
    const u = R.ut, førBrent = window.BRENT, førBrann = window.BRANNER, tempoFør = tempo, X = u.cx + 40, Y = u.cy + 30, før = Effekter3d.tall();
    const a = { x: X, y: Y, navn: 'a', side: 'blå', menn: [] }, b = { x: X + 80, y: Y + 40, navn: 'b', side: 'blå', menn: [] }, sk = { a, b, til: performance.now() + 4000 };
    try {
      Effekter3d.krater(X, Y, 4, true); window.BRENT = [{ x: X + 60, y: Y, r: 30 }, { x: X + 120, y: Y, r: 30, t: 5 }, { tull: 1 }]; window.BRANNER = [{ x: X + 60, y: Y, r: 10 }]; SKUDD.push(sk); if (tempo === 0) tempo = 1; if (Effekter3d.oppdater) Effekter3d.oppdater();
      for (let i = 0; i < 4; i++) await ramme();
      const t = Effekter3d.tall(); ut.eff = t;
      krev(t.kratere === før.kratere + 1, 'krateret ble ikke laget'); krev(t.brent >= 1, 'det brente området ble ikke tegnet'); krev(t.partikler > 0, 'ingen røyk eller ild');
      krev(R.effKrater && R.effKrater.count >= 1, 'krateret er ikke i scenen'); krev(t.sporlys > 0 || t.partikler > 5, 'skuddet ga ingenting');
      ut.gl = R.renderer.getContext().getError(); krev(ut.gl === 0, 'GL-feil ' + ut.gl);
    } finally {
      const i = SKUDD.indexOf(sk); if (i >= 0) SKUDD.splice(i, 1); window.BRENT = førBrent; window.BRANNER = førBrann; if (førBrent === undefined) delete window.BRENT; if (førBrann === undefined) delete window.BRANNER;
      Effekter3d.tøm(); tempo = tempoFør; for (let i = 0; i < 2; i++) await ramme();
    }
    krev(Effekter3d.tall().brent === 0 || (førBrent && førBrent.length), 'det brente området ble ikke ryddet');
    // fjern skog: ingen holt svever eller står nær midten
    const f = FjernBy3d.sjekk(); ut.fjern = f; krev(f && f.svever === 0 && f.nær === 0 && f.iScene, 'fjern skog: ' + JSON.stringify(f)); krev(f && f.trekanter < 130000, 'fjern skog har for mange trekanter');
    // RUNDE 5: stranda er laget på nytt i utsnittet (et tall når utsnittet har vann), og vannmasken finnes
    ut.strand = u.strand; krev(!u.harVann || typeof u.strand === 'number', 'stranda ble ikke laget (u.strand ' + u.strand + ')'); krev(u.vannData && u.vannData.W > 0, 'vannmasken mangler');
    // RUNDE 5: planter og gress står ikke i et hus som legges inn etter at utsnittet er bygget (R3.hindre)
    { const x0 = 70, y0 = -90, P = [[x0, y0], [x0 + 12, y0], [x0 + 12, y0 + 10], [x0, y0 + 10]], o = { P }, nøkler = [];
      for (let a = Math.floor(x0 / 20); a <= Math.floor((x0 + 12) / 20); a++) for (let q = Math.floor(y0 / 20); q <= Math.floor((y0 + 10) / 20); q++) { const k = a + ',' + q; if (!R.hindre.has(k)) R.hindre.set(k, []); R.hindre.get(k).push(o); nøkler.push(k); }
      try { ut.friInne = Vegetasjon3d.fri(x0 + 6, y0 + 5); ut.friUte = Vegetasjon3d.fri(x0 - 14, y0 + 5) || Vegetasjon3d.fri(x0 + 26, y0 + 5) || Vegetasjon3d.fri(x0 + 6, y0 - 14);
        krev(ut.friInne === false, 'en blomst kan stå inne i et hus lagt inn etterpå'); }
      finally { for (const k of nøkler) { const A = R.hindre.get(k), q = A ? A.indexOf(o) : -1; if (q >= 0) A.splice(q, 1); } } }
    // RUNDE 5: låven – innholdet (høyloft, høy, redskap, trillebår, gråtass) i en prøvelåve når du går
    { const L = Lave3d.plasser(Interior.plan([[0, 0], [16, 0], [16, 10], [0, 10]], { i: 5151, kl: 'låve', h: 8, dør: { x: 8, y: 0, ux: 1, uy: 0, w: 3 } }), () => false, () => true);
      ut.låveRegler = L && { loft: !!L.loft, høy: L.høy.length, redskap: L.redskap.length, traktor: !!L.traktor };
      krev(L && L.loft && L.høy.length > 5 && L.redskap.length >= 3 && L.trillebår, 'låvens plasser: ' + JSON.stringify(ut.låveRegler));
      // nettet for to prøvelåver (høy og lav himling) lages uten feil og med få trekanter
      for (const [h, i] of [[8, 5151], [3.4, 77]]) { const pl = Interior.plan([[0, 0], [16, 0], [16, 10], [0, 10]], { i, kl: 'låve', h, dør: { x: 8, y: 0, ux: 1, uy: 0, w: 3 } }); pl.gulv = 0;
        const n = Lave3d.prøvNett(pl); (ut.låveNett = ut.låveNett || []).push(n); krev(n && n.tall && n.trekanter > 300 && n.trekanter < 6000, 'låvenettet: ' + JSON.stringify(n)); } }
    return ut;
  });
  const ok = !d.feil.length;
  return { ok, tekst: ok ? (d.i3d ? `trær med blad (${d.blad} nett), soldat ${Math.round(d.soldat)} trekanter, effekter, ${d.fjern ? d.fjern.holt : 0} skogholt, strand ${d.strand}, ingen blomst i prøvehus, låve ${(d.låveNett || []).map(n => n && n.trekanter).join('/')} trekanter` : 'reglene (3D var av)') : d.feil.join('; '), data: d };
} };
