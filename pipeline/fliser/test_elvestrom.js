'use strict';
// Regeltest for strømmen i brede elver (site/dovre-fliser/spill/elvestrom.js). Kjør: node pipeline/fliser/test_elvestrom.js
// Kunstige elver: rett elv 80 m bred som faller 0,3 %, et stryk med 5 % fall, og en innsjø eller sjøen der elva munner ut.
const E = require('../../site/dovre-fliser/spill/elvestrom.js');
let feil = 0, ok = 0;
const sjekk = (b, t) => { if (b) ok++; else { feil++; console.log('FEIL:', t); } };

// terreng: 100 moh. ved x = 0, faller 0,3 % – men 5 m på 100 m (5 %) mellom x 800 og 900; innsjø fra x 1500 (flat, 95 moh. – litt under elva)
const zElv = x => { let z = 100 - .003 * x; if (x > 800) z -= 5 * Math.min(1, (x - 800) / 100); return x >= 1500 ? Math.min(z, 100 - .003 * 1500 - 5) : z; };
const vannElv = (x, y) => (x >= -50 && x < 1500 && Math.abs(y) < 40) || (x >= 1500 && x < 2600 && Math.abs(y) < 600);
const P = [[0, 0], [1000, 0], [1800, 0]];
const B = E.bånd(P, { vann: vannElv, høyde: (x, y) => zElv(x), b: 15, orden: 6 });
const alle = B.flatMap(b => b.P.map((p, k) => ({ x: p[0], y: p[1], z: p[2], tone: b.tone[k], skum: b.skum[k], fart: b.fart[k], dl: b.dl[k], dr: b.dr[k] })));

sjekk(B.length >= 1, 'elva gir minst én bit med strøm');
sjekk(!B[0].snudd, 'NVE-retningen beholdes når terrenget faller med linja');
// retningen går alltid nedover: høyden stiger aldri langs bitene
let opp = 0; for (const b of B) for (let k = 1; k < b.P.length; k++) if (b.P[k][2] > b.P[k - 1][2] + 1e-9) opp++;
sjekk(opp === 0, `høyden stiger aldri nedover elva (stigninger: ${opp})`);
sjekk(B[0].P[0][0] < B[0].P[B[0].P.length - 1][0], 'strømmen går fra x 0 mot innsjøen');
// ingen strøm i innsjøen
const iSjø = alle.filter(p => p.x > 1520 && p.tone > 0);
sjekk(iSjø.length === 0, `ingen strøm i innsjøen (${iSjø.length} punkt)`);
// tonen går ut mot innsjøen og er full midt på elva
const nær = alle.filter(p => p.x > 1460 && p.x < 1500), midt = alle.filter(p => p.x > 400 && p.x < 600);
sjekk(nær.length && nær.every(p => p.tone < 1), 'strømmen tones ut de siste metrene før innsjøen');
sjekk(midt.length && midt.every(p => p.tone === 1), 'full strøm midt på elva');
// bredden: 80 m (40 til hver side)
sjekk(midt.every(p => Math.abs(p.dl - 40) < 4 && Math.abs(p.dr - 40) < 4), 'bredden måles til breddene (40 m til hver side)');
// stryk: skum og fart
const stryk = alle.filter(p => p.x > 820 && p.x < 880), rolig = midt;
sjekk(stryk.some(p => p.skum > .5), 'skum i stryket (5 % fall)');
sjekk(rolig.every(p => p.skum === 0), 'ikke skum der elva er rolig (0,3 %)');
sjekk(Math.min(...stryk.map(p => p.fart)) > Math.max(...rolig.map(p => p.fart)), 'raskere strøm i stryket');
sjekk(rolig.every(p => p.fart > .5 && p.fart < 1.5), 'rolig elv renner ca. 1 m/s');

// linja digitalisert MOT strømmen og terrenget stiger klart: snus, så strømmen fortsatt går nedover
const Br = E.bånd(P.slice().reverse(), { vann: vannElv, høyde: (x, y) => zElv(x), b: 15 });
sjekk(Br.length && Br[0].snudd, 'linja snus når terrenget stiger klart langs den');
sjekk(Br.length && Br[0].P[0][0] < Br[0].P[Br[0].P.length - 1][0], 'snudd linje renner fortsatt mot innsjøen');
let opp2 = 0; for (const b of Br) for (let k = 1; k < b.P.length; k++) if (b.P[k][2] > b.P[k - 1][2] + 1e-9) opp2++;
sjekk(opp2 === 0, 'snudd linje: høyden stiger aldri nedover');

// flatt terreng (ingen helning å lese): NVE-retningen beholdes, og strømmen er rolig
const Bf = E.bånd([[0, 0], [1400, 0]], { vann: vannElv, høyde: () => 50, b: 15 });
sjekk(Bf.length && !Bf[0].snudd && Bf[0].P[0][0] < 100, 'flatt terreng: NVE-retningen beholdes');
sjekk(Bf.length && Bf[0].fart.every(v => v === E.REGLER.FART_MIN || v === E.REGLER.FART_0), 'flatt terreng: rolig strøm');
// støy i terrenget (vannflaten i høydemodellen er ujevn): profilen stiger likevel aldri
const Bs = E.bånd([[0, 0], [1400, 0]], { vann: vannElv, høyde: (x, y) => 100 - .002 * x + 1.5 * Math.sin(x / 23) + (Math.sin(x * 12.9898) * 43758.5453 % 1), b: 15 });
let opp3 = 0; for (const b of Bs) for (let k = 1; k < b.P.length; k++) if (b.P[k][2] > b.P[k - 1][2] + 1e-9) opp3++;
sjekk(Bs.length && opp3 === 0, 'ujevn høydemodell: høyden stiger aldri nedover');
sjekk(Bs.length && Bs[0].fall.every(f => f >= 0), 'fallet er aldri negativt');

// sjøen: elva munner ut i havet (terreng under 1 moh., 200 m bredt – smalere enn en innsjø, så bare havregelen slår til) – ingen strøm der
const zHav = x => Math.max(.2, 8 - .008 * x);
const vannHav = (x, y) => (x >= -50 && x < 1000 && Math.abs(y) < 35) || (x >= 1000 && Math.abs(y) < 100);
const Bh = E.bånd([[0, 0], [1600, 0]], { vann: vannHav, høyde: (x, y) => zHav(x), b: 15 });
const iHav = Bh.flatMap(b => b.P.filter((p, k) => p[0] > 1050 && b.tone[k] > 0));
sjekk(Bh.length && iHav.length === 0, `ingen strøm ute i sjøen (${iHav.length} punkt)`);

// midtlinja ligger ikke midt i vannet: bredden til hver side blir ulik
const vannSkjev = (x, y) => x >= -50 && x < 1400 && y > -20 && y < 60;
const Bk = E.bånd([[0, 0], [1400, 0]], { vann: vannSkjev, høyde: (x, y) => zElv(x), b: 15 });
const pk = Bk.length ? Bk[0].P.findIndex(p => p[0] > 500) : -1;
sjekk(pk > 0 && Math.abs(Bk[0].dl[pk] - 60) < 4 && Math.abs(Bk[0].dr[pk] - 20) < 4, 'skjev midtlinje: 60 m til venstre, 20 m til høyre');

// en elv som ikke ligger i vannmasken (smal bekk) gir ingen strøm her – den har eget vannbånd i bekker-visning.js
sjekk(E.bånd([[0, 0], [500, 0]], { vann: () => false, høyde: x => 100 - x * .01, b: 3 }).length === 0, 'utenfor vannmasken: ingen strømlag');

// regelfunksjonene hver for seg
sjekk(E.skum(.001) === 0 && E.skum(.1) === 1, 'skum: 0 i rolig vann, 1 i foss');
sjekk(E.fart(0) < E.fart(.01) && E.fart(1) === E.REGLER.FART_MAKS, 'fart øker med fallet og har et tak');
const L = [0, 10, 20, 30, 40], pr = E.profil(L, [5, 6, 4, 4.5, 3], 0);
sjekk(pr.every((v, k) => !k || v <= pr[k - 1]), 'profil: løpende minimum');

// kjede: tre biter i rekkefølge (stokket) blir én elv; en sidebekk som renner inn, blir egen
const K = E.kjede([{ P: [[100, 0], [200, 0]], b: 10, orden: 5 }, { P: [[0, 0], [100, 0]], b: 8, orden: 5 }, { P: [[200, 0], [300, 0], [400, 0]], b: 12, orden: 6 }, { P: [[150, 80], [200, 0]], b: 3, orden: 2 }]);
const hoved = K.find(k => k.n === 3);
sjekk(K.length === 2 && hoved && hoved.P[0][0] === 0 && hoved.P[hoved.P.length - 1][0] === 400 && hoved.P.length === 5 && hoved.b === 12 && hoved.orden === 6, 'kjede: bitene settes sammen i strømmens retning');

console.log(`elvestrøm: ${ok} ok, ${feil} feil`);
if (feil) process.exit(1);
