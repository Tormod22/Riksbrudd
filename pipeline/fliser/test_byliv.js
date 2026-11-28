// Test for spill/byliv3d.js (reglene øverst, ut9-liv2): folk på benkene, hunder og syklister. Kjør: node pipeline/fliser/test_byliv.js
const BL = require(require('path').join(__dirname, '../../site/dovre-fliser/spill/byliv3d.js'));
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const benker = []; for (let i = 0; i < 60; i++) benker.push(i * 13.7, (i % 7) * 21.3, 600 + i * .1, (i % 4) * Math.PI / 2);
const S = BL.benkFolk(benker, 14, false, false);
ok(S.length > 5 && S.length <= BL.REGLER.benk.maks[0], 'folk på en del av benkene om dagen (' + S.length + ')');
ok(BL.benkFolk(benker, 14, true, false).length <= BL.REGLER.benk.maks[1], 'færre på telefon');
ok(BL.benkFolk(benker, 2, false, false).length === 0 && BL.benkFolk(benker, 14, false, true).length === 0, 'ingen på benkene om natta eller i regn');
// hver som sitter, er innenfor benken (1,8 m lang): høyst 0,5 m langs og 0,1 m på tvers fra midten, og ser fram (benkens +y)
ok(S.every(p => { let best = 1e9, ok2 = false; for (let k = 0; k < benker.length; k += 4) { const dx = p.x - benker[k], dy = p.y - benker[k + 1], a = benker[k + 3], l = dx * Math.cos(a) + dy * Math.sin(a), t = -dx * Math.sin(a) + dy * Math.cos(a), d = Math.hypot(dx, dy);
  if (d < best) { best = d; ok2 = Math.abs(l) <= .5 && Math.abs(t) <= .1 && Math.abs(Math.sin(p.a - a - Math.PI / 2)) < 1e-9 && p.z === benker[k + 2]; } } return ok2; }), 'de sitter på benken og ser fram mot vegen');
ok(JSON.stringify(BL.benkFolk(benker, 14, false, false)) === JSON.stringify(S), 'samme benker gir samme folk');
ok(BL.medHund(20).length === 4 && BL.medHund(20).every(i => i < 20), 'hver femte fotgjenger går med hund');
const linjer = [{ L: 120, w: 3, g: 0 }, { L: 200, g: 1, w: 1 }, { L: 20, g: 1, w: 1 }], Sy = BL.syklister(linjer, false);
ok(Sy.length === BL.REGLER.sykkel.antall[0] && Sy.every(o => o.v === linjer[1]), 'syklistene bruker gang- og sykkelvegen (lang nok) når den finnes');
ok(BL.syklister([{ L: 120, w: 3, g: 0 }], true).every(o => o.side === 3.9), 'uten gang- og sykkelveg: på fortauet (ikke i vegbanen)');
{ const o = { ...Sy[0] }; let inne = true; for (let k = 0; k < 400; k++) { BL.sykkelSteg(o, .25); if (o.s < 0 || o.s > o.v.L) inne = false; } ok(inne, 'syklisten holder seg på linja og snur i endene'); }
ok(BL.syklister([], false).length === 0, 'ingen linjer: ingen syklister');
console.log(feil ? `\n${feil} FEIL` : '\nalle ok'); process.exit(feil ? 1 : 0);
