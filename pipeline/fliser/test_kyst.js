// Test av reglene for kysten i 3D (site/dovre-fliser/spill/kyst.js). Kjør: node pipeline/fliser/test_kyst.js
const K = require('../../site/dovre-fliser/spill/kyst.js');
let feil = 0; const sjekk = (ok, tekst) => { console.log(`${ok ? 'ok  ' : 'FEIL'} ${tekst}`); if (!ok) feil++; };

// Kunstig kyst i kartets meter: sjø øst for en buktet strandlinje, ei øy, og et tettsted i nord. Et hus står på stranda.
const KX = 500000, KY = 7000000;
const strand = Y => KX + 40 * Math.sin((Y - KY) / 90);
const sjøG = (X, Y) => X > strand(Y) && !(Math.hypot(X - (KX + 400), Y - (KY - 300)) < 60);
const mohG = (X, Y) => sjøG(X, Y) ? 0 : Math.max(.5, (strand(Y) - X) * .08);
const husG = (X, Y) => Math.abs(X - (strand(KY + 200) - 6)) < 5 && Math.abs(Y - (KY + 200)) < 5;
const byG = (X, Y) => Y > KY + 50;
function kjør(cx, cy, mobil) {
  return K.plasser({ S: 1000, cx, cy, mobil, sjø: (x, y) => sjøG(x + cx, y + cy), moh: (x, y) => mohG(x + cx, y + cy), by: (x, y) => byG(x + cx, y + cy), hinder: (x, y) => husG(x + cx, y + cy) });
}
const u = kjør(KX, KY, false);
console.log(`båter ${u.båter.length}, brygger ${u.brygger.length}, naust ${u.naust.length}, bøyer ${u.bøyer.length}`);
sjekk(u.båter.length > 10 && u.brygger.length > 2 && u.naust.length > 0 && u.bøyer.length > 0, 'alle fire slagene finnes langs kysten');
// båtene: hele skroget på sjøen (midten, baug og akter)
const påSjø = b => [-.5, 0, .5].every(f => sjøG(b.x + KX + Math.cos(b.a) * b.L * f, b.y + KY + Math.sin(b.a) * b.L * f));
sjekk(u.båter.every(påSjø), `alle båtene ligger på sjøen (${u.båter.filter(b => !påSjø(b)).length} på land)`);
sjekk(u.båter.some(b => b.fri) && u.båter.some(b => !b.fri), 'både fortøyde båter og båter ute på sjøen');
sjekk(u.båter.filter(b => !b.fri).every(b => byG(b.x + KX, b.y + KY) || u.naust.some(n => Math.hypot(n.x - b.x, n.y - b.y) < 15)), 'fortøyde båter bare i tettsteder eller ved et naust');
// bryggene: hele lengden på sjøen, bare i tettstedet
sjekk(u.brygger.every(b => { for (let t = 2; t <= b.L; t += 2) if (!sjøG(b.x + KX + Math.cos(b.a) * t, b.y + KY + Math.sin(b.a) * t)) return false; return byG(b.x + KX, b.y + KY); }), 'flytebryggene ligger ute på sjøen i tettstedet');
// naust: på land, utenfor tettstedet, ikke i huset, gavlen mot sjøen
sjekk(u.naust.every(n => !sjøG(n.x + KX, n.y + KY) && !byG(n.x + KX, n.y + KY) && !husG(n.x + KX, n.y + KY)), 'naustene står på land utenfor tettstedet og ikke i hus');
sjekk(u.naust.every(n => sjøG(n.x + KX + Math.cos(n.a) * (n.L / 2 + 3), n.y + KY + Math.sin(n.a) * (n.L / 2 + 3))), 'gavlen (porten) på naustene vender mot sjøen');
sjekk(u.bøyer.every(b => sjøG(b.x + KX, b.y + KY)), 'bøyene ligger på sjøen');
// innsjø (ikke sjø): ingenting
const tom = K.plasser({ S: 1000, cx: 0, cy: 0, sjø: () => false, moh: () => 300, by: () => true });
sjekk(!tom.båter.length && !tom.naust.length && !tom.brygger.length && !tom.bøyer.length, 'uten sjø: ingen båter, naust, brygger eller bøyer');
// fast plassering: utsnittet flyttet 300 m gir de samme tingene på de samme stedene i kartet (der begge utsnittene dekker)
const v = kjør(KX + 288, KY - 192, false), glob = (l, cx, cy) => new Set(l.filter(o => Math.abs(o.x + cx - KX - 144) < 400 && Math.abs(o.y + cy - KY + 96) < 400).map(o => Math.round(o.x + cx) + ',' + Math.round(o.y + cy)));
const a = glob(u.naust.concat(u.brygger), KX, KY), b = glob(v.naust.concat(v.brygger), KX + 288, KY - 192);
sjekk(a.size > 0 && [...a].every(s => b.has(s)), `fast plassering når utsnittet flyttes (${a.size} naust/brygger i overlappet)`);
// åpent hav (feilretting 12. nov: småbåter 110 km til havs ved Troll A): ingen båter uten land i nærheten, og båtene ute på sjøen
// langs kysten ligger høyst 800 m fra land
const hav = K.plasser({ S: 1500, cx: -114473, cy: 6776192, sjø: () => true, moh: () => 0, by: () => false });
sjekk(hav.båter.length === 0 && hav.bøyer.length === 0, `åpent hav uten land i utsnittet: ingen småbåter (${hav.båter.length})`);
const tilLand = b => { let best = Infinity; for (let a = 0; a < 6.283; a += .1) for (let r = 20; r <= 1200; r += 20) if (!sjøG(b.x + KX + Math.cos(a) * r, b.y + KY + Math.sin(a) * r)) { best = Math.min(best, r); break; } return best; };
sjekk(u.båter.filter(b => b.fri).every(b => tilLand(b) <= 820), `båtene ute på sjøen ligger høyst 800 m fra land (lengst ${Math.max(...u.båter.filter(b => b.fri).map(tilLand))} m)`);
// tak på antall (mobil færre)
const m = kjør(KX, KY, true);
sjekk(m.båter.length <= K.TAK.mobil.båter && m.båter.length <= u.båter.length && u.båter.length <= K.TAK.pc.båter, `tak på antall (PC ${u.båter.length}, mobil ${m.båter.length})`);
// ---------- KAIER (runde 15): ekte kai bare der kaidataene sier det ----------
// Kaipunkt (kai, 120 m) midt på stranda i tettstedet, småbåthavn lenger sør, og ingenting langs resten av kysten.
const kaiV = (kaier, mobil) => ({ S: 1000, cx: KX, cy: KY, mobil, kaier, sjø: (x, y) => sjøG(x + KX, y + KY), moh: (x, y) => mohG(x + KX, y + KY), by: (x, y) => byG(x + KX, y + KY) });
const kp = { x: strand(KY + 300) - KX - 3, y: 300, t: 1, l: 120 }, mp = { x: strand(KY - 500) - KX - 3, y: -500, t: 2, l: 60 };
const ka = K.plasserKai(kaiV([kp, mp]));
console.log(`kaibiter ${ka.biter.length}, steiner ${ka.stein.length}`);
sjekk(ka.biter.length >= 8, `kaibiter langs stranda ved kaipunktet (${ka.biter.length})`);
// fasit uten å spørre modulen: kai med 120 m kailengde i tettsted = (35 + 0,5 · 120) · 1,35 ≈ 128 m
const rk = 128.3;
sjekk(ka.biter.every(b => Math.hypot(b.x - kp.x, b.y - kp.y) <= rk + 12), `alle kaibitene innen ${Math.round(rk)} m fra kaipunktet – ikke kai over alt`);
// fronten står i vannkanten: litt inn er land, litt ut er sjø, og retningen peker ut mot sjøen
const vk = b => !sjøG(b.x + KX - Math.cos(b.a) * 3, b.y + KY - Math.sin(b.a) * 3) && sjøG(b.x + KX + Math.cos(b.a) * 3, b.y + KY + Math.sin(b.a) * 3);
sjekk(ka.biter.filter(vk).length >= ka.biter.length * .9, `fronten står i vannkanten med retning ut mot sjøen (${ka.biter.filter(vk).length} av ${ka.biter.length})`);
sjekk(ka.biter.every(b => b.z >= K.KAI.høyde[0] && b.z <= K.KAI.høyde[1]), 'dekket ligger 1,3–2,6 moh.');
const sp = Math.max(...ka.biter.map(b => Math.max(...ka.biter.filter(o => Math.hypot(o.x - b.x, o.y - b.y) < 14).map(o => Math.abs(o.z - b.z)))));
sjekk(sp < .35, `nabobitene har nesten samme dekkhøyde (største sprang ${sp.toFixed(2)} m)`);
sjekk(ka.biter.some(b => b.pullert) && ka.biter.some(b => b.lykt) && ka.biter.some(b => b.stige), 'pullerter, lykter og stiger finnes');
sjekk(ka.stein.length > 0 && ka.stein.every(s => Math.hypot(s.x - mp.x, s.y - mp.y) < 74 + 20), `steinsetting bare ved småbåthavna (${ka.stein.length} steiner)`);
// ingen kaipunkter = ingen kai; et kaipunkt inne i landet (ingen sjø i nærheten) = ingen kai
sjekk(K.plasserKai(kaiV([])).biter.length === 0, 'uten kaidata: ingen kai');
sjekk(K.plasserKai(kaiV([{ x: -600, y: 0, t: 1, l: 200 }])).biter.length === 0, 'kaipunkt langt fra sjøen: ingen kai');
// ved en ferjekai lager infra3d.js sin egen kai
sjekk(K.plasserKai(Object.assign(kaiV([Object.assign({}, kp, { t: 4 })]), { ferje: () => true })).biter.length === 0, 'ferjeterminal med egen ferjekai: ingen ekstra kai');
// fast: samme kaier når utsnittet flyttes
const kb = K.plasserKai(Object.assign(kaiV([]), { cx: KX + 120, cy: KY + 60, kaier: [{ x: kp.x - 120, y: kp.y - 60, t: 1, l: 120 }], sjø: (x, y) => sjøG(x + KX + 120, y + KY + 60), moh: (x, y) => mohG(x + KX + 120, y + KY + 60), by: (x, y) => byG(x + KX + 120, y + KY + 60) }));
const nøk = (l, dx, dy) => new Set(l.map(b => b.X + ',' + b.Y + ',' + b.stil));
const A1 = nøk(ka.biter.filter(b => Math.hypot(b.x - kp.x, b.y - kp.y) < 200)), B1 = nøk(kb.biter);
sjekk(A1.size > 0 && [...B1].every(s => A1.has(s)), `fast plassering når utsnittet flyttes (${B1.size} biter)`);
sjekk(ka.biter.length > 0 && K.påKai(ka.biter, ka.biter[0].x - Math.cos(ka.biter[0].a) * 4, ka.biter[0].y - Math.sin(ka.biter[0].a) * 4) && !K.påKai(ka.biter, ka.biter[0].x + Math.cos(ka.biter[0].a) * 4, ka.biter[0].y + Math.sin(ka.biter[0].a) * 4), 'påKai: på dekket ja, ute i sjøen nei');
// byhavn: i tettstedet blir kysten kai langt fra kaipunktet bare der en gate går langs sjøen (v.gate)
const medGate = g => K.plasserKai(Object.assign(kaiV([kp]), { gate: () => g }));
const g1 = medGate(true), g0 = medGate(false), fjern = l => l.filter(b => Math.hypot(b.x - kp.x, b.y - kp.y) > 140).length;
sjekk(fjern(g1.biter) > 5 && fjern(g0.biter) === 0, `byhavn langs gata: ${fjern(g1.biter)} biter utenfor kaiens radius, uten gate ${fjern(g0.biter)}`);
sjekk(g1.biter.every(b => byG(b.x + KX, b.y + KY) && Math.hypot(b.x - kp.x, b.y - kp.y) < 470), 'byhavn bare i tettstedet og innen 450 m');
const km = K.plasserKai(kaiV([kp, mp], true));
sjekk(km.biter.length <= K.KAI.tak.mobil.biter, `tak på kaibiter på mobil (${km.biter.length})`);
process.exit(feil ? 1 : 0);
