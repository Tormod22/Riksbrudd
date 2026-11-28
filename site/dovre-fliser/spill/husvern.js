/* HUSVERN – kamp med vegger (fase B6 i docs/plan-selskap-okonomi.md, kapittel 5.7; 28. nov, ut5-kampvegger).
 * Regler uten DOM (Node: require('./husvern'); nettleser: window.HusVern). Visningen: spill/husvern-visning.js.
 * Byggemodellen er spill/bygning.js (vegger med stoff, åpninger, etasjer). Koordinatene her er husets egne (modellens P, vegger a/b).
 *  - vern(m, n, mål, skytter): veggene MELLOM et lag inne i huset (mål) og skytteren – tre stopper lite, mur og betong mye.
 *    Gir { faktor (ganges på treffene), andel (det veggene tar), vegger [{ id, stoff, stopp, åpning }] }.
 *  - vernSnitt(m, n, punkter, skytter): snittet over flere punkter i huset (mennene står spredt), så ett vindu ikke avgjør alt.
 *  - slit(...): vedvarende ild mot en trevegg skader den sakte (hel -> skadet -> ødelagt); vinduer i skuddlinja knuses.
 *  - smell(m, n, x, y, slag): en granat river en lett vegg / skader en bærende; sprengstoff lager hull i en bærende (river den når
 *    hullene er store nok). Gir endringer til Bygning.endre (de føres i endringsloggen i husendring).
 *  - inngang(m): hvor fienden kan gå inn (dører, porter, hull, knuste vinduer, revne vegger) og inntaksforsinkelsen etter barrikadene.
 *  - etasjeHøyde / sikt: et lag i 2. etasje eller høyere ser lenger (høyden teller som i terrenget).
 * Alle tallene her er Claudes forslag (REGLER).
 */
(function (rot) {
  'use strict';
  const REGLER = {
    // hvor stor del av treffene én vegg tar, etter stoffet (0–1)
    stopp: { tre: .35, mur: .65, betong: .75, blikk: .15, stål: .5, glass: .05, annet: .3 },
    // åpningene: et hel vindu tar nesten ingenting, ei dør litt; planker legger til, tettet mer; knust/hull = ingenting
    åpning: { vindu: .05, takvindu: .05, dør: .2, port: .25, hull: 0, planker: .3, tettet: .5 },
    // en skadet vegg tar halvparten av det den tok hel
    skadet: .5,
    // aldri mer vern enn dette (skudd går gjennom glipper, inn vinduer …)
    maks: .85,
    // i kjelleren (under bakken) tar veggene og jorda nesten alt
    kjeller: .9,
    // vedvarende ild mot tre: slitasje per levende skytter per kamprunde (5 spillminutter); skadet ved 1, ødelagt ved 2
    slit: { perMann: .012, stoff: ['tre', 'blikk'], vindu: .25, maksAvstand: 700 },
    // granat og sprengstoff mot en vegg innen så mange meter fra smellet
    smell: { granat: { radius: 3.5, hull: .9 }, sprengstoff: { radius: 6, hull: 1.6, hullH: 1.8, rivAndel: .45 } },
    // inntak: fienden innen så mange meter fra huset stormer det; forsinkelsen i spillminutter
    inntak: { nær: 60, åpen: 1, svak: 3, sperret: 6, perSperret: 1, maks: 30, inne: 1.2 },
    // sikt fra etasjene: per etasje over 1.: ×1,2 siktvidde (høyst ×1,8); øynene står 1,6 m over gulvet
    sikt: { perEtasje: .2, maks: 1.8, øyne: 1.6 },
  };
  const står = d => !!d && d.tilstand !== 'revet' && d.tilstand !== 'ødelagt' && d.tilstand !== 'rast';
  const finnEt = (m, n) => (m && m.etasjer ? m.etasjer.find(e => e.n === n) || null : null);
  const veggL = w => Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]);
  const r2 = v => Math.round(v * 100) / 100;
  function inni(P, x, y) { let inn = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) inn = !inn; return inn; }
  // etasjen laget står i: den valgte hvis den finnes og ikke er revet, ellers 1. etasje (eller første som står)
  function etasje(m, n) { const e = finnEt(m, n); if (e && e.tilstand !== 'revet' && !e.stengt) return e; return finnEt(m, 1) || (m && m.etasjer ? m.etasjer.find(q => q.tilstand !== 'revet') : null) || null; }

  // ---------- skuddlinja gjennom veggene ----------
  // Linja fra A til B krysser veggen w? Gir { u (andel av linja fra A), s (meter langs veggen fra a) } eller null.
  function kryss(A, B, w) {
    const dx = B[0] - A[0], dy = B[1] - A[1], ex = w.b[0] - w.a[0], ey = w.b[1] - w.a[1], den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-9) return null;
    const fx = w.a[0] - A[0], fy = w.a[1] - A[1], u = (fx * ey - fy * ex) / den, v = (fx * dy - fy * dx) / den;
    if (u <= 1e-4 || u >= 1 || v < 0 || v > 1) return null;
    return { u, s: v * Math.hypot(ex, ey) };
  }
  // hvor mye én åpning tar (planker/tetting legges oppå)
  function åpningStopp(o) {
    if (o.tilstand === 'ødelagt' || o.type === 'hull') return o.sperre ? sperreStopp(0, o.sperre) : 0;
    return sperreStopp(REGLER.åpning[o.type] === undefined ? .2 : REGLER.åpning[o.type], o.sperre);
  }
  function sperreStopp(s, sperre) { const p = sperre === 'planker' ? REGLER.åpning.planker : sperre ? REGLER.åpning.tettet : 0; return 1 - (1 - s) * (1 - p); }
  function veggStopp(w) {
    const s = REGLER.stopp[w.stoff] === undefined ? REGLER.stopp.annet : REGLER.stopp[w.stoff];
    return w.tilstand === 'skadet' ? s * REGLER.skadet : s;
  }
  // Det skuddet fra skytteren (S) mot målet (T) går gjennom i etasjen e: [{ id, stoff, stopp, åpning?, u, s, ytter }] sortert fra skytteren
  function gjennom(e, T, S) {
    const ut = [];
    for (const w of e.vegger) {
      if (!står(w)) continue; const k = kryss(T, S, w); if (!k) continue;
      const o = e.åpninger.find(q => q.vegg === w.id && q.tilstand !== 'revet' && Math.abs(q.t - k.s) <= q.b / 2);
      ut.push({ id: w.id, stoff: w.stoff, stopp: o ? åpningStopp(o) : veggStopp(w), åpning: o ? o.id : undefined, u: k.u, s: k.s, ytter: w.type === 'ytter' || w.type === 'gavl', bærende: !!w.bærende });
    }
    return ut.sort((a, b) => b.u - a.u);
  }
  // Vernet for et mål i punktet T (husets koordinater) i etasje n mot en skytter i S.
  function vern(m, n, T, S) {
    const e = etasje(m, n); if (!e) return { faktor: 1, andel: 0, vegger: [] };
    if (e.kjeller) return { faktor: r2(1 - REGLER.kjeller), andel: REGLER.kjeller, vegger: [], kjeller: true };
    const v = gjennom(e, T, S); let igjen = 1; for (const q of v) igjen *= 1 - q.stopp;
    const andel = Math.min(REGLER.maks, 1 - igjen);
    return { faktor: 1 - andel, andel, vegger: v };
  }
  // Mennene står spredt: snittet over punktene (husets koordinater)
  function vernSnitt(m, n, punkter, S) {
    if (!punkter.length) return { faktor: 1, andel: 0, vegger: [] };
    let f = 0, beste = null; for (const T of punkter) { const v = vern(m, n, T, S); f += v.faktor; if (!beste || v.vegger.length > beste.vegger.length) beste = v; }
    const faktor = f / punkter.length; return { faktor, andel: 1 - faktor, vegger: beste.vegger, kjeller: beste.kjeller };
  }
  // Punkter inne i huset rundt (x, y): midten og fire punkter mot rommene rundt (alle innenfor omrisset)
  function punkterRundt(m, x, y, r) {
    const P = m.P, ut = []; r = r || 2.5;
    for (const [dx, dy] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]]) { const q = [x + dx, y + dy]; if (inni(P, q[0], q[1])) ut.push(q); }
    if (!ut.length) { let cx = 0, cy = 0; for (const p of P) { cx += p[0]; cy += p[1]; } ut.push([cx / P.length, cy / P.length]); }
    return ut;
  }

  // ---------- skudd sliter på treveggene ----------
  // Én kamprunde: skytterne (n levende) skyter fra S mot T. slitasje = Map nøkkel -> verdi (husker mellom rundene).
  // Gir endringene som skal føres i loggen: vinduer i linja knuses, ytterste trevegg skades (hel -> skadet ved 1, -> ødelagt ved 2).
  function slit(m, n, T, S, menn, slitasje, nøkkel) {
    const e = etasje(m, n); if (!e || e.kjeller) return []; const ut = [], R = REGLER.slit;
    const v = gjennom(e, T, S); if (!v.length) return ut; const første = v[0];
    const k = (nøkkel || '') + ':' + e.n + ':' + første.id + (første.åpning !== undefined ? ':o' + første.åpning : '');
    const før = slitasje.get(k) || 0, nå = før + menn * R.perMann; slitasje.set(k, nå);
    if (første.åpning !== undefined) {
      const o = e.åpninger[første.åpning];
      if (o && o.type === 'vindu' && o.tilstand === 'hel' && !o.sperre && nå >= R.vindu) ut.push({ e: e.n, del: 'åpning', id: o.id, gjør: 'riv', skudd: true });
      return ut;
    }
    const w = e.vegger[første.id]; if (!w || R.stoff.indexOf(w.stoff) < 0) return ut;
    if ((w.tilstand === 'hel' && nå >= 1) || (w.tilstand === 'skadet' && nå >= 2)) ut.push({ e: e.n, del: 'vegg', id: w.id, gjør: 'skad', skudd: true });
    return ut;
  }

  // ---------- granat og sprengstoff ----------
  // Avstand fra punktet til veggen og hvor på veggen (s, meter fra a)
  function nærVegg(w, x, y) {
    const L = veggL(w) || 1, ux = (w.b[0] - w.a[0]) / L, uy = (w.b[1] - w.a[1]) / L, t = Math.max(0, Math.min(L, (x - w.a[0]) * ux + (y - w.a[1]) * uy));
    return { d: Math.hypot(w.a[0] + ux * t - x, w.a[1] + uy * t - y), s: t, L };
  }
  // slag: 'granat' | 'sprengstoff'. Gir { endringer: [...], tekst } – den nærmeste veggen innen radiusen rammes.
  // Granat: river en lett vegg (ikke bærende, tre), slår hull i en bærende trevegg og skader mur/betong.
  // Sprengstoff: river en lett vegg, slår et stort hull i en bærende; har den alt hull for mer enn rivAndel av lengden, rives den (ras).
  function smell(m, n, x, y, slag) {
    const e = etasje(m, n), G = REGLER.smell[slag] || REGLER.smell.granat; if (!e || e.kjeller) return { endringer: [], tekst: '' };
    let best = null; for (const w of e.vegger) { if (!står(w)) continue; const q = nærVegg(w, x, y); if (q.d <= G.radius && (!best || q.d < best.q.d)) best = { w, q }; }
    if (!best) return { endringer: [], tekst: '' };
    const { w, q } = best, lett = !w.bærende, tre = w.stoff === 'tre' || w.stoff === 'blikk', ut = [];
    const hull = () => { const o = e.åpninger.find(a => a.vegg === w.id && a.tilstand !== 'revet' && Math.abs(a.t - q.s) <= a.b / 2 + .3);
      const nytt = t => ({ e: e.n, del: 'åpning', gjør: 'ny', vegg: w.id, type: 'hull', t: r2(t), b: G.hull, h: G.hullH || 1.2, ned: slag === 'sprengstoff' ? 0 : .3, smell: slag });
      if (!o) { ut.push(nytt(q.s)); return; }
      if (o.sperre) { ut.push({ e: e.n, del: 'åpning', id: o.id, gjør: 'åpne', smell: slag }); return; }
      if (o.tilstand === 'hel') { ut.push({ e: e.n, del: 'åpning', id: o.id, gjør: 'riv', smell: slag }); return; }
      // alt knust der: et nytt hull inntil (den siden det er plass)
      for (const t of [o.t + o.b / 2 + G.hull / 2 + .05, o.t - o.b / 2 - G.hull / 2 - .05]) if (t - G.hull / 2 >= .3 && t + G.hull / 2 <= q.L - .3 && !e.åpninger.some(a => a.vegg === w.id && a.tilstand !== 'revet' && Math.abs(a.t - t) < (a.b + G.hull) / 2)) { ut.push(nytt(t)); return; } };
    let tekst;
    if (slag === 'sprengstoff') {
      // det som alt er knust eller hull i veggen (meter)
      const hullM = e.åpninger.filter(a => a.vegg === w.id && a.tilstand === 'ødelagt').reduce((s, a) => s + a.b, 0);
      if (lett || hullM + G.hull >= q.L * G.rivAndel) { ut.push({ e: e.n, del: 'vegg', id: w.id, gjør: 'riv', smell: slag }); tekst = lett ? 'veggen er revet' : 'den bærende veggen er sprengt bort'; }
      else { hull(); tekst = 'hull i den bærende veggen'; }
    } else if (lett && tre) { ut.push({ e: e.n, del: 'vegg', id: w.id, gjør: 'riv', smell: slag }); tekst = 'den lette veggen er revet'; }
    else if (tre) { hull(); tekst = 'hull i veggen'; }
    else { if (w.tilstand === 'hel') ut.push({ e: e.n, del: 'vegg', id: w.id, gjør: 'skad', smell: slag }); tekst = w.tilstand === 'hel' ? 'veggen er skadet' : 'veggen tålte det'; }
    return { endringer: ut, tekst, vegg: w.id, stoff: w.stoff, bærende: !!w.bærende };
  }

  // ---------- inngangen ----------
  // Ytterdører, porter, vinduer, hull og revne yttervegger i 1. etasje. Gir { innganger [{ id, type, x, y, åpen, svak, sperre }],
  // åpne, svake, sperret, forsinkelse (spillminutter) }. Har huset en åpen vei inn, går fienden inn der (kort forsinkelse); er alt
  // barrikadert, må de bryte seg gjennom – jo flere som er sperret, jo lenger tar det.
  function inngang(m) {
    const e = etasje(m, 1), R = REGLER.inntak, ut = [];
    if (e) for (const w of e.vegger) {
      if (w.type !== 'ytter' && w.type !== 'gavl') continue; const L = veggL(w) || 1, ux = (w.b[0] - w.a[0]) / L, uy = (w.b[1] - w.a[1]) / L;
      if (!står(w)) { ut.push({ vegg: w.id, type: 'vegg', x: w.a[0] + ux * L / 2, y: w.a[1] + uy * L / 2, åpen: true }); continue; }
      for (const o of e.åpninger) {
        if (o.vegg !== w.id || o.tilstand === 'revet') continue;
        const knust = o.tilstand === 'ødelagt' || o.type === 'hull', dør = o.type === 'dør' || o.type === 'port';
        ut.push({ id: o.id, vegg: w.id, type: o.type, x: w.a[0] + ux * o.t, y: w.a[1] + uy * o.t, sperre: o.sperre || null, åpen: !o.sperre && (knust || dør), svak: !o.sperre && !knust && !dør });
      }
    }
    const åpne = ut.filter(q => q.åpen).length, svake = ut.filter(q => q.svak).length, sperret = ut.filter(q => q.sperre).length;
    const forsinkelse = åpne ? R.åpen : svake ? R.svak : ut.length ? Math.min(R.maks, R.sperret + R.perSperret * sperret) : R.åpen;
    return { innganger: ut, åpne, svake, sperret, forsinkelse };
  }
  // Inngangen nærmest angriperen (husets koordinater): helst en åpen, ellers en svak, ellers en sperret
  function veiInn(m, x, y) {
    const I = inngang(m), d = q => Math.hypot(q.x - x, q.y - y), velg = l => l.sort((a, b) => d(a) - d(b))[0] || null;
    return velg(I.innganger.filter(q => q.åpen)) || velg(I.innganger.filter(q => q.svak)) || velg(I.innganger.slice());
  }
  const VEINAVN = { dør: 'døra', port: 'porten', vindu: 'et vindu', hull: 'et hull i veggen', vegg: 'den revne veggen' };

  // ---------- sikt og høyde fra etasjene ----------
  // Meter over 1. etasjes gulv laget har øynene sine (kjeller: ingen)
  function etasjeHøyde(m, n) { const e = etasje(m, n); if (!e || e.kjeller || e.n <= 1) return 0; return r2(e.z || 0); }
  // Faktor på siktvidden: 2. etasje ×1,2, 3. ×1,4 … høyst ×1,8 (kjeller: ser nesten ingenting ut)
  function sikt(m, n) { const e = etasje(m, n); if (!e) return 1; if (e.kjeller) return .25; if (e.n <= 1) return 1; return Math.min(REGLER.sikt.maks, 1 + REGLER.sikt.perEtasje * (e.n - 1)); }
  // Etasjene et lag kan stå i (ikke stengte eller revne): [{ n, navn }]
  const etasjer = m => (m && m.etasjer ? m.etasjer.filter(e => e.tilstand !== 'revet' && !e.stengt).map(e => ({ n: e.n, navn: e.navn })) : []);
  const prosent = v => Math.round(v * 100) + ' %';
  const vernTekst = v => (v.kjeller ? `i kjelleren: veggene og jorda tar ${prosent(v.andel)}` : `i huset: veggene tar ${prosent(v.andel)}`);

  const api = { REGLER, står, inni, etasje, kryss, gjennom, åpningStopp, veggStopp, vern, vernSnitt, punkterRundt, slit, nærVegg, smell, inngang, veiInn, VEINAVN,
    etasjeHøyde, sikt, etasjer, vernTekst, prosent };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else rot.HusVern = api;
})(typeof window !== 'undefined' ? window : globalThis);
