// Vakt for pakka «ut2-balanse» (28. nov, økonomitesten docs/natt/ut1-okotest.md): betalingen i spillet er rettet.
// 1) den første kontrakten betaler 1,5 mill. kr, uten bot, og teksten sier det samme tallet;
// 2) en eskorte tatt og levert i spillet betaler det reglene sier (strekket fra -> til med tak, × risiko, × nivå, × prisstigning), og
//    kassa vokser med akkurat det; teksten sier «rolig … lav» eller «bakhold … betaler godt»; ingen eskorte på nivå 1 over 2 mill.;
// 3) en røverbølge som slås tilbake i spillet, gir Trussel.belønning (150 000 kr for den første, høyst 400 000), og rapporten sier tallet;
// 4) påfyll av tilbud når Selskapet åpnes tomt: høyst én gang per døgn, ikke etter to leverte.
// Setter alt tilbake: selskapet, kassa, lagene, kjøretøyene, røverbølgen, moralen, test-flaggene og lagringen.
module.exports = {
  navn: 'ut2-balanse',
  kjør: async (pg, profil) => pg.evaluate(async () => {
    const feil = [], d = {}, krev = (b, t) => { if (!b) feil.push(t); };
    const SK = window.Selskap, SS = window.SelskapSpill, SP = window.SpilletSpill, Sp = window.Spillet, OS = window.OppstartSpill;
    if (!SK || !SS || !SS.tilstand || !SP || !SP.angrep || !Sp || !Sp.Trussel || !OS) return { ok: false, tekst: 'Selskap, SelskapSpill, SpilletSpill eller Spillet mangler', data: {} };
    const kr = v => Math.round(v).toLocaleString('nb-NO').replace(/ /g, ' ') + ' kr';
    const penger = () => OS.tilstand().penger, settPenger = v => { const p = penger(); if (p > v) OS.betal(p - v); else if (p < v) OS.gi(v - p); };
    const før = { penger: penger(), S: SS.tilstand() ? SK.tilJSON(SS.tilstand()) : null, enh: ENHETER.slice(), kj: (window.KJORETOY || []).slice(), tid, tempo,
      lager: Object.keys(localStorage).filter(n => /^riksbrudd-(selskap|trussel)/.test(n)).map(n => [n, localStorage.getItem(n)]),
      T: SP.T ? JSON.parse(JSON.stringify(SP.T())) : null, moral: window.FolkSpill && FolkSpill.tilstand() ? FolkSpill.tilstand().moral : null,
      test: [SS.test, SP.test], logg: typeof loggLinjer !== 'undefined' ? loggLinjer.slice() : null, slutt: window.ForsvarSpill ? ForsvarSpill.slutt : null };
    try {
      // ---------- 1) den første kontrakten ----------
      { const S0 = SK.ny(OS.tilstand().leir), k = SK.førsteKontrakt(S0, 'blå', tid, SS.steder ? SS.steder() : [], { x: OS.tilstand().leir.x + 600, y: OS.tilstand().leir.y + 700 });
        d.første = k ? k.betaling : null;
        krev(k && k.betaling === 1500000 && k.bot === 0, `den første kontrakten betaler ${k ? kr(k.betaling) : '–'} (skal være 1 500 000 kr, ingen bot)`);
        krev(k && SK.TRÅD[0].tekst(k).includes('1 500 000 kr'), 'teksten for den første kontrakten sier ikke 1 500 000 kr'); }
      // ---------- 2) en eskorte gjennom spillet ----------
      const S = SS.tilstand(); if (!S) throw new Error('selskapet er ikke startet');
      // spillets steder (tettsteder og bruer rundt leiren); er kartet ikke lastet ennå, to prøvesteder 4 og 12 km unna
      let st = SS.steder ? SS.steder() : []; d.steder = st.length;
      if (st.length < 2) st = [{ navn: 'Prøvebygd', x: S.leir.x + 4000, y: S.leir.y, slag: 'tettsted', id: 'ut2a' }, { navn: 'Prøveby', x: S.leir.x - 2000, y: S.leir.y + 12000, slag: 'tettsted', id: 'ut2b' }];
      const R = SK.REGLER, infl = SP.M && SP.M() && SP.M().infl > 0 ? SP.M().infl : 1;
      let esk = null, nEsk = 0, maksN1 = 0;
      for (let i = 0; i < 40; i++) { const T = SK.ny(S.leir); T.sider.blå.rykte = { ...S.sider.blå.rykte };
        for (const k of SK.lagTilbud(T, 'blå', tid, st, SK.lagRand(i * 31 + 5), { infl })) { if (k.type !== 'eskorte') continue; nEsk++;
          const strekk = Math.hypot(k.sted.x - k.fra.x, k.sted.y - k.fra.y), f = k.risiko === 'bakhold' ? R.RISIKO.bakhold.faktor : R.RISIKO.rolig.faktor;
          const venta = Math.round(SK.betaling('eskorte', T.sider.blå.rykte, T.sider.blå.pris, strekk, 0, R.NIVÅER[k.nivå - 1].faktor, infl) * f / 1e4) * 1e4;
          if (Math.abs(k.betaling - venta) > 2e4) feil.push(`eskorten «${k.tittel}» betaler ${kr(k.betaling)}, reglene sier ${kr(venta)}`);
          if (k.nivå === 1) maksN1 = Math.max(maksN1, k.betaling);
          const tk = SK.kravTekst(k); if (k.risiko === 'rolig' ? !/rolig, så betalingen er lav/.test(tk) : !/bakhold/.test(tk)) feil.push(`teksten for «${k.tittel}» sier ikke risikoen`);
          if (!esk) esk = k; } }
      d.eskorter = nEsk; d.maksNivå1 = maksN1;
      krev(nEsk > 0, 'ingen eskortetilbud på testsiden');
      krev(maksN1 <= 2e6 * Math.max(1, infl), `en eskorte på nivå 1 betaler ${kr(maksN1)} (høyst 2 mill.)`);
      if (esk) {
        // legg tilbudet i spillets selskap, ta det (bil settes ut) og lever det: kassa skal vokse med betalingen
        esk.id = 'ut2-' + Date.now(); esk.nivå = 1; esk.for = 'blå'; S.tilbud.push(esk);
        const p0 = penger(), g = SS.ta(esk.id);
        if (!g || !g.ok) feil.push('eskorten kunne ikke tas: ' + ((g && g.grunn) || '–'));
        else { const h = SS.lever(esk.id, true), inn = penger() - p0; d.eskorte = { betaling: esk.betaling, inn, risiko: esk.risiko };
          krev(h && h.kr === esk.betaling, 'leveringen gir ikke betalingen fra tilbudet');
          // et eget tettsted gir 25 % ekstra (kobling) – testsidens leir har ingen, så inn skal være lik betalingen
          krev(inn === esk.betaling || inn === esk.betaling + Math.round(esk.betaling * R.egetSted / 1e4) * 1e4, `kassa vokste med ${kr(inn)}, eskorten betalte ${kr(esk.betaling)}`); } }
      // ---------- 4) påfyll ----------
      { const T = SK.ny(S.leir); krev(SK.påfyll(T, 1, 'blå') && !SK.påfyll(T, 1, 'blå'), 'påfyll mer enn én gang per døgn'); T.sider.blå.sum.levert = 2; krev(!SK.påfyll(T, 2, 'blå'), 'påfyll etter to leverte'); }
      // ---------- 3) en røverbølge slås tilbake ----------
      const Tr = Sp.Trussel; SP.test = true; let u = null;
      if (window.ForsvarSpill && ForsvarSpill.slutt) ForsvarSpill.slutt = x => { u = x; };
      const nr = SP.T().bølge + 1, ok = await SP.angrep();
      if (ok === false) feil.push('røverbølgen kom ikke i gang');
      else { const lag = ENHETER.filter(e => e.raid === nr); for (const e of lag) for (const m of e.menn) m.hp = 0;
        const p0 = penger(); SP.angrepSteg(); const inn = penger() - p0, b = Tr.belønning(nr); d.røvere = { nr, lag: lag.length, inn, belønning: b, tekst: u && u.tok };
        krev(b <= 4e5 && Tr.belønning(1) === 150000 && Tr.belønning(99) === 4e5, `røverbelønningen er ${kr(b)} for bølge ${nr} (150 000 for den første, høyst 400 000)`);
        krev(inn === b, `kassa vokste med ${kr(inn)} etter en slått bølge, belønningen er ${kr(b)}`);
        krev(!u || (u.tok || '').replace(/\D/g, '') === String(b), `rapporten sier «${u && u.tok}», ikke ${kr(b)}`); }
    } catch (e) { feil.push('feil: ' + e.message); }
    finally {
      ENHETER.length = 0; for (const e of før.enh) ENHETER.push(e);
      if (window.KJORETOY) { KJORETOY.length = 0; for (const k of før.kj) KJORETOY.push(k); }
      if (før.S && SS.sett) SS.sett(JSON.parse(før.S));
      if (SP.T && før.T) { const T = SP.T(); for (const k of Object.keys(T)) delete T[k]; Object.assign(T, før.T); }
      if (før.moral !== null) FolkSpill.tilstand().moral = før.moral;
      if (window.ForsvarSpill && før.slutt) { ForsvarSpill.slutt = før.slutt; if (ForsvarSpill.lukkRapport) try { ForsvarSpill.lukkRapport(); } catch (e) { /* */ } }
      SS.test = før.test[0]; SP.test = før.test[1];
      settPenger(før.penger);
      for (const n of Object.keys(localStorage)) if (/^riksbrudd-(selskap|trussel)/.test(n) && !før.lager.some(q => q[0] === n)) localStorage.removeItem(n);
      for (const [n, v] of før.lager) localStorage.setItem(n, v);
      if (før.logg) { loggLinjer.length = 0; loggLinjer.push(...før.logg); }
      tempo = før.tempo; skitten = true;
    }
    d.pengerTilbake = penger() === før.penger;
    if (!d.pengerTilbake) feil.push('kassa ble ikke satt tilbake');
    return { ok: !feil.length, tekst: feil.length ? feil.join(' | ') : `første kontrakt ${kr(d.første)}, ${d.eskorter} eskortetilbud (nivå 1 høyst ${kr(d.maksNivå1)}), eskorte levert ${d.eskorte ? kr(d.eskorte.inn) + ' (' + d.eskorte.risiko + ')' : '–'}, røverbølge ${d.røvere ? d.røvere.nr + ': ' + kr(d.røvere.inn) : '–'}`, data: d };
  }),
};
