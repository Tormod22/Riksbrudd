// Vakt for B5 «fabrikken du bygger selv» (ut5): en sagbenk settes i en hall og produserer, avvises uten vei til bruksplassen,
// flyt i riktig rekkefølge gir +15 %, uten lys om natta går den saktere, og et gammelt sagbruk-bygg virker som før.
// Alt settes tilbake (byggene, lageret, pengene, byggesettet).
module.exports = {
  navn: 'ut5-fabrikk',
  kjør: async (pg) => pg.evaluate(async () => {
    const t0 = performance.now(), d = {}, BS = window.ByggesettRegler, LB = window.Leir, PR = window.Produksjon, FB = window.Fabrikk;
    if (!BS || !FB || !window.FabrikkSpill || !window.Byggesett || !window.LeirSpill) return { ok: false, tekst: 'fabrikken er ikke lastet' };
    const l = LeirSpill.tilstand(), S = OppstartSpill.tilstand(); if (!l || !S) return { ok: false, tekst: 'ingen leir' };
    const før = { n: l.bygg.length, ider: new Set(l.bygg.map(b => b.id)), lager: JSON.stringify(l.lager), penger: S.penger, V: { ...Byggesett.tilstand() } };
    const o = Byggesett.opphav(), U = BS.U;
    let id = Math.max(0, ...l.bygg.map(b => b.id)) + 1000;
    // en ferdig blikkhall 9,6 × 19,2 m med port i sør og nord, 70 m øst for leiren (porten = toPorter)
    function hall(dx, toPorter) {
      const i0 = Math.round((S.leir.x + dx - o.ox) / U / 4) * 4, j0 = Math.round((S.leir.y + 40 - o.oy) / U / 4) * 4;
      const M = BS.lagHus({ navn: 'Vakthall', w: 8, h: 16, s: 4, gulv: 'bs_fundament', stoff: 'blikk', tak: 'bs_tak_blikk', inngang: toPorter ? 'port' : 'dør' });
      const D = M.deler.map(q => ({ ...q }));
      if (toPorter) D.find(q => q.a === 'x' && q.j === 16 && q.i === 4).type = 'bs_vegg_blikk_port_4'; else for (const q of D) if (/_dør_|_vindu_/.test(q.type)) q.type = 'bs_vegg_blikk_4';
      for (const q0 of D) { const q = { ...q0, i: q0.i + i0, j: q0.j + j0, u: true }, m = BS.midt(o, q); l.bygg.push({ id: id++, type: q.type, x: m.x, y: m.y, ret: m.ret, igjen: 0, hp: 1, nivå: 1, pris: 0, bs: BS.plassFor(q) }); }
      return { i0, j0 };
    }
    const sett = async (maskin, i, j, rot) => { Byggesett.åpne(); Byggesett.velg({ fane: 'maskin', maskin, rot, nivå: 'auto' }); const X = o.ox + (i + .5) * U, Y = o.oy + (j + .5) * U;
      Byggesett.trykk(X, Y); await Byggesett.oppdater(); return Byggesett.forslag()[0] || null; };
    try {
      // 1. sagbenken i en hall med to porter: forslaget er godkjent (vei til bruksplassen), bygges og blir en del i leiren
      const H1 = hall(70, true);
      const q = await sett('bs_sagbenk', H1.i0 + 4, H1.j0 + 6, 1); d.forslag = q ? q.feil || 'ok' : 'ingen';
      if (!q || q.feil) return { ok: false, tekst: 'sagbenken ble avvist i hallen: ' + d.forslag, data: d };
      const n = Byggesett.bekreft(true); d.bestilt = n; const sag = l.bygg.find(b => !før.ider.has(b.id) && b.type === 'bs_sagbenk_1');
      if (!sag) return { ok: false, tekst: 'sagbenken ble ikke bestilt', data: d };
      sag.igjen = 0;
      // et lysrør over saga
      const lq = await sett('bs_lysrør', H1.i0 + 3, H1.j0 + 10, 0); if (lq && !lq.feil) { Byggesett.bekreft(true); } const lys = l.bygg.find(b => !før.ider.has(b.id) && b.type === 'bs_lysrør_1'); if (lys) lys.igjen = 0;
      // 2. produserer: én time med tre på maskinene (dagtid, egne tellinger)
      const H = FB.hall(l), I = H.get(sag.id); d.flyt = I && I.flyt; d.flytTekst = I && I.flytTekst; d.rom = I && I.romNavn;
      l.lager.tømmer = 20; const tre0 = l.lager.tre || 0, P = PR.ny();
      const F = FB.faktorer(l, H, { time: 12, virker: () => true }), r = PR.steg(P, l, 60, { kraft: 3, ...F }), s = r.status[sag.id];
      d.går = s && s.går; d.planker = s && s.ut ? Math.round((s.ut.tre || 0) * 1000) / 1000 : 0; d.tekst = s && s.tekst; void tre0;
      // 3. natta uten lys: saktere
      const Fn = FB.faktorer(l, H, { time: 2, virker: () => false }); d.nattFart = Fn.fart[sag.id]; d.dagFart = F.fart[sag.id];
      // 4. uten vei til bruksplassen: en lukket hall uten dør eller port
      const H2 = hall(110, false), q2 = await sett('bs_sagbenk', H2.i0 + 4, H2.j0 + 6, 1); d.utenVei = q2 ? q2.feil || 'godtatt' : 'ingen';
      // 5. et gammelt sagbruk-bygg: som før (1,1 m³ planker i timen)
      const gml = { id: id++, type: 'sagbruk', x: S.leir.x - 200, y: S.leir.y - 200, ret: 0, igjen: 0, hp: 1, nivå: 1 }; l.bygg.push(gml);
      l.lager.tømmer = 20; const t1 = l.lager.tre, r2 = PR.steg(PR.ny(), l, 60, { kraft: 6, ...FB.faktorer(l, FB.hall(l), { time: 2, vinter: true, virker: () => false }) }); d.gammel = r2.status[gml.id] && r2.status[gml.id].ut ? Math.round((r2.status[gml.id].ut.tre || 0) * 1000) / 1000 : 0; void t1; d.gammelFart = r2.status[gml.id] && r2.status[gml.id].fart;
      // 6. fanen Produksjon og Leir-menyen viser hallen
      d.fane = window.ProduksjonSpill ? /I hallen:/.test(ProduksjonSpill.html()) : null;
      const fart = FB.REGLER.flyt, ok = d.flyt === fart && d.går && Math.abs(d.planker - 1.1 * fart) < .02 && d.nattFart < d.dagFart && /bruksplassen/.test(d.utenVei) && Math.abs(d.gammel - 1.1) < .02 && d.gammelFart === 1 && d.fane !== false;
      d.ms = Math.round(performance.now() - t0);
      return { ok: !!ok, tekst: ok ? `sagbenk i hall: ${d.planker} m³/t (flyt ${d.flyt}), natt uten lys ×${Math.round(d.nattFart / d.dagFart * 100) / 100}, uten vei avvist, gammelt sagbruk som før` : 'noe stemmer ikke: ' + JSON.stringify(d), data: d };
    } catch (e) { return { ok: false, tekst: 'feil: ' + e.message, data: d }; }
    finally {
      // alt tilbake
      for (let k = l.bygg.length - 1; k >= 0; k--) if (!før.ider.has(l.bygg[k].id)) l.bygg.splice(k, 1);
      l.lager = JSON.parse(før.lager); const nå = OppstartSpill.tilstand().penger; if (nå < før.penger) OppstartSpill.gi(før.penger - nå); else if (nå > før.penger) OppstartSpill.betal(nå - før.penger);
      Byggesett.velg({ fane: før.V.fane, maskin: før.V.maskin, rot: før.V.rot, nivå: før.V.nivå }); if (!før.V.åpen) Byggesett.lukk();
      if (LeirSpill.lagre) LeirSpill.lagre(); if (typeof skitten !== 'undefined') skitten = true;
    }
  }),
};
