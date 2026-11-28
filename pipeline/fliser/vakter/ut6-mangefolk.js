// Vakt «mange folk og utposter» (ut6-mangefolk, fase F5): 200 prøvefolk i en prøveleir går under tidsgrensen per oppdatering,
// Folk-panelet bygges i grupper, en person i en utpost 4 km unna bidrar først etter reisetida, trafikkartet tegnes, og «Gå hit»
// flytter personen før jobbtavla tar over igjen. Setter alt tilbake (bygg, folk, utposter, trafikkart, tid, kamera, JobberSpill.test).
module.exports = {
  navn: 'mange folk og utposter (F5)',
  kjør: async (pg, profil) => pg.evaluate(async () => {
    const ut = { feil: [] }, krev = (b, t) => { if (!b) ut.feil.push(t); };
    if (!window.Folkgang || !window.FolkgangSpill || !window.Utpost || !window.UtpostSpill || !window.TrafikkSpill || !window.LeirSpill || !window.FolkSpill) return { ok: false, tekst: 'Folkgang/Utpost/TrafikkSpill mangler', data: ut };
    const L = LeirSpill.tilstand(), F = FolkSpill.tilstand(), m = OppstartSpill.tilstand().leir;
    const bygg0 = JSON.stringify(L.bygg), neste0 = L.neste, nj0 = L.nesteJobb, pers0 = JSON.stringify(F.personer), fn0 = F.neste, nb0 = JSON.stringify(F.navnBrukt || []), mat0 = F.mat;
    const tid0 = tid, test0 = JobberSpill.test, kam0 = { ...kam }, trafikk0 = TrafikkSpill.på(), up0 = localStorage.getItem('riksbrudd-utpost'), penger0 = OppstartSpill.tilstand().penger;
    const fmÅpen = document.getElementById('folkmeny') && document.getElementById('folkmeny').classList.contains('på');
    const kl = h => ((h - 6 + 24) % 24) * 60;
    try {
      // ---------- prøveleir med 200 folk: 26 brakker, kjøkken, verksted, vakttårn, kontrollrom, sykestue ----------
      let id = 910000; const legg = (type, x, y) => { const b = { id: id++, type, x: m.x + x, y: m.y + y, ret: 0, nivå: 1, hp: 1, igjen: 0, totalt: 100, nr: id, arbeid: null }; L.bygg.push(b); return b; };
      for (let k = 0; k < 26; k++) legg('brakke', -60 + (k % 7) * 17, 30 + Math.floor(k / 7) * 17);
      legg('kjøkken', 25, -22); legg('vakttårn', 55, 0); legg('verksted', -28, -28); legg('kontrollrom', 0, -40); legg('sykestue', -55, 0); for (let k = 0; k < 3; k++) legg('aggregat', 75, -10 + k * 9);
      const r = FolkRegler.rng(4242), OPP = ['bygg', 'vakt', 'kjøkken', 'verksted', 'fri', 'stell', 'overvåking'];
      while (F.personer.length < 200) FolkRegler.nyPerson(F, r, OPP[F.personer.length % OPP.length]);
      JobberSpill.test = true; tid = kl(9); FolkgangSpill.nullstill(); if (FolkgangSpill.nullstillMåling) FolkgangSpill.nullstillMåling();
      // oppvarming (nye veikart for alle målene), så målt
      for (let k = 0; k < 40; k++) FolkgangSpill.steg(.25);
      for (let k = 0; k < 10; k++) FolkgangSpill.steg(15);
      const tider = []; for (let k = 0; k < 40; k++) { const t = performance.now(); FolkgangSpill.steg(.25); tider.push(performance.now() - t); }
      const snitt = tider.reduce((a, b) => a + b, 0) / tider.length, o = Folkgang.oversikt(FolkgangSpill.tilstand());
      ut.ytelse = { folk: F.personer.length, snitt: +snitt.toFixed(3), lengste: +Math.max(...tider).toFixed(2), framme: o.framme, fast: o.fast };
      // målet er 3 ms (snitt per oppdatering); vakta tåler 6 ms fordi testmaskinen deles med andre prosesser
      krev(snitt < 6, `200 folk: ${snitt.toFixed(2)} ms per oppdatering (grense 6, målet 3)`);
      krev(o.framme > 150, '200 folk: bare ' + o.framme + ' er framme etter 2,5 min spilltid');
      // Folk-panelet med 200: grupper og søk, ikke 200 rader
      FolkSpill.åpne(true); { const v = document.getElementById('visfolk'); if (v && /Vis folkene/.test(v.textContent)) v.click(); }
      { const t = performance.now(); FolkSpill.vis(); ut.panel = { ms: +(performance.now() - t).toFixed(1), grupper: document.querySelectorAll('#folkmeny .gruppe').length, rader: document.querySelectorAll('#folkmeny .person').length, søk: !!document.getElementById('folksok') }; }
      krev(ut.panel.grupper >= 3 && ut.panel.rader < 60 && ut.panel.søk, 'Folk-panelet med 200: ' + JSON.stringify(ut.panel));
      { const v = document.getElementById('visfolk'); if (v && /Skjul/.test(v.textContent)) v.click(); } if (!fmÅpen) FolkSpill.åpne(false);

      // ---------- utpost 4 km unna: én person reiser dit og bidrar først når hen er framme ----------
      const U = Utpost.lag(m.x + 4000, m.y + 300, 'Utpost Vakt'); krev(!!U, 'Utpost.lag ga ingen utpost');
      const p = F.personer.find(q => q.oppgave === 'vakt'); krev(U && Utpost.tildel(p, U.id), 'Utpost.tildel virket ikke');
      for (let k = 0; k < 4; k++) FolkgangSpill.steg(15);
      const G = FolkgangSpill.tilstand(), u0 = G.ute[U.id] || {}; const s0 = G.pers[p.id];
      ut.utpostFør = { reiser: u0.reiser, arbeidSek: u0.arbeidSek, framme: s0 && s0.framme, tekst: FolkgangSpill.tekst(p), timer: U.timer.arbeid };
      krev(u0.reiser === 1 && !s0.framme && /reiser til Utpost Vakt/.test(ut.utpostFør.tekst), 'utposten: personen reiser ikke: ' + JSON.stringify(ut.utpostFør));
      const reise = Utpost.reisetid(U); for (let t = 0; t < reise + 120; t += 60) FolkgangSpill.steg(60);
      for (let k = 0; k < 4; k++) FolkgangSpill.steg(60);
      const u1 = G.ute[U.id] || {}; ut.utpostEtter = { reisetid: Math.round(reise), framme: G.pers[p.id].framme, arbeider: u1.arbeider, timeverk: +U.timer.arbeid.toFixed(3), tekst: FolkgangSpill.tekst(p) };
      krev(ut.utpostEtter.framme && u1.arbeider === 1 && U.timer.arbeid > 0 && ut.utpostFør.timer === 0, 'utposten: personen bidrar ikke etter reisetida: ' + JSON.stringify(ut.utpostEtter));

      // ---------- «Gå hit»: personen går dit og jobbtavla tar over igjen ----------
      tid = kl(9); for (let k = 0; k < 8; k++) FolkgangSpill.steg(15);
      const q = F.personer.find(x => x.oppgave === 'verksted' && G.pers[x.id] && G.pers[x.id].framme && !Utpost.hvor(x.id)); krev(!!q, 'fant ingen verkstedarbeider som er framme');
      if (q) { const før = G.pers[q.id].mål.k, mål = { x: m.x - 8, y: m.y + 10 };
        const r1 = FolkgangSpill.ordre({ person: q.id, hva: 'gå', x: mål.x, y: mål.y }); FolkgangSpill.steg(.25);
        const på = !!G.ordre[q.id] && G.pers[q.id].mål && G.pers[q.id].mål.ordre;
        let k = 0; while (G.ordre[q.id] && k++ < 200) FolkgangSpill.steg(1);
        const s = G.pers[q.id], avst = Math.hypot(s.x - mål.x, s.y - mål.y); FolkgangSpill.steg(.25);
        ut.ordre = { ok: r1 && r1.ok, på, sek: k, avst: +avst.toFixed(1), etter: G.pers[q.id].mål.k, før };
        krev(ut.ordre.ok && på && avst < 3 && G.pers[q.id].mål.k === før, '«Gå hit»: ' + JSON.stringify(ut.ordre)); }

      // ---------- trafikkartet: gangen er telt og bildet tegnes ----------
      TrafikkSpill.vis(true); kam.x = m.x; kam.y = m.y; kam.m = 1;
      const ov = TrafikkSpill.oversikt(), c = TrafikkSpill.bilde(); let farget = 0;
      if (c) { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) farget++; }
      { const cv = document.createElement('canvas'); cv.width = 400; cv.height = 300; const g = cv.getContext('2d'); let f = null; for (const h of KROKER.tegn) { try { h(g, kam.x - 200, kam.y + 150); } catch (e) { f = e.message; } } ut.tegnFeil = f; }
      ut.trafikk = { meter: Math.round(ov ? ov.meter : 0), ruter: farget, tekst: TrafikkSpill.tekst() };
      krev(ov && ov.meter > 50 && farget > 5 && !ut.tegnFeil, 'trafikkartet: ' + JSON.stringify(ut.trafikk) + (ut.tegnFeil ? ' feil: ' + ut.tegnFeil : ''));
    } catch (e) { ut.feil.push('unntak: ' + e.message); }
    finally {
      L.bygg.splice(0, L.bygg.length, ...JSON.parse(bygg0)); L.neste = neste0; L.nesteJobb = nj0;
      F.personer.splice(0, F.personer.length, ...JSON.parse(pers0)); F.neste = fn0; F.navnBrukt = JSON.parse(nb0); F.mat = mat0;
      try { if (up0 === null) localStorage.removeItem('riksbrudd-utpost'); else localStorage.setItem('riksbrudd-utpost', up0); } catch (e) { /* */ } UtpostSpill.les();
      TrafikkSpill.vis(trafikk0); TrafikkSpill.nullstill(); Object.assign(kam, kam0);
      const dp = OppstartSpill.tilstand().penger - penger0; if (dp < 0) OppstartSpill.gi(-dp);
      tid = tid0; JobberSpill.test = test0; FolkgangSpill.nullstill(); if (typeof skitten !== 'undefined') skitten = true;
    }
    return { ok: !ut.feil.length, tekst: ut.feil.length ? ut.feil.join('; ') : `200 folk ${ut.ytelse.snitt} ms per oppdatering, utpost etter ${ut.utpostEtter.reisetid} s reise, «Gå hit» ${ut.ordre && ut.ordre.sek} s, trafikk ${ut.trafikk.meter} m`, data: ut };
  }),
};
