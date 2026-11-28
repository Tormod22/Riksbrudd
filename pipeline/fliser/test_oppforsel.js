// Test av reglene for oppførsel (site/dovre-fliser/spill/oppforsel.js). Kjør: node pipeline/fliser/test_oppforsel.js
const OP = require('../../site/dovre-fliser/spill/oppforsel.js');
const RK = require('../../site/dovre-fliser/spill/rekruttering.js');
let feil = 0; const ok = (b, t) => { if (!b) feil++; console.log((b ? 'ok   ' : 'FEIL ') + t); };
const R = OP.REGLER;
const person = (id, o = {}) => ({ id, navn: 'Person ' + id, alder: 35, oppgave: 'bygg', helse: 1, ferd: { bygg: 1 }, lojal: .6, seng: true, ...o });

// 1 egenskaper: faste, 1–2, aldri flittig+lat / modig+redd, og bare for dem uten liste
{ const F = { personer: Array.from({ length: 200 }, (_, i) => person(i + 1)) };
  F.personer[0].egen = ['flittig']; F.personer[1].egen = [];
  const n = OP.giEgenskaper(F);
  ok(n === 198, 'egenskaper gis bare dem uten liste (' + n + ')');
  ok(F.personer[0].egen.join() === 'flittig' && F.personer[1].egen.length === 0, 'eksisterende lister røres ikke');
  const alle = F.personer.slice(2);
  ok(alle.every(p => p.egen.length >= 1 && p.egen.length <= 2), 'alle får 1–2');
  ok(alle.every(p => !(p.egen.includes('flittig') && p.egen.includes('lat')) && !(p.egen.includes('modig') && p.egen.includes('redd'))), 'ingen motsatte par');
  const to = alle.filter(p => p.egen.length === 2).length / alle.length; ok(to > .15 && to < .4, 'ca. 30 % har to (' + Math.round(to * 100) + ' %)');
  ok(JSON.stringify(OP.egenFor(person(7))) === JSON.stringify(OP.egenFor(person(7))), 'fast per person');
  const typer = new Set(alle.flatMap(p => p.egen)); ok(['lat', 'redd', 'ryddig', 'pratsom'].every(e => typer.has(e)), 'de nye egenskapene deles ut');
  ok(['lat', 'redd', 'ryddig', 'pratsom'].every(e => RK.EGENSKAPER[e]), 'rekruttering.js kjenner de nye');
  ok(RK.personF({ egen: ['lat'] }, 'bygg', 12) < 1 && RK.personF({ egen: ['redd'] }, 'vakt', 12) < 1 && RK.personF({ egen: ['redd'] }, 'bygg', 12) === 1, 'lat og redd i tempoet');
  ok(RK.krav({ ferd: { bygg: 1 }, egen: ['lat', 'redd'] }) === RK.krav({ ferd: { bygg: 1 }, egen: [] }) && RK.krav({ ferd: { bygg: 1 }, egen: ['flittig'] }) > RK.krav({ ferd: { bygg: 1 }, egen: [] }), 'trøbbel-egenskaper hever ikke lønnskravet'); }

// 2 venner og uvenner over tid
{ const S = OP.ny(), F = { personer: Array.from({ length: 12 }, (_, i) => person(i + 1)) };
  let H = []; for (let t = 0; t < 60; t++) H.push(...OP.vennSteg(S, F, p => 'j:' + p.oppgave, 60));
  const v = H.filter(h => h.type === 'venn').length, u = H.filter(h => h.type === 'uvenn').length;
  ok(v > 30, 'folk på samme jobb blir venner (' + v + ' par)'); ok(u >= 1, 'noen blir uvenner (' + u + ' par)');
  const ui = Object.keys(S.rel).filter(k => S.rel[k] <= R.venner.uvenn).length; ok(ui === u, 'uvenner = par med dårlig kjemi');
  const m = OP.moral(S, F, p => 'j:' + p.oppgave, { tid: 0 }); ok(m.venn > 0 && m.uvenn < 0, 'venner gir moral, uvenner trekker (' + m.venn.toFixed(1) + ' / ' + m.uvenn.toFixed(1) + ')');
  const S2 = OP.ny(); const m0 = OP.moral(S2, F, p => 'j:' + p.oppgave, { tid: 0 }); ok(m0.sum === 0, 'uten venner: 0');
  const m1 = OP.moral(S2, F, p => 'j:' + p.oppgave, { tid: 0, samling: 'bålplass' }); ok(m1.fritid >= R.moral.fritid, 'samlingssted gir fritidsmoral');
  // ulike jobber blir ikke venner
  const S3 = OP.ny(), F3 = { personer: [person(1, { oppgave: 'bygg' }), person(2, { oppgave: 'hogst' })] }; OP.vennSteg(S3, F3, p => 'j:' + p.oppgave, 6000); ok(!OP.rel(S3, 1, 2), 'ulike jobber: ingen relasjon');
  const venn = F.personer.find(p => OP.venner(S, F, p.id).length >= 2); ok(venn && OP.lokkF(S, F, venn) < .5, 'venner gir mindre lokking');
  const uv = F.personer.find(p => OP.uvenner(S, F, p.id).length); ok(uv && OP.uvennTempo(S, F, uv) < 1, 'uvenn på samme jobb gir lavere tempo'); }

// 3 tilflukt: barn og gamle først, redde ved fjern alarm, vakter til stillingene
{ const F = { personer: [person(1, { oppgave: 'vakt' }), person(2, { egen: ['redd'] }), person(3, { alder: 70 }), person(4), person(5), person(6), person(7, { oppgave: 'vakt', egen: ['redd'] })] };
  const L = { bygg: [{ id: 1, type: 'betongbunker', x: 0, y: 0 }, { id: 2, type: 'brakke', x: 50, y: 0 }, { id: 3, type: 'aggregat', x: 9, y: 9 }] };
  const steder = OP.tilfluktssteder(L, { plasser: () => 3 }); ok(steder.length === 2 && steder.find(s => s.type === 'betongbunker').rang === 3, 'tilfluktsstedene (bunker og brakke)');
  const sm = steder.map(s => (s.type === 'betongbunker' ? { ...s, plass: 4 } : s));
  const T = OP.tilflukt({ F, steder: sm, avh: 2, alarm: 'nær', plass: () => ({ x: 40, y: 0 }) });
  ok(T.avh.n === 2 && T.avh.sted === 'betongbunker', 'barn og gamle får bunkeren først');
  ok(T.vakter.join() === '1', 'vakta går til stillingen (den redde vakta søker tilflukt)');
  ok(T.mål.get(2).type === 'betongbunker' && T.mål.get(3).type === 'betongbunker', 'den redde og den gamle i bunkeren');
  ok(T.mål.size === 6 && T.mål.get(5).type === 'brakke', 'resten i brakka');
  const T2 = OP.tilflukt({ F, steder: sm, avh: 2, alarm: 'fjern', plass: () => ({ x: 0, y: 0 }) });
  ok([...T2.mål.keys()].sort().join() === '2,7' && !T2.avh.n, 'meldt angrep: bare de redde går');
  const T3 = OP.tilflukt({ F, steder: [], alarm: 'nær', plass: () => ({ x: 0, y: 0 }), leir: { x: 5, y: 5 } }); ok(T3.trangt === 6 && T3.mål.get(4).k === 'dekning', 'uten tilfluktsrom: dekning ved leiren'); }

// 4 brann og bæring
{ const F = { personer: [person(1, { oppgave: 'vakt' }), person(2), person(3), person(4), person(5, { helse: .2 })] };
  const pos = { 1: [0, 0], 2: [10, 0], 3: [200, 0], 4: [30, 0], 5: [5, 5] }, plass = p => ({ x: pos[p.id][0], y: pos[p.id][1] });
  const J = OP.slukkJobber([{ x: 20, y: 0, r: 32 }, { x: 5000, y: 0, r: 32 }], { x: 0, y: 0 }, () => 'brakka');
  ok(J.length === 1 && J[0].navn === 'brakka', 'bare brann i leiren gir slukkejobb');
  const sl = OP.velgSlukkere(F, J, plass, new Set(), p => p.helse >= .4);
  ok([...sl.keys()].sort().join() === '2,3,4', 'de nærmeste ledige slukker (ikke vakta, ikke den skadde)');
  ok(OP.slukkSjanse(3, 10) > OP.slukkSjanse(1, 10) && OP.slukkSjanse(0, 10) === 0, 'flere slukkere = raskere');
  ok(OP.trengerBærer(F.personer[4]) && !OP.trengerBærer(F.personer[1]), 'den hardt skadde må bæres');
  const b = OP.velgBærer(F, F.personer[4], plass, new Set([2])); ok(b && b.id === 4, 'nærmeste ledige bærer (' + (b && b.id) + ')'); }

// 5 ulykker: tretthet og verneutstyr
{ const t0 = OP.tretthet({ natt: false, seng: true, mørke: false, helse: 1 }), t1 = OP.tretthet({ natt: true, seng: false, mørke: true, helse: .5 });
  ok(t0 === 0 && t1 === 1, 'tretthet 0 uthvilt, 1 helt sliten');
  ok(Math.abs(OP.ulykkeSjanse(1, false) - .01) < 1e-9 && OP.ulykkeSjanse(0, false) < .001, '1 % per skift sliten, nesten null uthvilt');
  ok(OP.ulykkeSjanse(1, true) < OP.ulykkeSjanse(1, false) * .5, 'verneutstyr senker sjansen');
  ok(OP.ulykkeSjanse(.5, false) > OP.ulykkeSjanse(.2, false), 'sjansen stiger med trettheten');
  const S = OP.ny(), F = { personer: Array.from({ length: 50 }, (_, i) => person(i + 1, { oppgave: 'maskin' })) }; let n = 0;
  for (let s = 0; s < 40; s++) { n += OP.ulykkeSteg(S, { F, tid: s * 480, dt: 480, tretthet: () => 1, r: Math.random }).length; for (const p of F.personer) p.helse = 1; }
  ok(n > 5 && n < 45, 'ca. 1 % per skift ved full tretthet (' + n + ' av 2000 skift)');
  S.vern = 20; ok(OP.medVern(S, F).size === 20, 'verneutstyret fordeles på de farlige jobbene');
  const S2 = OP.ny(); S2.ulykker = [100, 200, 300]; ok(OP.søkerMinus(S2, 400) > 0 && OP.søkerMinus(OP.ny(), 400) === 0, 'ulykker gir færre søkere');
  ok(RK.forventet({ rykte: 50, ulykker: OP.søkerMinus(S2, 400) }) < RK.forventet({ rykte: 50 }), 'Rekruttering.forventet bruker ulykkene');
  ok(OP.moral(S2, F, () => null, { tid: 400 }).ulykker < 0, 'ulykker senker moralen'); }

// 6 kommandoen og lagring
{ const reg = {}, K = { registrer: (n, d) => { reg[n] = d; } }, S = OP.ny(); let betalt = 0;
  OP.registrerKommandoer(K, { tilstand: () => S, betal: kr => { betalt += kr; return true; } });
  ok(reg.kjøpVern && reg.kjøpVern.sjekk({ antall: 0 }, {}) && !reg.kjøpVern.sjekk({ antall: 1 }, {}), 'kjøpVern sjekker antallet');
  const r = reg.kjøpVern.utfør({ antall: 2 }, {}); ok(r.sett === 10 && S.vern === 10 && betalt === 10 * R.vern.pris, 'kjøpVern: 10 sett');
  S.rel['1-2'] = .7; S.skadet[3] = { fra: 1, grunn: 'ulykke', x: 1, y: 2 }; const S2 = OP.fraJSON(JSON.parse(JSON.stringify(S)));
  ok(S2.vern === 10 && S2.rel['1-2'] === .7 && S2.skadet[3].grunn === 'ulykke', 'lagres og leses'); }

console.log(feil ? `${feil} FEIL` : 'Alle testene for oppforsel.js er ok'); process.exit(feil ? 1 : 0);
