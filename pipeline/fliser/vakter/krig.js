// VAKT «krig» (nattarbeidet 18. nov): flanke, sårede, overgivelse og fanger, etterretning, natt, røyk, våpenhvile, lagring av fienden.
// Alt settes tilbake: lagene, pengene, tiden og KrigSpill.test.
module.exports = { navn: 'krig', kjør: async (pg, profil) => {
  const d = await pg.evaluate(async () => {
    const ut = {}; if (!window.KrigSpill || !window.Krig) return { uten: true };
    const KS = KrigSpill, K = Krig, R = K.REGLER, S = OppstartSpill.tilstand(), L = S.leir, penger0 = S.penger, tid0 = tid, test0 = KS.test, T0 = JSON.stringify(KS.T()), ant0 = ENHETER.length, valgt0 = valgt;
    const ild = (a, b) => KROKER.ild.reduce((v, h) => v * h(a, b), 1);
    const a = nyttLag('Vakt blå', L.x + 5000, L.y + 5000, 'blå'), b = nyttLag('Vakt rød', L.x + 5300, L.y + 5000, 'rød'); ENHETER.push(a, b);
    try {
      // i testene er de nye stridsfaktorene av
      KS.test = false; b.retning = 0; const av = ild(a, b); KS.test = true;
      // flanke: b vender mot øst, a står i vest = i ryggen på b
      b.retning = 0; const rygg = ild(a, b); b.retning = Math.PI; const front = ild(a, b); ut.flanke = rygg / front; ut.av = av / front;
      // laget snur seg mot den som skyter
      b.retning = 0; b.krigFra = { v: Math.PI, t: tid, hva: 'rygg' }; b.sti = null; for (let i = 0; i < 100; i++) KROKER.sim.forEach(f => { if (/K\.snu/.test(String(f))) f(.2); }); ut.snudd = Math.abs(Math.abs(b.retning) - Math.PI) < .01;
      // sårede bæres: farten synker
      const fart = s => KROKER.fart.reduce((v, f) => v * f(s), 1), f0 = fart(a); a.menn[5].hp = .5; a.menn[6].hp = .5; ut.fart = fart(a) / f0; a.menn[5].hp = 1; a.menn[6].hp = 1;
      // natt: sikten synker uten nattsikt
      const sikt = s => KROKER.sikt.reduce((v, f) => v * f(s), 1); tid = 18 * 60; const natt = sikt(a); a.utstyr = { nattsikt: true }; ut.natt = natt; ut.nattsikt = sikt(a) / natt; delete a.utstyr; tid = tid0;
      // røyk: laget i røyken er vanskeligere å treffe
      b.retning = Math.PI; const før = ild(b, a); KS.røyk(a); ut.røyk = ild(b, a) / før; KS.røykSkyer.length = 0;
      // overgivelse: et knust lag gir seg, fangene følger laget og leveres i leiren, og avhør gir etterretning
      const c = nyttLag('Vakt rød 2', L.x + 5200, L.y + 5100, 'rød'); ENHETER.push(c);
      for (let i = 0; i < 7; i++) b.menn[i].hp = 0; KS.steg.overgivelser(); ut.gaSeg = !ENHETER.includes(b) && !!a.fanger && a.fanger.n === 5 && ENHETER.includes(c);
      a.x = L.x + 20; a.y = L.y + 20; KS.test = false; for (let i = 0; i < 12; i++) KROKER.sim.forEach(f => f(.1)); KS.test = true; ut.levert = !a.fanger && KS.T().fanger.length === 1;
      ut.avhør = KS.avhør(0); tid += R.etterretning.avhør + 1; for (let i = 0; i < 12; i++) KROKER.sim.forEach(f => f(.1)); tid = tid0; ut.etter = KS.T().etter.some(q => q.navn === 'Vakt rød 2' && q.kilde === 'avhør'); ut.avhørt = !!KS.T().fanger[0].avhørt;
      // Leir-menyen viser fangene og etterretningen
      const hode = document.createElement('div'), el = (t, at = {}, ...barn) => { const e = document.createElement(t); for (const [k, v] of Object.entries(at)) { if (k === 'klasse') e.className = v; else e.setAttribute(k, v); } e.append(...barn); return e; };
      for (const f of LEIR_MENY) if (/Etterretning og avtaler/.test(String(f))) f(hode, { el, knapp: (t, fn, eg = {}) => { const q = el('button', eg, t); q.onclick = fn; return q; } });
      ut.meny = /fanger fra/.test(hode.textContent) && /Vakt rød 2/.test(hode.textContent) && !!hode.querySelector('[data-krig="fri"]');
      // våpenhvile: betales, stopper ilden begge veger, og kan brytes
      if (window.AI && AI.fred) { OppstartSpill.gi(2e7); const p = KS.fredPris('rød'), s1 = OppstartSpill.tilstand().penger; ut.fred = KS.fred('rød') && OppstartSpill.tilstand().penger === s1 - p; ut.fredIld = ild(a, c) === 0 && ild(c, a) === 0; ut.brutt = KS.brytFred('rød') && ild(a, c) > 0 && KS.fredPris('rød') > p; }
      // lagpanelet: fiendens fører og væremåte, og knappen «Tiltak» for egne lag
      ut.fører = KROKER.lagTekst.map(h => h(c)).filter(Boolean).join(' · '); valgt = a; visPanel(); ut.knapp = !!document.getElementById('krigtiltak'); document.getElementById('krigtiltak') && document.getElementById('krigtiltak').click(); ut.panel = document.querySelectorAll('#krigpanel [data-tiltak]').length; KS.lukk();
      // lagringen tar med fiendens lag, minnet og målet for en marsj
      const pk = Lagring.pakk({ tid, leir: L, lag: [], fiender: LagringSpill.fiendeLag(), minne: window.AI ? AI.minne : null, stillinger: window.STILLINGER || [] }); ut.lagret = pk.fiender.some(q => q.navn === 'Vakt rød 2' && q.side === 'rød') && (!window.AI || !!pk.minne.rød);
      // kartet tegnes med merkene uten feil
      skitten = true; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    } catch (e) { ut.feil = String(e && e.stack || e).slice(0, 400); }
    finally {
      for (const s of ENHETER.slice()) if (/^Vakt (blå|rød)/.test(s.navn)) ENHETER.splice(ENHETER.indexOf(s), 1);
      KS.nullstill(); Object.assign(KS.T(), JSON.parse(T0)); KS.test = test0; tid = tid0; valgt = valgt0; visPanel(); if (window.AI && AI.fred) for (const k of Object.keys(AI.fred)) delete AI.fred[k];
      const S2 = OppstartSpill.tilstand(); if (S2.penger > penger0) OppstartSpill.betal(S2.penger - penger0); else if (S2.penger < penger0) OppstartSpill.gi(penger0 - S2.penger);
      KS.lagre(); ut.ryddet = ENHETER.length === ant0; skitten = true;
    }
    return ut;
  });
  if (d.uten) return { ok: false, tekst: 'KrigSpill mangler', data: d };
  const ok = !d.feil && d.flanke > 1.4 && Math.abs(d.av - 1) < 1e-9 && d.snudd && d.fart < .9 && d.natt < .6 && d.nattsikt > 1.5 && d.røyk < .5 && d.gaSeg && d.levert && d.avhør && d.etter && d.avhørt && d.meny
    && (d.fred === undefined || (d.fred && d.fredIld && d.brutt)) && /fører: .+\(.+\)/.test(d.fører) && d.knapp && d.panel >= 5 && d.lagret && d.ryddet;
  return { ok, tekst: `ild i ryggen ×${(d.flanke || 0).toFixed(2)} (av i testene: ×${(d.av || 0).toFixed(2)}), laget snur seg: ${d.snudd}, to sårede gir fart ×${(d.fart || 0).toFixed(2)}, natt gir sikt ×${(d.natt || 0).toFixed(2)}, røyk ×${(d.røyk || 0).toFixed(2)}, knust lag ga seg: ${d.gaSeg}, fanger levert og avhørt: ${d.levert && d.avhørt}, etterretning: ${d.etter}, våpenhvile: ${d.fred && d.fredIld && d.brutt}, ${d.fører}, ${d.panel} tiltak, fienden lagres: ${d.lagret}`, data: d };
} };
