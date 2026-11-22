// VAKT «leirvalg og tropper (R17)» (22. nov, funn 9, 12, 14, 15 i docs/natt/funn-r16-spilltest.md):
//  - funn 12: LeirSpill.kartveger finner bilvegene ved Dombås, og Leir.kanBygge avviser en brakke midt på vegen («står på vegen»),
//    mens den samme brakka 60 m fra alle veger godtas;
//  - funn 9: Garnison.avstand måler til omrisset (et L-formet prøvetettsted), og Oppstart.gyldigLeir avviser leir nærmere enn 400 m;
//  - funn 15: en tropp om bord får «Kjør dit», og window.OMBORD_ORDRE gir ordren til kjøretøyet (kjørTil) og setter avstigning;
//  - funn 14: troppebyggerens advarsel om byggelag og kø.
// Setter alt tilbake (laget, kjørTil, panelet).
module.exports = { navn: 'leirvalg og tropper (R17): veg som hindring, tettstedets omriss, Kjør dit', kjør: async (pg) => {
  const d = await pg.evaluate(async () => {
    const ut = { feil: [] }, krev = (ok, tekst) => { if (!ok) ut.feil.push(tekst); };
    // funn 12: vegene ved Dombås
    if (!window.LeirSpill || !LeirSpill.kartveger) krev(false, 'LeirSpill.kartveger mangler');
    else {
      const X = 193300, Y = 6898900, ve = await LeirSpill.kartveger([[X - 600, Y - 600], [X + 600, Y + 600]]) || [], bil = ve.filter(v => !v.g && 'ERFK'.includes(v.k));
      ut.veger = bil.length; krev(bil.length > 0, 'fant ingen bilveger ved Dombås');
      if (bil.length) { const v = bil.find(q => q.k === 'E') || bil[0], P = v.P[Math.floor(v.P.length / 2)], L = Leir.ny();
        const på = Leir.kanBygge(L, { type: 'brakke', x: P[0], y: P[1], ret: 0 }, { klasse: () => 2, veger: ve });
        ut.på = på; krev(/står på vegen/.test(på || ''), 'brakka midt på vegen ble godtatt: ' + på);
        // et sted minst 60 m fra alle vegene
        let fri = null; for (let r = 60; r < 600 && !fri; r += 40) for (let a = 0; a < 6.28 && !fri; a += .5) { const x = P[0] + r * Math.cos(a), y = P[1] + r * Math.sin(a);
          if (!Leir.påKartveg([[x - 30, y - 30], [x + 30, y - 30], [x + 30, y + 30], [x - 30, y + 30]], ve)) fri = [x, y]; }
        if (fri) krev(Leir.kanBygge(L, { type: 'brakke', x: fri[0], y: fri[1], ret: 0 }, { klasse: () => 2, veger: ve }) === null, 'brakka utenfor vegen ble avvist'); }
    }
    // funn 9: omrisset, ikke rektangelet
    { const by = { e: { navn: 'Prøvested', id: 'p' }, bb: [0, 0, 2000, 2000], deler: [[0, 0, 2000, 0, 2000, 500, 500, 500, 500, 2000, 0, 2000]] };
      krev(Math.round(Garnison.avstand(by, 1500, 1500)) === 1000, 'avstanden måles ikke til omrisset');
      const v = { iTettsted: () => null, nærTettsted: (x, y) => ({ navn: 'Prøvested', m: Garnison.avstand(by, x, y) }), klasse: () => 2 };
      krev(/for nær tettstedet/.test(Oppstart.gyldigLeir(2200, 250, v) || ''), 'leir 200 m fra tettstedet ble godtatt');
      krev(Oppstart.gyldigLeir(1500, 1500, v) === null, 'leir i bukta (1 km fra bebyggelsen) ble avvist'); }
    // funn 14
    { const P = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, navn: 'P' + i, oppgave: i < 4 ? 'bygg' : 'fri' }));
      krev(Tropper.advarsler(P, [3, 4, 5, 6, 7, 8, 9, 10], { jobber: 3 }).some(t => /ett byggelag/.test(t) && /2 står i kø/.test(t)), 'ingen advarsel om byggelag og kø'); }
    // funn 15: Kjør dit
    const k = (window.KJORETOY || []).find(q => q.side === 'blå' && Tropper.plass(q) > 0), s = ENHETER.find(e => e.side === 'blå' && !e.karakter && levende(e) && !e.ombord);
    if (!k || !s) krev(false, 'fant ikke kjøretøy og lag til «Kjør dit»');
    else { const før = { valgt, x: s.x, y: s.y, sti: s.sti }, kt = window.kjørTil, kall = [];
      try {
        window.kjørTil = (kj, X, Y) => { kall.push([kj, X, Y]); };
        s.ombord = k; valgt = s; visPanel();
        const tekster = [...document.querySelectorAll('#handl button')].map(b => b.textContent);
        krev(tekster.some(t => /^Kjør dit/.test(t)) && !tekster.some(t => /^Marsjer$/.test(t)), 'lagpanelet viser ikke «Kjør dit» for en tropp om bord: ' + tekster.join(', '));
        krev(window.OMBORD_ORDRE && OMBORD_ORDRE(s, k.x + 500, k.y), 'OMBORD_ORDRE tok ikke ordren');
        krev(kall.length === 1 && kall[0][0] === k && s.avstigning && s.avstigning.x === k.x + 500, 'ordren gikk ikke til kjøretøyet');
      } catch (e) { krev(false, 'unntak: ' + e.message); }
      finally { window.kjørTil = kt; s.ombord = null; delete s.avstigning; s.x = før.x; s.y = før.y; s.sti = før.sti; valgt = før.valgt; visPanel(); skitten = true; } }
    return ut;
  });
  return { ok: !d.feil.length, tekst: d.feil.length ? d.feil.join('; ') : `${d.veger} bilveger ved Dombås, «${d.på}», omrisset og Kjør dit`, data: d };
} };
