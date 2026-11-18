// VAKT «natur» (18. nov): trær med bladtekstur, gress med vind og lyng, soldater som rører seg, effekter (støv, spor, skudd, kratere,
// brente områder) og fjern skog. Tåler at 3D er av (da prøves bare reglene og at delene finnes) og setter alt tilbake.
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
    const R = typeof R3 !== 'undefined' && R3 && R3.ut && på3d ? R3 : null; ut.i3d = !!R;
    if (!R) return ut;
    const ramme = () => new Promise(r => { const t = setTimeout(r, 2500); requestAnimationFrame(() => { clearTimeout(t); r(); }); });
    // trærne: bladtekstur og uv på de nære modellene, og nettene i scenen bruker den
    const gran = TREGEO.gran, løv = TREGEO['løv'];
    krev(!gran || (gran.userData.blad && gran.attributes.uv), 'grana mangler bladtekstur'); krev(!løv || (løv.userData.blad && løv.attributes.uv), 'bjørka mangler bladtekstur');
    ut.blad = (R.treMesh || []).filter(m => m.material.alphaMap).length; ut.uten = (R.treMesh || []).filter(m => m.geometry.userData.blad && !m.material.alphaMap).length;
    krev(ut.uten === 0, ut.uten + ' trenett med kort uten bladtekstur');
    ut.tre = gran ? gran.attributes.position.count / 3 : 0; krev(!gran || (ut.tre > 40 && ut.tre < 260), 'grana har ' + ut.tre + ' trekanter');
    // soldatene: fem nett med ganglaget
    ut.soldat = (R.solMesh || []).reduce((a, m) => a + m.geometry.attributes.position.count / 3, 0);
    krev(!R.solMesh || (R.solMesh.length === 5 && R.solMesh.every(m => m.geometry.attributes.aLem && m.geometry.attributes.aGang) && ut.soldat > 400 && ut.soldat < 6000), 'soldatfigurene: ' + ut.soldat + ' trekanter');
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
    return ut;
  });
  const ok = !d.feil.length;
  return { ok, tekst: ok ? (d.i3d ? `trær med blad (${d.blad} nett), soldat ${Math.round(d.soldat)} trekanter, effekter og ${d.fjern ? d.fjern.holt : 0} skogholt` : 'reglene (3D var av)') : d.feil.join('; '), data: d };
} };
