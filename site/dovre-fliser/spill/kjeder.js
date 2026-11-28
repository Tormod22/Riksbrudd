/* KJEDER (ut6-kjeder 28. nov, fase Ø9 i docs/plan-selskap-okonomi.md, kapittel 4.1–4.2 og 12): reglene rundt de nye maskinene, uten DOM
 * (Node: require('./kjeder'); nettleser: globalThis.Kjeder). Maskinene selv (inn/ut per time, folk, strøm) står i Produksjon.REGLER.maskiner
 * (spill/produksjon.js) og byggene i Leir.BYGG (leir.js). Her står det som binder dem til resten av spillet:
 *   STEIN  steinbrudd (bare ved fjell: høydeforskjell rundt bygget) -> stein -> steinknuser -> pukk; betongblander: pukk + sement -> betong
 *   FISK   båtene som fisker (spill/sjo.js) leverer fisk til fiskemottaket (ved kai, krever fryselageret fra Ytterø Sjømat) -> frossen fisk
 *   KORN   byene dere har handelsavtale med, selger korn fra gårdene sine -> mølle -> mel -> kjøkkenet lager rasjoner av melet
 *   OLJE   oljebasen (spill/okonomi.js, tonn) mater raffineriet -> diesel (liter) rett i leirens tank – de to systemene henger sammen
 *   SMIE   riving gir litt skrap i tillegg (stål i bjelker og rør) -> smia ved verkstedet -> stål og deler
 *   SESONGER (planen 12): hogst går raskere om vinteren (frossen mark), fisket er best om høsten, ved er dyrere i kulda.
 * Alle tallene er Claudes forslag (samlet i REGLER).
 */
(function (rot) {
  'use strict';
  const REGLER = {
    // steinbruddet: høydeforskjellen innen «radius» m skal være minst «spenn» m (en fjellside eller en kolle)
    stein: { radius: 45, spenn: 6, punkter: 8 },
    // fiskemottaket: en kai innen så mange meter
    kai: { avstand: 400 },
    // korn fra byene med handelsavtale: tonn per by og døgn (gårdene rundt), prisen per tonn (under markedet – byen får avsetning),
    // og hvor mye korn leiren tar imot (lageret fylles opp til dette). Om vinteren er det lite å hente (lageret fra høsten).
    korn: { perBy: 3, pris: 4000, maks: 12, årstid: { vinter: .4, vår: .6, sommer: 1, høst: 1.6 } },
    // oljen: raffineriet hentes olje fra basen (tonn) når leiren har mindre enn «mål» t råolje
    olje: { mål: 3 },
    // kjøkkenet: 1 t mel = 6 rasjoner (brød og grøt); høyst 0,25 t mel i timen per kjøkken; bare når maten rekker mindre enn 3 døgn
    mel: { rasjoner: 6, perTime: .25, døgn: 3 },
    // fisken: hver «rasjon» båten ellers ville gitt, er 0,2 t fisk når et fiskemottak tar imot
    fisk: { perRasjon: .2 },
    // riving: 0,4 t skrap per tonn stål som rives (rør, armering, plater)
    skrap: { perStål: .4 },
    // sesongene: faktor på hogsten (arbeidsfarten), fisket og prisen på ved
    sesong: {
      hogst: { vinter: 1.25, vår: .85, sommer: 1, høst: 1 },
      fisk: { vinter: .9, vår: 1, sommer: 1, høst: 1.3 },
      ved: { vinter: 1.4, vår: 1, sommer: .8, høst: 1.15 },
    },
  };
  const tall = v => (Number.isFinite(+v) ? +v : 0);

  // ---------- plassreglene ----------
  // Steinbruddet: høydeforskjellen rundt (x, y). høyde(x, y) -> moh. eller null. Gir { ok, spenn }.
  function steinPlass(høyde, x, y) {
    const S = REGLER.stein, h = [];
    const z0 = høyde(x, y); if (Number.isFinite(z0)) h.push(z0);
    for (let i = 0; i < S.punkter; i++) { const a = i / S.punkter * Math.PI * 2, z = høyde(x + Math.cos(a) * S.radius, y + Math.sin(a) * S.radius); if (Number.isFinite(z)) h.push(z); }
    const spenn = h.length > 2 ? Math.max(...h) - Math.min(...h) : 0;
    return { ok: spenn >= S.spenn, spenn };
  }
  // Feilen for et bygg, eller null. ctx = { høyde(x,y), kai(x,y,r) -> {d}|null, fryselager (bool), harVerksted (bool) }.
  // Uten ctx-funksjonene (Node, eller kartet mangler) slipper bygget gjennom – reglene skal aldri stoppe et bygg fordi data mangler.
  function plassFeil(type, b, ctx = {}) {
    if (type === 'steinbrudd' && ctx.høyde) { const s = steinPlass(ctx.høyde, b.x, b.y); if (!s.ok) return `Steinbruddet må stå ved fjell: bare ${Math.round(s.spenn)} m høydeforskjell her (minst ${REGLER.stein.spenn} m innen ${REGLER.stein.radius} m).`; }
    if (type === 'fiskemottak') {
      if (ctx.fryselager === false) return 'Fiskemottaket trenger fryselageret – Ytterø Sjømat viser dere hvordan (Selskapet → Partnere).';
      if (ctx.kai && !ctx.kai(b.x, b.y, REGLER.kai.avstand)) return `Fiskemottaket må stå ved en kai (innen ${REGLER.kai.avstand} m), så båtene kan levere.`;
    }
    if (type === 'smie' && ctx.harVerksted === false) return 'Smia er en utvidelse av verkstedet: bygg et verksted først.';
    return null;
  }

  // ---------- sesongene ----------
  const sesong = (hva, årstid) => { const T = REGLER.sesong[hva]; return T && T[årstid] > 0 ? T[årstid] : 1; };

  // ---------- korn fra byene ----------
  // n byer med handelsavtale; timer = spilltimer; har = korn i lageret nå. Gir { tonn, kr }.
  function korn(n, timer, har, årstid) {
    const K = REGLER.korn; if (!(n > 0) || !(timer > 0)) return { tonn: 0, kr: 0 };
    const vil = n * K.perBy * (K.årstid[årstid] || 1) * timer / 24, rom = Math.max(0, K.maks - tall(har)), tonn = Math.min(vil, rom);
    return { tonn, kr: Math.round(tonn * K.pris) };
  }

  // ---------- olje fra basen til raffineriet ----------
  // base = tonn på basen, har = råolje i leiren, plass = lagerplass igjen. Gir tonn som flyttes.
  const oljeTilLeir = (base, har, plass) => Math.max(0, Math.min(tall(base), REGLER.olje.mål - tall(har), tall(plass)));

  // ---------- diesel fra raffineriet til tanken ----------
  // L.lager.diesel (liter, det raffineriet har laget) -> L.drivstoff så langt tanken rekker (kap = Leir.kapasitet(L)). Gir liter flyttet.
  function dieselTilTank(L, kap) {
    const har = tall(L && L.lager && L.lager.diesel); if (!(har > 0)) return 0;
    const m = Math.max(0, Math.min(har, tall(kap) - tall(L.drivstoff))); if (!(m > 0)) return 0;
    L.lager.diesel = har - m; L.drivstoff = tall(L.drivstoff) + m; return m;
  }

  // ---------- mel til mat ----------
  // mel = t i lageret, mat = rasjoner nå, spiser = rasjoner per døgn, kjøkken = antall kjøkken i drift (med kokker), timer = spilltimer.
  // Gir { mel (t brukt), rasjoner }.
  function melTilMat(mel, mat, spiser, kjøkken, timer) {
    const M = REGLER.mel; if (!(kjøkken > 0) || !(mel > 0) || !(timer > 0)) return { mel: 0, rasjoner: 0 };
    const mangler = Math.max(0, M.døgn * tall(spiser) - tall(mat)); if (!(mangler > 0)) return { mel: 0, rasjoner: 0 };
    const t = Math.min(mel, kjøkken * M.perTime * timer, mangler / M.rasjoner);
    return { mel: t, rasjoner: t * M.rasjoner };
  }

  // ---------- fisk og skrap ----------
  const fiskFraFangst = (rasjoner, årstid) => Math.max(0, tall(rasjoner)) * REGLER.fisk.perRasjon * sesong('fisk', årstid);
  const skrapFraRiving = stål => Math.max(0, tall(stål)) * REGLER.skrap.perStål;

  const api = { REGLER, steinPlass, plassFeil, sesong, korn, oljeTilLeir, dieselTilTank, melTilMat, fiskFraFangst, skrapFraRiving };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else rot.Kjeder = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
