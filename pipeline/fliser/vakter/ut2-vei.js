'use strict';
// VAKT for pakka «vei» (fase F1 i docs/plan-selskap-okonomi.md: veien i byggene). Figurene går ikke etter veien ennå (F2), så vakta prøver
// reglene i siden: Vei finnes (lastet rett etter bygning.js), veien inn i en brakke fra byggesettet går gjennom døra, et lukket rom uten dør gir
// «rommet har ingen dør», trappa mellom to etasjer brukes, byggesettets tekst sier fra om rommet uten dør, kartet for leiren lages, og
// feilsøkingsvisningen tegner uten feil. Selvtest: samme brakke med vindu i stedet for dør skal ikke kunne nås.
// Alt regnes med prøve: true (Vei.nå, leiren og pengene røres ikke); feilsøkingen slås av igjen.
module.exports = {
  navn: 'veien i byggene (rutenett, rom-kart, veikart)',
  kjør: async (pg) => {
    const r = await pg.evaluate(async () => {
      const ut = { feil: [] }, ok = (v, t) => { if (!v) ut.feil.push(t); }, V = window.Vei, BS = window.ByggesettRegler;
      ok(V && V.lag && V.finn && V.kanNå && V.veikart, 'window.Vei mangler (skal lastes rett etter bygning.js)');
      ok(window.VeiSpill && window.ByggesettVei, 'VeiSpill (feilsøking) eller ByggesettVei (sjekken i byggesettet) mangler');
      if (!V || !BS) return ut;
      const S = OppstartSpill.tilstand(), lx = S && S.leir ? S.leir.x : 196400, ly = S && S.leir ? S.leir.y : 6898900;
      const o = { ox: Math.round(lx) + 120, oy: Math.round(ly) + 120 }, start = [o.ox - 8, o.oy - 8], t0 = performance.now(); let nr = 0;
      const del = d => ({ ...d, id: 'vakt' + nr++, ferdig: true }), hus = (mal, i, j) => BS.husForslag([], mal, i, j, 0).filter(q => !q.feil).map(q => del(q.d));
      // 1. veien gjennom døra i brakka (døra er midt på sørsiden, x 3,15–4,05 m fra hjørnet)
      const brakke = hus('brakke', 0, 0), K = V.lag({ deler: brakke, opphav: o, start, prøve: true }), inne = { x: o.ox + 4.8, y: o.oy + 3.6 };
      const v = V.finn({ x: start[0], y: start[1] }, inne, { kart: K }); let kryss = null;
      if (v.ok) for (let k = 1; k < v.punkter.length; k++) { const a = v.punkter[k - 1], b = v.punkter[k]; if ((a.y < o.oy) !== (b.y < o.oy)) kryss = a.x + (b.x - a.x) * (o.oy - a.y) / (b.y - a.y) - o.ox; }
      ut.dør = v.ok ? { lengde: v.lengde, rom: v.rom.length, kryss: kryss === null ? null : Math.round(kryss * 100) / 100 } : v.grunn;
      ok(v.ok && v.rom.length === 2 && kryss !== null && kryss > 2.5 && kryss < 4.7, 'veien inn i brakka går ikke gjennom døra: ' + JSON.stringify(ut.dør));
      // selvtest: vindu i stedet for dør -> rommet nås ikke
      const uten = brakke.map(d => (/_dør$/.test(d.type) ? { ...d, type: d.type.replace('_dør', '_vindu') } : d)), Ks = V.lag({ deler: uten, opphav: o, start, prøve: true });
      ut.selvtest = V.kanNå(inne, { kart: Ks }); ok(!ut.selvtest.ok && ut.selvtest.grunn === 'rommet har ingen dør', 'selvtesten: brakka uten dør skulle gitt «rommet har ingen dør»: ' + JSON.stringify(ut.selvtest));
      // 2. lukket rom uten dør (2 × 2 ruter, vegger rundt, tak)
      const g = []; for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) g.push({ type: 'bs_fundament', i: 10 + i, j, a: null, n: 0 });
      const ring = BS.rad(o, 'bs_vegg_tre', [o.ox + 24, o.oy], [o.ox + 28.8, o.oy + 4.8]).map(q => ({ type: 'bs_vegg_tre', ...q, n: 0 }));
      const lukket = [...g, ...ring, ...g.map(q => ({ ...q, type: 'bs_tak_flatt', n: 1 }))].map(del), Kl = V.lag({ deler: lukket, opphav: o, start, prøve: true });
      ut.lukket = V.kanNå({ x: o.ox + 26.4, y: o.oy + 2.4 }, { kart: Kl }); ok(!ut.lukket.ok && ut.lukket.grunn === 'rommet har ingen dør', 'rom uten dør: ' + JSON.stringify(ut.lukket));
      // byggesettets tekst: den siste veggen i ringen lukker rommet
      const siste = lukket.find(d => d.type === 'bs_vegg_tre'), før = lukket.filter(d => d !== siste);
      ut.tekst = ByggesettVei.sjekk(før, [{ d: { ...siste }, bytt: null }], o, null);
      ok(ut.tekst && /ingen dør/.test(ut.tekst), 'byggesettet sier ikke fra om rommet uten dør: ' + ut.tekst);
      ok(!ByggesettVei.sjekk(brakke.slice(0, -1), [{ d: { ...brakke[brakke.length - 1] }, bytt: null }], o, null), 'byggesettet klager på en brakke med dør');
      // 3. trapp mellom to etasjer
      const gg = [], g1 = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { gg.push({ type: 'bs_fundament', i: 20 + i, j, a: null, n: 0 }); g1.push({ type: 'bs_tregulv', i: 20 + i, j, a: null, n: 1 }); }
      const ring2 = n => BS.rad(o, 'bs_vegg_tre', [o.ox + 48, o.oy], [o.ox + 55.2, o.oy + 4.8]).map(q => ({ type: 'bs_vegg_tre', ...q, n }));
      const v0 = ring2(0), k = v0.findIndex(q => q.a === 'x' && q.j === 0 && q.i === 21); v0[k] = { ...v0[k], type: 'bs_vegg_tre_dør' };
      const to = [...gg, ...g1, ...v0, ...ring2(1), ...gg.map(q => ({ ...q, type: 'bs_tak_flatt', n: 2 }))].map(del), Kt = V.lag({ deler: to, opphav: o, start, prøve: true });
      const vt = V.finn({ x: start[0], y: start[1] }, { x: o.ox + 54, y: o.oy + 3.6, e: 2 }, { kart: Kt });
      ut.trapp = vt.ok ? { lengde: vt.lengde, etasjer: [...new Set(vt.punkter.map(p => p.e))].join('→') } : vt.grunn;
      ok(vt.ok && Kt.lenkeListe.some(l => l.ref && l.ref.trapp !== undefined) && ut.trapp.etasjer === '1→2', 'veien til 2. etasje bruker ikke trappa: ' + JSON.stringify(ut.trapp));
      // 4. veikart og kartet for leiren slik den står
      const vk = V.veikart({ x: o.ox + 54, y: o.oy + 3.6, e: 2, hus: 'leir' }, { kart: Kt }); ok(vk && Math.abs(vk.avstand({ x: start[0], y: start[1] }) - vt.lengde) < .05, 'veikartet gir ikke samme lengde som finn');
      ut.ms = Math.round(performance.now() - t0);
      const før2 = V.nå, KL = VeiSpill.kart(); ok(KL && KL.N > 0, 'VeiSpill.kart() ga ikke noe kart for leiren'); ut.leir = KL ? { ruter: KL.N, rom: KL.rom.length, ms: KL.ms } : null; void før2;
      // 5. feilsøkingsvisningen tegner (og slås av igjen)
      VeiSpill.feilsøk(true); VeiSpill.vis([lx + 5, ly + 5]); skitten = true; await new Promise(res => setTimeout(res, 600)); const ts = VeiSpill.tilstand(); VeiSpill.feilsøk(false); VeiSpill.vis(null); skitten = true;
      ok(!ts.feil, 'feilsøkingsvisningen feilet: ' + ts.feil);
      return ut;
    });
    return { ok: r.feil.length === 0, tekst: r.feil.length ? r.feil.join('; ') : `døra ${r.dør.lengde} m (krysser ved ${r.dør.kryss} m), trapp ${r.trapp.etasjer} ${r.trapp.lengde} m, rom uten dør: «${r.lukket.grunn}», leiren ${r.leir.ruter} ruter / ${r.leir.rom} rom, ${r.ms} ms`, data: r };
  },
};
