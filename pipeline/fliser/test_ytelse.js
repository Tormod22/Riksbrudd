// Test av reglene i måleverktøyet (site/dovre-fliser/spill/ytelse.js): median, kilden til en ting i scenen, nettlesernavn, tabell og vurdering.
const Y = require('../../site/dovre-fliser/spill/ytelse.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
ok(Y.median([5, 1, 9]) === 5 && Y.median([4, 2, 8, 6]) === 5 && Y.median([]) === 0 && Y.median([16, 17, 400, 16, 17]) === 17, 'median: midterste verdi, og ett tregt bilde teller ikke');
const stakk = 'Error\n    at R.scene.add (https://x.no/dovre-fliser/spill/ytelse.js?v=1:60:90)\n    at ruteNett (https://x.no/dovre-fliser:1044:13)\n    at Object.gjerder (https://x.no/dovre-fliser/spill/gard3d.js?v=ab12:140:7)\n    at https://x.no/dovre-fliser/spill/liv3d.js?v=cd:9:1';
ok(Y.kilde(stakk) === 'gard3d', 'kilden er første fil i spill/ som ikke er måleverktøyet selv: ' + Y.kilde(stakk));
ok(Y.kilde('add@https://x.no/dovre-fliser/spill/ytelse.js:60:90\nlag@https://x.no/dovre-fliser/spill/bekker-visning.js:169:5') === 'bekker-visning', 'stakken fra Safari leses også');
ok(Y.kilde('Error\n    at sett3d (https://x.no/dovre-fliser:2177:60)') === 'index' && Y.kilde('') === 'index' && Y.kilde(undefined) === 'index', 'uten fil i spill/ er kilden index.html');
ok(Y.nettleser('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0') === 'Edge 142 på Windows', 'Edge på Windows kjennes igjen');
ok(Y.nettleser('Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1') === 'Safari 18 på iPhone/iPad', 'Safari på iPhone kjennes igjen');
ok(Y.nettleser('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36') === 'Chrome 141 på Linux' && /ukjent/.test(Y.nettleser('')), 'Chrome på Linux og tom tekst');
ok(Y.des(96.04) === '96,0' && Y.des(1.25, 2) === '1,25' && Y.hel(812345) === '812 345' && Y.hel(999) === '999', 'tall skrives med komma og mellomrom');
const rad = (navn, ms, x) => Object.assign({ navn, ms, tri: 1000, kall: 10 }, x);
const r = { hode: ['RIKSBRUDD', 'Grafikkort: Intel(R) Iris(R) Xe Graphics'], js: 12, tegn: 9,
  rader: [rad('Hele bildet', 100), rad('Med halv oppløsning', 90, { halv: true, tri: null, kall: null }), rad('Uten bakken', 85, { del: 'bakke' }), rad('Uten trær og busker', 55, { del: 'trær' }), rad('Hele bildet (til slutt)', 102, { slutt: true, tri: null, kall: null })] };
const t = Y.tabell(r), linjer = t.split('\n');
ok(linjer[0] === 'RIKSBRUDD' && /Grafikkort: Intel/.test(linjer[1]) && /ms\/bilde/.test(linjer[3]) && /^Hele bildet\s+100,0\s+10,0/.test(linjer[4]) && /spillets regning\s+12,0/.test(linjer[5]), 'tabellen har hode, overskrifter, hele bildet og spillets regning');
ok(Y.grunnlag(r) === 101 && Y.grunnlag({ rader: [rad('Hele bildet', 80)] }) === 80, 'grunnlaget er snittet av hele bildet først og sist (uten sluttmåling: den første)');
ok(/^Uten trær og busker\s+55,0\s+18,2\s+46,0\s+1 000\s+10$/.test(linjer.find(l => /^Uten trær/.test(l))), 'raden for trærne viser tid, bilder i sekundet og hva som spares mot grunnlaget');
ok(!/-2,0/.test(linjer[linjer.length - 1]), 'kontrollmålingen til slutt har ingen «sparer»');
const v = Y.vurdering(r);
ok(v.length === 2 && /Mengden ting/.test(v[0]) && /trær og busker \(46,0 ms av 101,0\)/.test(v[1]), 'vurdering: tingene i bildet betyr mest, størst post er trærne');
ok(/punkter på skjermen/.test(Y.vurdering({ js: 10, rader: [rad('Hele bildet', 100), rad('Med halv oppløsning', 50, { halv: true })] })[0]), 'vurdering: halv oppløsning som halverer tiden = punktene betyr mest');
ok(/prosessoren/.test(Y.vurdering({ js: 70, rader: [rad('Hele bildet', 100), rad('Med halv oppløsning', 95, { halv: true })] })[0]), 'vurdering: mest tid i spillets egen regning = prosessoren');
ok(/så fort skjermen tillater/.test(Y.vurdering({ js: 3, rader: [rad('Hele bildet', 16.7)] })[0]) && Y.vurdering({ rader: [rad('Hele bildet', 0)] }).length === 0, 'vurdering: 60 bilder i sekundet sier lite, og uten måling ingen vurdering');
// skjermens tak: med flere tegninger per bilde står det i tabellen, overskriften sier «per tegning», og vurderingen sier hva maskinen klarer
const rk = { hode: ['RIKSBRUDD'], js: 4, tegn: 1.7, ganger: 16, skjerm: 16.7,
  rader: [rad('Hele bildet', 6), rad('Med halv oppløsning', 5.5, { halv: true, tri: null, kall: null }), rad('Uten bakken', 5, { del: 'bakke' }), rad('Uten trær og busker', 3.5, { del: 'trær' }), rad('Hele bildet (til slutt)', 6.2, { slutt: true, tri: null, kall: null })] };
const tk = Y.tabell(rk), vk = Y.vurdering(rk);
ok(/høyst 60 bilder i sekundet/.test(tk) && /tegnet 16 ganger per bilde/.test(tk) && /ms\/tegn\./.test(tk) && !/ms\/bilde/.test(tk), 'skjermens tak: tabellen sier at bildet er tegnet flere ganger og at tallene gjelder én tegning');
ok(/Maskinen lager et bilde på 8,4 ms – nok til ca. 119 bilder i sekundet her, mens skjermen viser 60/.test(vk[0]) && /Mengden ting/.test(vk[1]) && /trær og busker \(2,6 ms av 6,1\)/.test(vk[2]), 'skjermens tak: vurderingen sier hva maskinen klarer og hva som koster mest: ' + vk[0]);
ok(!/så fort skjermen tillater/.test(vk.join(' ')), 'skjermens tak: «målingen sier lite» sies ikke når bildet er tegnet flere ganger');
ok(Y.erTak(16.7, 16.7) && Y.erTak(16.7, 18.5) && !Y.erTak(16.7, 20) && !Y.erTak(16.7, 240) && Y.erTak(8.3, 8.4) && !Y.erTak(0, 5), 'skjermens tak: bildet ligger på takten når det tar høyst 15 % mer (60 og 120 bilder i sekundet), ikke ellers');
ok(!Y.nokTegninger(16.7, 2, 16.7) && !Y.nokTegninger(16.7, 4, 50) && Y.nokTegninger(16.7, 8, 66.8) && Y.nokTegninger(16.7, 64, 16.7), 'nok tegninger når bildet tar minst fire takter, eller ved 64');
// hakk: oppsummeringen teller pausene, sorterer dem og deler dem etter hva som skjedde
const ht = Y.hakkTekst(['RIKSBRUDD – MÅLING AV HAKK (20 s)'], [{ dt: 96, hva: 'bygging' }, { dt: 212, hva: 'bytte' }, { dt: 55, hva: 'ellers' }, { dt: 71, hva: 'bygging' }], 1100, 20).split('\n');
ok(ht[0] === 'RIKSBRUDD – MÅLING AV HAKK (20 s)' && /Bilder: 1 100 på 20 s \(55 per sekund i snitt\)/.test(ht[2]) && /Pauser over 50 ms: 4 – den lengste 212 ms \(sum 434 ms\)/.test(ht[3]), 'hakk: antall bilder, antall pauser, den lengste og summen');
ok(/da et nytt område ble satt inn: 1 \(lengste 212 ms\)/.test(ht[4]) && /mens et nytt område ble bygget: 2 \(lengste 96 ms\)/.test(ht[5]) && /ellers: 1 \(lengste 55 ms\)/.test(ht[6]) && /^De lengste: 212 ms \(bytte\), 96 ms \(bygging\), 71 ms \(bygging\), 55 ms \(ellers\)$/.test(ht[7]), 'hakk: pausene delt etter hva som skjedde, lengst først');
// hakk: stedet i koden, i Chrome- og Safari-form, og summen per sted
ok(Y.stedFraStakk('Error\n    at pusterom (http://x/norge:1417:60)\n    at pust (http://x/norge:1423:70)\n    at async Object.f (http://x/dovre-fliser/spill/liv3d.js?v=ab12:88:13)') === 'liv3d.js:88 Object.f', 'hakk: sted fra Chrome-stakk: ' + Y.stedFraStakk('Error\n    at pusterom (http://x/norge:1417:60)\n    at pust (http://x/norge:1423:70)\n    at async Object.f (http://x/dovre-fliser/spill/liv3d.js?v=ab12:88:13)'));
ok(Y.stedFraStakk('pusterom@https://x/norge:1417:60\npust@https://x/norge:1423:70\nbygg3d@https://x/norge:1290:33') === 'norge:1290 bygg3d', 'hakk: sted fra Safari-stakk: ' + Y.stedFraStakk('pusterom@https://x/norge:1417:60\npust@https://x/norge:1423:70\nbygg3d@https://x/norge:1290:33'));
{ const t = Y.hakkTekst([], [{ dt: 300, hva: 'bygging', sted: 'a → b' }, { dt: 200, hva: 'bygging', sted: 'a → b' }, { dt: 90, hva: 'bygging', sted: 'c → d' }], 800, 20);
  ok(/Hvor i koden/.test(t) && /  500 ms, 2, 300 ms: a → b\n  90 ms, 1, 90 ms: c → d/.test(t), 'hakk: summen per sted, tyngst først'); }
ok(/Ingen pauser over 50 ms/.test(Y.hakkTekst([], [], 1200, 20)), 'hakk: uten pauser sier rapporten at bildet gikk jevnt');
process.exit(feil ? 1 : 0);
