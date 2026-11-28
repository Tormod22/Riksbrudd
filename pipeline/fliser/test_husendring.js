// Test for spill/husendring.js (B3: rive og åpne husene del for del) og husarbeidet i spill/ressurser.js.
// Kjør: node pipeline/fliser/test_husendring.js
const B = require('../../site/dovre-fliser/spill/bygning.js');
global.Bygning = B;
const H = require('../../site/dovre-fliser/spill/husendring.js');
const RS = require('../../site/dovre-fliser/spill/ressurser.js');
let feil = 0;
const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const rekt = (L, D) => [[-L / 2, -D / 2], [L / 2, -D / 2], [L / 2, D / 2], [-L / 2, D / 2]];

// et hus på 14 × 11 m, 9 m høyt: to etasjer, kjeller og bærende vegg langs mønet
const m = B.fraKart(rekt(14, 11), { i: 4242, t: 0, h: 9, tett: 5 });
const e1 = m.etasjer.find(e => e.n === 1);
const lett = e1.vegger.find(w => w.type === 'skille' && !w.bærende), bær = e1.vegger.filter(w => w.type === 'skille' && w.bærende);
ok(!!lett && bær.length >= 2, `huset har lette og bærende skillevegger (${bær.length} bærende)`);

// 1. riv en lett vegg: gir planker, tar tid, ingen ras
let h = H.handlinger(m, 1, { del: 'vegg', id: lett.id, t: 1 });
let riv = h.find(a => a.k === 'riv');
ok(riv && riv.ok && riv.mat.tre > .1 && riv.timer > 0 && !riv.raser && !riv.advarsel, `lett vegg: ${H.matTekst(riv.mat)}, ${H.tidTekst(riv.timer)}, ingen advarsel`);
ok(!h.some(a => a.k === 'bjelke'), 'lett vegg: ingen bjelke å sette inn');
ok(h.some(a => a.k === 'dør' && a.ok) && !h.some(a => a.k === 'vindu'), 'lett vegg: ny dør kan lages (vindu bare i yttervegger)');

// 2. bærende vegg: den første halvdelen holder, den andre gir ras med advarsel – og bjelke først hindrer raset
const k = B.kopi(m); B.endre(k, { e: 1, del: 'vegg', id: bær[0].id, gjør: 'riv' });
h = H.handlinger(k, 1, { del: 'vegg', id: bær[1].id, t: 2 });
riv = h.find(a => a.k === 'riv');
ok(riv && riv.raser && riv.rasM2 > 5 && /^Dette er en bærende vegg\. Uten bjelke raser .* \(ca\. \d+ m²\)\.$/.test(riv.advarsel), `bærende vegg: advarsel «${riv && riv.advarsel}»`);
const bjr = h.find(a => a.k === 'bjelkeRiv');
ok(bjr && bjr.ok && !bjr.raser && bjr.stål > 0, `bjelke og riv: ingen ras, trenger ${bjr && bjr.stål} t stål`);
ok(h.some(a => a.k === 'bjelke' && a.ok), '«Sett inn bjelke» finnes alene');
// gjør det likevel: delene raser i modellen, og raset gir skrot
const k2 = B.kopi(k), s = B.endre(k2, riv.endringer[0]);
const rastDekke = k2.etasjer.find(e => e.n === 2).dekke.felt.filter(f => f.tilstand === 'rast').length;
ok(s.ok && rastDekke > 0 && s.materialer.tre > riv.mat.tre * 0 && s.ras.length > 0, `gjort likevel: ${rastDekke} dekkefelt i 2. etasje har rast`);
ok(riv.mat.tre > H.prøv(k, [{ e: 1, del: 'vegg', id: lett.id, gjør: 'riv' }]).mat.tre, 'raset gir skrot (mer tre enn en lett vegg)');

// 3. ny dør i en bærende vegg krever bjelke – med bjelke virker den, og medEndringer gir samme hus igjen (lagring)
const dør = H.handlinger(m, 1, { del: 'vegg', id: bær[0].id, t: 2.5 }).find(a => a.k === 'dør');
ok(dør && dør.ok && dør.endringer[0].bjelke === true && dør.stål > 0 && !dør.raser, `ny dør i bærende vegg med bjelke over (${dør && dør.stål} t stål)`);
ok(!B.vurder(m, Object.assign({}, dør.endringer[0], { bjelke: false })).ok, 'uten bjelke avvises døra i bærende vegg');
const logg = [dør.endringer[0], { e: 1, del: 'vegg', id: lett.id, gjør: 'riv' }];
const m2 = B.medEndringer(m, logg), e2 = m2.etasjer.find(e => e.n === 1);
ok(e2.åpninger.some(o => o.ny && o.vegg === bær[0].id && o.bjelke) && e2.vegger[lett.id].tilstand === 'revet', 'endringsloggen lagt på kartmodellen gir døra og den revne veggen igjen');
ok(JSON.stringify(B.medEndringer(m, JSON.parse(JSON.stringify(logg)))) === JSON.stringify(m2), 'samme logg (via JSON) gir nøyaktig samme modell');

// 4. rom: riv gulv, søyle, tak (huset på 12 × 8 m har to etasjer og loft)
const mL = B.fraKart(rekt(12, 8), { i: 4243, t: 0, h: 9, tett: 5 }), loft = mL.etasjer.find(e => e.loft);
ok(!!loft && mL.etasjer.some(e => e.n === 2 && !e.loft), `12 × 8 m: etasjene ${mL.etasjer.map(e => e.n).join(', ')} (loftet er ${loft && loft.n})`);
const r2 = mL.etasjer.find(e => e.n === 2).rom[0];
const cx = r2.P.reduce((s, p) => s + p[0], 0) / 4, cy = r2.P.reduce((s, p) => s + p[1], 0) / 4;
const hr = H.handlinger(mL, 2, { del: 'rom', id: r2.id, x: cx, y: cy });
ok(hr.some(a => a.k === 'gulv' && a.ok && a.mat.tre > 0), 'rom i 2. etasje: riv gulvet gir planker');
ok(hr.some(a => a.k === 'søyle' && a.ok && a.stål > 0), 'rom i 2. etasje: søyle (loftet over)');
const hl = H.handlinger(mL, loft.n, { del: 'rom', id: 0, x: 0, y: 0 });
ok(hl.some(a => a.k === 'tak' && a.ok), 'loftet: riv taket over');

// 5. etasje for etasje ovenfra
ok(JSON.stringify(H.etasjerOvenfra(mL)) === JSON.stringify([loft.n, 2, 1]), 'etasjene ovenfra: loft, 2, 1 (kjelleren rives ikke ovenfra)');
ok(H.handlinger(mL, loft.n, { del: 'etasje' }).some(a => a.k === 'etasje' && a.ok) && !H.handlinger(mL, 2, { del: 'etasje' }).length, 'bare øverste etasje kan rives');
ok(H.rivSteg([3, 2, 1], 0) === 0 && H.rivSteg([3, 2, 1], .34) === 1 && H.rivSteg([3, 2, 1], .7) === 2 && H.rivSteg([3, 2, 1], 1) === 2, 'rivSteg: den nederste står til jobben er ferdig');
const m3 = B.medEndringer(mL, [{ e: loft.n, del: 'etasje', gjør: 'riv' }]);
ok(H.andelIgjen(mL) === 1 && H.andelIgjen(m3) === .8, `andel igjen etter loftet: ${H.andelIgjen(m3)}`);
const m4 = B.medEndringer(mL, [{ e: loft.n, del: 'etasje', gjør: 'riv' }, { e: 2, del: 'etasje', gjør: 'riv' }]);
ok(H.andelIgjen(m4) === .4 && m4.etasjer.find(e => e.n === 2).tilstand === 'revet', `etter 2. etasje: ${H.andelIgjen(m4)} igjen`);

// 6. skade: fast per jobb, bare ved ras over 2 m²
ok(H.skade(1, 3, 5) === null && H.skade(30, 0, 5) === null, 'ingen skade ved lite ras eller ingen på jobben');
let treff = 0; for (let f = 1; f <= 200; f++) { const q = H.skade(24, 3, f); if (q) { treff++; if (!(q.hvem >= 0 && q.hvem < 3 && q.tap >= .12 && q.tap <= .6)) feil++; } }
ok(treff > 40 && treff < 160 && JSON.stringify(H.skade(24, 3, 7)) === JSON.stringify(H.skade(24, 3, 7)), `skade i ca. halvparten av rasene (${treff} av 200), fast per jobb`);

// 7. husarbeid i ressurser.js: jobb for folk på «riving», haug med materialer, endringene i R.husFerdig, huset står
const R = RS.ny(), leir = { x: 0, y: 0 }, P = rekt(14, 11);
const j = RS.startDel(R, { hus: { i: 4242, P, t: 0, h: 9 }, endringer: riv.endringer, mat: riv.mat, timer: riv.timer, navn: 'riv veggen' }, leir).jobb;
ok(j && j.type === 'riving' && j.endringer.length === 1 && j.mat.tre > 0, 'startDel lager en jobb på «riving»');
const inn = []; for (let t = 0; t < 600 && R.jobber.length; t++) inn.push(...RS.steg(R, 1, { arbeidere: () => 2, leir, leggInn: (k, v) => v }));
ok(R.husFerdig.length === 1 && R.husFerdig[0].hus === 4242 && R.revet.length === 0, 'ferdig husarbeid: endringene i R.husFerdig, huset er ikke revet');
ok(inn.some(q => q.hva === 'husFerdig') && !inn.some(q => q.hva === 'ferdig') && inn.some(q => q.hva === 'levert' && q.mat.tre > 0), 'hendelsen «husFerdig» (ikke «ferdig»), og materialene leveres');
ok(RS.fraJSON(RS.tilJSON(R)).husFerdig.length === 1, 'R.husFerdig lagres');
// hele huset etter at loftet er revet: bare det som står igjen
const R2 = RS.ny(), full = RS.startRiving(R2, { i: 1, P, t: 0, h: 9 }, leir).jobb, del = RS.startRiving(RS.ny(), { i: 1, P, t: 0, h: 9, andel: .8, etasjer: [2, 1] }, leir).jobb;
ok(Math.abs(del.mat.tre - full.mat.tre * .8) < .2 && del.arbeid < full.arbeid && del.etasjer.join() === '2,1', 'delvis revet hus gir 80 % ved riving av resten');
ok(!RS.startRiving(R2, { i: 1, P, t: 0, h: 9 }, leir).jobb, 'samme hus kan ikke rives to ganger samtidig');
RS.avbryt(R2, full.id);
ok(!!RS.startRiving(R2, { i: 1, P, t: 0, h: 9 }, leir).jobb, 'et stoppet hus kan rives videre');

console.log(feil ? `${feil} FEIL` : 'Alle testene for husendring er ok.');
process.exit(feil ? 1 : 0);
