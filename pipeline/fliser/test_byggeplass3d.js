// Test: node pipeline/fliser/test_byggeplass3d.js – byggeplassen og den nye leiren i 3D (spill/byggeplass3d.js, runde 8)
const B = require('../../site/dovre-fliser/spill/byggeplass3d.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const s0 = B.stadium(0); ok(s0.stikker && s0.grunn === 0 && s0.materialer, 'p = 0: bare stikker og snor, materialene ligger klare');
const s1 = B.stadium(.1); ok(!s1.stikker && s1.grunn > .4 && s1.grunn < 1 && s1.reisverk === 0 && s1.stillas, 'p = 0,1: grunnmuren støpes, stillaset står');
const s3 = B.stadium(.35); ok(s3.grunn === 1 && s3.reisverk > .4 && s3.reisverk < .6 && s3.tak === 0, 'p = 0,35: halve reisverket står, ikke tak ennå');
const s7 = B.stadium(.7); ok(s7.reisverk === 1 && Math.abs(s7.tak - .5) < 1e-9 && s7.kledning > 0, 'p = 0,7: halve taket lagt, kledningen kommer');
const s9 = B.stadium(.98); ok(s9.tak === 1 && s9.kledning === 1 && !s9.stillas && !s9.materialer, 'p = 0,98: tak og kledning ferdig, stillaset og materialene borte');
ok(B.stadium(NaN).stikker && B.stadium(-1).stikker && B.stadium(2).tak === 1, 'ugyldig framdrift tåles');
// trinnene: framdriften gjennom hele byggingen går gjennom grunnmur -> reisverk -> tak, aldri tilbake
{ let før = null, ned = false; for (let p = 0; p <= 1; p += .01) { const s = B.stadium(p); if (før && (s.grunn < før.grunn || s.reisverk < før.reisverk || s.tak < før.tak || s.kledning < før.kledning)) ned = true; før = s; }
  ok(!ned, 'trinnene går bare framover'); }
ok(B.nøkkel(0) === 0 && B.nøkkel(.049) === 0 && B.nøkkel(.05) === 1 && B.nøkkel(1) === 20, 'ny modell for hvert 5. prosent');
const st = B.stolper(10, 1.2); ok(st[0] === 0 && st[st.length - 1] === 10 && st.every((v, i) => !i || v - st[i - 1] <= 1.2 + 1e-9), 'stolpene langs 10 m: høyst 1,2 m mellom, begge ender med');
// den nye leiren
const t = B.leirting(3, .3, null), typer = t.map(q => q.type);
ok(typer.includes('bål') && typer.filter(q => q === 'telt').length === 3 && typer.includes('kasser') && typer.includes('fat') && typer.includes('ved'), 'ny leir: bål, tre telt, kasser, fat og ved – ' + typer.join(', '));
ok(t.every((a, i) => t.every((b, j) => i === j || Math.hypot(a.x - b.x, a.y - b.y) >= a.r + b.r + B.REGLER.leir.luft - 1e-9)), 'ingen av tingene står oppå hverandre');
ok(t.every(q => Math.hypot(q.x, q.y) >= 7 && Math.hypot(q.x, q.y) <= 18), 'alt står 7–18 m fra midten (flaggstanga står fri)');
ok(t.filter(q => q.type === 'telt').every(q => Math.abs(Math.atan2(-q.y, -q.x) - q.ret) < 1e-9), 'teltene har åpningen mot midten');
ok(JSON.stringify(B.leirting(3, .3, null)) === JSON.stringify(t) && JSON.stringify(B.leirting(3, .7, null)) !== JSON.stringify(t), 'samme leir gir samme plass, en annen leir en annen');
// opptatt: et bygg øst for midten (x 5–25) – ingenting havner der
const opptatt = (x, y, r) => x > 5 - r && x < 25 + r && Math.abs(y) < 8 + r;
const t2 = B.leirting(3, 0, opptatt); ok(t2.length >= 6 && t2.every(q => !opptatt(q.x, q.y, q.r)), `med et bygg i øst: ${t2.length} ting, ingen i bygget`);
ok(B.antallTelt(0) === 3 && B.antallTelt(1) === 1 && B.leirting(1, .3, null).filter(q => q.type === 'telt').length === 1, 'tre telt til den første brakka er ferdig, så ett');
ok(B.leirting(3, .3, () => true).length === 0, 'helt fullt rundt leiren: ingen ting');
process.exit(feil ? 1 : 0);
