// VAKT «kontraktene etter kritikken, runde 3» (kritikerløkka 26. nov, docs/kritikk/2026-11-26-r3-*.md):
//  1) nødlageret i den første kontrakten flyttes til et sted troppen kan GÅ til fra leiren (Terreng.ruteTil) – også et gammelt mål langt
//     unna eller i vann (k.sted.land settes til 2);
//  2) den første kontrakten kan gis opp uten bot og uten ripe i ryktet, og opplæringen går videre til «Neste kontrakt»;
//  3) nye tilbud kommer også mens den første kontrakten er aktiv, og aldri to av samme type på samme sted;
//  4) tilbudene regner marsjen langs ruta («marsj ca. X km, ca. Y t»), og en frist som ikke holder gir ⚠ (Selskap.marsjVurdering);
//  5) lagpanelet har «Hent <kjøretøy>» for et ledig eget kjøretøy lenger unna enn 60 m, og troppen går om bord når den er framme;
//  6) kjøpt utstyr legges på lager når en tropp oppløses, og en ny tropp får det gratis;
//  7) avtalen med bygdevernet må bekreftes (bare når kartet har tettsteder).
// Setter alt tilbake (selskapet, lagringen, penger, folk, lag, kjøretøy, tid, krig).
module.exports = { navn: 'kontraktene etter kritikken (R3): nødlager man kan nå, gi opp, nye tilbud, marsj, hent kjøretøy, utstyrslager, avtale', kjør: async (pg) => {
  const d = await pg.evaluate(async () => {
    const ut = { feil: [], ok: [] }, krev = (b, t) => { if (!b) ut.feil.push(t); else ut.ok.push(t); };
    const SS = window.SelskapSpill, SK = window.Selskap, TS = window.TropperSpill, TR = window.Tropper;
    if (!SS || !SK || !SS.landLager || !SK.marsjVurdering || !TS || !TR || !TR.tilLager) { krev(false, 'API mangler'); return ut; }
    const før = SS.tilstand() ? JSON.stringify(SS.tilstand()) : null, lagretFør = localStorage.getItem(SS.NØKKEL), lagerFør = localStorage.getItem('riksbrudd-troppslager'), testFør = SS.test;
    const pengerFør = OppstartSpill.tilstand().penger, tidFør = tid, F = FolkSpill.tilstand(), folkFør = JSON.stringify(F.personer), nesteFør = F.neste, lagFør = ENHETER.slice(), valgtFør = valgt;
    const kjFør = KJORETOY.map(k => [k, k.x, k.y, k.sti]), KS = window.KrigSpill, vernFør = KS && KS.T ? JSON.stringify(KS.T().vern || {}) : null, stTest = window.StrategiSpill ? StrategiSpill.test : false;
    const L = OppstartSpill.tilstand().leir;
    try {
      SS.test = true;
      // 1) nødlageret: et gammelt mål 3 km unna (og et i vann, hvis vinduet har vann) flyttes dit troppen kan gå
      const k = SS.førsteKontrakt(true); await SS.landLager();
      const v = await lagVindu([L.x - 1500, L.y - 1500, L.x + 1500, L.y + 1500], true);
      const nå = (x, y) => { const r = Terreng.ruteTil(v, L.x, L.y, x, y); return r ? r.timer : null; };
      krev(k.sted.land === 2 && nå(k.sted.x, k.sted.y) !== null && Math.hypot(k.sted.x - L.x, k.sted.y - L.y) <= 1060, `nødlageret kan nås (${Math.round(Math.hypot(k.sted.x - L.x, k.sted.y - L.y))} m, rute ${nå(k.sted.x, k.sted.y)} t)`);
      let vann = null; for (let j = 0; j < v.h && !vann; j += 2) for (let i = 0; i < v.w; i += 2) if (v.K[j * v.w + i] === 3) { vann = Terreng.senter(v, i, j); break; }
      const gml = vann || [L.x + 3000, L.y - 400]; k.sted.x = Math.round(gml[0]); k.sted.y = Math.round(gml[1]); k.sted.land = 1; await SS.landLager();
      krev(k.sted.land === 2 && nå(k.sted.x, k.sted.y) !== null && !(k.sted.x === Math.round(gml[0]) && k.sted.y === Math.round(gml[1])), `gammelt mål ${vann ? 'i vann' : '3 km unna'} flyttet (${k.sted.navn}, rute ${nå(k.sted.x, k.sted.y)} t)`);
      // 2) ta den, og gi den opp: ingen bot, ingen ripe, opplæringen går videre
      SS.ta(k.id); const S = SS.tilstand(), p0 = OppstartSpill.tilstand().penger, r0 = S.sider.blå.rykte.pålitelig;
      SS.vis(true); await new Promise(r => setTimeout(r, 300)); const giOpp = document.querySelector(`#selskap [data-s="avbryt"][data-id="${k.id}"]`); krev(giOpp && /Gi opp \(ingen bot\)/.test(giOpp.textContent), 'knappen «Gi opp (ingen bot)»: ' + (giOpp && giOpp.textContent));
      // 3) nye tilbud mens den første er aktiv, og aldri to like (steder fra tettstedene, ellers to oppdiktede rundt leiren)
      const st = SS.steder().length ? null : [{ navn: 'Prøvested A', x: L.x + 6000, y: L.y, slag: 'tettsted', id: 'vA' }, { navn: 'Prøvested B', x: L.x - 5000, y: L.y + 3000, slag: 'tettsted', id: 'vB' }];
      for (let i = 0; i < 4; i++) SS.nyeTilbud(st); const nøk = S.tilbud.filter(q => !q.første).map(q => q.type + '|' + q.sted.navn + '|' + (q.fra ? q.fra.navn : ''));
      krev(nøk.length > 0 && new Set(nøk).size === nøk.length && S.tilbud.length <= SK.REGLER.maksTilbud, `nye tilbud mens den første er aktiv, ingen like: ${nøk.join(', ')}`);
      SS.avbryt(k.id); SS.oppdaterTråd(); SS.vis(false);
      krev(OppstartSpill.tilstand().penger === p0 && S.sider.blå.rykte.pålitelig === r0 && SS.tråd() && SS.tråd().id === 'neste', `gitt opp: penger ${OppstartSpill.tilstand().penger - p0}, rykte ${S.sider.blå.rykte.pålitelig - r0}, steg ${SS.tråd() && SS.tråd().id}`);
      // 4) marsjen: et holdetilbud 2 km unna får en ekte rute; en frist som ikke holder, gir ⚠
      const kh = { id: 'vakt-r3', type: 'hold', hold: 4, timer: 14, nivå: 1, giver: { slag: 'firma', navn: 'Prøve' }, sted: { navn: 'Prøve', x: L.x + 1400, y: L.y + 1400, slag: 'tettsted', id: null }, utløper: tid + 999, betaling: 1, bot: 0, tittel: 'Hold Prøve' };
      let m = SS.marsj(kh); for (let i = 0; i < 100 && m && m.venter; i++) { await new Promise(r => setTimeout(r, 200)); m = SS.marsj(kh); }
      const mv = SK.marsjVurdering(kh, m), mv2 = SK.marsjVurdering({ ...kh, timer: 4 }, m);
      krev(m && !m.venter && (m.ingen || (/marsj ca\. .* km, ca\. .* t/.test(mv.linje) && !/Fristen holder ikke/.test(mv.advarsel) && /Fristen holder ikke/.test(mv2.advarsel))), `marsjen: ${mv.linje} / kort frist: ${mv2.advarsel}`);
      // 5) «Hent …»: et ledig eget kjøretøy 400 m unna
      F.personer.forEach(p => { p.helse = 1; }); const rt = TS.opprett(F.personer.slice(0, 3).map(p => p.id), 'Vakttropp R3', 'standard', null), s = rt && rt.lag; krev(s, 'troppen laget');
      if (s) { s.x = L.x + 10; s.y = L.y + 10; const bil = KJORETOY.find(q => q.side === 'blå' && Tropper.plass(q) >= 3 && !q.oppdrag && !ENHETER.some(e => e.ombord === q));
        if (bil) { bil.x = L.x + 400; bil.y = L.y + 30; bil.sti = null; valgt = s; visPanel(); await new Promise(r => setTimeout(r, 200)); const b = document.getElementById('hentbilknapp');
          // knappen gjelder det nærmeste ledige kjøretøyet (det kan være et annet enn det som ble flyttet)
          const mål = b ? KJORETOY.find(q => b.textContent.startsWith('Hent ' + q.navn + ' (')) : null;
          krev(b && mål, '«Hent …» i lagpanelet: ' + (b && b.textContent));
          if (b && mål) { const bil2 = mål; b.click(); for (let i = 0; i < 80 && (s.planlegger || !s.hentBilSti); i++) await new Promise(r => setTimeout(r, 150));
            if (s.sti) { const p = s.sti[s.sti.length - 1]; s.x = p[0]; s.y = p[1]; s.sti = null; } for (let i = 0; i < 20 && !s.ombord; i++) await new Promise(r => setTimeout(r, 150));
            krev(s.ombord === bil2, `troppen gikk om bord i ${bil2.navn} (${s.ombord ? s.ombord.navn : 'nei'})`); if (s.ombord) TS.rett.gåAv(s); } }
        else ut.ok.push('ingen ledig bil: 5 hoppet over');
        // 6) oppløs: utstyret på lager, ny tropp får det gratis
        s.x = L.x + 10; s.y = L.y + 10; s.utstyr = { feltradio: true }; s.menn[0].valgt = 'maskingevær'; const ro = TS.rett.oppløs(s);
        const p1 = OppstartSpill.tilstand().penger, r2 = TS.rett.opprett('blå', F.personer.slice(0, 2).map(p => p.id), 'Vakttropp R3b', 'standard', null, { utstyr: ['feltradio'] });
        krev(ro && /feltradio/.test(ro.påLager || '') && r2 && r2.lag && OppstartSpill.tilstand().penger === p1, `utstyret på lager (${ro && ro.påLager}), ny tropp betalte ${p1 - OppstartSpill.tilstand().penger} kr`); }
      // 7) avtalen må bekreftes (bare når kartet har tettsteder med bygdevern)
      const SP = window.StrategiSpill, by = SP && SP.område ? SP.område().find(b => { const vn = SP.vern(b); return vn && vn.mann > 0; }) : null;
      if (by) { SP.test = true; const p2 = OppstartSpill.tilstand().penger; SP.avtale(by.id); await new Promise(r => setTimeout(r, 100)); const kort = document.getElementById('avtalekort');
        krev(kort && /Det gir/.test(kort.textContent) && OppstartSpill.tilstand().penger === p2, 'avtalen spør først: ' + (kort && kort.textContent.slice(0, 80)));
        const nei = document.getElementById('avtalenei'); if (nei) nei.click(); krev(!document.getElementById('avtalekort') && OppstartSpill.tilstand().penger === p2, '«Nei, tilbake» trekker ingenting'); }
      else ut.ok.push('ingen bygdevern i kartet: 7 hoppet over');
    } catch (e) { krev(false, 'unntak: ' + e.message); }
    finally {
      SS.vis(false); SS.test = testFør; if (window.StrategiSpill) StrategiSpill.test = stTest; { const a = document.getElementById('avtalekort'); if (a) a.remove(); }
      for (let i = ENHETER.length - 1; i >= 0; i--) if (!lagFør.includes(ENHETER[i])) ENHETER.splice(i, 1);
      for (const [k, x, y, sti] of kjFør) { k.x = x; k.y = y; k.sti = sti; } for (const e of ENHETER) if (e.ombord && !lagFør.includes(e)) e.ombord = null;
      F.personer.length = 0; for (const p of JSON.parse(folkFør)) F.personer.push(p); F.neste = nesteFør;
      const brukt = OppstartSpill.tilstand().penger - pengerFør; if (brukt > 0) OppstartSpill.betal(brukt); else if (brukt < 0) OppstartSpill.gi(-brukt);
      tid = tidFør; valgt = valgtFør; if (før) SS.sett(JSON.parse(før)); else SS.sett(null);
      try { if (lagretFør === null) localStorage.removeItem(SS.NØKKEL); else localStorage.setItem(SS.NØKKEL, lagretFør); if (lagerFør === null) localStorage.removeItem('riksbrudd-troppslager'); else localStorage.setItem('riksbrudd-troppslager', lagerFør); } catch (e) { /* */ }
      try { if (vernFør) { const V = KS.T().vern; for (const q of Object.keys(V)) delete V[q]; Object.assign(V, JSON.parse(vernFør)); } } catch (e) { /* */ }
      try { visPanel(); } catch (e) { /* */ } skitten = true;
    }
    return ut;
  });
  return { ok: !d.feil.length, tekst: d.feil.length ? d.feil.join('; ') : `${d.ok.length} sjekker ok`, data: d };
} };
