// Test av reglene for stiene i 3D (site/dovre-fliser/spill/sti3d.js, R19-5). Kjør: node pipeline/fliser/test_sti3d.js
const S = require('../../site/dovre-fliser/spill/sti3d.js');
let feil = 0; const sjekk = (n, ok, info) => { console.log((ok ? 'ok   ' : 'FEIL ') + n + (info !== undefined ? '  ' + JSON.stringify(info) : '')); if (!ok) feil++; };

const P = S.tett([[0, 0], [30, 0]]);
sjekk('tett: punkt hver 3. m', P.length === 11 && Math.abs(P[1][0] - 3) < 1e-9, P.length);
// klipp: en linje som går ut og inn av boksen gir to biter, og ingen punkt utenfor
const K = S.klipp([[-10, 5], [10, 5], [30, 5], [30, 15], [10, 15], [-5, 15]], [0, 0, 20, 20]);
sjekk('klipp: to biter', K.length === 2, K.length);
sjekk('klipp: alt inne i boksen', K.every(d => d.every(([x, y]) => x >= -1e-9 && x <= 20 + 1e-9 && y >= 0 && y <= 20)));
sjekk('klipp: biten starter på kanten', Math.abs(K[0][0][0]) < 1e-9 && Math.abs(K[0][K[0].length - 1][0] - 20) < 1e-9, K[0]);
sjekk('klipp: helt utenfor gir ingenting', S.klipp([[30, 30], [40, 40]], [0, 0, 20, 20]).length === 0);
// bredde
sjekk('bredde: sti', S.bredde({ t: 0, v: 0, s: 2 }) === S.REGLER.bredde.sti);
sjekk('bredde: traktorveg bredere', S.bredde({ t: 1 }) > S.bredde({ t: 0 }));
sjekk('bredde: utydelig smalere', S.bredde({ t: 0, v: 3 }) < S.bredde({ t: 0 }));
// utsatt
sjekk('utsatt: flatt er ikke utsatt', !S.utsatt(100, 100, 100, 3));
sjekk('utsatt: stup på siden', S.utsatt(100, 92, 101, 1));
sjekk('utsatt: vanskelig sti trenger mindre fall', S.utsatt(100, 96.5, 101, 3) && !S.utsatt(100, 96.5, 101, 1));
// merker: på 2 km rett sti i snitt ca. hvert 70. m, aldri nærmere enn 45 m, og det samme hver gang
const lang = S.tett([[205000, 6920000], [207000, 6920000]]), M = S.merker(lang);
const avst = M.slice(1).map((i, k) => (i - M[k]) * S.REGLER.steg);
sjekk('merker: mellom 15 og 45 merker på 2 km', M.length >= 15 && M.length <= 45, M.length);
sjekk('merker: minst 45 m mellom', Math.min(...avst) >= S.REGLER.merke.min - 1e-9, Math.min(...avst));
sjekk('merker: aldri over 115 m mellom', Math.max(...avst) <= S.REGLER.merke.snitt * 1.6 + S.REGLER.steg, Math.max(...avst));
sjekk('merker: fast etter stedet', JSON.stringify(S.merker(lang)) === JSON.stringify(M));
// rutenett, nærmest og fart
const R = S.rutenett([{ P: S.tett([[0, 0], [100, 0]]), w: .7, t: 0 }, { P: S.tett([[0, 50], [100, 50]]), w: 2.6, t: 1 }]);
sjekk('på stien', S.nærmest(R, 40, .2).d < 0);
sjekk('5 m unna er ikke på stien', S.nærmest(R, 40, 5) === null || S.nærmest(R, 40, 5).d > 4);
sjekk('fart: raskere på stien', S.fart(R, 40, .1) === S.REGLER.fart.sti && S.REGLER.fart.sti > 1);
sjekk('fart: traktorveg', S.fart(R, 40, 50.5) === S.REGLER.fart.traktor);
sjekk('fart: vanlig i terrenget', S.fart(R, 40, 20) === 1);
sjekk('fart: uten stier', S.fart(null, 0, 0) === 1);
sjekk('biter', JSON.stringify(S.biter([1, 1, 0, 1, 1, 1, 0, 1].map(Boolean), 2)) === '[[0,1],[3,5]]');
console.log('test_sti3d:', feil ? 'FEIL' : 'alt ok', `(${feil} feil)`); process.exit(feil ? 1 : 0);
