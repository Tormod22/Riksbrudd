// Test av spill/forsvar-oppgjor.js (runde 5): døgnoppgjøret om morgenen (node pipeline/fliser/test_forsvar_oppgjor.js)
const O = require('../../site/dovre-fliser/spill/forsvar-oppgjor.js');
let feil = 0; const ok = (b, t, x) => { if (!b) { feil++; console.log('FEIL:', t, x || ''); } else console.log('ok  ', t, x ? '– ' + x : ''); };
const før = { bølge: 2, aktiv: 0, herjet: 0, friske: 8, såret: 0, falne: 0, slåttUt: 0, bygg: [{ id: 1, navn: 'Brakke', hp: .4 }, { id: 2, navn: 'Aggregat', hp: 1 }, { id: 3, navn: 'Vakttårn', hp: 1 }, { id: 4, navn: 'Lagertelt', hp: 1 }], hus: 3, folk: 6, mat: 30, matDøgn: 5 };
const rolig = O.tekst(før, { ...før });
ok(rolig.hendte === 0 && /rolig døgn/.test(rolig.tekst), 'ingenting skjedde', rolig.tekst);
const nå = { bølge: 3, aktiv: 0, herjet: 0, friske: 5, såret: 2, falne: 1, slåttUt: 1, bygg: [{ id: 2, navn: 'Aggregat', hp: .7 }, { id: 3, navn: 'Vakttårn', hp: 1 }], hus: 5, folk: 5, mat: 12, matDøgn: 1.5 };
const r = O.tekst(før, nå);
ok(/^Siste døgn: Bølge 3 slått tilbake/.test(r.tekst), 'bølgen slått tilbake', r.tekst);
ok(/2 nye sårede, 1 falt/.test(r.tekst) && /Ett lag er slått ut/.test(r.tekst), 'sårede, falne og lag');
ok(/Brakke ødelagt/.test(r.tekst) && !/Lagertelt/.test(r.tekst) && /1 bygg skadet/.test(r.tekst), 'brakka (skadet før) ødelagt, lagerteltet (helt) revet nevnes ikke, aggregatet skadet');
ok(/2 hus gjennomsøkt/.test(r.tekst) && /1 har forlatt leiren/.test(r.tekst), 'hus og folk');
ok(/Mat til 1,5 døgn – kjøp eller skaff mat/.test(r.tekst), 'maten med råd når den er lav');
const h = O.tekst({ ...før, bølge: 3, aktiv: 3 }, { ...før, bølge: 4, aktiv: 4, herjet: 1, matDøgn: null });
ok(/kom seg unna – de herjet i leiren eller fikk gjort sabotasje/.test(h.tekst) && /Bølge 4 pågår/.test(h.tekst) && !/slått tilbake/.test(h.tekst) && !/Mat til/.test(h.tekst), 'herjet, ny bølge pågår, uten mat (dagboka har den)', h.tekst);
// (runde 12) herjet og sabotasje hver for seg når bildene har «slapp»
const hs = O.tekst({ ...før, slapp: 0 }, { ...før, bølge: 4, herjet: 2, slapp: 1 });
ok(/Røverne kom inn i leiren og dro med bytte/.test(hs.tekst) && /Sabotører gjorde skade og slapp unna/.test(hs.tekst) && !/herjet eller/.test(hs.tekst), 'herjet og sabotasje skilt', hs.tekst);
// (runde 12) hvem som dro og hvorfor
const fN = { ...før, navn: ['Håkon Rønning', 'Silje Berg', 'Per Lie', 'Ola Dahl', 'Eva Moe'], borte: 0 };
const nN = { ...før, navn: ['Eva Moe', 'Nina Ås'], borte: 1, tropp: { 'Per Lie': 'Stormtropp 1' }, døde: { 'Håkon Rønning': 'falt', 'Silje Berg': 'falt' } };
const fr = O.tekst(fN, nN);
ok(/Per Lie gikk inn i Stormtropp 1/.test(fr.tekst) && /Håkon Rønning og Silje Berg falt/.test(fr.tekst) && /Ola Dahl forlot gjengen fordi moralen var for lav/.test(fr.tekst) && /Nina Ås er ny i gjengen/.test(fr.tekst) && !/har dratt/.test(fr.tekst), 'navn og grunn', fr.tekst);
// (kritikerløkka r2) borte uten at moraltelleren gikk opp: ikke «forlot gjengen»
{ const f2 = O.tekst({ ...fN, borte: 3 }, { ...nN, borte: 3 }); ok(/Ola Dahl er ikke lenger i leiren/.test(f2.tekst) && !/forlot/.test(f2.tekst), 'borte uten lav moral: ingen «forlot gjengen»', f2.tekst);
  const f3 = O.tekst({ ...fN, navn: [...fN.navn, 'Kåre Sand'] }, nN); ok(/Ola Dahl og Kåre Sand er ikke lenger i leiren \(én av dem forlot gjengen fordi moralen var for lav\)/.test(f3.tekst), 'to borte, én av lav moral', f3.tekst); }
ok(O.tekst(null, nå) === null, 'uten bilde fra i går: ingenting');
// (runde 13, kritiker G) kampene siste døgn med hvem og hvor
{ const O2 = require('../../site/dovre-fliser/spill/forsvar-oppgjor'), A2 = require('assert');
  const før = { bølge: 0, aktiv: 0, falne: 0, slåttUt: 0, tid: 1000 }, nå = { bølge: 0, aktiv: 0, falne: 4, slåttUt: 1, tid: 2440, kamper: [{ lag: 'Speidertropp 1', fiende: 'bygdevernet', sted: 'i Lærdalsøyri', falne: 4, slått: true, start: 1200 }, { lag: 'Gammel', fiende: 'røverne', falne: 1, slått: false, start: 500 }] };
  const t = O2.tekst(før, nå).tekst; A2.ok(/Speidertropp 1 ble slått ut i kamp med bygdevernet i Lærdalsøyri/.test(t), t); A2.ok(!/ett lag er slått ut/i.test(t), 'ikke to ganger'); A2.ok(!/Gammel/.test(t), 'bare siste døgn');
  console.log('ok   oppgjøret sier hvem lagene kjempet mot (runde 13)'); }
// (ut8-kr-krig, Ingrid 28. nov) morgenrapporten tar ikke med folk som gikk inn i en tropp (spilleren gjorde det selv)
{ const O2 = require('../../site/dovre-fliser/spill/forsvar-oppgjor.js'), før = { navn: ['Hanne Dahl', 'Per Lie'], tid: 0 }, nå = { navn: ['Per Lie'], tropp: { 'Hanne Dahl': 'Speidertropp 1' }, tid: 1440 };
  const a = O2.tekst(før, nå), b = O2.tekst(før, nå, { utenTropp: true });
  if (!/gikk inn i Speidertropp 1/.test(a.tekst) || /Speidertropp|ikke lenger/.test(b.tekst)) { console.error('FEIL utenTropp:', a.tekst, '|', b.tekst); process.exit(1); }
  console.log('ok   utenTropp: ' + b.tekst); }
console.log(feil ? `${feil} FEIL` : 'alle tester ok'); process.exit(feil ? 1 : 0);
