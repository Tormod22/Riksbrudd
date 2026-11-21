'use strict';
// S8 i kartet: motstanderne – selskapene rød og grønn (navnene i Fraksjoner.FRAKSJONER) – styres av AI-en i spill/fraksjoner.js. Lagene deres tar tettsteder
// (S7), henter ammunisjon i egne tettsteder, angriper og trekker seg unna. «Motstandere» i ☰ slår AI-en av og på.
(function () {
  const F = Fraksjoner, R = F.REGLER, AI = { på: true, sider: ['rød', 'grønn'] }, nr = { rød: 0, grønn: 0 }, sist = { rød: 0, grønn: 0 };
  const HJEM = { rød: [185600, 6902600], grønn: [204000, 6887400] };   // rød fra Lesja-kanten i vest, grønn fra Dovre-bygda i sør
  window.AI = AI;
  // (runde 7) navnet er alltid nytt: etter en omlasting begynner telleren på nytt, mens de lagrede lagene har sine navn
  function nytt(side, x, y) { let navn; do navn = `${F.lagEie(side)} ${++nr[side]}. lag`; while (typeof ENHETER !== 'undefined' && ENHETER.some(e => e.navn === navn)); const s = nyttLag(navn, x, y, side); s.ai = { neste: 60 * nr[side], mål: null, tekst: '', hva: null }; ENHETER.push(s); return s; }
  for (const side of AI.sider) { const [x, y] = HJEM[side]; nytt(side, x, y); nytt(side, x + 220, y - 180); }
  // W1 (21. nov): patruljen i index.html heter «Rød patrulje» til navnene herfra finnes, og navn fra før W1 («Kystalliansens …») byttes ut
  for (const e of typeof ENHETER !== 'undefined' ? ENHETER : []) { if (e.side === 'rød' && !e.ai && e.navn === 'Rød patrulje') e.navn = F.lagEie('rød') + ' patrulje'; else e.navn = F.nyttNavn(e.navn); }
  AI.nytt = nytt;   // spill/lagring.js lager lagene som fantes da spillet ble lagret
  // KJØRETØY OG STILLINGER (17. nov): hver fraksjon har en lastebil som lagene bruker når målet er langt unna (bare når vegnettet er
  // lastet – på PC hentes det for dette), og en garnison som har holdt et tettsted i to timer, bygger en stilling der.
  const BIL = {}, STILLINGER = []; window.STILLINGER = STILLINGER; AI.biler = BIL;
  if (window.Kjoretoy && window.KJORETOY) for (const side of AI.sider) { const [x, y] = HJEM[side]; BIL[side] = Kjoretoy.ny({ navn: `${F.lagEie(side)} lastebil`, type: 'lastebil', antall: 1, x: x + 40, y: y + 30, side }); KJORETOY.push(BIL[side]); }
  const bærer = k => ENHETER.find(e => e.ombord === k);
  function avBil(s) { const k = s.ombord; s.ombord = null; if (!k) return; s.x = k.x + 6; s.y = k.y + 4; s.sti = null; s.siktSkitten = true; if (window.Kjoretoy && k.sti) Kjoretoy.stopp(k); skitten = true; }
  let vegBedt = false;
  function vegnett() { if (window.VEGNETT) return window.VEGNETT; if (!vegBedt && window.lastVegnett && innerWidth >= 900 && !navigator.webdriver && !(navigator.connection && navigator.connection.saveData)) { vegBedt = true; lastVegnett().catch(() => {}); } return null; }
  KROKER.ild.push((a, b) => (b && Array.isArray(b.menn) && STILLINGER.length ? F.stillingVern(b, STILLINGER) : 1));
  KROKER.lagTekst.push(s => (Array.isArray(s.menn) && F.stillingVern(s, STILLINGER) < 1 ? 'i stilling' : null));
  // stillingene i kartet: bare dem du har sett. Et eget lag som står i en forlatt stilling, river den.
  KROKER.tegn.push((g, vx0, vy1) => { const m = kam.m; if (m > 30) return; g.save(); for (const q of STILLINGER) { if (!q.kjent) continue; const x = (q.x - vx0) / m, y = (vy1 - q.y) / m, r = Math.max(7, Math.min(16, 14 / m));
      g.strokeStyle = sidefarge(q.side, 'lys'); g.lineWidth = 2.2; g.beginPath(); for (let i = 0; i <= 6; i++) { const X = x - r + i * r / 3, Y = y + (i % 2 ? -3 : 3); if (i) g.lineTo(X, Y); else g.moveTo(X, Y); } g.stroke();
      if (m < 6) { g.font = '12px "Cormorant Garamond", serif'; g.textAlign = 'center'; g.fillStyle = sidefarge(q.side, 'lys'); g.fillText('stilling', x, y + 17); } } g.restore(); });
  let stAkk = 0;
  KROKER.sim.push(dt => { stAkk += dt; if (stAkk < 1) return; stAkk = 0; if (!STILLINGER.length) return;
    for (let i = STILLINGER.length - 1; i >= 0; i--) { const q = STILLINGER[i], blå = ENHETER.filter(e => e.side === 'blå' && levende(e));
      if (!q.kjent && blå.some(e => Math.hypot(e.x - q.x, e.y - q.y) < 1200 && ser(e, q.x, q.y))) { q.kjent = true; logg(`${F.FRAKSJONER[q.side].navn} har bygget en stilling – lag som står i den, er vanskeligere å treffe.`); skitten = true; }
      if (blå.some(e => Math.hypot(e.x - q.x, e.y - q.y) <= R.stilling.radius) && !ENHETER.some(e => e.side === q.side && levende(e) && Math.hypot(e.x - q.x, e.y - q.y) < 150)) { STILLINGER.splice(i, 1); logg(`Stillingen til ${F.FRAKSJONER[q.side].navn} er revet.`); skitten = true; } } });

  // Et punkt inne i tettstedets omriss (nær midten av omrisset), så lagene marsjerer inn og ikke til et jorde utenfor.
  const INNE = new Map();
  function inne(by) {
    if (INNE.has(by.e.id)) return INNE.get(by.e.id);
    const cx = (by.bb[0] + by.bb[2]) / 2, cy = (by.bb[1] + by.bb[3]) / 2; let best = [cx, cy], bd = Infinity;
    for (let j = 1; j < 24; j++) for (let i = 1; i < 24; i++) { const x = by.bb[0] + (by.bb[2] - by.bb[0]) * i / 24, y = by.bb[1] + (by.bb[3] - by.bb[1]) * j / 24;
      const d = Math.hypot(x - cx, y - cy); if (d < bd && Garnison.inni(by, x, y)) { bd = d; best = [x, y]; } }
    INNE.set(by.e.id, best); return best;
  }
  // /norge: leiren ligger et annet sted enn Dovre (feilretting 12. nov: nærmeste fiende sto 661 km fra en leir i Lofoten, og ingenting
  // skjedde). Motstanderne flytter startstedene til de nærmeste tettstedene rundt leiren (regelen: Fraksjoner.startsteder), og lagene
  // deres – og patruljen, som settes mellom Kystalliansen og leiren – settes ned på land der (Oppstart.startplasser).
  // En avgrenset løsning: det er fortsatt bare to fraksjoner med to lag hver og én patrulje, nå i nærheten av leiren din.
  const RETN = ['øst', 'nordøst', 'nord', 'nordvest', 'vest', 'sørvest', 'sør', 'sørøst'];
  const retning = (dx, dy) => RETN[((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8];
  // n plasser på land rundt p (ring med radius r); null når det ikke finnes land der
  async function påLand(p, n, r) {
    const v = await lagVindu([p.x - 1600, p.y - 1600, p.x + 1600, p.y + 1600], false), pl = Oppstart.startplasser(p, n, 0, v, { radius: r, maks: 1500 });
    return pl.iVann ? null : pl.lag;
  }
  let flyttNr = 0;
  AI.flytt = async function (leir) {
    const mitt = ++flyttNr, ut = {};
    // tettstedene hentes for seg (infrastrukturen): vent på dem i opptil ett minutt
    for (let i = 0; i < 120 && !(INFRA && INFRA.tettsted); i++) await new Promise(r => setTimeout(r, 500));
    if (mitt !== flyttNr) return null;
    const byer = ((INFRA && INFRA.tettsted) || []).filter(b => b.bb[2] > leir.x - 50000 && b.bb[0] < leir.x + 50000 && b.bb[3] > leir.y - 50000 && b.bb[1] < leir.y + 50000)
      .map(b => { const [x, y] = inne(b); return { x, y, navn: b.e.navn, id: b.e.id, folk: b.e.folk || 0 }; }).filter(b => !window.OMRÅDE_OK || OMRÅDE_OK(b.x, b.y));   // et mindre spillkart: bare tettstedene der
    const st = F.startsteder(leir, byer);
    for (const side of AI.sider) {
      const m = st[side], lag = ENHETER.filter(e => e.side === side && e.ai); let pl = null;
      // uten tettsted: prøv punktet, og ellers de sju andre retningene rundt leiren, til det finnes land
      const d0 = Math.hypot(m.x - leir.x, m.y - leir.y), a0 = Math.atan2(m.y - leir.y, m.x - leir.x);
      for (let k = 0; k < (m.by ? 1 : 8) && !pl; k++) { const p = k ? { x: leir.x + Math.cos(a0 + k * Math.PI / 4) * d0, y: leir.y + Math.sin(a0 + k * Math.PI / 4) * d0 } : m;
        try { pl = await påLand(p, lag.length, 120); } catch (e) { console.error(e); } if (pl) { m.x = p.x; m.y = p.y; } }
      if (mitt !== flyttNr) return null;
      if (!pl) continue;   // bare sjø rundt: denne fraksjonen blir stående der den var
      HJEM[side] = [m.x, m.y]; lag.forEach((s, i) => { [s.x, s.y] = pl[i]; s.sti = null; s.siktSkitten = true; s.ai.mål = null; });
      if (BIL[side]) { const k = BIL[side]; for (const q of lag) if (q.ombord === k) q.ombord = null; if (k.sti) Kjoretoy.stopp(k); k.x = pl[0][0] + 12; k.y = pl[0][1] + 8; }
      ut[side] = { navn: m.navn, x: m.x, y: m.y, km: Math.round(Math.hypot(m.x - leir.x, m.y - leir.y) / 1000), retning: retning(m.x - leir.x, m.y - leir.y), id: m.by ? m.by.id : null };
    }
    // patruljen (rød, uten AI): på vegen fra rødt startsted mot leiren, 4–12 km fra leiren; finnes det ikke land der, hos de andre røde
    const pat = ENHETER.filter(e => e.side === 'rød' && !e.ai);
    if (ut.rød && pat.length) { const d = Math.hypot(ut.rød.x - leir.x, ut.rød.y - leir.y), t = Math.max(4000, Math.min(12000, d * .5)) / d; let pl = null;
      for (const p of [{ x: leir.x + (ut.rød.x - leir.x) * t, y: leir.y + (ut.rød.y - leir.y) * t }, { x: ut.rød.x, y: ut.rød.y }]) { if (pl) break;
        try { pl = await påLand(p, pat.length, p.x === ut.rød.x ? 260 : 60); } catch (e) { console.error(e); } }
      if (mitt !== flyttNr) return null;
      if (pl) pat.forEach((s, i) => { [s.x, s.y] = pl[i]; s.sti = null; s.siktSkitten = true; }); }
    // (19. nov, kritikken: «Kystalliansen holder til i Vatne», men krigskartet viste 0 tettsteder) – startstedet er deres fra start
    const eid = startEie(ut);
    const tekst = AI.sider.filter(sd => ut[sd]).map(sd => `${F.FRAKSJONER[sd].navn} (${sd === 'rød' ? 'rød' : 'grønn'}) holder til ${ut[sd].navn ? 'i ' + ut[sd].navn : 'i terrenget'}, ${ut[sd].km} km ${ut[sd].retning} for leiren${eid[sd] ? ', og holder tettstedet' : ''}`);
    if (tekst.length) logg(tekst.join('. ') + '.');
    skitten = true; return ut;
  };
  AI.hjem = () => ({ rød: HJEM.rød.slice(), grønn: HJEM.grønn.slice() });
  AI.inne = inne;   // (runde 7) punktet lagene går til i et tettsted (spill/eskalering-visning.js)
  // STARTSTEDET ER DERES (19. nov): i et nytt spill (de første tre spilltimene) får hver motstander tettstedet den holder til i, når det
  // er nøytralt og fraksjonen ikke holder noe annet. ut: { side: { id } } fra AI.flytt; uten ut: tettstedet der HJEM ligger (Dovre).
  // Ikke i testene (navigator.webdriver) uten AI.test. Gir { side: true } for dem som fikk det.
  function startEie(ut) { const fikk = {}; if ((navigator.webdriver && !AI.test) || typeof tid === 'undefined' || tid > 180 || !window.TETTSTEDER || !(INFRA && INFRA.tettsted)) return fikk;
    for (const side of AI.sider) { if ([...TETTSTEDER.values()].some(t => t && t.eier === side)) continue;
      const id = ut ? (ut[side] && ut[side].id) : (((INFRA.tettsted || []).find(b => Garnison.inni(b, HJEM[side][0], HJEM[side][1])) || { e: {} }).e.id);
      if (id === undefined || id === null) continue; const t = Garnison.tilstand(TETTSTEDER, id); if (t.eier) continue;
      TETTSTEDER.set(id, { eier: side, inntar: null }); fikk[side] = true; skitten = true; }
    return fikk; }
  AI.startEie = startEie;
  // Dovre (AI.flytt kalles ikke): når spillet er klart
  window.addEventListener('riksbrudd-spill', () => setTimeout(() => { if (!flyttNr) startEie(null); }, 3000));
  // FREDSTIDEN I REGIONKRIGEN (19. nov): de første døgnene (Fraksjoner.fredDøgn) tar motstanderne ingen tettsteder. Ikke i testene.
  const regionFred = () => { if (navigator.webdriver && !AI.test) return false; const f = window.SPILLREGLER && SPILLREGLER.faktor && SPILLREGLER.faktor.fiende || 1;
    const slutt = F.fredDøgn(f) * 1440;
    if (!AI.regionVarslet && tid < slutt && tid > 5 && window.OppstartSpill && OppstartSpill.tilstand() && OppstartSpill.tilstand().leir) { AI.regionVarslet = true;
      logg(`Motstanderne samler styrker de første ${String(Math.round(F.fredDøgn(f) * 10) / 10).replace('.', ',')} døgnene og tar ingen tettsteder ennå. Bruk tida: lag tropper og ta tettsteder nær leiren.`); }
    if (!AI.regionSlutt && tid >= slutt && tid < slutt + 60) { AI.regionSlutt = true; logg('Motstanderne har samlet seg og begynner å ta tettsteder. Hold garnison i det du har.'); }
    return tid < slutt; };
  AI.regionFred = regionFred;
  // et døgn etter fredstiden (Fraksjoner.REGLER.storEtter) tar de bare tettsteder ett lag kan ta
  const småFørst = () => { if (navigator.webdriver && !AI.test) return false; const f = window.SPILLREGLER && SPILLREGLER.faktor && SPILLREGLER.faktor.fiende || 1; return tid < (F.fredDøgn(f) + R.storEtter) * 1440; };
  AI.småFørst = småFørst;
  const byerRundt = (s, r) => ((INFRA && INFRA.tettsted) || []).filter(b => b.bb[2] > s.x - r && b.bb[0] < s.x + r && b.bb[3] > s.y - r && b.bb[1] < s.y + r && (!window.OMRÅDE_OK || OMRÅDE_OK((b.bb[0] + b.bb[2]) / 2, (b.bb[1] + b.bb[3]) / 2)));
  const eier = by => Garnison.tilstand(TETTSTEDER, by.e.id).eier;

  const MINNE = { rød: { sist: null, hatt: new Set(), leir: false }, grønn: { sist: null, hatt: new Set(), leir: false } }, leir = () => { const S = window.OppstartSpill && OppstartSpill.tilstand(); return S && S.leir ? S.leir : null; };
  AI.minne = MINNE;
  // VÅPENHVILE (18. nov, spill/krig-visning.js): AI.fred[side] = spillminuttet hvilen varer til. Så lenge ser ikke fraksjonens lag
  // dine lag som fiender, og de går ikke mot leiren din.
  AI.fred = {};
  const hvile = (a, b) => (a === 'blå' && (AI.fred[b] || 0) > tid) || (b === 'blå' && (AI.fred[a] || 0) > tid);
  AI.hvile = hvile;
  let akk = 0;
  KROKER.sim.push(dt => {
    akk += dt * 3600 / TIME; if (akk < 60) return; const sek = akk; akk = 0;   // ett steg per spillminutt
    // ammunisjon i egne tettsteder (alle sider): tettstedet forsyner garnisonen
    for (const s of ENHETER) { if (Forsyning.ammo(s) >= 1) continue; const by = byerRundt(s, 1).find(b => Garnison.inni(b, s.x, s.y));
      // (runde 7, gjennomspillingen: Kystalliansen mistet alle tettstedene, og sju lag sto uten ammunisjon i fem døgn) – motstanderne får
      // også påfyll ved hovedkvarteret sitt (innen 800 m av HJEM)
      if ((by && eier(by) === s.side) || (s.ai && HJEM[s.side] && Math.hypot(s.x - HJEM[s.side][0], s.y - HJEM[s.side][1]) < 800)) s.ammo = Math.min(1, Forsyning.ammo(s) + R.påfyll * sek / 3600); }
    if (!AI.på) return;
    for (const s of ENHETER) {
      if (!s.ai || !levende(s) || s.planlegger) continue;
      s.ai.neste -= sek; if (s.ai.neste > 0) continue; s.ai.neste = R.tenk;
      // om bord i lastebilen: gå av når den er framme eller laget ser en fiende nær, ellers kjør videre (tenker hvert minutt)
      if (s.ombord) { const k = s.ombord, nær = ENHETER.filter(e => e.side !== s.side && levende(e) && !hvile(s.side, e.side) && ser(s, e.x, e.y)).reduce((d, e) => Math.min(d, Math.hypot(e.x - s.x, e.y - s.y)), Infinity);
        if (!KJORETOY.includes(k) || F.gåAv(!k.sti, nær === Infinity ? null : nær)) avBil(s); else { s.ai.neste = 60; continue; } }
      const byer = byerRundt(s, R.rekkevidde + 5000).map(by => { const [x, y] = inne(by); return { id: by.e.id, navn: by.e.navn, x, y, folk: by.e.folk, eier: eier(by), inni: (X, Y) => Garnison.inni(by, X, Y), mann: Garnison.mannFor ? Garnison.mannFor(by.e.folk) : 0, minst: Garnison.minstFor ? Garnison.minstFor(by.e.folk) : 0 }; });
      const fiender = ENHETER.filter(e => e.side !== s.side && levende(e) && !hvile(s.side, e.side) && ser(s, e.x, e.y)).map(e => ({ x: e.x, y: e.y, navn: e.navn, styrke: F.styrke(e, Forsyning.ammo(e)) }))
        .concat(KJORETOY.filter(k => k.side !== s.side && !hvile(s.side, k.side) && ser(s, k.x, k.y)).map(k => ({ x: k.x, y: k.y, navn: k.navn, styrke: ((window.Enheter && Enheter.REGLER.styrke[k.type]) || 1) * k.antall })));   // stridsvogner skremmer, lastebiler er bytte
      // BEDRE AI (17. nov): det fraksjonen husker og vet – hvor den sist så en fiende, hvilke tettsteder den har mistet, hvem av
      // vennene som blir beskutt, hva de andre lagene alt går mot, og hvor spillerens leir er når et lag har vært nær nok til å se den
      const M = MINNE[s.side], venner = ENHETER.filter(e => e.side === s.side && e.ai && levende(e)), L = leir();
      for (const b of byer) { if (b.eier === s.side) M.hatt.add(b.id); else if (M.hatt.has(b.id)) b.tapt = true; }
      const sett = ENHETER.filter(e => e.side !== s.side && levende(e) && !hvile(s.side, e.side) && ser(s, e.x, e.y)).sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y))[0];
      if (sett) M.sist = { x: sett.x, y: sett.y, navn: sett.navn, styrke: F.styrke(sett, Forsyning.ammo(sett)), t: tid };
      if (M.sist && Math.hypot(M.sist.x - s.x, M.sist.y - s.y) < 250 && !sett) M.sist = null;   // vi er der, og ingen er her lenger
      // (balansen 18. nov, Claudes forslag) i et ekte spill går motstanderne ikke løs på leiren de første døgnene: 4 på «Vanlig»,
      // 5 på «Lett», 3 på «Hard» (4 / fiendens faktor). Gjennomspillingen hadde Kystalliansen i leiren på dag 2 og hele leiren
      // ødelagt på dag 3, før en nybegynner har mer enn én tropp. Lag innen 1,5 km fra leiren regnes heller ikke som mål da. Testene som før.
      // Runde 4 (18. nov, Claudes forslag etter gjennomspillingene 7 og 8 i docs/natt/balanse.md: leiren sto mot røverne, men falt for
      // Kystalliansen på dag 5–6, rett etter fredstiden): 7 døgn på «Vanlig» (7 / fiendens faktor, 4–10), og et varsel i loggen ett døgn før.
      const fredTid = () => { if (navigator.webdriver) return false; const f = window.SPILLREGLER && SPILLREGLER.faktor && SPILLREGLER.faktor.fiende || 1,
          slutt = Math.max(4, Math.min(10, Math.round(7 / f))) * 1440;
        if (!AI.fredVarslet && tid > slutt - 1440 && tid < slutt) { AI.fredVarslet = true; logg('Motstanderne samler seg. Om et døgn kan de gå løs på leiren din – ha minst to tropper hjemme og vakttårn bemannet.'); }
        return tid < slutt; };
      if (L && !M.leir && Math.hypot(L.x - s.x, L.y - s.y) < 2000) { M.leir = true; if (synlig(s)) logg(`${F.FRAKSJONER[s.side].navn} har funnet leiren din.`); }
      const opptatt = new Map(), mot = new Map(); for (const f of venner) if (f !== s && f.ai.målBy !== undefined && f.ai.målBy !== null) { opptatt.set(f.ai.målBy, f); if (!mot.has(f.ai.målBy)) mot.set(f.ai.målBy, []); mot.get(f.ai.målBy).push(f); }
      const hjelp = venner.filter(f => f !== s && f.beskuttTid !== undefined && tid - f.beskuttTid < 15).map(f => ({ x: f.x, y: f.y, navn: f.navn, lag: f }));
      // (18. nov) førerens væremåte (spill/krig.js) flytter terskelen for når laget angriper
      const vmF = window.Krig && window.KrigSpill && KrigSpill.auto() && !s.raid ? (Krig.væremåte((s.menn[s.leder] || s.menn[0]).navn).overtak || 1) : 1;
      // (19. nov) fienden som står i tettstedet laget er i (lagene vet om hverandre der, også når skogen skjuler dem)
      const byHer = byer.find(b => b.inni(s.x, s.y)), iByFiende = byHer ? ENHETER.filter(e => e !== s && e.side !== s.side && levende(e) && Array.isArray(e.menn) && !F.slåttUt(e) && !hvile(s.side, e.side) && byHer.inni(e.x, e.y))
        .map(e => ({ x: e.x, y: e.y, navn: e.navn, styrke: F.styrke(e, Forsyning.ammo(e)) })).sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y))[0] : null;
      const v = F.velg(s, { overtakF: vmF, fred: regionFred(), småFørst: småFørst(), storbyStengt: AI.storbyStengt ? AI.storbyStengt() : 0, blåMedVarsel: !!AI.leirMedVarsel, mot, iByFiende, side: s.side, byer, fiender: fredTid() && L && s.side !== 'blå' ? fiender.filter(f => Math.hypot(f.x - L.x, f.y - L.y) > 1500) : fiender, venner, hjem: HJEM[s.side], ammo: Forsyning.ammo(s), opptatt, hjelp,
        minne: M.sist ? { ...M.sist, alder: tid - M.sist.t } : null, leir: M.leir && L && AI.angripLeir !== false && !AI.leirMedVarsel && !hvile(s.side, 'blå') && !fredTid() ? { x: L.x, y: L.y, navn: 'leiren din' } : null, iSkog: !!(s.her && s.her.k === 1), beskutt: s.beskuttTid !== undefined && tid - s.beskuttTid < 15 });
      // (runde 7) lag i en angrepsgruppe følger gruppa (spill/eskalering-visning.js) – unntatt når laget er slått ut eller angriper en fiende det ser
      if (AI.styr) { const o = AI.styr(s, v); if (o) { delete v.mål; Object.assign(v, o); } }
      s.ai.målBy = v.hva === 'ta' || v.hva === 'leir' ? v.mål : v.hva === 'hold' && /^(tar|venter på flere for å ta) /.test(v.tekst) ? (byer.find(b => b.inni(s.x, s.y)) || {}).id : null;
      // angrep: still deg på det høyeste punktet rundt målet (høyde gir overtak), leiren angripes tettere på
      if (v.hva === 'angrip' || v.hva === 'leir') { const p = F.angrepspunkt(s, v, (x, y) => hoydeVed(x, y), v.hva === 'leir' ? 110 : 280); v.x = p.x; v.y = p.y; }
      const ny = v.hva !== s.ai.hva; s.ai.hva = v.hva; s.ai.tekst = v.tekst;
      if (ny && synlig(s) && ['angrip', 'trekk', 'samle', 'støtt', 'leir'].includes(v.hva)) logg(`${s.navn} ${v.tekst}.`);
      if (v.hva === 'hold') { if (s.sti) { s.sti = null; s.siktSkitten = true; } s.ai.mål = null;
        // garnisonen bygger en stilling når den har holdt stedet lenge nok
        s.ai.holdt = /garnison/.test(v.tekst) ? (s.ai.holdt || 0) + R.tenk / 60 : 0; const egneSt = STILLINGER.filter(q => q.side === s.side), nærSt = egneSt.reduce((d, q) => Math.min(d, Math.hypot(q.x - s.x, q.y - s.y)), Infinity);
        if (F.byggStilling(s.ai.holdt, nærSt, egneSt.length)) { STILLINGER.push({ x: s.x, y: s.y, side: s.side, kjent: synlig(s) }); s.ai.holdt = 0; if (synlig(s)) logg(`${s.navn} har bygget en stilling.`); skitten = true; }
        continue; }
      s.ai.holdt = 0;
      const m = s.ai.mål; if (s.sti && m && Math.hypot(m[0] - v.x, m[1] - v.y) < 300) continue;   // allerede på veg dit
      // (19. nov) mot en fiende i tettstedet går laget helt inntil (ellers blir korte flytt over 150 m)
      if (Math.hypot(v.x - s.x, v.y - s.y) < (v.hva === 'jakt' && iByFiende ? R.inntil : 150)) continue;
      // langt unna og lastebilen står like ved: kjør (laget følger kjøretøyet – spill/tropper-visning.js)
      // (runde 7) motstanderne kan ha kjøpt flere lastebiler (AI.ekstraBiler, spill/eskalering-visning.js): den nærmeste ledige
      { const ledig = q => q && KJORETOY.includes(q) && !bærer(q) && !q.sti, kand = [BIL[s.side]].concat((AI.ekstraBiler && AI.ekstraBiler[s.side]) || []).filter(ledig),
          k = kand.sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y))[0], dk = k ? Math.hypot(k.x - s.x, k.y - s.y) : null;
        if (F.kjør(v.hva, Math.hypot(v.x - s.x, v.y - s.y), dk)) { const g = vegnett(); if (g) { let r = null; try { r = Kjoretoy.planlegg(k, g, [v.x, v.y]); } catch (e) { r = { feil: e.message }; }
            if (r && !r.feil) { s.ombord = k; s.sti = null; s.ai.mål = [v.x, v.y]; s.ai.neste = 60; if (synlig(s)) logg(`${s.navn} kjører i lastebil.`); continue; } } } }
      s.ai.mål = [v.x, v.y]; ordre(s, v.x, v.y, true);
    }
    // forsterkninger: nytt lag ved startstedet (eller i et eget tettsted) hver 6. spilltime når fraksjonen har få lag igjen
    for (const side of AI.sider) {
      // (18. nov) tettstedene fraksjonen holder, gir forsterkninger fortere (RegionSpill.fordel, docs/natt/okonomi.md)
      const forsterk = window.RegionSpill && RegionSpill.fordel ? Math.max(.25, +RegionSpill.fordel(side).forsterk || 1) : 1;
      sist[side] += sek; if (sist[side] < R.forsterkning.hver / forsterk) continue;
      const lag = ENHETER.filter(e => e.side === side && e.ai && levende(e) && !F.slåttUt(e)); const holder = ((INFRA && INFRA.tettsted) || []).filter(b => b.bb[2] > HJEM[side][0] - 60000 && b.bb[0] < HJEM[side][0] + 60000 && b.bb[3] > HJEM[side][1] - 60000 && b.bb[1] < HJEM[side][1] + 60000 && eier(b) === side).length; const tak = F.lagTak(holder, navigator.webdriver && !AI.test ? 0 : Math.floor(tid / 1440)); if (lag.length >= tak) continue;
      // (19. nov, gjennomspillingen: slåtte lag teller ikke, så Kystalliansen hadde 26 lag på dag 8) er det alt så mange lag som taket,
      // samles et slått lag som står i et eget tettsted, til det nye laget; ellers kommer ikke noe nytt (ikke i testene)
      if (!navigator.webdriver || AI.test) { const alle = ENHETER.filter(e => e.side === side && e.ai && levende(e)); if (alle.length >= tak) {
        const brutt = alle.find(e => F.slåttUt(e) && ((INFRA && INFRA.tettsted) || []).some(b => eier(b) === side && b.bb[0] <= e.x && e.x <= b.bb[2] && b.bb[1] <= e.y && e.y <= b.bb[3] && Garnison.inni(b, e.x, e.y)));
        if (!brutt) continue; ENHETER.splice(ENHETER.indexOf(brutt), 1); if (typeof valgt !== 'undefined' && valgt === brutt && window.lukkPanel) lukkPanel(); } }
      sist[side] = 0; const egen = ((INFRA && INFRA.tettsted) || []).find(b => eier(b) === side), [x, y] = egen ? inne(egen) : HJEM[side], s = nytt(side, x, y);
      if (synlig(s)) logg(`${F.FRAKSJONER[side].navn} har fått forsterkninger: ${s.navn}.`);
    }
  });
  KROKER.lagTekst.push(s => s.side !== 'blå' && F.FRAKSJONER[s.side] ? F.FRAKSJONER[s.side].navn : null);

  // «Motstandere» i kartlagmenyen
  const b = document.createElement('button'); b.textContent = 'Motstandere'; b.title = 'AI-en for ' + F.FRAKSJONER.rød.navn + ' og ' + F.FRAKSJONER.grønn.navn; b.setAttribute('aria-pressed', 'true');
  b.onclick = () => { AI.på = !AI.på; b.classList.toggle('av', !AI.på); b.setAttribute('aria-pressed', String(AI.på)); logg(AI.på ? 'Motstanderne handler igjen.' : 'Motstanderne står stille (AI av).'); };
  document.getElementById('lagmeny').appendChild(b);
})();
