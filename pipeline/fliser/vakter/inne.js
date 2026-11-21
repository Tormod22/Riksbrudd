'use strict';
// VAKT for pakka «inne» (runde 15, 21. nov – brukeren: rar takhøyde, «gang først, ikke rett inn på et soverom», flere innganger,
// eldre og moderne bygg, riktig interiør per type, «systemer for framtiden»).
// (1) Reglene (spill/interior.js) på prøvebygg i siden: ingen ytterdør inn i soverom/bad/beboerrom/sykerom, soverom og bad har dør til
//     gang/korridor/stue, store bygg har minst to innganger, takhøyden er innenfor grensene, og innholdet per type er der (butikk, fjøs,
//     tre/metall/olje, sykehjem, legevakt). Selvtest: et soverom lagt med vilje ved døra blir funnet.
// (2) I 3D (hvis på): et prøvehus (10 × 8 m) og en butikk med tre innganger får interiør uten feil (byggefeil meldes som console.warn
//     «interiør: …» – den fanges her), du står på gulvet, og huset har færre enn 9000 trekanter (grensen i sjekk.js).
// Endrer ingenting i spillet: prøvebyggene tas ut av hindringene igjen, og gangen stoppes hvis den ikke var på.
module.exports = {
  navn: 'interiør (takhøyde, gang først, innganger, stil, typer)',
  kjør: async (pg, profil) => {
    const r = await pg.evaluate(async () => {
      const ut = { feil: [] }, ok = (v, t) => { if (!v) ut.feil.push(t); }, I = window.Interior;
      ok(I && I.TYPER && I.ROMSETT && I.MØBELSETT && I.takhøyde, 'Interior.TYPER/ROMSETT/MØBELSETT/takhøyde mangler');
      if (!I || !I.TYPER) return ut;
      const rekt = (w, h) => [[0, 0], [w, 0], [w, h], [0, h]], dør = (P, k, f, w) => { const a = P[k], b = P[(k + 1) % P.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, ux: (b[0] - a[0]) / L, uy: (b[1] - a[1]) / L, w }; };
      const romVed = (pl, x, y) => { const a = pl.akse, u = x * a.ux + y * a.uy, v = x * a.vx + y * a.vy; return pl.rom.find(q => u >= q.u0 && u <= q.u1 && v >= q.v0 && v <= q.v1); };
      // reglene for én plan: gir en liste med brudd
      const brudd = pl => { const L = [];
        for (const i of pl.innganger || [pl.inngang]) { const q = romVed(pl, i.inn[0], i.inn[1]); if (q && I.ALDRI_VED_DØR[q.rolle]) L.push(pl.kl + ': ' + i.type + ' går inn i ' + q.rolle); }
        for (const [k, N] of pl.naboer || []) { const q = pl.rom[k], T = I.TILGANG[q.rolle]; if (T && q.andel >= .5 && !N.some(o => T.includes(pl.rom[o].rolle))) L.push(pl.kl + ': ' + q.rolle + ' uten dør til gang/stue'); }
        if (pl.tak < I.TAK_MIN) L.push(pl.kl + ': takhøyde ' + pl.tak);
        if (pl.areal >= 150 && !/uthus|hytte/.test(pl.kl) && (pl.innganger || []).length < 2) L.push(pl.kl + ': stort bygg med én inngang');
        return L; };
      const B = [['hus', rekt(11, 8), {}], ['hus', rekt(14, 9), { år: 1930 }], ['hus', rekt(12, 9), { år: 2015 }], ['leil', rekt(20, 12), {}], ['kontor', rekt(30, 14), {}], ['skole', rekt(40, 18), {}],
        ['sykehus', rekt(42, 15), { am: 'nursing_home' }], ['sykehus', rekt(24, 12), { am: 'clinic' }], ['butikk', rekt(30, 18), {}], ['låve', rekt(26, 13), {}], ['industri', rekt(32, 20), { navn: 'sagbruk' }],
        ['industri', rekt(32, 20), { navn: 'mek. verksted' }], ['industri', rekt(32, 20), { navn: 'olje og gass' }], ['kirke', rekt(26, 12), {}], ['hytte', rekt(8, 6), {}]];
      const planer = B.map(([kl, P, info], n) => I.plan(P, Object.assign({ i: 700 + n * 13, kl, h: 8, dør: dør(P, 0, .5, 1.3) }, info)));
      const alle = planer.flatMap(brudd); ut.brudd = alle.length; ok(alle.length === 0, 'reglene brutt: ' + alle.slice(0, 4).join('; '));
      const typer = pl => new Set(pl.møbler.map(m => m.type)), roller = pl => new Set(pl.rom.map(q => q.rolle));
      ok(planer.slice(0, 7).every(pl => pl.form === 'korridor' || pl.form === 'bsp') && planer.filter(pl => pl.form === 'korridor').length >= 5, 'korridorplanen brukes for boliger, kontor, skole og helse');
      ok(new Set(planer.slice(0, 3).map(pl => pl.stil)).size >= 2 && planer[1].stil === 'eldre' && planer[2].stil === 'moderne', 'stilen: byggeåret 1930 gir eldre, 2015 moderne');
      { const t = typer(planer[8]); ok(t.has('reol') && t.has('kasse') && t.has('kjøledisk') && t.has('fruktdisk') && planer[8].innganger.some(i => i.type === 'vare'), 'butikken mangler reoler/kasser/kjøledisk/frukt eller vareinngang'); }
      ok(typer(planer[9]).has('båsrekke'), 'fjøset mangler båsrekker');
      ok(planer[10].variant === 'tre' && typer(planer[10]).has('sagbenk') && planer[11].variant === 'metall' && typer(planer[11]).has('traverskran') && planer[12].variant === 'olje' && typer(planer[12]).has('tank'), 'industrivariantene (tre, metall, olje)');
      ok(roller(planer[6]).has('beboerrom') && roller(planer[6]).has('dagligstue') && roller(planer[7]).has('behandlingsrom') && roller(planer[7]).has('venterom'), 'helse: sykehjem og legevakt');
      // takhøyden i grensene (bolig 2,4–2,7, butikk/kontor 3–4, full i hallene, aldri over veggen, aldri under 2,2)
      { const th = I.takhøyde; ok(th(I.TYPER.hus.tak, {}) >= 2.4 && th(I.TYPER.hus.tak, {}) <= 2.7 && th(I.TYPER.butikk.tak, {}) >= 3 && th(I.TYPER.butikk.tak, {}) <= 4 && th('full', { vegg: 8 }) > 7 && th(I.TYPER.kontor.tak, { vegg: 2.9 }) <= 2.9 - .35 + 1e-9 && th(I.TYPER.hus.tak, { vegg: 1.4, saltak: true }) === I.TAK_MIN, 'takhøyden utenfor grensene'); }
      // selvtest: et soverom lagt med vilje ved døra skal bli funnet
      { const pl = I.plan(rekt(11, 8), { i: 9, kl: 'hus', h: 7, dør: dør(rekt(11, 8), 0, .5, 1) }), q = romVed(pl, pl.inngang.inn[0], pl.inngang.inn[1]), før = q.rolle; q.rolle = 'soverom'; ut.selvtest = brudd(pl).length; q.rolle = før; ok(ut.selvtest > 0, 'selvtest: soverom ved døra ble ikke funnet'); }
      // (2) i 3D: prøvehus og butikk får interiør uten feil
      if (typeof R3 !== 'undefined' && R3 && R3.ut && R3.hindre && window.Interior3d && window.Gange) {
        const R = R3, u = R.ut, varPå = !!R.fot, advarsler = [], gammel = console.warn; console.warn = (...a) => { advarsler.push(a.join(' ')); gammel.apply(console, a); };
        const lagt = [], bane0 = { x: R.bane.x, y: R.bane.y };
        try {
          if (!R.fot) Gange.start();
          for (const [kl, w, h, n] of [['hus', 10, 8, 0], ['butikk', 30, 18, 1]]) {
            const x0 = 40 + n * 60, y0 = 60, P = [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]]; P.bygg = { i: 4242 + n, t: 0, h: kl === 'hus' ? 6 : 8, kl };
            P.dør = { x: x0 + w / 2, y: y0, ux: 1, uy: 0, w: kl === 'hus' ? 1 : 1.6, hh: 2.1, z0: (hoyde3d(u.cx + x0 + w / 2, u.cy + y0 + 4, u) - u.h0) * R.EX };
            const o = { P }; for (let a = Math.floor(x0 / 20); a <= Math.floor((x0 + w) / 20); a++) for (let c = Math.floor(y0 / 20); c <= Math.floor((y0 + h) / 20); c++) { const k = a + ',' + c; if (!R.hindre.has(k)) R.hindre.set(k, []); R.hindre.get(k).push(o); lagt.push([k, o]); }
            R.bane.x = x0 + w / 2; R.bane.y = y0 - 4; const kr = Gange.kropp(); kr.x = R.bane.x; kr.y = R.bane.y;
            for (let i = 0; i < 14 && !P.inne; i++) Interior3d.oppdater(true);
            const pl = P.inne; ok(!!pl, kl + ': fikk ikke interiør i 3D'); if (!pl) continue;
            const s = Interior3d.sjekk().find(q => q.rom === pl.rom.length && q.kl === kl) || {}; ut[kl] = { rom: pl.rom.length, møbler: pl.møbler.length, tak: pl.tak, trekanter: s.trekanter, innganger: (pl.innganger || []).length, trapper: (pl.innganger || []).filter(i => i.trapp).length };
            ok(pl.tak >= I.TAK_MIN, kl + ': takhøyden i 3D ' + pl.tak);
            if (kl === 'hus') ok(s.trekanter < 9000, 'prøvehuset har ' + s.trekanter + ' trekanter (grensen i sjekk.js er 9000)');
            if (kl === 'butikk') ok(ut[kl].innganger >= 3 && ut[kl].trapper === ut[kl].innganger - 1, 'butikken: tre innganger med trapp i 3D');
          }
        } finally {
          console.warn = gammel; for (const [k, o] of lagt) { const L = R.hindre.get(k), i = L.indexOf(o); if (i >= 0) L.splice(i, 1); }
          R.bane.x = bane0.x; R.bane.y = bane0.y; if (!varPå) Gange.stopp(); Interior3d.oppdater(true);
        }
        ut.advarsler = advarsler.filter(t => /interiør/.test(t)); ok(ut.advarsler.length === 0, 'feil når interiøret ble bygget: ' + ut.advarsler.slice(0, 2).join(' | '));
      } else ut.i3d = 'ikke prøvd (3D er av)';
      return ut;
    });
    return { ok: r.feil.length === 0, tekst: r.feil.length ? r.feil.join('; ') : 'reglene holder på ' + 15 + ' prøvebygg (selvtest fant ' + r.selvtest + ' brudd)' + (r.hus ? `, 3D: huset ${r.hus.rom} rom/${r.hus.trekanter} trekanter, butikken ${r.butikk ? r.butikk.innganger : 0} innganger` : ''), data: r };
  },
};
