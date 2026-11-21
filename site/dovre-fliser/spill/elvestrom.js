'use strict';
// Strøm i brede elver (regler uten DOM, testes med node pipeline/fliser/test_elvestrom.js).
// Brede elver (Lågen, Glomma, Nidelva …) ligger som vannflate i kartets vannmaske. Bakken viser der bare vindbølger, som på en innsjø.
// Her lages et strømlag langs NVE-midtlinja (ElvBekkMidtlinje, og store bekker) der den går i vannet: hvilken vei elva renner,
// hvor fort, hvor bredt vannet er til hver side, og hvor det er stryk (skum). Visningen (spill/bekker-visning.js) lager nettet.
//
// Retning: NVE digitaliserer linjene MED strømmen (sjekket 21. nov på Dovre-fila: 1765 sidebekker ender i starten av en elv med
// høyere orden, 1 gjør det motsatte). Terrenget brukes som kontroll: stiger høyden klart langs linja, snus den.
// Høydeprofilen glattes og gjøres aldri stigende nedover (løpende minimum), så fallet aldri er negativt og ingenting renner oppover.
//
// Elvestrom.bånd(P, valg) -> [{ P: [[x, y, z]], dl, dr, fart, skum, tone, L }]  (én bit per sammenhengende strekning i vannet)
//   P: linja i NVE-rekkefølge [[x, y]] (lokale meter), valg: { vann(x, y), høyde(x, y), b (nominell bredde), orden, steg }
(function (rot) {
  // Alle tallene er Claudes forslag (21. nov), ikke målt eller fra brukeren.
  const REGLER = {
    // punkt langs linja (meter); mobil bruker STEG_MOBIL
    STEG: 4, STEG_MOBIL: 6,
    // høyeste avstand (m) vi leter etter land til hver side; nås den på begge sider, er det innsjø eller fjord
    MAKS_SIDE: 220,
    // bredere enn dette (m) eller INNSJØ_GANGER × elvas nominelle bredde regnes som innsjø: ingen strøm
    INNSJØ_M: 230, INNSJØ_GANGER: 9,
    // sjøen: midten under HAV_MOH moh. og bredere enn HAV_BREDDE m
    HAV_MOH: 1, HAV_BREDDE: 120,
    // strømmen tones inn/ut over så mange meter langs elva (mot innsjø, hav og der vannflaten slutter)
    TONE_M: 60,
    // glatting av høydeprofilen (± meter) og fallet målt over ± FALL_M meter
    GLATT_M: 50, FALL_M: 40,
    // terrenget må stige minst så mye (m) og så bratt langs linja før NVE-retningen snus
    SNU_M: 2.5, SNU_FALL: .002,
    // fart (m/s) = FART_0 + FART_K · √fall, mellom FART_MIN og FART_MAKS (Lågen ved 0,2 % ≈ 0,9 m/s, stryk ved 3 % ≈ 2,1 m/s)
    FART_0: .5, FART_K: 9, FART_MIN: .35, FART_MAKS: 4,
    // skum: rolig under STRYK_FRA fall, fullt skum (stryk/foss) ved STRYK_FRA + STRYK_SPENN
    STRYK_FRA: .006, STRYK_SPENN: .035,
    // bredden glattes over ± så mange punkt (median først, så snitt)
    BREDDE_GLATT: 4,
  };

  const lengder = P => { const L = [0]; for (let k = 1; k < P.length; k++) L.push(L[k - 1] + Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1])); return L; };

  // Skal linja snus? z: terrenget i hvert punkt (NVE-rekkefølge). Bare når terrenget stiger klart (minste kvadraters helning).
  function børSnu(L, z) {
    const n = z.length; if (n < 3) return false;
    let sl = 0, sz = 0, sll = 0, slz = 0;
    for (let k = 0; k < n; k++) { sl += L[k]; sz += z[k]; sll += L[k] * L[k]; slz += L[k] * z[k]; }
    const d = n * sll - sl * sl; if (d <= 0) return false;
    const a = (n * slz - sl * sz) / d, stig = a * (L[n - 1] - L[0]);
    return a > REGLER.SNU_FALL && stig > REGLER.SNU_M;
  }

  // Glattet høydeprofil som aldri stiger nedover (L i strømmens retning). Hopper over punkt uten høyde (NaN).
  function profil(L, z, glatt = REGLER.GLATT_M) {
    const n = z.length, g = new Float64Array(n); let a = 0, b = 0, s = 0, c = 0;
    for (let k = 0; k < n; k++) {
      while (b < n && L[b] <= L[k] + glatt) { if (Number.isFinite(z[b])) { s += z[b]; c++; } b++; }
      while (L[a] < L[k] - glatt) { if (Number.isFinite(z[a])) { s -= z[a]; c--; } a++; }
      g[k] = c ? s / c : NaN;
    }
    // hull fylles fra forrige punkt; så løpende minimum
    let siste = NaN; for (let k = 0; k < n; k++) { if (Number.isFinite(g[k])) siste = g[k]; else g[k] = siste; }
    let f = NaN; for (let k = n - 1; k >= 0; k--) { if (Number.isFinite(g[k])) { f = g[k]; break; } }
    for (let k = 0; k < n; k++) if (!Number.isFinite(g[k])) g[k] = f;
    for (let k = 1; k < n; k++) if (g[k] > g[k - 1]) g[k] = g[k - 1];
    return g;
  }
  // fall (≥ 0, m per m) i hvert punkt fra profilen
  function fall(L, zs, r = REGLER.FALL_M) {
    const n = zs.length, ut = new Float32Array(n); let a = 0, b = 0;
    for (let k = 0; k < n; k++) {
      while (a < k && L[a] < L[k] - r) a++;
      while (b < n - 1 && L[b + 1] <= L[k] + r) b++;
      const l = L[b] - L[a]; ut[k] = l > 1 ? Math.max(0, (zs[a] - zs[b]) / l) : 0;
    }
    return ut;
  }
  const fart = f => Math.max(REGLER.FART_MIN, Math.min(REGLER.FART_MAKS, REGLER.FART_0 + REGLER.FART_K * Math.sqrt(Math.max(0, f))));
  const skum = f => Math.max(0, Math.min(1, (f - REGLER.STRYK_FRA) / REGLER.STRYK_SPENN));

  // avstand (m) fra (x, y) i retning (nx, ny) til første punkt som ikke er vann; maks hvis vi ikke finner land
  function tilLand(vann, x, y, nx, ny, maks = REGLER.MAKS_SIDE, steg = 1.5) {
    for (let d = steg; d <= maks; d += d < 30 ? steg : steg * 3) if (!vann(x + nx * d, y + ny * d)) return d;
    return maks;
  }
  function glattBredde(v, r = REGLER.BREDDE_GLATT) {
    const n = v.length, m = new Float32Array(n), ut = new Float32Array(n);
    for (let k = 0; k < n; k++) { const w = []; for (let q = Math.max(0, k - r); q <= Math.min(n - 1, k + r); q++) w.push(v[q]); w.sort((a, b) => a - b); m[k] = w[w.length >> 1]; }
    for (let k = 0; k < n; k++) { let s = 0, c = 0; for (let q = Math.max(0, k - r); q <= Math.min(n - 1, k + r); q++) { s += m[q]; c++; } ut[k] = s / c; }
    return ut;
  }
  // punkt minst hvert «steg» m langs linja
  function punkter(P, steg) {
    const ut = [P[0].slice(0, 2)];
    for (let k = 1; k < P.length; k++) { const [ax, ay] = P[k - 1], [bx, by] = P[k], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / steg));
      for (let s = 1; s <= n; s++) ut.push([ax + (bx - ax) * s / n, ay + (by - ay) * s / n]); }
    return ut;
  }

  // Hele regelen for én linje. Gir bitene der det skal være strøm (tone > 0), i strømmens retning.
  function bånd(P0, valg) {
    const { vann, høyde } = valg, b = valg.b || 10, steg = valg.steg || REGLER.STEG;
    if (!P0 || P0.length < 2) return [];
    let P = punkter(P0, steg); if (P.length < 3) return [];
    let L = lengder(P), z = P.map(([x, y]) => høyde(x, y));
    const snudd = børSnu(L, z);
    if (snudd) { P = P.reverse(); z = z.reverse(); L = lengder(P); }
    const zs = profil(L, z), f = fall(L, zs), n = P.length;
    // bredde til hver side (venstre = normalens retning), innsjø og hav
    const dl = new Float32Array(n), dr = new Float32Array(n), iv = new Uint8Array(n);
    for (let k = 0; k < n; k++) {
      const [x, y] = P[k], q = P[Math.min(n - 1, k + 1)], o = P[Math.max(0, k - 1)], dx = q[0] - o[0], dy = q[1] - o[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
      iv[k] = vann(x, y) ? 1 : 0; if (!iv[k]) continue;
      dl[k] = tilLand(vann, x, y, nx, ny); dr[k] = tilLand(vann, x, y, -nx, -ny);
    }
    const DL = glattBredde(dl), DR = glattBredde(dr), rå = new Uint8Array(n);
    for (let k = 0; k < n; k++) {
      if (!iv[k]) continue;
      const B = dl[k] + dr[k], innsjø = (dl[k] >= REGLER.MAKS_SIDE && dr[k] >= REGLER.MAKS_SIDE) || B > Math.max(REGLER.INNSJØ_M, REGLER.INNSJØ_GANGER * b);
      const hav = zs[k] < REGLER.HAV_MOH && B > REGLER.HAV_BREDDE;
      rå[k] = innsjø || hav ? 0 : 1;
    }
    // tone: avstanden langs elva til nærmeste punkt uten strøm, delt på TONE_M (linjas ender tones ikke: der fortsetter elva i neste linje)
    const tone = new Float32Array(n); let sist = -Infinity;
    for (let k = 0; k < n; k++) { if (!rå[k]) sist = L[k]; tone[k] = rå[k] ? Math.min(1, (L[k] - sist) / REGLER.TONE_M) : 0; }
    sist = Infinity; for (let k = n - 1; k >= 0; k--) { if (!rå[k]) sist = L[k]; if (rå[k]) tone[k] = Math.min(tone[k], (sist - L[k]) / REGLER.TONE_M); }
    // bitene: sammenhengende punkt i vannet med tone > 0 (ett nullpunkt med i hver ende, så tonen går helt ut)
    const ut = []; let bit = null;
    const lukk = () => { if (bit && bit.P.length > 2) ut.push(bit); bit = null; };
    for (let k = 0; k < n; k++) {
      const med = iv[k] && (tone[k] > 0 || (k + 1 < n && tone[k + 1] > 0) || (k > 0 && tone[k - 1] > 0));
      if (!med) { lukk(); continue; }
      if (!bit) bit = { P: [], dl: [], dr: [], fart: [], skum: [], tone: [], L: [], fall: [], snudd, b };
      bit.P.push([P[k][0], P[k][1], zs[k]]); bit.dl.push(Math.max(b * .25, DL[k] || dl[k])); bit.dr.push(Math.max(b * .25, DR[k] || dr[k]));
      bit.fart.push(fart(f[k])); bit.skum.push(skum(f[k])); bit.tone.push(tone[k]); bit.L.push(L[k]); bit.fall.push(f[k]);
    }
    lukk();
    return ut;
  }

  // Setter linjebitene sammen til lengre elver (NVE deler elva i mange biter; enden av én er starten på neste).
  // linjer: [{ P, b, orden }] i NVE-rekkefølge -> [{ P, b, orden, n }] (n = antall biter). Retningen beholdes.
  function kjede(linjer) {
    const nøkkel = p => Math.round(p[0]) + ',' + Math.round(p[1]), start = new Map(), slutt = new Set(), brukt = new Uint8Array(linjer.length), ut = [];
    linjer.forEach((l, i) => { const k = nøkkel(l.P[0]); if (!start.has(k)) start.set(k, []); start.get(k).push(i); slutt.add(nøkkel(l.P[l.P.length - 1])); });
    const følg = i0 => {
      let i = i0; const P = [], d = { b: 0, orden: 0, n: 0 };
      while (i >= 0 && !brukt[i]) {
        brukt[i] = 1; const l = linjer[i]; for (let k = P.length ? 1 : 0; k < l.P.length; k++) P.push(l.P[k]);
        d.b = Math.max(d.b, l.b || 0); d.orden = Math.max(d.orden, l.orden || 0); d.n++;
        const neste = (start.get(nøkkel(l.P[l.P.length - 1])) || []).filter(j => !brukt[j]); i = neste.length ? neste[0] : -1;
      }
      ut.push({ P, b: d.b, orden: d.orden, n: d.n });
    };
    // først fra bitene som ingen annen bit renner inn i, så resten (ringer, avkuttede biter)
    linjer.forEach((l, i) => { if (!brukt[i] && !slutt.has(nøkkel(l.P[0]))) følg(i); });
    linjer.forEach((l, i) => { if (!brukt[i]) følg(i); });
    return ut;
  }

  const Elvestrom = { REGLER, kjede, bånd, børSnu, profil, fall, fart, skum, tilLand, glattBredde, punkter, lengder };
  if (typeof module !== 'undefined' && module.exports) module.exports = Elvestrom; else rot.Elvestrom = Elvestrom;
})(typeof window !== 'undefined' ? window : globalThis);
