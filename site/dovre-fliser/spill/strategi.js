/* Riksbrudd – STRATEGIEN: regler uten DOM (Node: require('./strategi'); nettleser: globalThis.Strategi).
 * (17. nov, brukeren: «vi må få frem strategielementet mye bedre».) Spillet hadde alt som trengs – tettsteder som tas med lag,
 * to motstandere som brer seg, olje og forsterkninger fra det du holder – men ingenting viste krigen som helhet eller sa hva du skulle
 * oppnå. Her er reglene for det: OMRÅDET krigen står om (tettstedene innen 45 km fra leiren, og alltid minst de åtte nærmeste), STILLINGEN (hvor stor del av folket hver
 * side holder), SEIER (60 % av folket i området), FRONTENE (der to siders tettsteder ligger inntil hverandre), forslag til NESTE TREKK
 * og TRUSLENE mot det du holder. Alle tallene er Claudes forslag.
 */
(function (rot) {
  'use strict';
  const REGLER = {
    radius: 45000,      // meter fra leiren: tettstedene innenfor er området krigen står om
    minst: 8,           // … men alltid minst så mange tettsteder (de nærmeste), så området ikke blir tomt i fjellet
    maksRadius: 150000, // og aldri lenger unna enn dette
    minSeier: 3,        // færre tettsteder enn dette i området: ingen seier (det er ingenting å kjempe om)
    seier: .6,          // andel av folket i området som gir seier
    fare: .45,          // en motstander over dette varsles
    front: 20000,       // to tettsteder med ulik eier nærmere enn dette har en front mellom seg
    trussel: 6000,      // fiendtlig lag nærmere et eget tettsted enn dette er en trussel
    marsj: 30000,       // lengste marsj i én ordre (som MARSJ_MAKS i kartet)
    // (19. nov, kritikken: «Kystalliansen har overtaket – 69 %» kom kl. 14 dag 1) ingen vinner før det har gått så mange spillminutter
    // (3 døgn – motstanderne samler seg de første 2,5, se Fraksjoner.REGLER.regionFred). Claudes forslag.
    tidligst: 3 * 1440,
  };
  // inntaket etter størrelsen (spill/garnison.js): mann som trengs for full fart og minst
  const GN = typeof module !== 'undefined' && module.exports ? require('./garnison') : null, G = () => GN || rot.Garnison;
  const mannFor = folk => (G() && G().mannFor ? G().mannFor(folk) : 0), minstFor = folk => (G() && G().minstFor ? G().minstFor(folk) : 0);
  // friske mann i et lag (sårede teller ½); egne-lista kan ha lag: { menn } eller mann: tall
  const mennI = q => (q && q.lag && Array.isArray(q.lag.menn) ? q.lag.menn.reduce((v, m) => v + (m.hp >= 1 ? 1 : m.hp > 0 ? .5 : 0), 0) : q && Number.isFinite(q.mann) ? q.mann : 12);
  const avst = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  // Området: tettstedene [{ id, navn, x, y, folk }] innen radius fra leiren – og er det færre enn R.minst, de nærmeste opp til
  // R.minst (høyst R.maksRadius unna). Størst først. Lista får .radius = hvor langt ut området rekker.
  function område(leir, byer, R = REGLER) {
    const alle = (byer || []).map(b => ({ b, d: avst(b, leir) })).filter(q => q.d <= R.maksRadius).sort((a, c) => a.d - c.d);
    let n = alle.filter(q => q.d <= R.radius).length; if (n < R.minst) n = Math.min(R.minst, alle.length);
    const med = alle.slice(0, n), ut = med.map(q => q.b).sort((a, c) => c.folk - a.folk);
    ut.radius = Math.max(R.radius, med.length ? med[med.length - 1].d * 1.08 : 0); return ut;
  }
  // Stillingen: eierAv(id) gir siden som holder tettstedet (eller null). Gir { folk, byer, sider: { side: { byer, folk, andel } }, nøytral }.
  function stilling(byer, eierAv, sider = ['blå', 'rød', 'grønn']) {
    const ut = { folk: 0, byer: byer.length, sider: {}, nøytral: { byer: 0, folk: 0, andel: 0 } }; for (const s of sider) ut.sider[s] = { byer: 0, folk: 0, andel: 0 };
    for (const b of byer) { ut.folk += b.folk; const e = eierAv(b.id), m = e && ut.sider[e] ? ut.sider[e] : ut.nøytral; m.byer++; m.folk += b.folk; }
    for (const m of [...Object.values(ut.sider), ut.nøytral]) m.andel = ut.folk ? m.folk / ut.folk : 0;
    return ut;
  }
  // Utfallet: { vinner, side } når en side holder nok, ellers null. leder: siden med størst andel.
  // tid (spillminutter, valgfri): før R.tidligst er det ingen vinner (fra: når en vinner tidligst kan kåres)
  function utfall(st, R = REGLER, tid) {
    let leder = null; for (const [s, m] of Object.entries(st.sider)) if (!leder || m.andel > st.sider[leder].andel) leder = s;
    const forTidlig = Number.isFinite(tid) && tid < (R.tidligst || 0);
    const vinner = leder && !forTidlig && st.byer >= R.minSeier && st.sider[leder].andel >= R.seier ? leder : null;
    return { vinner, leder, forTidlig, fra: R.tidligst || 0, fare: Object.entries(st.sider).filter(([s, m]) => s !== 'blå' && st.byer >= R.minSeier && m.andel >= R.fare && m.andel < R.seier).map(([s]) => s) };
  }
  // Hvor langt et tettsted «rår»: brukes til å farge kartet rundt det.
  const rekkevidde = folk => Math.min(9000, 1800 + 45 * Math.sqrt(Math.max(0, folk)));
  // Frontene: for hvert tettsted med eier, det nærmeste tettstedet med en annen eier innen REGLER.front. Hvert par én gang.
  function fronter(byer, eierAv, R = REGLER) {
    const ut = [], sett = new Set(), med = byer.map(b => ({ b, e: eierAv(b.id) })).filter(q => q.e);
    for (const a of med) { let best = null, bd = R.front; for (const c of med) if (c.e !== a.e) { const d = avst(a.b, c.b); if (d < bd) { bd = d; best = c; } }
      if (!best) continue; const k = a.b.id < best.b.id ? a.b.id + '|' + best.b.id : best.b.id + '|' + a.b.id; if (sett.has(k)) continue; sett.add(k);
      ut.push({ a: a.b, b: best.b, sider: [a.e, best.e], km: bd / 1000, egen: a.e === 'blå' || best.e === 'blå' }); }
    return ut.sort((x, y) => x.km - y.km);
  }
  // Neste trekk for siden: tettstedene den ikke holder, best først. egne: [{ x, y, navn?, ledig?, lag: { menn } }] (lagene som kan sendes),
  // fiender: [{ x, y, styrke }] (de du vet om). Gir [{ by, eier, km, lag, forsvar, innen, poeng, grunn, mann, minst, har, nok, flere }].
  // Poeng: mye folk, kort veg, nøytralt framfor forsvart, og et forsvart tettsted teller mindre jo sterkere forsvaret er.
  // (19. nov, kritikken: «krigskartet foreslår å sende 3 mann for å ta Stavanger/Sandnes») mann/minst: hva tettstedet krever
  // (spill/garnison.js); har: mann i lagene innen marsjavstand; nok: har ≥ minst; flere: lagene (nærmeste først) som til sammen når
  // «mann» – eller alle innen marsjavstand. Et tettsted dere ikke har mann nok til, teller en firedel; ett som trenger flere lag, litt mindre.
  function trekk(side, byer, eierAv, egne, fiender, R = REGLER) {
    const ut = [];
    for (const b of byer) { const e = eierAv(b.id); if (e === side) continue;
      let lag = null, km = Infinity; for (const s of egne || []) { const d = avst(s, b) / 1000; if (d < km) { km = d; lag = s; } }
      const forsvar = (fiender || []).filter(f => avst(f, b) <= 2500).reduce((a, f) => a + (f.styrke || 0), 0);
      const mann = mannFor(b.folk), minst = minstFor(b.folk), nære = (egne || []).filter(s => avst(s, b) <= R.marsj).sort((p, q) => avst(p, b) - avst(q, b));
      const flere = []; let har = 0; for (const s of nære) { if (mann && har >= mann) break; flere.push(s); har += mennI(s); }
      const nok = !minst || har >= minst, ettLag = !minst || (lag && mennI(lag) >= minst);
      const poeng = Math.sqrt(1 + b.folk) / (4 + (km === Infinity ? 60 : km)) * (e ? .8 : 1.15) / (1 + forsvar / 8) * (nok ? 1 : .25) * (ettLag ? 1 : .7);
      const grunn = forsvar > 0 ? 'forsvart' : e ? 'fiendens, uten kjent forsvar' : 'nøytralt';
      ut.push({ by: b, eier: e, km, lag, forsvar, innen: km * 1000 <= R.marsj, poeng, grunn, mann, minst, har: Math.floor(har), nok, ettLag, flere: nok && !ettLag ? flere : lag ? [lag] : [] }); }
    // det dere har mann nok til, står først (en storby dere ikke kan ta ennå, kommer etter)
    return ut.sort((a, b) => (b.nok ? 1 : 0) - (a.nok ? 1 : 0) || b.poeng - a.poeng);
  }
  // teksten om hva et trekk krever: «trenger ca. 69 mann (minst 35) – dere har 12»
  const kravTekst = t => (!t.minst ? '' : `trenger ${t.mann <= 6 ? t.mann : 'ca. ' + t.mann} mann` + (t.minst < t.mann && t.mann > 6 ? ` (minst ${t.minst})` : '') + (t.nok ? '' : ` – dere har ${t.har}`));
  // Truslene mot det siden holder: tettsteder uten garnison, og tettsteder med en fiende i nærheten. garnison(id) = antall egne lag der.
  function trusler(side, byer, eierAv, garnison, fiender, R = REGLER) {
    const ut = [];
    for (const b of byer) { if (eierAv(b.id) !== side) continue; const g = garnison(b.id) || 0;
      let nær = null, nd = R.trussel; for (const f of fiender || []) { const d = avst(f, b); if (d < nd) { nd = d; nær = f; } }
      if (!nær && g > 0) continue;
      ut.push({ by: b, garnison: g, fiende: nær, km: nær ? nd / 1000 : null, alvor: (nær ? 2 : 0) + (g ? 0 : 1) + b.folk / 1e5 }); }
    return ut.sort((a, b) => b.alvor - a.alvor);
  }
  // (19. nov) en side som holder noe, står ikke med «0 %»: under en halv prosent er «under 1»
  const prosent = a => (a > 0 && a < .005 ? 'under 1' : Math.round(a * 100));
  // entall/flertall: «1 tettsted», «2 tettsteder»
  const tettsteder = n => `${n} tettsted${n === 1 ? '' : 'er'}`;
  const api = { REGLER, område, stilling, utfall, rekkevidde, fronter, trekk, trusler, prosent, kravTekst, tettsteder };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Strategi = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
