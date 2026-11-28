// Vakt for pakka «møbler og hyller» (ut9, 28. nov: spill/interior.js MØBLER + interior3d.js deler, spill/hyller.js, hyller-visning.js,
// ti nye hylletyper i tinglager.js/byggesett.js).
// Sjekker: (1) et hus, et kjøkken og en butikk får de nye møblene, og veggskapene sperrer ikke; (2) hver ny møbeltype har en 3D-modell
// (deler) med høyst 160 klosser, og en hylle i et hus har ting på seg når den er fylt (ingen når den er tom); (3) de nye hyllene i leiren er
// lagringsplasser, peanøttsmør havner på kjøkkenhylla, og modellen (Hyller3d.bygg) har flere klosser med ting enn uten; (4) 2D-symbolene
// tegnes; (5) fyllingstrinnet endres når ting legges inn (så 3D lages på nytt). Setter alt tilbake: byggene, tinglageret og den lagrede nøkkelen.
module.exports = {
  navn: 'flere møbler og hyller med ting (ut9)',
  kjør: async (pg, profil) => {
    const d = await pg.evaluate(async () => {
      const ut = { feil: [] }, ok = (v, t) => { if (!v) ut.feil.push(t); };
      const I = window.Interior, I3 = window.Interior3d, HY = window.Hyller, H3 = window.Hyller3d, TS = window.TinglagerSpill, TL = window.Tinglager, BS = window.ByggesettRegler;
      const L = window.LeirSpill && LeirSpill.tilstand(), S = window.OppstartSpill && OppstartSpill.tilstand();
      if (!I || !I3 || !HY || !H3 || !TS || !TL || !BS || !L || !S || !TS.klar()) return { mangler: true, I: !!I, I3: !!I3, HY: !!HY, H3: !!H3, TS: !!TS, klar: !!(TS && TS.klar && TS.klar()) };
      // (1) planene
      const rekt = (w, h) => [[0, 0], [w, 0], [w, h], [0, h]], dør = (w, b) => ({ x: w * .4, y: 0, ux: 1, uy: 0, w: b });
      const typer = new Set(); let veggSperrer = 0;
      for (const [kl, w, h, n] of [['hus', 11, 9, 6], ['hus', 14, 10, 6], ['leil', 20, 12, 3], ['butikk', 30, 18, 4], ['kontor', 24, 12, 3], ['uthus', 8, 6, 4], ['lager', 20, 10, 3]]) for (let k = 0; k < n; k++) {
        const pl = I.plan(rekt(w, h), { i: 6100 + k * 97 + w * 3, kl, h: 6, dør: dør(w, kl === 'uthus' ? 2.6 : 1.1) }); for (const m of pl.møbler) { typer.add(m.type); if (I.VEGGHENGT[m.type] && m.sperrer) veggSperrer++; } }
      const NYE = ['hjørnesofa', 'peis', 'vitrineskap', 'gyngestol', 'piano', 'skjenk', 'overskap', 'kjøkkenøy', 'vifte', 'oppvaskmaskin', 'krydderhylle', 'barneseng', 'kommode', 'garderobe', 'sminkebord',
        'badekar', 'vaskemaskin', 'speilskap', 'skoskap', 'permreol', 'vannkjøler', 'safe', 'gondol', 'frysedisk', 'drikkekjøler', 'vognrekke', 'stålreol', 'verktøyvegg', 'verkstedbenk', 'luftkompressor', 'dekkstativ'];
      ut.iBruk = NYE.filter(t => typer.has(t)).length; ok(ut.iBruk >= 20, 'bare ' + ut.iBruk + ' nye møbeltyper i prøvebyggene');
      ok(veggSperrer === 0, veggSperrer + ' veggskap sperrer gangen');
      // (2) modellene
      let maksKlosser = 0, utenModell = [];
      for (const t of NYE) { const M = I.MØBLER[t], m = { type: t, b: M[0], d: M[1], h: M[2], f: .37, rolle: 'kjøkken' }, K = I3.deler(m); maksKlosser = Math.max(maksKlosser, K.length);
        // en modell som bare er én grå kloss (reserven i deler) teller som manglende
        if (K.length < 3) utenModell.push(t); }
      ut.maksKlosser = maksKlosser; ok(!utenModell.length, 'uten egen modell: ' + utenModell.join(', ')); ok(maksKlosser <= 160, 'en møbelmodell har ' + maksKlosser + ' klosser (grensen er 160)');
      { const m = f => ({ type: 'stålreol', b: 1.8, d: .6, h: 2.2, f: .41, rolle: 'garasje', fyll: f }), tom = I3.deler(m(0)).length, full = I3.deler(m(1)).length; ut.hylle = { tom, full }; ok(full > tom + 8, 'hylla i huset har ikke ting på seg (tom ' + tom + ', full ' + full + ')'); }
      // (3) leirens hyller: tre nye deler fra byggesettet, med ting
      const T = TS.T(), T0 = JSON.stringify(TL.tilJSON(T)), bygg0 = L.bygg.slice(), neste0 = L.neste, lagret0 = localStorage.getItem('riksbrudd-ting');
      try {
        const o = Byggesett.opphav(), U = BS.U, i0 = Math.round((S.leir.x + 70 - o.ox) / U), j0 = Math.round((S.leir.y - 30 - o.oy) / U); let id = Math.max(0, ...L.bygg.map(b => b.id)) + 6000;
        const sett = (type, i, j) => { const q = { type, i, j, a: null, n: 0, r: 0, u: true }, m = BS.midt(o, q), b = { id: id++, type, x: m.x, y: m.y, ret: m.ret, igjen: 0, hp: 1, nivå: 1, pris: 0, bs: BS.plassFor(q) }; L.bygg.push(b); return b; };
        const kh = sett('bs_kjøkkenhylle_1', i0, j0), sr = sett('bs_stålreol_1', i0 + 2, j0), ts = sett('bs_tønnestativ_1', i0 + 5, j0);
        T.s = []; const P = TS.plasser();
        ut.plasser = ['kjøkkenhylle', 'stålreol', 'tønnestativ'].every(t => P.some(q => q.type === t)); ok(ut.plasser, 'de nye hyllene er ikke lagringsplasser');
        const nøkkel0 = H3.trinnNøkkel();
        const r = TL.legg(T, P, 'peanøttsmør', 6, 0); ut.peanøtt = r.map(q => q.p); ok(r.some(q => q.p === 'b' + kh.id), 'peanøttsmør havnet ikke på kjøkkenhylla (' + ut.peanøtt + ')');
        TL.legg(T, P, 'hammer', 3, 0, { plass: 'b' + sr.id }); TL.legg(T, P, 'flaskevann', 30, 0, { plass: 'b' + ts.id });
        ok(H3.trinnNøkkel() !== nøkkel0, 'fyllingstrinnet endret seg ikke (3D lages ikke på nytt)');
        const tell = b => { let n = 0; const Bg = { boks: () => n++, z3: z => z, gx: 0, gy: 0 }, dd = BS.fraBygg(b, Leir), D = BS.DELER[b.type]; H3.bygg(Bg, dd, D, 0, 1); return n; };
        const fulle = [kh, sr, ts].map(tell); T.s = []; const tomme = [kh, sr, ts].map(tell); ut.klosser = { fulle, tomme };
        ok(fulle.every((n, k) => n > tomme[k]), 'tingene synes ikke på hyllene i leiren (' + fulle + ' mot ' + tomme + ')');
        // (4) 2D-symbolene
        const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
        ut.symboler = ['bs_trehylle_1', 'bs_stålreol_1', 'bs_vitrine_1', 'bs_kjøkkenhylle_1', 'bs_kjølereol_1', 'bs_verktøyskap_1', 'bs_arkivskap_1', 'bs_smalhylle_1', 'bs_hjørnehylle_1', 'bs_tønnestativ_1']
          .filter(t => H3.tegn2d(g, { type: t, r: 0 }, { x: 2, y: 2, w: 60, h: 30 }, BS.DELER[t].ting)).length; ok(ut.symboler === 10, 'bare ' + ut.symboler + ' av 10 hylletyper har eget symbol');
      } catch (e) { ut.feil.push('unntak: ' + String(e && e.stack || e).slice(0, 300)); }
      finally {
        L.bygg.length = 0; for (const b of bygg0) L.bygg.push(b); L.neste = neste0; const J = TL.fraJSON(JSON.parse(T0)); T.s = J.s; T.neste = J.neste;
        try { if (lagret0 === null) localStorage.removeItem('riksbrudd-ting'); else localStorage.setItem('riksbrudd-ting', lagret0); } catch (e) { /* sperret */ }
        if (LeirSpill.lagre) LeirSpill.lagre(); skitten = true;
      }
      return ut;
    });
    if (d.mangler) return { ok: false, tekst: 'mangler: ' + JSON.stringify(d), data: d };
    return { ok: !d.feil.length, tekst: d.feil.length ? 'FEIL: ' + d.feil.join('; ') : `ok – ${d.iBruk} nye møbeltyper i prøvebyggene, største modell ${d.maksKlosser} klosser, hylle i hus ${d.hylle.tom} → ${d.hylle.full} klosser, leirens hyller ${d.klosser.tomme} → ${d.klosser.fulle}, ${d.symboler} symboler`, data: d };
  },
};
