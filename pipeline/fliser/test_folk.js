// Test for spill/folk.js (leirens folk, oppgaver, behov og byggelag): node pipeline/fliser/test_folk.js
const L0 = require('../../site/dovre-fliser/spill/leir.js');
const F0 = require('../../site/dovre-fliser/spill/folk.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
let penger = 300e6; const betal = p => (p <= penger ? (penger -= p, true) : false);
const fyll = L => { for (const k of ['tre', 'betong', 'stål']) L0.kjøpMateriale(L, k, 1000, betal); };
// et ferdig bygg (materialene fylles på først)
const sett = (L, type, x, y = 0) => { fyll(L); const r = L0.bygg(L, { type, x, y }, betal); if (!r.bygg) throw new Error(type + ': ' + r.feil); r.bygg.igjen = 0; return r.bygg; };
const døgn = (F, L, n, o = {}) => { const H = []; for (let i = 0; i < n * 24; i++) H.push(...F0.steg(F, L, 60, { årstid: 'sommer', ...o }).hendelser); return H; };

// startgjengen: ti personer med ulike navn og yrker, fordelt på oppgavene
const F = F0.ny(), navn = new Set(F.personer.map(p => p.navn));
ok(F.personer.length === 10 && navn.size === 10, 'ti personer med ulike navn: ' + [...navn].slice(0, 4).join(', ') + ' …');
ok(F0.arbeidere(F, 'bygg') === 4 && F0.arbeidere(F, 'kjøkken') === 1 && F0.arbeidere(F, 'vakt') === 1 && F0.arbeidere(F, 'fri') === 2, 'start: 4 bygg, 1 kjøkken, 1 vakt, 2 fri');
ok(F.personer.find(p => p.oppgave === 'kjøkken').yrke === 'kokk' && F.personer.find(p => p.oppgave === 'vakt').yrke === 'tidligere soldat', 'kokken på kjøkkenet, soldaten på vakt');
ok(JSON.stringify(F0.ny()) === JSON.stringify(F0.ny()), 'samme frø gir samme folk');
ok(F0.OPPGAVER.join() === 'bygg,hogst,riving,frakt,vakt,kjøkken,stell,verksted,fri', 'oppgavene i avtalt rekkefølge');
// byggelag: to personer = ett lag, og de ersatter «ett + ett per brakke» i leir.js
const L = L0.ny(); fyll(L);
ok(L0.byggelag(L) === 1, 'leir uten folk: ett byggelag som før');
L.folk = F; ok(L0.byggelag(L) === 2, 'fire på bygg: to byggelag');
F0.minus(F, 'bygg'); ok(L0.byggelag(L) === 2 && Math.abs(F0.byggTempo(F) - F0.tempo(F, 'bygg') * 3 / 4) < 1e-9, 'tre på bygg: to lag, det ene halvt (tempo × 3/4)');
while (F0.arbeidere(F, 'bygg')) F0.minus(F, 'bygg');
const kr = L0.bygg(L, { type: 'kontrollrom', x: 0, y: 0 }, betal).bygg; L0.steg(L, 60);
ok(L0.byggelag(L) === 0 && kr.igjen === kr.totalt, 'ingen på bygg: ingen byggelag, ingenting bygges');
for (let i = 0; i < 4; i++) F0.pluss(F, 'bygg');
ok(F0.arbeidere(F, 'bygg') === 4 && F0.arbeidere(F, 'fri') === 2, '+ tar de frie først');
F0.pluss(F, 'bygg'); F0.pluss(F, 'bygg'); const pl = F0.pluss(F, 'stell');
ok(pl && pl.oppgave === 'stell' && F0.arbeidere(F, 'bygg') === 5 && F0.arbeidere(F, 'fri') === 0, '+ uten frie: fra oppgaven med flest folk (bygg)');
F0.minus(F, 'stell'); F0.minus(F, 'bygg'); F0.minus(F, 'bygg'); F0.pluss(F, 'fri'); ok(F0.arbeidere(F, 'bygg') === 2 && F0.arbeidere(F, 'fri') === 4, '+ på «fri»: én fra oppgaven med flest folk får fri');
F0.minus(F, 'fri'); F0.minus(F, 'fri');
const t0 = kr.igjen; L0.steg(L, 60); const brukt = t0 - kr.igjen;
ok(Math.abs(brukt - 60 * F0.byggTempo(F)) < 1e-6 && brukt > 30 && brukt < 90, `arbeidstempoet ganges inn (ferdighet og moral): ${brukt.toFixed(1)} av 60 min`);
// moral: høy moral gir raskere arbeid
const F2 = JSON.parse(JSON.stringify(F)); F2.moral = 95; F.moral = 20; ok(F0.tempo(F2, 'bygg') > F0.tempo(F, 'bygg') * 1.3, 'høy moral gir raskere arbeid enn lav');
F.moral = 60;
// tempo for oppgave uten folk er 0, og alt holder seg i 0–1,5
ok(F0.tempo(F, 'riving') === 0 && F0.OPPGAVER.every(o => { const t = F0.tempo(F, o); return t >= 0 && t <= 1.5; }), 'tempo 0 uten folk, ellers 0–1,5');

// behov: uten senger, mat og varme går moralen ned; med brakker, kjøkken og mat går den opp
{ const L = L0.ny(); fyll(L); L.folk = F0.ny(); const F = L.folk;
  døgn(F, L, 1); const B0 = F.sist; ok(B0.utenSeng === 10 && F.moral < 60, `uten brakker sover alle i telt: moral ${F.moral.toFixed(0)}`);
  for (const [t, x] of [['brakke', 0], ['brakke', 20], ['kjøkken', 40], ['aggregat', 60], ['drivstofftank', 80]]) sett(L, t, x);
  L0.kjøpDrivstoff(L, 4000, betal); fyll(L);
  const s = L0.steg(L, 1); ok(L0.plasser(L) === 16 && !s.mangler.size, 'to brakker: 16 senger, kjøkkenet har strøm');
  for (let i = 0; i < 48; i++) { L0.steg(L, 60); F0.steg(F, L, 60, { årstid: 'sommer', mangler: L0.steg(L, 0).mangler }); }
  ok(F.sist.utenSeng === 0 && F.sist.varmMat && F.moral > 66, `senger og varm mat: moral ${F.moral.toFixed(0)} (mål ${F.mål.toFixed(0)})`);
  F.mat = 50; const mat0 = F.mat; døgn(F, L, 1); ok(Math.abs(mat0 - F.mat - 10 * .85) < .2, `kjøkkenet sparer mat: ${(mat0 - F.mat).toFixed(1)} rasjoner på et døgn for ti`);
  // tom for mat: sult, helsa og moralen faller
  F.mat = 0; const h = døgn(F, L, 2); ok(F.sist.sult && F.moral < 40 && F.personer.every(p => p.helse < 1) && h.some(t => /tom for mat/.test(t)), `sult: moral ${F.moral.toFixed(0)}, helse ${F.personer[0].helse.toFixed(2)}`);
  const kj = F0.kjøpMat(F, 100, betal); ok(kj.pris === 3e5 && F.mat === 100, 'kjøpe 100 rasjoner for 300 000 kr');
  // vinter: fyringen bruker ved fra lageret, så drivstoff
  const tre0 = L.lager.tre; døgn(F, L, 1, { årstid: 'vinter' }); ok(Math.abs(tre0 - L.lager.tre - 2 * .5) < 1e-6 && !F.sist.kald, `vinter: fyringen bruker ${(tre0 - L.lager.tre).toFixed(1)} m³ ved per døgn for ti`);
  L.lager.tre = 0; const d0 = L.drivstoff; døgn(F, L, 1, { årstid: 'vinter' }); ok(Math.abs(d0 - L.drivstoff - 100) < 1e-6 && !F.sist.kald, 'uten ved: 100 l drivstoff per døgn');
  L.drivstoff = 0; const hk = døgn(F, L, 1, { årstid: 'vinter' }); ok(F.sist.kald > .9 && hk.some(t => /fryser/.test(t)), 'uten ved og drivstoff: folk fryser');
  // rekruttering: ledig seng og grei moral
  F.moral = 70; const rk = F0.rekrutter(F, L, betal); ok(rk.person && F.personer.length === 11 && rk.pris === 5e5, 'rekruttering: ny person for 500 000 kr når det er ledig seng');
  while (F.personer.length < 16) { F.moral = 70; F0.rekrutter(F, L, betal); }
  ok(/seng/.test(F0.rekrutter(F, L, betal).feil), 'fulle brakker: ingen flere rekrutter');
}
// helse: sykestue og stell leger raskere enn hvile alene
{ const lag = (sykestue) => { const L = L0.ny(); fyll(L); L.folk = F0.ny(); for (const p of L.folk.personer) p.helse = .5; L.folk.mat = 999;
    for (const p of L.folk.personer.slice(0, 2)) p.oppgave = 'stell';
    if (sykestue) { sett(L, 'sykestue', 0); sett(L, 'aggregat', 30); sett(L, 'drivstofftank', 60); L0.kjøpDrivstoff(L, 3000, betal); }
    for (let i = 0; i < 24; i++) { const s = L0.steg(L, 60); F0.steg(L.folk, L, 60, { årstid: 'sommer', mangler: s.mangler }); }
    return L.folk.personer.slice(2).reduce((s, p) => s + p.helse, 0) / 8; };
  const med = lag(true), uten = lag(false); ok(med > uten + .05 && med > .6, `sykestue + to på stell: helse ${med.toFixed(2)} etter et døgn (uten sykestue ${uten.toFixed(2)})`);
}
// syke kan ikke arbeide
{ const F = F0.ny(); const p = F.personer.find(q => q.oppgave === 'bygg'); p.helse = .2; ok(F0.arbeidere(F, 'bygg') === 3, 'en syk på bygg teller ikke som arbeider'); }
// lav moral et helt døgn: én forlater gjengen
{ const L = L0.ny(); L.folk = F0.ny(); const F = L.folk; F.mat = 0; F.moral = 10;
  const H = døgn(F, L, 1.1); ok(F.personer.length === 9 && F.borte === 1 && H.some(t => /forlatt gjengen/.test(t)), 'moral under 25 et døgn: én forlater gjengen'); }
// verkstedet: reparerer skadde bygg, ellers stål
{ const L = L0.ny(); fyll(L); L.folk = F0.ny(); const F = L.folk; F.mat = 999;
  sett(L, 'verksted', 0); sett(L, 'aggregat', 30); sett(L, 'drivstofftank', 60); L0.kjøpDrivstoff(L, 3000, betal);
  const br = sett(L, 'brakke', 0, 40); br.hp = .5;
  F.personer.slice(0, 2).forEach(p => { p.oppgave = 'verksted'; });
  for (let i = 0; i < 24; i++) { const s = L0.steg(L, 60); F0.steg(F, L, 60, { årstid: 'sommer', mangler: s.mangler }); }
  ok(br.hp > .7, `verkstedet reparerer brakka: ${Math.round(br.hp * 100)} % helt etter et døgn`);
  br.hp = 1; L.lager.stål = 0; for (let i = 0; i < 24; i++) { const s = L0.steg(L, 60); F0.steg(F, L, 60, { årstid: 'sommer', mangler: s.mangler }); }
  ok(L.lager.stål > .5, `ingenting å reparere: verkstedet lager ${L.lager.stål.toFixed(1)} t stål av skrap per døgn`);
  const L2 = L0.ny(); L2.folk = F0.ny(); L2.folk.personer[0].oppgave = 'verksted'; L2.lager.stål = 0; F0.steg(L2.folk, L2, 600, {}); ok(L2.lager.stål === 0, 'uten verksted: ingen produksjon'); }
// forsvar: vakttårn bemannes av vaktene
{ const L = L0.ny(); fyll(L); L.folk = F0.ny(); for (const x of [0, 20]) sett(L, 'vakttårn', x);
  ok(F0.forsvar(L.folk, L).tårn.length === 1, 'to tårn og én vakt: ett tårn bemannet'); F0.pluss(L.folk, 'vakt'); ok(F0.forsvar(L.folk, L).tårn.length === 2 && F0.forsvar(L.folk, L).varsling > 400, 'to vakter: begge tårnene bemannet'); }
// kjøkkenet er et nytt bygg i leiren
ok(L0.BYGG.kjøkken && L0.kostnad('kjøkken').pris === 3e6 && L0.PRIORITET.includes('kjøkken'), 'kjøkken finnes i Leir.BYGG (3 mill. kr) og i strømprioriteten');
// lagring: leiren med folk lagres og leses inn igjen; gammel leir uten folk virker som før
{ const L = L0.ny(); L.folk = F0.ny(); L.folk.personer[0].oppgave = 'riving'; const L2 = L0.fraJSON(L0.tilJSON(L)), F2 = F0.fraJSON(L2.folk);
  ok(F2 && F2.personer.length === 10 && F2.personer[0].oppgave === 'riving' && L0.byggelag(L2) === 2, 'folket lagres med leiren («riksbrudd-k2»)');
  const gammel = L0.fraJSON(JSON.stringify({ versjon: 2, bygg: [], neste: 1 })); ok(gammel && !gammel.folk && L0.byggelag(gammel) === 1, 'gammel leir uten folk: lastes, ett byggelag');
  ok(F0.fraJSON({ personer: [{ id: 3, navn: 'Ola Test', oppgave: 'ukjent' }] }).personer[0].oppgave === 'fri', 'ukjent oppgave i lagringen blir «fri»'); }
console.log(feil ? `${feil} FEIL` : 'Alle testene for folk.js er ok');
process.exit(feil ? 1 : 0);
