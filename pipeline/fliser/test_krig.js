// Test av krigsreglene (spill/krig.js) og tilleggene i formasjon.js og enheter.js. Kjør: node pipeline/fliser/test_krig.js
const assert = require('assert'), K = require('../../site/dovre-fliser/spill/krig.js'), F = require('../../site/dovre-fliser/spill/formasjon.js'), E = require('../../site/dovre-fliser/spill/enheter.js'), L = require('../../site/dovre-fliser/spill/lagring.js');
let n = 0; const ok = (b, t) => { assert.ok(b, t); n++; }, nær = (a, b) => Math.abs(a - b) < 1e-9, R = K.REGLER;
const frø = s => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
// flanke og rygg: b står i origo og vender mot øst (retning 0)
ok(K.flanke(0, 0, 0, 100, 0).hva === 'front' && K.flanke(0, 0, 0, 100, 0).f === 1, 'forfra gir ingenting');
ok(K.flanke(0, 0, 0, 0, 100).hva === 'flanke' && K.flanke(0, 0, 0, 0, -100).f === R.flanke.flankeF, 'fra siden = flanke');
ok(K.flanke(0, 0, 0, -100, 5).hva === 'rygg' && K.flanke(0, 0, 0, -100, 5).f === R.flanke.ryggF, 'bakfra = rygg');
ok(nær(K.flanke(0, 0, 0, -100, 0, true).f, 1 + (R.flanke.ryggF - 1) * R.flanke.nedgravd), 'nedgravd: halve overtaket');
ok(K.flanke(Math.PI * 2 + .1, 0, 0, 100, 0).hva === 'front', 'tåler retninger over en hel runde');
// laget snur seg: 12 grader i minuttet, korteste veg, og stopper på målet
ok(nær(K.snu(0, Math.PI / 2, 1), 12 * Math.PI / 180) && nær(K.snu(0, -Math.PI / 2, 1), -12 * Math.PI / 180), 'snur korteste veg');
ok(K.snu(0, .1, 5) === .1 && nær(K.snu(3, -3, 1), 3 + 12 * Math.PI / 180), 'stopper på målet, og går over ±π');
let r = 0; for (let i = 0; i < 20; i++) r = K.snu(r, Math.PI, 1); ok(nær(r, Math.PI), 'helt rundt på 15 minutter');
// hus
ok(K.husVern(7, false) === R.hus.tar && K.husVern(7, true) === 1 && K.husVern(1, false) === 1, 'dekning bak hus bare når laget står stille i tettbebyggelse');
ok(K.husVern(1, false, true) === R.hus.tar && K.husVern(1, true, true) === 1 && K.husPunkter(10, 20).length === 9 && K.husPunkter(10, 20)[0].join() === '10,20' && Math.abs(Math.hypot(K.husPunkter(0, 0)[3][0], K.husPunkter(0, 0)[3][1]) - R.hus.nær) < 1e-9, 'ekte hus inntil laget gir også dekning (midten og en ring sjekkes)');
ok(K.egetGirSeg({ ute: 6, omringet: true }) && !K.egetGirSeg({ ute: 5, omringet: true }) && !K.egetGirSeg({ ute: 9, omringet: false }), 'egne lag gir seg bare når de er knust OG omringet');
ok(K.VÆREMÅTER.pågående.overtak < 1 && K.VÆREMÅTER.forsiktig.overtak > 1 && !K.VÆREMÅTER.seig.overtak, 'væremåten flytter terskelen for angrep');
// sårede
const menn = () => [{ navn: 'A', hp: 1 }, { navn: 'B', hp: .5 }, { navn: 'C', hp: .5 }, { navn: 'D', hp: 0 }];
ok(K.sårede(menn()) === 2 && nær(K.sårFart(menn()), 1 - 2 * R.sårede.per) && K.sårFart(Array(12).fill({ hp: .5 })) === R.sårede.minst && K.sårFart([]) === 1, 'sårede senker farten');
{ const m = menn(); let s = K.stell(m, R.sårede.sykestue - 1, true, 0); ok(!s.friske.length && s.akk === R.sårede.sykestue - 1, 'ikke ennå'); s = K.stell(m, 1, true, s.akk); ok(s.friske[0] === 'B' && m[1].hp === 1, 'én frisk');
  s = K.stell(m, R.sårede.leir, false, 0); ok(s.friske[0] === 'C' && m[3].hp === 0, 'uten sykestue går det saktere, falne står ikke opp'); ok(K.stell(m, 999, true, 5).akk === 0, 'ingen sårede: ingenting spares opp'); }
// overgivelse
ok(K.omringet({ x: 0, y: 0 }, [{ x: 300, y: 0 }, { x: -300, y: 50 }]) && !K.omringet({ x: 0, y: 0 }, [{ x: 300, y: 0 }, { x: 300, y: 200 }]) && !K.omringet({ x: 0, y: 0 }, [{ x: 900, y: 0 }, { x: -900, y: 0 }]), 'omringet = fiender på to kanter, nær nok');
ok(/knust/.test(K.girSeg({ ute: 6, nær: 200, forhold: 1 })) && K.girSeg({ ute: 6, nær: 500, forhold: 1 }) === null && K.girSeg({ ute: 6, nær: null, forhold: 1 }) === null, 'knust og fienden like ved');
ok(K.girSeg({ ute: 7, nær: 100, forhold: 1, seig: true }) === null && K.girSeg({ ute: 8, nær: 100, forhold: 1, seig: true }) !== null, 'seige førere holder ut lenger');
ok(/omringet/.test(K.girSeg({ ute: 2, nær: 400, omringet: true, forhold: .3 })) && K.girSeg({ ute: 2, nær: 400, omringet: true, forhold: .8 }) === null && K.girSeg({ ute: 0, nær: 400, omringet: true, forhold: .3 }) === null, 'omringet og underlegen');
// førere
ok(K.væremåte('Kåre Lien') === K.væremåte('Kåre Lien') && Object.values(K.VÆREMÅTER).includes(K.væremåte('x')), 'samme navn, samme væremåte');
{ const s = new Set(); for (let i = 0; i < 60; i++) s.add(K.væremåte('Fører ' + i).navn); ok(s.size === 4, 'alle fire væremåtene forekommer'); }
// røverne
ok(K.røverVariant(3, 12, 1, 9) === 'rett' && K.røverVariant(2, 12, 1, 9) === 'rett' && K.røverVariant(7, 12, 1, 3) === 'rett' && K.røverVariant(7, 12, 1, 4) === 'sabotasje', 'balansen: med dag kommer sabotørene tidligst i bølge 4 og fra dag 5');
ok(K.røverVariant(1, 12) === 'rett' && K.røverVariant(2, 12) === 'to' && K.røverVariant(3, 12) === 'sabotasje' && K.røverVariant(4, 12) === 'natt' && K.røverVariant(4, 23) === 'rett' && K.røverVariant(6, 12) === 'to' && K.røverVariant(2, 12, 1) === 'sabotasje' && K.røverVariant(2, 12, 2) === 'to', 'variantene på rundgang, om natta kommer de rett på');
// natt
ok(K.natt(12) === 0 && K.natt(23) === 1 && K.natt(2) === 1 && K.natt(21.25) > 0 && K.natt(21.25) < 1 && K.natt(4) > 0 && K.natt(4) < 1 && K.natt(5) === 0 && K.natt(36) === 0, 'mørket etter klokka');
ok(K.nattSikt(12, false, false) === 1 && nær(K.nattSikt(0, false, false), R.natt.sikt) && K.nattSikt(0, true, false) === 1 && K.nattSikt(0, false, true) === 1, 'nattsikt og lys opphever natta');
ok(K.klokkeTime(0) === 6 && K.klokkeTime(18 * 60) === 0, 'spillet starter kl. 06');
// røyk og lys
{ const sky = [{ x: 0, y: 0, til: 10 }]; ok(K.røykFaktor({ x: 500, y: 0 }, { x: 10, y: 0 }, sky, 5) === R.røyk.tar && K.røykFaktor({ x: 10, y: 0 }, { x: 500, y: 0 }, sky, 5) === R.røyk.ild && K.røykFaktor({ x: 10, y: 0 }, { x: 500, y: 0 }, sky, 11) === 1 && K.røykFaktor({ x: 400, y: 0 }, { x: 500, y: 0 }, sky, 5) === 1, 'røyken skjuler den som står i den');
  ok(K.iLys({ x: 100, y: 0 }, sky, 5) && !K.iLys({ x: 100, y: 0 }, sky, 12) && !K.iLys({ x: 5000, y: 0 }, sky, 5), 'lysraketten'); }
// beleiring
ok(K.beleiret({ x: 0, y: 0 }, [{ x: 1000, y: 0 }, { x: -1000, y: 0 }]) && !K.beleiret({ x: 0, y: 0 }, [{ x: 1000, y: 0 }]) && !K.beleiret({ x: 0, y: 0 }, [{ x: 1000, y: 0 }, { x: 900, y: 300 }]), 'ring = lag på to kanter');
ok(K.beleiringSteg(0, 60, false) === 60 && K.beleiringSteg(0, 60, true) === 90 && K.beleiringNå(0) === null && K.beleiringNå(10) === 'holder' && K.beleiringNå(R.beleiring.svekket) === 'svekket' && K.beleiringNå(R.beleiring.girSeg) === 'girSeg', 'beleiringen går fortere uten strøm');
// våpenhvile
ok(K.fredPris(0, 0) === R.fred.pris && K.fredPris(1, 0) === R.fred.pris * 1.5 && K.fredPris(0, 1) === R.fred.pris * 2, 'prisen øker for hver avtale og dobles etter brudd');
// bygdevern
ok(K.vernMenn(100) === R.vern.minst && K.vernMenn(1e6) === R.vern.høyst && K.vernMenn(1500) === 10 && K.vernPris(10) === R.vern.krMinst && K.vernPris(1e6) === R.vern.krHøyst && K.vernPris(1000) === 2e6, 'vernet etter folketallet');
{ let a = 0, b = 0; const g = frø(5); for (let i = 0; i < 400; i++) { const q = K.vernRunde(10, 12, g); a += q.motLaget; b += q.motVernet; } ok(a > 100 && a < 230 && b > 200 && b < 380, `vernrunder: ${a} mot laget, ${b} mot vernet på 400 runder`); ok(K.vernRunde(1, 100, () => 0).motVernet === 1, 'aldri flere enn vernet har'); }
// helikopter og etterretning
ok(nær(K.heliMin(100000), 30), '100 km på en halv time');
{ const Et = []; K.meld(Et, { navn: 'A', side: 'rød', x: 1.4, y: 2, t: 10, kilde: 'sett' }); K.meld(Et, { navn: 'A', side: 'rød', x: 50, y: 60, t: 20, kilde: 'radio', hva: 'går mot Dombås', varer: 5 }); ok(Et.length === 1 && Et[0].x === 50 && Et[0].kilde === 'radio' && Et[0].til === 25, 'samme lag oppdateres');
  K.rydd(Et, 24); ok(Et.length === 1, 'ferskt'); K.rydd(Et, 25); ok(Et.length === 0, 'gammelt ryddes');
  ok(K.oppfang({ x: 99999, y: 0 }, { x: 0, y: 0 }, () => 0) === null && K.oppfang({ x: 100, y: 0 }, { x: 0, y: 0 }, () => .99) === null, 'utenfor rekkevidde eller uflaks'); const p = K.oppfang({ x: 1000, y: 0 }, { x: 0, y: 0 }, frø(3)); ok(!p || Math.hypot(p.x - 1000, p.y) <= R.etterretning.feil, 'stedet er omtrentlig');
  ok(K.alder(.2) === 'nå' && K.alder(12) === '12 min siden' && K.alder(125) === '2 t siden', 'alder som tekst'); }
// formasjon: fart og erfaring per runde
ok(F.fart('kolonne', true) === 1.2 && F.fart('kolonne', false) === 1.1 && F.fart('linje', true) === .85 && F.fart('kile', true) === 1 && F.fart('tull') === 1, 'kolonne er raskest, og raskest på veg');
{ const m = [{ navn: 'A', hp: 1, erf: 26 }, { navn: 'B', hp: .5 }]; const opp = F.runde(m); ok(opp.length === 1 && m[0].erf === 31 && m[1].erf === 2.5, 'én ildrunde = fem minutter erfaring'); }
// stridsvogn og artilleri: roller
{ let t = 0; const g = frø(9); for (let i = 0; i < 300; i++) t += E.kanonMotKj(500, {}, g); ok(t > 100 && t < 230, `kanonen mot kjøretøy: ${t} treff på 300 runder`); ok(E.kanonMotKj(5000, {}, () => 0) === 0, 'utenfor rekkevidde');
  const st = [{ x: 0, y: 0 }, { x: 500, y: 0 }, { x: 60, y: 0 }]; ok(E.rivStillinger(st, 0, 0, 100, 1, () => 0).join() === '2,0' && E.rivStillinger(st, 0, 0, 100, 0, () => .5).length === 0 && E.rivStillinger(null, 0, 0, 1, 1, () => 0).length === 0, 'stillinger nær nedslaget rives (høyeste indeks først)'); }
// lagring: fiendens lag, minnet, stillingene og ordre i gang
{ const lag = { navn: 'Rød 1', x: 10, y: 20, side: 'rød', leder: 0, menn: [{ navn: 'X', rolle: 'rifle', hp: .5, loy: 1 }], sti: [[10, 20], [500, 600]], ai: { hva: 'angrip', tekst: 'angriper' } };
  const minne = { rød: { sist: { x: 1, y: 2, navn: 'N', styrke: 3, t: 4 }, hatt: new Set([7, 9]), leir: true }, grønn: { sist: null, hatt: new Set(), leir: false } };
  const d = L.fraJSON(JSON.stringify(L.pakk({ tid: 5, leir: { x: 1, y: 2 }, lag: [{ ...lag, navn: 'Egen', side: 'blå', ai: undefined, fanger: { n: 3, side: 'rød' }, bakhold: true }], fiender: [lag], minne, stillinger: [{ x: 5, y: 6, side: 'rød', kjent: true }, { x: NaN, y: 1, side: 'rød' }] })), { x: 1, y: 2 });
  ok(d.fiender.length === 1 && d.fiender[0].side === 'rød' && d.fiender[0].ai.hva === 'angrip' && d.fiender[0].mål.join() === '500,600' && d.lag[0].mål.join() === '500,600' && !d.lag[0].side, 'fiendens lag og målet for marsjen lagres');
  ok(d.stillinger.length === 1 && d.minne.rød.hatt.join() === '7,9' && d.minne.rød.leir === true && d.minne.rød.sist.x === 1, 'stillinger og minne lagres');
  const s = { navn: 'Egen', x: 0, y: 0, menn: [], ai: null }; L.brukLag(s, d.lag[0]); ok(s.målLagret.join() === '500,600' && s.fanger.n === 3 && s.bakhold === true && s.sti === null, 'laget får målet, fangene og bakholdet tilbake');
  const f = { navn: 'Rød 1', x: 0, y: 0, menn: [], ai: { hva: null, tekst: '', mål: [1, 1] } }; L.brukLag(f, d.fiender[0]); ok(f.ai.hva === 'angrip' && f.ai.mål === null && f.menn[0].hp === .5, 'fiendens lag settes tilbake');
  const M = { rød: { sist: null, hatt: new Set(), leir: false }, grønn: { sist: { x: 1 }, hatt: new Set([1]), leir: true } }; ok(L.brukMinne(M, d.minne) === 2 && M.rød.hatt.has(9) && M.rød.leir && M.rød.sist.navn === 'N' && M.grønn.sist === null && !M.grønn.leir, 'minnet legges tilbake');
  ok(L.fraJSON(JSON.stringify({ versjon: 1, leir: { x: 1, y: 2 }, tid: 1 }), { x: 1, y: 2 }).fiender.length === 0, 'gamle lagringer uten fiender leses'); }
// (runde 4) dekning bak leirens egne bygg: en brakke 10 × 6 m med midten i (0, 0); laget står 3 m øst for østveggen
{ const P = [[-5, -3], [5, -3], [5, 3], [-5, 3]], B = [{ P, tar: K.byggDekning('brakke'), navn: 'Brakke' }], lag = { x: 8, y: 0 };
  ok(K.polyAvst(8, 0, P) === 3 && K.polyAvst(0, 0, P) === 0 && K.inni(1, 1, P) && !K.inni(9, 9, P), 'avstand til bygget');
  ok(K.leirVern(lag, { x: -300, y: 0 }, B).f === R.leirbygg.tar && K.leirVern(lag, { x: -300, y: 0 }, B).navn === 'Brakke', 'bygget mellom laget og skytteren gir dekning');
  ok(K.leirVern(lag, { x: 300, y: 0 }, B).f === 1, 'skutt fra den åpne siden: ingen dekning');
  ok(K.leirVern({ x: 20, y: 0 }, { x: -300, y: 0 }, B).f === 1, 'for langt fra bygget (over 6 m): ingen dekning');
  ok(K.leirVern(lag, { x: -300, y: 200 }, B).f === R.leirbygg.tar && K.leirVern(lag, { x: 300, y: 400 }, B).f === 1, 'på skrå: bare når skuddlinja går gjennom bygget');
  ok(K.byggDekning('lagertelt') === R.leirbygg.lett && K.byggDekning('gjerde') === 1 && K.byggDekning('sandsekkvoll') === 1 && K.byggDekning('verksted') === R.leirbygg.tar, 'lette bygg gir mindre, gjerder og sandsekker ingen (egen regel)');
  ok(K.leirVern(lag, { x: -300, y: 0 }, [{ P, tar: R.leirbygg.lett }, { P, tar: R.leirbygg.tar }]).f === R.leirbygg.tar && K.leirVern(lag, { x: -300, y: 0 }, []).f === 1, 'beste dekning gjelder, ingen bygg = 1'); }
// (runde 4) fanger
{ const FA = R.fange;
  ok(K.byttePris(3) === 3 * FA.pris && K.byttePris(0) === 0, 'bytte mot penger: pris per fange');
  ok(K.arbeidF(0, 4) === 1 && nær(K.arbeidF(2, 2), (2 + FA.arbeid * 2) / 2) && K.arbeidF(1, 20) === FA.maksF && K.arbeidF(3, 0) === 1, 'fanger i arbeid er halve arbeidere, bare der dine arbeider');
  ok(nær(K.rømSjanse(4, 0), FA.rømBase + FA.rømLav) && nær(K.rømSjanse(4, 1), FA.rømBase) && K.rømSjanse(8, 1) > K.rømSjanse(8, 2) && K.rømSjanse(0, 0) === 0, 'færre vakter: flere rømmer');
  { const r = frø(7); let a = 0, b = 0; for (let i = 0; i < 200; i++) { a += K.rømmer(4, 0, 1440, r); b += K.rømmer(4, 4, 1440, r); } ok(a > b * 2 && b > 0, `rømming per døgn uten vakter ${a}, med vakter ${b}`);
    ok(K.rømmer(4, 0, 0, r) === 0, 'ingen tid: ingen rømmer'); }
  ok(!K.kanSpørres({ god: true, godMin: FA.døgn * 1440 - 1 }, 0) && K.kanSpørres({ god: true, godMin: FA.døgn * 1440 }, 0) && !K.kanSpørres({ god: false, godMin: 1e9 }, 0), 'spørres først etter noen døgn med god behandling');
  ok(!K.kanSpørres({ god: true, godMin: 1e9, nei: 100 }, 50) && K.kanSpørres({ god: true, godMin: 1e9, nei: 100 }, 100), 'nei: vent før neste forsøk');
  ok(K.jaSjanse(100) > K.jaSjanse(20) && nær(K.jaSjanse(0), FA.ja), 'god moral i leiren: flere vil bli med');
  { const r = frø(3); let ja = 0, forr = 0; for (let i = 0; i < 400; i++) { const s = K.spør(5, 60, r); ja += s.ja; forr += s.forrædere.length; ok(s.forrædere.every(j => j < s.ja), 'forræderne er blant dem som sa ja'); }
    ok(ja > 400 * 5 * .35 && ja < 400 * 5 * .65 && forr > 0 && forr < ja * .2, `ja ${ja} av 2000, forrædere ${forr}`); } }
// (runde 4, del 2) motstanderen foreslår bytte: én mot én, så mange som begge har
ok(K.forslagBytte(3, 1) === 1 && K.forslagBytte(2, 5) === 2 && K.forslagBytte(0, 4) === 0 && K.forslagBytte(4, 0) === 0, 'forslag om bytte: én mot én, bare når begge har fanger');
ok(R.fange.forslagHver > 0 && R.fange.forslagSjanse > 0 && R.fange.forslagSjanse <= 1 && R.fange.forslagVarer > 0, 'forslagene har tall');
console.log(`ok   krig: ${n} sjekker`);
// AI-en: førerens væremåte flytter terskelen (overtakF) – en jevn kamp angripes av den pågående, ikke av den forsiktige
{ const Fr = require('../../site/dovre-fliser/spill/fraksjoner.js'), lag = (ute = 0) => ({ navn: 'A', x: 0, y: 0, menn: Array.from({ length: 12 }, (_, i) => ({ hp: i < ute ? 0 : 1 })) });
  const v = f => Fr.velg(lag(3), { side: 'grønn', byer: [], fiender: [{ x: 500, y: 0, navn: 'F', styrke: 10 }], venner: [], hjem: [-9000, 0], ammo: 1, overtakF: f }).hva;
  assert.ok(v(.85) === 'angrip' && v(1.25) !== 'angrip', `pågående angriper (${v(.85)}), forsiktig ikke (${v(1.25)})`); console.log('ok   væremåten i AI-ens valg'); }
