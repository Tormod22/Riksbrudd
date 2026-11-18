// VAKT sjøen (spill/sjo.js + sjo-visning.js, nattarbeid 18. nov): med to prøvekaier og et prøvekart av sjøen – kjøp av båt trekker
// penger, ruta går rundt en øy og aldri over land, båten kommer fram, et lag kan gå om bord, fiske gir rasjoner, miner sperrer,
// panelet tegnes. Alt settes tilbake (penger, kaier, båter, lag, panel).
module.exports = { navn: 'sjøen', kjør: async (pg, profil) => {
  const data = await pg.evaluate(async () => { const o = { feil: [] }; if (!window.SjoSpill || !window.Sjo || !window.KaierSpill) { o.feil.push('modulene mangler'); return o; }
    const ok = (b, t) => { if (!b) o.feil.push(t); }, O = OppstartSpill.tilstand(), L = O.leir, K0 = KaierSpill.data(), p0 = O.penger, lagret = localStorage.getItem('riksbrudd-sjo'), åpen = SjoSpill.erÅpen(), valgt0 = valgt;
    const test0 = SjoSpill.test; SjoSpill.test = true; if (!SjoSpill.klar()) SjoSpill.start(); SjoSpill.lagre();
    const lagretNå = localStorage.getItem('riksbrudd-sjo');
    try {
      // to kaier: en stor 500 m øst for leiren og en liten 4,5 km øst
      KaierSpill.settData({ n: 2, navn: ['Prøvehavn', 'Prøvebrygge'], d: [Math.round(L.x) + 500, Math.round(L.y), 3, 200, 1, 4000, 0, 1, 20, 2] });
      // sjøkart: bare vann, med en øy midt i leia
      const r = 32, w = 220, h = 125, v = { x0: L.x - 1000, y0: L.y + 2000, r, w, h, K: new Uint8Array(w * h).fill(3) };
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const x = v.x0 + (i + .5) * r, y = v.y0 - (j + .5) * r; if (x > L.x + 2000 && x < L.x + 2600 && Math.abs(y - L.y) < 600) v.K[j * w + i] = 1; }
      const S = SjoSpill.tilstand(), n0 = S.båter.length;
      ok(SjoSpill.kjøpGrunn(0) && !SjoSpill.kjøpGrunn(1), 'kjøp bare ved kaia nær leiren'); SjoSpill.kai(0); o.kjøpKnapper = document.querySelectorAll('#sjopanel [data-kjop]:not([disabled])').length; ok(o.kjøpKnapper === 3, 'tre båttyper kan kjøpes ved en stor kai (' + o.kjøpKnapper + ')');
      const kj = SjoSpill.kjøp('sjark', 0), bt = kj.båt; ok(bt && S.båter.length === n0 + 1 && OppstartSpill.tilstand().penger === p0 - Sjo.TYPER.sjark.pris, 'sjarken er kjøpt og betalt'); if (!bt) throw new Error('ingen båt');
      ok(SjoSpill.kjøp('lekter', 1).feil, 'lekter kan ikke kjøpes ved en liten kai langt unna');
      const sv = await SjoSpill.seilTilKai(bt, 1, { vindu: v }); o.meter = sv.meter ? Math.round(sv.meter) : sv.feil; ok(sv.meter > 4000 && sv.meter < 5200, 'ruta går rundt øya: ' + o.meter);
      let påLand = 0; if (bt.sti) for (let q = 1; q < bt.sti.length; q++) { const a = bt.sti[q - 1], c = bt.sti[q], nn = Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) / 16); for (let t = 0; t <= nn; t++) { const x = a[0] + (c[0] - a[0]) * t / nn, y = a[1] + (c[1] - a[1]) * t / nn; if (v.K[Math.floor((v.y0 - y) / r) * w + Math.floor((x - v.x0) / r)] !== 3) påLand++; } } ok(påLand === 0, 'ruta holder seg i vann (' + påLand + ')');
      // tegnes i kartet og i panelet uten feil
      SjoSpill.velg(bt); SjoSpill.vis(true); skitten = true; await new Promise(f => requestAnimationFrame(() => requestAnimationFrame(f))); o.panel = /underveis/.test(document.getElementById('sjopanel').textContent); ok(o.panel, 'panelet viser at båten er underveis');
      let fr = null, n = 0; while (!fr && n++ < 2000) fr = Sjo.steg(bt, 1); ok(fr === 'framme' && bt.kai === 1, 'båten kommer fram til kaia'); o.minutter = n;
      // lag om bord
      const s = ENHETER.find(e => e.side === 'blå' && !e.karakter && !e.ombord && levende(e)); if (s) { const før = [s.x, s.y, s.sti]; s.x = bt.x + 30; s.y = bt.y + 20; ok(SjoSpill.gåOmBord(s, bt) && s.påBåt === bt && SjoSpill.omBord(bt).length === 1, 'laget går om bord');
        ok(!KROKER.kanOrdre.every(f => f(s)), 'laget tar ikke ordre om bord'); ok(Sjo.ild({ påBåt: bt }, {}, tid) < 1, 'om bord: dårligere treff'); s.påBåt = null; s.x = før[0]; s.y = før[1]; s.sti = før[2]; s.siktSkitten = true; }
      // fiske og miner
      bt.fisker = true; ok(Sjo.fangst(bt, 60, { vind: 2, årstid: 'vår' }) > 1, 'sjarken fisker'); bt.fisker = false;
      const p1 = OppstartSpill.tilstand().penger; bt.x = L.x + 1500; bt.y = L.y; bt.kai = -1; SjoSpill.miner(bt); ok(S.sperringer.length >= 1 && OppstartSpill.tilstand().penger === p1 - Sjo.REGLER.minePris, 'miner lagt og betalt');
      const bt2 = Sjo.nyBåt(S, 'småbåt', L.x + 500, L.y, 0); const sv2 = await SjoSpill.seilTilKai(bt2, 1, { vindu: v }); ok(sv2.meter && bt2.sti.every(p => Math.hypot(p[0] - (L.x + 1500), p[1] - L.y) > Sjo.REGLER.mineRadius - 40), 'neste båt går utenom minefeltet');
      // havn: varene samler seg og kan lastes
      Sjo.havnSteg(S, [{ id: 'prøve', folk: 3000 }], 7 * 1440); ok(S.havner.prøve && Math.abs(S.havner.prøve.tre - 30) < 1e-6, 'en uke i havna gir 30 tre'); delete S.havner.prøve;
    } catch (e) { o.feil.push('unntak: ' + e.message); }
    // alt tilbake
    for (const s of ENHETER) if (s.påBåt) s.påBåt = null; const p2 = OppstartSpill.tilstand().penger; if (p2 < p0) OppstartSpill.gi(p0 - p2);
    if (lagretNå === null) localStorage.removeItem('riksbrudd-sjo'); else localStorage.setItem('riksbrudd-sjo', lagretNå); SjoSpill.start(); if (lagret === null) localStorage.removeItem('riksbrudd-sjo'); else localStorage.setItem('riksbrudd-sjo', lagret);
    KaierSpill.settData(K0); SjoSpill.test = test0; SjoSpill.vis(åpen); valgt = valgt0; skitten = true; o.penger = OppstartSpill.tilstand().penger === p0; if (!o.penger) o.feil.push('pengene ble ikke satt tilbake'); return o; });
  const ok = data.feil.length === 0;
  return { ok, tekst: ok ? `kjøp, rute rundt øya (${data.meter} m, ${data.minutter} min), om bord, fiske, miner og havn` : data.feil.join('; '), data };
} };
