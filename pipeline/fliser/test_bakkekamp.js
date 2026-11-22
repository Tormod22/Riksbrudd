// Test av reglene i spill/bakkekamp.js: dekning, siktekikkert, granater, lagkamerater, treffmarkør og skadeindikator.
const B = require('../../site/dovre-fliser/spill/bakkekamp.js'); let feil = 0;
const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const { Dekning, Kikkert, Granat, Følge, Indikator, REGLER } = B;

// DEKNING: en vegg 2 m nord for deg, skytteren 100 m nord -> dekning; skytteren sør -> ingen
{ const vegg = [[-5, 2], [5, 2], [5, 3], [-5, 3]], p = Dekning.prøver([{ type: 'hus', P: vegg }]);
  const n = Dekning.finn(0, 100, p, 'stå'), s = Dekning.finn(0, -100, p, 'stå');
  ok(n && n.type === 'hus' && n.faktor === REGLER.dekning.typer.hus.stå && s === null, `vegg mellom deg og skytteren gir dekning (${n && n.faktor}), ikke fra baksiden`); }
{ const p = Dekning.prøver([{ type: 'stein', x: 0, y: 1.5, r: .7 }]);
  const stå = Dekning.finn(0, 50, p, 'stå'), huk = Dekning.finn(0, 50, p, 'huk'), ligg = Dekning.finn(0, 50, p, 'ligg');
  ok(stå.faktor > huk.faktor && huk.faktor >= ligg.faktor && huk.faktor < .5, `steinen dekker mest når du er på huk eller ligger (${stå.faktor} / ${huk.faktor} / ${ligg.faktor})`); }
{ const p = Dekning.prøver([{ type: 'stein', x: 0, y: 9, r: .7 }]); ok(Dekning.finn(0, 50, p, 'huk') === null, 'en stein lenger unna enn 6 m gir ingen dekning'); }
{ const p = Dekning.prøver([{ type: 'tre', x: 0, y: 2, r: .35 }, { type: 'bil', x: 0, y: 3, r: 1.6 }]), d = Dekning.finn(0, 80, p, 'huk');
  ok(d && d.type === 'bil' && d.faktor === REGLER.dekning.typer.bil.huk, 'bilen bak treet gir den beste dekningen langs linja');
  ok(Dekning.finn(0, .5, p, 'stå') === null && Dekning.finn(0, 0, p, 'stå') === null, 'skytteren helt inntil: ingen dekning'); }
ok(Dekning.typeFaktor('ukjent', 'stå') === 1 && Dekning.tekst({ type: 'bil' }) === 'I dekning (bil)' && Dekning.tekst(null) === '', 'ukjent hindring og tekstene');

// SIKTEKIKKERT
ok(Kikkert.fov(68, 'rifle', true) === 17 && Kikkert.fov(68, 'gevær', true) < 68 && Kikkert.fov(68, 'gevær', true) > 17 && Kikkert.fov(68, 'rifle', false) === 68, 'zoomen: rifle 4×, gevær litt, ingenting uten sikte');
ok(Kikkert.treff('rifle', 700, 700, true) > 1.3 && Kikkert.treff('rifle', 700, 700, false) === 1 && Kikkert.treff('rifle', 20, 700, true) === 1, 'kikkerten hjelper på langt hold, ikke helt nær');
ok(Kikkert.treff('gevær', 350, 350, true) < Kikkert.treff('rifle', 350, 700, true) + .2 && Kikkert.treff('gevær', 350, 350, true) <= 1.1, 'vanlig sikte gir lite ekstra');
ok(Kikkert.følsomhet('rifle', true) < .3 && Kikkert.følsomhet('rifle', false) === 1, 'musa går saktere med kikkert');

// GRANATER: kastet fra 1,7 m på flat mark lander 15–40 m unna og går av etter lunta
{ const g = Granat.kast(0, 0, 1.7, 0, 0); let t = 0, smell = false; while (t < 10 && !smell) { smell = Granat.steg(g, 1 / 60, () => 0); t += 1 / 60; }
  const d = Math.hypot(g.x, g.y);
  ok(smell && Math.abs(t - REGLER.granat.lunte) < .05 && d > 15 && d < 40 && g.y > 0 && Math.abs(g.x) < .01 && g.z >= 0, `granaten går nordover (blikket), lander ${d.toFixed(1)} m unna og smeller etter ${t.toFixed(2)} s`); }
{ const g = Granat.kast(0, 0, 1.7, Math.PI / 2, -1.2); for (let i = 0; i < 200; i++) Granat.steg(g, 1 / 60, () => 0); ok(g.x < 0 && Math.hypot(g.x, g.y) < 15, 'kastet ned foran deg mot vest lander nærmere'); }
ok(Granat.styrke(2) === 1 && Granat.styrke(8) > 0 && Granat.styrke(8) < 1 && Granat.styrke(12) === 0 && Granat.skadeDeg(0) > 100 && Granat.skadeDeg(20) === 0, 'smellet avtar med avstanden');
{ let r = 1; const rng = () => ((r = (r * 16807) % 2147483647) / 2147483647); const nær = Array.from({ length: 8 }, () => ({ hp: 1 })), fjern = Array.from({ length: 8 }, () => ({ hp: 1 }));
  const a = Granat.rammLag(nær, 1, rng, 2), b = Granat.rammLag(fjern, 30, rng, 2);
  ok(a >= 5 && b === 0 && nær.filter(m => m.hp === 0).length >= 4 && fjern.every(m => m.hp === 1), `granaten rammer laget nær (${a} av 8), ikke et lag 30 m unna`); }

// LAGKAMERATER
{ const m = Følge.mål(100, 100, 0, 0); ok(Math.abs(m.x - 100) < 1e-9 && m.y < 100 && 100 - m.y === REGLER.følge.bak, 'følg meg: laget går bak deg');
  const m2 = Følge.mål(100, 100, 0, 1); ok(Math.abs(m2.x - 100) > 3, 'to lag går til hver sin side');
  ok(Følge.nyOrdre({ x: 100, y: 60 }, m, 10) && !Følge.nyOrdre({ x: 100, y: 60 }, m, 1) && !Følge.nyOrdre({ x: m.x, y: m.y + 3 }, m, 10), 'ny ordre bare når laget har sakket akterut og en stund har gått');
  const A = Følge.angrepMål(0, 0, Math.PI / 2, 5000); ok(Math.abs(A.x + REGLER.følge.angrepMaks) < 1e-6 && Math.abs(A.y) < 1e-6, 'angrip dit: rett fram, høyst 600 m');
  const L = [{ side: 'blå', x: 50, y: 0, menn: [{ hp: 1 }] }, { side: 'blå', x: 10, y: 0, menn: [{ hp: 1 }] }, { side: 'rød', x: 5, y: 0, menn: [{ hp: 1 }] }, { side: 'blå', x: 2, y: 0, karakter: true, menn: [{ hp: 1 }] }, { side: 'blå', x: 900, y: 0, menn: [{ hp: 1 }] }, { side: 'blå', x: 3, y: 0, menn: [{ hp: 0 }] }];
  const k = Følge.kandidater(L, 'blå', 0, 0); ok(k.length === 2 && k[0].x === 10, 'bare egne, levende lag i nærheten (nærmest først), ikke deg selv'); }

// TREFFMARKØR OG SKADEINDIKATOR
{ const a = 0; ok(Math.abs(Indikator.vinkel(0, 10, a)) < 1e-9 && Indikator.vinkel(10, 0, a) > 1.5 && Indikator.vinkel(-10, 0, a) < -1.5 && Math.abs(Math.abs(Indikator.vinkel(0, -10, a)) - Math.PI) < 1e-9, 'vinkelen: fram, høyre, venstre, bak');
  ok(Math.abs(Indikator.vinkel(-10, 0, Math.PI / 2)) < 1e-9, 'ser du mot vest, er en skytter i vest rett fram');
  const L = []; Indikator.legg(L, 1, .5, 0); Indikator.legg(L, 1.1, .9, 1); Indikator.legg(L, -2, .4, 1);
  ok(L.length === 2 && L[0].s === .9, 'like retninger slås sammen');
  const A = Indikator.aktive(L, 2); ok(A.length === 2 && A[0].alfa > 0 && A[0].alfa < 1 && Indikator.aktive(L, 10).length === 0, 'buene tones ut');
  ok(Indikator.markør(0, false) === 1 && Indikator.markør(.3, false) === 0 && Indikator.markør(.3, true) > 0, 'treffmarkøren er kort, drapsmarkøren litt lenger'); }

console.log(feil ? feil + ' feil' : 'alle testene for kamp på bakken ok'); process.exit(feil ? 1 : 0);
