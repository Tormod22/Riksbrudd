// Test for spill/oppstart.js (K1): node pipeline/fliser/test_oppstart.js
const O = require('../../site/dovre-fliser/spill/oppstart.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const S = O.standard();
ok(O.feil(S).length === 2, 'tomme navn gir to feil: ' + O.feil(S).join(' '));
S.karakter.navn = '  Kari   Nordmann '; S.fraksjon.navn = 'Dovrefolket';
ok(O.feil(S).length === 0, 'navn på karakter og fraksjon: ingen feil');
S.fraksjon.flagg.bokstaver = 'ABCD'; ok(O.feil(S).length === 1, 'fire bokstaver i flagget er for mange');
S.fraksjon.flagg.bokstaver = 'dø';
// leirplassen: tettsted, vann, utenfor kartet, godt sted
const v = { iTettsted: (x, y) => (x > 0 && x < 100 ? 'Dombås' : null), klasse: (x, y) => (x > 1000 ? 255 : x < -100 ? 3 : 2) };
ok(/Dombås/.test(O.gyldigLeir(50, 0, v)), 'ikke i et tettsted');
ok(/vann/.test(O.gyldigLeir(-500, 0, v)), 'ikke i vann');
ok(/kart/.test(O.gyldigLeir(5000, 0, v)), 'ikke utenfor kartet');
ok(O.gyldigLeir(500, 0, v) === null, 'utenfor tettstedet på land: godkjent');
// fullfør: pengene og bonusen
S.karakter.bakgrunn = 'forretningsmann'; ok(O.fullfør(S, { x: 500.4, y: 7.6 }).length === 0 && S.ferdig, 'fullført');
ok(S.penger === 110e6 && O.kroner(S.penger) === '110 mill. kr', 'forretningsmann starter med ' + O.kroner(S.penger));
ok(S.karakter.navn === 'Kari Nordmann' && S.fraksjon.flagg.bokstaver === 'DØ' && S.leir.x === 500, 'navnet ryddet, bokstavene store, leiren avrundet');
const T = O.standard(); T.karakter.navn = 'Ola'; T.fraksjon.navn = 'Ulvene'; O.fullfør(T, { x: 1, y: 1 });
ok(T.penger === 100e6 && O.kroner(T.penger) === '100 mill. kr', 'soldat starter med 100 mill. kr og bonus treff ×' + O.bonus(T).treff);
// lagring
const L = O.fraJSON(O.tilJSON(S)); ok(L && L.ferdig && L.fraksjon.navn === 'Dovrefolket' && L.penger === 110e6, 'lagret og lest inn igjen');
ok(O.fraJSON('{ødelagt') === null && O.fraJSON('{"versjon":9}') === null, 'ødelagt eller ukjent lagring gir ny start');
ok(O.kroner(2.5e6) === '2,5 mill. kr' && O.kroner(15000).replace(/\s/g, ' ') === '15 000 kr', 'kronetekst: ' + O.kroner(2.5e6) + ', ' + O.kroner(15000));
ok(O.hovedfarge({ farger: ['#f2efe6', '#1d3557', '#000000'] }) === '#1d3557', 'hovedfargen hopper over hvitt');
// alle symbolene og mønstrene kan tegnes (falskt lerret som bare teller kall)
let kall = 0; const g = new Proxy({}, { get: (o, k) => (k in o ? o[k] : (...a) => { kall++; }), set: (o, k, v) => { o[k] = v; return true; } });
for (const m of O.MØNSTER) for (const s of O.SYMBOL) O.tegnFlagg(g, { mønster: m, farger: ['#111111', '#eeeeee', '#aa2222'], symbol: s, symbolfarge: '#ffffff', bokstaver: 'AB', bokstavfarge: '#000000' }, 90, 60);
ok(kall > 1000, `${O.MØNSTER.length} mønstre × ${O.SYMBOL.length} symboler tegnet uten feil (${kall} tegnekall)`);
// portrettet (Karakterstudio v3): ukjente valg byttes med standard, navnet følger karakteren, SVG lages
const U = O.standard(); U.karakter.navn = 'Per <b>'; U.fraksjon.navn = 'Fjellfolket'; U.karakter.portrett = { ...U.karakter.portrett, hair: 'braid', outfit: 'tull', skin: '#123456' };
O.fullfør(U, { x: 1, y: 1 }); const svg = O.P.renderSVG(U.karakter.portrett);
ok(U.karakter.portrett.hair === 'braid' && U.karakter.portrett.outfit === 'feltuniform' && U.karakter.portrett.skin !== '#123456', 'portrettet: kjent frisyre beholdt, ukjent antrekk og farge byttet ut');
ok(svg.startsWith('<svg') && svg.includes('Per b') && !svg.includes('<b>'), 'portrettet tegnes som SVG, og navnet kan ikke lage HTML');
process.exit(feil ? 1 : 0);
