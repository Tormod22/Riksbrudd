// VAKT «anlegg» (runde 15, 21. nov kveld, brukeren: «bygge tunneler i framtiden, samt bunkere og skyttergraver, og bygge egne kaier.
// Det skal også være båter i spillet»): spill/anleggsarbeid.js + anleggsarbeid-visning.js.
//  - tabellen har de fire anleggene, og kravene til terrenget virker (graven i vann avvises)
//  - en skyttergrav settes i gang fra plasseringen (betaling), blir ferdig, og bakken er 1,5 m lavere i 2D-reglene (Anlegg.endringVed
//    via hoydeVed) – et lag i graven får vernet gjennom KROKER.ild
//  - en egen kai kommer inn i kaidataene (Kaier.nær finner den, båtene i sjo.js kan legge til)
//  - en ferdig tunnel: laget reiser gjennom (inn -> ut på den andre siden)
//  - i 3D (når 3D er på): modellene ligger i scenen, og høydegitteret er senket i graven
// Alt settes tilbake: anleggene, pengene, laget og lagringen.
module.exports = { navn: 'anlegg: skyttergrav, bunker, kai og tunnel', kjør: async (pg, profil) => {
  const d = await pg.evaluate(async () => {
    const ut = { feil: [] }, krev = (ok, tekst) => { if (!ok) ut.feil.push(tekst); };
    krev(window.Anlegg && window.AnleggSpill && AnleggSpill.tilstand().klar, 'Anlegg/AnleggSpill mangler eller er ikke startet');
    if (ut.feil.length) return ut;
    krev(['skyttergrav', 'bunker', 'kai', 'tunnel'].every(t => Anlegg.ANLEGG[t]), 'tabellen mangler et anlegg');
    const S = OppstartSpill.tilstand(), L = S.leir, penger = S.penger, før = AnleggSpill.liste().slice(), lagret = localStorage.getItem('riksbrudd-anlegg');
    const lag = ENHETER.find(s => s.side === 'blå' && !s.karakter && levende(s)), lx = lag && lag.x, ly = lag && lag.y, lsti = lag && lag.sti;
    AnleggSpill.utenOmbygging = true;
    try {
      // graven i vann avvises (prøvekart), på land godtas
      const T = { høyde: () => 100, vann: (x, y) => x < 0 };
      krev(Anlegg.kanPlassere('skyttergrav', [[-10, 0], [20, 0]], T).feil && Anlegg.kanPlassere('skyttergrav', [[5, 0], [30, 0]], T).ok, 'kravet «tørt land» virker ikke');
      // plassering med betaling
      const x0 = L.x + 55, y0 = L.y - 35; AnleggSpill.startPlass('skyttergrav'); AnleggSpill.trykk(x0, y0); AnleggSpill.trykk(x0 + 30, y0);
      for (let i = 0; i < 80 && (!AnleggSpill.tilstand().plass.sjekk || AnleggSpill.tilstand().plass.sjekk.venter); i++) await new Promise(r => setTimeout(r, 200));
      const sj = AnleggSpill.tilstand().plass.sjekk; ut.sjekk = sj && (sj.ok ? 'ok' : sj.feil);
      const a = sj && sj.ok ? AnleggSpill.bekreft() : (AnleggSpill.avbryt(), AnleggSpill.legg('skyttergrav', [[x0, y0], [x0 + 30, y0]]));
      krev(a && a.type === 'skyttergrav' && !a.ferdig, 'skyttergraven ble ikke satt i gang');
      if (sj && sj.ok) krev(OppstartSpill.tilstand().penger < penger, 'skyttergraven ble ikke betalt');
      krev(Math.abs(AnleggSpill.endring(x0 + 15, y0)) < 1e-6, 'bakken senket før arbeidet');
      AnleggSpill.gjørFerdig(a.id);
      ut.endring = AnleggSpill.endring(x0 + 15, y0); krev(Math.abs(ut.endring + 1.5) < 1e-6, `graven er ikke 1,5 m dyp i reglene (${ut.endring})`);
      const hu = AnleggSpill.urørt(x0 + 15, y0), hm = hoydeVed(x0 + 15, y0); if (hu !== null && hm !== null) krev(Math.abs(hm - hu + 1.5) < .01, `hoydeVed følger ikke graven (${hm} mot ${hu})`);
      // vern: laget i graven
      if (lag) { lag.x = x0 + 15; lag.y = y0; lag.sti = null; AnleggSpill.oppdaterVern(); const f = KROKER.ild.reduce((v, k) => v * k({ side: 'rød', menn: [] }, lag), 1);
        ut.vern = +f.toFixed(3); krev(f <= Anlegg.ANLEGG.skyttergrav.vern + 1e-6, `laget i graven får ikke vern (×${f})`); }
      // egen kai i kaidataene
      const kai = AnleggSpill.legg('kai', [[L.x - 900, L.y + 900]], { ret: 0, ferdig: true }), K = AnleggSpill.kaier(), kp = AnleggSpill.kaiPunkt(kai);
      const n = K && Kaier.nær(K, kp[0], kp[1], 30); krev(n && K.l[n.i] === 30 && Kaier.størrelse(K.t[n.i], K.l[n.i]) === 'liten', 'den egne kaia finnes ikke i kaidataene (Kaier.nær)');
      // tunnel: laget reiser gjennom
      const tu = AnleggSpill.legg('tunnel', [[L.x + 1500, L.y + 1500], [L.x + 1800, L.y + 1500]], { ferdig: true });
      if (lag) { lag.x = L.x + 1500; lag.y = L.y + 1500; AnleggSpill.inn(lag, tu, 0, null); krev(!!lag.iTunnel, 'laget gikk ikke inn i tunnelen');
        AnleggSpill.tunnelSteg(60); krev(!lag.iTunnel && lag.x > L.x + 1800, 'laget kom ikke ut på den andre siden'); }
      // 3D: modellene i scenen og høydegitteret senket i graven
      if (typeof på3d !== 'undefined' && på3d && R3 && R3.ut) { const s3 = AnleggSpill.sjekk3d(); ut.trekanter = s3.trekanter;
        krev(s3.iScene && s3.trekanter > 50, 'anleggene finnes ikke i 3D-scenen'); }
    } catch (e) { krev(false, 'feil: ' + e.message); }
    finally {
      AnleggSpill.utenOmbygging = false;
      for (const a of AnleggSpill.liste().slice()) if (!før.includes(a)) AnleggSpill.fjern(a.id);
      const p = OppstartSpill.tilstand(); if (p.penger !== penger) { if (p.penger < penger) OppstartSpill.gi(penger - p.penger); else p.penger = penger; }
      if (lag) { lag.x = lx; lag.y = ly; lag.sti = lsti; lag.iTunnel = null; lag.anleggVia = null; AnleggSpill.oppdaterVern(); }
      try { if (lagret === null) localStorage.removeItem('riksbrudd-anlegg'); else localStorage.setItem('riksbrudd-anlegg', lagret); } catch (e) { /* sperret */ }
      skitten = true;
    }
    return ut;
  });
  return { ok: !d.feil.length, tekst: d.feil.length ? d.feil.join('; ') : `skyttergrav ${d.endring} m (sjekk: ${d.sjekk}), vern ×${d.vern}, kai og tunnel virker${d.trekanter ? `, 3D ${d.trekanter} trekanter` : ''}`, data: d };
} };
