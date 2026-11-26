'use strict';
// VAKT kritikerløkka r2, pakke «angrep3d» (26. nov):
//  (1) «Forsvar leiren» bruker kanten røverne faktisk kommer fra: et røverlag som starter i vest, men har en rute som kommer inn fra sør,
//      gir stillinger sør for leiren og banneret «fra sør» (Forsvar.innfart). Selvtest: uten ruta (bare startstedet) skal vakta se «vest».
//      Før noen røvere er på vei, står lagene i ring rundt leiren («rundt leiren»), ikke «mot nord».
//  (2) I ildkamp står det ingen ankomsttid i banneret («750 m unna · i ildkamp med …»).
//  (3) Kroppen når du går: åtte prøvepunkter og småsteg (Bevegelse.fri / steg) – en tynn vegg stopper deg minst 0,3 m unna.
//  (4) I 3D om natta: leirens lys (bålet, teltene) finnes i scenen (NATT.leirLys).
// Setter alt tilbake: lagene (plass, rute, stridsregler), angrepet, forsvaret, tid og 3D.
module.exports = {
  navn: 'angrep og 3D (kritikerløkka r2: forsvarskanten, ildkamp-teksten, kroppen mot vegger, leirens lys om natta)',
  kjør: async (pg, profil) => {
    const data = await pg.evaluate(async () => {
      const d = { feil: [] }, krev = (b, t) => { if (!b) d.feil.push(t); }, vent = ms => new Promise(r => setTimeout(r, ms));
      if (!window.Forsvar || !window.ForsvarSpill || !window.SpilletSpill || !SpilletSpill.klar() || !Forsvar.innfart) { d.feil.push('Forsvar.innfart / ForsvarSpill / SpilletSpill mangler'); return d; }
      const L = OppstartSpill.tilstand().leir, T = SpilletSpill.T(), FS = ForsvarSpill, før = { aktiv: T.aktiv, tid, retning: FS.retning(), satt: FS.erSatt(), logg: typeof loggLinjer !== 'undefined' ? loggLinjer.length : 0 };
      const blå = ENHETER.filter(e => e.side === 'blå' && !e.karakter), lagFør = blå.map(e => [e, e.x, e.y, e.sti, e.strid ? { ...e.strid } : null, e.forsvar]);
      // (spilløkka står stille mens prøvelaget har en rute uten steg – ellers flyttet løkka det: «Cannot read properties of null»)
      const sør = p => p.y < L.y - 20, nye = [], tempo0 = tempo; tempo = 0;
      try {
        // (1a) før røverne er på vei: ring rundt leiren
        if (FS.erSatt()) FS.opphev(false); T.aktiv = 0; FS.settRetning(NaN);
        const r0 = FS.sett(false), lag0 = blå.filter(e => e.forsvar && !e.leirvakt);
        d.ring = { lag: r0.lag, nord: lag0.filter(e => e.forsvar.y > L.y + 20).length, sør: lag0.filter(e => sør(e.forsvar)).length, logg: (typeof loggLinjer !== 'undefined' ? String(loggLinjer[0] || '') : '').slice(0, 90) };
        krev(!r0.lag || /rundt leiren/.test(d.ring.logg), 'før røverne er på vei står ikke forsvaret «rundt leiren»: ' + d.ring.logg);
        krev(lag0.length < 2 || (d.ring.nord >= 1 && d.ring.sør >= 1), 'ringen rundt leiren er ikke en ring: ' + JSON.stringify(d.ring));
        for (let i = 0; i < 40 && blå.some(e => e.planlegger); i++) await vent(100); FS.opphev(false);
        // (1b) røverne starter i vest, ruta kommer inn fra sør
        const rv = nyttLag('Vaktprøve røvere 9.1', L.x - 3500, L.y, 'rød'); rv.raid = 9; rv.fra = { x: rv.x, y: rv.y }; rv.startTid = tid;
        rv.sti = [[L.x - 3500, L.y], [L.x - 2200, L.y - 2600], [L.x - 100, L.y - 1800], [L.x, L.y - 700], [L.x, L.y]]; rv.seg = 0; rv.timerIgjen = 1.5;
        ENHETER.push(rv); nye.push(rv); T.aktiv = 9; FS.settRetning(NaN); await vent(1200);
        const sett = FS.kjent(rv), st = FS.status(); d.kant = { sett, overskrift: st ? st.overskrift : '(ingen status)' };
        if (!sett) {
          krev(/fra sør$/.test(d.kant.overskrift), 'banneret sier ikke «fra sør» for en rute som kommer inn fra sør: ' + d.kant.overskrift);
          const r1 = FS.sett(false), lag1 = blå.filter(e => e.forsvar && !e.leirvakt); d.kant.lag = r1.lag; d.kant.sør = lag1.filter(e => sør(e.forsvar)).length;
          krev(!lag1.length || d.kant.sør === lag1.length, 'stillingene står ikke mot sør: ' + JSON.stringify(d.kant));
          for (let i = 0; i < 40 && blå.some(e => e.planlegger); i++) await vent(100); FS.opphev(false);
          // selvtest: uten ruta (bare startstedet i vest) skal kanten bli vest – vakta ser forskjellen
          const sti = rv.sti; rv.sti = null; FS.settRetning(NaN); const st2 = FS.status(); d.kant.utenRute = st2 ? st2.overskrift : ''; rv.sti = sti;
          krev(/fra vest$/.test(d.kant.utenRute), 'selvtesten: uten rute burde kanten vært vest: ' + d.kant.utenRute);
        } else d.kant.merk = 'prøvelaget ble sett – kanten fra ruta ikke prøvd';
        // (2) i ildkamp: ingen ankomsttid
        const b0 = blå.find(e => levende(e) && !e.leirvakt);
        if (b0) { rv.x = L.x; rv.y = L.y - 600; rv.sti = null; const sp0 = rv.skyterPå; rv.skyterPå = new Set([b0]); const st3 = FS.status(); rv.skyterPå = sp0; d.ild = st3 ? st3.tekst : '';
          krev(/ildkamp/.test(d.ild) && !/framme om/.test(d.ild), 'i ildkamp står det fortsatt en ankomsttid: ' + d.ild); }
        krev(Forsvar.settTekst({ avstand: '750 m', strid: 'Vaktlaget', min: 17 }) === '750 m unna · i ildkamp med Vaktlaget', 'Forsvar.settTekst i ildkamp');
      } catch (e) { d.feil.push('forsvar: ' + (e && e.message)); }
      finally {
        for (const e of nye) { const i = ENHETER.indexOf(e); if (i >= 0) ENHETER.splice(i, 1); }
        for (let i = 0; i < 40 && blå.some(e => e.planlegger); i++) await vent(100);
        if (FS.erSatt()) FS.opphev(false);
        for (const [e, x, y, sti, strid, fsv] of lagFør) { e.x = x; e.y = y; e.sti = sti; e.strid = strid; if (fsv === undefined) delete e.forsvar; else e.forsvar = fsv; delete e.graver; e.siktSkitten = true; }
        tempo = tempo0; T.aktiv = før.aktiv; FS.settRetning(før.retning); tid = Math.max(tid, før.tid); if (typeof skitten !== 'undefined') skitten = true; FS.vis();
      }
      // (3) kroppen mot en tynn vegg (som Interior.VEGG): gå og løp, også på skrå – minst 0,3 m unna, aldri gjennom
      if (window.Bevegelse && Bevegelse.fri) {
        const vegg = (ax, ay, bx, by) => (x, y) => { const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy))); return Math.hypot(x - ax - t * dx, y - ay - t * dy) < .12; };
        let min = Infinity, gjennom = false;
        for (const g of [0, Math.PI / 8, Math.PI / 4]) for (const løp of [false, true]) { const nx = -Math.sin(g), ny = Math.cos(g), s = Bevegelse.ny(0, 0, 0), V = { høyde: () => 0, hindring: vegg(-50 * ny, 3 + 50 * nx, 50 * ny, 3 - 50 * nx) };
          for (let i = 0; i < 80; i++) { Bevegelse.steg(s, { fram: 1, retning: 0, løp }, .1, V); const a = s.x * nx + (s.y - 3) * ny; min = Math.min(min, Math.abs(a)); if (a > 0) gjennom = true; } }
        d.vegg = +min.toFixed(2); krev(!gjennom && min >= .3, `kroppen kom ${d.vegg} m fra veggen${gjennom ? ' (gjennom)' : ''}`);
        krev(Bevegelse.PRØVER && Bevegelse.PRØVER.length === 9, 'Bevegelse.PRØVER: kroppen prøves ikke i åtte retninger');
      } else d.feil.push('Bevegelse.fri mangler');
      // (4) leirens lys om natta (bare når 3D er på og leiren står i utsnittet)
      const i3d = typeof på3d !== 'undefined' && på3d && typeof R3 !== 'undefined' && R3 && R3.ut && !R3.bygger;
      if (i3d && Math.abs(L.x - R3.ut.cx) < R3.ut.S - 30 && Math.abs(L.y - R3.ut.cy) < R3.ut.S - 30) {
        for (let i = 0; i < 30 && !(R3.leirLys && R3.leirLys.length); i++) await vent(100);
        d.lys = { punkter: window.NATT ? NATT.leirLys : 0, nett: (R3.leirLys || []).length, i: (R3.leirLys || []).every(o => o.parent === R3.scene) };
        krev(d.lys.punkter >= 1 && d.lys.nett >= 3 && d.lys.i, 'leirens lys om natta mangler i 3D: ' + JSON.stringify(d.lys));
      } else d.lys = '(3D av – ikke prøvd)';
      return d;
    });
    const ok = !data.feil.length;
    return { ok, data, tekst: ok ? `ring før angrepet (${JSON.stringify(data.ring)}), kanten fra ruta «${data.kant && data.kant.overskrift}» (uten rute «${data.kant && data.kant.utenRute}»), ildkamp «${data.ild}», vegg ${data.vegg} m, lys ${JSON.stringify(data.lys)}` : data.feil.join('; ') };
  },
};
