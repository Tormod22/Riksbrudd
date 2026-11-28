// Vakt for pakka «hverdag» (ut8, 28. nov: hverdagsting og lagring – spill/ting.js, tinglager.js, tinglager-visning.js).
// Setter en hyllereol og et kjøleskap fra byggesettet i leiren og sjekker: leting i et kjøkken gir mat-ting, og tingene havner i hylla;
// mat i kjøleskap (med strøm) holder lenger enn på hylla; folket spiser fra tingene (matlageret fylles og tingene minker); medisin på
// lageret gir raskere heling (FolkRegler.steg med og uten kroken); lagerpanelet viser peanøttsmør (søk). Setter alt tilbake: byggene,
// tinglageret, maten, helsa, moralen, kassa, kartet, panelet og den lagrede nøkkelen.
module.exports = {
  navn: 'hverdagsting og lagring (ut8)',
  kjør: async (pg, profil) => {
    const d = await pg.evaluate(async () => {
      const ut = {}, L = window.LeirSpill && LeirSpill.tilstand(), S = window.OppstartSpill && OppstartSpill.tilstand(), TS = window.TinglagerSpill, TL = window.Tinglager, Ti = window.Ting;
      const F = window.FolkSpill && FolkSpill.tilstand(), BS = window.ByggesettRegler;
      if (!L || !S || !TS || !TL || !Ti || !F || !BS || !window.Byggesett || !TS.klar()) return { mangler: true, L: !!L, TS: !!TS, klar: !!(TS && TS.klar && TS.klar()), F: !!F };
      const T = TS.T(), T0 = JSON.stringify(TL.tilJSON(T)), bygg0 = L.bygg.slice(), neste0 = L.neste, mat0 = F.mat, moral0 = F.moral, helse0 = F.personer.map(p => p.helse), penger0 = S.penger;
      const kam0 = { x: kam.x, y: kam.y, m: kam.m }, lagret0 = localStorage.getItem('riksbrudd-ting'), åpen0 = TS.erÅpen(), heling0 = FolkRegler.tingHeling;
      const nullT = () => { const J = TL.fraJSON(JSON.parse(T0)); T.s = J.s; T.neste = J.neste; T.åpnet = J.åpnet; T.doser = J.doser; T.tapt = J.tapt; };
      try {
        // en hyllereol og et kjøleskap 60 m øst for leiren (deler i byggesettet, ferdige)
        const o = Byggesett.opphav(), U = BS.U, i0 = Math.round((S.leir.x + 60 - o.ox) / U), j0 = Math.round((S.leir.y + 20 - o.oy) / U); let id = Math.max(0, ...L.bygg.map(b => b.id)) + 5000;
        const sett = (type, i, j) => { const q = { type, i, j, a: null, n: 0, r: 0, u: true }, m = BS.midt(o, q), b = { id: id++, type, x: m.x, y: m.y, ret: m.ret, igjen: 0, hp: 1, nivå: 1, pris: 0, bs: BS.plassFor(q) }; L.bygg.push(b); return b; };
        const hylle = sett('bs_hylle_1', i0, j0), kjøl = sett('bs_kjøleskap_1', i0 + 6, j0);
        T.s = []; T.åpnet = {}; T.doser = {};
        const P = TS.plasser(); ut.plasser = P.some(q => q.id === 'b' + hylle.id && q.type === 'hyllereol') && P.some(q => q.id === 'b' + kjøl.id && q.type === 'kjøleskap');
        // 1) leting i et kjøkken gir mat-ting, og de havner i hylla
        const f = Leting.funn('hus', 120, 31, { rom: ['kjøkken'] }), f2 = f.tomt ? Leting.funn('hus', 120, 32, { rom: ['kjøkken'] }) : f;
        ut.kjøkkenMat = !!(f2.ting && f2.ting.some(q => ['mat', 'drikke'].includes(Ti.TING[q.id].kat)));
        const fikk = LeteSpill.ta({ mat: 0, tre: 0, betong: 0, stål: 0, diesel: 0, penger: 0, tomt: false, ting: [{ id: 'peanøttsmør', n: 2 }, ...(f2.ting || [])] });
        ut.iHylla = !!(fikk.ting && fikk.ting.some(q => q.id === 'peanøttsmør' && q.p === 'b' + hylle.id)) && TL.antall(T, 'peanøttsmør') >= 2;
        ut.fant = Ti.fantTekst(fikk.ting || []); ut.fantOk = /^Fant: .*peanøttsmør/.test(ut.fant) || /^Fant: /.test(ut.fant);
        // 2) mat i kjøleskap (med strøm) holder lenger enn på hylla
        const Pk = TL.plasser(Leir, L, { strøm: () => true }), A = TL.ny(); TL.legg(A, Pk, 'melk', 1, 0, { plass: 'b' + kjøl.id }); TL.legg(A, Pk, 'melk', 1, 0, { plass: 'b' + hylle.id });
        TL.eld(A, Pk, 3 * 1440); ut.kjølLenger = A.s.length === 1 && A.s[0].p === 'b' + kjøl.id;
        const sk = A.s[0] ? TL.igjen(A.s[0], Pk.find(q => q.id === 'b' + kjøl.id)) : 0; ut.kjølIgjen = Math.round(sk * 10) / 10;
        // 5) lagerpanelet viser peanøttsmør (søk)
        TS.åpne(true); const inp = document.querySelector('#tingpanel input[type=search]'); inp.value = 'peanøtt'; inp.dispatchEvent(new Event('input')); TS.vis(true);
        const pt = document.getElementById('tingpanel'); ut.panel = pt.classList.contains('på') && /Peanøttsmør/.test(pt.textContent) && getComputedStyle(pt).display !== 'none';
        inp.value = ''; inp.dispatchEvent(new Event('input'));
        // 6) kommandoene: selg ett glass peanøttsmør gir penger, og det er borte fra lageret
        const p0 = S.penger, n0 = TL.antall(T, 'peanøttsmør'), r = TS.kom({ type: 'tingSelg', id: 'peanøttsmør', n: 1 }); ut.selg = !!(r.ok && S.penger > p0 && TL.antall(T, 'peanøttsmør') === n0 - 1);
        // 3) folket spiser fra tingene
        TS.leggInnFunn([{ id: 'hermbønner', n: 6 }, { id: 'knekkebrød', n: 4 }]); F.mat = 0; const før = TS.matIAlt(); TS.steg(2);
        ut.spiser = F.mat > 0 && TS.matIAlt() < før - .1; ut.mat = { før: Math.round(før * 10) / 10, etter: Math.round(TS.matIAlt() * 10) / 10, F: Math.round(F.mat * 10) / 10 };
        // 4) medisin gir raskere heling: ett spilldøgn med en syk person, med og uten antibiotika på lageret
        const heling = async medisin => { T.s = T.s.filter(s => !Ti.TING[s.t].h); T.doser = {}; if (medisin) TS.leggInnFunn([{ id: 'antibiotika', n: 2 }]);
          const Fc = JSON.parse(JSON.stringify(F)), Lc = JSON.parse(JSON.stringify(L)); Fc.mat = 100; Fc.personer[0].helse = .5; Fc.personer[0].oppgave = 'fri';
          F.personer[0].helse = .5; TS.steg(1); const r = FolkRegler.steg(Fc, Lc, 120, { årstid: 'sommer' }); return Fc.personer[0].helse - .5; };
        const uten = await heling(false), med = await heling(true); ut.heling = { uten: Math.round(uten * 1e4) / 1e4, med: Math.round(med * 1e4) / 1e4, f: FolkRegler.tingHeling() };
        ut.medisin = med > uten * 1.2 && FolkRegler.tingHeling() > 1;
      } catch (e) { ut.feil = String(e && e.stack || e).slice(0, 400); }
      finally {
        L.bygg.length = 0; for (const b of bygg0) L.bygg.push(b); L.neste = neste0; nullT(); F.mat = mat0; F.moral = moral0; F.personer.forEach((p, i) => { if (helse0[i] !== undefined) p.helse = helse0[i]; });
        S.penger = penger0; kam.x = kam0.x; kam.y = kam0.y; kam.m = kam0.m; skitten = true; TS.åpne(åpen0); FolkRegler.tingHeling = heling0; TS.steg(.001);
        try { if (lagret0 === null) localStorage.removeItem('riksbrudd-ting'); else localStorage.setItem('riksbrudd-ting', lagret0); } catch (e) { /* sperret */ }
        if (LeirSpill.lagre) LeirSpill.lagre();
      }
      return ut;
    });
    if (d.mangler) return { ok: false, tekst: 'mangler: ' + JSON.stringify(d), data: d };
    const krav = [['plasser', 'hylla og kjøleskapet er lagringsplasser'], ['kjøkkenMat', 'leting i et kjøkken gir mat-ting'], ['iHylla', 'tingene havner i hylla'], ['kjølLenger', 'mat i kjøleskap holder lenger'],
      ['spiser', 'folket spiser fra tingene'], ['medisin', 'medisin gir raskere heling'], ['panel', 'lagerpanelet viser peanøttsmør'], ['selg', 'salg gjennom kommandolaget']];
    const mangler = krav.filter(([k]) => !d[k]).map(([, t]) => t);
    return { ok: !mangler.length && !d.feil, tekst: mangler.length || d.feil ? 'FEIL: ' + mangler.join('; ') + (d.feil ? ' · ' + d.feil : '') : `ok – ${d.fant} Kjøleskapet: ${d.kjølIgjen} døgn igjen; heling ${d.heling.uten} → ${d.heling.med}`, data: d };
  },
};
