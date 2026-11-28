// Test for spill/maskiner.js (industrimaskinene, produksjonslinjene og modellene): node pipeline/fliser/test_maskiner.js
// (ut9-maskiner, 28. nov) Sjekker at alle bransjene får maskinene sine i hallen i en linje fra porten, at ingen maskin står i en vegg
// eller en døråpning, at gangveiene er frie (du kommer fra hver dør til midten av hvert rom og bort til hver maskin i linja), at
// variasjonene er faste per bygg, at hver modell er gyldig og ikke for tung, og at symbolene og de bevegelige delene finnes.
const path = require('path');
const S = path.join(__dirname, '..', '..', 'site', 'dovre-fliser', 'spill');
const Interior = require(path.join(S, 'interior.js'));
const Industri = require(path.join(S, 'industri.js'));
const M = require(path.join(S, 'maskiner.js'));
let feil = 0; const ok = (v, t) => { if (!v) feil++; console.log((v ? 'ok   ' : 'FEIL ') + t); };
Industri.koble(Interior);

// 1) modellene: hver maskin har en modell, alle kassene har tall, og trekantene per maskin er innenfor grensen
// (en kasse = 12 trekanter, en sylinder = 24 – som spill/interior3d.js tegner dem). Grensen er Claudes forslag.
const GRENSE = 900;
const tell = type => { const Mm = Industri.MASKINER[type] || Interior.MØBLER[type]; const m = { type, b: Mm[0], d: Mm[1], h: Mm[2], f: .37 }, K = [];
  const har = Industri.deler(m, (...a) => K.push(a)); return { har, K, tri: K.reduce((s, k) => s + (k[8] ? 24 : 12), 0) }; };
{ let dårlig = [], tunge = [], n = 0, sum = 0;
  for (const type of Object.keys(M.MASKINER).concat(Object.keys(M.MODELLER))) { if (!Industri.MODELLER[type]) { dårlig.push(type + ' (ingen modell)'); continue; }
    const { har, K, tri } = tell(type); n++; sum += tri;
    if (!har || K.length < 3 || K.some(k => k.length < 7 || !k.slice(0, 6).every(Number.isFinite) || k[1] < k[0] || k[3] < k[2] || k[5] < k[4] || !Array.isArray(k[6]))) dårlig.push(type);
    if (tri > GRENSE) tunge.push(type + ' ' + tri); }
  ok(!dårlig.length, `alle ${n} modellene er gyldige (minst tre deler, tall, riktig vei)` + (dårlig.length ? ': ' + dårlig.join(', ') : ''));
  ok(!tunge.length, `ingen modell over ${GRENSE} trekanter (snitt ${Math.round(sum / n)})` + (tunge.length ? ': ' + tunge.join(', ') : ''));
  const gamle = ['knuser', 'filetmaskin', 'kompressor', 'dreiebenk', 'generator', 'reaktor'].filter(t => tell(t).K.length < 8);
  ok(!gamle.length, 'kassemodellene er byttet ut (minst åtte deler): ' + (gamle.join(', ') || 'alle')); }
// selvtest: en modell med en deltaker som går feil vei skal fanges
{ const K = []; M.MODELLER.prøve = (m, k) => { k(1, 0, 0, 1, 0, 1, [1, 1, 1]); k(0, 1, 0, 1, 0, 1, [1, 1, 1]); k(0, 1, 0, 1, 0, 1, [1, 1, 1]); };
  M.MODELLER.prøve({}, (...a) => K.push(a)); ok(K.some(k => k[1] < k[0]), 'selvtest: en kasse som går feil vei blir sett'); delete M.MODELLER.prøve; }

// 2) linjene i hallene
const rekt = (w, h) => [[0, 0], [w, 0], [w, h], [0, h]];
const dør = (P, k, t, w) => { const a = P[k], b = P[(k + 1) % P.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L; return { x: a[0] + ux * L * t, y: a[1] + uy * L * t, ux, uy, w }; };
const plan = (ind, P, i, k) => Interior.plan(P, { i, kl: 'industri', h: 9, ind, dør: dør(P, k, .5, 4) });
// kan du gå fra (x0, y0) til målene? Rutenett på 0,35 m inne i omrisset, Interior.blokkert som når du går
function nås(pl, x0, y0, mål) {
  const P = pl.P, st = .35, xs = P.map(p => p[0]), ys = P.map(p => p[1]), X0 = Math.min(...xs) - .5, Y0 = Math.min(...ys) - .5, W = Math.ceil((Math.max(...xs) - X0 + .5) / st), H = Math.ceil((Math.max(...ys) - Y0 + .5) / st);
  const fri = new Uint8Array(W * H), sett = new Uint8Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const x = X0 + (i + .5) * st, y = Y0 + (j + .5) * st; fri[j * W + i] = Interior.inni(P, x, y) && !Interior.blokkert(pl, x, y) ? 1 : 0; }
  const ci = x => Math.floor((x - X0) / st), cj = y => Math.floor((y - Y0) / st);
  // start: nærmeste frie rute rundt startpunktet
  let s = -1; for (let r = 0; r < 4 && s < 0; r++) for (let dj = -r; dj <= r && s < 0; dj++) for (let di = -r; di <= r; di++) { const i = ci(x0) + di, j = cj(y0) + dj; if (i >= 0 && j >= 0 && i < W && j < H && fri[j * W + i]) { s = j * W + i; break; } }
  if (s < 0) return mål.map(() => false); const kø = [s]; sett[s] = 1;
  while (kø.length) { const q = kø.pop(), i = q % W, j = (q - i) / W; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= W || b >= H) continue; const n = b * W + a; if (fri[n] && !sett[n]) { sett[n] = 1; kø.push(n); } } }
  // et mål er nådd når en rute innen 1,2 m er nådd (målet kan stå inntil en maskin)
  return mål.map(([x, y]) => { for (let dj = -4; dj <= 4; dj++) for (let di = -4; di <= 4; di++) { const i = ci(x) + di, j = cj(y) + dj; if (i >= 0 && j >= 0 && i < W && j < H && sett[j * W + i] && Math.hypot(di, dj) * st <= 1.2) return true; } return false; });
}
const FORMER = [[32, 18], [24, 14], [44, 26], [20, 30], [60, 22]];
const harLinje = {}, iVegg = [], iDør = [], stengt = [], baklengs = [], motFlyt = [];
let planer = 0, maskiner = 0;
for (const ind of Industri.ALLE) for (let f = 0; f < FORMER.length; f++) for (const k of [0, 1]) {
  const [w, h] = FORMER[f], P = rekt(w, h), pl = plan(ind, P, 3000 + ind * 31 + f * 7 + k, k); planer++;
  // som i spillet (etasjer3d.js): friInngang tar bort det som sperrer rett innenfor dørene – ingen maskin i linja skal stå der
  const før = pl.møbler.filter(m => m.linje !== undefined).length; Interior.friInngang(pl);
  const L = pl.møbler.filter(m => m.linje !== undefined).sort((a, b) => a.linje - b.linje); if (L.length !== før) iDør.push(`${ind}/${w}x${h} linja (${før - L.length} tatt bort)`); harLinje[ind] = Math.max(harLinje[ind] || 0, L.length); maskiner += L.length;
  // inne i bygget, ikke i en vegg (alle fire hjørner og midten inne, minst 5 cm fra ytterveggen)
  for (const m of pl.møbler) { const c = Math.cos(m.a), s = Math.sin(m.a);
    for (const [a, b] of [[0, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { const x = m.x + (a * m.b / 2 * .98) * c - (b * m.d / 2 * .98) * s, y = m.y + (a * m.b / 2 * .98) * s + (b * m.d / 2 * .98) * c;
      if (!Interior.inni(P, x, y)) { iVegg.push(`${ind}/${w}x${h} ${m.type}`); break; } }
    // ikke i en døråpning: et sperrende møbel holder 0,9 m fra hver inngang
    if (m.sperrer) for (const q of pl.innganger || [pl.inngang]) { const ss = [], dd = [];
      for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { const x = m.x + (a * m.b / 2) * c - (b * m.d / 2) * s, y = m.y + (a * m.b / 2) * s + (b * m.d / 2) * c;
        ss.push((x - q.x) * q.ux + (y - q.y) * q.uy); dd.push(-((x - q.x) * q.nx + (y - q.y) * q.ny)); }
      // døras sone: åpningen og 0,9 m rett innenfor
      if (Math.min(...ss) < q.w / 2 - .05 && Math.max(...ss) > -q.w / 2 + .05 && Math.min(...dd) < .9 && Math.max(...dd) > 0) iDør.push(`${ind}/${w}x${h} ${m.type}`); } }
  // gangveiene: fra hver dør til midten av hvert rom og fram til hver maskin i linja
  const mål = pl.rom.filter(r => r.rolle !== 'utenfor' && r.areal > 4).map(r => pl.tilXY ? pl.tilXY((r.u0 + r.u1) / 2, (r.v0 + r.v1) / 2) : null).filter(Boolean);
  for (const m of L) { const c = Math.cos(m.a), s = Math.sin(m.a); mål.push([m.x - s * (m.d / 2 + .6), m.y + c * (m.d / 2 + .6)]); }
  for (const q of pl.innganger || [pl.inngang]) { const svar = nås(pl, q.inn[0], q.inn[1], mål); const n = svar.filter(v => !v).length; if (n) stengt.push(`${ind}/${w}x${h} dør ${q.type || 'inn'}: ${n} av ${mål.length}`); }
  // linja går én vei per felt: avstanden fra porten øker (eller snur én gang)
  if (L.length >= 3) { const q = (pl.innganger || []).find(z => z.type === 'vare') || pl.inngang; let snu = 0, forrige = null, ret = 0;
    for (const m of L) { const d = Math.hypot(m.x - q.inn[0], m.y - q.inn[1]); if (forrige !== null) { const r = Math.sign(d - forrige); if (ret && r && r !== ret) snu++; if (r) ret = r; } forrige = d; }
    if (snu > 2) baklengs.push(`${ind}/${w}x${h}`);
    // maskinens x-akse (båndets pil) peker mot neste maskin i linja
    for (let j = 0; j + 1 < L.length; j++) { const a = L[j], b = L[j + 1], dx = b.x - a.x, dy = b.y - a.y, langs = dx * Math.cos(a.a) + dy * Math.sin(a.a), tvers = Math.abs(-dx * Math.sin(a.a) + dy * Math.cos(a.a));
      if (Interior.MØBLER[a.type][1] <= Interior.MØBLER[a.type][0] * 1.5 && tvers < 1 && langs < 0) motFlyt.push(`${ind}/${w}x${h} ${a.type}`); } }
}
const mangler = Industri.ALLE.filter(t => t !== 11 && !(harLinje[t] >= 2));
ok(!mangler.length, 'alle bransjene har en produksjonslinje med minst to maskiner (' + Object.entries(harLinje).map(([t, n]) => t + ':' + n).join(' ') + ')' + (mangler.length ? ' – mangler ' + mangler : ''));
ok(maskiner > planer * 2.5, `maskinene står i linjene (${maskiner} i ${planer} haller)`);
ok(!iVegg.length, 'ingen maskin står i en yttervegg' + (iVegg.length ? ': ' + iVegg.slice(0, 5).join(', ') : ''));
ok(!iDør.length, 'ingen maskin står i en døråpning' + (iDør.length ? ': ' + iDør.slice(0, 5).join(', ') : ''));
ok(!stengt.length, 'gangveiene er frie: fra hver dør til midten av hvert rom og fram til hver maskin' + (stengt.length ? ': ' + stengt.slice(0, 6).join('; ') : ''));
ok(!motFlyt.length, 'maskinene vender i flytretningen (pila på båndene)' + (motFlyt.length ? ': ' + motFlyt.slice(0, 5).join(', ') : ''));
ok(!baklengs.length, 'linja går fra porten og innover (snur høyst i U)' + (baklengs.length ? ': ' + baklengs.join(', ') : ''));
// selvtest av gangveitesten: en sperrende vegg tvers over hallen skal stenge
{ const P = rekt(30, 16), pl = plan(8, P, 77, 0); pl.vegger.push({ ax: 15, ay: 0, bx: 15, by: 16, t: .2 }); const q = pl.inngang, r = nås(pl, q.inn[0], q.inn[1], [[3, 8], [27, 8]]);
  ok(r.includes(false), 'selvtest: en vegg tvers over hallen stenger gangveien (' + r + ')'); }
// lager: rullebane og truck
{ const pl = Interior.plan(rekt(32, 18), { i: 5, kl: 'lager', h: 9, dør: dør(rekt(32, 18), 0, .5, 4) }), t = new Set(pl.møbler.map(m => m.type));
  ok(t.has('pallereol') && t.has('rullebane') && t.has('truck'), 'lagerhallen: pallereoler, rullebane og truck (' + [...t].join(', ') + ')'); }

// 3) variasjoner: samme bygg gir samme linje, ulike bygg gir ulike linjer
{ const lin = i => plan(1, rekt(44, 26), i, 0).møbler.filter(m => m.linje !== undefined).map(m => m.type + Math.round(m.x) + ',' + Math.round(m.y)).join(' ');
  ok(lin(41) === lin(41), 'samme bygg gir samme linje'); const ulike = new Set(); for (let i = 0; i < 24; i++) ulike.add(lin(100 + i)); ok(ulike.size >= 4, 'ulike bygg gir ulike linjer (' + ulike.size + ' av 24)');
  const saga = new Set(); for (let i = 0; i < 24; i++) for (const m of plan(1, rekt(44, 26), 100 + i, 0).møbler) if (m.type === 'rammesag' || m.type === 'stokkbåndsag') saga.add(m.type);
  ok(saga.size === 2, 'sagbruket har rammesag eller båndsag (fast per bygg): ' + [...saga].join(', ')); }
// rekkefølgen: råvaren først, ferdigvaren sist (sagbruket)
{ let n = 0, rett = 0; for (let i = 0; i < 20; i++) { const L = plan(1, rekt(48, 26), 200 + i, 0).møbler.filter(m => m.linje !== undefined).sort((a, b) => a.linje - b.linje).map(m => m.type); if (L.length < 4) continue; n++;
    if (L[0] === 'tømmerstabel' && L.indexOf('barkemaskin') < L.indexOf('sagbenk') && L.indexOf('sagbenk') < L.indexOf('kantverk')) rett++; }
  ok(n > 10 && rett === n, `sagbruket: tømmer inn -> barking -> saging -> kantverk (${rett} av ${n})`); }
// innredning(): linja er med i lista (plantegningens linje og andre moduler leser den)
ok(Industri.innredning(6).some(x => x.type === 'sløyelinje' && x.plass === 'linje') && Industri.innredning(1).some(x => x.type === 'barkemaskin'), 'innredning(): maskinene i linja står i lista');

// 4) symbolene og de bevegelige delene
{ const uten = []; for (const ind of Industri.ALLE) for (const x of Industri.innredning(ind)) if (x.rom === 'hall' && !M.SYMBOL[x.type] && !['arbeidsbenk', 'pall', 'tønne', 'hylle', 'verktøyvogn', 'traverskran', 'sveisebås', 'ventil', 'gassflasker', 'ambolt', 'høvelbenk', 'stålbenk', 'pakkebord', 'sløyebenk', 'kjemikalieskap', 'tørkestativ', 'sagbenk'].includes(x.type)) uten.push(x.type);
  ok(!uten.length, 'alle maskinene i hallene har et 2D-symbol' + (uten.length ? ': mangler ' + [...new Set(uten)].join(', ') : '')); }
ok(['sagbruk', 'fyrkjele', 'vedkløyver', 'transportbånd', 'sagbenk'].every(t => M.LIV[t] && M.LIV[t].length), 'bevegelige deler for saga, fyrkjelen, vedkløyveren og båndene');
console.log(feil ? feil + ' FEIL' : 'alle maskintestene ok'); process.exit(feil ? 1 : 0);
