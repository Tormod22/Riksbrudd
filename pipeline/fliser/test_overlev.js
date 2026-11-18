// Test av reglene i spill/overlev.js: ferdigheter, tilfluktssteder og forfallet.
const { Ferdigheter: F, Tilflukt: T, Forfall: D } = require('../../site/dovre-fliser/spill/overlev.js'); let feil = 0;
const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
{ const f = F.ny(); ok(F.nivå(0).n === 0 && F.øk(f, 'skyting', 39) === 0 && F.øk(f, 'skyting', 1) === 1 && F.nivå(f.skyting).n === 1, 'ferdighet: 40 poeng gir nivå 1');
  ok(F.kreves(2) > F.kreves(1) * 2 && F.kreves(10) > 1000, 'hvert nivå krever mer enn det forrige');
  f.styrke = 1e9; ok(F.nivå(f.styrke).n === 10 && F.nivå(f.styrke).andel === 1 && F.kg(f) === 30, 'høyst nivå 10 (styrke: 20 kg mer + 10 kg «Pakkesel»)');
  ok(F.treff(f) === 1.04 && F.løp(f) === 1 && F.letetid(f) === 1 && F.øk(f, 'tull', 5) === 0 && F.øk(f, 'leting', -3) === 0, 'virkningene følger nivået; ukjent ferdighet og negative poeng gir ingenting');
  const g = F.ny(); let nivåer = 0; for (let i = 0; i < 400; i++) if (F.øk(g, 'leting', 14)) nivåer++; ok(nivåer === F.nivå(g.leting).n && F.letetid(g) < 1 && F.letetid(g) >= .4, `400 hus gir leting nivå ${nivåer} (leter ${Math.round((1 - F.letetid(g)) * 100)} % fortere)`); }
{ const t = []; ok(T.kan(t, 5, 3) === null && /3 m³/.test(T.kan(t, 5, 2)), 'tilflukt: krever 3 m³ tre'); t.push({ i: 5, x: 0, y: 0 }); ok(/alt sikret/.test(T.kan(t, 5, 9)), 'samme hus kan ikke sikres to ganger');
  for (let i = 0; i < 5; i++) t.push({ i: 10 + i, x: 100 * i, y: 50 }); ok(/6 tilfluktssteder/.test(T.kan(t, 99, 9)), 'høyst seks'); const n = T.nærmeste(t, 310, 60); ok(n.i === 13 && Math.abs(n.meter - 14.1) < .1 && T.nærmeste([], 0, 0) === null, 'nærmeste tilfluktssted'); }
{ const s = D.ny(0, .5, .5); ok(D.nettKW(s) === 5 && D.moral(s, 0) === 0 && D.steg(s, 100, 10).length === 0, 'forfall: i starten virker nettet og vannet');
  const v1 = D.steg(s, 3 * 1440 + 10, 10); ok(v1.join() === 'strøm-varsel' && !s.strøm.nede, 'varsel et døgn før strømmen går'); ok(D.steg(s, 3 * 1440 + 20, 20).length === 0, 'varselet kommer én gang');
  const v2 = D.steg(s, 4 * 1440 + 5, 30); ok(v2.join() === 'strøm-nede' && D.nettKW(s) === 0, 'strømnettet går ned etter fire døgn');
  const v3 = D.steg(s, 4 * 1440 + 6, 65 * 60); ok(v3.join() === 'vann-nede' && D.moral(s, 0) === -15 && D.moral(s, 1) === 0, 'vannet svikter også etter ekte spilletid; uten brønn faller moralen, med brønn ikke');
  ok(D.igjen(s.vann, 0, 0) === 'nede' && /døgn til|min spilling til/.test(D.igjen(D.ny(0).strøm, 0, 0)), 'teksten sier hvor lenge det er igjen'); }
// flere trinn (18. nov): mobilnettet, butikkene og vegene – med varsel i forkant
{ const s = D.ny(0, .5, .5); s.mer = D.nyMer(0, 0, () => .5);
  ok(Object.keys(s.mer).join() === 'mobil,butikk,veg' && D.stegMer(s, 100, 10).length === 0 && D.moralMer(s, 0) === 0, 'forfall: mobilnett, butikker og veger virker i starten');
  ok(D.stegMer(s, 4 * 1440 + 10, 10).join() === 'mobil-varsel' && D.stegMer(s, 5 * 1440 + 10, 20).join() === 'mobil-nede', 'mobilnettet: varsel et døgn før, så dødt');
  ok(D.moralMer(s, 0) === -5 && D.moralMer(s, 1) === 0, 'uten radiomast faller moralen, med radiomast ikke');
  const h = D.stegMer(s, 5 * 1440 + 20, 200 * 60); ok(h.join() === 'butikk-nede,veg-nede' && D.nedeMer(s, 'butikk') && D.nedeMer(s, 'veg'), 'butikkene og vegene svikter også etter ekte spilletid');
  ok(D.steg(s, 100, 10).length === 0 && !s.strøm.nede, 'de nye trinnene rører ikke strøm og vann'); ok(D.stegMer({}, 0, 0).length === 0, 'gamle lagringer uten de nye trinnene tåles'); }
console.log(feil ? feil + ' feil' : 'alle overlevelsestestene ok'); process.exit(feil ? 1 : 0);
