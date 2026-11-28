// Vakt for pakka «skapene i leirens egne bygg» (ut10, 28. nov: spill/leirskap.js, leirskap-visning.js, skapplassene i tinglager.js,
// skapÅpent i hyller-visning.js, de åpne modellene i interior3d.js).
// Setter et ferdig kjøkken og en brakke i leiren og sjekker: (1) skapene er egne plasser i tinglageret, og byggets standardplass er som før;
// (2) skapene ligger inne i byggene i 2D (planen regnet i kartets meter); (3) trykk på kjøleskapet i 2D åpner Lageret på kjøleskapets plass;
// (4) mens panelet viser plassen, står kjøleskapet åpent (Hyller3d.skapÅpent) med tingene som ligger der, og den åpne modellen har flere
// klosser enn den lukkede; (5) lukk panelet = døra lukkes. Setter alt tilbake: byggene, tinglageret, panelet, kartet og den lagrede nøkkelen.
module.exports = {
  navn: 'skapene i leirens egne bygg (ut10)',
  kjør: async (pg, profil) => {
    const d = await pg.evaluate(async () => {
      const ut = { feil: [] }, ok = (v, t) => { if (!v) ut.feil.push(t); };
      const LS = window.LeirskapSpill, S = window.Leirskap, TS = window.TinglagerSpill, TL = window.Tinglager, H3 = window.Hyller3d, I3 = window.Interior3d, L = window.LeirSpill && LeirSpill.tilstand(), O = window.OppstartSpill && OppstartSpill.tilstand();
      if (!LS || !S || !TS || !TL || !H3 || !I3 || !L || !O || !TS.klar()) return { mangler: true, LS: !!LS, S: !!S, TS: !!TS, H3: !!H3, I3: !!I3 };
      const T = TS.T(), T0 = JSON.stringify(TL.tilJSON(T)), bygg0 = L.bygg.slice(), neste0 = L.neste, kam0 = { x: kam.x, y: kam.y, m: kam.m }, lagret0 = localStorage.getItem('riksbrudd-ting'), åpen0 = TS.erÅpen();
      try {
        let id = Math.max(0, ...L.bygg.map(b => b.id)) + 7000; const ny = (type, dx, dy) => { const b = { id: id++, type, x: O.leir.x + dx, y: O.leir.y + dy, ret: .3, igjen: 0, totalt: 60, pris: 0, mat: {}, nivå: 1, hp: 1, arbeid: null }; L.bygg.push(b); return b; };
        const kj = ny('kjøkken', 90, -70), br = ny('brakke', 110, -70);
        // (1) plassene
        const P = TS.plasser(), id1 = P.map(q => q.id); ut.plasser = id1.filter(q => q.startsWith('b' + kj.id) || q.startsWith('b' + br.id));
        ok(id1.includes('b' + kj.id) && id1.includes('b' + kj.id + '.kjøleskap0') && id1.includes('b' + kj.id + '.kjøleskap1') && id1.includes('b' + br.id + '.garderobe0'), 'skapene er ikke plasser i tinglageret: ' + ut.plasser);
        // (2) skapene i 2D, inne i byggene
        const sk = LS.skap2d().filter(q => q.bygg === kj || q.bygg === br); ut.skap2d = sk.map(q => q.type).join(',');
        ok(sk.some(q => q.type === 'kjøleskap') && sk.some(q => q.type === 'garderobe'), 'skapene finnes ikke i 2D: ' + ut.skap2d);
        ok(sk.every(q => Math.hypot(q.x - q.bygg.x, q.y - q.bygg.y) < 8), 'et skap står utenfor bygget');
        // (3) trykk på kjøleskapet i 2D åpner Lageret på plassen
        const ks = sk.find(q => q.type === 'kjøleskap'); TL.legg(T, P, 'melk', 3, 0, { plass: ks.pid }); TL.legg(T, P, 'brunost', 2, 0, { plass: ks.pid });
        kam.x = ks.x; kam.y = ks.y; kam.m = .08; let tatt = false; for (const f of KROKER.trykk) if (f(ks.x, ks.y)) { tatt = true; break; }
        ut.trykk = { tatt, plass: TS.plass(), åpen: TS.erÅpen() }; ok(tatt && TS.erÅpen() && TS.plass() === ks.pid, 'trykk på kjøleskapet i 2D åpnet ikke Lageret på plassen ' + JSON.stringify(ut.trykk));
        ok(/Kjøleskap/.test(document.getElementById('tingpanel').textContent), 'Lageret viser ikke kjøleskapet');
        // (4) døra står åpen med tingene
        const å = H3.skapÅpent(); ut.åpent = å && { type: å.type, k: å.k, fyll: Math.round(å.fyll * 100) / 100, kat: å.kat.map(q => q.kat).join('/') };
        ok(å && å.i === 9000000 + kj.id && å.type === 'kjøleskap' && å.fyll > 0 && å.kat.length > 0, 'kjøleskapet står ikke åpent med tingene ' + JSON.stringify(ut.åpent));
        const m = { type: 'kjøleskap', b: .62, d: .62, h: 1.85, f: .4, innFyll: å ? å.fyll : 0, innKat: å ? å.kat : [] }, lukket = I3.deler(m).length, åpen = I3.deler({ ...m, åpen: true }).length; ut.klosser = [lukket, åpen];
        ok(åpen > lukket + 3, 'den åpne modellen viser ikke tingene ' + ut.klosser);
        // (5) lukk = døra lukkes
        TS.åpne(false, null); ok(H3.skapÅpent() === null, 'døra lukkes ikke når panelet lukkes');
      } catch (e) { ut.feil.push('unntak: ' + String(e && e.stack || e).slice(0, 300)); }
      finally {
        TS.åpne(false, null); if (åpen0) TS.åpne(true);
        L.bygg.length = 0; for (const b of bygg0) L.bygg.push(b); L.neste = neste0; const J = TL.fraJSON(JSON.parse(T0)); T.s = J.s; T.neste = J.neste;
        kam.x = kam0.x; kam.y = kam0.y; kam.m = kam0.m; skitten = true;
        try { if (lagret0 === null) localStorage.removeItem('riksbrudd-ting'); else localStorage.setItem('riksbrudd-ting', lagret0); } catch (e) { /* sperret */ }
        if (LeirSpill.lagre) LeirSpill.lagre();
      }
      return ut;
    });
    if (d.mangler) return { ok: false, tekst: 'mangler: ' + JSON.stringify(d), data: d };
    return { ok: !d.feil.length, tekst: d.feil.length ? 'FEIL: ' + d.feil.join('; ') : `ok – plassene ${d.plasser.join(', ')}; skap i 2D ${d.skap2d}; åpent ${JSON.stringify(d.åpent)}, klosser lukket/åpent ${d.klosser}`, data: d };
  },
};
