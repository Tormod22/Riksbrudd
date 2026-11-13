// Test av reglene for bruer og ferjekaier i 3D (site/dovre-fliser/spill/bruer.js). Kjør: node pipeline/fliser/test_bruer.js
const B = require('../../site/dovre-fliser/spill/bruer.js');
let feil = 0; const sjekk = (ok, tekst) => { console.log(`${ok ? 'ok  ' : 'FEIL'} ${tekst}`); if (!ok) feil++; };

// linja følger vegen: en buet veg, og NVDB-brua er en rett strek mellom endene
const veg = []; for (let a = 0; a <= 90; a += 5) veg.push([100 * Math.cos(a * Math.PI / 180), 100 * Math.sin(a * Math.PI / 180)]);
const bru = [[100 * Math.cos(.3), 100 * Math.sin(.3)], [100 * Math.cos(.9), 100 * Math.sin(.9)]];
const l = B.finnLinje(bru, [{ k: 'E', P: veg }, { k: 'K', P: [[0, 0], [200, 0]] }], 60);
const midt = l.P[l.P.length >> 1];
sjekk(l.veg && l.k === 'E' && Math.abs(Math.hypot(...midt) - 100) < .5 && Math.abs(B.lengde(l.P) - 60) < 1.5, `brua følger den buede E-vegen (lengde ${B.lengde(l.P).toFixed(1)} m, midten ${Math.hypot(...midt).toFixed(1)} m fra sentrum)`);
// NVDB-geometrien kortere enn lengden i dataene: forlenges langs vegen
const kort = B.finnLinje([[90, 0], [110, 0]], [{ k: 'F', P: [[0, 0], [300, 0]] }], 60);
sjekk(Math.abs(B.lengde(kort.P) - 60) < .5 && Math.abs(kort.P[0][0] - 70) < .5, `kort geometri (20 m) forlenges til lengden i dataene (${B.lengde(kort.P).toFixed(1)} m)`);
// uten veg i nærheten: rett linje; ett punkt uten veg: ingen modell
const r = B.finnLinje(bru, [{ k: 'K', P: [[500, 500], [600, 500]] }], 60);
sjekk(!r.veg && r.k === null && Math.abs(B.lengde(r.P) - B.lengde(bru)) < .01, 'uten veg: NVDB-linjen');
sjekk(B.finnLinje([[5, 5]], [], 20) === null, 'ett punkt uten veg: ingen bru');
const en = B.finnLinje([[100, 2]], [{ k: 'R', P: [[0, 0], [200, 0]] }], 30);
sjekk(en && en.k === 'R' && Math.abs(B.lengde(en.P) - 30) < .5, 'ett punkt med lengde: 30 m langs R-vegen');

// dekket ligger over terrenget, også der terrenget stikker opp
const s = [], g = []; for (let i = 0; i <= 40; i++) { s.push(i * 2); g.push(i === 20 ? 9 : 10 - 30 * Math.sin(Math.PI * i / 40)); }
const z = B.profil(g, s);
sjekk(z.every((v, i) => v >= g[i] + (s[i] >= 6 && s[i] <= 74 ? 1.1 : .15) - 1e-9) && Math.abs(z[0] - g[0] - .15) < 1e-9, `dekket minst 1,1 m over terrenget, i endene i vegens høyde (minste klaring inne på brua ${Math.min(...z.filter((v, i) => s[i] >= 6 && s[i] <= 74).map((v, i) => v - g[i + 3])).toFixed(2)} m)`);

// brutyper
sjekk(B.velgType({ lengde: 8, klaring: 2, type: 0 }) === 'plate', 'kort bru: platebru');
sjekk(B.velgType({ lengde: 70, klaring: 8, type: 0 }) === 'bjelke', 'middels, lav: bjelkebru');
sjekk(B.velgType({ lengde: 90, klaring: 30, type: 0, bueMulig: true }) === 'bue', 'over juv: buebru');
sjekk(B.velgType({ lengde: 90, klaring: 30, type: 0, bueMulig: false }) === 'bjelke', 'høy, men ingen dal å spenne over: bjelkebru');
sjekk(B.velgType({ lengde: 800, klaring: 40, type: 0 }) === 'henge', 'lang og høy: hengebru');
sjekk(B.velgType({ lengde: 60, klaring: 5, type: 2 }) === 'fagverk', 'jernbanebru: fagverk');
// søyler: bare der det er plass, og flere jo lengre
const sø = B.søyler(120, x => (x > 50 && x < 70 ? 1 : 10), 10);
sjekk(sø.length === 2 && sø.every(x => x < 50 || x > 70), `søyler i 120 m bru: ${sø.map(x => x.toFixed(0)).join(', ')} (ikke der klaringen er 1 m)`);
// buen: fotpunktene nede i dalsidene
const g2 = s.map((_, i) => 10 - 30 * Math.sin(Math.PI * i / 40)), bu = B.bue(s, g2, B.profil(g2, s).map(v => v - 2));
sjekk(bu && bu.s0 > 0 && bu.s1 < 80 && bu.topp > bu.z0, `buen spenner fra ${bu && bu.s0} til ${bu && bu.s1} m`);
sjekk(B.bue(s, s.map(() => 0), s.map(() => 4)) === null, 'flat dal: ingen bue');
// sprengt: gap i midten
const st = B.stykker(100, true);
sjekk(st.length === 2 && st[0][1] === 35 && st[1][0] === 65, 'sprengt bru: gap fra 35 til 65 m');

// ferjekaien: retning fra ferjelinja, ellers mot mest vann; vannkanten
const vann = (x, y) => x > 40;   // havet øst for x = 40
sjekk(JSON.stringify(B.kaiRetning(0, 0, [[[30, 2], [200, 2], [900, 300]]], vann).map(v => Math.round(v * 10) / 10)) === '[1,0]', 'retning langs ferjelinja');
const rv = B.kaiRetning(0, 0, [], vann); sjekk(rv && rv[0] > .9, `retning mot vannet uten ferjelinje (${rv && rv.map(v => v.toFixed(2))})`);
sjekk(B.vannkant(0, 0, 1, 0, vann) === 42, 'vannkanten 42 m ut');
sjekk(B.vannkant(60, 0, 1, 0, vann) === -18, 'kaien i vannet: vannkanten 18 m bak');
sjekk(B.vannkant(0, 0, -1, 0, vann) === null, 'ingen vann den veien');

// nødbru: en veg (punkt hver 2,5 m langs x-aksen) krysser en elv som er 20 m bred (x 100–120) og renner langs y
const rett = []; for (let x = 0; x <= 300; x += 2.5) rett.push([x, 0]);
const elv = (x, y) => x >= 100 && x <= 120;
const kr = B.elvekryss(rett, elv, 3);
sjekk(kr.length === 1 && rett[kr[0].i0][0] <= 95 && rett[kr[0].i0][0] >= 90 && rett[kr[0].i1][0] >= 125 && rett[kr[0].i1][0] <= 130, `vegen over elva får bru fra ${kr[0] && rett[kr[0].i0][0]} til ${kr[0] && rett[kr[0].i1][0]} m (elva 100–120)`);
// vegen går langs bredden (vann bare på den ene siden): ingen bru
sjekk(B.elvekryss(rett, (x, y) => x >= 100 && x <= 120 && y >= -1, 3).length === 0, 'veg langs bredden får ingen bru');
// vegen ender i vannet (båtplass) eller går langt over vann (ferje): ingen bru
sjekk(B.elvekryss(rett, (x, y) => x >= 280, 3).length === 0, 'veg som ender i vannet får ingen bru');
sjekk(B.elvekryss(rett, (x, y) => x >= 100 && x <= 200, 3).length === 0, 'hundre meter over vann er ikke en nødbru (ferjesamband)');
// to elver: to bruer
sjekk(B.elvekryss(rett, (x, y) => (x >= 50 && x <= 56) || (x >= 200 && x <= 230), 3).length === 2, 'to elver gir to bruer');

// seilingshøyde: lang bru over sjø løftes midt på, korte bruer, bruer over land og gangbruer ikke
sjekk(Math.abs(B.seilingshøyde(1036, .9, 0) - 23) < .1 && B.seilingshøyde(3000, .9, 0) === 40, `Tromsøbrua (1036 m over sjø) får ${B.seilingshøyde(1036, .9, 0).toFixed(1)} m, aldri over 40 m`);
sjekk(B.seilingshøyde(80, .9, 0) === 0 && B.seilingshøyde(500, .2, 0) === 0 && B.seilingshøyde(500, .9, 1) === 0, 'kort bru, bru over land og gangbru får ingen seilingshøyde');
{ const s = [], g = []; for (let x = 0; x <= 1000; x += 10) { s.push(x); g.push(x < 50 || x > 950 ? 6 : 0); }
  const z = B.profil(g, s, 1.1, 22), topp = Math.max(...z), stig = Math.max(...z.map((v, i) => i ? Math.abs(v - z[i - 1]) / 10 : 0));
  sjekk(topp > 26 && topp < 30 && Math.abs(z[0] - 6.15) < .01 && stig < .1, `dekket med seilingshøyde: toppen ${topp.toFixed(1)} m, endene i vegens høyde, bratteste stigning ${(stig * 100).toFixed(1)} %`); }

console.log(feil ? `${feil} FEIL` : 'alle testene for bruer og kaier er ok'); process.exit(feil ? 1 : 0);
