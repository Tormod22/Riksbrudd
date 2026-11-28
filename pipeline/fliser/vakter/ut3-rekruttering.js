// VAKT «rekruttering og opplæring» (28. nov, pakke ut3-rekruttering; spill/rekruttering.js + rekruttering-visning.js):
// søkere kommer om morgenen, «Ansett» i Folk-panelet trekker utstyret og legger personen til med lønnskravet, lønna trekkes per person,
// «By over» ansetter for budet + 1 000 kr, «Gi lønnstillegg» holder på en som blir lokket, og opplæring på øvingsfeltet øker ferdigheten.
// Setter alt tilbake (folket, søkerne, kassa, byggene, testbryterne, panelet).
module.exports = {
  navn: 'rekruttering og opplæring',
  kjør: async (pg, profil) => {
    const d = await pg.evaluate(async () => {
      const ut = {}, RS = window.RekrutteringSpill, RK = window.Rekruttering, FR = window.FolkRegler, FS = window.FolkSpill, OS = window.OppstartSpill, LS = window.LeirSpill;
      if (!RS || !RK || !FS || !FS.tilstand() || !OS || !OS.tilstand() || !LS || !LS.tilstand() || !RS.tilstand()) return { mangler: true };
      const vent = ms => new Promise(r => setTimeout(r, ms)), F = FS.tilstand(), L = LS.tilstand(), S = RS.tilstand(), O = OS.tilstand();
      const f0 = JSON.stringify(F), s0 = JSON.stringify(S), b0 = JSON.stringify(L.bygg), n0 = L.neste, p0 = O.penger, t0 = RS.test, lt0 = FS.lønnTest;
      const panel = () => document.getElementById('folkmeny'), tekst = n => (n ? n.textContent.replace(/\s+/g, ' ') : '');
      try {
        // (1) i testene kommer ingen søkere av seg selv; med testbryteren kommer 0–3 hver morgen
        ut.stille = JSON.parse(s0).dag == null;
        RS.test = true; let nye = 0; for (let i = 0; i < 12 && !nye; i++) { const u = RS.morgen(); nye = u ? u.nye.length : 0; }
        ut.søkere = nye > 0 && nye <= 3 && S.søkere.length >= nye && S.søkere.every(s => s.navn && s.yrke && s.lønn >= 12000 && s.lønn <= 25000);
        RS.test = false;
        // en brakke til (ledig seng) og et ferdig øvingsfelt ved leiren
        const C = L.midt || O.leir; L.bygg.push({ id: L.neste++, type: 'brakke', x: C.x + 400, y: C.y + 400, ret: 0, igjen: 0, totalt: 120, hp: 1, nivå: 3 },
          { id: L.neste++, type: 'øvingsfelt', x: C.x + 430, y: C.y + 400, ret: 0, igjen: 0, totalt: 120, hp: 1, nivå: 1 });
        F.moral = Math.max(F.moral, 70); O.penger = 10e6;
        // (2) «Ansett» i panelet: utstyret trekkes, personen er med og har lønnskravet sitt
        S.søkere.push({ id: 9001, navn: 'Vakt Søkersen', alder: 31, yrke: 'sveiser', ferd: { ...F.personer[0].ferd, verksted: 1.4 }, egen: ['flittig'], lojal: .6, lønn: 19500, går: tid + 2880 },
          { id: 9002, navn: 'Vakt Budsen', alder: 44, yrke: 'bilmekaniker', ferd: { ...F.personer[0].ferd, verksted: 1.45 }, egen: [], lojal: .6, lønn: 21000, går: tid + 2880, bud: { rival: 'ravnsund', navn: 'Ravnsund', lønn: 24000 } });
        FS.åpne(true); FS.vis(); await vent(150);
        const kort = panel().querySelector('.søker[data-søker="9001"]'); ut.kort = !!kort && /Krever 19 500 kr/.test(tekst(kort)) && /flittig/.test(tekst(kort)) && !!document.getElementById('sokere');
        const n1 = F.personer.length, k1 = O.penger; const ak = kort && kort.querySelector('button.ansett'); if (ak) ak.click(); await vent(100);
        const ny = F.personer.find(p => p.navn === 'Vakt Søkersen');
        ut.ansatt = !!ny && F.personer.length === n1 + 1 && k1 - O.penger === RK.REGLER.utstyr && ny.lønn === 19500 && !S.søkere.some(s => s.id === 9001);
        // (3) «By over»: ansatt for budet + 1 000
        FS.vis(); await vent(100); const bk = panel().querySelector('.søker[data-søker="9002"] button.byover');
        ut.byOverKnapp = !!bk && /25 000/.test(tekst(bk)); if (bk) bk.click(); await vent(100);
        const bud = F.personer.find(p => p.navn === 'Vakt Budsen'); ut.byOver = !!bud && bud.lønn === 25000;
        // (4) lønna trekkes per person (en spilltime)
        FS.lønnTest = true; F.lønnAkk = 0; F.lønnTid = 0; F.ubetalt = 0; const før = O.penger; FS.lønn(60);
        const forventet = FR.lønnSum(F, 0, 1), standard = F.personer.length * FR.R.lønn; ut.lønnTime = Math.round(før - O.penger);
        ut.lønn = forventet === standard - 2 * FR.R.lønn + 19500 + 25000 && Math.abs(FS.lønnNå() / 24 - ut.lønnTime) <= 2 && FS.lønnNå() > standard;
        FS.lønnTest = lt0;
        // (5) en rival lokker – «Gi lønnstillegg»
        const q = F.personer.find(p => p.navn !== 'Vakt Søkersen' && p.navn !== 'Vakt Budsen');
        S.lokk = { id: q.id, navn: 'Mosevakt', rival: 'mosevakt', lønn: 18500, frist: tid + 600, person: q.navn }; FS.vis(); await vent(100);
        const lk = document.getElementById('lokktillegg'); if (lk) lk.click(); await vent(100); ut.lokk = !!lk && q.lønn === 18500 && !S.lokk && F.personer.includes(q);
        // (6) opplæring: velg person og ferdighet, ferdigheten stiger på ett døgn
        const e = F.personer.find(p => FR.arbeidsfør(p) && !p.trener && (p.ferd.stell || 0) < 1.3); e.ferd.stell = 1; FS.vis(); await vent(100);
        const vp = document.getElementById('oppperson'), vo = document.getElementById('oppferd'), st = document.getElementById('opplaringstart');
        if (vp && vo && st) { vp.value = String(e.id); vp.onchange(); vo.value = 'stell'; vo.onchange(); st.click(); } await vent(100);
        ut.påSkole = e.skole === 'stell' && !FR.arbeidsfør(e);
        RS.steg(1440); ut.ferdighet = e.ferd.stell; ut.opplæring = ut.påSkole && Math.abs(e.ferd.stell - 1.05) < 1e-6;
        FS.vis(); ut.elevVist = /Opplæring \(1 av 4 plasser\)/.test(tekst(panel()));
      } catch (err) { ut.feil = String(err && err.stack || err).slice(0, 300); }
      // tilbake
      const g0 = JSON.parse(f0); for (const k of Object.keys(F)) delete F[k]; Object.assign(F, g0);
      const h0 = JSON.parse(s0); for (const k of Object.keys(S)) delete S[k]; Object.assign(S, h0);
      L.bygg = JSON.parse(b0); L.neste = n0; O.penger = p0; RS.test = t0; FS.lønnTest = lt0; RS.lagre(); LS.lagre(); FS.åpne(false);
      ut.tilbake = JSON.stringify(FS.tilstand()) === f0 && JSON.stringify(RS.tilstand()) === s0 && OS.tilstand().penger === p0;
      return ut;
    });
    if (d.mangler) return { ok: false, tekst: 'RekrutteringSpill, FolkSpill eller spillet mangler', data: d };
    const krav = ['stille', 'søkere', 'kort', 'ansatt', 'byOverKnapp', 'byOver', 'lønn', 'lokk', 'påSkole', 'opplæring', 'elevVist', 'tilbake'];
    const feil = krav.filter(k => !d[k]); if (d.feil) feil.push('feil: ' + d.feil);
    return { ok: !feil.length, tekst: feil.length ? `${profil}: mangler ${feil.join(', ')} ${JSON.stringify(d).slice(0, 300)}` : `${profil}: søkere kommer, «Ansett» trekker utstyret og gir lønnskravet, «By over» (25 000 kr), lønn per person (${d.lønnTime} kr i timen), lønnstillegg holder på en som ble lokket, opplæring ${String(d.ferdighet).replace('.', ',')} etter ett døgn – og alt satt tilbake`, data: d };
  },
};
