// Test for spill/bors.js (fase Ø7: andeler, investorer og Gråbørsen). node pipeline/fliser/test_bors.js
'use strict';
const path = require('path');
const B = require(path.join(__dirname, '../../site/dovre-fliser/spill/bors.js'));
const Seier = require(path.join(__dirname, '../../site/dovre-fliser/spill/seier.js'));
let n = 0, feil = 0;
const sjekk = (b, t) => { n++; if (!b) { feil++; console.log('FEIL ' + t); } };
const D = 1440, R = B.REGLER;

// ---------- verdiene ----------
const storlia = { navn: 'Storlia Tømmer', helse: 68, levert: 0 };
let v = B.firmaVerdi(storlia);
sjekk(v.verdi === 20e6 && v.resultat === 1e6, 'Storlia er verdt 20 mill. med 1 mill. i resultat per uke: ' + JSON.stringify(v));
sjekk(B.firmaVerdi(storlia, { fiendeEier: true }).verdi < v.verdi * .65, 'rival holder hjemstedet: verdien faller');
sjekk(B.firmaVerdi({ ...storlia, helse: 90, levert: 5 }).verdi > v.verdi * 1.2, 'frisk og mye handel: verdien stiger');
sjekk(B.firmaVerdi({ ...storlia, konkurs: 100 }).verdi === 0, 'konkurs = 0');
sjekk(B.firmaVerdi({ ...storlia, helse: 20 }).resultat === 0, 'konkurstruet: ingen resultat');
sjekk(B.kurs(20e6, 1) === 200000 && B.kurs(20e6, 9) === Math.round(200000 * R.stemning.maks), 'kursen = verdi / 100 × stemning (med tak)');
const sv = B.selskapVerdi({ eiendeler: 60e6, andeler: 2e6, ukeNetto: 5e6, angrep: 1 });
sjekk(sv.verdi === Math.round((62e6 + 5e6) * .95 / 1e4) * 1e4, 'ditt selskap: eiendeler + ukas resultat × trygghet: ' + sv.verdi);
sjekk(B.selskapVerdi({ eiendeler: 60e6, ukeNetto: -50e6 }).verdi === 42e6, 'tap trekker høyst 30 % av eiendelene');

// ---------- stemningen ----------
const o = { stemning: 1 };
B.endreStemning(o, B.stemningEndring({ levert: 2, brutt: 0, byer: 1 }));
sjekk(Math.abs(o.stemning - 1.05) < 1e-9, 'to leverte og en by: + 5 % (' + o.stemning + ')');
o.stemning = 1; B.endreStemning(o, B.stemningEndring({ brutt: 1, byer: -1, angrep: 1 }));
sjekk(o.stemning < .9, 'brudd, tapt by og angrep: ned (' + o.stemning + ')');
o.stemning = 1.5; B.tilbake(o); sjekk(o.stemning < 1.5 && o.stemning > 1.4, 'stemningen drar mot 1');
const S0 = B.ny({ x: 0, y: 0 });
let f = B.tellerForskjell(S0, { levert: 4, brutt: 1 }); sjekk(f.levert === 0 && f.brutt === 0, 'første gang: ingen forskjell');
f = B.tellerForskjell(S0, { levert: 6, brutt: 1 }); sjekk(f.levert === 2 && f.brutt === 0, 'så forskjellen');

// ---------- andeler i firmaene ----------
let S = B.ny({ x: 0, y: 0 });
sjekk(!B.kjøp(S, 'Storlia Tømmer', 10, 200000, { nivå: 2 }).ok, 'nivå 2: kan ikke kjøpe andeler');
let k = B.kjøp(S, 'Storlia Tømmer', 10, 200000, { nivå: 3 });
sjekk(k.ok && k.kr === 2080000, 'kjøp 10 % i Storlia: kursen + 4 % (' + k.kr + ')');
let vi = B.virkning(S, 'Storlia Tømmer'); sjekk(vi.rabatt === .95 && vi.innsyn && !vi.førsterett && !vi.eier, '10 % = rabatt og innsyn');
k = B.kjøp(S, 'Storlia Tømmer', 42, 200000, { nivå: 3 }); vi = B.virkning(S, 'Storlia Tømmer');
sjekk(k.ok && vi.førsterett && vi.eier && k.eier === 'blå' && k.eierFør === null, 'over 50 % = dere eier firmaet');
let H = B.døgn(S, { nå: 8 * D, firmaer: [{ ...storlia, bransje: 'tømmer' }], resultat: { 'Storlia Tømmer': 1e6 }, rand: () => .99 });
const eid = H.find(h => h.type === 'eid');
sjekk(eid && eid.kr === Math.round(1e6 / 7 * .52 / 1000) * 1000 && eid.varer && eid.varer.tømmer === 6, 'eid firma: resultatet per døgn og tømmer fra hjemstedet ' + JSON.stringify(eid));
let s2 = B.selg(S, 'Storlia Tømmer', 42, 200000); sjekk(s2.ok && s2.eier === null && s2.eierFør === 'blå' && s2.kr === 8064000, 'salg: kursen − 4 %, og eierskapet går');
S.firmaer['Storlia Tømmer'].du = 10;
H = B.døgn(S, { nå: 14 * D, firmaer: [{ ...storlia, bransje: 'tømmer' }], resultat: { 'Storlia Tømmer': 1e6 }, rand: () => .99 });
const ub = H.find(h => h.type === 'utbytte'); sjekk(ub && ub.kr === 80000, 'utbytte hver uke: 10 % × 80 % av resultatet ' + JSON.stringify(ub));
H = B.døgn(S, { nå: 15 * D, firmaer: [{ ...storlia, bransje: 'tømmer' }], resultat: { 'Storlia Tømmer': 1e6 }, rand: () => .99 });
sjekk(!H.some(h => h.type === 'utbytte'), 'ikke utbytte midt i uka');
// rivalene kjøper (kappløpet om Storlia)
S = B.ny(null); let r = 0; const tre = () => (r++ % 3 === 0 ? .01 : .5);
for (let d = 1; d < 60; d++) B.døgn(S, { nå: d * D, firmaer: [{ ...storlia, bransje: 'tømmer' }, { navn: 'Ytterø Sjømat', helse: 68, bransje: 'sjømat' }], resultat: {}, rand: tre });
const st = S.firmaer['Storlia Tømmer'];
sjekk(st && (st.rød > 0 || st.grønn > 0), 'rivalene kjøper i Storlia: ' + JSON.stringify(st));
sjekk(st.du + st.rød + st.grønn <= 100.01, 'aldri over 100 andeler');
sjekk(B.eierAv(st) === st.eier, 'eieren er den med over halvparten: ' + st.eier);

// ---------- notering, utbytte, emisjon, tilbakekjøp ----------
S = B.ny(null);
sjekk(!B.noter(S, 40, 1e6, 0, { nivå: 3 }).ok, 'notering krever nivå 4');
sjekk(!B.noter(S, 50, 1e6, 0, { nivå: 4 }).ok, 'høyst 40 %');
let nt = B.noter(S, 40, 1e6, 10 * D, { nivå: 4 });
sjekk(nt.ok && nt.kr === 36e6 && S.meg.egne === 60 && S.meg.fritt === 40 && S.meg.notert, 'notering av 40 %: 36 mill. (kursen − 10 %)');
sjekk(B.sjekkSum(S), 'summen av andelene er 100');
sjekk(S.meg.uke.forventet === 400000, 'eierne venter 1 % av sin del hver uke: ' + S.meg.uke.forventet);
const før = S.meg.stemning;
H = B.døgn(S, { nå: 17 * D, kurs: { meg: 1e6 }, rand: () => .99 });
sjekk(H.some(h => h.type === 'ukeSlutt' && !h.ok) && S.meg.stemning < før - .07, 'ikke betalt utbytte: kursen faller (' + S.meg.stemning + ')');
B.betalUtbytte(S, S.meg.uke.forventet); const før2 = S.meg.stemning;
H = B.døgn(S, { nå: 24 * D, kurs: { meg: 1e6 }, rand: () => .99 });
sjekk(H.some(h => h.type === 'ukeSlutt' && h.ok) && S.meg.stemning > før2 - .01, 'betalt utbytte: kursen holder seg');
let em = B.emisjon(S, 10, 1e6);
sjekk(em.ok && Math.abs(S.meg.egne - 54) < .05 && B.sjekkSum(S) && em.kr > 9e6, 'emisjon 10 %: dere eier en mindre del (' + S.meg.egne + '), penger ' + em.kr);
sjekk(!B.emisjon(S, 20, 1e6).ok, 'emisjon: høyst 15 % om gangen');
let tb = B.tilbakekjøp(S, 4, 1e6); sjekk(tb.ok && Math.abs(S.meg.egne - 58) < .05 && tb.kr === 4240000 && B.sjekkSum(S), 'tilbakekjøp: + 6 % på kursen');

// ---------- fiendtlig oppkjøp ----------
S = B.ny(null); B.noter(S, 40, 1e6, 0, { nivå: 4 }); S.meg.egne = 40; S.meg.fritt = 9; S.meg.rival.rød = 51;
H = B.døgn(S, { nå: D, kurs: { meg: 1e6 }, rand: () => .99 });
sjekk(S.meg.oppkjøpt === 'rød' && H.some(h => h.type === 'oppkjøp' && h.side === 'rød'), 'rival over 50 % = kjøpt opp');
const inn = B.seierInn(S, { meg: 1e6, rød: 5e5, grønn: 5e5 });
sjekk(inn.oppkjøpt.blå === 'rød' && inn.verdier.blå === 40e6, 'seier-veien får oppkjøpet og din del: ' + JSON.stringify(inn));
let p = Seier.penger({ blå: 300e6, rød: 50e6, grønn: 40e6 }, 'blå', 5 * D, undefined, { oppkjøpt: { blå: 'rød' } });
sjekk(!p.nådd && /kjøpt opp/.test(p.mangler.join()), 'kjøpt opp: du kan ikke vinne på penger');
p = Seier.penger({ blå: 300e6, rød: 50e6, grønn: 40e6 }, 'rød', 5 * D, undefined, { oppkjøpt: { blå: 'rød' } });
sjekk(p.nådd && p.oppkjøp, 'rivalen som kjøpte deg opp, har vunnet på penger');
p = Seier.penger({ blå: 300e6, rød: 50e6, grønn: 40e6 }, 'blå', 5 * D, undefined, { rivalAndel: { blå: 35 } });
sjekk(!p.nådd && /eier/.test(p.mangler.join()), 'en rival med mye av deg: ikke trygg nok til å vinne');
p = Seier.penger({ blå: 300e6, rød: 50e6, grønn: 40e6 }, 'blå', 5 * D);
sjekk(p.nådd, 'uten børs: som før');
// misfornøyde investorer selger til en rival
S = B.ny(null); B.noter(S, 30, 1e6, 0, { nivå: 4 }); S.investorer.fond = { status: 'eier', tilfreds: 10 }; S.meg.inv.fond = 16; S.meg.egne = 54;
H = B.døgn(S, { nå: D, kurs: { meg: 1e6 }, rand: () => .99 });
sjekk(H.some(h => h.type === 'investorSelger') && (S.meg.rival.rød === 16 || S.meg.rival.grønn === 16) && B.sjekkSum(S), 'misfornøyd investor selger til en rival');

// ---------- investorene ----------
S = B.ny(null);
sjekk(!B.henvendelse(S, 2, 0, 1e6, () => 0), 'nivå 2: ingen henvendelser');
let h = B.henvendelse(S, 3, D, 1e6, () => 0);
sjekk(h && h.inv.id === 'rederi' && h.h.andel === 10 && h.h.kr === 10e6, 'rederi-eieren vil ha 10 %');
let sv2 = B.svarInvestor(S, 'rederi', true, D, () => 0);
sjekk(sv2.ok && sv2.kr === 10e6 && S.meg.egne === 90 && S.meg.inv.rederi === 10 && B.sjekkSum(S) && sv2.ønske && sv2.ønske.type === 'avkastning', 'ja: penger inn, andelen ut, et ønske');
h = B.henvendelse(S, 3, 2 * D, 1e6, () => 0);
sjekk(h && h.inv.id === 'vakt' && h.h.lån && h.h.lån.kr === 12e6, 'sikkerhetsfirmaet tilbyr et lån');
sv2 = B.svarInvestor(S, 'vakt', true, 2 * D, () => 0);
sjekk(sv2.ok && sv2.kr === 12e6 && S.meg.lån.length === 1 && sv2.ønske.type === 'unna' && sv2.ønske.rival === 'rød', 'lånet og ønsket «hold dere unna Ravnsund»');
const ø = sv2.ønske;
sjekk(B.vurderØnske(ø, 3 * D, { kampMed: { rød: 3 * D - 10 } }) === 'brutt', 'kamp med Ravnsund bryter ønsket');
sjekk(B.vurderØnske(ø, 3 * D, { kampMed: { rød: D } }) === null, 'kamp før ønsket teller ikke');
sjekk(B.vurderØnske(ø, ø.frist, {}) === 'holdt', 'holdt til fristen');
const kø = B.nyttØnske(S, 'fond', 'kontrakt', 0, () => 0);
sjekk(B.vurderØnske(kø, D, { levert: [{ type: kø.oppdrag, tid: 10 }] }) === 'holdt' && /kontrakt/.test(B.ønskeTekst(kø)), 'kontrakt-ønsket: lever en ' + kø.oppdrag);
H = B.døgn(S, { nå: 9 * D, kurs: { meg: 1e6 }, rand: () => .99 });
const rt = H.find(q => q.type === 'renter'); sjekk(rt && rt.kr === 240000 && !rt.siste, 'renter etter en uke: 2 %');
const lb = B.lånBetalt(S, S.meg.lån[0], false, 1e6); sjekk(!lb.ok && lb.andeler > 0 && S.meg.inv.vakt > 0 && B.sjekkSum(S), 'ikke betalt: långiveren tar andeler (' + lb.andeler + ')');
const lukket = S.ønsker.filter(q => q.status !== 'aktiv').length; sjekk(lukket >= 1, 'ønskene vurderes i døgnet');
// aktive eiere stiller krav hver uke
S = B.ny(null); B.noter(S, 10, 1e6, 0, { nivå: 4 }); S.meg.egne = 70; S.meg.inv.fond = 20; S.investorer.fond = { status: 'eier', tilfreds: 60 };
H = B.døgn(S, { nå: 7 * D, kurs: { meg: 1e6 }, rand: () => .1 });
sjekk(H.some(q => q.type === 'krav' && q.ø.inv === 'fond'), 'en eier med over 15 % stiller krav');
const ky = S.ønsker.find(q => q.krav); const sf = S.meg.stemning, tf = S.investorer.fond.tilfreds; B.lukkØnske(S, ky, 'nei'); sjekk(S.meg.stemning < sf && S.investorer.fond.tilfreds === tf - 10, 'et nei koster kurs og tilfredshet');

// ---------- rivalene på børsen ----------
S = B.ny(null);
sjekk(B.kjøpRival(S, 'rød', 10, 5e5).ok && S.rivaler.rød.du === 10 && S.rivaler.rød.fritt === 30, 'kjøp 10 % i Ravnsund');
sjekk(!B.kjøpRival(S, 'rød', 40, 5e5).ok, 'ikke mer enn det som er på børsen');
const rs = S.rivaler.grønn.stemning; B.rykte(S, 'grønn'); sjekk(S.rivaler.grønn.stemning < rs, 'rykter senker kursen deres');

// ---------- lagring ----------
S = B.ny({ x: 1, y: 2 }); B.noter(S, 20, 1e6, 0, { nivå: 4 }); B.kjøp(S, 'Storlia Tømmer', 12, 1e5, { nivå: 3 }); B.nyttØnske(S, 'fond', 'ro', 0);
const T = B.fraJSON(JSON.parse(JSON.stringify(B.tilJSON(S))));
sjekk(T && T.meg.notert && T.meg.egne === 80 && T.firmaer['Storlia Tømmer'].du === 12 && T.ønsker.length === 1 && B.sjekkSum(T), 'lagret og lest');
sjekk(B.fraJSON(null) === null && B.fraJSON({ tull: 1 }) === null, 'tåler tull');
const T2 = B.fraJSON({ meg: { egne: 70, fritt: 70, rival: {} } }); sjekk(T2 && B.sjekkSum(T2), 'retter en ødelagt sum');

console.log(feil ? `test_bors: ${feil} av ${n} FEIL` : `test_bors: ${n} sjekker ok`);
process.exit(feil ? 1 : 0);
