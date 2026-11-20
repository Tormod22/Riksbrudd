// Morgenmøtet (site/dovre-fliser/spill/morgen.js): dagens valg, den store beslutningen, utfallet neste morgen og hvem som går
const M = require('../../site/dovre-fliser/spill/morgen.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const fast = (v = .5) => () => v;
// en fast tilfeldighetsrekke (samme frø gir samme svar)
const rekke = frø => { let a = frø >>> 0 || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const grunn = { dag: 2, folk: 10, arbeidsføre: 10, frie: 2, mat: 30, matDøgn: 5, moral: 60, penger: 30e6, matPris: 3000, trePris: 100000, lager: { tre: 20 }, diesel: 200, dieselPlass: 1000,
  dieselPris: 3000, røverTimer: null, bølge: 0, post: null, sted: 'Dombås', årstid: 'sommer' };
const ids = v => v.map(q => q.id).join(',');

// --- dagens valg følger det som står på ---
const vanlig = M.dagensValg(grunn, fast());
ok(vanlig.length >= 2 && vanlig.length <= 3 && vanlig.every(v => v.t && v.følge && v.id), 'alltid 2–3 valg med tekst og følge: ' + ids(vanlig));
ok(!vanlig.some(v => ['jakt', 'kjøp', 'rasjon', 'vakt', 'selg'].includes(v.id)), 'ingen matvalg, vakt eller salg når ingenting står på');
const sult = M.dagensValg({ ...grunn, matDøgn: 1.2 }, fast());
ok(sult[0].id === 'jakt' && ids(sult).includes('kjøp') && ids(sult).includes('rasjon'), 'lite mat: jakt, kjøp mat og halve rasjoner først: ' + ids(sult));
ok(/rasjoner \(60 000 kr\)/.test(sult.find(v => v.id === 'kjøp').t), 'kjøp viser prisen: ' + sult.find(v => v.id === 'kjøp').t);
const fattigSult = M.dagensValg({ ...grunn, matDøgn: 1.2, penger: 10000 }, fast());
ok(!ids(fattigSult).includes('kjøp'), 'ingen kjøp når kassa ikke rekker');
const fåFolk = M.dagensValg({ ...grunn, matDøgn: 1, folk: 3, arbeidsføre: 3 }, fast());
ok(!ids(fåFolk).includes('jakt') && ids(fåFolk).includes('kjøp'), 'for få folk til å sende noen på jakt: ' + ids(fåFolk));
const røvere = M.dagensValg({ ...grunn, røverTimer: 8, bølge: 1 }, fast());
ok(røvere[0].id === 'vakt' && /slitne/.test(røvere[0].t), 'røvere ventet: dobbel vakt først: ' + ids(røvere));
ok(!ids(M.dagensValg({ ...grunn, røverTimer: 40 }, fast())).includes('vakt'), 'røvere langt unna i tid: ingen dobbel vakt');
const fattig = M.dagensValg({ ...grunn, penger: 4e6 }, fast());
ok(ids(fattig).includes('selg') && ids(fattig).includes('leie'), 'lite penger: selg tre og lei ut to: ' + ids(fattig));
ok(/Selg 10 m³ tre \(ca\. 1 mill\. kr\)/.test(fattig.find(v => v.id === 'selg').t), 'salget: halvparten av treet: ' + fattig.find(v => v.id === 'selg').t);
const post = M.dagensValg({ ...grunn, penger: 4e6, post: { id: 7, gir: 2.5e6, meter: 2200, retning: 'nord' } }, fast());
ok(ids(post).includes('post') && !ids(post).includes('leie') && post.find(v => v.id === 'post').oppdrag === 7, 'lite penger og en ledig røverpost: det risikable oppdraget er røverposten: ' + ids(post));
ok(!ids(M.dagensValg({ ...grunn, penger: 4e6, lager: { tre: 3 } }, fast())).includes('selg'), 'for lite tre: ikke noe salg');
const sur = M.dagensValg({ ...grunn, moral: 30 }, fast());
ok(sur[0].id === 'fri', 'lav moral: fridag først: ' + ids(sur));
ok(ids(M.dagensValg({ ...grunn, arbeidsføre: 6 }, fast())).includes('speid') && !ids(M.dagensValg({ ...grunn, arbeidsføre: 5, folk: 5 }, fast())).includes('speid'), 'speidertur bare med godt med folk');
ok(M.dagensValg({ ...grunn, folk: 0, arbeidsføre: 0 }, fast()).length === 0, 'tom gjeng: ingen valg');
// alt står på samtidig: høyst tre, de viktigste
const alt = M.dagensValg({ ...grunn, matDøgn: .5, røverTimer: 0, bølge: 2, penger: 1e6, moral: 30 }, fast());
ok(alt.length === 3 && alt[0].id === 'vakt', 'alt på en gang: tre valg, angrepet som pågår først: ' + ids(alt));

// --- den store beslutningen ---
ok(!M.erStorDag(1, null) && M.erStorDag(2, null) && !M.erStorDag(4, 2) && M.erStorDag(5, 2), 'stor beslutning dag 2, så hver tredje dag');
const stor = M.storBeslutning({ ...grunn, bølge: 1, røverTimer: 10 }, fast(0), null);
ok(stor && stor.id && stor.tittel && stor.valg.length >= 2 && stor.valg.every(v => v.id && v.t && v.følge), 'en stor beslutning har tittel og valg: ' + (stor && stor.id));
const typer = new Set(); for (let i = 0; i < 40; i++) { const s = M.storBeslutning({ ...grunn, bølge: 2, røverTimer: 10 }, rekke(i * 7 + 1), null); if (s) typer.add(s.id); }
ok(['nabo', 'tankbil', 'vern', 'karavane'].every(t => typer.has(t)), 'alle fire slagene kan komme: ' + [...typer].join(','));
ok(M.storBeslutning({ ...grunn, bølge: 2, røverTimer: 10 }, fast(0), 'nabo').id !== 'nabo', 'aldri den samme to ganger på rad');
ok(![...Array(30)].some((_, i) => (M.storBeslutning({ ...grunn, dieselPlass: 100 }, rekke(i + 3), null) || {}).id === 'tankbil'), 'ingen tankbil uten plass til diesel');
ok(![...Array(30)].some((_, i) => (M.storBeslutning({ ...grunn, bølge: 0 }, rekke(i + 9), null) || {}).id === 'vern'), 'ingen beskyttelse før røverne har kommet');
const vern = [...Array(40)].map((_, i) => M.storBeslutning({ ...grunn, bølge: 2, røverTimer: 10 }, rekke(i + 11), null)).find(s => s && s.id === 'vern');
ok(vern && vern.valg[0].pris === 2.5e6 && /2,5 mill\. kr/.test(vern.valg[0].t), 'beskyttelsen koster 1,5 mill. + 0,5 per bølge');
const kar = [...Array(40)].map((_, i) => M.storBeslutning(grunn, rekke(i + 5), null)).find(s => s && s.id === 'karavane');
ok(kar && kar.valg.find(v => v.id === 'kjøp').pris === Math.round((500 * 3000 + 30 * 3000) * .7 / 1e4) * 1e4 && kar.valg.some(v => v.id === 'selg') && kar.valg.some(v => v.id === 'nei'), 'karavanen: pakken til 70 % av prisen, kjøper tre');

const karTom = [...Array(60)].map((_, i) => M.storBeslutning({ ...grunn, dieselPlass: 0, diesel: 0 }, rekke(i + 21), null)).find(s => s && s.id === 'karavane');
ok(karTom && karTom.valg[0].diesel === 0 && /^Kjøp 30 rasjoner \(/.test(karTom.valg[0].t) && karTom.valg[0].pris === Math.round(30 * 3000 * .7 / 1e4) * 1e4, 'karavanen uten dieseltank: bare mat, og prisen bare for maten: ' + (karTom && karTom.valg[0].t));

// --- utfallet neste morgen ---
const to = [{ navn: 'Kari Lien', ferd: { hogst: 1 } }, { navn: 'Per Holm', ferd: { hogst: 1.45 } }];
const j = M.utfall({ id: 'jakt', folk: to }, { årstid: 'sommer' }, fast(.5));
ok(j.mat === Math.round((6 * 1 + 6 * 1.45) * 1.1) && /Kari og Per kom hjem fra jakt og fiske med 16 rasjoner\./.test(j.tekst) && !j.skadet.length, 'jakt: rasjoner etter ferdighet og årstid: ' + j.tekst);
ok(M.utfall({ id: 'jakt', folk: to }, { årstid: 'vinter' }, fast(.5)).mat < j.mat, 'jakt om vinteren gir mindre');
const jSkade = M.utfall({ id: 'jakt', folk: to }, { årstid: 'sommer' }, fast(.05));
ok(jSkade.skadet.length === 1 && jSkade.helse > 0 && /skadet seg/.test(jSkade.tekst), 'jakt: av og til skadet: ' + jSkade.tekst);
const leie = M.utfall({ id: 'leie', folk: to }, {}, fast(.9));
ok(leie.penger === 1.5e6 && !leie.skadet.length && !leie.borte.length, 'leie: betalt uten skade: ' + leie.tekst);
const leieSår = M.utfall({ id: 'leie', folk: to }, {}, rekke(2));
const leieBorte = M.utfall({ id: 'leie', folk: to }, {}, fast(.01));
ok(leieBorte.borte.length === 1 && /kom ikke tilbake/.test(leieBorte.tekst), 'leie: en sjelden gang kommer en ikke tilbake: ' + leieBorte.tekst);
ok(typeof leieSår.tekst === 'string' && leieSår.penger >= 8e5 && leieSår.penger <= 1.6e6, 'leie: betalingen ligger i spennet: ' + leieSår.penger);
const sp = M.utfall({ id: 'speid', folk: to, sted: 'Dombås' }, { røverTimer: 14.4 }, fast(.5));
ok(/Speiderne er tilbake fra Dombås\. De så røverne samle seg: de drar ut mot leiren om ca\. 14 timer\./.test(sp.tekst) && sp.mat > 0 && sp.tre > 0, 'speidertur: melder røverne og tar med funn: ' + sp.tekst);
ok(/ingen tegn til røverne/.test(M.utfall({ id: 'speid', folk: to }, { røverTimer: null }, fast(.5)).tekst), 'speidertur uten kjent bølge');
const tb = M.utfall({ id: 'tankbil', folk: to }, {}, fast(.3)), tbTom = M.utfall({ id: 'tankbil', folk: to }, {}, fast(.9));
ok(tb.diesel >= 250 && tb.diesel <= 450 && tbTom.diesel === 0 && /tømt/.test(tbTom.tekst), 'tankbil til fots: diesel eller ingenting: ' + tb.tekst + ' / ' + tbTom.tekst);

const øv = M.utfall({ id: 'øv', folk: to }, {}, fast(.5));
ok(øv.erf === 15 && !øv.skadet.length && /øvde med våpen/.test(øv.tekst), 'våpenøvelse: +15 min erfaring: ' + øv.tekst);
ok(ids(M.dagensValg({ ...grunn, arbeidsføre: 6 }, fast())).includes('øv') && !ids(M.dagensValg({ ...grunn, arbeidsføre: 5, folk: 5 }, fast())).includes('øv'), 'våpenøvelse bare med godt med folk');

// --- hvem som går ---
const folk = [{ id: 1, oppgave: 'bygg', helse: 1, ferd: { hogst: 1.4 } }, { id: 2, oppgave: 'bygg', helse: 1, ferd: { hogst: .8 } }, { id: 3, oppgave: 'fri', helse: 1, ferd: { hogst: .9 } },
  { id: 4, oppgave: 'kjøkken', helse: 1, ferd: { hogst: 1.45 } }, { id: 5, oppgave: 'fri', helse: .2, ferd: { hogst: 1.4 } }, { id: 6, oppgave: 'hogst', helse: 1, ferd: { hogst: 1.2 }, borte: 99 }];
const v = M.velgFolk(folk, 2, 'hogst');
ok(v[0] === 3 && v[1] === 1, 'den frie først, så den beste fra oppgaven med flest – aldri syke, borte eller eneste kokk: ' + v);
ok(M.velgFolk(folk, 9, 'hogst').length === 3 && !M.velgFolk(folk, 9, 'hogst').includes(4), 'den eneste på en oppgave (kokken) sendes aldri: ' + M.velgFolk(folk, 9, 'hogst'));
ok(M.velgFolk(folk, 2, 'hogst', [3]).every(id => id !== 3), 'unntatt holdes utenfor');

// --- alle tallene står i REGLER ---
ok(M.REGLER.borte === 2 && M.REGLER.stor.første === 2 && M.REGLER.stor.hver === 3 && M.REGLER.vakt.ekstra === 2, 'tallene står i REGLER');
console.log(feil ? feil + ' FEIL' : 'alle morgentestene ok'); process.exit(feil ? 1 : 0);
