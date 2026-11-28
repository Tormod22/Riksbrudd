// Test for spill/leirlyd.js (ut9-liv2): når hverdagslydene i leiren kommer, i hvilke timer, og hvor sterke de er. Kjør: node pipeline/fliser/test_leirlyd.js
const LY = require(require('path').join(__dirname, '../../site/dovre-fliser/spill/leirlyd.js'));
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
ok(LY.aktiv('hammer', 10) && !LY.aktiv('hammer', 20) && !LY.aktiv('hammer', 3), 'hammerslag bare i arbeidstida');
ok(LY.aktiv('prat', 19) && !LY.aktiv('prat', 12), 'prat ved kjøkkenet om kvelden');
ok(LY.aktiv('bjeff', 12) && !LY.aktiv('bjeff', 2), 'hunden bjeffer ikke midt på natta');
ok(LY.styrke('bjeff', 0) === LY.REGLER.bjeff.styrke && LY.styrke('bjeff', 45) < LY.styrke('bjeff', 10) && LY.styrke('bjeff', 200) === 0, 'svakere på avstand, stille langt unna');
ok(Object.values(LY.REGLER).every(R => R.styrke <= .1), 'dempet: ingen lyd sterkere enn 0,1');
{ const r = LY.rekke(5); let t = 0, min = 1e9, maks = 0; for (let i = 0; i < 500; i++) { const n = LY.neste('bjeff', t, r); min = Math.min(min, n - t); maks = Math.max(maks, n - t); t = n; }
  ok(min >= 25 && maks <= 70, `bjeffingen kommer hvert 25–70 s (${min.toFixed(1)}–${maks.toFixed(1)})`); }
{ const a = LY.rekke(9), b = LY.rekke(9); ok([1, 2, 3].map(() => a()).join() === [1, 2, 3].map(() => b()).join(), 'samme frø gir samme rekke'); }
// selvtest: en feil med vilje skal fanges
ok(!(LY.styrke('hammer', LY.REGLER.hammer.maks + 1) > 0), 'selvtest: utenfor rekkevidden er det stille');
console.log(feil ? `\n${feil} FEIL` : '\nalle ok'); process.exit(feil ? 1 : 0);
