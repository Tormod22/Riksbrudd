// VAKT for kritikerløkka runde 2, pakke «krig» (26. nov): det Ingrid Sæther fant i «Hold byen» ved Elverum.
// (1) scenariobyen står øverst i Krig med forsvar, «Send minst N mann» og knappene Send / Gjør avtale; (2) egne lag i samme tettsted regnes
// sammen i én melding med ett tall for kravet; (3) en annen side i tettstedet navngis («står også i tettstedet»); (4) egne lag med
// radiokontakt vises der de er også ute (ikke «sist meldt»), lag uten kontakt gjør det ikke; (5) marsjordren varsler når laget mister
// radiokontakten underveis; (6) et sted med et forsvar som er større enn det dere har, står ikke øverst i Neste trekk.
// Alt settes tilbake (lagene, vernet, tettstedet, tiden, scenariet, krigskartet).
module.exports = { navn: 'krig-r2', kjør: async (pg, profil) => {
  const d = await pg.evaluate(async () => {
    const ut = {}; if (!window.StrategiSpill || !window.Strategi || !window.Garnison || !window.ScenarioSpill || !window.KrigSpill || typeof INFRA === 'undefined' || !INFRA || !INFRA.tettsted) return { uten: true };
    const by = INFRA.tettsted.find(b => /Domb/.test(b.e.navn)) || INFRA.tettsted[0], id = by.e.id, S0 = OppstartSpill.tilstand(), L = S0.leir;
    const blå = ENHETER.filter(e => e.side === 'blå' && !e.karakter && levende(e)).slice(0, 3); if (blå.length < 2) return { uten: true };
    const før = blå.map(s => ({ s, x: s.x, y: s.y, sti: s.sti, menn: s.menn.map(m => ({ ...m })), seg: s.seg, prog: s.prog, framVed: s.framVed })), tid0 = tid, T0 = TETTSTEDER.get(id) ? { ...TETTSTEDER.get(id) } : null;
    const KT = KrigSpill.T(), vern0 = KT.vern[id], regler0 = S0.regler ? JSON.parse(JSON.stringify(S0.regler)) : undefined, sc0 = ScenarioSpill.tilstand() ? JSON.stringify(ScenarioSpill.tilstand().sc) : null, åpen0 = StrategiSpill.erÅpen();
    const LOGG = [], lo = window.logg; window.logg = (t, ...a) => { LOGG.push(String(t)); return lo(t, ...a); }; const nye = [];
    try {
      // (6) for sterkt sted trekkes ned (reglene)
      { const B = [{ id: 1, navn: 'Sterk', x: 2000, y: 0, folk: 4000 }, { id: 2, navn: 'Svak', x: 0, y: 6000, folk: 900 }], t = Strategi.trekk('blå', B, () => null, [{ x: 0, y: 0, mann: 8 }], [], undefined, null, b => (b.id === 1 ? 35 : 0));
        ut.sterk = t[0].by.navn === 'Svak' && t[1].sterk === true && t[1].anbefalt === 36; }
      // (1) scenariobyen i Krig
      S0.regler = { vanskelighet: 'vanlig', utfordringer: [], scenario: 'hold' }; ScenarioSpill.settRegler(); if (ScenarioSpill.tilstand()) ScenarioSpill.tilstand().sc = { målId: id };
      delete KT.vern[id]; StrategiSpill.åpne(); await new Promise(r => setTimeout(r, 300)); StrategiSpill.takt && StrategiSpill.takt();
      const rad = document.querySelector('#krigscenario [data-scenby]'); ut.scenby = !!rad && rad.textContent.includes(by.e.navn);
      ut.scenKrav = !!rad && /Send minst \d+ mann/.test(rad.textContent); ut.scenSend = !!rad && !!rad.querySelector('[data-scensend]');
      ut.scenAvtale = !!rad && (!!rad.querySelector('[data-scenavtale]') || !(Krig.vernMenn(by.e.folk) > 0)); ut.fraLeiren = !!rad && /km fra leiren/.test(rad.textContent);
      ut.scenTekst = rad ? rad.textContent.slice(0, 200) : null; StrategiSpill.lukk();
      // (1b) tettstedspanelet: bygdevernets styrke og «Send»
      if (typeof visInfo === 'function') { visInfo(by); const H = document.getElementById('handl'), h = document.getElementById('hint');
        ut.panelSend = !!H.querySelector('[data-tettsend]') && !!H.querySelector('[data-tettkrig]'); ut.panelVern = /Bygdevernet: \d+ mann/.test(h.textContent) && /Send minst \d+ mann/.test(h.textContent);
        ut.panelTekst = h.textContent.slice(0, 160); if (window.lukkPanel) lukkPanel(); else document.getElementById('panel').classList.remove('på'); }
      // (2) to lag i tettstedet, for få: én melding med begge og summen
      KT.vern[id] = 0; TETTSTEDER.delete(id); const [X, Y] = navnP(by), minst = Garnison.minstFor(by.e.folk), A = blå[0], B = blå[1];
      for (const [i, s] of [A, B].entries()) { s.x = X + i * 30; s.y = Y; s.sti = null; s.menn = s.menn.slice(0, 1).map(m => ({ ...m, hp: 1 })); }
      if (minst >= 3) { for (let i = 0; i < 6; i++) sim(.5); const m = LOGG.find(t => /^For få til å ta /.test(t)); ut.sum = !!m && m.includes(A.navn) && m.includes(B.navn) && /til sammen 2 mann/.test(m) && m.includes(`minst ${Strategi.anbefalt(minst, 0)}`); ut.sumTekst = m || null; }
      // (3) en annen side i tettstedet: hvem
      const f = nyttLag('Vaktrøvere', X + 50, Y + 10, 'rød'); f.raid = 99; ENHETER.push(f); nye.push(f); A.menn.push({ ...A.menn[0] }, { ...A.menn[0] }, { ...A.menn[0] });
      TETTSTEDER.delete(id); for (let i = 0; i < 6; i++) sim(.5); f.x = X + 9000; for (let i = 0; i < 4; i++) sim(.5); f.x = X + 50; for (let i = 0; i < 6; i++) sim(.5);
      const ks = LOGG.find(t => /^Kamp om /.test(t)); ut.hvem = !!ks && /står også i tettstedet/.test(ks); ut.hvemTekst = ks || null;
      ENHETER.splice(ENHETER.indexOf(f), 1); nye.length = 0;
      // (4) og (5) kontrollrommet ute: lag med kontakt vises, uten kontakt ikke; marsjordren varsler
      const KS = window.KontrollromSpill; if (KS && KS.på && KS.på() && KS.modus() === 'ute') { const skjul = s => KROKER.skjul.some(q => q(s));
        A.x = L.x + 900; A.y = L.y; B.x = L.x + 7000; B.y = L.y; A.sti = B.sti = null; await KS.sjekkKontakt(A); await KS.sjekkKontakt(B);
        ut.live = KS.info(A).kontakt && !skjul(A); ut.sistMeldt = !KS.info(B).kontakt && skjul(B);
        A.x = L.x + 150; await KS.sjekkKontakt(A); const r0 = A.radio; A.radio = undefined; const n0 = LOGG.length; await ordre(A, L.x + 2600, L.y + 4200); A.radio = r0;
        const v = LOGG.slice(n0).find(t => /mister radiokontakten etter ca\./.test(t)); ut.varsel = !!v || !A.sti; ut.varselTekst = v || (A.sti ? null : 'ingen rute'); }
      else ut.ute = 'ikke prøvd (kontrollrommet ikke aktivt eller ikke ute)';
    } catch (e) { ut.feil = e.message + ' ' + (e.stack || '').split('\n')[1]; }
    finally {
      window.logg = lo; for (const f of nye) { const i = ENHETER.indexOf(f); if (i >= 0) ENHETER.splice(i, 1); }
      for (const q of før) { Object.assign(q.s, { x: q.x, y: q.y, sti: q.sti, seg: q.seg, prog: q.prog, framVed: q.framVed }); q.s.menn = q.menn; q.s.siktSkitten = true; }
      if (vern0 === undefined) delete KT.vern[id]; else KT.vern[id] = vern0; if (T0) TETTSTEDER.set(id, T0); else TETTSTEDER.delete(id); tid = tid0;
      if (regler0 === undefined) delete S0.regler; else S0.regler = regler0; ScenarioSpill.settRegler(); if (ScenarioSpill.tilstand() && sc0 !== null) ScenarioSpill.tilstand().sc = JSON.parse(sc0);
      if (åpen0) StrategiSpill.åpne(); else StrategiSpill.lukk(); skitten = true; }
    return ut; });
  if (d.uten) return { ok: true, tekst: 'krig-r2: ikke prøvd (mangler tettsted eller moduler)', data: d };
  const ute = d.ute ? true : d.live && d.sistMeldt && d.varsel;
  const ok = !d.feil && d.sterk && d.scenby && d.scenKrav && d.scenSend && d.scenAvtale && d.fraLeiren && d.panelSend !== false && d.panelVern !== false && d.sum !== false && d.hvem && ute;
  return { ok, data: d, tekst: `krig-r2 (${profil}): for sterkt sted trekkes ned ${d.sterk}; scenariobyen i Krig ${d.scenby} (krav ${d.scenKrav}, Send ${d.scenSend}, avtale ${d.scenAvtale}, fra leiren ${d.fraLeiren}); tettstedspanelet: Send ${d.panelSend}, bygdevernet ${d.panelVern} («${d.panelTekst}»); `
    + `lagene regnes sammen ${d.sum === undefined ? 'ikke prøvd' : d.sum} («${d.sumTekst}»); hvem sperrer ${d.hvem} («${d.hvemTekst}»); `
    + (d.ute || `egne lag med kontakt live ${d.live}, uten kontakt sist meldt ${d.sistMeldt}, varsel ved marsjordren ${d.varsel} («${d.varselTekst}»)`) + (d.feil ? ' FEIL: ' + d.feil : '') };
} };
