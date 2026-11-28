'use strict';
// VAKT for «maskiner i egen fabrikk» (ut9-maskiner2, 28. nov): flishogger, filetmaskin, ballepresse og steinknuser i byggesettet.
// (1) Delene finnes i byggesettet (fanen Maskin viser dem) og i Leir.BYGG som maskiner, og har ikon (Ikoner.BYGG).
// (2) En flishogger settes i en blikkhall med to porter, godtas og bestilles; ferdig gjør den tømmer om til flis i én time (Produksjon.steg).
//     Selvtest: uten tømmer står den («tom for tømmer»).
// (3) I 3D (når 3D er på): hallen med de fire maskinene tegnes med modellene (flere bokser enn den gamle ene kassen) uten feil.
// Alt settes tilbake (byggene, lageret, pengene, byggesettet).
module.exports = {
  navn: 'ut9-maskiner2 (maskiner i egen fabrikk)',
  kjør: async (pg) => pg.evaluate(async () => {
    const d = {}, BS = window.ByggesettRegler, LB = window.Leir, PR = window.Produksjon, feil = [], ok = (v, t) => { if (!v) feil.push(t); };
    if (!BS || !window.Byggesett || !window.LeirSpill || !PR) return { ok: false, tekst: 'byggesettet/produksjonen er ikke lastet' };
    const l = LeirSpill.tilstand(), S = OppstartSpill.tilstand(); if (!l || !S) return { ok: false, tekst: 'ingen leir' };
    const NYE = ['bs_flishogger', 'bs_filetmaskin', 'bs_ballepresse', 'bs_knuser'];
    const før = { ider: new Set(l.bygg.map(b => b.id)), lager: JSON.stringify(l.lager), penger: S.penger, V: { ...Byggesett.tilstand() } };
    const o = Byggesett.opphav(), U = BS.U; let id = Math.max(0, ...l.bygg.map(b => b.id)) + 2000;
    try {
      // (1) delene, knappene og ikonene
      for (const t of NYE) { const B = LB.BYGG[t + '_1']; ok(B && B.maskin && PR.REGLER.maskiner[B.maskinType], t + ' mangler i Leir.BYGG eller reglene'); }
      Byggesett.åpne(); Byggesett.velg({ fane: 'maskin' }); await new Promise(r => setTimeout(r, 300));
      { const kn = [...document.querySelectorAll('#byggesett .faner button')].find(b => /maskin/i.test(b.textContent)); if (kn) kn.click(); await new Promise(r => setTimeout(r, 300)); }
      const tekst = (document.getElementById('byggesett') || document.body).textContent; d.knapper = ['Flishogger', 'Filetmaskin', 'Ballepresse', 'Steinknuser'].filter(n => tekst.includes(n));
      ok(d.knapper.length === 4, 'fanen Maskin viser ikke de nye maskinene: ' + d.knapper.join(', '));
      d.ikoner = NYE.filter(t => window.Ikoner && Ikoner.BYGG[t + '_1'] && Ikoner.har(Ikoner.BYGG[t + '_1'])).length; ok(d.ikoner === 4, 'ikonene mangler (' + d.ikoner + ' av 4)');
      // (2) en hall med to porter og en flishogger
      const i0 = Math.round((S.leir.x + 70 - o.ox) / U / 4) * 4, j0 = Math.round((S.leir.y - 60 - o.oy) / U / 4) * 4;
      const M = BS.lagHus({ navn: 'Prøvehall', w: 8, h: 16, s: 4, gulv: 'bs_fundament', stoff: 'blikk', tak: 'bs_tak_blikk', inngang: 'port' });
      const D = M.deler.map(q => ({ ...q })); const p2 = D.find(q => q.a === 'x' && q.j === 16 && q.i === 4); if (p2) p2.type = 'bs_vegg_blikk_port_4';
      for (const q0 of D) { const q = { ...q0, i: q0.i + i0, j: q0.j + j0, u: true }, m = BS.midt(o, q); l.bygg.push({ id: id++, type: q.type, x: m.x, y: m.y, ret: m.ret, igjen: 0, hp: 1, nivå: 1, pris: 0, bs: BS.plassFor(q) }); }
      const sett = async (maskin, i, j, rot) => { Byggesett.velg({ fane: 'maskin', maskin, rot, nivå: 'auto' }); Byggesett.trykk(o.ox + (i + .5) * U, o.oy + (j + .5) * U); await Byggesett.oppdater(); return Byggesett.forslag()[0] || null; };
      const lagt = {};
      for (const [t, i, j] of [['bs_flishogger', 2, 3], ['bs_filetmaskin', 2, 8], ['bs_ballepresse', 5, 3], ['bs_knuser', 5, 9]]) { const q = await sett(t, i0 + i, j0 + j, 1); d[t] = q ? q.feil || 'ok' : 'ingen';
        if (q && !q.feil) { Byggesett.bekreft(true); const b = l.bygg.find(x => !før.ider.has(x.id) && x.type === t + '_1'); if (b) { b.igjen = 0; lagt[t] = b; } } }
      ok(lagt.bs_flishogger, 'flishoggeren ble ikke godtatt i hallen: ' + d.bs_flishogger);
      d.lagt = Object.keys(lagt).length;
      if (lagt.bs_flishogger) { const L = l, b = lagt.bs_flishogger;
        L.lager.tømmer = 10; const f0 = L.lager.flis || 0, r = PR.steg(PR.ny(), L, 60, { kraft: 6 }), s = r.status[b.id]; d.flis = Math.round(((L.lager.flis || 0) - f0) * 100) / 100; d.går = s && s.tekst;
        ok(s && s.går && d.flis > .5, 'flishoggeren laget ikke flis: ' + JSON.stringify({ tekst: d.går, flis: d.flis }));
        L.lager.tømmer = 0; const s2 = PR.steg(PR.ny(), L, 60, { kraft: 6 }).status[b.id]; d.selvtest = s2 && s2.tekst; ok(s2 && !s2.går && /tømmer/.test(s2.tekst), 'selvtest: uten tømmer gikk den likevel: ' + d.selvtest); }
      // (3) 3D
      const i3d = typeof på3d !== 'undefined' && på3d;
      if (i3d && typeof R3 !== 'undefined' && R3 && R3.ut) { const adv = [], gml = console.error; console.error = (...q) => { adv.push(q.join(' ')); gml.apply(console, q); };
        try { if (LeirSpill.oppdater3d) LeirSpill.oppdater3d(); if (window.Byggesett.lag3d) Byggesett.lag3d(); await new Promise(r => setTimeout(r, 1500)); } finally { console.error = gml; }
        let n = 0; R3.scene.traverse(m => { if (m.userData && m.userData.byggesett) n += m.geometry.attributes.position.count / 3; }); d.trekanter = n;
        ok(!adv.length, '3D: feil når hallen tegnes: ' + adv.slice(0, 2).join(' | ')); ok(n > 0, '3D: byggesettet tegnet ingenting');
      } else d.i3d = 'ikke prøvd (3D er av)';
    } catch (e) { feil.push('feil: ' + e.message); }
    finally {
      for (let k = l.bygg.length - 1; k >= 0; k--) if (!før.ider.has(l.bygg[k].id)) l.bygg.splice(k, 1);
      l.lager = JSON.parse(før.lager); const nå = OppstartSpill.tilstand().penger; if (nå < før.penger) OppstartSpill.gi(før.penger - nå); else if (nå > før.penger) OppstartSpill.betal(nå - før.penger);
      Byggesett.velg({ fane: før.V.fane, maskin: før.V.maskin, rot: før.V.rot, nivå: før.V.nivå }); if (!før.V.åpen) Byggesett.lukk();
      if (LeirSpill.lagre) LeirSpill.lagre(); if (typeof skitten !== 'undefined') skitten = true;
      if (typeof på3d !== 'undefined' && på3d && LeirSpill.oppdater3d) LeirSpill.oppdater3d();
    }
    return { ok: !feil.length, tekst: feil.length ? feil.join('; ') : `knapper ${d.knapper.length}, ikoner ${d.ikoner}, ${d.lagt} maskiner satt i hallen, flishogger ${d.flis} m³ flis/t, selvtest «${d.selvtest}»` + (d.trekanter ? `, 3D ${Math.round(d.trekanter)} trekanter` : ', 3D ikke prøvd'), data: d };
  }),
};
