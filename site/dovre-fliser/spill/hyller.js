/* Riksbrudd – TINGENE PÅ HYLLENE (28. nov, ut9-mobler; brukeren: «et skikkelig lagringssystem med hyller som kan lagre for eksempel
 * peanøttsmør, alt slags mulig småting og hverdagslige ting» og «flere forskjellige hyller, flere forskjellige møbler»).
 * Regler uten DOM (Node: require('./hyller'); nettleser: globalThis.Hyller). Test: pipeline/fliser/test_hyller.js.
 *
 * Her står HVORDAN tingene ser ut på en hylle – ikke hvor de lagres (det er spill/tinglager.js). Samme regler brukes to steder:
 *  - leirens hyller og skap (spill/tinglager-visning.js, 3D): fyllingen og kategoriene kommer fra tinglageret (Hyller.innhold).
 *  - møblene i forlatte hus (spill/interior3d.js): fyllingen er fast per møbel via hash (Hyller.husFyll) – noen hyller er tomme
 *    (plyndret), andre halvfulle, og hva som står der følger rommet (Hyller.husKat: kjøkkenet har mat, badet hygiene …).
 *  varer(o) gir klosser [x0, x1, y0, y1, z0, z1, farge, rund] i møbelets akser (x langs hylla, y fra ryggen −d/2 til fronten +d/2,
 *  z fra gulvet). Like ting side om side er ÉN kloss (2–3 fjes), og hver hylle har et tak på antallet, så en hylle blir noen hundre
 *  trekanter, ikke tusenvis.
 * ALLE TALL ER CLAUDES FORSLAG.
 */
(function (rot) {
  'use strict';
  // Claudes forslag, alle sammen
  const REGLER = {
    // høyst så mange klosser per hyllenivå (og i alt per møbel)
    maksNivå: 10, maksIAlt: 46,
    // luft mellom tingene og fra kanten (m)
    luft: .012, kant: .03,
    // forlatte hus: andelen hyller som er tomme (plyndret), og fyllingen ellers (fra–til)
    tomHus: .22, tomButikk: .3, fyllHus: [.3, 1], fyllButikk: [.15, .85],
    // en hylle med ting på i leiren viser i det minste litt (selv om det bare er noen få liter)
    minstSynlig: .06,
    // andelen av den nederste hylla som alltid er i bruk når hylla ikke er tom
    minstNivå: .22,
  };
  // FORMENE: [bredde, høyde, dybde (andel av hylla), rund, fjes (hvor mange like ting side om side høyst)]
  const FORM = {
    eske: [.2, .2, .8, false, 2], glass: [.08, .12, .3, true, 1], boks: [.08, .11, .3, true, 1], flaske: [.075, .26, .3, true, 1],
    pose: [.16, .22, .6, false, 2], stabel: [.3, .14, .85, false, 1], verktøy: [.24, .06, .7, false, 1], perm: [.055, .3, .85, false, 4],
    kanne: [.2, .3, .7, false, 1], bok: [.035, .23, .7, false, 6], rull: [.11, .11, .4, true, 2], pakke: [.12, .18, .6, false, 3],
  };
  // KATEGORIENE (som i spill/ting.js): farger og former. Fargene er dempede pakkefarger (mørk realistisk stil).
  const KAT = {
    mat: { farger: [[.78, .22, .16], [.86, .66, .2], [.6, .38, .2], [.88, .84, .7], [.36, .5, .22]], former: ['glass', 'boks', 'eske', 'pose', 'pakke'] },
    drikke: { farger: [[.2, .42, .62], [.26, .52, .3], [.82, .82, .78], [.55, .3, .2]], former: ['flaske', 'flaske', 'kanne', 'pakke'] },
    hygiene: { farger: [[.92, .92, .9], [.6, .76, .86], [.86, .62, .7], [.5, .7, .6]], former: ['flaske', 'rull', 'eske', 'pakke'] },
    medisin: { farger: [[.94, .94, .92], [.8, .2, .18], [.9, .9, .82], [.4, .56, .7]], former: ['eske', 'pakke', 'glass'] },
    verktøy: { farger: [[.72, .16, .12], [.86, .68, .14], [.2, .2, .22], [.58, .6, .62]], former: ['verktøy', 'eske', 'kanne'] },
    elektro: { farger: [[.16, .16, .18], [.36, .38, .4], [.86, .7, .16], [.3, .4, .5]], former: ['eske', 'pakke', 'boks'] },
    klær: { farger: [[.36, .42, .54], [.56, .32, .3], [.42, .48, .36], [.62, .56, .46], [.3, .33, .38]], former: ['stabel'] },
    kjøkken: { farger: [[.92, .92, .9], [.66, .68, .7], [.7, .42, .3], [.4, .5, .58]], former: ['stabel', 'glass', 'eske'] },
    fritid: { farger: [[.5, .2, .2], [.2, .3, .5], [.3, .45, .3], [.7, .6, .3], [.45, .3, .45]], former: ['bok', 'bok', 'eske'] },
    kontor: { farger: [[.2, .3, .55], [.6, .6, .58], [.9, .9, .88], [.55, .2, .2]], former: ['perm', 'eske'] },
  };
  const KATER = Object.keys(KAT);
  // HYLLEFORMENE til leirens lagringstyper (spill/tinglager.js LAGRING): nivåene (z i meter) og hvor dype de er (m).
  // åpen = tingene synes (lukkede skap viser bare litt i en glipe: ingenting her). Målene er Claudes forslag.
  const OPPSETT = {
    hyllereol: { nivåer: [.12, .62, 1.12, 1.62], dybde: .55, hv: .42 },
    trehylle: { nivåer: [.08, .48, .88, 1.28, 1.68], dybde: .34, hv: .34 },
    stålreol: { nivåer: [.1, .52, .94, 1.36, 1.78], dybde: .52, hv: .36 },
    vitrine: { nivåer: [.9, 1.25, 1.6], dybde: .34, hv: .28 },
    kjøkkenhylle: { nivåer: [1.25, 1.5, 1.75], dybde: .18, hv: .2 },
    kjølereol: { nivåer: [.25, .62, .99, 1.36], dybde: .55, hv: .3 },
    smalhylle: { nivåer: [.08, .44, .8, 1.16, 1.52], dybde: .28, hv: .3 },
    hjørnehylle: { nivåer: [.75, 1.05, 1.35, 1.65], dybde: .3, hv: .24 },
    pallplass: { nivåer: [.14], dybde: 1.0, hv: 1.0, pall: true },
    pallreol: { nivåer: [.23, 1.31, 2.39], dybde: .9, hv: .8, pall: true },
    kjølerom: { nivåer: [.1, .6, 1.1, 1.6], dybde: .45, hv: .4 },
    verktøytavle: { nivåer: [.9], dybde: .45, hv: .3 },
  };

  // fast tall 0–1 av tre heltall
  function hash(a, b, c = 0) { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 2246822519)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
  const frøAv = f => Math.floor((f || 0) * 1e6) | 0;

  // Innholdet på en plass i leiren: stablene fra tinglageret (T.s med p = plassens id) -> { fyll 0–1, kat: [{ kat, andel }] } (største først).
  // TI = Ting.TING (vol og kat per ting). liter = plassens plass.
  function innhold(T, pid, liter, TI) {
    const sum = {}; let tot = 0;
    for (const q of (T && T.s) || []) { if (q.p !== pid) continue; const g = TI && TI[q.t]; if (!g) continue; const v = g.vol * q.n; sum[g.kat] = (sum[g.kat] || 0) + v; tot += v; }
    const kat = Object.entries(sum).filter(([, v]) => v > 0).map(([k, v]) => ({ kat: k, andel: v / tot })).sort((a, b) => b.andel - a.andel || (a.kat < b.kat ? -1 : 1));
    const fyll = tot > 0 ? Math.max(REGLER.minstSynlig, Math.min(1, liter > 0 && liter !== Infinity ? tot / liter : 1)) : 0;
    return { fyll, kat, liter: tot };
  }
  // trinn på fyllingen (så 3D-bildet bare lages på nytt når det synes): 0, 1 … 10
  const trinn = fyll => (fyll > 0 ? Math.max(1, Math.round(fyll * 10)) : 0);

  // Forlatte hus: hvor full hylla er (0 = tom), fast per møbel (f = møbelets tall 0–1). butikk = plyndret oftere.
  function husFyll(f, butikk) {
    const s = frøAv(f), tom = butikk ? REGLER.tomButikk : REGLER.tomHus, [a, b] = butikk ? REGLER.fyllButikk : REGLER.fyllHus;
    if (hash(s, 71) < tom) return 0; return a + (b - a) * hash(s, 72);
  }
  // hva som står på hylla i et hus, etter møbelet og rommet: [{ kat, andel }]
  const HUS = {
    kjøkken: [['mat', .55], ['kjøkken', .3], ['drikke', .15]], bad: [['hygiene', .7], ['medisin', .3]], vaskerom: [['hygiene', .6], ['klær', .4]],
    garasje: [['verktøy', .6], ['elektro', .25], ['drikke', .15]], bod: [['verktøy', .4], ['mat', .3], ['kjøkken', .3]], verksted: [['verktøy', .7], ['elektro', .3]],
    lager: [['mat', .4], ['verktøy', .3], ['elektro', .15], ['hygiene', .15]], lagerhall: [['mat', .5], ['drikke', .2], ['hygiene', .15], ['verktøy', .15]],
    butikk: [['mat', .6], ['drikke', .2], ['hygiene', .2]], kontor: [['kontor', .8], ['fritid', .2]], arkiv: [['kontor', 1]], stue: [['fritid', .7], ['kjøkken', .3]],
    soverom: [['klær', .7], ['fritid', .3]], gang: [['klær', .6], ['hygiene', .4]], vaktrom: [['medisin', .7], ['kontor', .3]], behandlingsrom: [['medisin', 1]],
    sykerom: [['medisin', .6], ['hygiene', .4]], pauserom: [['mat', .4], ['kjøkken', .4], ['drikke', .2]],
  };
  const MØBEL = { krydderhylle: [['mat', .8], ['kjøkken', .2]], vitrineskap: [['kjøkken', .7], ['fritid', .3]], drikkekjøler: [['drikke', 1]], kjøledisk: [['mat', .7], ['drikke', .3]],
    permreol: [['kontor', 1]], stålreol: null, gondol: null, speilskap: [['hygiene', .7], ['medisin', .3]], verktøyvegg: [['verktøy', 1]] };
  function husKat(type, rolle) { const L = MØBEL[type] || HUS[rolle] || [['mat', .35], ['kjøkken', .25], ['verktøy', .2], ['fritid', .2]]; return L.map(([kat, andel]) => ({ kat, andel })); }

  // Velger kategori nr. i etter andelene (fast rekkefølge: mest først, blandet med hash så hyllene ikke blir striper)
  function velgKat(kat, s, i) { if (!kat.length) return 'mat'; const r = hash(s, 300 + i); let a = 0; for (const q of kat) { a += q.andel; if (r <= a) return q.kat; } return kat[kat.length - 1].kat; }

  // KLOSSENE. o = { l (lengde langs hylla), d (hyllens dybde), nivåer: [z], hv (høyde over hvert nivå), fyll 0–1, kat: [{ kat, andel }],
  //   f (møbelets tall), y0 (bakkanten, standard −d/2), maks }. Gir [[x0, x1, y0, y1, z0, z1, farge, rund]].
  function varer(o) {
    const ut = [], fyll = Math.max(0, Math.min(1, o.fyll || 0)); if (!(fyll > 0) || !o.nivåer || !o.nivåer.length) return ut;
    const s = frøAv(o.f), l = o.l, d = o.d, y0 = o.y0 === undefined ? -d / 2 : o.y0, maks = Math.min(o.maks || REGLER.maksIAlt, REGLER.maksIAlt), kat = o.kat && o.kat.length ? o.kat : [{ kat: 'mat', andel: 1 }];
    let nr = 0;
    for (let n = 0; n < o.nivåer.length && ut.length < maks; n++) {
      const z = o.nivåer[n], hv = o.hv || .3;
      // fyllingen fordeles nedenfra: de nederste hyllene fylles først (som på et ekte lager), litt ujevnt
      // (den nederste hylla viser alltid litt når det står noe der – ellers forsvant noen få ting helt)
      const plassN = Math.max(n === 0 ? REGLER.minstNivå : 0, Math.min(1, fyll * o.nivåer.length - n + (hash(s, 40 + n) - .5) * .4));
      if (plassN <= .02) continue;
      const lengde = (l - 2 * REGLER.kant) * plassN; let x = -l / 2 + REGLER.kant + (hash(s, 50 + n) < .5 ? 0 : (l - 2 * REGLER.kant) * (1 - plassN));
      const slutt = x + lengde; let k = 0;
      while (x < slutt - .03 && k < REGLER.maksNivå && ut.length < maks) {
        const kt = velgKat(kat, s, nr), K = KAT[kt] || KAT.mat, form = K.former[Math.floor(hash(s, 500 + nr) * K.former.length)], F = FORM[form];
        const fjes = 1 + Math.floor(hash(s, 600 + nr) * F[4]), w = Math.min(slutt - x, F[0] * fjes + REGLER.luft * (fjes - 1));
        if (w < F[0] * .6) break;
        const hh = Math.min(hv, F[1] * (.8 + hash(s, 700 + nr) * .4)), dd = Math.min(d - .04, Math.max(.06, d * F[2])), farge = K.farger[Math.floor(hash(s, 800 + nr) * K.farger.length)];
        // runde ting (glass, flasker) står én og én; resten fra bakkanten
        const yy = F[3] ? y0 + .03 + Math.min(d - .06, F[0]) / 2 + hash(s, 900 + nr) * Math.max(0, d - .1 - F[0]) : y0 + .02 + (d - .04 - dd) * .9;
        if (F[3]) ut.push([x, x + F[0], yy - F[0] / 2, yy + F[0] / 2, z, z + hh, farge, true]);
        else ut.push([x, x + w, yy, yy + dd, z, z + hh, farge, false]);
        x += (F[3] ? F[0] : w) + REGLER.luft + (hash(s, 1000 + nr) < .15 ? .06 : 0); nr++; k++;
      }
    }
    return ut;
  }
  // Paller med varer (pallplass, pallreol): på hver pall lag på lag med kartonger (to side om side, litt ulik tone), høyden etter fyllingen.
  // o = { l, d, nivåer, hv, fyll, kat, f }. Gir klossene som over.
  function paller(o) {
    const ut = [], fyll = Math.max(0, Math.min(1, o.fyll || 0)); if (!(fyll > 0)) return ut; const s = frøAv(o.f), kat = o.kat && o.kat.length ? o.kat : [{ kat: 'mat', andel: 1 }];
    const n = Math.max(1, Math.floor(o.l / 1.15)), totalt = n * o.nivåer.length; let igjen = Math.max(1, Math.round(fyll * totalt)), nr = 0;
    for (let q = 0; q < o.nivåer.length && igjen > 0; q++) for (let p = 0; p < n && igjen > 0; p++, igjen--, nr++) {
      const x0 = -o.l / 2 + p * (o.l / n) + .08, x1 = x0 + o.l / n - .16, kt = velgKat(kat, s, nr), K = KAT[kt] || KAT.mat, c = K.farger[Math.floor(hash(s, 1200 + nr) * K.farger.length)];
      const h = o.hv * (.55 + hash(s, 1300 + nr) * .45), lag = Math.max(1, Math.round(h / .26)), lh = h / lag, xm = (x0 + x1) / 2;
      for (let k = 0; k < lag; k++) { const z = o.nivåer[q] + k * lh, t = (k + p) % 2 ? .88 : 1, c2 = c.map(v => v * t), c3 = c.map(v => v * t * .92);
        // annethvert lag er snudd: skjøten går på tvers
        if (k % 2) { ut.push([x0, x1, -o.d / 2 + .06, -.005, z, z + lh - .01, c2, false]); ut.push([x0, x1, .005, o.d / 2 - .06, z, z + lh - .01, c3, false]); }
        else { ut.push([x0, xm - .005, -o.d / 2 + .06, o.d / 2 - .06, z, z + lh - .01, c2, false]); ut.push([xm + .005, x1, -o.d / 2 + .06, o.d / 2 - .06, z, z + lh - .01, c3, false]); } }
    }
    return ut;
  }
  const api = { REGLER, FORM, KAT, KATER, OPPSETT, HUS, MØBEL, hash, innhold, trinn, husFyll, husKat, varer, paller, velgKat };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else rot.Hyller = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
