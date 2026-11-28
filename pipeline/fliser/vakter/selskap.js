// VAKT «selskapet» (W1, 22. nov, R16-D): panelet «Selskapet» åpnes, viser merke, rykte og de andre selskapene; en kontrakt («hold») tas,
// et eget lag settes ved stedet, kontrakten leveres i steget og gir penger, og ryktet «pålitelig» går opp. Avslå tar bort et tilbud,
// og «Lever» før kravet er oppfylt gir ingen penger. Setter alt tilbake (penger, laget, tid, panelet, lagringen).
module.exports = { navn: 'selskapet: panel, kontrakt tatt og levert, penger og rykte', kjør: async (pg) => {
  const d = await pg.evaluate(async () => {
    const ut = { feil: [] }, krev = (ok, tekst) => { if (!ok) ut.feil.push(tekst); };
    if (!window.SelskapSpill || !window.Selskap) { krev(false, 'SelskapSpill/Selskap mangler'); return ut; }
    const SS = SelskapSpill, før = SS.tilstand() ? JSON.stringify(SS.tilstand()) : null, lagretFør = localStorage.getItem(SS.NØKKEL);
    const pengerFør = OppstartSpill.tilstand().penger, tidFør = tid, lag = ENHETER.find(s => s.side === 'blå' && levende(s) && !s.karakter);
    const plassFør = lag && { x: lag.x, y: lag.y, sti: lag.sti };
    try {
      SS.start(); const S = SS.tilstand(); krev(S && S.sider && S.sider.blå, 'selskapet startet ikke (ingen leir?)'); if (!S) return ut;
      const L = OppstartSpill.tilstand().leir;
      // prøvesteder rundt leiren (testsiden har ikke alltid INFRA)
      S.tilbud = []; S.sider.blå.aktive = [];
      SS.nyeTilbud([{ navn: 'Prøvested A', x: L.x + 4000, y: L.y, slag: 'tettsted', id: 'pA' }, { navn: 'Prøvested B', x: L.x - 3000, y: L.y + 3000, slag: 'tettsted', id: 'pB' }]);
      krev(S.tilbud.length >= 2, 'for få tilbud: ' + S.tilbud.length);
      SS.vis(true); const P = document.getElementById('selskap');
      krev(P && P.classList.contains('på') && getComputedStyle(P).display !== 'none', 'panelet åpnet ikke');
      krev(P.querySelector('.hode svg') && P.querySelectorAll('[data-rykte]').length === 3, 'merket eller rykte-målerne mangler');
      krev(/Ravnsund Sikkerhet/.test(P.textContent) && /Mosevakt Feltoperasjoner/.test(P.textContent), 'motstanderselskapene mangler i panelet');
      krev(P.querySelectorAll('[data-s="ta"]').length === S.tilbud.length, 'Ta-knappene mangler');
      krev(document.querySelector('[data-k="selskap"]') || [...document.querySelectorAll('#lagmeny button')].some(b => /Selskapet/.test(b.textContent)), 'ingen inngang til panelet (kommandolinja/☰)');
      // avslå tar bort et tilbud
      const n0 = S.tilbud.length; P.querySelector('[data-s="avslå"]').click(); krev(S.tilbud.length === n0 - 1, 'Avslå tok ikke bort tilbudet');
      // en hold-kontrakt, tatt med knappen (ut4-fiksa: på nivå 1 – tilbudene kan kreve et høyere nivå enn selskapet har)
      const k = Object.assign(S.tilbud[0], { type: 'hold', hold: 1, timer: 11, nivå: 1 }); k.tittel = Selskap.tittel(k); SS.vis(true);
      const knapp = P.querySelector(`[data-s="ta"][data-id="${k.id}"]`); krev(knapp, 'fant ikke Ta-knappen'); if (knapp) knapp.click();
      krev(S.sider.blå.aktive.some(q => q.id === k.id), 'kontrakten ble ikke aktiv');
      const pål0 = S.sider.blå.rykte.pålitelig, p0 = OppstartSpill.tilstand().penger;
      krev(SS.lever(k.id) === null && OppstartSpill.tilstand().penger === p0, 'Lever før kravet var oppfylt ga penger');
      // laget står ved stedet, ingen fiender der; en time går
      krev(lag, 'ingen egne lag'); if (!lag) return ut; lag.x = k.sted.x; lag.y = k.sted.y; lag.sti = null;
      const fi = ENHETER.filter(s => s.side !== 'blå' && Math.hypot(s.x - k.sted.x, s.y - k.sted.y) < 400), fiPlass = fi.map(s => [s, s.x, s.y]); for (const s of fi) { s.x += 5000; }
      krev(SS.vurder(k).i, 'kravet regnes ikke som oppfylt med laget på stedet');
      SS.steg(61); for (const [s, x, y] of fiPlass) { s.x = x; s.y = y; }
      krev(!S.sider.blå.aktive.some(q => q.id === k.id) && S.sider.blå.ferdige[0] && S.sider.blå.ferdige[0].id === k.id && S.sider.blå.ferdige[0].status === 'levert', 'kontrakten ble ikke levert');
      ut.betalt = OppstartSpill.tilstand().penger - p0; krev(ut.betalt === k.betaling && k.betaling > 0, `betalingen stemmer ikke: ${ut.betalt} mot ${k.betaling}`);
      ut.rykte = [pål0, S.sider.blå.rykte.pålitelig]; krev(S.sider.blå.rykte.pålitelig > pål0, 'ryktet «pålitelig» gikk ikke opp');
      SS.vis(true); krev(/Levert\s*1/.test(P.textContent), 'panelet viser ikke den leverte kontrakten');
      // lagringen er ren JSON og leses tilbake for samme leir
      SS.lagre(); const igjen = Selskap.fraJSON(localStorage.getItem(SS.NØKKEL), L); krev(igjen && igjen.sider.blå.sum.levert === 1, 'lagringen leses ikke tilbake');
    } catch (e) { krev(false, 'unntak: ' + e.message); }
    finally {
      SS.vis(false); const brukt = OppstartSpill.tilstand().penger - pengerFør; if (brukt > 0) OppstartSpill.betal(brukt); else if (brukt < 0) OppstartSpill.gi(-brukt);
      if (lag && plassFør) { lag.x = plassFør.x; lag.y = plassFør.y; lag.sti = plassFør.sti; }
      tid = tidFør; if (før) SS.sett(JSON.parse(før)); else SS.sett(null);
      try { if (lagretFør === null) localStorage.removeItem(SS.NØKKEL); else localStorage.setItem(SS.NØKKEL, lagretFør); } catch (e) { /* */ }
      skitten = true;
    }
    return ut;
  });
  return { ok: !d.feil.length, tekst: d.feil.length ? d.feil.join('; ') : `kontrakt levert, betalt ${d.betalt} kr, pålitelig ${d.rykte[0]} -> ${d.rykte[1]}`, data: d };
} };
