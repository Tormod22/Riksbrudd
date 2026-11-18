// Test av reglene i spill/spillet.js: angrep, marked, oppdrag, kamp til fots, hendelser og deling.
const { Trussel, Marked, Oppdrag, Kamp, Hendelser, Deling } = require('../../site/dovre-fliser/spill/spillet.js'); let feil = 0;
const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
let frø = 7; const rng = () => (frø = (frø * 16807) % 2147483647) / 2147483647;
ok([1, 2, 3, 4, 5, 20].map(Trussel.lag).join() === '1,1,2,2,3,6', 'angrep: bølgene vokser fra ett lag til høyst seks');
ok(Trussel.vent(1).spill > Trussel.vent(8).spill && Trussel.vent(30).spill === 600 && Trussel.vent(30).ekte === 12, 'angrep: kortere mellom bølgene, men aldri under 10 timer / 12 minutter');
{ const s = Trussel.start({ x: 1000, y: 2000 }, .25, .5), d = Math.hypot(s.x - 1000, s.y - 2000); ok(d > 1399 && d < 2201 && s.retning === 'nord' && /nord/.test(Trussel.varsel(3, 2, s)), 'angrep: starter 1,4–2,2 km unna, varselet sier retningen'); }
{ const M = Marked.ny(); let lav = 9, høy = 0; for (let i = 0; i < 400; i++) { Marked.steg(M, rng); for (const v of Marked.VARER) { lav = Math.min(lav, M.f[v]); høy = Math.max(høy, M.f[v]); } }
  ok(lav >= .55 && høy <= 1.8 && høy > 1.15 && lav < .88, `marked: prisene svinger mellom ${lav.toFixed(2)} og ${høy.toFixed(2)} av det vanlige`);
  ok(M.infl > 1.5 && M.infl <= 3 && Marked.pris(M, 'tre', 20000) % 100 === 0 && /Markedet/.test(Marked.tekst(M)), 'marked: inflasjonen gjør alt dyrere, prisene er hele hundre'); }
{ const leir = { x: 0, y: 0 }, typer = new Set(); let alle = true; for (let i = 0; i < 60; i++) { const o = Oppdrag.lag(leir, i, rng, 100); typer.add(o.type); const d = Math.hypot(o.x, o.y), T = Oppdrag.TYPER[o.type]; alle = alle && d >= T.avst[0] - 2 && d <= T.avst[1] + 2 && o.gir.penger > 0 && o.frist === 100 + 4320; }
  ok(typer.size === 3 && alle, 'oppdrag: tre typer, i riktig avstand, med belønning og frist på tre døgn');
  const o = { x: 500, y: 0, gir: { folk: 3, penger: 3e5 } }; ok(Oppdrag.framme(o, [{ x: 0, y: 0 }, { x: 470, y: 30 }]) && !Oppdrag.framme(o, [{ x: 400, y: 0 }]), 'oppdrag: framme innen 60 m');
  ok(Oppdrag.medFolk(o, 1) === 1 && Oppdrag.medFolk(o, 6) === 3 && Oppdrag.medFolk(o, 2) === 2 && /3 personer/.test(Oppdrag.belønning(o.gir)), 'oppdrag: til fots får du med én, med helikopter alle'); }
ok(Kamp.sikter(100, .02) && !Kamp.sikter(100, .08) && !Kamp.sikter(400, 0) && Kamp.sjanse(20) > Kamp.sjanse(300) && Kamp.sjanse(349) >= .15, 'kamp: du må sikte på målet, og sjansen faller med avstanden');
ok(Kamp.skade([{ avst: 50, menn: 6 }], null) > Kamp.skade([{ avst: 50, menn: 6 }], 'kjøretøy') && Kamp.skade([{ avst: 50, menn: 6 }], 'hus') < 2 && Kamp.skade([{ avst: 300, menn: 6 }], null) === 0, 'kamp: du tar mindre skade i kjøretøy og hus, ingen på lang avstand');
{ const f = { folk: 10, mat: 30, penger: 1e6 }; let sist = null, like = 0; const sett = new Set(); for (let i = 0; i < 200; i++) { const h = Hendelser.velg(rng, f, sist); if (h.id === sist) like++; sist = h.id; sett.add(h.id); }
  ok(like === 0 && sett.size === Hendelser.LISTE.length, 'hendelser: alle forekommer, aldri den samme to ganger på rad');
  ok(!Hendelser.velg(rng, { folk: 3, mat: 0, penger: 0 }, null).krav && Hendelser.LISTE.every(h => h.valg.length === 2 && typeof h.tekst('Kari') === 'string'), 'hendelser: kravene følges, og hver har to valg');
  ok(!Hendelser.kan({ penger: -5e5 }, { penger: 1e5, mat: 0 }) && Hendelser.kan({ penger: -5e5 }, { penger: 9e5, mat: 0 }) && !Hendelser.kan({ mat: -8 }, { penger: 0, mat: 3 }), 'hendelser: et valg du ikke har råd til, kan ikke tas'); }
{ const k = Deling.kode('Dovrefolket æøå', '#aa3322', { x: 196400, y: 6898900 }, [{ type: 'brakke', x: 196420, y: 6898910, ret: 1.57 }, { type: 'gjerde', punkter: [] }, { type: 'tull', x: 196400, y: 6898900 }]);
  const d = Deling.les(k, t => t === 'brakke'); ok(/^[A-Za-z0-9_-]+$/.test(k) && d && d.navn === 'Dovrefolket æøå' && d.farge === '#aa3322' && d.bygg.length === 1 && d.bygg[0].x === 196420 && Math.abs(d.bygg[0].ret - 1.57) < .02, `deling: leiren blir en kode på ${k.length} tegn og kan leses tilbake`);
  ok(Deling.les('tull') === null && Deling.les('') === null && Deling.les(k.slice(0, 20)) === null, 'deling: en ugyldig kode gir ingenting'); }
// hyllene (natt til 18. nov): markedet har ikke alt hver dag
{ const M = Marked.ny(), H = Marked.hyller(M); ok(H.tre === 60 && H.diesel === 2500 && Marked.kan(M, 'tre', 10) === 10 && Marked.kan(M, 'tre', 100) === 60, 'hyller: et nytt marked har fulle hyller, og du får ikke mer enn det som står der');
  Marked.ta(M, 'tre', 55.5); Marked.ta(M, 'mat', 299.5); ok(Marked.kan(M, 'tre', 10) === 4.5 && Marked.kan(M, 'mat', 50) === 0 && /tomt for mat/.test(Marked.tomt('mat')), 'hyller: tre i tideler, mat i hele – tomt er tomt');
  Marked.steg(M, rng); ok(Math.abs(M.lager.tre - 19.5) < 1e-9 && Math.abs(M.lager.mat - 80.5) < 1e-9, 'hyller: fylles sakte hvert døgn (15 m³ tre, 80 rasjoner)');
  for (let i = 0; i < 20; i++) Marked.steg(M, rng); ok(M.lager.tre === 60 && M.lager.stål === 20, 'hyller: aldri over fulle hyller');
  const G = { f: { tre: 1, betong: 1, stål: 1, diesel: 1, mat: 1 }, før: {}, infl: 1, dag: 3 }; ok(Marked.hyller(G).betong === 40, 'hyller: et lagret marked fra før får fulle hyller');
  const N = Marked.ny(); ok(Marked.kjøpspris(N, 'tre', 20000, true) === 30000 && Marked.kjøpspris(N, 'tre', 20000, false) === 20000 && Marked.kjøpspris(N, 'diesel', 8000, true) === 8000, 'kjøpspris: tre, betong og stål koster 1,5 × i det ekte spillet, diesel og mat som før'); }
console.log(feil ? feil + ' feil' : 'alle testene for spillet ok'); process.exit(feil ? 1 : 0);
