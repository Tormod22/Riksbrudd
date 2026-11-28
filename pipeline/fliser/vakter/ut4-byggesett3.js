// VAKT ut4-byggesett3 (B4, byggesett versjon 3): en vegg på 1,2 m-rutenettet bygges, et for bredt tretak avvises med grunnen og godtas
// med en søylerad, en trapp til 2. etasje kobles (Vei.finn går opp), hallmalen kan legges ut, og et gammelt byggesett-bygg (2,4 m) virker
// etter lasting. Alt settes tilbake (penger, lager, byggene, verktøylinja).
module.exports = {
  navn: 'byggesett 3 (1,2 m, etasjer, spenn, trapp, hall, gamle bygg)',
  kjør: async (pg) => {
    const r = await pg.evaluate(async () => {
      const L = window.LeirSpill && LeirSpill.tilstand(), S = window.OppstartSpill && OppstartSpill.tilstand();
      if (!L || !S || !window.Byggesett || !window.ByggesettRegler) return { ok: false, tekst: 'spillet eller byggesettet mangler' };
      const BR = ByggesettRegler, d = {}, feil = [], krev = (b, t) => { if (!b) feil.push(t); };
      const penger0 = S.penger, lager0 = { ...L.lager }, før = new Set(L.bygg.map(b => b.id)), romBruk0 = L.romBruk ? { ...L.romBruk } : null, V0 = { ...Byggesett.tilstand() };
      const logg0 = window.logg; window.logg = () => {};
      try {
        OppstartSpill.gi(5e7); for (const k of ['tre', 'betong', 'stål']) L.lager[k] = 400;
        Byggesett.åpne(); const o = Byggesett.opphav(), X = i => o.ox + i * BR.U, Y = j => o.oy + j * BR.U;
        // 1) en vegg på 1,2 m-rutenettet (verktøylinja: Vegg, tre, hel)
        Byggesett.velg({ fane: 'vegg', stoff: 'tre', variant: 'hel', nett: 1, nivå: 'auto' }); Byggesett.trykk(X(50) + .6, Y(50) + .05); await Byggesett.oppdater();
        let F = Byggesett.forslag(); d.veggForslag = F.length && F[0].d ? [F[0].d.type, F[0].d.s, F[0].feil || null] : null;
        krev(F.length === 1 && !F[0].feil && F[0].d.type === 'bs_vegg_tre_1' && F[0].d.s === 1, 'veggen på 1,2 m ble ikke foreslått: ' + JSON.stringify(d.veggForslag));
        d.vegg = Byggesett.bekreft(false); const vb = L.bygg.find(b => !før.has(b.id) && b.type === 'bs_vegg_tre_1');
        krev(d.vegg === 1 && vb && vb.bs && vb.bs.g === 1 && vb.bs.i === 50 && vb.bs.j === 50, 'veggen ble ikke bygget med plassen i 1,2 m-ruter (' + JSON.stringify(vb && vb.bs) + ')');
        krev(/1,2 m/.test(document.getElementById('byggesett').textContent), 'verktøylinja viser ikke pris per 1,2 m');
        // 2) spennet: rom på 8,4 × 8,4 m i tre (reglene med leirens deler), tretaket avvises med grunnen, og godtas med en søylerad
        let D = Byggesett.deler(); let n = 0; const legg = liste => { for (const q of liste) if (!q.feil) { if (q.bytt) D = D.filter(x => x.id !== q.bytt); D.push({ ...q.d, id: 'vk' + n++ }); } };
        const i0 = 70, j0 = 70, P = (i, j) => [X(i) + .1, Y(j) + .1];
        legg(BR.forslag(D, 'bs_tregulv_1', BR.rad(o, 'bs_tregulv_1', P(i0, j0), P(i0 + 6, j0 + 6))));
        legg(BR.forslag(D, 'bs_vegg_tre_1', BR.rad(o, 'bs_vegg_tre_1', [X(i0), Y(j0)], [X(i0 + 7), Y(j0 + 7)])));
        const tak = BR.forslag(D, 'bs_tak_flatt_1', BR.rad(o, 'bs_tak_flatt_1', P(i0, j0), P(i0 + 6, j0 + 6))); d.spenn = (tak.find(q => q.feil) || {}).feil || null;
        krev(tak.length === 49 && tak.every(q => /Spennet er 8,4 m/.test(q.feil || '') && /søylerad/.test(q.feil)), 'for bredt tretak ble ikke avvist med grunnen (' + d.spenn + ')');
        legg(BR.forslag(D, 'bs_søyle_tre_1', BR.rad(o, 'bs_søyle_tre_1', [X(i0 + 4), Y(j0)], [X(i0 + 4), Y(j0 + 7)])));
        const tak2 = BR.forslag(D, 'bs_tak_flatt_1', BR.rad(o, 'bs_tak_flatt_1', P(i0, j0), P(i0 + 6, j0 + 6))); d.medSøyle = tak2.filter(q => q.feil).length;
        krev(d.medSøyle === 0, 'med søylerad ble tretaket fortsatt avvist (' + (tak2.find(q => q.feil) || {}).feil + ')');
        // 3) trapp til 2. etasje: Vei.finn går opp
        D = []; n = 0; const k0 = 90, l0 = 90;
        legg(BR.forslag(D, 'bs_fundament_1', BR.rad(o, 'bs_fundament_1', P(k0, l0), P(k0 + 3, l0 + 2))));
        for (const e of [0, 1]) legg(BR.forslag(D, 'bs_vegg_betong_1', BR.rad(o, 'bs_vegg_betong_1', [X(k0), Y(l0)], [X(k0 + 4), Y(l0 + 3)]), { nivå: e }));
        legg(BR.forslag(D, 'bs_vegg_betong_dør_1', [BR.kantVed(o, X(k0 + 2) + .6, Y(l0) + .05)]));
        const tp = BR.plassering(D, 'bs_trapp_1', { i: k0, j: l0 + 1, r: 0 }); krev(!tp.feil, 'trappa fikk ikke plass: ' + tp.feil); legg([tp]);
        legg(BR.forslag(D, 'bs_betongdekke_1', BR.rad(o, 'bs_betongdekke_1', P(k0, l0), P(k0 + 3, l0 + 2)), { nivå: 1 }));
        legg(BR.forslag(D, 'bs_tak_betong_1', BR.rad(o, 'bs_tak_betong_1', P(k0, l0), P(k0 + 3, l0 + 2)), { nivå: 1 }));
        const K = Vei.lag({ deler: D.map(q => ({ ...q, ferdig: true })), opphav: o, start: [X(k0 + 2), Y(l0 - 4)], prøve: true });
        const v = Vei.finn({ x: X(k0 + 2), y: Y(l0 - 4) }, { x: X(k0 + 3) + .6, y: Y(l0 + 1) + .6, e: 2, hus: 'leir' }, { kart: K });
        d.trapp = v.ok ? { lengde: Math.round(v.lengde), etasjer: [...new Set(v.punkter.map(p => p.e))] } : v.grunn;
        krev(v.ok && v.punkter.some(p => p.e === 1) && v.punkter[v.punkter.length - 1].e === 2, 'veien går ikke opp trappa til 2. etasje (' + JSON.stringify(d.trapp) + ')');
        const m = Bygning.fraByggesett(D, o); krev(m && m.trapper.length === 1 && !m.trapper[0].antatt, 'Bygning-modellen har ikke trappa');
        // 4) hallmalen kan legges ut (verktøylinja: Hus, hall)
        Byggesett.velg({ fane: 'hus', hus: 'hall', rot: 0 }); Byggesett.trykk(X(120) + .1, Y(-40) + .1); await Byggesett.oppdater(); F = Byggesett.forslag();
        d.hall = [F.length, F.filter(q => q.feil).length, (F.find(q => q.feil) || {}).feil || null];
        krev(F.length === BR.HUS.hall.deler.length && F.every(q => !q.feil) && F.some(q => BR.kat(q.d) === 'søyle') && F.some(q => q.d.type === 'bs_vegg_blikk_port_4'), 'hallmalen kan ikke legges ut (' + JSON.stringify(d.hall) + ')');
        // 5) et gammelt byggesett-bygg (2,4 m, typer uten «_s», plassen i 2,4 m-ruter) virker etter lasting
        let id = 990000; const gml = (type, i, j, a, nn, rr) => L.bygg.push({ id: id++, type, x: o.ox + i * 2.4, y: o.oy + j * 2.4, ret: 0, igjen: 0, totalt: 60, pris: 1, mat: {}, hp: 1, nivå: 1, nr: 0, arbeid: null, bs: { i, j, a, n: nn, ...(rr !== undefined ? { r: rr } : {}) } });
        const a0 = -60, b0 = -60;
        for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { gml('bs_fundament', a0 + i, b0 + j, null, 0); gml('bs_tak_sal', a0 + i, b0 + j, null, 1, 0); }
        for (let i = 0; i < 4; i++) { gml(i === 1 ? 'bs_vegg_tre_dør' : 'bs_vegg_tre', a0 + i, b0, 'x', 0); gml('bs_vegg_tre', a0 + i, b0 + 3, 'x', 0); }
        for (let j = 0; j < 3; j++) { gml('bs_vegg_tre', a0, b0 + j, 'y', 0); gml('bs_vegg_tre_vindu', a0 + 4, b0 + j, 'y', 0); }
        LeirSpill.lagre(); const L2 = Leir.fraJSON(localStorage.getItem('riksbrudd-k2')), rom2 = L2 ? BR.rom(BR.fraLeir(L2, Leir).filter(q => q.id >= 990000)) : [];
        d.gammel = rom2.map(q => [q.navn, q.areal, q.senger]);
        krev(rom2.length === 1 && rom2[0].brukbart && rom2[0].senger === 8 && Math.abs(rom2[0].areal - 69.1) < .2, 'det gamle bygget er ikke et rom etter lasting (' + JSON.stringify(d.gammel) + ')');
        krev(Byggesett.rom().some(q => q.senger === 8 && Math.abs(q.areal - 69.1) < .2), 'Byggesett.rom() finner ikke den gamle brakka');
        // plantegningen har egne bygg med etasjer
        Byggesett.velg({ fane: 'plan', planE: 1 }); const pm = Byggesett.planModell(); d.plan = pm ? pm.etasjer.length : 0; krev(d.plan >= 1, 'plantegningen har ingen etasjer');
      } catch (e) { feil.push('unntak: ' + e.message); }
      finally {
        L.bygg = L.bygg.filter(b => før.has(b.id)); for (const k of Object.keys(L.lager)) L.lager[k] = lager0[k] || 0; if (romBruk0) L.romBruk = romBruk0; else delete L.romBruk;
        const S2 = OppstartSpill.tilstand(); if (S2.penger > penger0) OppstartSpill.betal(S2.penger - penger0); else if (S2.penger < penger0) OppstartSpill.gi(penger0 - S2.penger);
        Byggesett.velg({ fane: V0.fane || 'vegg', hus: V0.hus || 'hytte', nett: V0.nett || 1, malValg: false }); if (!V0.åpen) Byggesett.lukk();
        try { LeirSpill.lagre(); if (LeirSpill.oppdater3d) LeirSpill.oppdater3d(true); } catch (e) { /* uten 3D */ }
        window.logg = logg0;
      }
      d.penger = OppstartSpill.tilstand().penger === penger0;
      return { ok: !feil.length && d.penger, tekst: feil.length ? feil.join('; ') : `vegg 1,2 m bygget, tretak 8,4 m avvist («${d.spenn}») og godtatt med søylerad, trapp opp (${JSON.stringify(d.trapp)}), hall ${d.hall[0]} deler, gammel brakke ${JSON.stringify(d.gammel)}`, data: d };
    });
    return r;
  },
};
