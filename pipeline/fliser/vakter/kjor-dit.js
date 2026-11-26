// Vakt for kritikerløkka r2 (pakke «kjøring», 26. nov, Jonas: «Kjør dit» med en tropp om bord ga «finner ingen veg dit», og etterpå hadde
// både Speiderbil 1 og troppen x/y = NaN; «Gå av» ga en sidefeil hvert sekund, og etter omlasting var troppen borte).
// Prøver i pg.evaluate (Dovre-testsiden, vegnettet fra sjekk.js sin rute):
//  1) mål rett ved kjøretøyet (samme nærmeste node – det som ga NaN): ingen NaN, troppen går av ved målet
//  2) mål midt på en veglenke ca. 400 m unna: bilen kjører langs vegen og står på vegen ved målet, troppen går av
//  3) mål uten veg (Snøhetta-vidda): svar med en gang, «Gå av og marsjer dit» i lagpanelet, knappen setter troppen av med en marsjordre
//  4) NaN settes med vilje på et kjøretøy og et lag: plassen settes tilbake, Garnison.inni og krigskartet kaster ikke, lagringen skriver ikke NaN
// Setter alt tilbake: testlaget fjernes, kjøretøyet står der det sto, tid/tempo/valgt som før.
module.exports = {
  navn: 'kjør dit (tropp om bord, aldri NaN)',
  kjør: async (pg, profil) => pg.evaluate(async () => {
    const feil = [], data = {}, sov = ms => new Promise(r => setTimeout(r, ms)), krev = (b, t) => { if (!b) feil.push(t); };
    const sidefeil = []; const lytt = e => sidefeil.push(String(e.message || e)); window.addEventListener('error', lytt);
    const K = window.KJORETOY || [], k = K.find(q => q.side === 'blå' && q.type === 'speiderbil') || K.find(q => q.side === 'blå');
    if (!k || !window.OMBORD_ORDRE || !window.kjørTil || !window.lastVegnett) return { ok: false, tekst: 'kjøretøy, OMBORD_ORDRE eller kjørTil mangler', data };
    const før = { x: k.x, y: k.y, retning: k.retning, sti: k.sti, tid, tempo, valgt, framme: k.framme };
    const s = nyttLag('Vakttropp kjør', k.x, k.y, 'blå'); s.menn = s.menn.slice(0, 4); ENHETER.push(s);
    const sim = (n, dt = .5) => { for (let i = 0; i < n; i++) { for (const f of KROKER.sim) { try { f(dt); } catch (e) { sidefeil.push('sim: ' + e.message); } } } };
    const fin = o => Number.isFinite(o.x) && Number.isFinite(o.y);
    const ombord = () => { s.ombord = k; s.x = k.x; s.y = k.y; s.sti = null; delete s.kjørFeil; delete s.avstigning; };
    const vent = async f => { for (let i = 0; i < 80 && !f(); i++) await sov(100); };
    try {
      const g = await lastVegnett(); data.vegnett = !!g;
      if (!g) throw new Error('uten vegnett');
      // 1) samme nærmeste node som kjøretøyet
      ombord(); window.OMBORD_ORDRE(s, k.x + 30, k.y + 20);
      await vent(() => !s.avstigning || s.avstigning.kjørt || s.kjørFeil); sim(12);
      krev(fin(k) && fin(s), '1: NaN etter «Kjør dit» rett ved bilen (k ' + k.x + ', lag ' + s.x + ')');
      krev(!s.ombord && !s.kjørFeil, '1: troppen gikk ikke av ved målet');
      data.en = { kj: [Math.round(k.x), Math.round(k.y)], lag: [Math.round(s.x), Math.round(s.y)], ombord: !!s.ombord };
      // 2) mål på vegen ca. 400 m unna (punktet på vegen som er nærmest 400 m øst for bilen)
      const v = g.naermestePåVeg([k.x + 400, k.y], 3000); ombord();
      window.OMBORD_ORDRE(s, v.x + 8, v.y + 8);
      await vent(() => !s.avstigning || s.avstigning.kjørt || s.kjørFeil); krev(s.avstigning && s.avstigning.kjørt, '2: kjøretøyet kom ikke av gårde mot et mål på vegen');
      for (let i = 0; i < 40 && k.sti; i++) sim(5, 1); sim(3);
      krev(fin(k) && Math.hypot(k.x - v.x, k.y - v.y) < 3, '2: bilen står ikke på vegen ved målet (' + Math.round(Math.hypot(k.x - v.x, k.y - v.y)) + ' m unna)');
      krev(!s.ombord, '2: troppen gikk ikke av ved målet');
      data.to = { avstand: +Math.hypot(k.x - v.x, k.y - v.y).toFixed(1), ombord: !!s.ombord };
      // 3) mål uten veg innen 3 km: svar med en gang og «Gå av og marsjer dit»
      ombord(); const mx = 200000, my = 6915000; window.OMBORD_ORDRE(s, mx, my);
      await vent(() => s.kjørFeil || !s.avstigning);
      krev(!!s.kjørFeil && !s.avstigning, '3: ingen beskjed når bilen ikke kommer fram');
      valgt = s; visPanel(); const kn = document.getElementById('gaaavmarsj'); krev(!!kn && /Gå av og marsjer dit/.test(kn.textContent), '3: knappen «Gå av og marsjer dit» mangler');
      if (kn) { kn.click(); await vent(() => !s.ombord && (s.planlegger || s.sti)); krev(!s.ombord, '3: troppen gikk ikke av'); krev(!!(s.planlegger || s.sti || s.ordreMål), '3: troppen fikk ingen marsjordre'); }
      await vent(() => !s.planlegger); s.sti = null;
      krev(fin(k) && fin(s), '3: NaN etter mål uten veg');
      data.tre = { feil: !!s.kjørFeil, ombord: !!s.ombord };
      // 4) NaN med vilje: settes tilbake, garnison og krigskart tåler det, lagringen skriver aldri NaN
      s.ombord = null; const gyldigK = [k.x, k.y], gyldigS = [s.x, s.y]; k.sti = null; sim(1);
      k.x = NaN; k.y = NaN; s.x = NaN; s.y = NaN;
      const by = (typeof INFRA !== 'undefined' && INFRA && INFRA.tettsted && INFRA.tettsted[0]) || { bb: [0, 0, 100, 100], deler: [[0, 0, 100, 0, 100, 100, 0, 100]] };
      if (by && window.Garnison) { try { krev(Garnison.inni(by, NaN, NaN) === false, '4: Garnison.inni(NaN) er ikke false'); } catch (e) { feil.push('4: Garnison.inni kaster: ' + e.message); } }
      if (window.Lagring) { const d = JSON.stringify(Lagring.pakkLag(s)); krev(!/"x":null/.test(d), '4: lagringen skriver null/NaN for laget: ' + d.slice(0, 60)); }
      sim(2);
      krev(fin(k) && Math.hypot(k.x - gyldigK[0], k.y - gyldigK[1]) < 1, '4: kjøretøyet ble ikke satt tilbake til siste gyldige plass');
      krev(fin(s) && Math.hypot(s.x - gyldigS[0], s.y - gyldigS[1]) < 1, '4: laget ble ikke satt tilbake til siste gyldige plass');
      if (window.StrategiSpill && StrategiSpill.bilde) { try { StrategiSpill.bilde(); } catch (e) { feil.push('4: krigskartet kaster: ' + e.message); } }
    } catch (e) { feil.push('feil i vakta: ' + e.message); }
    finally {
      const i = ENHETER.indexOf(s); if (i >= 0) ENHETER.splice(i, 1);
      Kjoretoy.stopp(k); Object.assign(k, { x: før.x, y: før.y, retning: før.retning, sti: før.sti, framme: før.framme }); k.sistGyldig = [før.x, før.y];
      tid = før.tid; tempo = før.tempo; valgt = før.valgt; if (window.lukkPanel) try { lukkPanel(); } catch (e) { /* */ } skitten = true;
      window.removeEventListener('error', lytt);
    }
    krev(!sidefeil.length, 'sidefeil: ' + sidefeil.slice(0, 3).join(' | '));
    return { ok: !feil.length, tekst: feil.length ? feil.join('; ') : 'kjør dit: ingen NaN, troppen går av ved målet, uten veg tilbys «Gå av og marsjer dit»', data };
  }),
};
