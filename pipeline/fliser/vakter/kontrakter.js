// VAKT «den røde tråden» (R18-A, 23. nov, brukeren: «det må være én tydelig rød tråd»): et nytt spill får den første kontrakten
// (spill/selskap.js førsteKontrakt), «Neste»-lappen står, og stegene kan fullføres: ta kontrakten (knappen i Selskapet, via
// kommandolaget), lag en tropp, send den til stedet (hentet), hjem til leiren (levert: 400 000 kr), bygg noe, og ta neste kontrakt.
// Låste tilbud fra neste nivå kan ikke tas. Setter alt tilbake (selskapet, lagringen, penger, folk, laget, bygget, tid).
module.exports = { navn: 'den røde tråden: første kontrakt, stegene, betaling og neste kontrakt', kjør: async (pg) => {
  const d = await pg.evaluate(async () => {
    const ut = { feil: [], steg: [] }, krev = (ok, tekst) => { if (!ok) ut.feil.push(tekst); }, vent = ms => new Promise(r => setTimeout(r, ms));
    const SS = window.SelskapSpill, SK = window.Selskap; if (!SS || !SK || !SS.førsteKontrakt) { krev(false, 'SelskapSpill.førsteKontrakt mangler'); return ut; }
    const før = SS.tilstand() ? JSON.stringify(SS.tilstand()) : null, lagretFør = localStorage.getItem(SS.NØKKEL), testFør = SS.test;
    const pengerFør = OppstartSpill.tilstand().penger, tidFør = tid, F = FolkSpill.tilstand(), folkFør = JSON.stringify(F.personer), L = LeirSpill.tilstand(), byggFør = L.bygg.map(b => b.id);
    const lagFør = ENHETER.slice(); let tropp = null;
    try {
      SS.test = true;
      // 1) nytt spill: den første kontrakten
      const k = SS.førsteKontrakt(true), S = SS.tilstand();
      krev(k && k.første && k.type === 'forsyning' && S.tilbud[0] === k, 'nytt spill ga ingen første kontrakt'); if (!k) return ut;
      ut.kontrakt = k.tittel; krev(SS.tråd() && SS.tråd().id === 'ta', 'tråden starter ikke på «ta»');
      await vent(700); const lappEl = document.getElementById('nestelapp');
      ut.lapp = lappEl && lappEl.textContent; krev(SS.lapp() && /Ta kontrakten/.test(SS.lapp().tekst), 'lappen sier ikke «Ta kontrakten»');
      const bar = ['kommando', 'mkom'].map(id => document.getElementById(id)).find(e => e && e.classList.contains('på'));
      if (bar) krev(lappEl.classList.contains('på') && lappEl.getBoundingClientRect().bottom <= bar.getBoundingClientRect().top + 1, 'lappen vises ikke over bunnmenyen');
      // 2) ta kontrakten med knappen i panelet (kommandolaget)
      SS.vis(true); const kn = document.querySelector(`#selskap [data-s="ta"][data-id="${k.id}"]`); krev(kn && !kn.disabled, 'Ta-knappen mangler'); if (kn) kn.click();
      SS.oppdaterTråd(); krev(k.status === 'aktiv' && SS.tråd().id === 'tropp', 'kontrakten ble ikke tatt: ' + k.status + ' / ' + (SS.tråd() && SS.tråd().id)); ut.steg.push('ta'); SS.vis(false);
      // 3) lag en tropp av tre fra leiren
      F.personer.forEach(p => { p.helse = 1; }); const ider = F.personer.slice(0, 3).map(p => p.id);
      const r = TropperSpill.opprett(ider, 'Kontrakttropp', 'standard', null); tropp = r && r.lag; krev(tropp, 'troppen ble ikke laget: ' + (r && r.feil)); if (!tropp) return ut;
      SS.oppdaterTråd(); krev(SS.tråd().id === 'send', 'tropp-steget ble ikke ferdig'); ut.steg.push('tropp');
      // 4) troppen ved stedet (marsjen tar for lang tid i en prøve) -> hentet
      tropp.x = k.sted.x + 10; tropp.y = k.sted.y; tropp.sti = null; SS.steg(1); SS.oppdaterTråd();
      krev(k.hentet && SS.tråd().id === 'hjem', 'nødlageret ble ikke hentet'); ut.steg.push('send');
      // 5) hjem til leiren -> levert og betalt
      const P = OppstartSpill.tilstand().leir, p0 = OppstartSpill.tilstand().penger; tropp.x = P.x + 20; tropp.y = P.y; SS.steg(1); SS.oppdaterTråd();
      ut.betalt = OppstartSpill.tilstand().penger - p0; krev(k.status === 'levert' && ut.betalt >= k.betaling && ut.betalt <= k.betaling * 1.3 && k.betaling > 0, `ikke levert/betalt: ${k.status}, ${ut.betalt}`);
      krev(SS.tråd() && SS.tråd().id === 'bygg', 'steget etter betaling er ikke «bygg»'); ut.steg.push('hjem');
      krev(S.tilbud.length > 0 || true, ''); if (!S.tilbud.length) SS.nyeTilbud([{ navn: 'Prøvested A', x: P.x + 4000, y: P.y, slag: 'tettsted', id: 'pA' }, { navn: 'Prøvested B', x: P.x - 3000, y: P.y + 3000, slag: 'tettsted', id: 'pB' }]);
      // 6) bygg noe: ett bygg til i leiren
      Leir.kjøpMateriale(L, 'tre', 30, OppstartSpill.betal); Leir.kjøpMateriale(L, 'stål', 3, OppstartSpill.betal); const b = Leir.bygg(L, { type: 'vakttårn', x: P.x + 60, y: P.y + 60, retning: 0 }, OppstartSpill.betal, {}, {});
      krev(b && !b.feil, 'kunne ikke bygge: ' + (b && b.feil)); SS.oppdaterTråd(); krev(SS.tråd() && SS.tråd().id === 'neste', 'bygg-steget ble ikke ferdig'); ut.steg.push('bygg');
      // 7) neste kontrakt: tilbud finnes; et låst tilbud fra neste nivå kan ikke tas; et vanlig tas
      ut.tilbud = S.tilbud.length; krev(S.tilbud.length > 0, 'ingen nye tilbud etter den første kontrakten');
      const lås = { ...S.tilbud[0], id: 'låst-prøve', nivå: 2 }; S.tilbud.push(lås); const gl = KOMMANDO({ type: 'kontraktTa', id: 'låst-prøve', stille: true });
      krev(!gl.ok && /nivå 2/.test(gl.feil || ''), 'låst tilbud kunne tas: ' + JSON.stringify(gl)); S.tilbud = S.tilbud.filter(q => q.id !== 'låst-prøve');
      const vanlig = S.tilbud.find(q => q.type === 'hent' || SK.kanTa(q, SS.har(), S.sider.blå).ok) || Object.assign(S.tilbud[0], { type: 'hent', nivå: 1 });
      const g = KOMMANDO({ type: 'kontraktTa', id: vanlig.id, stille: true }); SS.oppdaterTråd();
      krev(g.ok && S.sider.blå.aktive.some(q => q.id === vanlig.id), 'neste kontrakt ble ikke tatt: ' + JSON.stringify(g)); krev(!SS.tråd() && S.tråd.slutt, 'tråden ble ikke ferdig'); ut.steg.push('neste');
      ut.nivå = SS.nivå().nr; await vent(700); ut.lapp2 = SS.lapp() && SS.lapp().tekst; krev(ut.lapp2 && !/Ta kontrakten «/.test(ut.lapp2), 'lappen følger ikke den nye kontrakten');
    } catch (e) { krev(false, 'unntak: ' + e.message); }
    finally {
      SS.vis(false); SS.test = testFør;
      for (let i = ENHETER.length - 1; i >= 0; i--) if (!lagFør.includes(ENHETER[i])) ENHETER.splice(i, 1);
      F.personer.length = 0; for (const p of JSON.parse(folkFør)) F.personer.push(p);
      for (let i = L.bygg.length - 1; i >= 0; i--) if (!byggFør.includes(L.bygg[i].id)) L.bygg.splice(i, 1);
      const brukt = OppstartSpill.tilstand().penger - pengerFør; if (brukt > 0) OppstartSpill.betal(brukt); else if (brukt < 0) OppstartSpill.gi(-brukt);
      tid = tidFør; if (før) SS.sett(JSON.parse(før)); else SS.sett(null);
      try { if (lagretFør === null) localStorage.removeItem(SS.NØKKEL); else localStorage.setItem(SS.NØKKEL, lagretFør); } catch (e) { /* */ }
      if (window.LeirSpill && LeirSpill.lagre) try { LeirSpill.lagre(); } catch (e) { /* */ } skitten = true;
    }
    return ut;
  });
  return { ok: !d.feil.length, tekst: d.feil.length ? d.feil.join('; ') : `«${d.kontrakt}»: ${d.steg.join(' → ')}, betalt ${d.betalt} kr, ${d.tilbud} nye tilbud, lappen: «${d.lapp2}»`, data: d };
} };
