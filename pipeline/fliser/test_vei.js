// Test for spill/vei.js (veien i byggene og i leiren, fase F1): node pipeline/fliser/test_vei.js   (RASK=1: færre prøvehus)
const V = require('../../site/dovre-fliser/spill/vei.js'), B = require('../../site/dovre-fliser/spill/bygning.js'), BS = require('../../site/dovre-fliser/spill/byggesett.js');
const Leir = require('../../site/dovre-fliser/spill/leir.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const rekt = (w, h, x = 0, y = 0) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
// et ferdig hus fra byggesettet (som spilleren bygger det)
let nr = 0; const hus = (mal, i, j, rot = 0) => BS.husForslag([], mal, i, j, rot).filter(q => !q.feil).map(q => ({ ...q.d, id: 'd' + nr++, ferdig: true }));
const ms = f => { const t = process.hrtime.bigint(); const r = f(); return [r, Number(process.hrtime.bigint() - t) / 1e6]; };

// ---------- 1. veien gjennom døra i et prøvehus (byggesettets brakke) ----------
{ const deler = hus('brakke', 0, 0, 0), K = V.lag({ deler, opphav: { ox: 0, oy: 0 }, start: [-6, -6] });
  ok(K.lagene.length === 1 && K.lagene[0].s === 1.2, 'leirens bakke: ett lag på 1,2 m (' + K.lagene.map(L => L.id + ' ' + L.s).join(', ') + ')');
  const inne = { x: 4.8, y: 3.6 }, r = V.finn({ x: -6, y: -6 }, inne);
  ok(r.ok && r.rom.length === 2, 'veien inn i brakka går gjennom to rom (ute og brakka): ' + r.ok + ', ' + (r.rom || []).length + ' rom, ' + r.lengde + ' m');
  // veien krysser veggen bare i døra (døra er midt på sørsiden: x 3,15–4,05 + en halv rute)
  const kr = []; for (let k = 1; k < r.punkter.length; k++) { const a = r.punkter[k - 1], b = r.punkter[k]; if ((a.y < 0) !== (b.y < 0)) kr.push(a.x + (b.x - a.x) * (0 - a.y) / (b.y - a.y)); }
  ok(kr.length === 1 && kr[0] > 2.5 && kr[0] < 4.7, 'veien går inn gjennom døra (krysser sørveggen ved x = ' + kr.map(v => v.toFixed(2)).join(', ') + ')');
  ok(V.kanNå(inne).ok, 'kanNå: brakka nås');
  ok(K.mål.has('seng') && V.veikart('seng').avstand({ x: -6, y: -6 }) < 30, 'veikart «seng»: brakka er et mål (' + V.veikart('seng').avstand({ x: -6, y: -6 }).toFixed(1) + ' m)');
  // gjennom veggen er det ikke lov: rett linje er ca. 13 m, veien må rundt til døra
  const nord = V.finn({ x: 4.8, y: 9.5 }, inne); ok(nord.ok && nord.lengde > 9, 'fra nordsiden må veien rundt til døra (' + nord.lengde + ' m, rett linje ' + (9.5 - 3.6).toFixed(1) + ' m)');
  // låst dør: bare egne slipper inn, «ingen» stenger for alle
  const dør = K.bs.etasjer[0].åpninger.find(o => o.type === 'dør'); V.lås(dør, 'egne'); const K2 = V.lag({ deler: [], bygninger: [], opphav: { ox: 0, oy: 0 } }); void K2;
}
// ---------- 2. låste dører (lås på åpningen i modellen) ----------
{ const deler = hus('brakke', 0, 0, 0), bs = B.fraByggesett(deler, { ox: 0, oy: 0 });
  // lag kartet, lås døra i modellen kartet bygger på, og lag kartet på nytt fra den samme modellen (bygninger-veien)
  const m = B.fraKart(rekt(10, 8, 20, 0), { i: 81234, kl: 'hus', h: 6, tak: 'saltak' });
  let K = V.lag({ bygninger: [m], start: [10, -6] }); const rom1 = m.etasjer.find(e => e.n === 1).rom.find(r => r.andel > .9), [cx, cy] = [(rom1.P[0][0] + rom1.P[2][0]) / 2, (rom1.P[0][1] + rom1.P[2][1]) / 2];
  ok(V.kanNå({ x: cx, y: cy, hus: 'hus81234' }).ok, 'hus fra kartet: et rom i 1. etasje nås fra leiren');
  const inn = m.etasjer.find(e => e.n === 1).åpninger.filter(o => o.inngang); for (const o of inn) V.lås(o, 'ingen');
  K = V.lag({ bygninger: [m], start: [10, -6] }); const s = V.kanNå({ x: cx, y: cy, hus: 'hus81234' });
  ok(!s.ok && s.grunn === 'døra er låst', 'alle ytterdørene låst («ingen»): ' + JSON.stringify(s));
  for (const o of inn) V.lås(o, 'egne'); K = V.lag({ bygninger: [m], start: [10, -6] });
  ok(V.kanNå({ x: cx, y: cy, hus: 'hus81234' }).ok && !V.kanNå({ x: cx, y: cy, hus: 'hus81234' }, { hvem: 'fremmed' }).ok, 'lås «egne»: egne kommer inn, fremmede ikke');
  for (const o of inn) V.lås(o, null); void bs;
}
// ---------- 3. rom uten dør gir grunnen «rommet har ingen dør» ----------
{ const g = []; for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) g.push({ type: 'bs_fundament', i, j, a: null, n: 0 });
  const v = BS.rad({ ox: 0, oy: 0 }, 'bs_vegg_tre', [0, 0], [4.8, 4.8]).map(q => ({ type: 'bs_vegg_tre', ...q, n: 0 }));
  const t = g.map(q => ({ ...q, type: 'bs_tak_flatt', n: 1 })), deler = [...g, ...v, ...t].map(d => ({ ...d, id: 'u' + nr++, ferdig: true }));
  ok(BS.rom(deler).length === 1 && !BS.rom(deler)[0].brukbart, 'byggesettet: lukket rom uten dør (' + BS.rom(deler).map(r => r.navn).join() + ')');
  const K = V.lag({ deler, opphav: { ox: 0, oy: 0 }, start: [-5, -5] }), s = V.kanNå({ x: 2.4, y: 2.4 });
  ok(!s.ok && s.grunn === 'rommet har ingen dør', 'kanNå i rommet: ' + JSON.stringify(s));
  const b = V.kanNå({ x: 2.4, y: 2.4, bruksplass: true }); ok(!b.ok && b.grunn === 'rommet har ingen dør', 'bruksplass i et lukket rom: ' + b.grunn);
  const u = V.romUtenVei(K); ok(u.length === 1 && u[0].grunn === 'rommet har ingen dør', 'romUtenVei finner rommet (' + JSON.stringify(u) + ')');
  ok(!V.finn({ x: -5, y: -5 }, { x: 2.4, y: 2.4 }).ok, 'finn: ingen vei inn');
  // dør i veggen: da nås rommet (dør bytter ut en hel vegg)
  const d0 = deler.find(d => d.type === 'bs_vegg_tre' && d.a === 'x' && d.j === 0 && d.i === 0), med = deler.map(d => (d === d0 ? { ...d, type: 'bs_vegg_tre_dør' } : d));
  V.lag({ deler: med, opphav: { ox: 0, oy: 0 }, start: [-5, -5] }); ok(V.kanNå({ x: 2.4, y: 2.4 }).ok && !V.romUtenVei().length, 'med en dør nås rommet');
  // selvtest: et rom bak et annet rom uten dør imellom («ingen vei» og ikke «ingen dør» når rommet har en dør inn fra et lukket rom)
  const g2 = [0, 1, 2, 3].map(i => ({ type: 'bs_fundament', i, j: 0, a: null, n: 0 })), v2 = BS.rad({ ox: 0, oy: 0 }, 'bs_vegg_tre', [0, 0], [9.6, 2.4]).map(q => ({ type: 'bs_vegg_tre', ...q, n: 0 }));
  v2.push({ type: 'bs_vegg_tre_dør', a: 'y', i: 2, j: 0, n: 0 });
  const d2 = [...g2, ...v2].map(d => ({ ...d, id: 'w' + nr++, ferdig: true })); V.lag({ deler: d2, opphav: { ox: 0, oy: 0 }, start: [-5, -5] });
  const s2 = V.kanNå({ x: 1.2, y: 1.2 }), s3 = V.kanNå({ x: 8.4, y: 1.2, bruksplass: true });
  ok(!s2.ok && s2.grunn === 'ingen vei dit' && !s3.ok && s3.grunn === 'ingen vei til bruksplassen', 'to rom med dør imellom, men ingen ut: «' + s2.grunn + '» / «' + s3.grunn + '»');
}
// ---------- 4. trapp mellom to etasjer (byggesettet) ----------
{ const g = [], g1 = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { g.push({ type: 'bs_fundament', i, j, a: null, n: 0 }); g1.push({ type: 'bs_tregulv', i, j, a: null, n: 1 }); }
  const ring = n => BS.rad({ ox: 0, oy: 0 }, 'bs_vegg_tre', [0, 0], [7.2, 4.8]).map(q => ({ type: 'bs_vegg_tre', ...q, n }));
  const v0 = ring(0), v1 = ring(1); const k = v0.findIndex(q => q.a === 'x' && q.j === 0 && q.i === 1); v0[k] = { ...v0[k], type: 'bs_vegg_tre_dør' };
  const tak = g.map(q => ({ ...q, type: 'bs_tak_flatt', n: 2 })), deler = [...g, ...g1, ...v0, ...v1, ...tak].map(d => ({ ...d, id: 't' + nr++, ferdig: true }));
  const K = V.lag({ deler, opphav: { ox: 0, oy: 0 }, start: [-5, -5] });
  ok(K.lagene.length === 2 && K.lenkeListe.some(l => l.ref && l.ref.trapp !== undefined), 'to etasjer: to lag og en trapp mellom dem (' + K.lagene.map(L => L.id).join(', ') + ')');
  const r = V.finn({ x: -5, y: -5 }, { x: 6, y: 3.6, e: 2 });
  ok(r.ok && r.punkter.some(p => p.e === 1) && r.punkter[r.punkter.length - 1].e === 2, 'veien til 2. etasje bruker trappa (' + r.lengde + ' m, etasjer ' + [...new Set(r.punkter.map(p => p.e))].join('→') + ')');
  ok(V.kanNå({ x: 6, y: 3.6, e: 2 }).ok, 'kanNå: 2. etasje nås');
  const Vk = V.veikart({ x: 6, y: 3.6, e: 2, hus: 'leir' }), vei = Vk.vei({ x: -5, y: -5 });
  ok(vei.ok && Math.abs(vei.lengde - r.lengde) < .01, 'veikartet til 2. etasje gir samme lengde som finn (' + vei.lengde + ' / ' + r.lengde + ')');
}
// ---------- 5. hus fra kartet: trapp, loft, alle rom ----------
{ const by = B.fraKart(rekt(24, 13, 30, 0), { i: 5, kl: 'leil', h: 12, tak: 'flatt' }), h9 = B.fraKart(rekt(10, 8, 0, 0), { i: 81234, kl: 'hus', h: 9, tak: 'saltak' });
  const K = V.lag({ bygninger: [h9, by], start: [-8, -8] });
  for (const [m, nk] of [[h9, 'hus81234'], [by, 'hus5']]) { let n = 0, uten = [];
    for (const et of m.etasjer) for (const r of et.rom) { if (r.andel < .5 || r.areal < 1.5) continue; n++; const [p, q, u, v] = [Math.min(...r.P.map(a => a[0])), Math.min(...r.P.map(a => a[1])), Math.max(...r.P.map(a => a[0])), Math.max(...r.P.map(a => a[1]))];
      void p; void q; void u; void v; const s = V.romNås(r.P, { e: et.n, hus: nk }); if (!s.ok) uten.push(et.n + ':' + r.rolle + ' ' + s.grunn); }
    ok(!uten.length, m.kl + ' ' + m.h + ' m: alle ' + n + ' rom nås fra leiren' + (uten.length ? ' – IKKE: ' + uten.join('; ') : '')); }
  const øverst = by.etasjer.filter(e => !e.kjeller).slice(-1)[0], rr = øverst.rom.find(r => r.rolle === 'kjøkken') || øverst.rom[0];
  const r = V.finn({ x: -8, y: -8 }, { x: (rr.P[0][0] + rr.P[2][0]) / 2, y: (rr.P[0][1] + rr.P[2][1]) / 2, e: øverst.n, hus: 'hus5' });
  ok(r.ok && new Set(r.punkter.map(p => p.e)).size === øverst.n, 'bygården: veien til ' + øverst.n + '. etasje går opp alle trappene (' + r.lengde + ' m)');
  ok(K.mål.has('kjøkken'), 'kjøkkenene i husene er mål («kjøkken»: ' + (K.mål.get('kjøkken') || []).length + ')');
}
// ---------- 6. mange prøvehus fra kartet: rommene som Bygning.nås når, når også veien ----------
{ const KL = ['hus', 'hytte', 'leil', 'kontor', 'skole', 'butikk', 'industri', 'lager', 'låve', 'kirke', 'sykehus', 'uthus'], N = process.env.RASK ? 40 : 120; let rom = 0, borte = 0, tid = 0; const eks = [];
  for (let k = 0; k < N; k++) { const kl = KL[k % KL.length], w = 8 + (k * 7) % 22, h = 6 + (k * 5) % 12, m = B.fraKart(rekt(w, h), { i: 1000 + k, kl, h: 4 + (k * 3) % 12 });
    const [K, t] = ms(() => V.lag({ bygninger: [m], start: [-6, -6] })); tid += t; const nk = K.hus[0].nøkkel;
    for (const et of m.etasjer) { const nå = B.nåsEtasje(m, et); for (const r of et.rom) { if (r.andel < .5 || r.areal < 1.5 || nå.uten.includes(r.id)) continue; rom++;
      const [p, q, u, v] = [Math.min(...r.P.map(a => a[0])), Math.min(...r.P.map(a => a[1])), Math.max(...r.P.map(a => a[0])), Math.max(...r.P.map(a => a[1]))];
      void p; void q; void u; void v; if (!V.romNås(r.P, { e: et.n, hus: nk }).ok) { borte++; if (eks.length < 6) eks.push(kl + ' ' + (1000 + k) + ' e' + et.n + ' ' + r.rolle); } } } }
  ok(borte <= rom * .02, N + ' prøvehus: ' + (rom - borte) + ' av ' + rom + ' rom som Bygning.nås når, nås også av veien (' + (tid / N).toFixed(1) + ' ms per hus for Vei.lag)' + (eks.length ? ' – ikke: ' + eks.join(', ') : ''));
}
// ---------- 7. leir med Leir-bygg og gjerde ----------
{ let L = Leir.ny ? Leir.ny() : { bygg: [] }; if (!L.bygg) L.bygg = [];
  L.bygg.push({ id: 1, type: 'lagertelt', x: 30, y: 0, ret: 0, igjen: 0 }, { id: 2, type: 'brakke', x: 0, y: 25, ret: Math.PI / 2, igjen: 0 },
    { id: 3, type: 'gjerde', punkter: [[-40, -40], [60, -40], [60, 60], [-40, 60]], lukket: true, igjen: 0 }, { id: 4, type: 'port', x: 10, y: -40, ret: 0, igjen: 0 });
  L.byggesett = { ox: 0, oy: 0 }; L.bygg.push(...hus('brakke', -10, -10, 2).map((d, k) => ({ id: 100 + k, type: d.type, x: 0, y: 0, bs: { i: d.i, j: d.j, a: d.a, n: d.n, r: d.r }, igjen: 0, hp: 100 })));
  const K = V.lag({ leir: L, start: [0, 0] });
  const lager = V.veikart('lager'); ok(lager.kilder === 1 && lager.avstand({ x: 0, y: 0 }) < 45, 'veikart «lager»: lagerteltet (' + lager.avstand({ x: 0, y: 0 }).toFixed(1) + ' m)');
  ok(V.kanNå({ x: 30, y: 0 }).grunn === 'plassen er sperret' || !V.kanNå({ x: 30, y: 0 }).ok, 'inne i lagerteltet (uten interiør) er det sperret');
  const ute = V.finn({ x: 0, y: 0 }, { x: 10, y: -48 }); ok(ute.ok && ute.punkter.some(p => Math.abs(p.x - 10) < 3.5 && Math.abs(p.y + 40) < 2.5), 'gjerdet: veien ut går gjennom porten (' + ute.lengde + ' m)');
  const L2 = JSON.parse(JSON.stringify(L)); L2.bygg = L2.bygg.filter(b => b.type !== 'port'); V.lag({ leir: L2, start: [0, 0] });
  ok(!V.finn({ x: 0, y: 0 }, { x: 10, y: -48 }).ok, 'uten port kommer ingen ut av gjerdet');
  V.lag({ leir: L, start: [0, 0] });
  // signaturen: lik leir gir samme kart, en ny dør gir nytt kart
  const K1 = V.oppdater({ leir: L, start: [0, 0] }), K1b = V.oppdater({ leir: L, start: [0, 0] });
  const L3 = JSON.parse(JSON.stringify(L)); const v = L3.bygg.find(b => b.type === 'bs_vegg_tre_1' && b.bs.a === 'x'); v.type = 'bs_vegg_tre_dør_1'; const K3 = V.oppdater({ leir: L3, start: [0, 0] });
  ok(K1 === K1b && K3 !== K1, 'Vei.oppdater: samme leir gir samme kart, en ny dør gir nytt kart');
  ok(V.endrerVei({ del: 'vegg', gjør: 'riv' }) && V.endrerVei({ del: 'åpning' }) && !V.endrerVei({ del: 'tak' }), 'endrerVei: vegg/åpning ja, tak nei');
  void K;
}
// ---------- 8. møbler sperrer, bruksplassen er fri ----------
{ const m = B.fraKart(rekt(12, 9), { i: 4242, kl: 'hus', h: 5, tak: 'flatt' }), e = m.etasjer.find(q => q.n === 1), q = e.møbler.find(x => x.sperrer && x.b * x.d > 1.2);
  if (q) { V.lag({ bygninger: [m], start: [-6, -6] }); const bp = V.bruksplass(q, (x, y) => B.inni(m.P, x, y), e.møbler), s = V.kanNå({ x: q.x, y: q.y, hus: 'hus4242' }), b = V.kanNå({ x: bp[0], y: bp[1], hus: 'hus4242', bruksplass: true });
    ok(!s.ok && b.ok, 'møbelet (' + q.type + ') sperrer, bruksplassen foran nås (' + s.grunn + ' / ' + b.ok + ')'); }
  else ok(true, '(ingen stort møbel i prøvehuset)');
}
// ---------- 9. YTELSE: prøveleirer med 10, 50 og 200 folk ----------
{ console.log('--- ytelse (ms; maskinen er delt) ---');
  for (const [folk, nHus] of [[10, 2], [50, 10], [200, 40]]) {
    nr = 0; const deler = []; const S = Math.ceil(Math.sqrt(nHus));
    for (let k = 0; k < nHus; k++) deler.push(...hus(k % 3 === 0 ? 'bunker' : 'brakke', (k % S) * 7, Math.floor(k / S) * 6, k % 4));
    const L = { bygg: [], byggesett: { ox: 0, oy: 0 } }; const D = S * 7 * 2.4;
    L.bygg.push({ id: 1, type: 'lagertelt', x: D + 12, y: 5, ret: 0, igjen: 0, hp: 100 }, { id: 2, type: 'verksted', x: D + 15, y: D * .6, ret: 0, igjen: 0 }, { id: 3, type: 'kontrollrom', x: -14, y: D / 2, ret: Math.PI, igjen: 0 });
    deler.forEach((d, k) => L.bygg.push({ id: 100 + k, type: d.type, x: 0, y: 0, bs: { i: d.i, j: d.j, a: d.a, n: d.n, r: d.r }, igjen: 0, hp: 100 }));
    L.romBruk = {}; const R0 = BS.rom(BS.fraLeir(L, Leir)); R0.forEach((r, k) => { if (k % 5 === 1) L.romBruk[r.nøkkel] = 'kjøkken'; });
    const [K, tLag] = ms(() => V.lag({ leir: L, start: [D / 2, -8] }));
    // folkene står på tilfeldige frie ruter
    let frø = 7; const tilf = () => ((frø = (frø * 16807) % 2147483647) / 2147483647); const P = [];
    while (P.length < folk) { const n = Math.floor(tilf() * K.N), Lg = K.lagene[K.nlag[n]]; if (Lg.fri[n - Lg.off] && V.kanNå(V.punkt(K, n)).ok) P.push(V.punkt(K, n)); }
    // finn() fra hver person til en tilfeldig annen
    const [, tFinn] = ms(() => { for (let k = 0; k < folk; k++) V.finn(P[k], P[(k * 7 + 3) % folk]); });
    const [vk, tKart] = ms(() => ['lager', 'kjøkken', 'seng', 'verksted'].map(m => V.veikart(m)));
    // én «takt» med veikartene: hver person slår opp neste rute mot sitt mål (som F2 gjør 4 ganger i sekundet)
    const noder = P.map(p => V.node(K, p)); const [, tTakt] = ms(() => { let s = 0; for (let g = 0; g < 4; g++) for (let k = 0; k < folk; k++) { const V2 = vk[k % 4]; s += V2.nesteNode(noder[k]); } return s; });
    const [, tOpp] = ms(() => { for (let g = 0; g < 4; g++) for (let k = 0; k < folk; k++) vk[k % 4].neste(P[k]); });
    const nåddAlle = vk.every(v => P.every(p => v.avstand(p) < Infinity || v.kilder === 0));
    console.log(`  ${folk} folk, ${nHus} hus (${K.N} ruter, ${K.rom.length} rom, ${K.portaler.length} dører/trapper): Vei.lag ${tLag.toFixed(1)} · finn ${(tFinn / folk).toFixed(2)} per spørring · veikart ${(tKart / 4).toFixed(1)} per mål · 4 takter med veikart: noder ${tTakt.toFixed(3)} / punkter ${tOpp.toFixed(2)} (alle ${folk} folk)`);
    ok(nåddAlle, folk + ' folk: alle når målene i veikartene');
    ok(tTakt < 5 && tOpp < 50, folk + ' folk × 4 takter med veikartene tar ' + tOpp.toFixed(2) + ' ms (mål: «uten merkbar tid»)');
    if (folk === 200) ok(tKart / 4 < 400 && tLag < 2000, '200 folk: veikart ' + (tKart / 4).toFixed(0) + ' ms per mål, Vei.lag ' + tLag.toFixed(0) + ' ms');
  }
}
// ---------- (28. nov, fiks c) veikartet over en stor leir: avstandene rundes ikke opp, så ingen rute legges i haugen om og om igjen ----------
// (med Float32Array gikk siden tom for minne: et bygg 400 m fra leirens midte ga 30 s og over 3 GB i nettleseren)
{ const K = V.lag({ deler: [], start: [0, 0], mål: { langt: [[300, 300]] } }), [vk, t] = ms(() => V.veikart('langt')), a = vk.avstand({ x: 0, y: 0 });
  ok(t < 2000 && Math.abs(a - 300 * Math.SQRT2) < 3, `veikart over ${K.N} ruter til et mål 424 m unna: ${t.toFixed(0)} ms, ${a.toFixed(1)} m`); }
console.log(feil ? `\n${feil} FEIL` : '\nAlle sjekker ok'); process.exit(feil ? 1 : 0);
