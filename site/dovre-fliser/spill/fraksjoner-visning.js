'use strict';
// S8 i kartet: Kystalliansen (rød) og Folkefronten (grønn) styres av AI-en i spill/fraksjoner.js. Lagene deres tar tettsteder
// (S7), henter ammunisjon i egne tettsteder, angriper og trekker seg unna. «Motstandere» i ☰ slår AI-en av og på.
(function () {
  const F = Fraksjoner, R = F.REGLER, AI = { på: true, sider: ['rød', 'grønn'] }, nr = { rød: 0, grønn: 0 }, sist = { rød: 0, grønn: 0 };
  const HJEM = { rød: [185600, 6902600], grønn: [204000, 6887400] };   // Kystalliansen fra Lesja-kanten i vest, Folkefronten fra Dovre-bygda i sør
  window.AI = AI;
  function nytt(side, x, y) { const s = nyttLag(`${F.FRAKSJONER[side].eieform} ${++nr[side]}. lag`, x, y, side); s.ai = { neste: 60 * nr[side], mål: null, tekst: '', hva: null }; ENHETER.push(s); return s; }
  for (const side of AI.sider) { const [x, y] = HJEM[side]; nytt(side, x, y); nytt(side, x + 220, y - 180); }

  // Et punkt inne i tettstedets omriss (nær midten av omrisset), så lagene marsjerer inn og ikke til et jorde utenfor.
  const INNE = new Map();
  function inne(by) {
    if (INNE.has(by.e.id)) return INNE.get(by.e.id);
    const cx = (by.bb[0] + by.bb[2]) / 2, cy = (by.bb[1] + by.bb[3]) / 2; let best = [cx, cy], bd = Infinity;
    for (let j = 1; j < 24; j++) for (let i = 1; i < 24; i++) { const x = by.bb[0] + (by.bb[2] - by.bb[0]) * i / 24, y = by.bb[1] + (by.bb[3] - by.bb[1]) * j / 24;
      const d = Math.hypot(x - cx, y - cy); if (d < bd && Garnison.inni(by, x, y)) { bd = d; best = [x, y]; } }
    INNE.set(by.e.id, best); return best;
  }
  const byerRundt = (s, r) => ((INFRA && INFRA.tettsted) || []).filter(b => b.bb[2] > s.x - r && b.bb[0] < s.x + r && b.bb[3] > s.y - r && b.bb[1] < s.y + r);
  const eier = by => Garnison.tilstand(TETTSTEDER, by.e.id).eier;

  let akk = 0;
  KROKER.sim.push(dt => {
    akk += dt * 3600 / TIME; if (akk < 60) return; const sek = akk; akk = 0;   // ett steg per spillminutt
    // ammunisjon i egne tettsteder (alle sider): tettstedet forsyner garnisonen
    for (const s of ENHETER) { if (Forsyning.ammo(s) >= 1) continue; const by = byerRundt(s, 1).find(b => Garnison.inni(b, s.x, s.y));
      if (by && eier(by) === s.side) s.ammo = Math.min(1, Forsyning.ammo(s) + R.påfyll * sek / 3600); }
    if (!AI.på) return;
    for (const s of ENHETER) {
      if (!s.ai || !levende(s) || s.planlegger) continue;
      s.ai.neste -= sek; if (s.ai.neste > 0) continue; s.ai.neste = R.tenk;
      const byer = byerRundt(s, R.rekkevidde + 5000).map(by => { const [x, y] = inne(by); return { id: by.e.id, navn: by.e.navn, x, y, folk: by.e.folk, eier: eier(by), inni: (X, Y) => Garnison.inni(by, X, Y) }; });
      const fiender = ENHETER.filter(e => e.side !== s.side && levende(e) && ser(s, e.x, e.y)).map(e => ({ x: e.x, y: e.y, navn: e.navn, styrke: F.styrke(e, Forsyning.ammo(e)) }))
        .concat(KJORETOY.filter(k => k.side !== s.side && ser(s, k.x, k.y)).map(k => ({ x: k.x, y: k.y, navn: k.navn, styrke: ((window.Enheter && Enheter.REGLER.styrke[k.type]) || 1) * k.antall })));   // stridsvogner skremmer, lastebiler er bytte
      const v = F.velg(s, { side: s.side, byer, fiender, venner: ENHETER.filter(e => e.side === s.side && e.ai), hjem: HJEM[s.side], ammo: Forsyning.ammo(s) });
      const ny = v.hva !== s.ai.hva; s.ai.hva = v.hva; s.ai.tekst = v.tekst;
      if (ny && synlig(s) && (v.hva === 'angrip' || v.hva === 'trekk')) logg(`${s.navn} ${v.tekst}.`);
      if (v.hva === 'hold') { if (s.sti) { s.sti = null; s.siktSkitten = true; } s.ai.mål = null; continue; }
      const m = s.ai.mål; if (s.sti && m && Math.hypot(m[0] - v.x, m[1] - v.y) < 300) continue;   // allerede på veg dit
      if (Math.hypot(v.x - s.x, v.y - s.y) < 150) continue;
      s.ai.mål = [v.x, v.y]; ordre(s, v.x, v.y, true);
    }
    // forsterkninger: nytt lag ved startstedet (eller i et eget tettsted) hver 6. spilltime når fraksjonen har få lag igjen
    for (const side of AI.sider) {
      sist[side] += sek; if (sist[side] < R.forsterkning.hver) continue;
      const lag = ENHETER.filter(e => e.side === side && e.ai && levende(e) && !F.slåttUt(e)); if (lag.length >= R.forsterkning.maks) continue;
      sist[side] = 0; const egen = ((INFRA && INFRA.tettsted) || []).find(b => eier(b) === side), [x, y] = egen ? inne(egen) : HJEM[side], s = nytt(side, x, y);
      if (synlig(s)) logg(`${F.FRAKSJONER[side].navn} har fått forsterkninger: ${s.navn}.`);
    }
  });
  KROKER.lagTekst.push(s => s.side !== 'blå' && F.FRAKSJONER[s.side] ? F.FRAKSJONER[s.side].navn : null);

  // «Motstandere» i kartlagmenyen
  const b = document.createElement('button'); b.textContent = 'Motstandere'; b.title = 'AI-en for Kystalliansen og Folkefronten'; b.setAttribute('aria-pressed', 'true');
  b.onclick = () => { AI.på = !AI.på; b.classList.toggle('av', !AI.på); b.setAttribute('aria-pressed', String(AI.på)); logg(AI.på ? 'Motstanderne handler igjen.' : 'Motstanderne står stille (AI av).'); };
  document.getElementById('lagmeny').appendChild(b);
})();
