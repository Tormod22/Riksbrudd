// VAKT «virkning i leirbyggene» (R18-B, 23. nov): hvert bygg i Leir.BYGG har en virkningstekst (ikke «kommer senere»), og i en testleir
// kan minst fem ulike virkninger måles: moral, vern mot treff, radar, hindring som sinker, lagerplass, reparasjon av kjøretøy, strøm fra
// generatorhuset, trening og radio. Byggpanelet viser «Virkning: …». Setter alt tilbake (byggene, kjøretøyet, laget, panelet).
module.exports = { navn: 'virkning i leirbyggene: tekst for alle bygg og fem målte virkninger', kjør: async (pg) => {
  const d = await pg.evaluate(() => {
    const ut = { feil: [], målt: {} }, krev = (ok, tekst) => { if (!ok) ut.feil.push(tekst); };
    const LV = window.Leirvirkning, LS = window.LeirvirkningSpill, L = window.LeirSpill && LeirSpill.tilstand();
    if (!LV || !LS || !L) { krev(false, 'Leirvirkning/LeirvirkningSpill/leiren mangler'); return ut; }
    // 1) tekst for alle bygg
    const uten = Object.entries(Leir.BYGG).filter(([id, B]) => { const t = LV.tekst(id, B); return !t || /kommer senere/.test(t); }).map(([id]) => id);
    krev(!uten.length, 'bygg uten virkningstekst: ' + uten.join(', ')); ut.bygg = Object.keys(Leir.BYGG).length;
    const kommer = Object.entries(Leir.BYGG).filter(([, B]) => /kommer senere/.test(B.tekst || '') || /kommer senere/.test(B.virkning || '')).map(([id]) => id);
    krev(!kommer.length, '«kommer senere» står fortsatt: ' + kommer.join(', '));
    // 2) testleiren: bygg rett inn som ferdige (igjen 0) langt fra midten, og alt tilbake etterpå
    const S = OppstartSpill.tilstand().leir, byggFør = L.bygg.slice(), nesteFør = L.neste, lag = ENHETER.find(s => s.side === 'blå' && levende(s) && !s.karakter);
    const kj = (window.KJORETOY || []).find(k => !k.side || k.side === 'blå'), kjFør = kj && { x: kj.x, y: kj.y, skade: kj.skade };
    const lagFør = lag && { x: lag.x, y: lag.y, sti: lag.sti, erf: lag.menn.map(m => m.erf) };
    const X = S.x + 2500, Y = S.y + 2500; let nr = 900000;
    const legg = (type, dx, dy) => { const b = { id: ++nr, nr, type, x: X + dx, y: Y + dy, ret: 0, igjen: 0, totalt: 1, hp: 1, nivå: 1, arbeid: null, mat: {} }; L.bygg.push(b); return b; };
    const fiende = (dx, dy, sti) => ({ navn: 'Prøvefiende', side: 'rød', x: X + dx, y: Y + dy, sti: sti ? [[X, Y]] : null, menn: [{ hp: 1 }] });
    const ild = (a, b) => KROKER.ild.reduce((v, f) => v * f(a, b), 1), fart = s => (KROKER.fart || []).reduce((v, f) => v * f(s), 1), ser = e => { LS.oppdater(); return !!LV.ser(null, Leir, null, e, LS.aktive()); };   // bare byggenes egen sikt (andre vakter kan ha latt droner/kameraer stå)
    try {
      LS.kobl();
      // målingen gjøres i en tom leir (andre vakter kan ha latt bygg stå som alt gir moral, vern …); byggene settes tilbake til slutt
      L.bygg.length = 0; LS.oppdater();
      krev(lag && kj, 'fant ikke et eget lag og et kjøretøy'); if (!lag || !kj) return ut;
      lag.x = X; lag.y = Y; lag.sti = null; kj.x = X + 400; kj.y = Y; kj.skade = .5;
      const e0 = fiende(30, 0), eR = fiende(3000, 0, true), eP = fiende(1200, 5);
      const før = { moral: (FolkSpill.valg().moralTillegg || 0), ild: ild(e0, lag), ser: ser(eR), fart: fart(eP), lager: Leir.lagerplass(L), mast: KontrollromSpill.mast() };
      legg('messe', -200, 0); legg('bålplass', -200, 30); legg('betongbunker', 0, 0); legg('radartårn', 100, 100); legg('piggtråd', 1200, 0);
      legg('lagerhall', -500, 0); legg('garasje', 400, 0); legg('skytebane', 0, 0); legg('kommandosenter', -800, 0);
      LS.oppdater();
      const etter = { moral: (FolkSpill.valg().moralTillegg || 0), ild: ild(e0, lag), ser: ser(eR), fart: fart(eP), lager: Leir.lagerplass(L), mast: KontrollromSpill.mast() };
      ut.før = før; ut.etter = etter;
      if (etter.moral - før.moral >= 6.9) ut.målt.moral = etter.moral - før.moral;
      if (før.ild > 0 && Math.abs(etter.ild / før.ild - .25) < .01) ut.målt.vern = etter.ild / før.ild;
      if (!før.ser && etter.ser) ut.målt.radar = true;
      if (før.fart > 0 && Math.abs(etter.fart / før.fart - .35) < .01) ut.målt.sinke = etter.fart / før.fart;
      if (Math.abs(etter.lager - før.lager - 250) < 1e-6) ut.målt.lager = etter.lager - før.lager;
      if (etter.mast >= Math.max(før.mast, Kontrollrom.LEIR.uten) + 9999) ut.målt.radio = etter.mast - Math.max(før.mast, Kontrollrom.LEIR.uten);
      // en spilltime: garasjen reparerer kjøretøyet, skytebanen trener laget
      const erf0 = lag.menn.filter(m => m.hp > 0).map(m => m.erf || 0); LS.steg(60);
      if (Math.abs(kj.skade - (.5 - .08)) < 1e-6) ut.målt.reparer = .5 - kj.skade;
      const erf1 = lag.menn.filter(m => m.hp > 0).map(m => m.erf || 0);
      if (erf1.length && erf1.every((v, i) => v >= Math.min(LV.REGLER.erfTak, erf0[i] + 2.99) || erf0[i] >= LV.REGLER.erfTak)) ut.målt.trening = erf1[0] - erf0[0];
      // strøm: generatorhuset går som et aggregat på diesel (i en kopi av leiren)
      const K = Leir.ny(); K.drivstoff = 500; K.bygg.push({ id: 1, type: 'generatorhus', x: 0, y: 0, igjen: 0, hp: 1, nivå: 1 }, { id: 2, type: 'kontrollrom', x: 50, y: 0, igjen: 0, hp: 1, nivå: 1 });
      const st = Leir.steg(K, 60, 0); if (st.aggAntall === 1 && st.agg > 7.9 && !st.mangler.size) ut.målt.strøm = st.agg;
      // byggpanelet sier hva bygget gjør
      if (window.LeirSpill.velg) { LeirSpill.velg(nr - 1); const v = document.getElementById('byggvirkning'); krev(v && /Virkning: .*erfaring/.test(v.textContent), 'byggpanelet viser ikke virkningen for skytebanen: ' + (v ? v.textContent : 'mangler')); ut.panel = v ? v.textContent : ''; }
      for (const k of ['moral', 'vern', 'radar', 'sinke', 'lager', 'radio', 'reparer', 'strøm']) krev(k in ut.målt, 'virkningen ble ikke målt: ' + k + ` (før ${JSON.stringify(før)}, etter ${JSON.stringify(etter)}, samfunn ${!!(window.SamfunnSpill && SamfunnSpill.__lvValg)}, leiren ${JSON.stringify(LS.leiren())})`);
      const n = Object.keys(ut.målt).length; krev(n >= 5, `bare ${n} virkninger kunne måles: ${JSON.stringify(ut.målt)} (før ${JSON.stringify(før)}, etter ${JSON.stringify(etter)})`);
    } catch (e) { krev(false, 'feil: ' + e.message); }
    finally {
      L.bygg.length = 0; L.bygg.push(...byggFør); L.neste = nesteFør;
      if (kj && kjFør) Object.assign(kj, kjFør); if (lag && lagFør) { lag.x = lagFør.x; lag.y = lagFør.y; lag.sti = lagFør.sti; lag.menn.forEach((m, i) => { m.erf = lagFør.erf[i]; }); }
      if (window.LeirSpill.velg) LeirSpill.velg(null); if (window.lukkPanel) lukkPanel(); LS.oppdater(); skitten = true;
    }
    return ut;
  });
  const n = Object.keys(d.målt || {}).length;
  return { ok: !d.feil.length, tekst: d.feil.length ? d.feil.join('; ') : `${d.bygg} bygg med tekst, ${n} virkninger målt: ${Object.keys(d.målt).join(', ')}`, data: d };
} };
