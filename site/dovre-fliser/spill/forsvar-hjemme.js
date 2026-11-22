/* Riksbrudd – LAGENE HJEMME FYLLER AMMUNISJON OG HVILER (runde 5, 18.–19. nov, pakke «balanse»).
 * Gjennomspillingen (kjøring A, docs/natt/balanse.md): basen starter uten olje, og en ny spiller vet ikke at ammunisjonen fylles med olje
 * (lastebil til en oljeterminal). Lagene hjemme hadde 86 % ammunisjon etter bølge 3, 46 % i bølge 4 og 0 i bølge 5 – og de sårede ble
 * aldri friske uten sykestue. Leiren sto uten forsvar fra dag 5.
 * Nå: et lag som står stille hjemme (innen REGLER.radius fra leirens midte) mellom angrepene, uten fiender i nærheten,
 *  - fyller ammunisjon fra leirens kasse når basen ikke har olje (oljen på basen gjør det gratis som før: forsyning-visning.js),
 *  - og de sårede blir sakte bedre (sykestua med folk på «stell» gjør det fortere, som før: folk-visning.js).
 * Et lag som er hardt skadet (eller nesten tomt for ammunisjon) og står i ro et stykke fra leiren, går hjem for å hvile.
 * Reglene øverst er uten DOM (Node: require('./forsvar-hjemme'); nettleser: globalThis.Hjemme) – test_forsvar_hjemme.js.
 * Ikke i testene (navigator.webdriver) uten HjemmeSpill.test = true. Alle tallene er Claudes forslag.
 */
(function (rot) {
  'use strict';
  // felles tilfeldighet (spill/tilfeldig.js, M0 i docs/plan-flerspiller.md): samme frø gir samme svar på alle maskiner
  const TILFELDIG = (typeof globalThis !== 'undefined' && globalThis.Tilfeldig) || (typeof require === 'function' ? require('./tilfeldig') : null);
  const tilf = TILFELDIG ? TILFELDIG.verden : Math.random;
  const REGLER = {
    // innen så mange meter fra leirens midte er laget «hjemme»; ingen fiende (levende, annen side) nærmere laget enn «fiende» m
    radius: 250, fiende: 800,
    // ammunisjon: «perTime» av full last per spilltime, full last koster «pris» kr; «reserve» kr blir alltid igjen i kassa
    ammo: { perTime: .25, pris: 2e5, reserve: 3e5 },
    // sårede (0 < helse < 1) blir «perTime» bedre per spilltime – fra hardt såret (0,3) til frisk på ca. et døgn. Falne (0) blir ikke friske.
    hvile: { perTime: .03 },
    // HJEM FOR Å HVILE (kjøring B: Tropp 1 ble stående 1,6 km fra leiren med tre av fire sårede i døgn – utenfor rekkevidden til både
    // påfyll og hvile): et lag der minst «andel» av mennene er sårede eller falne, eller som har under «ammo» ammunisjon, og som har
    // stått stille i «vent» spillminutter «fra»–«til» m fra leiren uten fiender innen «fiende» m, går hjem mellom angrepene
    hjem: { andel: .5, ammo: .3, vent: 60, fra: 400, til: 3000, fiende: 600 },
  };
  // Skal laget hjem for å hvile? s: { menn: [{ hp }], ammo }, d = meter fra leiren, stille = spillminutter laget har stått i ro,
  // nærmesteFiende = meter
  function børHjem(s, d, stille, nærmesteFiende) { const H = REGLER.hjem, n = (s.menn || []).length; if (!n || d < H.fra || d > H.til || stille < H.vent || nærmesteFiende < H.fiende) return false;
    const ute = s.menn.filter(m => m.hp < 1).length, a = Number.isFinite(s.ammo) ? s.ammo : 1; return ute >= Math.ceil(n * H.andel) || a < H.ammo; }
  // Hvor mye ammunisjon laget får nå. ammo: 0–1 nå, timer: spilltimer siden sist, penger: i kassa. Gir { andel (lagt til), kr }.
  function påfyll(ammo, timer, penger) {
    const A = REGLER.ammo, mangler = Math.max(0, 1 - (Number.isFinite(ammo) ? ammo : 1)); if (mangler < 1e-6 || !(timer > 0)) return { andel: 0, kr: 0 };
    const råd = Math.max(0, (penger || 0) - A.reserve) / A.pris, andel = Math.max(0, Math.min(mangler, A.perTime * timer, råd));
    return { andel, kr: Math.round(andel * A.pris) };
  }
  // Ny helse for en såret etter «timer» spilltimer hjemme
  const hvil = (hp, timer) => (hp > 0 && hp < 1 && timer > 0 ? Math.min(1, hp + REGLER.hvile.perTime * timer) : hp);
  // Er laget hjemme og i ro? s: { x, y, sti, planlegger, ombord }, leir: { x, y }, fiender: [{ x, y }]
  const hjemme = (s, leir, fiender) => !!leir && !s.sti && !s.planlegger && !s.ombord && Math.hypot(s.x - leir.x, s.y - leir.y) <= REGLER.radius
    && !(fiender || []).some(e => Math.hypot(e.x - s.x, e.y - s.y) < REGLER.fiende);
  const api = { REGLER, påfyll, hvil, hjemme, børHjem };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  rot.Hjemme = api;
  if (typeof document === 'undefined' || typeof KROKER === 'undefined') return;

  // ---------- visningen ----------
  const ut = { test: false }, auto = () => !navigator.webdriver || ut.test;
  const spill = () => rot.OppstartSpill && OppstartSpill.tilstand();
  const angrep = () => { const T = rot.SpilletSpill && SpilletSpill.klar && SpilletSpill.klar() ? SpilletSpill.T() : null; return !!(T && T.aktiv); };
  const baseOlje = () => (rot.OLJE && OLJE.BASER && OLJE.BASER[0] ? OLJE.BASER[0].beholdning : 0);
  let akk = 0; const fyller = new WeakSet(), hviler = new WeakSet();
  // ett steg per ti spillminutter (dt i spillminutter)
  function steg(minutter) {
    const S = spill(); if (!S || !S.leir || angrep()) return null; const timer = minutter / 60, fiender = ENHETER.filter(e => e.side !== 'blå' && levende(e)), ut2 = { kr: 0, lag: 0, leget: 0 };
    for (const s of ENHETER) { if (s.side !== 'blå' || s.karakter || s.leirvakt || !Array.isArray(s.menn) || !levende(s) || !hjemme(s, S.leir, fiender)) { fyller.delete(s); hviler.delete(s); continue; }
      // ammunisjon: bare når basen ikke har olje til det (da fyller forsyning-visning.js gratis)
      const a = rot.Forsyning ? Forsyning.ammo(s) : 1;
      if (a < 1 && baseOlje() < .05) { const p = påfyll(a, timer, spill().penger);
        if (p.andel > 0 && OppstartSpill.betal(p.kr)) { s.ammo = Math.min(1, a + p.andel); ut2.kr += p.kr; ut2.lag++; if (!fyller.has(s)) { fyller.add(s); logg(`${s.navn} fyller ammunisjon i leiren (ca. ${Leir.kroner(Math.round((1 - a) * REGLER.ammo.pris / 1000) * 1000)} for full last).`); } } }
      else fyller.delete(s);
      // de sårede hviler
      let såret = 0; for (const m of s.menn) if (m.hp > 0 && m.hp < 1) { m.hp = hvil(m.hp, timer); if (m.hp < 1) såret++; else ut2.leget++; }
      if (såret) hviler.add(s); else hviler.delete(s); }
    return ut2;
  }
  // lag som er hardt skadet eller tomme for ammunisjon og står i ro et stykke unna, går hjem (én gang per gang de har stoppet)
  const stilleFra = new WeakMap(), sendt = new WeakSet();
  const kanStille = s => { const l = rot.logg; rot.logg = () => {}; try { return KROKER.kanOrdre.every(f => f(s)); } finally { rot.logg = l; } };
  function hjemSteg() { const S = spill(); if (!S || !S.leir || angrep()) return 0; let n = 0; const fiender = ENHETER.filter(e => e.side !== 'blå' && levende(e));
    for (const s of ENHETER) { if (s.side !== 'blå' || s.karakter || s.leirvakt || s.ombord || !Array.isArray(s.menn) || !levende(s)) continue;
      if (s.sti || s.planlegger) { stilleFra.delete(s); sendt.delete(s); continue; } if (!stilleFra.has(s)) stilleFra.set(s, tid);
      if (sendt.has(s)) continue; const d = Math.hypot(s.x - S.leir.x, s.y - S.leir.y), fi = fiender.reduce((m, e) => Math.min(m, Math.hypot(e.x - s.x, e.y - s.y)), Infinity);
      if (!børHjem(s, d, tid - stilleFra.get(s), fi) || !kanStille(s)) continue;
      sendt.add(s); const a = tilf() * 6.2832; try { const p = ordre(s, S.leir.x + Math.cos(a) * 40, S.leir.y + Math.sin(a) * 40, true); if (p && p.catch) p.catch(() => {}); } catch (e) { continue; }
      logg(`${s.navn} er hardt skadet eller har lite ammunisjon og går hjem til leiren for å hvile og fylle opp.`); if (++n >= 3) break; }
    return n; }
  KROKER.sim.push(dt => { if (!auto()) return; akk += dt; if (akk < 10) return; const m = akk; akk = 0; steg(m); hjemSteg(); });
  // i lagpanelet: hva laget gjør hjemme
  KROKER.lagTekst.push(s => (s.side !== 'blå' ? null : [fyller.has(s) ? 'fyller ammunisjon i leiren' : '', hviler.has(s) ? 'de sårede hviler i leiren' : ''].filter(Boolean).join(' · ') || null));
  rot.HjemmeSpill = Object.assign(ut, { steg, hjemSteg });
})(typeof globalThis !== 'undefined' ? globalThis : this);
