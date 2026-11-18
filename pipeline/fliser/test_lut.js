// Lut og beholdere (site/dovre-fliser/spill/lut.js)
const L = require('../../site/dovre-fliser/spill/lut.js'), I = require('../../site/dovre-fliser/spill/interior.js'), U = require('../../site/dovre-fliser/spill/utstyr.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const G = L.GJENSTANDER, R = L.REGLER, DAG = R.dag;

// gjenstandene: navn, vekt, slag og virkning
ok(Object.values(G).every(g => g.navn && g.vekt > 0 && L.REKKE.includes(g.kat) && g.n[0] >= 1 && g.n[1] >= g.n[0] && g.w > 0), 'alle gjenstander har navn, vekt, slag og antall');
ok(Object.values(G).filter(g => g.kat === 'mat' || g.kat === 'fersk' || g.kat === 'drikke').every(g => g.spis), 'all mat og drikke har en virkning');
ok(['brunost', 'knekkebrød', 'fiskeboller', 'lapskaus', 'pølseboks', 'havregryn', 'tørrfisk', 'sjokolade', 'kaffe', 'saft', 'flaskevann', 'brus', 'v_jaktrifle', 'v_hagle', 'v_pistol', 'a762', 'ahagl', 'forbinding', 'smertestillende', 'lommelykt', 'batterier', 'tau', 'verktøy', 'sovepose', 'feltflaske', 'handlenett', 'skolesekk', 'tursekk', 'militærsekk'].every(id => G[id]), 'alle tingene fra oppdraget finnes');
ok(Object.entries(G).filter(([, g]) => g.finnes).every(([id, g]) => (U.TING[id] && Math.abs(U.TING[id].vekt - g.vekt) < 1e-9) || ['tau'].includes(id)), 'tingene som finnes i sekken fra før, har samme vekt som der');
ok(Object.entries(G).filter(([id]) => !G[id].finnes).every(([id]) => !U.TING[id] && !U.VÅPEN[id]), 'de nye id-ene kolliderer ikke med sekkens');
ok(Object.values(G).filter(g => g.våpen).every(g => g.våpen === 'jaktrifle' || U.VÅPEN[g.våpen]), 'våpnene peker på våpen i sekken (eller jaktrifla)');
ok(Object.values(G).filter(g => g.kat === 'sekk').every(g => g.sekk.plass > 0 && g.sekk.lettere >= 0 && g.sekk.lettere < 1) && G.militærsekk.sekk.plass > G.tursekk.sekk.plass && G.tursekk.sekk.plass > G.skolesekk.sekk.plass && G.skolesekk.sekk.plass > G.handlenett.sekk.plass, 'sekkene: handlenett < skolesekk < tursekk < militærsekk');

// beholderne i ekte planer fra interiøret
const hus = (kl, i, w = 10, d = 8) => { const P = [[0, 0], [w, 0], [w, d], [0, d]]; return I.plan(P, { i, kl, h: 6, dør: { x: w / 2, y: 0, ux: 1, uy: 0, w: 1 } }); };
{ const pl = hus('hus', 4242), B = L.beholdere(pl), typer = new Set(B.map(b => b.type));
  ok(B.length >= 4 && typer.has('kjøleskap') && typer.has('kjøkkenbenk'), `et prøvehus har beholdere (${B.length}: ${[...typer].join(', ')})`);
  ok(JSON.stringify(L.beholdere(hus('hus', 4242)).map(b => [b.type, b.k])) === JSON.stringify(B.map(b => [b.type, b.k])), 'samme bygg gir samme beholdere');
  const m = B[0].m; ok(L.avstand(m, m.x, m.y) === 0 && Math.abs(L.avstand({ x: 0, y: 0, a: 0, b: 2, d: 1 }, 3, 0) - 2) < 1e-9 && Math.abs(L.avstand({ x: 0, y: 0, a: Math.PI / 2, b: 2, d: 1 }, 0, 3) - 2) < 1e-9, 'avstanden måles til kanten av møbelet (også dreid)');
  ok(B.every(b => b.kg > 0 && b.navn && b.tittel), 'hver beholder har plass og navn'); }
{ const pl = hus('butikk', 77, 30, 20), B = L.beholdere(pl); ok(B.filter(b => b.type === 'reol').length >= 4, `butikken har mange reoler (${B.filter(b => b.type === 'reol').length})`); }
ok(L.beholdere(hus('brakke', 9000001, 12, 6)).length >= 1 && L.beholdere(hus('brakke', 9000001, 12, 6)).every(b => !Object.keys(L.innhold('brakke', b.type, 9000001, b.k).t).length), 'leirens bygg har beholdere, men de er tomme');

// innholdet: fast, innenfor plassen, og etter byggklassen
ok(JSON.stringify(L.innhold('hus', 'kjøleskap', 4242, 0)) === JSON.stringify(L.innhold('hus', 'kjøleskap', 4242, 0)), 'samme beholder gir samme innhold');
const snitt = (kl, type, f, n = 3000) => { let s = 0; for (let i = 0; i < n; i++) s += f(L.innhold(kl, type, i * 13 + 5, 0)); return s / n; };
const antall = (B, kat) => Object.entries(B.t).reduce((s, [id, n]) => s + (G[id].kat === kat ? n : 0), 0), finnes = (B, kat) => (antall(B, kat) > 0 ? 1 : 0);
{ let over = 0; for (const type of Object.keys(L.BEHOLDERE)) for (let i = 0; i < 400; i++) { const B = L.innhold('lager', type, i, 0); if (L.kg(B) > L.BEHOLDERE[type].kg + 1e-9) over++; } ok(over === 0, 'ingen beholder er fylt over plassen sin'); }
{ const hytte = snitt('hytte', 'skap', B => finnes(B, 'våpen')), leil = snitt('leil', 'skap', B => finnes(B, 'våpen')), syk = snitt('sykehus', 'skap', B => finnes(B, 'våpen'));
  ok(hytte > .12 && hytte > leil * 4 && syk === 0, `jaktvåpen i hyttenes garderober (${Math.round(hytte * 100)} %) mye oftere enn i leiligheter (${Math.round(leil * 100)} %), aldri på sykehus`); }
{ const but = snitt('butikk', 'reol', B => antall(B, 'mat') + antall(B, 'drikke')), hus2 = snitt('hus', 'kjøkkenbenk', B => antall(B, 'mat') + antall(B, 'drikke'));
  ok(but > 6 && but > hus2 * 1.5, `mye mat i butikkenes reoler (${but.toFixed(1)} per reol mot ${hus2.toFixed(1)} i et kjøkkenskap)`); }
{ const syk = snitt('sykehus', 'nattbord', B => antall(B, 'medisin')), hus2 = snitt('hus', 'nattbord', B => antall(B, 'medisin'));
  ok(syk > hus2 * 2 && syk > .4, `medisin på sykehus (${syk.toFixed(2)} per nattbord mot ${hus2.toFixed(2)} i boliger)`); }
{ const ind = snitt('industri', 'arbeidsbenk', B => antall(B, 'utstyr')), kjøl = snitt('hus', 'kjøleskap', B => antall(B, 'fersk'));
  ok(ind > .8 && kjøl > 1, `verktøy i industrien (${ind.toFixed(1)} per benk), fersk mat i kjøleskapene (${kjøl.toFixed(1)})`); }
{ const brunost = snitt('hus', 'kjøleskap', B => (B.t.brunost ? 1 : 0)), saft = snitt('hus', 'kjøkkenbenk', B => (B.t.saft || B.t.saftbr ? 1 : 0)) + snitt('hus', 'kjøleskap', B => (B.t.saft || B.t.saftbr ? 1 : 0));
  ok(brunost > .1 && saft > .1, `brunost (${Math.round(brunost * 100)} % av kjøleskapene) og saft i boligene`); }
{ const rans = []; for (let i = 0; i < 3000; i++) if (L.hash(i, 901) < L.KLASSER.hus.tomt) rans.push(i); const r = rans.reduce((s, i) => s + Object.values(L.innhold('hus', 'kjøkkenbenk', i, 0).t).reduce((a, b) => a + b, 0), 0) / rans.length;
  const alle = snitt('hus', 'kjøkkenbenk', B => Object.values(B.t).reduce((a, b) => a + b, 0)); ok(r < alle * .6, `ransakede hus har lite igjen (${r.toFixed(1)} mot ${alle.toFixed(1)} ting i kjøkkenskapene)`); }
{ const B = L.innhold('hus', 'kjøleskap', 4242, 0); let ferske = 0; for (const id of Object.keys(B.t)) if (G[id].fersk) ferske += B.d[id].filter(e => Array.isArray(e)).length; ok(Object.keys(B.t).some(id => G[id].fersk) ? ferske > 0 : true, 'fersk mat i kjøleskapet har kjøleskapsdatoer'); }
ok(snitt('hytte', 'skap', B => (Object.entries(B.t).some(([id, n]) => G[id].kat === 'våpen' && n > 1) ? 1 : 0)) === 0, 'høyst ett av hvert våpen per beholder');

// ferskhet
ok(L.stadium('melk', 0, 2 * DAG) === 'fersk' && L.stadium('melk', 0, 6 * DAG) === 'gammel' && L.stadium('melk', 0, 10 * DAG) === 'råtten', 'melk: fersk, så gammel, så råtten');
ok(L.stadium('lapskaus', 0, 999 * DAG) === null && L.stadium('knekkebrød', 0, 999 * DAG) === null && L.stadium('tørrfisk', 0, 999 * DAG) === null, 'hermetikk, knekkebrød og tørrfisk holder');
ok(L.stadium('brunost', 0, 30 * DAG) === 'fersk' && L.stadium('brunost', 0, 100 * DAG) === 'gammel' && L.stadium('brunost', 0, 200 * DAG) === 'råtten', 'brunost holder lenge, men ikke evig');
ok(L.stadium('melk', [0, 0], 10 * DAG, Infinity) === 'fersk' && L.stadium('melk', [0, 0], 10 * DAG, -Infinity) === 'råtten' && Math.abs(L.alder([0, 0], 10 * DAG, 4 * DAG) - (4 * DAG * R.kald + 6 * DAG)) < 1e-6, 'kjøleskap med strøm eldes saktere, uten strøm hjelper det ikke');
{ const m = L.måltid('melk', 'fersk'), g = L.måltid('melk', 'gammel'), r = L.måltid('melk', 'råtten');
  ok(m.tørst === 30 && g.tørst < m.tørst && r.tørst < g.tørst && r.helse < 0 && !m.helse, `gammel mat metter mindre, råtten gir dårlig helse (${r.helse})`); }
ok(L.måltid('lommelykt') === null && L.måltid('kaffe').søvn > 0, 'lommelykta kan ikke spises; kaffen holder deg våken');

// flytting: antall, plass og datoer
{ const a = L.ny(), b = L.ny(); a.t.melk = 3; a.d.melk = [0, 0, 5 * DAG]; a.t.lapskaus = 2;
  ok(L.flytt(a, b, 'lapskaus', 5) === 2 && !a.t.lapskaus && b.t.lapskaus === 2, 'flytt alle av en ting som holder');
  ok(L.flytt(a, b, 'melk', 9, { nå: 6 * DAG, stadium: 'gammel' }) === 2 && a.t.melk === 1 && b.d.melk.length === 2 && b.d.melk.every(e => e === 0), 'flytt bare de gamle (datoene følger med)');
  ok(L.flytt(a, b, 'melk', 1, { nå: 6 * DAG, plass: .5 }) === 0 && a.t.melk === 1, 'ingen plass, ingen flytting');
  const k = L.ny(); ok(L.flytt(a, k, 'melk', 1, { nå: 6 * DAG, erTilKald: true }) === 1 && Array.isArray(k.d.melk[0]) && k.d.melk[0][0] === DAG && k.d.melk[0][1] === 6 * DAG, 'inn i kjøleskapet: alderen og når den kom inn');
  const ut = L.ny(); L.flytt(k, ut, 'melk', 1, { nå: 8 * DAG, fraKald: Infinity, erFraKald: true }); ok(Math.abs(L.alder(ut.d.melk[0], 8 * DAG) - (DAG + 2 * DAG * R.kald)) < 1e-6, 'ut av kjøleskapet: alderen er riktig etterpå'); }
{ const B = L.ny(); B.t.melk = 4; B.d.melk = [0]; L.normaliser(B, 3 * DAG); ok(B.d.melk.length === 4 && B.d.melk.filter(e => e === 3 * DAG).length === 3, 'mangler det datoer, er de nye ferske');
  B.t.melk = 2; L.normaliser(B, 3 * DAG); ok(B.d.melk.length === 2 && !B.d.melk.includes(0), 'er noe tatt ut, går de eldste først'); }
{ const B = L.ny(); B.t.melk = 2; B.d.melk = [0, 5 * DAG]; const e = L.taUt(B, 'melk', 1, { nå: 6 * DAG }); ok(e.length === 1 && e[0] === 5 * DAG && B.d.melk[0] === 0, 'du spiser den ferskeste først'); }
{ const B = L.ny(); B.t.melk = 3; B.d.melk = [0, 0, 5 * DAG]; B.t.a762 = 20; const s = L.stabler(B, 6 * DAG);
  ok(s.length === 3 && s[0].id === 'a762' && s[0].n === 20 && s.find(r => r.id === 'melk' && r.st === 'gammel').n === 2 && Math.abs(s[0].kg - .5) < 1e-9, 'like ting stables, fersk og gammel hver for seg, ammunisjon først');
  ok(L.rad(6, '7,62 mm') === '6 × 7,62 mm' && L.rad(2, 'Melk', 'råtten') === '2 × Melk – råtten' && L.rad(1, 'Melk', 'fersk') === '1 × Melk', 'radene: «6 × 7,62 mm», «2 × Melk – råtten»'); }

// vekt og plass
{ const b = L.bæring({ våpenKg: 5, tingKg: 3, rygg: 'tursekk' }); ok(b.status === 'lett' && b.fart === 1 && b.kanLøpe && b.plass === R.lommer + 22, `lett last: full fart (${b.vekt} kg av ${b.evne})`); }
{ const b = L.bæring({ våpenKg: 8, tingKg: 25, rygg: 'tursekk' }); ok(b.status === 'tungt' && b.fart < 1 && b.fart >= R.fartTungt && b.løp < 1 && b.kanLøpe, `tungt: tregere (${b.fart.toFixed(2)}) og fortere sliten (${b.løp.toFixed(2)})`); }
{ const b = L.bæring({ våpenKg: 14, tingKg: 27, rygg: 'tursekk' }); ok(b.status === 'svært' && b.fart === R.fartSvært && !b.kanLøpe, `svært tungt: kan ikke løpe (${b.vekt} kg)`); }
{ const uten = L.bæring({ tingKg: 20 }), med = L.bæring({ tingKg: 20, rygg: 'militærsekk' }); ok(med.vekt < uten.vekt && uten.plass === R.lommer, `sekken gjør vekten lettere (${med.vekt} mot ${uten.vekt} kg), uten sekk bare lommene`); }
ok(L.bæring({ tingKg: 10, ekstra: 10 }).evne === R.bæreevne + 10, 'styrken gir høyere bæreevne');

// (runde 5) husene lever: tømming, ransak over tid, påfyll; første hus nær leiren
{ const B = { t: { brunost: 4, a762: 20, saft: 2 }, d: { brunost: [1, 2, 3, 4] } }, n = L.tøm(B, .5, 7);
  ok(n > 0 && (B.t.a762 || 0) === 10 && (B.t.brunost || 0) === 2 && B.d.brunost.length === 2, `tøm halvparten: ${n} ting tatt, datoene følger med`);
  ok(L.tøm(B, 1, 1) > 0 && !Object.keys(B.t).length, 'tøm alt: tomt');
  ok(L.ransak(0, 0) === 0 && L.ransak(0, 1) > .6 && L.ransak(.5, 1) > L.ransak(0, 1) && L.ransak(0, 100) <= 1, 'ransak: mer jo lenger et lag er der');
  const C = { t: { havregryn: 1 }, d: {} }, ny = L.innhold('butikk', 'reol', 77, 1000); const før = L.kg(C), m = L.påfyll(C, ny, .35, 60);
  ok(m > 0 && L.kg(C) > før && L.kg(C) <= 60 + 1e-9, `påfyll legger til (${m} ting) innenfor plassen`);
  let tomme = 0, nyttige = 0; for (let i = 1; i <= 300; i++) { const v = ['kjøkkenbenk', 'kjøleskap', 'skap', 'nattbord'].map(t => L.innhold('hus', t, i, 0, { nær: true })); if (v.every(b => !Object.keys(b.t).length)) tomme++;
    if (v.some(b => Object.keys(b.t).some(id => L.GJENSTANDER[id] && /mat|drikke|fersk|sekk|ammo/.test(L.GJENSTANDER[id].kat)))) nyttige++; }
  ok(tomme === 0 && nyttige === 300, `boliger nær leiren: aldri tomme, alltid mat/drikke/sekk/ammo (${nyttige} av 300)`);
  let ulike = new Set(); for (let i = 1; i <= 40; i++) ulike.add(Object.keys(L.innhold('hus', 'kjøkkenbenk', i, 0, { nær: true }).t).sort().join()); ok(ulike.size > 10, `ingen fast oppskrift (${ulike.size} ulike kjøkkenskap av 40)`);
  let uten = 0; for (let i = 1; i <= 300; i++) if (['kjøkkenbenk', 'kjøleskap', 'skap', 'nattbord'].every(t => !Object.keys(L.innhold('hus', t, i, 0).t).length)) uten++;
  ok(uten > 0, `uten «nær» kan et hus være tomt (${uten} av 300) – det er det vi retter nær leiren`); }
console.log(feil ? feil + ' FEIL' : 'alle luttestene ok'); process.exit(feil ? 1 : 0);
