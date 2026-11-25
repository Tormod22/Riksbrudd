// Vakt for lønnen (brukeren 25. nov: «Ja» til lønn til folkene, 15 000 kr per person i døgnet, inflasjonen 1 %).
// Lønnen trekkes fra kassa hver spilltime, menn i egne tropper får også, tom kasse gir skyld (Folk-panelet sier det) og lavere
// moralmål, og alt etterbetales. Setter alt tilbake (folket, kassa, testbryteren).
module.exports = {
  navn: 'lønn til folkene',
  kjør: async (pg, profil) => {
    const d = await pg.evaluate(async () => {
      const ut = {}, FR = window.FolkRegler, FS = window.FolkSpill, OS = window.OppstartSpill;
      if (!FR || !FS || !FS.tilstand() || !OS || !OS.tilstand()) return { mangler: true };
      const F = FS.tilstand(), f0 = JSON.stringify(F), S = OS.tilstand(), p0 = S.penger, test0 = FS.lønnTest;
      try {
        // i testene betales ingen lønn av seg selv
        FS.lønnTest = false; ut.stille = FS.lønn(120) === null && S.penger === p0;
        FS.lønnTest = true; F.lønnAkk = 0; F.lønnTid = 0; F.ubetalt = 0;
        const døgn = FS.lønnNå(), n = F.personer.length; ut.døgn = døgn; ut.perDøgn = døgn >= n * FR.R.lønn && døgn <= n * FR.R.lønn * 3;
        S.penger = 5e6; FS.lønn(60); ut.time = Math.round(5e6 - S.penger); ut.betalt = Math.abs(ut.time - døgn / 24) <= 1;
        // tom kasse: skyld, melding og lavere moralmål
        S.penger = 100; FS.lønn(60); ut.skyld = F.ubetalt > 0 && S.penger === 100;
        FS.åpne(true); FS.vis(); const tekst = document.getElementById('folkmeny').textContent; ut.panel = /Lønn: .* per døgn/.test(tekst) && /Lønn skyldes/.test(tekst);
        FR.steg(F, LeirSpill.tilstand(), 1, FS.valg()); const mUten = F.mål; const gj = F.ubetalt; F.ubetalt = 0; FR.steg(F, LeirSpill.tilstand(), 1, FS.valg()); ut.moral = F.mål - mUten >= 15; F.ubetalt = gj;
        // etterbetaling
        S.penger = 5e6; FS.lønn(60); ut.etterbetalt = F.ubetalt === 0 && S.penger < 5e6 - gj;
        FS.vis(); ut.panelEtter = !/Lønn skyldes/.test(document.getElementById('folkmeny').textContent);
      } catch (err) { ut.feil = String(err && err.stack || err).slice(0, 300); }
      const g0 = JSON.parse(f0); for (const k of Object.keys(F)) delete F[k]; Object.assign(F, g0); S.penger = p0; FS.lønnTest = test0; FS.åpne(false);
      ut.tilbake = JSON.stringify(FS.tilstand()) === f0 && OS.tilstand().penger === p0;
      return ut;
    });
    if (d.mangler) return { ok: false, tekst: 'FolkSpill eller OppstartSpill finnes ikke (eller spillet er ikke startet)', data: d };
    const krav = ['stille', 'perDøgn', 'betalt', 'skyld', 'panel', 'moral', 'etterbetalt', 'panelEtter', 'tilbake'];
    const feil = krav.filter(k => !d[k]); if (d.feil) feil.push('feil: ' + d.feil);
    return { ok: !feil.length, tekst: feil.length ? `${profil}: mangler ${feil.join(', ')} ${JSON.stringify(d).slice(0, 300)}` : `${profil}: ${Math.round(d.døgn).toLocaleString('nb-NO')} kr i døgnet, ${d.time} kr per time, skyld når kassa er tom (panel og moral), etterbetalt, stille i testene`, data: d };
  },
};
