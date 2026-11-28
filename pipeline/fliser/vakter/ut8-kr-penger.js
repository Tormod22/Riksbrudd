// VAKT ut8-kr-penger (28. nov, kritikken: «alle kontraktene er for tunge, og pengene renner ut»): minst ett tilbud én tropp klarer
// (Selskap.sikreLett) og Neste-lappen peker på det, de små oppdragene står i Selskap → Kontrakter, driftslinja i Oversikt, samme ukas
// resultat i Eiere som i Oversikt, og et overtatt hus koster (Overtak.istandsetting). Setter alt tilbake (selskapet, oppdragene, panelene).
module.exports = {
  navn: 'ut8-kr-penger',
  kjør: async (pg) => pg.evaluate(async () => {
    const ut = { feil: [] }, ok = (b, t) => { if (!b) ut.feil.push(t); };
    const vent = ms => new Promise(r => setTimeout(r, ms));
    const SS = window.SelskapSpill, SK = window.Selskap;
    if (!SS || !SK || !SK.sikreLett) return { ok: false, tekst: 'Selskap.sikreLett eller SelskapSpill mangler', data: ut };
    // 1) reglene: med bygdevern på 10–25 og et tettsted Ravnsund holder, finnes likevel alltid et tilbud én tropp på fire klarer
    { const st = [{ navn: 'A', x: 4000, y: 0, slag: 'tettsted', id: 1, vern: 10 }, { navn: 'B', x: 0, y: 7000, slag: 'tettsted', id: 2, vern: 25 }, { navn: 'C', x: -6000, y: 0, slag: 'tettsted', id: 3, vern: 14, eier: 'rød' }];
      let n = 0; for (let i = 0; i < 40; i++) { const T = SK.ny({ x: 0, y: 0 }); SK.lagTilbud(T, 'blå', 1440, st, SK.lagRand(i + 1), { styrke: 4 });
        if (T.tilbud.some(k => SK.klarbar(k, 4, T.sider.blå, st.find(q => q.navn === k.sted.navn)))) n++; }
      ut.regler = n; ok(n === 40, `reglene: et tilbud én tropp klarer bare i ${n} av 40 morgener`); }
    const S = SS.tilstand(), før = S ? JSON.stringify(SK.tilJSON ? SK.tilJSON(S) : S) : null, O = window.SpilletSpill && SpilletSpill.O ? SpilletSpill.O() : null, oppFør = O ? O.liste.slice() : null;
    const panelFør = window.SelskapetSpill && SelskapetSpill.erÅpen ? SelskapetSpill.erÅpen() : false;
    try {
      // 2) i spillet: etter den første kontrakten kommer et tilbud leiren klarer, og Neste-lappen peker på det
      if (S) { const fk = S.tilbud.find(q => q.første); if (fk) { S.tilbud = S.tilbud.filter(q => q !== fk); fk.status = 'levert'; S.sider.blå.ferdige.unshift(fk); S.sider.blå.sum.levert = Math.max(1, S.sider.blå.sum.levert); }
        if (S.tråd) S.tråd.gjort = ['ta', 'tropp', 'send', 'hjem', 'bygg']; S.tilbud = []; S.sider.blå.aktive = [];
        // prøvesteder rundt leiren (Dovre-siden har bare Dombås): bygdevern på 14 og 20 mann, som Granvin og Eidfjord i kritikken
        const L0 = OppstartSpill.tilstand().leir, st = [{ navn: 'Prøvested A', x: L0.x + 3500, y: L0.y, slag: 'tettsted', id: 990901, vern: 14 }, { navn: 'Prøvested B', x: L0.x, y: L0.y - 6000, slag: 'tettsted', id: 990902, vern: 20 }];
        SS.nyeTilbud(st); let kl = SS.klarbare();
        // marsjene regnes ut i bakgrunnen (SelskapSpill.marsj) – vent litt så lappen bruker dem
        for (let i = 0; i < 20 && SS.marsjListe && S.tilbud.some(k => { const m = SS.marsj(k); return m && m.venter; }); i++) await vent(250);
        kl = SS.klarbare(); const l = SS.lapp(); ut.klarbare = kl.map(k => k.tittel); ut.tilbud = S.tilbud.map(k => (k.lett ? 'lett: ' : '') + k.tittel); ut.lapp = l && l.tekst;
        ok(kl.length >= 1 || S.tilbud.some(k => k.lett), 'ingen tilbud leiren klarer etter den første kontrakten: ' + ut.tilbud.join(' | '));
        if (kl.length) ok(l && /én tropp klarer/.test(l.tekst) && l.tilbud === kl[0].id, 'Neste-lappen peker ikke på tilbudet: ' + (l && l.tekst)); }
      // 3) de små oppdragene står i Kontrakter, og «Ta oppdraget» virker derfra
      if (O) { const L = SS.tilstand() && OppstartSpill.tilstand().leir, o = { id: 990801, type: 'hent', x: L.x + 600, y: L.y + 500, meter: 780, retning: 'nordøst', frist: (typeof tid === 'number' ? tid : 0) + 900, gir: { penger: 400000 } };
        O.liste.push(o); SS.vis(true); await vent(300); const sel = document.getElementById('selskap'), h = sel && sel.querySelector('[data-smaa]'), kn = sel && sel.querySelector('[data-s="oppdragTa"][data-id="990801"]');
        ut.smaa = !!h; ok(!!h && !!kn && /Hent forsyninger/.test(sel.textContent) && /0,4 mill/.test(sel.textContent), 'Små oppdrag står ikke i Kontrakter med navn, belønning og knapp');
        if (kn) { kn.click(); await vent(200); ok(o.tatt === true, '«Ta oppdraget» i Kontrakter tok ikke oppdraget'); }
        S.sider.blå.aktive = []; S.tilbud = []; const l2 = SS.lapp(); ut.lappOppdrag = l2 && l2.tekst; ok(l2 && /oppdraget «Hent forsyninger»/.test(l2.tekst), 'Neste-lappen peker ikke på oppdraget når ingen kontrakt passer: ' + ut.lappOppdrag);
        SS.vis(false); }
      // 4) driftslinja i Oversikt, og 5) samme ukas resultat i Eiere som i Oversikt
      if (window.SelskapetSpill) { SelskapetSpill.vis(true); SelskapetSpill.velgFane('oversikt'); await vent(300);
        const d = document.querySelector('#selskapet .drift'); ut.drift = d && d.textContent; ok(d && /Leiren bruker/.test(d.textContent), 'driftslinja mangler i Oversikt');
        const u = window.Selskapsbilde && Selskapsbilde.ukeNå ? Selskapsbilde.ukeNå() : null;
        if (u && u.dager && window.BorsSpill && BorsSpill.fane && window.Bors) { const hb = BorsSpill.fane(); ut.eiere = (/ukas resultat[^·<]*/.exec(hb) || [''])[0];
          ok(hb.indexOf('ukas resultat ' + Bors.mill(u.netto)) >= 0, 'Eiere viser et annet ukeresultat enn Oversikt: ' + ut.eiere + ' mot ' + Bors.mill(u.netto)); }
        if (!panelFør) SelskapetSpill.vis(false); }
      // 6) et overtatt hus koster (istandsetting), og et hus som settes i stand teller ikke ennå
      if (window.Overtak && Overtak.istandsetting) { const I = Overtak.istandsetting({ senger: 16, lager: 100 }, null); ut.kaserne = I;
        ok(I.kr >= 1e6 && I.timer > 0 && Overtak.sum({ 1: { senger: 9, lager: 1, klar: 999 } }, 10).senger === 0, 'overtaket er gratis eller teller før det er satt i stand: ' + JSON.stringify(I)); }
    } catch (e) { ut.feil.push('unntak: ' + (e && e.stack || e)); }
    finally {
      if (O && oppFør) { O.liste.length = 0; O.liste.push(...oppFør); }
      if (før && SS.sett) SS.sett(JSON.parse(før));
      if (window.SelskapetSpill && !panelFør) SelskapetSpill.vis(false); if (SS.erÅpen && SS.erÅpen()) SS.vis(false);
    }
    return { ok: !ut.feil.length, tekst: ut.feil.length ? ut.feil.join('; ') : `${ut.regler}/40 morgener med et lett tilbud; tilbud: ${(ut.tilbud || []).join(' | ')}; lappen: «${ut.lapp}»; oppdrag: «${ut.lappOppdrag}»; ${ut.drift}`, data: ut };
  }),
};
