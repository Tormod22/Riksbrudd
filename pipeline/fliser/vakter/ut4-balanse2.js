// VAKT ut4-balanse2 (28. nov): varselet i byggelista før saga kjøpes (Produksjon.driftVarsel via window.BYGG_VARSEL i leir-visning.js),
// og tallene fra balansepakke 2 (maskinene betaler 0,3 % vedlikehold, kjelen brenner 0,6 m³ flis, flis 6 000 og ved 12 000 kr/m³).
// Lite penger: kortet «Sagbruk» viser «Rekker …» og hele teksten i forklaringen; mye penger: ingen varsel. Setter alt tilbake.
module.exports = {
  navn: 'ut4-balanse2',
  kjør: async (pg) => {
    const r = await pg.evaluate(async () => {
      const ut = { ok: true, feil: [], data: {} }, feil = t => { ut.ok = false; ut.feil.push(t); };
      if (!window.Produksjon || !window.Leir || !window.OppstartSpill || !window.LeirSpill) return { ok: false, feil: ['mangler Produksjon/Leir/OppstartSpill/LeirSpill'], data: {} };
      // tallene
      const P = Produksjon.REGLER, M = Leir.MATERIALER;
      if (Leir.REGLER.vedlikeholdMaskin !== .003) feil('vedlikeholdet for maskinene er ' + Leir.REGLER.vedlikeholdMaskin + ' (ventet 0,003)');
      if (P.maskiner.fyrkjele.inn[0].flis !== .6 || P.maskiner.fyrkjele.inn[1].ved !== .45) feil('kjelen brenner ' + JSON.stringify(P.maskiner.fyrkjele.inn));
      if (M.flis.pris !== 6000 || M.ved.pris !== 12000) feil(`flis ${M.flis.pris} / ved ${M.ved.pris}`);
      { const L = { bygg: [{ type: 'sagbruk', igjen: 0, pris: 6e6 }] }, v = Leir.vedlikehold(L).perDøgn; if (Math.round(v) !== 18000) feil('saga koster ' + v + ' kr i vedlikehold i døgnet (ventet 18 000)'); }
      // varselet
      const S = OppstartSpill.tilstand(), før = S.penger, meny = document.querySelector('#leirmeny'), åpen = meny && meny.classList.contains('på');
      const kort = () => document.querySelector('#leirmeny .bygg.kort[data-type="sagbruk"]');
      const vis = async () => { if (!meny.classList.contains('på')) document.querySelector('#leirknapp').click(); LeirSpill.fane('bygg'); await new Promise(q => setTimeout(q, 400)); };
      try {
        S.penger = 9e6;
        const V = (window.BYGG_VARSEL || []).map(f => f('sagbruk', {})).find(Boolean);
        ut.data.tekst = V && V.tekst;
        if (!V || !V.varsel) feil('ingen varsel for saga med 9 mill. i kassa');
        else if (!/Sagbruk koster/.test(V.tekst) || !/rekker/.test(V.tekst) || !/vent til dere har/.test(V.tekst)) feil('varselteksten: ' + V.tekst);
        await vis(); const k = kort();
        if (!k) feil('fant ikke kortet «Sagbruk» i byggelista');
        else { const s = k.querySelector('.varsel'); ut.data.kort = s && s.textContent;
          if (!s || !/^Rekker/.test(s.textContent)) feil('kortet viser ikke varselet (' + (s ? s.textContent : 'ingen .varsel') + ')');
          if (!/Sagbruk koster/.test(k.dataset.tips || '')) feil('forklaringen på kortet har ikke varselteksten'); }
        S.penger = 1e9;
        if ((window.BYGG_VARSEL || []).map(f => f('sagbruk', {})).find(Boolean)) feil('varsel med 1 000 mill. i kassa');
        await vis(); const k2 = kort(); if (k2 && k2.querySelector('.varsel')) feil('kortet viser varsel med 1 000 mill.');
        if ((window.BYGG_VARSEL || []).map(f => f('brakke', {})).find(Boolean)) feil('varsel for en brakke');
      } catch (e) { feil('unntak: ' + e.message); }
      finally { S.penger = før; if (meny && !åpen && meny.classList.contains('på')) document.querySelector('#leirknapp').click(); else if (åpen) LeirSpill.fane('bygg'); }
      return ut;
    });
    return { ok: r.ok, tekst: r.ok ? `varselet før saga: «${r.data.kort}» på kortet, ingen varsel med nok penger; tallene for balanse 2 stemmer` : r.feil.join('; '), data: r.data };
  },
};
