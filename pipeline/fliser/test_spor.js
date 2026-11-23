// Forlatte steder (site/dovre-fliser/spill/spor.js): historiene, lappene, kalenderen, tettstedene og lyden
const S = require('../../site/dovre-fliser/spill/spor.js'), I = require('../../site/dovre-fliser/spill/interior.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
// lappene: 40–60, unike id-er, korte (1–4 setninger), ingen tomme felt, alle grupper har noen
ok(S.LAPPER.length >= 40 && S.LAPPER.length <= 60, `${S.LAPPER.length} lapper (40–60)`);
ok(new Set(S.LAPPER.map(l => l.id)).size === S.LAPPER.length, 'id-ene er unike');
const setninger = t => (t.match(/[.!?»](\s+[A-ZÆØÅ«]|$)/g) || []).length;
const lange = S.LAPPER.filter(l => setninger(l.tekst) < 1 || setninger(l.tekst) > 4 || l.tekst.length > 260);
ok(!lange.length, 'alle lappene har 1–4 setninger og under 260 tegn' + (lange.length ? ': ' + lange.map(l => l.id).join(', ') : ''));
for (const g of Object.keys(S.HISTORIER)) ok(S.LAPPER.some(l => l.g === g), 'gruppen ' + g + ' har lapper');
ok(S.LAPPER.filter(l => l.peker === 'gjemt').length >= 5, 'noen lapper peker videre til et gjemt lager');
ok(!S.LAPPER.some(l => /Silent|Hill|monster|demon|spøkelse/i.test(l.tekst + l.tittel)), 'ingen lån fra andre spill og ingenting overnaturlig');
// alle byggklassene fra kartet har en gruppe
ok(Object.keys(I.KLASSE).every(k => I.KLASSE[k].leir || S.GRUPPE[k]), 'alle byggklassene fra kartet har en gruppe');
// fast per bygg
ok(JSON.stringify(S.historie('hus', 1234)) === JSON.stringify(S.historie('hus', 1234)) && S.lapp('hus', 77) === S.lapp('hus', 77), 'samme bygg gir samme historie og lapp');
// historiene fordeler seg, og alle boligsporene finnes
{ const navn = {}, ting = {}; for (let i = 0; i < 3000; i++) { const h = S.historie('hus', i * 13 + 5); navn[h.navn] = (navn[h.navn] || 0) + 1; for (const t in h.ting) ting[t] = (ting[t] || 0) + 1; }
  ok(Object.keys(navn).length === S.HISTORIER.bolig.length && Object.values(navn).every(n => n > 150), 'alle bolighistoriene forekommer: ' + JSON.stringify(navn));
  ok(['karantene', 'tegning', 'koffert', 'barrikade', 'sykeseng', 'skap', 'kalender', 'brev'].every(t => ting[t] > 100), 'alle sporene i boliger forekommer: ' + JSON.stringify(ting)); }
// lappene: andelen bygg med lapp, og lappen passer byggtypen
{ let n = 0, galt = 0; for (let i = 0; i < 4000; i++) { const l = S.lapp('hus', i); if (l) { n++; if (l.g !== 'bolig') galt++; } }
  ok(n / 4000 > .26 && n / 4000 < .38 && galt === 0, `ca. ${Math.round(n / 40)} % av boligene har en lapp, alle fra boliggruppen`);
  const sk = []; for (let i = 0; i < 400; i++) { const l = S.lapp('skole', i); if (l) sk.push(l.g); } ok(sk.length > 150 && sk.every(g => g === 'skole'), 'skolene får skolelapper');
  const brukt = new Set(); for (const kl of ['hus', 'skole', 'sykehus', 'butikk', 'kirke', 'kontor', 'låve', 'industri']) for (let i = 0; i < 3000; i++) { const l = S.lapp(kl, i); if (l) brukt.add(l.id); }
  ok(brukt.size === S.LAPPER.length, `alle lappene kan dukke opp (${brukt.size} av ${S.LAPPER.length})`); }
// teksten fylles
{ const l = S.finn('b2'); ok(S.fyll(l, 9, 'Dombås').includes('Dombås') && !/\{/.test(S.fyll(S.finn('b1'), 9)), 'stedet og datoen settes inn'); }
ok(S.ute(S.finn('b1')) && !S.ute(S.finn('b5')), 'lappen på døra henger ute, brevet ligger inne');
// kalenderen: gyldig dato, de fleste på senvinteren
{ let vinter = 0; for (let i = 0; i < 2000; i++) { const d = S.dato(i); if (!(d.dag >= 1 && d.dag <= 31 && d.mnd >= 0 && d.mnd <= 11)) { ok(false, 'ugyldig dato ' + d.tekst); break; } if (d.mnd === 1 || d.mnd === 2 || d.mnd === 3) vinter++; }
  ok(vinter / 2000 > .65, `de fleste kalenderne stoppet i februar–april (${Math.round(vinter / 20)} %)`); ok(/^\d+\. [a-z]+$/.test(S.dato(5).tekst), 'dato: ' + S.dato(5).tekst); }
// pekeren: et bygg i nærheten, ikke seg selv, fast, ikke gjennomsøkte
{ const K = [{ i: 1, x: 0, y: 0, kl: 'hus' }, { i: 2, x: 50, y: 0, kl: 'hus' }, { i: 3, x: 0, y: 80, kl: 'uthus' }, { i: 4, x: 2000, y: 0, kl: 'hus' }, { i: 5, x: 10, y: 0, kl: 'hus' }, { i: 6, x: 100, y: 0, kl: 'kirke' }];
  const m = S.pekerMål(1, 0, 0, K); ok(m && (m.i === 2 || m.i === 3), 'pekeren går til et hus 30–600 m unna (' + (m && m.i) + ')');
  ok(S.pekerMål(1, 0, 0, K, new Set([2, 3])) === null, 'gjennomsøkte hus velges ikke'); ok(S.gjemt(4).mat >= 10, 'det gjemte lageret har mat'); }
// tettstedene: biler, barrikader og skilt bare i tettsted, med måte, fast per sted
{ const veg = (k, by, n, y0) => ({ k, by, w: 3, P: Array.from({ length: n }, (_, q) => [q * 10, y0, 0]) });
  const V = [veg('K', true, 200, 0), veg('R', true, 200, 100), veg('F', false, 200, 300), veg('K', true, 200, 500)];
  const a = S.gate(V, { cx: 1000, cy: 6000000 }), b = S.gate(V, { cx: 1000, cy: 6000000 });
  ok(JSON.stringify(a) === JSON.stringify(b), 'samme sted gir samme gatebilde');
  ok(a.bil.length / 6 > 3 && a.bil.length / 6 <= S.REGLER.gate.tak.bil[0], `forlatte biler: ${a.bil.length / 6}`);
  let utenfor = 0; for (let q = 0; q < a.bil.length; q += 6) if (Math.abs(a.bil[q + 1] - 300) < 20) utenfor++; ok(utenfor === 0, 'ingen forlatte biler utenfor tettstedet');
  const m = S.gate(V, { cx: 1000, cy: 6000000, mobil: true }); ok(m.bil.length / 6 <= S.REGLER.gate.tak.bil[1] && m.skilt.length / 5 <= S.REGLER.gate.tak.skilt[1], 'færre på telefon');
  ok(/^VI HAR DRATT TIL DOMBÅS$/.test(S.skiltTekst(2, 'Dombås')), 'skiltet: ' + S.skiltTekst(2, 'Dombås'));
  // langs en lang veg i tettsted: skilt og barrikader finnes, men sjelden
  const lang = []; for (let r = 0; r < 30; r++) lang.push(veg('K', true, 300, r * 400));
  const c = S.gate(lang, { cx: 0, cy: 0 }); ok(c.barrikade.length / 5 >= 1 && c.skilt.length / 5 >= 2, `barrikader ${c.barrikade.length / 5}, skilt ${c.skilt.length / 5} på 90 km gate`); }
// platene: på ytterveggene, utover
{ let n = 0, med = 0, galt = 0; const P = [[0, 0], [10, 0], [10, 8], [0, 8]]; for (let i = 0; i < 2000; i++) { const p = S.plater(P, i); if (p.length) med++; n += p.length / 4;
    for (let q = 0; q < p.length; q += 4) { const x = p[q], y = p[q + 1], a = p[q + 2], ux = x + Math.cos(a) * .5, uy = y + Math.sin(a) * .5; if (ux > 0 && ux < 10 && uy > 0 && uy < 8) galt++; } }
  ok(med / 2000 > .1 && med / 2000 < .22 && galt === 0, `plater på ${Math.round(med / 20)} % av husene, normalen peker ut av huset (feil: ${galt})`); }
// lyden inne
{ let k = 0; for (let i = 0; i < 1000; i++) if (S.lydInne('hus', i).klokke) k++; ok(k > 250 && k < 450 && !S.lydInne('låve', 3).klokke, `klokke tikker i ${k / 10} % av boligene, aldri i låven`); }
// lyden (spill/lyd.js): tomme tettsteder har nesten ingen bylyd, og vinden uler i et knust vindu bare inne i huset
{ const Lyd = require('../../site/dovre-fliser/spill/lyd.js'), før = Lyd.nivåer({ by: 1, vind: 8 }), etter = Lyd.nivåer({ by: 1, vind: 8, tomt: true });
  ok(etter.by < før.by * .2 && før.glipe === 0, `bylyden i et tomt tettsted ${etter.by.toFixed(2)} (før ${før.by.toFixed(2)})`);
  ok(Lyd.nivåer({ vind: 10, inne: true, glipe: true }).glipe > .4 && Lyd.nivåer({ vind: 10, glipe: true }).glipe === 0 && Lyd.nivåer({ vind: 0, inne: true, glipe: true }).glipe === 0, 'vind i glipa: bare inne, bare når det blåser'); }
console.log(feil ? feil + ' FEIL' : 'alle sportestene ok'); process.exit(feil ? 1 : 0);
