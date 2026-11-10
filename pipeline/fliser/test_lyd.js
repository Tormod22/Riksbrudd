// Test av lydreglene (site/dovre-fliser/spill/lyd.js): hvor sterk hver lyd er etter vær, sted og tid.
const L = require('../../site/dovre-fliser/spill/lyd.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const grunn = { vind: 3, høyde: 1.7, hav: 0, innsjø: 0, regn: 0, snø: 0, mørke: 0, årstid: 'sommer', skog: 0, by: 0 };
const N = o => L.nivåer({ ...grunn, ...o });
ok(N({ vind: 16 }).vind > N({ vind: 2 }).vind * 2, 'mer vindsus i storm enn i bris');
ok(N({ vind: 2 }).plyst === 0 && N({ vind: 18 }).plyst > .5, 'plystring bare i kuling/storm');
ok(N({ hav: 1 }).hav > .3 && N({ hav: 1, høyde: 600 }).hav < .01, 'bølgene høres ved sjøen, ikke 600 m oppe');
ok(N({ hav: 1, vind: 14 }).hav > N({ hav: 1, vind: 1 }).hav * 1.8, 'høyere brenninger når det blåser');
ok(N({ skog: 1 }).fugler > .7, 'fugler i skogen en sommerdag: ' + N({ skog: 1 }).fugler.toFixed(2));
ok(N({ skog: 1, årstid: 'vinter' }).fugler === 0, 'ingen fuglesang om vinteren');
ok(N({ skog: 1, mørke: 1 }).fugler < .01, 'ingen fuglesang om natta');
ok(N({ skog: 1, regn: 1 }).fugler < .01, 'ingen fuglesang i regnet');
ok(N({ hav: 1 }).måker > .5 && N({}).måker === 0, 'måker bare ved sjøen');
ok(N({ regn: 1 }).regn > .9 && N({}).regn === 0, 'regnlyd etter regnmengden');
ok(N({ by: 1 }).by > N({ by: 1, mørke: 1 }).by, 'mer bylyd om dagen enn om natta');
ok(L.skritt(0) === 0 && L.skritt(1.7) > 1.5 && L.skritt(5.5) > L.skritt(1.7), 'fottrinn i takt med farten');
for (const o of [{}, { vind: 30, høyde: 5000 }, { hav: 1, innsjø: 1, regn: 1, by: 1, skog: 1 }]) { const n = N(o); ok(Object.values(n).every(v => v >= 0 && v <= 1.0001), 'alle nivåer mellom 0 og 1: ' + JSON.stringify(o)); }
process.exit(feil ? 1 : 0);
