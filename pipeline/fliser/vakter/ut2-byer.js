// VAKT «byene på laget» (ut2-byer, fase Ø3): en avtale forhandles og gir betaling hvert døgn, bryter du løftet synker tilliten,
// byen ber om hjelp (hendelsen riksbrudd-by-ber), ringen tegnes, og en handelspartner teller halvt i krigsstillingen.
// To prøvetettsteder legges inn ved leiren og tas bort igjen; alt annet settes tilbake (penger, tid, lag, eierskap, lagringen).
module.exports = {
  navn: 'byene på laget (ut2-byer)',
  kjør: async (pg) => pg.evaluate(async () => {
    const d = {}, feil = [], krev = (b, t) => { if (!b) feil.push(t); };
    const BS = window.ByavtaleSpill, BA = window.Byavtale, RS = window.RegionSpill;
    if (!BS || !BA || !RS || !window.KOMMANDO) return { ok: false, tekst: 'ByavtaleSpill, Byavtale, RegionSpill eller KOMMANDO mangler', data: d };
    const Sp = OppstartSpill.tilstand(), L = Sp.leir, penger0 = Sp.penger, tid0 = tid, valgt0 = valgt;
    const lsB = localStorage.getItem(BS.NØKKEL), lsR = localStorage.getItem('riksbrudd-region'), SB0 = JSON.parse(JSON.stringify(BS.tilstand())), SR0 = JSON.parse(JSON.stringify(RS.tilstand()));
    let lagetInfra = false; if (typeof INFRA !== 'undefined' && !INFRA) { INFRA = {}; for (const k of ['felt', 'tettsted', 'magasin', 'ror', 'ferje', 'tunnel', 'dam', 'bru', 'ferjekai', 'kraft', 'olje', 'kai']) INFRA[k] = []; lagetInfra = true; }
    if (!INFRA.tettsted) INFRA.tettsted = [];
    const nyBy = (id, dx, dy, folk) => { const x = L.x + dx, y = L.y + dy, r = 300; return { lag: 'tettsted', e: { id, navn: 'Vakt ' + id, folk }, bb: [x - r, y - r, x + r, y + r], deler: [[x - r, y - r, x + r, y - r, x + r, y + r, x - r, y + r]] }; };
    const A = nyBy('ut2a', 7000, 0, 3000), N = nyBy('ut2b', 14000, 3000, 1200); INFRA.tettsted.push(A, N);
    const ider = ['ut2a', 'ut2b'], eierFør = ider.map(id => TETTSTEDER.get(id));
    let lytt = 0; const ber = () => { lytt++; }; window.addEventListener('riksbrudd-by-ber', ber);
    const lag = []; const nytt = (n, x, y, side) => { const s = nyttLag(n, x, y, side); ENHETER.push(s); lag.push(s); return s; };
    try {
      BS.nullstill(); const omr = BS.område(); krev(omr.some(b => b.id === 'ut2a'), 'prøvebyen er ikke med i området');
      const b = BA.by(BS.tilstand(), 'ut2a'); b.tillit = 50;
      // forhandlingen: et altfor dyrt tilbud får nei, et rimelig ja (gjennom kommandolaget)
      const nei = BS.forhandle({ by: 'ut2a', trinn: 'beskyttelse', pris: 5e6, løfte: 'vanlig', varighet: 7 });
      krev(nei && nei.svar === 'nei', 'et altfor dyrt tilbud fikk ikke nei: ' + JSON.stringify(nei));
      const ja = BS.forhandle({ by: 'ut2a', trinn: 'beskyttelse', pris: 20000, løfte: 'vanlig', varighet: 7 });
      krev(ja && ja.svar === 'ja' && b.avtale && b.avtale.trinn === 'beskyttelse' && b.avtale.mann === 4, 'avtalen ble ikke inngått: ' + JSON.stringify(ja));
      // betaling hvert døgn når løftet holdes (fire mann i byen)
      const c = { x: (A.bb[0] + A.bb[2]) / 2, y: (A.bb[1] + A.bb[3]) / 2 }; const g = nytt('Vakt byer', c.x, c.y, 'blå');
      for (let h = 0; h < 24; h++) BS.timeSteg(); const p0 = OppstartSpill.tilstand().penger, t0 = b.tillit; BS.døgnSteg();
      d.betalt = OppstartSpill.tilstand().penger - p0; d.tillitHoldt = [t0, b.tillit];
      krev(d.betalt >= 20000 - 1, `betalingen kom ikke (${d.betalt} kr)`); krev(b.tillit > t0, 'tilliten steg ikke når løftet ble holdt');
      // brutt løfte: laget går bort
      g.x = L.x - 20000; g.y = L.y; for (let h = 0; h < 24; h++) BS.timeSteg(); const t1 = b.tillit; BS.døgnSteg(); d.tillitBrutt = [t1, b.tillit];
      krev(b.tillit < t1 && b.avtale && b.avtale.brudd === 1, 'tilliten sank ikke da løftet ble brutt');
      // byen ber om hjelp når fiender er nær, og tilliten synker når ingen kommer i tide
      const f = nytt('Vakt røvere', c.x + 1500, c.y, 'rød'); BS.timeSteg();
      d.hjelp = !!b.hjelp; d.hendelse = lytt; krev(b.hjelp && lytt >= 1, 'byen ba ikke om hjelp (eller hendelsen riksbrudd-by-ber kom ikke)');
      const t2 = b.tillit; tid += (b.avtale.svartid + 1) * 60; BS.timeSteg(); d.tillitHjelp = [t2, b.tillit];
      krev(!b.hjelp && b.tillit < t2, 'tilliten sank ikke da hjelpen ikke kom');
      f.x = L.x - 30000;
      // ringen tegnes rundt byen i avtalefargen
      const kall = []; const lerret = { width: 2000, height: 2000 };
      const gx = { canvas: lerret, save() {}, restore() {}, setLineDash() {}, beginPath() {}, stroke() { kall.push(this.strokeStyle); }, arc(x, y, r) { kall.push(['arc', Math.round(x), Math.round(y), Math.round(r)]); } };
      const m0 = kam.m; kam.m = 10; BS.ringer(gx, c.x - 1000 * 10, c.y + 1000 * 10); kam.m = m0;
      d.ring = kall.slice(0, 4); krev(kall.some(k => typeof k === 'string' && /214,178,90/.test(k)), 'ringen i beskyttelsesfargen ble ikke tegnet');
      // handelspartneren teller halvt i krigsstillingen
      b.avtale.trinn = 'handel'; const st = Strategi.stilling([{ id: 'ut2a', folk: 3000 }, { id: 'ut2b', folk: 3000 }], () => null);
      d.stilling = Math.round(st.sider.blå.andel * 100); krev(st.sider.blå.partnere === 1 && Math.abs(st.sider.blå.andel - .25) < 1e-6, 'partneren teller ikke halvt i stillingen');
      // tatt med makt (bare utenfor testene, her med ByavtaleSpill.test): tillit (= lojaliteten) 10 og frykt 80, og byen er lydig
      { const t0 = BS.test; BS.test = true; try { TETTSTEDER.set('ut2b', { eier: 'blå', inntar: null }); RS.status(); const rb = RS.tilstand().byer.ut2b, fb = BS.tilstand().byer.ut2b;
        d.makt = [rb && rb.loj, fb && fb.frykt]; krev(rb && rb.loj === Byavtale.REGLER.makt.tillit && fb && fb.frykt === Byavtale.REGLER.makt.frykt && RS.lydig('ut2b'), 'en by tatt med makt fikk ikke tillit 10 og frykt 80: ' + JSON.stringify(d.makt)); }
        finally { BS.test = t0; } }
      // fanen Byer viser prøvebyen med avtalen
      if (window.SelskapetSpill) { SelskapetSpill.vis(true, 'byer'); await new Promise(r => setTimeout(r, 200)); const t = (document.querySelector('#selskapet .skropp') || {}).textContent || '';
        d.fane = /Vakt ut2a/.test(t) && /Handel/.test(t); krev(d.fane, 'fanen Byer viser ikke byen og avtalen'); SelskapetSpill.vis(false); }
    } catch (e) { feil.push('unntak: ' + e.message); }
    finally {
      window.removeEventListener('riksbrudd-by-ber', ber);
      for (const s of lag) { const i = ENHETER.indexOf(s); if (i >= 0) ENHETER.splice(i, 1); }
      ider.forEach((id, i) => { if (eierFør[i] === undefined) TETTSTEDER.delete(id); else TETTSTEDER.set(id, eierFør[i]); });
      INFRA.tettsted = INFRA.tettsted.filter(t => t !== A && t !== N); if (lagetInfra) INFRA = null;
      BS.sett(SB0); RS.sett(SR0);
      if (lsB === null) localStorage.removeItem(BS.NØKKEL); else localStorage.setItem(BS.NØKKEL, lsB);
      if (lsR === null) localStorage.removeItem('riksbrudd-region'); else localStorage.setItem('riksbrudd-region', lsR);
      const p = OppstartSpill.tilstand().penger; if (p > penger0) OppstartSpill.betal(p - penger0); else if (p < penger0) OppstartSpill.gi(penger0 - p);
      tid = tid0; valgt = valgt0; skitten = true;
    }
    d.penger = OppstartSpill.tilstand().penger === penger0; if (!d.penger) feil.push('pengene ble ikke satt tilbake');
    return { ok: !feil.length, tekst: feil.length ? feil.join('; ') : `avtale inngått, betalt ${d.betalt} kr, tillit ${d.tillitHoldt.join('→')} (holdt), ${d.tillitBrutt.join('→')} (brutt), ${d.tillitHjelp.join('→')} (for sent), ringen tegnet, partner halvt`, data: d };
  }),
};
