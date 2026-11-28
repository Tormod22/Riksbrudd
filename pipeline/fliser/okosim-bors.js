// ØKONOMITESTEN – del «børs» (fase Ø7, 28. nov; docs/natt/ut5-bors.md): andeler i firmaene og Gråbørsen (spill/bors.js) i modellen.
// Lastes av test_okonomitest.js (alfabetisk). To nye strategier, begge bygd på «bare kontrakter»:
//   «børs tidlig» (borsTidlig): noterer 40 % så fort selskapet når nivå 4, betaler utbyttet eierne venter hver uke;
//   «kontrakter + andeler» (kontraktAndel): fra nivå 3 kjøper den andeler i firmaene (10 % i Storlia og to til, så Storlia over 50 %) når
//     kassa tåler det, og får utbytte (og resultatet fra Storlia når den eier den).
// Modellens egne valg (Claudes forslag): verdien til selskapet = kassa + byggene + lageret (som spill/seier.js) + andelene + to ukers resultat
// (uten børspengene); firmaene har normal helse og ingen krig rundt hjemstedet (modellen har ikke firmaenes kart); rivalene kjøper andeler
// i firmaene og i dere med reglene i bors.js; ingen investorer, emisjon, rykter eller lån.
// VALGET OM GRENSA (oppdraget: «grensa 200 mill. – gjelder den kontanter eller verdi?»): grensa på 200 mill. gjelder fortsatt KASSA for alle
// strategiene (den felles kontrollen i test_okonomitest.js), og i tillegg skal DIN DEL AV BØRSVERDIEN holde seg under penger-målet i
// seier.js (250 mill.) på 30 døgn for begge børsstrategiene – en notering skal ikke kunne vinne spillet på en måned. En notering gir mye på
// én gang, men dere eier en mindre del: «børs tidlig» skal ikke ende med mer verdi enn «bare kontrakter» (høyst 5 % mer).
'use strict';
const path = require('path');
const O = require('./okosim.js');
const SP = path.join(__dirname, '../../site/dovre-fliser/spill');
const Selskap = require(SP + '/selskap.js'), Leir = require(SP + '/leir.js'), Bo = require(SP + '/bors.js'), Seier = require(SP + '/seier.js');

const ID = 'blå', D = 1440;
const FIRMAER = Object.keys(Bo.REGLER.firma.grunn).map(navn => ({ navn, helse: 68, levert: 0, bransje: ({ 'Storlia Tømmer': 'tømmer', 'Kvernhaug Mølle': 'mat', 'Tindvik Drivstoff': 'drivstoff', 'Brattli Mineral': 'gruve', 'Ytterø Sjømat': 'sjømat', 'Dalsnes Kraftlag': 'kraft', 'Gråfjell Frakt': 'frakt' })[navn] }));
const MB = { reserve: 30e6, storliaEie: 60e6, firmaer: ['Storlia Tømmer', 'Dalsnes Kraftlag', 'Tindvik Drivstoff'] };

// resultatet regnes uten pengene fra og til børsen (notering, kjøp av andeler, utbytte ut) – som i bors-visning.js
const UTENOM = new Set(['børs', 'andeler', 'utbytte ut']);
const sum = o => Object.entries(o || {}).reduce((s, [k, v]) => s + (UTENOM.has(k) ? 0 : +v || 0), 0);
function firmaKurs(sim) { const ut = {}; for (const f of FIRMAER) { const v = Bo.firmaVerdi(f, {}); ut[f.navn] = { ...v, kurs: Bo.kurs(v.verdi, 1) }; } return ut; }
// verdien av selskapet (som bors-visning.js kurser())
function kurser(sim) {
  const B = sim.bors, FT = firmaKurs(sim); let andeler = 0; for (const [n, a] of Object.entries(B.firmaer)) if (a.du > 0) andeler += a.du * FT[n].kurs;
  const bygg = Seier.byggVerdi(sim.L.bygg.map(b => ({ type: b.type, pris: b.pris, hp: b.hp, ferdig: Leir.ferdig ? Leir.ferdig(b) : !(b.igjen > 0) })), Leir.BYGG);
  const lager = Seier.lagerVerdi(sim.L.lager, Leir.MATERIALER, sim.L.drivstoff, Leir.DRIVSTOFF.prisPerLiter);
  const uke = sim.dager.slice(-7).reduce((s, d) => s + sum(d.inn) - sum(d.ut), 0) + sum(sim.bok.inn) - sum(sim.bok.ut);
  const sv = Bo.selskapVerdi({ eiendeler: sim.kasse + bygg + lager, andeler, ukeNetto: uke, angrep: 0 });
  return { meg: Bo.kurs(sv.verdi, B.meg.stemning), firma: FT, verdi: sv };
}
function døgn(sim) {
  const B = sim.bors, nå = sim.t, nv = Selskap.nivå(Selskap.side(sim.SK, ID)).nr;
  const d = Bo.tellerForskjell(B, { levert: sim.kontrakter.levert, brutt: sim.kontrakter.brutt, byer: sim.region.byer.filter(b => b.eier === ID).length });
  Bo.endreStemning(B.meg, Bo.stemningEndring(d));
  const K = kurser(sim), resultat = {}; for (const [n, v] of Object.entries(K.firma)) resultat[n] = v.resultat;
  for (const h of Bo.døgn(B, { nå, rand: Selskap.lagRand(sim.frø * 331 + nå), kurs: { meg: K.meg, rød: 2e5, grønn: 2e5 }, firmaer: FIRMAER, resultat })) {
    if (h.type === 'utbytte') { sim.gi(h.kr, 'utbytte'); sim.bors.utbytteInn += h.kr; }
    else if (h.type === 'eid') { sim.gi(h.kr, 'utbytte'); sim.bors.utbytteInn += h.kr; }
    else if (h.type === 'oppkjøp') { sim.bors.oppkjøpt = Math.floor(nå / D) + 1; sim.logg('kjøpt opp av ' + h.side); }
  }
  // utbyttet eierne venter (betales når kassa tåler det)
  const u = B.meg.uke; if (B.meg.notert && u && u.betalt < u.forventet && sim.kasse > u.forventet * 4) { const kr = u.forventet - u.betalt; if (sim.betal(kr, 'utbytte ut')) Bo.betalUtbytte(B, kr); }
  // strategiens valg
  if (sim.strategi.id === 'borsTidlig' && !B.meg.notert && nv >= Bo.REGLER.nivå.notering) {
    const r = Bo.noter(B, 40, K.meg, nå, { nivå: nv }); if (r.ok) { sim.gi(r.kr, 'børs'); sim.bors.notert = Math.floor(nå / D) + 1; sim.bors.noteringKr = r.kr; sim.logg(`noterer 40 %: ${O.mill(r.kr)}`); }
  }
  if (sim.strategi.id === 'kontraktAndel' && nv >= Bo.REGLER.nivå.andeler) {
    for (const n of MB.firmaer) { const a = Bo.firma(B, n); if (a.du >= 10) continue; const p = 10 * K.firma[n].kurs * (1 + Bo.REGLER.firma.kjøp);
      if (sim.kasse - p < MB.reserve) break; const r = Bo.kjøp(B, n, 10, K.firma[n].kurs, { nivå: nv }); if (r.ok && sim.betal(r.kr, 'andeler')) { sim.bors.kjøpt += r.kr; if (!sim.bors.førsteDag) sim.bors.førsteDag = Math.floor(nå / D) + 1; } else if (r.ok) Bo.firma(B, n).du -= 10; }
    const st = Bo.firma(B, 'Storlia Tømmer'), mangler = Math.min(Bo.fri(B, 'Storlia Tømmer'), 51 - st.du);
    if (st.du >= 10 && mangler > 0 && sim.kasse > MB.storliaEie) { const r = Bo.kjøp(B, 'Storlia Tømmer', mangler, K.firma['Storlia Tømmer'].kurs, { nivå: nv }); if (r.ok && sim.betal(r.kr, 'andeler')) { sim.bors.kjøpt += r.kr; if (r.eier === ID) sim.bors.eierDag = Math.floor(nå / D) + 1; } else if (r.ok) st.du -= mangler; }
  }
  sim.bors.verdi = Bo.minDel(B, Bo.børsverdi(K.meg)); sim.bors.dagVerdi.push(sim.bors.verdi);
}
const ny = () => ({ notert: null, noteringKr: 0, utbytteInn: 0, kjøpt: 0, førsteDag: null, eierDag: null, oppkjøpt: null, verdi: 0, dagVerdi: [] });
for (const [id, navn, tekst] of [['borsTidlig', 'børs tidlig', 'som «bare kontrakter», og noterer 40 % på Gråbørsen så fort selskapet når nivå 4; betaler utbyttet eierne venter'],
  ['kontraktAndel', 'kontrakter + andeler', 'som «bare kontrakter», og kjøper andeler i firmaene fra nivå 3 (10 % i tre, så Storlia over 50 %) når kassa tåler det']]) {
  O.leggTilStrategi({ id, navn, fornuftig: true, tekst,
    start(sim) { sim.tilfFør = Tilf ? Tilf.lagre() : null; O.STRATEGIER.kontrakter.start(sim); sim.bors = Object.assign(Bo.ny({ x: 0, y: 0 }), ny()); },
    time(sim) { O.STRATEGIER.kontrakter.time(sim); },
    døgn(sim) { if (O.STRATEGIER.kontrakter.døgn) O.STRATEGIER.kontrakter.døgn(sim); døgn(sim); } });
}
// FUNNET 28. nov: modulene bruker én felles tilfeldighet (spill/tilfeldig.js, Tilfeldig.verden) som ikke settes på nytt per kjøring, så en
// ny strategi forskjøv tallene til strategiene som kjøres etter den (eksporten gikk fra 99 til 85 mill. uten at noe i den var endret).
// Børsstrategiene setter derfor den felles tilfeldigheten tilbake når kjøringen er ferdig.
const Tilf = (() => { try { return require(SP + '/tilfeldig.js'); } catch (e) { return null; } })();
O.leggTilDel({ id: 'bors', slutt(sim, res) { if (sim.tilfFør != null && Tilf) Tilf.les(sim.tilfFør); if (sim.bors && sim.bors.dagVerdi) res.bors = { notert: sim.bors.notert, noteringKr: sim.bors.noteringKr, utbytteInn: sim.bors.utbytteInn, kjøpt: sim.bors.kjøpt,
  førsteDag: sim.bors.førsteDag, eierDag: sim.bors.eierDag, oppkjøpt: sim.bors.oppkjøpt, verdi: sim.bors.verdi, egne: sim.bors.meg.egne }; } });

// ---------- kravene (Claudes forslag) ----------
const KR = { notertAndel: .8, verdiMaks: 250e6, verdiOverAndel: .1, verdiOver: 1.05, andelGulv: .85, andelTak: 1.15, utbytteAndel: .5 };
O.leggTilKrav({ navn: 'børsen', sjekk(RES) {
  const ut = [], T = RES.borsTidlig || [], A = RES.kontraktAndel || [], K = RES.kontrakter || []; if (!T.length || !A.length || !K.length) return ut;
  const med = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor((b.length - 1) / 2)] : 0; };
  const snitt = (L, f) => { const d = L.map(f).filter(v => v != null); return d.length ? (d.reduce((a, b) => a + b, 0) / d.length).toFixed(1).replace('.', ',') : '–'; };
  const n = T.filter(r => r.bors && r.bors.notert).length / T.length;
  ut.push({ ok: n >= KR.notertAndel, tekst: `«børs tidlig» noterer i ${Math.round(n * 100)} % av kjøringene (snitt dag ${snitt(T, r => r.bors && r.bors.notert)}, ${O.mill(med(T.filter(r => r.bors && r.bors.notert).map(r => r.bors.noteringKr)))} i median; minst ${KR.notertAndel * 100} %)` });
  for (const [L, navn] of [[T, 'børs tidlig'], [A, 'kontrakter + andeler']]) { const v = L.map(r => r.bors ? r.bors.verdi : 0), over = v.filter(x => x >= KR.verdiMaks).length;
    ut.push({ ok: med(v) < KR.verdiMaks && over <= L.length * KR.verdiOverAndel, tekst: `«${navn}»: din del av børsverdien dag 30 er under penger-målet ${O.mill(KR.verdiMaks)} (median ${O.mill(med(v))}, høyst ${O.mill(Math.max(...v))}; ${over} av ${L.length} over, høyst ${KR.verdiOverAndel * 100} %)` }); }
  // en notering gir penger, men ikke mer verdi: din del dag 30 mot verdien til «bare kontrakter» (samme regel: kassa + bygg + lager + resultat)
  const vT = med(T.map(r => r.bors.verdi)), vA = med(A.map(r => r.bors.verdi)), kK = med(K.map(r => r.slutt)), kT = med(T.map(r => r.slutt)), kA = med(A.map(r => r.slutt));
  ut.push({ ok: vT <= vA * KR.verdiOver, tekst: `«børs tidlig» ender ikke med mer verdi enn uten notering: din del ${O.mill(vT)} mot ${O.mill(vA)} for «kontrakter + andeler» (høyst ${KR.verdiOver} ganger); kassa ${O.mill(kT)} mot ${O.mill(kK)} for «bare kontrakter»` });
  ut.push({ ok: kA >= kK * KR.andelGulv && kA <= kK * KR.andelTak, tekst: `«kontrakter + andeler» ender på nivå med «bare kontrakter»: kassa ${O.mill(kA)} mot ${O.mill(kK)} (mellom ${KR.andelGulv} og ${KR.andelTak} ganger)` });
  const u = A.filter(r => r.bors && r.bors.utbytteInn > 0).length / A.length;
  ut.push({ ok: u >= KR.utbytteAndel, tekst: `«kontrakter + andeler» får utbytte i ${Math.round(u * 100)} % av kjøringene (median ${O.mill(med(A.map(r => r.bors.utbytteInn)))}, kjøpt for ${O.mill(med(A.map(r => r.bors.kjøpt)))}, første kjøp snitt dag ${snitt(A, r => r.bors.førsteDag)}, Storlia eid i ${Math.round(A.filter(r => r.bors.eierDag).length / A.length * 100)} %)` });
  const opp = T.filter(r => r.bors && r.bors.oppkjøpt).length; ut.push({ ok: !opp, tekst: `«børs tidlig» blir ikke kjøpt opp på 30 døgn når den beholder 60 % (${opp} av ${T.length})` });
  return ut;
} });
module.exports = { KR, MB };
