// Vakt for pakka «ut3-varekontrakt» (fase Ø2, 28. nov; docs/natt/ut3-varekontrakt.md): varekontraktene i Selskapet.
// 1) LEVER: en levering tas, «Send lastebil» laster planker fra leirens lager på en lastebil ved leiren, bilen flyttes fram (vakta flytter
//    den – testsiden har ikke vegnettet), og leveringen betales: kassa vokser med akkurat betalingen, kontrakten står som levert;
// 2) GRÅFJELL FRAKT: «La Gråfjell Frakt ta det» tar resten fra lageret, og ved ankomst betales betalingen minus 15 %;
// 3) LEVERANSEAVTALE: et døgn uten varer på lageret gir bot, et døgn med varer gir betaling og tar varene fra lageret;
// 4) STORLIA: den første tømmerkontrakten kommer én gang, og når den tas, er sagbruket kjent (S.vare.sagKjent).
// Setter alt tilbake: selskapet, kassa, lageret, lagene, kjøretøyene, loggen og lagringen.
module.exports = {
  navn: 'ut3-varekontrakt',
  kjør: async (pg, profil) => pg.evaluate(async () => {
    const feil = [], d = {}, krev = (b, t) => { if (!b) feil.push(t); };
    const SK = window.Selskap, SS = window.SelskapSpill, VS = window.VareSpill, V = window.Vare, OS = window.OppstartSpill, LS = window.LeirSpill;
    if (!SK || !SS || !SS.tilstand || !VS || !V || !OS || !LS) return { ok: false, tekst: 'Selskap, SelskapSpill, VareSpill, Vare, OppstartSpill eller LeirSpill mangler', data: {} };
    if (!SK.REGLER.TYPER.lever) return { ok: false, tekst: 'varetypene er ikke registrert i Selskap', data: {} };
    const penger = () => OS.tilstand().penger, settPenger = v => { const p = penger(); if (p > v) OS.betal(p - v); else if (p < v) OS.gi(v - p); };
    const L = LS.tilstand(), S = SS.tilstand(); if (!S || !L) return { ok: false, tekst: 'selskapet eller leiren er ikke startet', data: {} };
    const før = { penger: penger(), S: SK.tilJSON(S), enh: ENHETER.slice(), kj: (window.KJORETOY || []).slice(), kjPlass: (window.KJORETOY || []).map(q => [q, q.x, q.y, q.sti, q.vare, q.framme]), lager: { ...L.lager }, diesel: L.drivstoff, tid,
      lagring: Object.keys(localStorage).filter(n => /^riksbrudd-(selskap|k2)/.test(n)).map(n => [n, localStorage.getItem(n)]),
      logg: typeof loggLinjer !== 'undefined' ? loggLinjer.slice() : null };
    const leir = OS.tilstand().leir;
    try {
      const st = [{ navn: 'Prøvebygd', x: leir.x + 6000, y: leir.y + 1000, slag: 'tettsted', id: 'ut3a' }];
      const o = { steder: st, verdi: VS.verdi(), leir };
      krev(o.verdi.tre > 0 && o.verdi.ved > 0 && o.verdi.tømmer > 0, 'markedsverdien mangler: ' + JSON.stringify(o.verdi));
      // en lastebilkolonne på fire ved leiren (48 m³)
      const bil = Kjoretoy.ny({ navn: 'Vaktbil ut3', type: 'lastebil', antall: 4, x: leir.x + 30, y: leir.y + 20, side: 'blå' }); KJORETOY.push(bil);
      // ---------- 1) LEVER med egen lastebil ----------
      const k = V.lagEtt(S, 'blå', 'lever', tid, o, 'tre', 'Storlia Tømmer'); krev(k && k.sted.navn === 'Prøvebygd', 'leveringen fikk ikke prøvestedet');
      S.tilbud.unshift(k); L.lager.tre = k.mengde + 5;
      const g = SS.ta(k.id); krev(g && g.ok && k.status === 'aktiv', 'leveringen ble ikke tatt: ' + (g && g.grunn));
      const p0 = penger(), r = VS.knapp(k.id, 'bil');
      d.send = r && (r.svar ? r.svar.tekst : r.tekst || r.feil);
      krev(r && r.ok, 'Send lastebil feilet: ' + d.send);
      krev(Math.abs(L.lager.tre - 5) < .05, `lageret skulle ha 5 m³ planker igjen, har ${L.lager.tre}`);
      // bilen som fikk lasten (den største ledige ved leiren – vaktbilen eller en av leirens egne)
      const b = k.turer && k.turer[0] ? KJORETOY.find(q => q.navn === k.turer[0].bil) : null; d.bil = b && b.navn;
      krev(b && b.vare === k.id && k.turer.length === 1 && Math.abs(k.turer[0].mengde - k.mengde) < .05, 'lasten står ikke på bilen');
      // vakta kjører bilen fram (testsiden har ikke vegnettet)
      if (b) { b.sti = null; b.x = k.sted.x + 50; b.y = k.sted.y; } SS.steg(1);
      d.lever = { mengde: k.mengde, betaling: k.betaling, status: k.status, kassa: penger() - p0 };
      krev(k.status === 'levert', 'leveringen er ikke levert: ' + k.status);
      krev(penger() - p0 === k.betaling, `kassa vokste med ${penger() - p0}, ikke betalingen ${k.betaling}`);
      krev(b && !b.vare, 'bilen er fortsatt merket med lasten');
      // ---------- 2) GRÅFJELL FRAKT ----------
      const kg = V.lagEtt(S, 'blå', 'lever', tid, o, 'tre', 'Kvernhaug Mølle'); S.tilbud.unshift(kg); L.lager.tre = kg.mengde; SS.ta(kg.id);
      const rg = VS.knapp(kg.id, 'frakt'); krev(rg && rg.ok && kg.frakt && L.lager.tre < .05, 'Gråfjell tok ikke lasten: ' + (rg && rg.feil));
      if (kg.frakt) { kg.frakt.tapt = false; kg.frakt.ankommer = tid; const p1 = penger(); SS.steg(1);
        d.frakt = { pris: kg.frakt.pris, kassa: penger() - p1, betaling: kg.betaling };
        krev(kg.status === 'levert' && penger() - p1 === kg.betaling - kg.frakt.pris && kg.frakt.pris === Math.round(kg.betaling * .15 / 1000) * 1000, 'Gråfjell-leveringen: ' + JSON.stringify(d.frakt)); }
      // ---------- 3) LEVERANSEAVTALE: bot når et døgn ikke leveres ----------
      const ka = V.lagEtt(S, 'blå', 'avtale', tid, o, 'ved', 'Dalsnes Kraftlag'); S.tilbud.unshift(ka); SS.ta(ka.id);
      krev(ka.status === 'aktiv', 'avtalen ble ikke inngått');
      L.lager.ved = 0; ka.godtatt -= 1440; const p2 = penger(); SS.steg(1);
      d.mist = { bot: ka.botDøgn, kassa: penger() - p2, mist: ka.mist };
      krev(ka.mist === 1 && p2 - penger() === ka.botDøgn, 'et døgn uten ved ga ikke bot: ' + JSON.stringify(d.mist));
      L.lager.ved = ka.perDøgn + 2; ka.godtatt -= 1440; const p3 = penger(); SS.steg(1);
      d.døgn = { kr: ka.dagKr, kassa: penger() - p3, ved: L.lager.ved };
      krev(ka.levertDøgn === 1 && penger() - p3 === ka.dagKr && Math.abs(L.lager.ved - 2) < .05, 'et døgn med ved ga ikke betaling: ' + JSON.stringify(d.døgn));
      // ---------- 4) STORLIA ----------
      S.vare = {}; const ks = VS.storlia(true); krev(ks && ks.storlia && ks.vare === 'tømmer' && S.tilbud[0] === ks, 'Storlias tømmerkontrakt kom ikke');
      krev(VS.storlia(true) === null, 'Storlias kontrakt kom to ganger');
      if (ks) { SS.ta(ks.id); krev(S.vare.sagKjent === true, 'sagbruket ble ikke kjent da Storlia-kontrakten ble tatt'); d.storlia = ks.tittel; }
      // ---------- kortene i panelet ----------
      SS.vis(true); const html = document.getElementById('selskap').innerHTML; SS.vis(false);
      krev(/Leveranseavtale/.test(html) && /Levert 1 av/.test(html), 'kontraktpanelet viser ikke avtalens framdrift');
    } catch (e) { feil.push('unntak: ' + e.message); }
    finally {
      ENHETER.length = 0; for (const e of før.enh) ENHETER.push(e);
      KJORETOY.length = 0; for (const q of før.kj) KJORETOY.push(q);
      for (const [q, x, y, sti, vare, framme] of før.kjPlass) Object.assign(q, { x, y, sti, vare, framme });
      SS.sett(JSON.parse(før.S)); Object.keys(L.lager).forEach(q => { L.lager[q] = før.lager[q] || 0; }); L.drivstoff = før.diesel; tid = før.tid;
      settPenger(før.penger);
      for (const n of Object.keys(localStorage)) if (/^riksbrudd-(selskap|k2)/.test(n) && !før.lagring.some(q => q[0] === n)) localStorage.removeItem(n);
      for (const [n, v] of før.lagring) localStorage.setItem(n, v);
      if (før.logg) { loggLinjer.length = 0; loggLinjer.push(...før.logg); }
      skitten = true;
    }
    return { ok: !feil.length, tekst: feil.length ? feil.join('; ') : `levering ${d.lever && d.lever.kassa} kr, Gråfjell ${d.frakt && d.frakt.kassa} kr, avtale: bot ${d.mist && -d.mist.kassa} kr og døgn ${d.døgn && d.døgn.kassa} kr, Storlia ok`, data: d };
  }),
};
