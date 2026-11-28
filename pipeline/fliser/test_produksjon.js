// Test for spill/produksjon.js (fase Ø1: sagbruk, vedkløyver, fyrkjele). Kjør: node pipeline/fliser/test_produksjon.js
'use strict';
const path = require('path');
const SP = path.join(__dirname, '../../site/dovre-fliser/spill');
const Leir = require(SP + '/leir.js'), P0 = require(SP + '/produksjon.js'), FolkR = require(SP + '/folk.js'), Jobber = require(SP + '/jobber.js');
let feil = 0; const ok = (v, t) => { console.log((v ? 'ok   ' : 'FEIL ') + t); if (!v) feil++; };
const nær = (a, b, e = 1e-6) => Math.abs(a - b) < e;

// leiren: et ferdig sagbruk, en vedkløyver og en fyrkjele
function leir(typer = ['sagbruk']) { const L = Leir.ny(); typer.forEach((t, i) => L.bygg.push({ id: i + 1, type: t, x: i * 30, y: 0, igjen: 0, hp: 1, nivå: 1 })); return L; }

// byggene finnes, med pris, folk og strøm fra planen
{ const B = Leir.BYGG; ok(B.sagbruk && B.sagbruk.pris === 6e6 && B.sagbruk.kw === -15 && B.vedkløyver.pris === 8e5 && B.vedkløyver.kw === -3 && B.fyrkjele.pris === 4e6 && B.fyrkjele.kw === 0, 'maskinene i Leir.BYGG (6 mill./15 kW, 0,8 mill./3 kW, 4 mill.)');
  ok(Leir.MATERIALER.tre.navn === 'Planker' && Leir.MATERIALER.tømmer.pris === 8000 && Leir.MATERIALER.flis && Leir.MATERIALER.ved, '«tre» heter Planker, tømmer 8 000 kr/m³, flis og ved finnes');
  const L = Leir.ny(); ok(L.lager.tømmer === 0 && L.lager.flis === 0 && L.lager.ved === 0, 'nytt lager har tømmer, flis og ved');
  const g = Leir.fraJSON(JSON.stringify({ versjon: 2, bygg: [], lager: { tre: 5, betong: 1, stål: 0 } })); ok(g.lager.tre === 5 && g.lager.tømmer === 0, 'gammel lagring får tømmer 0 og beholder plankene');
  ok(Leir.leggInn(L, 'tømmer', 500) === Leir.GRUNNLAGER && Leir.leggInn(L, 'tre', 10) === 10, 'tømmeret har egen lagerplass (som de andre)');
  ok(FolkR.OPPGAVER.includes('maskin') && FolkR.OPPGAVE.maskin, 'oppgaven «maskin» finnes'); }

// sagbruket i full drift: 2 m³ tømmer -> 1,1 planker + 0,7 flis per time
{ const L = leir(), P = P0.ny(); L.lager.tømmer = 40;
  const r = P0.steg(P, L, 60, { kraft: 3 }), s = r.status[1];
  ok(s.går && nær(s.drift, 1) && nær(L.lager.tømmer, 38) && nær(L.lager.tre, 1.1) && nær(L.lager.flis, .7), `full drift i en time: tømmer ${L.lager.tømmer}, planker ${L.lager.tre}, flis ${L.lager.flis}`);
  ok(s.tekst === 'går' && !s.grunn && nær(P.laget.tre, 1.1) && nær(P.brukt.tømmer, 2), 'tellingene: laget og brukt');
  ok(L.bygg[0].hp < 1 && L.bygg[0].hp > .99, `slites litt (hp ${L.bygg[0].hp.toFixed(4)})`);
  // et døgn: 48 m³ tømmer -> ca. 26 m³ planker (planen: «ca. 26 m³ planker av 48 m³ tømmer»)
  const L2 = leir(), P2 = P0.ny(); L2.lager.tømmer = 48; for (let i = 0; i < 24 * 6; i++) P0.steg(P2, L2, 10, { kraft: 3 });
  ok(nær(L2.lager.tre, 26.4, .01) && nær(L2.lager.flis, 16.8, .01) && L2.lager.tømmer < .01, `ett døgn: ${L2.lager.tre.toFixed(1)} m³ planker og ${L2.lager.flis.toFixed(1)} m³ flis av 48 m³ tømmer`); }

// stopper med riktig grunn
{ const L = leir(), P = P0.ny();
  let s = P0.steg(P, L, 60, { kraft: 3 }).status[1]; ok(!s.går && s.grunn === 'tom' && s.tekst === 'tom for tømmer' && nær(P.sto.tom, 1), 'uten tømmer: «tom for tømmer», og timen telles');
  L.lager.tømmer = 10; s = P0.steg(P, L, 60, { kraft: 0 }).status[1]; ok(!s.går && s.grunn === 'folk' && s.tekst === 'ingen folk' && nær(L.lager.tømmer, 10), 'uten folk: «ingen folk», tømmeret blir liggende');
  s = P0.steg(P, L, 60, { kraft: 3, mangler: new Set([1]) }).status[1]; ok(!s.går && s.grunn === 'strøm' && s.tekst === 'uten strøm' && nær(P.sto.strøm, 1), 'uten strøm: «uten strøm»');
  L.lager.tre = Leir.lagerplass(L); s = P0.steg(P, L, 60, { kraft: 3 }).status[1]; ok(!s.går && s.grunn === 'fullt' && s.tekst === 'lageret fullt', 'fullt lager for planker: «lageret fullt»');
  L.lager.tre = 0; L.bygg[0].av = true; s = P0.steg(P, L, 60, { kraft: 3 }).status[1]; ok(s.grunn === 'av', 'slått av'); delete L.bygg[0].av;
  // færre folk: går saktere, og resten av timen står den for «folk»
  const før = P.sto.folk || 0; s = P0.steg(P, L, 60, { kraft: 1.5 }).status[1]; ok(s.går && nær(s.drift, .5) && nær(P.sto.folk - før, .5) && /går 50 % – for få folk/.test(s.tekst), `halvt bemannet: ${s.tekst}`);
  // lite tømmer: bruker det som er og står resten av timen
  const L3 = leir(), P3 = P0.ny(); L3.lager.tømmer = 1; s = P0.steg(P3, L3, 60, { kraft: 3 }).status[1]; ok(s.går && nær(s.drift, .5) && nær(L3.lager.tømmer, 0) && nær(P3.sto.tom, .5), 'halvt med tømmer: halv drift'); }

// kvalitet: snittferdighet over 1,2 gir 10 % mer ut
{ const L = leir(), P = P0.ny(); L.lager.tømmer = 10; const s = P0.steg(P, L, 60, { kraft: 3, ferdighet: 1.3 }).status[1];
  ok(nær(L.lager.tre, 1.21) && nær(L.lager.flis, .77) && nær(L.lager.tømmer, 8) && s.kvalitet, `dyktige folk: ${L.lager.tre.toFixed(2)} m³ planker av 2 m³ tømmer`); }

// slitt: under halv hp går den med halv fart, og grunnen er «slitt»
{ const L = leir(), P = P0.ny(); L.lager.tømmer = 10; L.bygg[0].hp = .4; const s = P0.steg(P, L, 60, { kraft: 3 }).status[1];
  ok(s.går && nær(s.drift, .5) && s.grunn === 'slitt' && /slitt/.test(s.tekst) && nær(P.sto.slitt, .5), `slitt maskin: ${s.tekst}`); }

// strøm til leir.js: en maskin som står, tar ikke strøm (api.hviler); kjelen gir 30 kW (api.maskinKW)
{ const L = leir(['sagbruk', 'aggregat']); L.drivstoff = 100; L.bygg.push({ id: 9, type: 'drivstofftank', igjen: 0, hp: 1, nivå: 1 });
  Leir.hviler = (l, b) => P0.hviler(l, b, 3);
  let s = Leir.steg(L, 1, 0); ok(s.behov === 0, 'sagbruket uten tømmer bruker ikke strøm');
  L.lager.tømmer = 10; s = Leir.steg(L, 1, 0); ok(s.behov === 15 && !s.mangler.has(1), 'med tømmer bruker det 15 kW (aggregatet gir)');
  Leir.maskinKW = () => 30; L.drivstoff = 0; s = Leir.steg(L, 1, 0); ok(s.behov === 15 && !s.mangler.has(1) && s.agg === 0, 'fyrkjelens 30 kW driver saga uten diesel');
  Leir.hviler = null; Leir.maskinKW = null; s = Leir.steg(L, 1, 0); ok(s.mangler.has(1), 'uten kjele og diesel: saga mangler strøm'); }

// fyrkjelen: flis først, så ved; gir 30 kW og varme
{ const L = leir(['fyrkjele']), P = P0.ny(); L.lager.flis = 1; L.lager.ved = 1;
  let r = P0.steg(P, L, 60, { kraft: 1 }); ok(nær(r.kw, 30) && nær(r.varme, 3) && nær(L.lager.flis, 1 - P0.REGLER.maskiner.fyrkjele.inn[0].flis) && nær(L.lager.ved, 1), 'kjelen brenner flis: 30 kW og varme til tre fyringssteder');
  L.lager.flis = 0; r = P0.steg(P, L, 60, { kraft: 1 }); ok(nær(r.kw, 30) && nær(L.lager.ved, 1 - P0.REGLER.maskiner.fyrkjele.inn[1].ved), 'tom for flis: brenner ved');
  L.lager.ved = 0; r = P0.steg(P, L, 60, { kraft: 1 }); ok(r.kw === 0 && r.status[1].tekst === 'tom for brensel', 'tom for brensel');
  ok(nær(P0.varmeAndel(3, 2), 1) && nær(P0.varmeAndel(1.5, 3), .5) && P0.varmeAndel(3, 0) === 0, 'varmeAndel'); }

// vedkløyveren og folkefordelingen: fyrkjelen først, så sagbruket
{ const L = leir(['vedkløyver', 'sagbruk', 'fyrkjele']), P = P0.ny(); L.lager.flis = 10; L.lager.tømmer = 10;
  const r = P0.steg(P, L, 60, { kraft: 4 }); const [v, s, k] = [r.status[1], r.status[2], r.status[3]];
  ok(k.går && s.går && !v.går && v.grunn === 'folk', `fire folk: kjele og sag går, kløyveren står (${v.tekst})`);
  const r2 = P0.steg(P, L, 60, { kraft: 5 }); ok(r2.status[1].går && nær(r2.status[1].ut.ved, .5), 'fem folk: kløyveren lager 0,5 m³ ved'); }

// folk.js: kjelens varme erstatter ved og diesel
{ const F = FolkR.ny(5), L = Leir.ny(); L.drivstoff = 1000; L.bygg.push({ id: 1, type: 'brakke', igjen: 0, hp: 1, nivå: 1 });
  const før = L.drivstoff; FolkR.steg(F, L, 60, { årstid: 'vinter' }); const brukt = før - L.drivstoff;
  FolkR.varmeAndel = () => 1; const f2 = L.drivstoff; FolkR.steg(F, L, 60, { årstid: 'vinter' }); const brukt2 = f2 - L.drivstoff;
  L.lager.ved = 5; FolkR.varmeAndel = null; const f3 = L.drivstoff; FolkR.steg(F, L, 60, { årstid: 'vinter' }); const brukt3 = f3 - L.drivstoff;
  ok(brukt > 0 && brukt2 === 0 && brukt3 === 0 && L.lager.ved < 5, `vinter: diesel ${brukt.toFixed(1)} l uten kjele, 0 med kjele, 0 med ved (ved brukt ${(5 - L.lager.ved).toFixed(3)} m³)`); }

// jobbtavla: maskinjobben får plasser fra kroken
{ const F = FolkR.ny(3), L = leir(['sagbruk']);
  ok(Jobber.lag(F, L).find(j => j.type === 'maskin').ingen, 'uten kroken: «ingen maskiner»');
  Jobber.maskiner = () => ({ plasser: 3, hva: ['Driv sagbruk'] }); const j = Jobber.lag(F, L).find(q => q.type === 'maskin');
  ok(j.plasser === 3 && j.hva[0] === 'Driv sagbruk', 'med kroken: tre plasser'); Jobber.maskiner = null; }

// tekstene
ok(P0.oppskrift('sagbruk') === '2 m³ tømmer → 1,1 m³ planker + 0,7 m³ flis per time', P0.oppskrift('sagbruk'));
ok(P0.merke('sagbruk', { går: true, drift: 1 }) === '1,1 m³/t' && P0.merke('fyrkjele', { går: true, drift: 1 }) === '30 kW' && P0.merke('sagbruk', null) === '0 m³/t', 'merket i kartet');
{ const P = P0.ny(); P.laget.tre = 1; P.sto.tom = 2; const Q = P0.fraJSON(JSON.parse(JSON.stringify(P))); ok(Q.laget.tre === 1 && Q.sto.tom === 2 && P0.fraJSON({ versjon: 7 }).gikk === 0, 'lagring'); }
ok(P0.verdi({ laget: { tre: 1.1, flis: .7 }, brukt: { tømmer: 2 } }, Leir.MATERIALER) === Math.round(1.1 * Leir.MATERIALER.tre.pris + .7 * Leir.MATERIALER.flis.pris - 2 * Leir.MATERIALER.tømmer.pris), 'verdien av det som er laget');
// (ut4-balanse2) varselet før kjøpet: saga med kjele første dag (ca. 17 mill. i kassa, leiren bruker ca. 0,5 mill. i døgnet) gir varsel med
// teksten spilleren ser; med 40 mill. og en inntekt ikke; uten kjele når strømmen rekker blir det billigere; ukjent bygg gir null
{ const V = P0.driftVarsel('sagbruk', { kasse: 17e6, kost: 7.7e6, kjeleKost: 4.8e6, perDøgn: 5e5, inntekt: 0 });
  ok(V && V.varsel && V.kost === 12.5e6 && /fyrkjele/.test(V.tekst) && /Ta kontrakter først/.test(V.tekst) && /vent til dere har/.test(V.tekst), 'varsel: saga med kjele uten inntekt – ' + (V && V.tekst));
  const U = P0.driftVarsel('sagbruk', { kasse: 40e6, kost: 7.7e6, kjeleKost: 4.8e6, perDøgn: 5e5, inntekt: 2e6 });
  ok(U && !U.varsel && !/vent til/.test(U.tekst), 'ikke varsel med nok penger – ' + (U && U.tekst));
  const K = P0.driftVarsel('sagbruk', { kasse: 17e6, kost: 7.7e6, kjeleKost: 0, perDøgn: 5e5, inntekt: 1e6 });
  ok(K && K.kost === 7.7e6 && K.drift < V.drift && !/fyrkjele/.test(K.tekst), 'uten kjele: bare saga');
  ok(V.trengs === P0.REGLER.varsel.døgn * (5e5 + V.drift) && V.etter === 17e6 - 12.5e6, 'varselet regner kassa etter kjøpet mot døgnene med drift');
  ok(P0.driftVarsel('brakke', { kasse: 1 }) === null && P0.driftVarsel('vedkløyver', { kasse: 1e8, kost: 1e6, perDøgn: 1e5, inntekt: 1 }).varsel === false, 'bare maskinene, og vedkløyveren med mye penger uten varsel'); }

// (ut8-kr-saga) det som faktisk ble laget siste døgn: et helt døgn, et døgn der saga sto, og en maskin som kom midt på dagen
{ const PP = require('../../site/dovre-fliser/spill/produksjon.js'), Q = PP.ny(), gå = (P, a, b) => { for (let t = a; t <= b; t += 60) PP.døgnTell(P, t); PP.døgnTell(P, b); };
  gå(Q, 100, 1400); Q.laget.tre = 10; gå(Q, 1400, 1445); ok(Q.døgn.iGår && Math.abs(Q.døgn.iGår.tre - 10 * 24 / ((1440 - 100) / 60)) < 1e-6, 'døgnet etter: regnet opp fra 22,3 t');
  Q.laget.tre = 36.4; gå(Q, 1445, 2881); ok(Math.abs(Q.døgn.iGår.tre - 26.4) < 1e-6, 'helt døgn: 26,4 m³');
  gå(Q, 2881, 4321); ok(Q.døgn.iGår.tre === 0, 'saga sto et døgn: 0');
  PP.døgnTell(Q, 4320 * 3); ok(Q.døgn.iGår === null, 'hoppet over døgn: ukjent');
  const R3 = PP.ny(); PP.døgnTell(R3, 0); PP.døgnTell(R3, 2083); ok(R3.døgn.iGår === null, 'klokka hoppet (spillet lastet): ukjent, ikke «laget ingenting»');
  const R2 = PP.ny(); gå(R2, 1400, 1450); ok(R2.døgn.iGår === null, 'under seks timer: ukjent');
  ok(PP.fraJSON(JSON.parse(JSON.stringify({ ...Q, versjon: 1 }))).døgn.d === Q.døgn.d, 'døgnet lagres'); }

console.log(feil ? `${feil} FEIL` : 'Alle testene for produksjon.js er ok'); process.exit(feil ? 1 : 0);
