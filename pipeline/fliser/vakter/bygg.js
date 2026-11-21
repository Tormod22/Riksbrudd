// Vakt for pakka «bygg» (runde 15, 21. nov: «bygg fra virkeligheten»). Dovre-testsiden har ingen husdata, så vakta lager en liten
// prøveflis med fire bygg (stor steinkirke med sammensatt omriss, sykehjem, legevakt, et lite trehus nær midten) og kjører hus3d på den
// med en lånt hentFlis/hoyde3d (settes tilbake etterpå). Sjekker: steinkirken får steinfasade, valmtak og lavere vegger enn OSM-høyden,
// sykehjem/legevakt får egne klasser og fasader, småhuset får takrenner/vindskier, ingen bygg uten tak, OSM-farge (vf) brukes, og
// reglene for hvite hus, teglrøde tak og bensinstasjoner (Byhus). Endrer ikke spillet (ingen penger, lag eller tid). Tar ca. 1 s.
module.exports = { navn: 'bygg fra virkeligheten (steinkirke, sykehjem/legevakt, hvite trehus, takrenner, bensinstasjoner)', kjør: async (pg, profil) => {
  const d = await pg.evaluate(async () => {
    const ut = { feil: [] }, krev = (ok, t) => { if (!ok) ut.feil.push(t); };
    if (typeof hus3d !== 'function' || !window.Byhus || !Byhus.husFarge || !Byhus.bensinType || !Byhus.steinKirke) return { feil: ['hus3d eller Byhus.husFarge/bensinType/steinKirke mangler'] };
    // reglene
    let hv = 0, hl = 0; for (let i = 1; i <= 2000; i++) { if (Byhus.husFarge('hus', i, 50)) hv++; if (Byhus.husFarge('hus', i, 0)) hl++; }
    ut.hvite = [hv / 2000, hl / 2000]; krev(hv / 2000 > .7 && hl / 2000 < .5, `andelen hvite trehus by/land er ${ut.hvite}`);
    krev(Byhus.bensinType('E', false, 100, 200) !== 'automat' && Byhus.bensinType('K', false, 100, 200) !== 'stor', 'bensinType: automat ved E-veg eller stor ved kommunal veg');
    krev(BYGGTYPE[15] === 'Sykehjem' && /Legevakt/.test(BYGGTYPE[16] || ''), 'BYGGTYPE mangler sykehjem/legevakt');
    // prøveflisa (z13): byggene i flisens enheter (4096 per flis), midt i flisa
    const z = 13, sp = span(z), k = sp / 4096, fx = 1000, fy = 1000, minx = G.x0 + fx * sp, maxy = G.y0 - fy * sp, cx = minx + sp / 2, cy = maxy - sp / 2;
    const enh = pts => pts.map(([x, y]) => [Math.round((x + sp / 2) / k), Math.round((sp / 2 - y) / k)]);
    const lukk = l => [...l, l[0]];
    // kirke: 50 × 30 m med fire støttepilarer (sammensatt omriss, 12 hjørner)
    const kirke = lukk([[-25, -15], [-5, -15], [-5, -16.5], [5, -16.5], [5, -15], [25, -15], [25, 15], [5, 15], [5, 16.5], [-5, 16.5], [-5, 15], [-25, 15]].map(([x, y]) => [x - 80, y + 60]));
    const syk = lukk([[-20, -6], [20, -6], [20, 6], [-20, 6]].map(([x, y]) => [x + 70, y + 60]));
    const lege = lukk([[-12, -9], [12, -9], [12, 9], [-12, 9]].map(([x, y]) => [x - 70, y - 70]));
    const hus = lukk([[-5, -4], [5, -4], [5, 4], [-5, 4]].map(([x, y]) => [x + 15, y - 10]));
    const flis = { hus: { obj: [
      { e: { i: 9100001, t: 8, h: 30 }, deler: [enh(kirke)] }, { e: { i: 9100002, t: 15, h: 9 }, deler: [enh(syk)] },
      { e: { i: 9100003, t: 16, h: 7 }, deler: [enh(lege)] }, { e: { i: 9100004, t: 0, h: 7, vf: 0x3a7a3a + 1, r: 2 }, deler: [enh(hus)] }] } };
    const hf0 = window.hentFlis, hh0 = window.hoyde3d, r30 = typeof R3 !== 'undefined' ? R3 : undefined; let res = null;
    try {
      window.hentFlis = (lag, zz, x, y) => Promise.resolve(lag === 'hus' && zz === z && x === fx && y === fy ? flis : null);
      window.hoyde3d = () => 0;
      if (!R3) R3 = { EX: 1 };
      res = await hus3d({ cx, cy, S: 200, h0: 0 });
    } catch (e) { ut.feil.push('hus3d kastet: ' + e.message); }
    finally { window.hentFlis = hf0; window.hoyde3d = hh0; if (r30 !== undefined) R3 = r30; }
    if (!res) { krev(false, 'hus3d ga ingenting for prøveflisa'); return ut; }
    const P = res.omriss, bygg = n => P.find(q => q.bygg && q.bygg.i === n);
    ut.stat = { fasader: res.stat.fasader, tak: res.stat.tak, utenTak: res.stat.utenTak, lister: res.stat.lister || 0 }; ut.grupper = Object.keys(res.deler);
    krev(P.length === 4, `${P.length} av 4 prøvebygg i hus3d`);
    krev(res.stat.utenTak === 0, `${res.stat.utenTak} bygg uten tak`);
    const K = bygg(9100001);
    krev(K && K.bygg.kl === 'kirke' && res.deler.stein, 'steinkirken fikk ikke steinfasaden (gruppen «stein»)');
    krev(K && K.topp < 30 && K.topp > 15, `steinkirkens topp er ${K && K.topp} m (skal være under OSM-høyden 30 m: lavere vegger, bratt tak)`);
    krev(res.stat.tak && res.stat.tak.deler >= 1, 'steinkirken med sammensatt omriss fikk ikke tak med fall (valm)');
    const S = bygg(9100002), L = bygg(9100003);
    krev(S && S.bygg.kl === 'sykehjem' && L && L.bygg.kl === 'legevakt', `klassene er ${S && S.bygg.kl} / ${L && L.bygg.kl} (ventet sykehjem / legevakt)`);
    krev(['pleie', 'tegl', 'funkis'].some(n => res.stat.fasader[n]), 'sykehjemmet fikk ingen sykehjemsfasade');
    krev((res.stat.lister || 0) >= 1, 'småhuset nær midten fikk ikke takrenner/vindskier');
    // OSM-fargen (vf) på småhuset: grønn vegg i treflaten
    const tre = res.deler.tre; let grønn = 0; if (tre) for (let q = 0; q < tre.kol.length; q += 3) if (Math.abs(tre.kol[q + 1] - .478) < .02 && tre.kol[q] < .3) grønn++;
    krev(grønn > 0, 'veggfargen fra OSM (vf) ble ikke brukt');
    // teksturene for stein og pleie har glass (natt3d tenner dem) – bare når 3D er åpnet (THREE finnes)
    if (typeof THREE !== 'undefined') for (const n of ['stein', 'pleie']) { const t = Byhus.tekstur(n), c = t.image, g = c.getContext('2d'), dd = g.getImageData(0, 0, c.width, c.height).data; let gl = 0;
      for (let q = 0; q < dd.length; q += 4) if (dd[q + 2] > dd[q] + 8) gl++; krev(gl > 50, `teksturen «${n}» har ikke vindusglass`); }
    // bensinstasjonene: alle tre slagene lages uten feil (three.js hentes om 3D ikke er åpnet), og automaten er minst
    if (typeof THREE === 'undefined' && typeof lastThree === 'function') { try { await lastThree(); } catch (e) {} }
    if (typeof THREE !== 'undefined' && window.Anlegg3d) {
      const hh1 = window.hoyde3d, r31 = R3; const typer = {};
      try { window.hoyde3d = () => 0; if (!R3) R3 = { EX: 1 };
        for (const [kv, by, ventet] of [['E', false, 'stor'], ['K', false, 'automat'], ['F', true, 'vanlig']]) {
          for (let n = 0; n < 40 && !typer[ventet]; n++) { const st = { x: n * 13.7, y: 20, k: 12 }, u = { cx, cy, S: 200, h0: 0, veger: [{ k: kv, by, P: [[-150, 0], [150, 0]] }], hus: { omriss: [] } };
            const m = Anlegg3d.bensinstasjon(u, st); if (st.type === ventet) typer[ventet] = m[0].geometry.attributes.position.count;
            for (const x of m) { x.geometry.dispose(); x.material.dispose(); } } }
      } catch (e) { ut.feil.push('bensinstasjon kastet: ' + e.message); }
      finally { window.hoyde3d = hh1; R3 = r31; }
      ut.bensin = typer;
      krev(typer.automat && typer.vanlig && typer.stor, `bensinstasjonene: ${JSON.stringify(typer)} (ventet automat, vanlig og stor)`);
      krev(!(typer.automat >= typer.vanlig) && !(typer.vanlig >= typer.stor), 'automaten skal være minst og den store størst');
    }
    return ut;
  });
  return { ok: !d.feil.length, tekst: d.feil.length ? d.feil.join('; ') : `steinkirke, sykehjem/legevakt, lister og OSM-farge ok (${JSON.stringify(d.stat && d.stat.fasader)})`, data: d };
} };
