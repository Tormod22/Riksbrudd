// Test av reglene i spill/spillet.js: angrep, marked, oppdrag, kamp til fots, hendelser og deling.
const { Trussel, Marked, Oppdrag, Kamp, Hendelser, Deling } = require('../../site/dovre-fliser/spill/spillet.js'); let feil = 0;
const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
let frø = 7; const rng = () => (frø = (frø * 16807) % 2147483647) / 2147483647;
// bølgen er over: slått ut, eller trukket seg unna i en halv spilltime (18. nov)
{ const l = (lever, slåttUt, avstand, venter) => ({ lever, slåttUt, avstand, venter });
  ok(Trussel.ferdig([l(false, true, 100)], 0) === 'slått' && Trussel.ferdig([], 0) === 'slått' && Trussel.ferdig([l(true, true, 3900), l(false, false, 50)], 0) === 'slått', 'angrep: over når ingen røverlag kan kjempe (falt eller slått ut), også når restene står langt unna');
  ok(Trussel.ferdig([l(true, false, 500)], 99) === null && Trussel.ferdig([l(true, false, 3000), l(true, false, 500)], 99) === null, 'angrep: ikke over mens et lag som kan kjempe, er nær leiren');
  ok(Trussel.ferdig([l(true, false, 3000)], 0) === 'trekker' && Trussel.ferdig([l(true, false, 3000)], 29) === 'trekker' && Trussel.ferdig([l(true, false, 3000), l(true, true, 100)], 30) === 'unna', 'angrep: over når de som kan kjempe, har vært over 2,5 km unna i 30 spillminutter');
  ok(Trussel.ferdig([l(true, false, 3000, true)], 99) === null, 'angrep: røvere som venter på mørket, teller ikke som unna'); }
// (runde 4) røvere som har herjet i leiren, trekker seg med byttet – bølgen er over uten belønning
ok(!Trussel.herjet({ inne: 89 }) && Trussel.herjet({ inne: 90 }) && !Trussel.herjet({}), 'herjing: et røverlag trekker seg etter halvannen spilltime inne i leiren');
{ const m = (ute, n) => Array.from({ length: n }, (_, i) => ({ hp: i < ute ? 0 : 1 })); ok(!Trussel.brutt(m(1, 6)) && Trussel.brutt(m(2, 6)) && !Trussel.brutt(m(2, 9)) && Trussel.brutt(m(3, 9)) && Trussel.brutt(m(4, 12)) && !Trussel.brutt([]), 'røverne gir opp når en tredel er falt eller såret'); }
ok(Trussel.ferdig([{ lever: true, slåttUt: false, avstand: 50, trekker: true }], 0) === 'herjet' && Trussel.ferdig([{ lever: true, slåttUt: false, avstand: 50, trekker: true }, { lever: true, slåttUt: true, avstand: 80 }], 0) === 'herjet', 'herjing: bølgen er over når alle som kan kjempe, har trukket seg med byttet');
ok(Trussel.ferdig([{ lever: true, slåttUt: false, avstand: 50, trekker: true }, { lever: true, slåttUt: false, avstand: 80 }], 0) === null, 'herjing: ikke over mens et annet røverlag fortsatt kjemper');
{ const b = Trussel.bytte({ penger: 2.5e6, lager: { tre: 10, betong: 0, stål: 3 }, diesel: 400, mat: 40 }), b2 = Trussel.bytte({ penger: 40e6 });
  ok(b.penger === 125000 && b.lager.tre === 2 && !('betong' in b.lager) && b.lager.stål === .6 && b.diesel === 40 && b.mat === 6 && b2.penger === 5e5 && Trussel.bytte({}).penger === 0, 'herjing: byttet er en andel av kassa (høyst 500 000 kr), lageret, dieselen og maten');
  ok(Trussel.bytteTekst(b).replace(/\s/g, ' ') === '125 000 kr, 2 m³ tre, 0,6 t stål, 40 l diesel og 6 rasjoner' && Trussel.bytteTekst({ lager: {} }) === 'ingenting', 'herjing: byttet som tekst'); }
ok([1, 2, 3, 4, 7, 30].map(Trussel.lag).join() === '1,1,1,2,3,6', 'angrep: bølgene vokser sakte fra ett lag til høyst seks');
ok(Trussel.lagFor(7, { soldater: 6 }) === 1 && Trussel.lagFor(7, { soldater: 20 }) === 3 && Trussel.lagFor(7, { soldater: 6, tunge: 1 }) === 2 && Trussel.lagFor(4, { soldater: 40, faktor: 1.5 }) === 3 && Trussel.lagFor(1, { soldater: 0, faktor: .6 }) === 1, 'angrep: aldri flere lag enn spilleren kan møte, og vanskelighetsgraden teller');
ok(Trussel.lagFor(9, { soldater: 40, dag: 0 }) === 1 && Trussel.lagFor(9, { soldater: 40, dag: 3 }) === 2 && Trussel.lagFor(9, { soldater: 40, dag: 6 }) === 3, 'angrep: de tre første døgnene kommer bare ett lag, så ett til hvert tredje døgn');
ok(Trussel.menn(1, 8) === 6 && Trussel.menn(2, 8) === 8 && Trussel.menn(9, 40) === 12 && Trussel.menn(5, 3) === 5 && Trussel.menn(9) === 12, 'angrep: røverlagene er små i de første bølgene og aldri større enn soldatene + 2');
// (runde 5) taket gjelder hele bølgen: to lag deler på soldatene + 2, og vanskelighetsgraden ganger soldatene
ok(Trussel.menn(4, 12, 2) === 7 && Trussel.menn(4, 12, 1) === 12 && Trussel.menn(4, 12, 3, 1.5) === 7 && Trussel.menn(4, 6, 2) === 5 && Trussel.menn(3, 12, 1, .6) === 10, 'angrep (runde 5): taket for hele bølgen og vanskelighetsgraden');
ok(Trussel.belønning(1) === 450000 && Trussel.belønning(40) === 1.5e6, 'angrep: byttet er lite og har et tak');
ok(Trussel.vent(1).spill > Trussel.vent(8).spill && Trussel.vent(30).spill === 16 * 60 && Trussel.vent(30).ekte === 16, 'angrep: kortere mellom bølgene, men aldri under 16 timer / 16 minutter');
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
  const G = { f: { tre: 1, betong: 1, stål: 1, diesel: 1, mat: 1 }, før: {}, infl: 1, dag: 3 }; ok(Marked.hyller(G).betong === 60, 'hyller: et lagret marked fra før får fulle hyller');
  const N = Marked.ny(); ok(Marked.kjøpspris(N, 'tre', 20000, true) === 30000 && Marked.kjøpspris(N, 'tre', 20000, false) === 20000 && Marked.kjøpspris(N, 'diesel', 8000, true) === 8000, 'kjøpspris: tre, betong og stål koster 1,5 × i det ekte spillet, diesel og mat som før'); }
// runde 6: markedets kjøpere tar høyst KJØPER per døgn, og oppdragene kommer i takt
{ const M = Marked.ny(); ok(Marked.kanSelge(M, 'tre', 10) === 10 && (Marked.selg(M, 'tre', 20), Marked.kanSelge(M, 'tre', 10)) === 5 && Marked.kanSelge(M, 'diesel', 7) === 7, 'markedet kjøper høyst 25 m³ tre per døgn (diesel uten tak)');
  Marked.steg(M, () => .5); ok(Marked.kanSelge(M, 'tre', 10) === 10, 'nytt døgn: kjøperne tar imot igjen');
  const v = Oppdrag.vent(() => .5); ok(Oppdrag.TAKT.start === 2 && v.spill >= 360 && v.spill <= 600 && v.ekte >= 480 && v.ekte <= 840, 'nye oppdrag: 6–10 spilltimer eller 8–14 minutter spilling'); }
console.log(feil ? feil + ' feil' : 'alle testene for spillet ok'); process.exit(feil ? 1 : 0);
