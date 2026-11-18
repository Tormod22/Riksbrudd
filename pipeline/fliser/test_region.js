// Test av reglene i spill/region.js: typer, det tettstedene gir, skatt og lojalitet, handelsruter, gjenoppbygging, veksling, svartebørs.
// Kjør fra repo-roten: node pipeline/fliser/test_region.js
const R = require('../../site/dovre-fliser/spill/region.js'); let feil = 0;
const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
let frø = 11; const rng = () => (frø = (frø * 16807) % 2147483647) / 2147483647;

// typer
ok(R.type(1200, {}) === 'bygd' && R.type(9000, {}) === 'by' && R.type(1200, { kraft: 4000 }) === 'industri' && R.type(300, { kraft: 4000 }) === 'bygd', 'type: bygd, by og industristed (kraftverk nær og nok folk)');
ok(R.type(500, { kai: 800, kraft: 100 }) === 'havn' && R.type(20000, { olje: 5000, kai: 100 }) === 'oljeby' && R.type(20000, { olje: 12000, kai: 100, kraft: 100 }) === 'by' && R.type(3000, { kai: 100, kraft: 100 }) === 'industri', 'type: kai gir havn, oljeanlegg går foran alt, en by er by');
// det de gir
{ const g = R.grunn(1200, 'bygd'), h = R.grunn(40, 'bygd'), s = R.grunn(200000, 'by');
  ok(g.mat === 36 && g.tre === 6 && g.penger === 120000 && !g.stål, 'bygd på 1200: 36 rasjoner, 6 m³ tre og 120 000 kr per døgn');
  ok(h.mat === 10 && h.tre === 2 && s.penger === R.REGLER.skattMaks && s.folk === 2, 'minste og største mengder holder'); }
{ const st = { loj: 50, skatt: 'vanlig', strøm: true, rute: 'åpen' }, f = R.faktor(st);
  ok(Math.abs(f - 1) < 1e-9, 'vanlig skatt, lojalitet 50, strøm og åpen rute = faktor 1');
  ok(R.faktor({ ...st, skatt: 'hard' }) > 1.6 && R.faktor({ ...st, skatt: 'lett' }) < .7 && R.faktor({ ...st, skatt: 'støtte' }) === 0, 'hard skatt gir mer, lett mindre, støtte ingenting');
  ok(Math.abs(R.faktor({ ...st, strøm: false, utenStrøm: .4 }) - .4) < 1e-9 && R.faktor({ ...st, rute: 'stengt' }) === 0 && R.faktor({ ...st, rute: 'truet' }) === .5, 'uten strøm 40 %, truet rute halvparten, stengt rute ingenting');
  ok(R.faktor({ ...st, loj: 100 }) > R.faktor(st) && R.faktor({ ...st, loj: 0 }) < R.faktor(st) && R.faktor({ ...st, uro: true }) === .5, 'lojale tettsteder gir mer, uro halverer');
  const støtte = R.gir(1000, 'bygd', { ...st, skatt: 'støtte' }); ok(støtte.mat === 0 && støtte.penger === -50000, 'støtte koster 50 kr per innbygger per døgn');
  ok(/36 rasjoner/.test(R.girTekst(R.gir(1200, 'bygd', st), v => v + ' kr')) && R.girTekst({}) === 'ingenting', 'teksten: ' + R.girTekst(R.gir(1200, 'bygd', st), v => v + ' kr')); }
// lojalitet
{ let l = 50; for (let i = 0; i < 10; i++) l = R.lojSteg(l, { skatt: 'hard', strøm: true }, .5);
  ok(l === 0 && R.opprør(l, false) === 'tapt' && R.opprør(l, true) === 'uro' && R.opprør(40, false) === null, 'hard skatt: fra 50 til bunnen på fem døgn – opprør uten garnison, uro med');
  let m = 20; for (let i = 0; i < 40; i++) m = R.lojSteg(m, { skatt: 'støtte', strøm: true }, .25); ok(m === 100, 'støtte løfter lojaliteten til topps');
  ok(R.lojMål({ skatt: 'vanlig', strøm: true, garnison: true }) === 65 && R.lojMål({ skatt: 'vanlig', strøm: false }) === 40 && R.lojMål({ skatt: 'hard', strøm: false }) === 0 && R.opprør(R.lojMål({ skatt: 'hard', strøm: true, garnison: true }), true) === 'uro', 'garnison løfter målet, uten strøm senker det');
  ok(R.lojOrd(90) === 'trofast' && R.lojOrd(5) === 'opprør', 'ord for lojaliteten'); }
// handelsruter
{ const leir = { x: 0, y: 0 }, A = { id: 1, navn: 'A', x: 10000, y: 0 }, B = { id: 2, navn: 'B', x: 20000, y: 1000 }, C = { id: 3, navn: 'C', x: -50000, y: 0 };
  ok(Math.abs(R.tilLinje({ x: 5000, y: 700 }, leir, A) - 700) < 1e-6 && Math.abs(R.tilLinje({ x: 12000, y: 0 }, leir, A) - 2000) < 1e-6, 'avstand til linjestykket');
  const k = R.kjede(B, [A, B, C], leir); ok(k.map(p => p.id).join() === '2,1,leir', 'ruta fra B går via A til leiren');
  ok(R.kjede(C, [A, B, C], leir).map(p => p.id).join() === '3,leir', 'C ligger alene: rett hjem');
  ok(R.rute(B, [A, B], leir, [], []).status === 'åpen' && R.rute(B, [A, B], leir, [], []).via.join() === 'A', 'ingen fiender: åpen, via A');
  ok(R.rute(B, [A, B], leir, [{ x: 5000, y: 3000 }], []).status === 'truet', 'fiende 3 km fra ruta: truet');
  const st = R.rute(B, [A, B], leir, [{ x: 15000, y: 600 }], []); ok(st.status === 'stengt' && st.ledd[0].status === 'stengt' && st.ledd[1].status === 'åpen', 'fiende på ruta: stengt (bare det ene leddet)');
  ok(R.rute(B, [A, B], leir, [{ x: 15000, y: 600 }], [{ x: 14000, y: 400 }]).status === 'truet' && R.rute(B, [A, B], leir, [{ x: 5000, y: 3000 }], [{ x: 5000, y: 0 }]).status === 'åpen', 'et eget lag ved ruta vokter den: ett hakk tryggere');
  ok(R.rute(A, [A, B], leir, [{ x: 15000, y: 600 }], []).status === 'åpen', 'A sin rute går ikke forbi fienden ved B'); }
// gjenoppbygging
{ const byer = [{ id: 1, x: 3000, y: 0, eier: 'blå' }, { id: 2, x: 6000, y: 0, eier: null }, { id: 3, x: 4000, y: 0, eier: null, fiendeI: true }, { id: 4, x: 9000, y: 0, eier: 'rød' }, { id: 5, x: 40000, y: 0, eier: 'blå' }];
  const g = R.gjenoppbygg(0, 0, byer); ok(g.lojale.join() === '1' && g.vunnet === 2 && g.pluss === 20, 'reparasjon: eget tettsted nær blir mer lojalt, nærmeste nøytrale uten fiender går over'); }
// motstandernes fordel
{ const f = R.fordel(['industri', 'by', 'bygd', 'havn', 'bygd']), tom = R.fordel([]), mye = R.fordel(Array(9).fill('industri').concat(Array(9).fill('bygd')));
  ok(Math.abs(f.treff - 1.1) < 1e-9 && Math.abs(f.forsterk - 1.75) < 1e-9 && tom.treff === 1 && tom.forsterk === 1 && Math.abs(mye.treff - 1.2) < 1e-9 && mye.forsterk === 2, 'motstanderne: industri og byer gir bedre treff (høyst +20 %), bygder og havner raskere forsterkning (høyst ×2)'); }
// veksling
{ const V = R.Veksle; ok(V.tilDiesel(10, 25.5, 1000).liter === 100 && V.tilDiesel(10, 4.9, 1000).tonn === 4 && V.tilDiesel(10, 50, 35).tonn === 3, 'olje til diesel: 10 liter per tonn, etter oljen og plassen');
  ok(!!V.tilDiesel(10, .5, 1000).feil && !!V.tilDiesel(10, 50, 5).feil && V.tilOlje(10, 150).tonn === 10 && V.tilOlje(10, 40).tonn === 2 && !!V.tilOlje(10, 10).feil && /10 liter/.test(V.tekst()), 'diesel til olje: 15 liter per tonn; feil når det ikke går'); }
// svartebørs
{ let med = 0, tom = 0; const sett = new Set(); for (let i = 0; i < 400; i++) { const t = R.Bors.tilbud(rng, { nattsikt: 1 }); if (t.length) med++; else tom++; for (const id of t) sett.add(id); if (new Set(t).size !== t.length) feil++; }
  ok(med > 110 && med < 210 && !sett.has('nattsikt') && sett.has('medisin') && sett.has('våpen'), `svartebørs: selger ${med} av 400 døgn, aldri noe du har fullt av`);
  ok(R.Bors.kan('våpen', { våpen: 1 }) && !R.Bors.kan('våpen', { våpen: 2 }) && Math.abs(R.Bors.treff({ våpen: 2 }) - 1.3) < 1e-9 && R.Bors.treff({}) === 1 && R.Bors.natt(23) && R.Bors.natt(3) && !R.Bors.natt(12), 'svartebørs: tak på kjøp, treffbonus, natt'); }
// tilstand
{ const S = R.ny(); R.by(S, 7).loj = 77; R.settSkatt(S, 7, 'hard'); S.har.våpen = 1; S.pott.mat = 2.5; const T = R.fraJSON(JSON.parse(JSON.stringify(S)));
  ok(T.byer[7].loj === 77 && T.byer[7].skatt === 'hard' && T.har.våpen === 1 && T.pott.mat === 2.5 && !R.settSkatt(S, 7, 'tull') && R.fraJSON(null).døgn === 0, 'tilstanden lagres og leses'); }
console.log(feil ? `${feil} FEIL` : 'Alt ok'); process.exit(feil ? 1 : 0);
