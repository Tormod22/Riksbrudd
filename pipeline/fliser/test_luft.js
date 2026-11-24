// Test av reglene for lysstriper, byger og blå dis (site/dovre-fliser/spill/luft.js, R19-2).
// Bruk: node pipeline/fliser/test_luft.js
const L = require('../../site/dovre-fliser/spill/luft.js');
let feil = 0; const sjekk = (ok, t) => { if (!ok) feil++; console.log((ok ? 'ok   ' : 'FEIL ') + t); };
const vær = (sky, dis, regn = 0, snø = 0, v = 'skyet') => ({ sky, dis, regn, snø, vær: v });

// lysstriper: delvis skyet og lav til middels sol – ikke i klart vær, ikke i tett skydekke, ikke om natta eller midt på dagen høyt
sjekk(L.striper(vær(.1, 1, 0, 0, 'klart'), 15) === 0, 'striper: ingen i klart vær');
sjekk(L.striper(vær(1, .4, 1), 15) === 0, 'striper: ingen i tett skydekke med regn');
sjekk(L.striper(vær(.6, .8), 15) > .9, 'striper: tydelige i delvis skyet vær med sola 15° oppe');
sjekk(L.striper(vær(.6, .8), -3) === 0, 'striper: ingen når sola er under horisonten');
sjekk(L.striper(vær(.6, .8), 50) === 0, 'striper: ingen med sola høyt (over 42°)');
sjekk(L.striper(vær(.6, .1, 0, 0, 'tåke'), 15) === 0, 'striper: ingen i tåke');
sjekk(L.striper(vær(.8, .75), 10) > .5, 'striper: med i vanlig «skyet» (sky 0,8)');

// bygemengde
sjekk(L.bygeMengde(vær(.1, 1, 0, 0, 'klart')) === 0, 'byger: ingen i klart vær');
sjekk(L.bygeMengde(vær(.6, .1, 0, 0, 'tåke')) === 0, 'byger: ingen i tåke');
sjekk(L.bygeMengde(vær(.8, .75)) > .9, 'byger: mange i skyet vær');
sjekk(L.bygeMengde(vær(1, .4, 1)) < L.bygeMengde(vær(.8, .75)), 'byger: færre egne byger når det alt regner overalt');

// felt: samme sted og tid gir samme punkter; punktene driver med D
const D0 = [0, 0], D1 = [3000, -1200];
const a = L.byger(200000, 6900000, D0, 500, 1), b = L.byger(200000, 6900000, D0, 500, 1);
sjekk(a.length > 0 && JSON.stringify(a) === JSON.stringify(b), `byger: samme svar for samme sted og tid (${a.length} byger)`);
sjekk(a.length <= L.REGLER.byge.maks, 'byger: høyst maks');
sjekk(a.every((x, i) => i === 0 || a[i - 1].d <= x.d), 'byger: nærmeste først');
const c = L.byger(200000 + 3000, 6900000 - 1200, D1, 500, 1);
const nøkler = l => new Set(l.map(x => x.id));
const felles = [...nøkler(a)].filter(k => nøkler(c).has(k));
sjekk(felles.length > 0, 'byger: de samme bygene finnes når både stedet og skyene har flyttet seg like mye');
const flytt = felles.map(k => { const p = a.find(x => x.id === k), q = c.find(x => x.id === k); return [q.x - p.x, q.y - p.y]; });
sjekk(flytt.every(([dx, dy]) => Math.abs(dx - 3000) < 1e-6 && Math.abs(dy + 1200) < 1e-6), 'byger: flytter seg nøyaktig med skyene (D)');
// de kommer og går over tiden
const sett = new Set(), tider = [0, 40, 80, 120, 160, 200];
for (const t of tider) for (const x of L.byger(200000, 6900000, D0, t, 1)) sett.add(x.id);
sjekk(sett.size > a.length, `byger: nye byger kommer over tiden (${sett.size} ulike på ${tider.length} tider)`);
sjekk(L.byger(200000, 6900000, D0, 500, 0).length === 0, 'byger: ingen når mengden er 0');
sjekk(L.byger(200000, 6900000, D0, 500, .3).length <= L.byger(200000, 6900000, D0, 500, 1).length, 'byger: færre ved lav mengde');

// her(): midt i bygen er det full nedbør, ute ingen
const by = [{ x: 0, y: 0, r: 1000, a: .8 }];
sjekk(Math.abs(L.her(by, 0, 0).mengde - .8) < 1e-9, 'her: midt i bygen = bygens styrke');
sjekk(L.her(by, 1200, 0).mengde === 0, 'her: utenfor bygen ingenting');
sjekk(L.her(by, 800, 0).mengde > 0 && L.her(by, 800, 0).mengde < .8, 'her: tones ut mot kanten');
sjekk(L.her([], 0, 0).mengde === 0 && L.her(null, 0, 0).byge === null, 'her: tom liste gir 0');

// en byge driver over der du står: i løpet av tiden går nedbøren opp og ned igjen
{ let maks = 0, sist = 0, ganger = 0; const cx = 200000, cy = 6900000; let D = [0, 0];
  for (let t = 0; t < 600; t += 1) { D = [D[0] + L.drift(6, 0, 1)[0], D[1]]; const m = L.her(L.byger(cx, cy, D, t, 1), cx, cy).mengde; maks = Math.max(maks, m); if (m > .2 && sist <= .2) ganger++; sist = m; }
  sjekk(maks > .3 && ganger >= 1, `her: med vind 6 m/s driver byger over et fast sted (${ganger} ganger på 10 spilltimer, sterkest ${maks.toFixed(2)})`); }

// stråler
const s = L.stråler(200000, 6900000, D0, 300, 1);
sjekk(s.length > 0 && s.length <= L.REGLER.stråle.maks, `stråler: noen striper (${s.length})`);
sjekk(s.every(x => x.d >= L.REGLER.stråle.nær && x.d <= L.REGLER.stråle.fjern), 'stråler: innenfor nær/fjern');
sjekk(L.stråler(200000, 6900000, D0, 300, 0).length === 0, 'stråler: ingen når styrken er 0');
sjekk(s.every(x => x.a <= 1 && x.a > 0 && x.b >= 70 && x.b <= 260), 'stråler: styrke og bredde innenfor grensene');

// type: snø høyt oppe og om vinteren
sjekk(L.type(1500, 1350, 'høst') === 'snø' && L.type(700, 1350, 'høst') === 'regn', 'type: snø over (snøgrensen − 250 m), ellers regn');
sjekk(L.type(300, 1900, 'vinter') === 'snø', 'type: alltid snø om vinteren');

// drift: retning og fart
const dr = L.drift(5, Math.PI / 2, 1);
sjekk(Math.abs(dr[0]) < 1e-9 && Math.abs(dr[1] - 600) < 1e-9, 'drift: 5 m/s mot nord i ett spillminutt = 600 m nordover (2 × vinden)');

// dis: blå og tydelig i klart vær, svakere om natta og i skyet vær, aldri nært
const H = [.72, .79, .86], klar = L.dis(vær(.1, 1), 1, .1, H), skyet = L.dis(vær(.8, .75), 1, .8, H), natt = L.dis(vær(.1, 1), 0, .1, H);
sjekk(klar.k > .4, `dis: tydelig i klart vær (${klar.k.toFixed(2)})`);
sjekk(klar.farge[2] > klar.farge[0] + .2, 'dis: blå i klart vær');
sjekk(skyet.k < klar.k && natt.k < klar.k, 'dis: svakere i skyet vær og om natta');
sjekk(L.dis(vær(.6, .1), 1, .6, H).k < .05, 'dis: nesten ingen i tåke (tåka tar over)');
sjekk(L.disAndel(klar.k, 1000, L.disStart(true)) === 0, 'dis: nært terreng (1 km) er klart når du går');
sjekk(L.disAndel(klar.k, 2500, L.disStart(false, 3000)) === 0, 'dis: fra lufta er bakken midt i bildet klar');
const d5 = L.disAndel(klar.k, 5000, 1300), d15 = L.disAndel(klar.k, 15000, 1300), d30 = L.disAndel(klar.k, 30000, 1300);
sjekk(d5 < d15 && d15 < d30 && d5 < .15 && d30 > .3, `dis: åsene bak hverandre blir blåere i lag (5 km ${d5.toFixed(2)}, 15 km ${d15.toFixed(2)}, 30 km ${d30.toFixed(2)})`);

console.log(feil ? `${feil} feil` : 'Alt i orden'); process.exit(feil ? 1 : 0);
