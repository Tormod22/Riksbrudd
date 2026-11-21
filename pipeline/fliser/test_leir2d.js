// Test av reglene i site/dovre-fliser/spill/leir2d.js (leiren i 2D på nær zoom, runde 7): node pipeline/fliser/test_leir2d.js
'use strict';
const path = require('path');
const L2 = require(path.join(__dirname, '../../site/dovre-fliser/spill/leir2d.js'));
const Leir = require(path.join(__dirname, '../../site/dovre-fliser/spill/leir.js'));
let feil = 0, ok = 0;
const sjekk = (b, t) => { if (b) ok++; else { feil++; console.log('FEIL:', t); } };

// 1. alle byggtypene i leir.js har en stil med kropp innenfor fotavtrykket (taket skal ikke stikke langt utenfor omrisset)
for (const [type, B] of Object.entries(Leir.BYGG)) { if (B.linje || B.del) continue; const S = L2.stil(type, B);
  sjekk(!!S && !!S.form && /^#[0-9a-f]{6}$/i.test(S.tak), `${type}: stil med form og takfarge`);
  sjekk(Array.isArray(S.kropp) && S.kropp.length === 4 && S.kropp[0] < S.kropp[1] && S.kropp[2] < S.kropp[3], `${type}: kropp er et rektangel`);
  const f = B.fot; sjekk(S.kropp[0] >= f[0] - .5 && S.kropp[1] <= f[1] + .5 && S.kropp[2] >= f[2] - .5 && S.kropp[3] <= f[3] + .5, `${type}: kroppen ligger innenfor fotavtrykket`);
  sjekk(L2.STIL[type] !== undefined, `${type}: har en egen stil (ikke bare reserven)`); }
// typer som legges inn av andre filer (kjøkken, brønn, minnesmerke, åker) har også stil
for (const t of ['kjøkken', 'brønn', 'minnesmerke', 'åker']) sjekk(!!L2.STIL[t], `${t}: egen stil`);
// en ukjent type får et flatt tak med fotavtrykket som kropp
{ const S = L2.stil('ukjent_type', { fot: [-2, 2, -3, 3] }); sjekk(S.form === 'flat' && S.kropp[1] === 2, 'ukjent type: flatt tak på fotavtrykket'); }

// 2. tilstanden
const T = (b, i) => L2.tilstand(b, i).navn;
sjekk(T({ igjen: 0, hp: 1 }) === 'ferdig', 'ferdig bygg');
sjekk(T({ igjen: 0, hp: .4 }) === 'skadet', 'skadet bygg');
sjekk(T({ igjen: 0, hp: 0 }) === 'ødelagt', 'ødelagt bygg');
sjekk(T({ igjen: 30, totalt: 120, hp: 1 }) === 'bygges', 'under bygging');
sjekk(Math.abs(L2.tilstand({ igjen: 30, totalt: 120, hp: 1 }).p - .75) < 1e-9, 'framdriften er 75 %');
sjekk(T({ igjen: 120, totalt: 120, hp: 1 }, { aktiv: false }) === 'kø', 'i kø når laget ikke arbeider med den');
sjekk(T({ igjen: 120, totalt: 120, hp: 1, reise: 20 }) === 'kø', 'laget er på vei: kø');
sjekk(T({ igjen: 0, hp: .3, arbeid: { hva: 'reparer', igjen: 30, totalt: 60 } }) === 'reparer', 'reparasjon');
sjekk(T({ igjen: 0, hp: 1, arbeid: { hva: 'oppgrader', igjen: 30, totalt: 60 } }) === 'oppgrader', 'oppgradering');
sjekk(T({ igjen: 40, totalt: 60, hp: 0 }) === 'ødelagt', 'en ødelagt byggeplass er ødelagt');

// 3. nattfargen: ingen tone = samme farge; natt gjør mørkere og blåere; regn gjør gråere; alltid heltall 0–255
{ const c = [180, 120, 60]; sjekk(L2.tonet(c, null) === c, 'uten tone: samme farge');
  const n = L2.tonet(c, { natt: .62, farge: [46, 64, 112], grå: 0, mørk: 0 }); sjekk(n[0] < c[0] && n[1] < c[1] && n[2] < c[2], 'natt: mørkere');
  sjekk(n[2] / n[0] > c[2] / c[0], 'natt: blåere');
  const r = L2.tonet(c, { natt: 0, farge: [46, 64, 112], grå: .45, mørk: 0 }); sjekk(Math.max(...r) - Math.min(...r) < Math.max(...c) - Math.min(...c), 'regn: gråere');
  sjekk([...n, ...r].every(v => Number.isInteger(v) && v >= 0 && v <= 255), 'heltall 0–255');
  sjekk(L2.hex('#7b8083').join(',') === '123,128,131', 'hex leses riktig'); }

// 4. figurene: radius mellom grensene, større nær
{ const R = L2.REGLER.figur; sjekk(L2.figurR(.1) <= R.maks && L2.figurR(.1) >= R.min, 'figur nær innenfor grensene');
  sjekk(L2.figurR(1.5) === R.min, 'figur langt ute = minste');
  sjekk(L2.figurR(.12) > L2.figurR(.4), 'større figurer nærmere'); }

// 5. folk i leiren: der de arbeider
{ const leir = { x: 1000, y: 2000 }, bygg = [{ id: 1, type: 'brakke', x: 1000, y: 2010, ret: 0, igjen: 0, hp: 1 }, { id: 2, type: 'kontrollrom', x: 1020, y: 2000, ret: 0, igjen: 0, hp: 1 },
  { id: 3, type: 'vakttårn', x: 960, y: 2000, ret: 0, igjen: 0, hp: 1 }, { id: 4, type: 'sykestue', x: 1050, y: 2050, ret: 0, igjen: 60, totalt: 120, hp: 1 }];
  const P = (o, i = 0, t = 100) => L2.folkPlass({ oppgave: o }, i, bygg, leir, t, Leir.BYGG);
  const b = P('bygg'); sjekk(b && Math.hypot(b.x - 1050, b.y - 2050) < 12 && b.arbeid, 'byggeren står ved byggeplassen');
  sjekk(P('overvåking') === null, 'operatøren er inne i kontrollrommet (synes ikke)');
  const v = P('vakt'); sjekk(v && Math.hypot(v.x - 960, v.y - 2000) < 5, 'vakta står ved tårnet');
  const f = P('fri'); sjekk(f && Math.hypot(f.x - 1000, f.y - 2000) < 20, 'fri rundt leirens midte');
  sjekk(L2.folkPlass({ oppgave: 'fri', karantene: true }, 0, bygg, leir, 0, Leir.BYGG) === null, 'syke i karantene synes ikke');
  const h = P('hogst'); sjekk(h && Math.hypot(h.x - 1000, h.y - 2000) > 30, 'hogst ute i skogkanten');
  const a = P('fri', 3, 100), c = P('fri', 3, 100); sjekk(a.x === c.x && a.y === c.y, 'samme person og tid gir samme plass');
  const d = P('fri', 3, 160); sjekk(Math.hypot(a.x - d.x, a.y - d.y) > .1, 'folkene flytter seg med tida');
  // uten byggeplass går byggerne fri, og uten kontrollrom står operatøren ute
  const bygg2 = bygg.filter(q => q.type !== 'sykestue' && q.type !== 'kontrollrom');
  sjekk(!!L2.folkPlass({ oppgave: 'bygg' }, 0, bygg2, leir, 0, Leir.BYGG), 'byggeren uten byggeplass synes');
  sjekk(!!L2.folkPlass({ oppgave: 'overvåking' }, 0, bygg2, leir, 0, Leir.BYGG), 'operatøren uten kontrollrom synes'); }

// 6. reglene: detaljnivåene i riktig rekkefølge
sjekk(L2.REGLER.nær < L2.REGLER.middels && L2.REGLER.folkUnder <= L2.REGLER.middels && L2.REGLER.hull < L2.REGLER.sot && L2.REGLER.rusk < L2.REGLER.hull, 'grensene henger sammen');

// 7. (runde 12) klyngen langt ute: helt nær som kartet, så vokser målestokken sakte (leiren forstørres), aldri over kartets
{ const K = L2.REGLER.klynge; sjekk(L2.klyngeM(.5) === .5 && Math.abs(L2.klyngeM(K.fra) - K.fra) < 1e-9, 'klyngen: som kartet helt nær');
  sjekk(L2.klyngeM(8) < 8 / 3 && L2.klyngeM(8) > K.fra && L2.klyngeM(30) > L2.klyngeM(8), 'klyngen: på 1 km-målestokk (8 m per punkt) minst tre ganger forstørret: ' + L2.klyngeM(8).toFixed(2));
  sjekk(6 / L2.klyngeM(8) >= 2 && K.kort >= 4 && K.lang > K.kort, 'klyngen: brakka (6 × 12 m) er minst noen punkter bred på 1 km-målestokk'); }

console.log(`test_leir2d: ${ok} ok, ${feil} feil`);
process.exit(feil ? 1 : 0);
