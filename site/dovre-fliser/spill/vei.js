/* Veien i byggene og i leiren (fase F1 i docs/plan-selskap-okonomi.md, kapittel 6.5 og 6.9): regler uten DOM.
 * Node: require('./vei') (henter bygning.js, leir.js og byggesett.js selv); nettleser: globalThis.Vei (lastes rett etter bygning.js).
 * F1 er bare veien – figurene går ikke etter den ennå (det er F2).
 *
 * RUTENETT («lag»): ett per etasje. Leirens bakke er ett lag på 1,2 m (ute + 1. etasje i byggesettet, rettet inn etter byggesettets
 * ruter på 2,4 m, så veggene ligger på kanten mellom to ruter). Etasjene over i byggesettet og husene i kartet (Bygning.fraKart) får egne lag;
 * husene i kartet bruker finere ruter (0,6 / 0,3 m) når et rom ellers ikke får en eneste rute. Vegger sperrer KANTEN mellom to ruter
 * (ikke rutene), dører og porter er åpninger i veggen (kan låses: lås 'egne' = bare egne folk, 'ingen' = ingen), møbler og maskiner sperrer
 * rutene de dekker unntatt bruksplassen foran dem, trapper binder etasjene sammen (lenker), og ytterdørene i husene i kartet binder huset til
 * bakken. Leirens bygg (Leir.BYGG) er hindringer på bakken, gjerdet og forsvaret (palisade, mur …) er vegger uten dør (porten er åpningen).
 * ROM-KARTET: rutene som henger sammen uten å gå gjennom en dør eller trapp, er ett «rom» (ute er også et rom). Rommene og dørene/trappene
 * mellom dem er en liten graf: finn() finner rommene veien går gjennom først, og så ruta for ruta (A*) bare i de rommene.
 * VEIKART (flytfelt): veikart(mål) regner avstanden fra alle rutene i hele leiren til målet én gang (Dijkstra); da trenger hver person bare
 * å slå opp neste rute (neste()). Kartene huskes til leiren endres.
 * Alle tall her er Claudes forslag (REGLER).
 */
(function (rot) {
  'use strict';
  const hent = n => { try { return require(n); } catch (e) { return null; } };
  const Bygning = rot.Bygning || (typeof require === 'function' ? hent('./bygning.js') : null);
  const Leir = rot.Leir || (typeof require === 'function' ? hent('./leir.js') : null);
  const BS = rot.ByggesettRegler || (typeof require === 'function' ? hent('./byggesett.js') : null);

  // ---------- REGLER (alle tallene er Claudes forslag) ----------
  const REGLER = {
    // ruta i leiren og i byggene (m; kapittel 6.5), og finere ruter for små rom i husene i kartet
    rute: 1.2, finere: [.6, .3],
    // leirens område går så langt ut over byggene, gjerdet og leirens midte (m)
    margin: 12,
    // en hindring (leirens bygg, et hus i kartet) sperrer også ruter med midten så nær kanten (m)
    hindreLuft: .35,
    // veggene forlenges så mye i hver ende, så ingen vei smetter gjennom et hjørne (m)
    veggEnde: .03,
    // en trapp koster så mange meter per meter løp (det går saktere opp og ned)
    trappKost: 2,
    // bruksplassen ligger så langt foran møbelet/maskinen (m)
    bruksAvst: .5,
    // et punkt hører til den nærmeste frie ruta innen så mange ruter
    søkRuter: 2,
    // høyst så mange ruter i ett lag (vern mot enorme leirer: ruta blir større)
    maksRuter: 250000,
    // veikartene som huskes (de vanligste målene)
    maksKart: 24,
  };
  // målene som har navn (veikart('lager') osv.): leirens bygg og rommene i byggesettet (bruk) og i husene (rolle)
  const MÅL = {
    lager: { bygg: ['lagertelt', 'container'], rom: ['lager', 'bod'] },
    kjøkken: { bygg: ['kantine', 'feltkjøkken', 'kjøkken'], rom: ['kjøkken'] },
    verksted: { bygg: ['verksted'], rom: ['verksted'] },
    sykestue: { bygg: ['sykestue'], rom: [] },
    seng: { bygg: ['brakke'], rom: ['soverom'] },
    kontrollrom: { bygg: ['kontrollrom'], rom: [] },
  };
  const GRUNN = { gulv: 'ingen gulv her', sperret: 'plassen er sperret', dør: 'rommet har ingen dør', låst: 'døra er låst', vei: 'ingen vei dit', bruk: 'ingen vei til bruksplassen' };

  // ---------- små hjelpere ----------
  const inni = (P, x, y) => { let inn = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const xi = P[i][0], yi = P[i][1], xj = P[j][0], yj = P[j][1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inn = !inn; } return inn; };
  const avstSeg = (x, y, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy, t = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0; return Math.hypot(x - ax - dx * t, y - ay - dy * t); };
  const avstKant = (P, x, y) => { let d = Infinity; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; d = Math.min(d, avstSeg(x, y, a[0], a[1], b[0], b[1])); } return d; };
  const står = d => !!d && d.tilstand !== 'revet' && d.tilstand !== 'ødelagt' && d.tilstand !== 'rast';
  const boks = P => { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const p of P) { a = Math.min(a, p[0]); c = Math.max(c, p[0]); b = Math.min(b, p[1]); d = Math.max(d, p[1]); } return [a, b, c, d]; };
  const r2 = v => Math.round(v * 100) / 100;
  // kryss mellom stykket a–b (kanten mellom to ruter) og c–d (veggen): gir hvor langt ut på veggen (0–1), eller −1
  function kryss(ax, ay, bx, by, cx, cy, dx, dy) {
    const rx = bx - ax, ry = by - ay, sx = dx - cx, sy = dy - cy, den = rx * sy - ry * sx; if (Math.abs(den) < 1e-12) return -1;
    const qx = cx - ax, qy = cy - ay, t = (qx * sy - qy * sx) / den, u = (qx * ry - qy * rx) / den;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? u : -1;
  }
  // de åtte retningene: fire rette (0–3) og fire på skrå (4–7); MOT[d] er motsatt retning
  const DI = [1, -1, 0, 0, 1, 1, -1, -1], DJ = [0, 0, 1, -1, 1, -1, 1, -1], MOT = [1, 0, 3, 2, 7, 6, 5, 4], LEN = [1, 1, 1, 1, Math.SQRT2, Math.SQRT2, Math.SQRT2, Math.SQRT2];
  // låsen på en dør: null (åpen), 'egne' (bare egne folk) eller 'ingen'
  const slipper = (lås, hvem) => !lås || (lås === 'egne' && hvem !== 'fremmed');

  // ---------- binærhaug (minste først) ----------
  function Haug() { this.n = []; this.p = []; }
  Haug.prototype.push = function (node, pri) { const n = this.n, p = this.p; let i = n.length; n.push(node); p.push(pri);
    while (i > 0) { const f = (i - 1) >> 1; if (p[f] <= pri) break; n[i] = n[f]; p[i] = p[f]; i = f; } n[i] = node; p[i] = pri; };
  Haug.prototype.pop = function () { const n = this.n, p = this.p, top = n[0], last = n.pop(), lp = p.pop(), L = n.length; this.sist = this.p0; this.topp = top;
    if (L) { let i = 0; for (;;) { let c = 2 * i + 1; if (c >= L) break; if (c + 1 < L && p[c + 1] < p[c]) c++; if (p[c] >= lp) break; n[i] = n[c]; p[i] = p[c]; i = c; } n[i] = last; p[i] = lp; }
    return top; };

  // ---------- ett lag (en etasje) ----------
  // spek: { id, hus, e, x0, y0, s, W, H, golv(x, y), inne(x, y), hindre [P], bruks [[x, y]], vegger [{ a, b, hull [[t0, t1, åpning]] }], P? }
  function lagLag(spek) {
    const { s, W, H, x0, y0 } = spek, N = W * H, fri = new Uint8Array(N), inne = new Uint8Array(N), kant = new Uint8Array(N), dør = new Uint8Array(N), sperr = new Uint8Array(N), dørRef = new Map();
    const cx = i => x0 + (i + .5) * s, cy = j => y0 + (j + .5) * s;
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i, x = cx(i), y = cy(j); if (spek.golv(x, y)) { fri[k] = 1; if (spek.inne(x, y)) inne[k] = 1; } }
    // hindringene: rutene med midten inne i omrisset (eller nærmere kanten enn luft)
    for (const h of spek.hindre || []) { const P = h.P || h, luft = h.luft || 0, [a, b, c, d] = boks(P);
      for (let j = Math.max(0, Math.floor((b - luft - y0) / s)); j <= Math.min(H - 1, Math.floor((d + luft - y0) / s)); j++)
        for (let i = Math.max(0, Math.floor((a - luft - x0) / s)); i <= Math.min(W - 1, Math.floor((c + luft - x0) / s)); i++) { const x = cx(i), y = cy(j); if (inni(P, x, y) || (luft && avstKant(P, x, y) < luft)) fri[j * W + i] = 0; } }
    // bruksplassen foran et møbel er alltid fri
    for (const [x, y] of spek.bruks || []) { const i = Math.floor((x - x0) / s), j = Math.floor((y - y0) / s); if (i >= 0 && j >= 0 && i < W && j < H && spek.golv(cx(i), cy(j))) fri[j * W + i] = 1; }
    // kantene: til en fri nabo; på skrå bare når begge rette naboene er frie (ikke gjennom et hjørne)
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i; if (!fri[k]) continue; let m = 0;
      for (let d = 0; d < 8; d++) { const a = i + DI[d], b = j + DJ[d]; if (a < 0 || b < 0 || a >= W || b >= H || !fri[b * W + a]) continue;
        if (d >= 4 && (!fri[j * W + a] || !fri[b * W + i])) continue; m |= 1 << d; }
      kant[k] = m; }
    // veggene: en kant som krysser veggen er sperret, unntatt i en åpning (åpningen + en halv rute på hver side, så også smale dører får en kant)
    const e0 = REGLER.veggEnde;
    for (const w of spek.vegger || []) { const L = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]); if (L < 1e-6) continue; const ex = (w.b[0] - w.a[0]) / L, ey = (w.b[1] - w.a[1]) / L;
      const ax = w.a[0] - ex * e0, ay = w.a[1] - ey * e0, bx = w.b[0] + ex * e0, by = w.b[1] + ey * e0, LL = L + 2 * e0;
      const [a, b, c, d] = boks([[ax, ay], [bx, by]]), i0 = Math.max(0, Math.floor((a - x0) / s) - 1), i1 = Math.min(W - 1, Math.floor((c - x0) / s) + 1), j0 = Math.max(0, Math.floor((b - y0) / s) - 1), j1 = Math.min(H - 1, Math.floor((d - y0) / s) + 1);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const k = j * W + i; if (!kant[k]) continue;
        for (let dd = 0; dd < 8; dd++) { if (!(kant[k] >> dd & 1)) continue; const u = kryss(cx(i), cy(j), cx(i + DI[dd]), cy(j + DJ[dd]), ax, ay, bx, by); if (u < 0) continue;
          const t = u * LL - e0, h = (w.hull || []).find(q => t >= q[0] - s / 2 && t <= q[1] + s / 2);
          if (h) { dør[k] |= 1 << dd; if (h[2]) dørRef.set(k * 8 + dd, h[2]); } else sperr[k] |= 1 << dd; } } }
    for (let k = 0; k < N; k++) if (sperr[k]) { kant[k] &= ~sperr[k]; dør[k] &= ~sperr[k]; }
    // symmetri: en kant er bare åpen når den er åpen fra begge sider
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i; if (!kant[k]) continue;
      for (let d = 0; d < 8; d++) { if (!(kant[k] >> d & 1)) continue; const n = (j + DJ[d]) * W + i + DI[d]; if (!(kant[n] >> MOT[d] & 1)) { kant[k] &= ~(1 << d); dør[k] &= ~(1 << d); } else if (dør[n] >> MOT[d] & 1) dør[k] |= 1 << d; } }
    for (let k = 0; k < N; k++) dør[k] &= kant[k];
    return { id: spek.id, hus: spek.hus, e: spek.e, bakke: !!spek.bakke, x0, y0, s, W, H, fri, inne, kant, dør, dørRef, P: spek.P || null, dk: DI.map((di, d) => DJ[d] * W + di) };
  }
  const tilRute = (L, x, y) => { const i = Math.floor((x - L.x0) / L.s), j = Math.floor((y - L.y0) / L.s); return i < 0 || j < 0 || i >= L.W || j >= L.H ? -1 : j * L.W + i; };
  // nærmeste frie rute innen r ruter (den nærmeste midten)
  function nærFri(L, x, y, r) {
    const k = tilRute(L, x, y); if (k >= 0 && L.fri[k]) return k; const i0 = Math.floor((x - L.x0) / L.s), j0 = Math.floor((y - L.y0) / L.s); let best = -1, bd = Infinity;
    for (let b = -r; b <= r; b++) for (let a = -r; a <= r; a++) { const i = i0 + a, j = j0 + b; if (i < 0 || j < 0 || i >= L.W || j >= L.H || !L.fri[j * L.W + i]) continue;
      const d = Math.hypot(L.x0 + (i + .5) * L.s - x, L.y0 + (j + .5) * L.s - y); if (d < bd) { bd = d; best = j * L.W + i; } }
    return best;
  }

  // ---------- byggenes lag ----------
  // åpningene du kan gå gjennom i en vegg: [t0, t1, åpning] (dør/port uten sperre, eller revet)
  const hullI = (et, w) => et.åpninger.filter(o => o.vegg === w.id && (o.type === 'dør' || o.type === 'port' || o.tilstand === 'revet') && !o.sperre).map(o => [o.t - o.b / 2, o.t + o.b / 2, o]);
  // bruksplassen foran et møbel: foran (lokal +v), ellers bak, ellers på sidene – den første som ligger inne på gulvet og ikke i et annet møbel
  function bruksplass(q, golv, andre) {
    const c = Math.cos(q.a || 0), sn = Math.sin(q.a || 0), d = REGLER.bruksAvst;
    const kand = [[0, q.d / 2 + d], [0, -q.d / 2 - d], [q.b / 2 + d, 0], [-q.b / 2 - d, 0]].map(([u, v]) => [q.x + u * c - v * sn, q.y + u * sn + v * c]);
    return kand.find(([x, y]) => (!golv || golv(x, y)) && !(andre || []).some(o => o !== q && o.sperrer && inniMøbel(o, x, y))) || kand[0];
  }
  const møbelP = q => { const c = Math.cos(q.a || 0), sn = Math.sin(q.a || 0), hb = q.b / 2, hd = q.d / 2; return [[-hb, -hd], [hb, -hd], [hb, hd], [-hb, hd]].map(([u, v]) => [q.x + u * c - v * sn, q.y + u * sn + v * c]); };
  const inniMøbel = (q, x, y) => inni(møbelP(q), x, y);
  // trappa sperrer rutene under seg (litt mindre enn trappa, så endene er frie)
  const trappP = t => { const c = Math.cos(t.a), sn = Math.sin(t.a), hl = Math.max(.05, t.l / 2 - .15), hb = Math.max(.05, t.b / 2 - .05); return [[-hl, -hb], [hl, -hb], [hl, hb], [-hl, hb]].map(([u, v]) => [t.x + u * c - v * sn, t.y + u * sn + v * c]); };
  // de vanlige sperringene i en etasje (møbler, søyler, trapper som ikke ender her)
  function etasjeHindre(m, et) {
    const H = [];
    for (const q of et.møbler || []) if (q.sperrer && står(q)) H.push(møbelP(q));
    for (const q of et.søyler || []) if (står(q)) H.push([[q.x - .2, q.y - .2], [q.x + .2, q.y - .2], [q.x + .2, q.y + .2], [q.x - .2, q.y + .2]]);
    for (const t of m.trapper || []) if (står(t) && (t.fra === et.n || t.til === et.n)) H.push(trappP(t));
    return H;
  }
  const etasjeBruks = (et, golv) => (et.møbler || []).filter(q => q.sperrer && står(q)).map(q => bruksplass(q, golv, et.møbler));
  const etasjeVegger = et => et.vegger.filter(står).map(w => ({ a: w.a, b: w.b, hull: hullI(et, w) }));
  // et hus fra kartet: ett lag per etasje; ruta blir finere når et rom ellers ikke får en eneste fri rute
  function husLag(m, nøkkel, sFast) {
    const ut = [], [a, b, c, d] = boks(m.P);
    for (const et of m.etasjer) { if (et.tilstand === 'revet') continue; let L = null;
      for (const s of sFast ? [sFast] : [REGLER.rute, ...REGLER.finere]) {
        const x0 = a - s, y0 = b - s, W = Math.ceil((c - x0) / s) + 2, H = Math.ceil((d - y0) / s) + 2, golv = (x, y) => inni(m.P, x, y);
        L = lagLag({ id: nøkkel + ':' + et.n, hus: nøkkel, e: et.n, x0, y0, s, W, H, golv, inne: () => true, hindre: etasjeHindre(m, et), bruks: etasjeBruks(et, golv), vegger: etasjeVegger(et), P: m.P });
        // har alle rommene (som er mer enn halvveis inne i huset) minst én fri rute?
        const tomt = et.rom.some(r => { if (r.andel < .5 || r.areal < 1) return false; const [p, q, u, v] = boks(r.P);
          for (let j = Math.max(0, Math.floor((q - y0) / s)); j <= Math.min(H - 1, Math.floor((v - y0) / s)); j++) for (let i = Math.max(0, Math.floor((p - x0) / s)); i <= Math.min(W - 1, Math.floor((u - x0) / s)); i++)
            if (L.fri[j * W + i] && inni(r.P, x0 + (i + .5) * s, y0 + (j + .5) * s)) return false;
          return true; });
        if (!tomt) break; }
      L.modell = m; L.etasje = et; ut.push(L); }
    return ut;
  }

  // Ruta for et hus fra kartet: 1,2 m når alle rommene nås da, ellers finere (0,6 / 0,3 m). Prøves på huset alene; svaret huskes på
  // modellen (ikke i JSON) til veggene, dørene eller trappene endres.
  function husRute(m, nøkkel) {
    const sg = signatur({ bygninger: [m] }); if (m._veiRute && m._veiRute.sg === sg) return m._veiRute.s;
    const [a, b] = boks(m.P); let valgt = REGLER.finere[REGLER.finere.length - 1];
    for (const s of [REGLER.rute, ...REGLER.finere]) {
      const K = lag({ bygninger: [m], start: [a - 3, b - 3], margin: 4, ruter: { [nøkkel]: s }, prøve: true });
      const alle = m.etasjer.every(et => et.tilstand === 'revet' || (et.rom || []).every(r => { if (r.andel < .5 || r.areal < 1.5) return true; const [p, q, u, v] = boks(r.P);
        return [[.5, .5], [.3, .3], [.7, .7], [.3, .7], [.7, .3]].some(([f, g]) => kanNå({ x: p + (u - p) * f, y: q + (v - q) * g, e: et.n, hus: nøkkel }, { kart: K }).ok); }));
      if (alle) { valgt = s; break; } }
    Object.defineProperty(m, '_veiRute', { value: { sg, s: valgt }, enumerable: false, configurable: true, writable: true });
    return valgt;
  }

  // ---------- hele leiren ----------
  // o = { bygninger: [modell] (husene i kartet, B7), leir: L (Leir-tilstanden: bygg, romBruk), deler (byggesettets deler; ellers fra leir),
  //       opphav: { ox, oy } (byggesettets rutenett), start: [x, y] (leirens midte), margin, mål: { navn: [[x, y, e?, hus?]] } (ekstra mål) }
  function lag(o = {}) {
    const t0 = Date.now(), s = REGLER.rute, lagene = [], lenker = [], mål = new Map(), G = BS ? BS.G : 2.4;
    const leir = o.leir || null, deler = o.deler || (leir && BS ? BS.fraLeir(leir, Leir) : []);
    const opphav = o.opphav || (leir && leir.byggesett) || { ox: o.start ? o.start[0] : 0, oy: o.start ? o.start[1] : 0 };
    const bs = deler.length && Bygning ? Bygning.fraByggesett(deler, opphav) : null;
    const hus = (o.bygninger || []).filter(Boolean).map((m, k) => ({ m, nøkkel: m.hus !== null && m.hus !== undefined ? 'hus' + m.hus : 'b' + k }));
    // leirens bygg (ikke byggesettets deler, ikke linjer): hindringer på bakken
    const LBYGG = leir && Leir ? leir.bygg.filter(b => Leir.BYGG[b.type] && !Leir.BYGG[b.type].del && !Leir.BYGG[b.type].linje && !Leir.BYGG[b.type].port) : [];
    // gjerdet (med åpninger der portene står) og forsvaret i byggesettet: vegger uten dør
    const stengsler = [];
    if (leir && Leir) for (const g of leir.bygg) { const B = Leir.BYGG[g.type]; if (!B || !B.linje || B.veg) continue; for (const [p, q] of Leir.gjerdeLedd(leir, g)) stengsler.push({ a: p, b: q, hull: [] }); }
    for (const d of deler) if (BS && BS.DELER[d.type] && BS.DELER[d.type].kat === 'forsvar' && d.ferdig !== false && d.type !== 'bs_piggtråd_ikke') { const [p, q] = BS.kantEnder(opphav, d); stengsler.push({ a: p, b: q, hull: [] }); }
    // området: alt over + margin, rettet inn etter byggesettets ruter
    const pkt = [];
    if (o.start) pkt.push(o.start);
    for (const b of LBYGG) pkt.push(...Leir.hjørner(b));
    for (const w of stengsler) pkt.push(w.a, w.b);
    if (bs) pkt.push(...bs.P);
    for (const h of hus) pkt.push(...h.m.P);
    for (const q of Object.values(o.mål || {})) for (const p of q) pkt.push(p);
    if (!pkt.length) pkt.push([opphav.ox, opphav.oy]);
    const M = o.margin !== undefined ? o.margin : REGLER.margin; let [a, b, c, d] = boks(pkt); a -= M; b -= M; c += M; d += M;
    let sB = s; while (((c - a) / sB) * ((d - b) / sB) > REGLER.maksRuter) sB *= 2;
    const x0 = opphav.ox + Math.floor((a - opphav.ox) / sB) * sB, y0 = opphav.oy + Math.floor((b - opphav.oy) / sB) * sB, W = Math.ceil((c - x0) / sB) + 1, H = Math.ceil((d - y0) / sB) + 1;
    // byggesettets 1. etasje ligger på bakken: gulvrutene er «inne», veggene sperrer kantene
    const golvSett = n => { const S = new Set(); for (const q of deler) if (BS && BS.DELER[q.type] && BS.DELER[q.type].kat === 'gulv' && q.n === n && q.ferdig !== false) S.add(q.i + ',' + q.j); return S; };
    const iGolv = (S, x, y) => S.has(Math.floor((x - opphav.ox) / G) + ',' + Math.floor((y - opphav.oy) / G));
    const g0 = golvSett(0), e1 = bs ? bs.etasjer.find(e => e.n === 1) : null;
    const hindreB = [...LBYGG.map(q => ({ P: Leir.hjørner(q), luft: REGLER.hindreLuft })), ...hus.map(h => ({ P: h.m.P, luft: REGLER.hindreLuft }))];
    if (e1) hindreB.push(...etasjeHindre(bs, e1));
    const bakke = lagLag({ id: 'bakke', hus: 'leir', e: 1, bakke: true, x0, y0, s: sB, W, H, golv: () => true, inne: (x, y) => iGolv(g0, x, y), hindre: hindreB,
      bruks: e1 ? etasjeBruks(e1, (x, y) => iGolv(g0, x, y)) : [], vegger: [...(e1 ? etasjeVegger(e1) : []), ...stengsler] });
    lagene.push(bakke);
    // etasjene over i byggesettet
    if (bs) for (const et of bs.etasjer) { if (et.n === 1) continue; const S = golvSett(et.n - 1), golv = (x, y) => iGolv(S, x, y);
      const [p, q, u, v] = boks(bs.P), lx0 = opphav.ox + Math.floor((p - opphav.ox) / s) * s - s, ly0 = opphav.oy + Math.floor((q - opphav.oy) / s) * s - s;
      const L = lagLag({ id: 'leir:' + et.n, hus: 'leir', e: et.n, x0: lx0, y0: ly0, s, W: Math.ceil((u - lx0) / s) + 2, H: Math.ceil((v - ly0) / s) + 2, golv, inne: () => true, hindre: etasjeHindre(bs, et), bruks: etasjeBruks(et, golv), vegger: etasjeVegger(et) });
      L.modell = bs; L.etasje = et; lagene.push(L); }
    if (bs && e1) { bakke.modell = bs; bakke.etasje = e1; }
    for (const h of hus) lagene.push(...husLag(h.m, h.nøkkel, (o.ruter && o.ruter[h.nøkkel]) || (o.prøve ? 0 : husRute(h.m, h.nøkkel))));
    // nodene: lagene etter hverandre
    let N = 0; for (const L of lagene) { L.off = N; N += L.W * L.H; }
    const nlag = new Uint16Array(N), nx = new Float32Array(N), ny = new Float32Array(N);
    lagene.forEach((L, li) => { for (let k = 0; k < L.W * L.H; k++) { const n = L.off + k; nlag[n] = li; nx[n] = L.x0 + (k % L.W + .5) * L.s; ny[n] = L.y0 + (((k / L.W) | 0) + .5) * L.s; } });
    const K = { versjon: (lag.teller = (lag.teller || 0) + 1), lagene, N, nlag, nx, ny, lenker: new Map(), mål, kart: new Map(), opphav, bs, hus, leirBygg: LBYGG, start: null, ms: 0 };
    const finnLag = (nøkkel, e) => lagene.find(L => L.hus === nøkkel && L.e === e) || null;
    const lenk = (a, b2, kost, ref) => { if (a < 0 || b2 < 0 || a === b2) return; for (const [p, q] of [[a, b2], [b2, a]]) { if (!K.lenker.has(p)) K.lenker.set(p, []); K.lenker.get(p).push([q, kost, ref]); } lenker.push({ a, b: b2, kost, ref }); };
    // trappene binder etasjene sammen
    const trapper = (m, nøkkel) => { for (const t of m.trapper || []) { if (!står(t)) continue; const lo = finnLag(nøkkel, t.fra), hi = finnLag(nøkkel, t.til); if (!lo || !hi) continue;
      const a2 = nærFri(lo, t.nede[0], t.nede[1], REGLER.søkRuter + 1), b2 = nærFri(hi, t.oppe[0], t.oppe[1], REGLER.søkRuter + 1);
      if (a2 >= 0 && b2 >= 0) lenk(lo.off + a2, hi.off + b2, Math.max(1, t.l) * REGLER.trappKost, { trapp: t.id, hus: nøkkel, fra: t.fra, til: t.til }); } };
    if (bs) trapper(bs, 'leir');
    for (const h of hus) { trapper(h.m, h.nøkkel);
      // ytterdørene i husene i kartet binder huset til bakken (en lenke fra ruta innenfor døra til ruta utenfor)
      const L1 = finnLag(h.nøkkel, 1), e = h.m.etasjer.find(q => q.n === 1); if (!L1 || !e) continue;
      for (const w of e.vegger) { if (w.type !== 'ytter' || !står(w)) continue; const Lw = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]); if (Lw < 1e-6) continue; const ex = (w.b[0] - w.a[0]) / Lw, ey = (w.b[1] - w.a[1]) / Lw;
        for (const [t0, t1, åp] of hullI(e, w)) { const t = (t0 + t1) / 2, px = w.a[0] + ex * t, py = w.a[1] + ey * t; let nx2 = -ey, ny2 = ex; if (!inni(h.m.P, px + nx2 * .3, py + ny2 * .3)) { nx2 = -nx2; ny2 = -ny2; }
          const inn = nærFri(L1, px + nx2 * (L1.s / 2 + .15), py + ny2 * (L1.s / 2 + .15), REGLER.søkRuter), ut2 = nærFri(bakke, px - nx2 * (bakke.s / 2 + REGLER.hindreLuft + .2), py - ny2 * (bakke.s / 2 + REGLER.hindreLuft + .2), REGLER.søkRuter);
          if (inn >= 0 && ut2 >= 0) lenk(L1.off + inn, bakke.off + ut2, Math.hypot(nx[L1.off + inn] - nx[bakke.off + ut2], ny[L1.off + inn] - ny[bakke.off + ut2]), { dør: åp, hus: h.nøkkel, åpning: åp ? åp.id : null }); } } }
    K.harLenke = new Uint8Array(N); for (const n of K.lenker.keys()) K.harLenke[n] = 1;
    K.lenkeListe = lenker;
    rom(K);
    // målene: leirens bygg (inngangen: midt foran, fronten mot +x), rommene i byggesettet (bruk) og i husene (rolle)
    const leggMål = (navn, node, hva) => { if (node < 0) return; if (!mål.has(navn)) mål.set(navn, []); mål.get(navn).push({ node, hva }); };
    for (const q of LBYGG) { const B = Leir.BYGG[q.type], c2 = Math.cos(q.ret || 0), s2 = Math.sin(q.ret || 0), u = B.fot[1] + .9, x = q.x + u * c2, y = q.y + u * s2, n = node(K, { x, y }, 4);
      leggMål('bygg:' + q.type, n, q.id); leggMål('id:' + q.id, n, q.id); for (const [navn, D] of Object.entries(MÅL)) if (D.bygg.includes(q.type)) leggMål(navn, n, q.id); }
    if (bs && BS) for (const r of BS.rom(deler, leir ? leir.romBruk : null)) { const x = opphav.ox + r.ci * G, y = opphav.oy + r.cj * G, n = node(K, { x, y, e: r.etasje + 1, hus: 'leir' }, 4);
      for (const [navn, D] of Object.entries(MÅL)) if (D.rom.includes(r.bruk)) leggMål(navn, n, r.nøkkel); leggMål('rom:' + r.nøkkel, n, r.nøkkel); }
    for (const h of hus) for (const et of h.m.etasjer) for (const r of et.rom || []) { const [p, q, u, v] = boks(r.P), n = node(K, { x: (p + u) / 2, y: (q + v) / 2, e: et.n, hus: h.nøkkel }, 4);
      for (const [navn, D] of Object.entries(MÅL)) if (D.rom.includes(r.rolle)) leggMål(navn, n, h.nøkkel + ':' + et.n + ':' + r.id); }
    for (const [navn, P] of Object.entries(o.mål || {})) for (const p of P) leggMål(navn, node(K, { x: p[0], y: p[1], e: p[2], hus: p[3] }, 4), null);
    // leirens midte: utgangspunktet for kanNå (rommet der folk er)
    const st = o.start || (LBYGG[0] ? [LBYGG[0].x, LBYGG[0].y] : null);
    K.start = st ? node(K, { x: st[0], y: st[1] }, 6) : -1;
    if (K.start < 0) { let best = -1, n0 = 0; for (const r of K.rom) if (r.ute && r.n > n0) { n0 = r.n; best = r.første; } K.start = best; }
    K.ms = Date.now() - t0; K.signatur = o.signatur || null;
    if (o.prøve) return K;
    return (api.nå = K);
  }

  // ---------- rom-kartet ----------
  // rommene: rutene som henger sammen uten å gå gjennom en dør eller trapp. Portaler: dørene og trappene mellom to rom.
  function rom(K) {
    const komp = new Int32Array(K.N).fill(-1), R = [], stakk = [];
    K.lagene.forEach(L => { for (let k = 0; k < L.W * L.H; k++) { if (!L.fri[k] || komp[L.off + k] >= 0) continue; const id = R.length, r = { id, lag: L.id, hus: L.hus, e: L.e, n: 0, ute: false, inne: 0, sx: 0, sy: 0, første: L.off + k, portaler: [] };
      R.push(r); komp[L.off + k] = id; stakk.push(k);
      while (stakk.length) { const q = stakk.pop(), n = L.off + q; r.n++; r.sx += K.nx[n]; r.sy += K.ny[n]; if (L.inne[q]) r.inne++; else if (L.bakke) r.ute = true;
        const m = L.kant[q] & ~L.dør[q]; if (!m) continue; for (let d = 0; d < 8; d++) if (m >> d & 1) { const p = q + L.dk[d]; if (komp[L.off + p] < 0) { komp[L.off + p] = id; stakk.push(p); } } } } });
    for (const r of R) { r.cx = r.sx / r.n; r.cy = r.sy / r.n; }
    // portalene: én per par av rom (og lås); punktet er snittet av kantene i døra
    const P = new Map(), portaler = [];
    const legg = (a, b, pa, pb, kost, lås, ref) => { const key = Math.min(a, b) + ':' + Math.max(a, b) + ':' + (ref && ref.trapp !== undefined ? 't' + ref.hus + ref.trapp : 'd') + ':' + (lås || '');
      let p = P.get(key); if (!p) { p = { id: portaler.length, a, b, sa: [0, 0, 0], sb: [0, 0, 0], kost, lås: lås || null, trapp: !!(ref && ref.trapp !== undefined), ref }; P.set(key, p); portaler.push(p); R[a].portaler.push(p.id); R[b].portaler.push(p.id); }
      const [A, B] = p.a === a ? [pa, pb] : [pb, pa]; p.sa[0] += A[0]; p.sa[1] += A[1]; p.sa[2]++; p.sb[0] += B[0]; p.sb[1] += B[1]; p.sb[2]++; };
    K.lagene.forEach(L => { for (let k = 0; k < L.W * L.H; k++) { const m = L.dør[k]; if (!m) continue;
      for (let d = 0; d < 4; d++) if (m >> d & 1) { const n = L.off + k, p = n + L.dk[d], a = komp[n], b = komp[p]; if (a === b || a > b) continue; const ref = L.dørRef.get(k * 8 + d), lås = ref ? ref.lås : null;
        legg(a, b, [K.nx[n], K.ny[n]], [K.nx[p], K.ny[p]], L.s, lås, null); } } });
    for (const l of K.lenkeListe) { const a = komp[l.a], b = komp[l.b]; if (a < 0 || b < 0 || a === b) continue; legg(a, b, [K.nx[l.a], K.ny[l.a]], [K.nx[l.b], K.ny[l.b]], l.kost, l.ref && l.ref.dør ? l.ref.dør.lås : null, l.ref); }
    for (const p of portaler) { p.pa = [p.sa[0] / p.sa[2], p.sa[1] / p.sa[2]]; p.pb = [p.sb[0] / p.sb[2], p.sb[1] / p.sb[2]]; delete p.sa; delete p.sb; }
    K.komp = komp; K.rom = R; K.portaler = portaler; K.nåbar = {};
  }
  // hvilke rom nås fra leirens midte (bredde først i rom-kartet), per hvem ('egne'/'fremmed'/'alle' = uten låser)
  function nåbar(K, hvem) {
    if (K.nåbar[hvem]) return K.nåbar[hvem]; const R = K.rom, ut = new Uint8Array(R.length), s0 = K.start >= 0 ? K.komp[K.start] : -1; if (s0 < 0) return (K.nåbar[hvem] = ut);
    const kø = [s0]; ut[s0] = 1;
    while (kø.length) { const r = kø.pop(); for (const pi of R[r].portaler) { const p = K.portaler[pi]; if (hvem !== 'alle' && !slipper(p.lås, hvem)) continue; const q = p.a === r ? p.b : p.a; if (!ut[q]) { ut[q] = 1; kø.push(q); } } }
    return (K.nåbar[hvem] = ut);
  }

  // ---------- punkt -> node ----------
  // p = { x, y, e?, hus? } eller [x, y]. Uten hus: et hus i kartet når punktet er inne i det (1. etasje, eller e), ellers bakken / byggesettets etasje e.
  function node(K, p, r) {
    if (Array.isArray(p)) p = { x: p[0], y: p[1], e: p[2], hus: p[3] }; const e = p.e === undefined || p.e === null ? 1 : p.e, rr = r === undefined ? REGLER.søkRuter : r;
    let L = null;
    if (p.hus !== undefined && p.hus !== null) L = K.lagene.find(q => q.hus === p.hus && q.e === e) || null;
    if (!L) L = K.lagene.find(q => !q.bakke && q.P && q.e === e && inni(q.P, p.x, p.y)) || null;
    if (!L && e !== 1) L = K.lagene.find(q => q.hus === 'leir' && q.e === e) || null;
    if (!L) L = K.lagene[0];
    const k = nærFri(L, p.x, p.y, rr); return k < 0 ? -1 : L.off + k;
  }
  const punkt = (K, n) => { const L = K.lagene[K.nlag[n]]; return { x: r2(K.nx[n]), y: r2(K.ny[n]), e: L.e, hus: L.hus }; };

  // ---------- søket ----------
  // naboene til node n: f(nabo, kost). hvem: låste dører; tillat: Uint8Array over rommene (bare disse rommene), eller null
  function naboer(K, n, hvem, tillat, f) {
    const L = K.lagene[K.nlag[n]], k = n - L.off, m = L.kant[k];
    if (m) for (let d = 0; d < 8; d++) { if (!(m >> d & 1)) continue; const q = n + L.dk[d];
      if (L.dør[k] >> d & 1) { const ref = L.dørRef.get(k * 8 + d); if (ref && !slipper(ref.lås, hvem)) continue; }
      if (tillat && !tillat[K.komp[q]]) continue; f(q, LEN[d] * L.s); }
    if (K.harLenke[n]) for (const [q, kost, ref] of K.lenker.get(n)) { if (ref && ref.dør && !slipper(ref.dør.lås, hvem)) continue; if (tillat && !tillat[K.komp[q]]) continue; f(q, kost); }
  }
  // A* fra node a til node b (avstanden i x, y er gjetningen – trappene koster mer, så den er aldri for stor)
  function aStjerne(K, a, b, hvem, tillat) {
    const g = new Float64Array(K.N).fill(Infinity), fra = new Int32Array(K.N).fill(-1), lukket = new Uint8Array(K.N), H = new Haug(), bx = K.nx[b], by = K.ny[b];
    g[a] = 0; H.push(a, Math.hypot(K.nx[a] - bx, K.ny[a] - by)); let n = -1, utvidet = 0;
    while (H.n.length) { n = H.pop(); if (lukket[n]) continue; lukket[n] = 1; utvidet++; if (n === b) break;
      const gn = g[n]; naboer(K, n, hvem, tillat, (q, kost) => { const ny2 = gn + kost; if (ny2 < g[q]) { g[q] = ny2; fra[q] = n; H.push(q, ny2 + Math.hypot(K.nx[q] - bx, K.ny[q] - by)); } }); }
    if (n !== b) return null;
    const sti = []; for (let q = b; q >= 0; q = fra[q]) sti.push(q); sti.reverse(); return { sti, lengde: g[b], utvidet };
  }
  // rommene veien går gjennom (Dijkstra over portalene; inne i et rom regnes rett linje mellom portalene)
  function romVei(K, a, b, hvem) {
    const ra = K.komp[a], rb = K.komp[b]; if (ra === rb) return [ra];
    const P = K.portaler, best = new Float64Array(P.length * 2).fill(Infinity), fra = new Int32Array(P.length * 2).fill(-1), H = new Haug();
    const side = (p, r) => (p.a === r ? 0 : 1), pt = (p, s) => (s === 0 ? p.pa : p.pb);
    // tilstand 2·p + s: står ved portal p på side s (i rommet p.a for s = 0, p.b for s = 1) – på vei UT av det rommet
    for (const pi of K.rom[ra].portaler) { const p = P[pi]; if (!slipper(p.lås, hvem)) continue; const s = side(p, ra), q = pt(p, s), c = Math.hypot(q[0] - K.nx[a], q[1] - K.ny[a]);
      if (c < best[2 * pi + s]) { best[2 * pi + s] = c; H.push(2 * pi + s, c); } }
    let mål = -1, målKost = Infinity; const endeKost = new Float64Array(P.length * 2).fill(Infinity);
    while (H.n.length) { const t = H.pop(), c = H.topp === t ? best[t] : best[t]; if (c >= målKost) break; const pi = t >> 1, s = t & 1, p = P[pi];
      // gå gjennom portalen til den andre siden
      const s2 = 1 - s, r2_ = s2 === 0 ? p.a : p.b, inn = pt(p, s2), c2 = c + p.kost;
      if (r2_ === rb) { const e = c2 + Math.hypot(K.nx[b] - inn[0], K.ny[b] - inn[1]); if (e < målKost) { målKost = e; mål = t; } continue; }
      for (const qi of K.rom[r2_].portaler) { if (qi === pi) continue; const q = P[qi]; if (!slipper(q.lås, hvem)) continue; const sq = side(q, r2_), ut = pt(q, sq), cq = c2 + Math.hypot(ut[0] - inn[0], ut[1] - inn[1]);
        if (cq < best[2 * qi + sq]) { best[2 * qi + sq] = cq; fra[2 * qi + sq] = t; H.push(2 * qi + sq, cq); } } }
    if (mål < 0) return null;
    const ut = [rb]; for (let t = mål; t >= 0; t = fra[t]) { const p = P[t >> 1]; ut.push((t & 1) === 0 ? p.a : p.b); }
    return [...new Set(ut.reverse())];
  }
  // punktene langs en sti, uten mellompunkter på rette strekninger (trappene og lagbyttene beholdes)
  function punkter(K, sti) {
    const ut = []; for (let i = 0; i < sti.length; i++) { const n = sti[i];
      if (i > 0 && i < sti.length - 1) { const a = sti[i - 1], b = sti[i + 1]; if (K.nlag[a] === K.nlag[n] && K.nlag[b] === K.nlag[n]) { const dx1 = K.nx[n] - K.nx[a], dy1 = K.ny[n] - K.ny[a], dx2 = K.nx[b] - K.nx[n], dy2 = K.ny[b] - K.ny[n]; if (Math.abs(dx1 * dy2 - dy1 * dx2) < 1e-6 && dx1 * dx2 + dy1 * dy2 > 0) continue; } }
      ut.push(punkt(K, n)); }
    return ut;
  }
  // Veien fra et punkt til et annet (eller til et mål med navn): { ok, punkter [{ x, y, e, hus }], lengde, rom, grunn }
  function finn(fra, til, o = {}) {
    const K = o.kart || api.nå; if (!K) return { ok: false, grunn: 'ingen kart', punkter: [] };
    if (typeof til === 'string') { const V = veikart(til, o); return V ? V.vei(fra) : { ok: false, grunn: 'ukjent mål', punkter: [] }; }
    const hvem = o.hvem || 'egne', a = node(K, fra), b = node(K, til);
    if (a < 0 || b < 0) return { ok: false, grunn: a < 0 ? 'ingen gulv der du står' : GRUNN.gulv, punkter: [] };
    const rv = romVei(K, a, b, hvem); if (!rv) return { ok: false, grunn: grunn(K, b, hvem, o.bruksplass), punkter: [] };
    const tillat = new Uint8Array(K.rom.length); for (const r of rv) tillat[r] = 1;
    const r = aStjerne(K, a, b, hvem, tillat) || aStjerne(K, a, b, hvem, null);
    if (!r) return { ok: false, grunn: grunn(K, b, hvem, o.bruksplass), punkter: [] };
    return { ok: true, punkter: punkter(K, r.sti), lengde: r2(r.lengde), rom: rv, utvidet: r.utvidet };
  }
  // grunnen til at node b ikke nås fra leirens midte
  function grunn(K, b, hvem, bruks) {
    const r = K.rom[K.komp[b]];
    if (!r.portaler.length && !r.ute) return GRUNN.dør;
    if (nåbar(K, 'alle')[r.id] && !nåbar(K, hvem)[r.id]) return GRUNN.låst;
    return bruks ? GRUNN.bruk : GRUNN.vei;
  }
  // Kan plassen nås fra leirens midte? plass = { x, y, e?, hus?, bruksplass? } -> { ok, grunn?, rom }
  function kanNå(plass, o = {}) {
    const K = o.kart || api.nå; if (!K) return { ok: false, grunn: 'ingen kart' };
    const p = Array.isArray(plass) ? { x: plass[0], y: plass[1], e: plass[2], hus: plass[3] } : plass, hvem = o.hvem || 'egne';
    const n0 = node(K, p, 0);
    if (n0 < 0) { const n1 = node(K, p, 1); if (n1 < 0) return { ok: false, grunn: p.bruksplass ? GRUNN.bruk : GRUNN.gulv };
      const L = K.lagene[K.nlag[n1]], k = tilRute(L, p.x, p.y); return { ok: false, grunn: p.bruksplass ? GRUNN.bruk : k >= 0 && !L.fri[k] && L.inne[k] ? GRUNN.sperret : GRUNN.gulv }; }
    const r = K.rom[K.komp[n0]]; if (nåbar(K, hvem)[r.id]) return { ok: true, rom: r.id };
    return { ok: false, grunn: grunn(K, n0, hvem, p.bruksplass), rom: r.id };
  }
  // Rommene i byggene som ikke nås (inne-rom: mer enn halvparten av rutene er gulv i et bygg): [{ rom, x, y, e, hus, ruter, grunn }]
  function romUtenVei(K0, o = {}) {
    const K = K0 || api.nå; if (!K) return []; const N = nåbar(K, o.hvem || 'egne'), ut = [];
    for (const r of K.rom) { if (r.ute || N[r.id]) continue; const L = K.lagene.find(q => q.id === r.lag); if (L.bakke && r.inne < r.n / 2) continue; if (r.n * L.s * L.s < (o.minAreal || 1)) continue;
      ut.push({ rom: r.id, x: r2(r.cx), y: r2(r.cy), e: r.e, hus: r.hus, ruter: r.n, areal: r2(r.n * L.s * L.s), grunn: grunn(K, r.første, o.hvem || 'egne', false) }); }
    return ut;
  }

  // ---------- veikart (flytfelt) ----------
  // Ett kart over hele leiren for et mål: avstanden fra hver rute og neste rute på veien. mål = navn ('lager', 'kjøkken', 'id:<bygg>' …),
  // et punkt { x, y, e?, hus? } eller en liste med punkter. Huskes til leiren endres (Vei.lag på nytt).
  function veikart(mål, o = {}) {
    const K = o.kart || api.nå; if (!K) return null; const hvem = o.hvem || 'egne', nøkkel = (typeof mål === 'string' ? mål : JSON.stringify(mål)) + '|' + hvem;
    if (K.kart.has(nøkkel)) { const V = K.kart.get(nøkkel); K.kart.delete(nøkkel); K.kart.set(nøkkel, V); return V; }
    const t0 = Date.now(), kilder = typeof mål === 'string' ? (K.mål.get(mål) || []).map(q => q.node) : (Array.isArray(mål) && typeof mål[0] !== 'number' ? mål : [mål]).map(p => node(K, p, 4));
    const dist = new Float32Array(K.N).fill(Infinity), neste = new Int32Array(K.N).fill(-1), H = new Haug();
    for (const n of kilder) if (n >= 0 && dist[n] > 0) { dist[n] = 0; H.push(n, 0); }
    while (H.n.length) { const n = H.pop(), dn = dist[n]; if (H.p0 !== undefined) { /* ubrukt */ }
      naboer(K, n, hvem, null, (q, kost) => { const v = dn + kost; if (v < dist[q] - 1e-6) { dist[q] = v; neste[q] = n; H.push(q, v); } }); }
    const V = {
      mål, hvem, ms: Date.now() - t0, kilder: kilder.filter(n => n >= 0).length,
      // avstanden (m) fra et punkt til målet, Infinity når det ikke nås
      avstand: p => { const n = node(K, p); return n < 0 ? Infinity : dist[n]; },
      // neste punkt på veien (midten av neste rute), null ved målet eller uten vei
      neste: p => { const n = node(K, p); return n < 0 || neste[n] < 0 ? null : punkt(K, neste[n]); },
      // node for node (for mange folk: hold noden, slå opp neste[n] – ingen søking)
      node: p => node(K, p), nesteNode: n => neste[n], avstandNode: n => dist[n], punkt: n => punkt(K, n),
      vei: (p, maks = 2000) => { const a = node(K, p); if (a < 0) return { ok: false, grunn: 'ingen gulv der du står', punkter: [] };
        if (!(dist[a] < Infinity)) return { ok: false, grunn: kilder.some(n => n >= 0) ? 'ingen vei dit' : 'målet finnes ikke', punkter: [] };
        const sti = [a]; for (let n = a, i = 0; neste[n] >= 0 && i < maks; i++) { n = neste[n]; sti.push(n); } return { ok: true, punkter: punkter(K, sti), lengde: r2(dist[a]) }; },
    };
    K.kart.set(nøkkel, V); while (K.kart.size > REGLER.maksKart) K.kart.delete(K.kart.keys().next().value);
    return V;
  }

  // ---------- når leiren endres ----------
  // En kort signatur av alt som endrer veien: veggene, dørene (og låsene), trappene, møblene, leirens bygg og gjerdet. Lik signatur = samme kart.
  function signatur(o = {}) {
    const deler = o.deler || (o.leir && BS ? BS.fraLeir(o.leir, Leir) : []), del = [];
    for (const d of deler) del.push(d.type + d.i + ',' + d.j + d.a + d.n + (d.ferdig === false ? '-' : ''));
    if (o.leir && Leir) for (const b of o.leir.bygg) if (Leir.BYGG[b.type] && !Leir.BYGG[b.type].del) del.push(b.type + Math.round(b.x * 10) + ',' + Math.round(b.y * 10) + ',' + Math.round((b.ret || 0) * 100) + (b.punkter ? b.punkter.map(p => p.map(Math.round).join(',')).join(';') + (b.lukket ? 'L' : '') : ''));
    for (const m of o.bygninger || []) if (m) del.push('h' + m.hus + ':' + (m.endringer || []).length + ':' + m.etasjer.map(e => e.vegger.map(w => w.tilstand[0]).join('') + e.åpninger.map(q => q.type[0] + q.tilstand[0] + (q.sperre ? 's' : '') + (q.lås || '')).join('') + e.møbler.length).join('|') + m.trapper.map(t => t.tilstand[0]).join(''));
    if (o.lås) del.push(JSON.stringify(o.lås));
    let h = 2166136261; const s = del.join('#'); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + ':' + del.length;
  }
  // Lager kartet på nytt bare når signaturen er endret (en vegg, dør, trapp … er endret); gir kartet
  function oppdater(o = {}) { const sg = signatur(o); if (api.nå && api.nå.signatur === sg && !o.tving) return api.nå; return lag({ ...o, signatur: sg }); }
  // Endrer en Bygning-endring veien? (Bygning.endre: vegg, åpning, trapp, dekke, etasje, møbel, søyle gjør det; tak gjør det ikke)
  const endrerVei = d => !!d && ['vegg', 'åpning', 'trapp', 'dekke', 'etasje', 'møbel', 'søyle', 'bjelke'].includes(d.del);
  // Lås en dør (en åpning i en Bygning-modell): lås 'egne' | 'ingen' | null. Kartet må lages på nytt (signaturen ser låsen).
  function lås(åpning, hvem) { if (åpning) åpning.lås = hvem === 'egne' || hvem === 'ingen' ? hvem : null; return åpning; }

  // ---------- for feilsøkingsvisningen og testene ----------
  function oversikt(K0) { const K = K0 || api.nå; if (!K) return null;
    return { lag: K.lagene.map(L => ({ id: L.id, e: L.e, s: L.s, W: L.W, H: L.H, fri: L.fri.reduce((a, v) => a + v, 0) })), noder: K.N, rom: K.rom.length, portaler: K.portaler.length, lenker: K.lenkeListe.length, mål: [...K.mål.keys()], ms: K.ms, start: K.start }; }

  const api = { REGLER, MÅL, GRUNN, lag, oppdater, signatur, endrerVei, lås, finn, kanNå, veikart, romUtenVei, node, punkt, bruksplass, oversikt, nå: null, _: { lagLag, nærFri, tilRute, nåbar, romVei, aStjerne, Haug } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Vei = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
