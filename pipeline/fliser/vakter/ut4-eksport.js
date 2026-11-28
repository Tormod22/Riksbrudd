// Vakt for pakka «ut4-eksport» (fase Ø6, 28. nov; docs/natt/ut4-eksport.md): eksport sjøveien og over grensa, eurokreditt.
// 1) SJØVEIEN: en eksportordre tas via en prøvehavn (stor, avtale), «Send lastebil» laster plankene fra lageret, vakta flytter bilen til
//    havna (testsiden har ikke vegnettet), skipet bestilles, legger til og går – eurokreditten kommer i kassa og vises i statuslinja;
// 2) VEKSLING: «Veksle alt» gir kronene etter kursen (inflasjonen) minus gebyret;
// 3) SMUGLING: en grenseordre uten avtale med Grensevakta – med beslag sikkert (sjansen satt til 1) tar tollen lasten og ryktet faller;
// 4) PANELET: Selskap → Oversikt har delen «Eksport».
// Setter alt tilbake: eksporten, kassa, lageret, kjøretøyene, reglene, loggen og lagringen.
module.exports = {
  navn: 'ut4-eksport',
  kjør: async (pg, profil) => pg.evaluate(async () => {
    const feil = [], d = {}, krev = (b, t) => { if (!b) feil.push(t); };
    const E = window.Eksport, ES = window.EksportSpill, OS = window.OppstartSpill, LS = window.LeirSpill;
    if (!E || !ES || !OS || !LS || !window.VareSpill || !window.Kjoretoy) return { ok: false, tekst: 'Eksport, EksportSpill, OppstartSpill, LeirSpill, VareSpill eller Kjoretoy mangler', data: {} };
    if (!ES.start()) return { ok: false, tekst: 'eksporten fikk ikke startet (ingen leir)', data: {} };
    const penger = () => OS.tilstand().penger, settPenger = v => { const p = penger(); if (p > v) OS.betal(p - v); else if (p < v) OS.gi(v - p); };
    const L = LS.tilstand(), leir = OS.tilstand().leir, S0 = ES.tilstand();
    const før = { penger: penger(), S: JSON.stringify(E.tilJSON(S0)), kj: (window.KJORETOY || []).slice(), kjPlass: KJORETOY.map(q => [q, q.x, q.y, q.sti, q.vare]), lager: { ...L.lager }, tid,
      pirat: { ...E.REGLER.pirat }, beslag: E.REGLER.grense.beslag, ekstra: ES.ekstra.slice(), lagring: localStorage.getItem('riksbrudd-eksport'),
      logg: typeof loggLinjer !== 'undefined' ? loggLinjer.slice() : null };
    try {
      ES.nullstill(); const S = ES.tilstand();
      // prøvehavna (stor, avtale) 5 km fra leiren, og en lastebilkolonne på tjue ved leiren (240 m³)
      ES.ekstra.push({ id: 'vaktHavn', navn: 'Vakthavn', x: leir.x + 5000, y: leir.y, størrelse: 'stor', avtale: true, hvorfor: 'prøve' });
      krev(ES.havner().some(h => h.id === 'vaktHavn'), 'prøvehavna er ikke blant havnene');
      const bil = Kjoretoy.ny({ navn: 'Vaktbil ut4', type: 'lastebil', antall: 20, x: leir.x + 30, y: leir.y + 20, side: 'blå' }); KJORETOY.push(bil);
      E.REGLER.pirat.avtale = 0; E.REGLER.pirat.uten = 0;
      // ---------- 1) SJØVEIEN ----------
      const k = E.lagOrdre(S, tid, { vei: 'sjø', vare: 'tre', størst: 400, rand: E.lagRand(42) }); S.tilbud.push(k);
      krev(/vil ha .* planker innen \d+ døgn/.test(k.tittel), 'tittel: ' + k.tittel);
      L.lager.tre = k.mengde + 3;
      const rt = ES.kommando('eksportTa', { id: k.id, ut: 'vaktHavn' }); d.ta = rt && (rt.feil || (rt.svar && rt.svar.tekst));
      krev(k.status === 'aktiv' && k.ut && k.ut.id === 'vaktHavn', 'ordren ble ikke tatt: ' + d.ta);
      const rs = ES.kommando('eksportSend', { id: k.id, hvordan: 'bil' }); d.send = rs && (rs.feil || (rs.svar && rs.svar.tekst));
      const tur = k.turer[0], b = tur ? KJORETOY.find(q => q.navn === tur.bil) : null; d.bil = b && b.navn;
      krev(b && b.vare === k.id && Math.abs(tur.mengde - k.mengde) < .05, 'lasten står ikke på bilen: ' + d.send);
      krev(Math.abs(L.lager.tre - 3) < .05, `lageret skulle ha 3 m³ igjen, har ${L.lager.tre}`);
      // vakta kjører bilen til havna
      if (b) { b.sti = null; b.x = leir.x + 5050; b.y = leir.y; }
      ES.steg();
      krev(Math.abs(k.iHavn - k.mengde) < .05 && k.skip && !k.skip.ved, 'lasten kom ikke på kaia / skipet ble ikke bestilt: ' + JSON.stringify({ iHavn: k.iHavn, skip: k.skip }));
      krev(b && !b.vare, 'bilen er fortsatt merket med lasten');
      if (k.skip) { k.skip.ankommer = tid; ES.steg(); krev(k.skip.ved, 'skipet la ikke til'); k.skip.går = tid; ES.steg(); }
      d.sjø = { status: k.status, ek: S.ek, betaling: k.betaling };
      krev(k.status === 'levert' && Math.abs(S.ek - k.betaling) < .05, 'eksporten er ikke levert og betalt: ' + JSON.stringify(d.sjø));
      ES.visEuro(); const se = document.getElementById('sEuro');
      krev(se && se.parentNode && !se.parentNode.hidden && /EK/.test(se.textContent), 'eurokreditten vises ikke i statuslinja');
      // ---------- 2) VEKSLING ----------
      const p0 = penger(), ek = S.ek, forventet = Math.round(ek * E.nettoKurs(ES.infl()));
      ES.kommando('eksportVeksle', { ek: 'alt' }); d.veksle = { ek, kr: penger() - p0, forventet };
      krev(S.ek === 0 && penger() - p0 === forventet && forventet > 0, 'vekslingen: ' + JSON.stringify(d.veksle));
      // ---------- 3) SMUGLING OVER GRENSA ----------
      const G = ES.grenser(); krev(G.length > 0, 'ingen grensestasjon innen ' + E.REGLER.grense.maks + ' m');
      if (G.length) {
        // (28. nov, fiks c) vaktbilen kjøres hjem fra havna igjen: ellers tar turen leirens første lastebil, som en vakt før kan ha flyttet bort
        if (b) { b.sti = null; b.x = leir.x + 30; b.y = leir.y + 20; }
        E.REGLER.grense.beslag = 1; S.grensevakt = false; const r0 = S.rykte;
        const kg = E.lagOrdre(S, tid, { vei: 'grense', vare: 'tre', rand: E.lagRand(7) }); S.tilbud.push(kg); L.lager.tre = 12;
        ES.kommando('eksportTa', { id: kg.id, ut: G[0].id }); krev(kg.status === 'aktiv' && kg.ut.slag === 'grense', 'grenseordren ble ikke tatt');
        const uten = ES.send(kg.id, 'bil', false); krev(uten.feil && /Grensevakta/.test(uten.feil), 'uten avtale skulle «Send lastebil» kreve Grensevakta: ' + JSON.stringify(uten));
        // (ut6-fiksd) vaktbilen står ved havna etter del 1; uten den lånte turen leirens egen bil, og den kan en vakt før ha flyttet
        // (i rask kjøring sto «Lastebil 1» 778 m unna). Vaktbilen kjøres hjem først (alle bilene settes tilbake i finally).
        bil.sti = null; bil.x = leir.x + 30; bil.y = leir.y + 20;
        const p1 = penger(), rg = ES.kommando('eksportSend', { id: kg.id, hvordan: 'bil', smugling: true });
        const tg = kg.turer[0], bg = tg ? KJORETOY.find(q => q.navn === tg.bil) : null;
        krev(tg && tg.smugling && penger() === p1, 'smuglerturen startet ikke (eller kostet penger): ' + (rg && rg.feil));
        if (bg) { bg.sti = null; bg.x = kg.ut.x; bg.y = kg.ut.y; } ES.steg();
        d.smugling = { levert: kg.levert, beslag: S.sum.beslag, rykte: [r0, S.rykte], turer: kg.turer.length };
        krev(kg.levert === 0 && S.sum.beslag === 1 && S.rykte < r0 && kg.turer.length === 0, 'smuglingen ga ikke beslag: ' + JSON.stringify(d.smugling));
        // med avtale: turen koster, og lasten kommer over (bilen er kjørt hjem igjen)
        if (bg) { bg.x = leir.x + 30; bg.y = leir.y + 20; }
        E.REGLER.grense.beslag = 0; ES.kommando('eksportGrensevakt', { på: true }); L.lager.tre = 12; const p2 = penger();
        ES.kommando('eksportSend', { id: kg.id, hvordan: 'bil' }); const ta = kg.turer[0], ba = ta ? KJORETOY.find(q => q.navn === ta.bil) : null;
        krev(ta && p2 - penger() === E.turPris(ES.infl()), `turen med Grensevakta kostet ${p2 - penger()}, ikke ${E.turPris(ES.infl())}`);
        if (ba) { ba.sti = null; ba.x = kg.ut.x; ba.y = kg.ut.y; } ES.steg(); krev(kg.levert > 0, 'lasten kom ikke over grensa med avtale');
      }
      // ---------- 4) PANELET ----------
      if (window.SelskapetSpill && SelskapetSpill.vis) { SelskapetSpill.vis(true, 'oversikt'); await new Promise(r => setTimeout(r, 300));
        const h = document.getElementById('eksport'); krev(h && /Eksport/.test(h.textContent), 'delen «Eksport» står ikke i Selskap → Oversikt'); SelskapetSpill.vis(false); }
    } catch (e) { feil.push('unntak: ' + e.message); }
    finally {
      Object.assign(E.REGLER.pirat, før.pirat); E.REGLER.grense.beslag = før.beslag; ES.ekstra.length = 0; ES.ekstra.push(...før.ekstra);
      const S = ES.tilstand(); Object.keys(S).forEach(n => delete S[n]); Object.assign(S, E.fraJSON(JSON.parse(før.S)));
      KJORETOY.length = 0; KJORETOY.push(...før.kj); for (const [q, x, y, sti, v] of før.kjPlass) { q.x = x; q.y = y; q.sti = sti; q.vare = v; }
      for (const n of Object.keys(L.lager)) if (!(n in før.lager)) delete L.lager[n]; Object.assign(L.lager, før.lager); settPenger(før.penger); tid = før.tid;
      if (før.lagring === null) localStorage.removeItem('riksbrudd-eksport'); else localStorage.setItem('riksbrudd-eksport', før.lagring);
      if (før.logg && typeof loggLinjer !== 'undefined') { loggLinjer.length = 0; loggLinjer.push(...før.logg); }
      ES.visEuro(); try { LS.lagre(); } catch (e) { /* */ } skitten = true;
    }
    return { ok: !feil.length, tekst: feil.length ? feil.join('; ') : `eksport: ordre tatt, ${d.sjø && d.sjø.ek} eurokreditt for planker sjøveien, vekslet til ${d.veksle && d.veksle.kr} kr, smugling ga beslag`, data: d };
  }),
};
