'use strict';
/* LOGGDEMPING (runde 8, 20. nov natt – to nye kritikere: «loggen gjentar seg og drukner det viktige»).
 * «Hogstlaget fant skog … Vil du velge stedet selv …» kom minst seks ganger på ett døgn, «Det begynner å regne. Sikten er 95 %» /
 * «Det klarner opp» om og om igjen, og «Kamp om Bryne: ingen tar tettstedet …» sto fire ganger i én visning. logg() i index.html spør
 * nå LoggDemp.vurder(tekst, linjene, spillminutt) før en melding vises:
 *   1. SAMME MELDING (tallene regnes ikke med) innen REGLER.vindu spillminutter slås sammen til én linje: «… (×4)». Den gamle linja tas
 *      bort, og den nye står øverst med den nyeste teksten.
 *   2. RUTINEMELDINGER som gjentar seg av seg selv (hogst, egen mat og drikke, ammunisjon hjemme) vises høyst én gang per «hver».
 *   3. VÆRET meldes bare ved store skifter (tåke, snø, storm) og når et stort skifte er over – ikke hver gang det begynner å regne.
 *   4. TIPS («Vil du …», «Tips: …») vises bare første gang, og en forklarende setning uten tall som alt er vist, tas bort fra en ny
 *      melding (den første setningen står alltid).
 * Reglene er uten DOM (Node: require('./loggdemp'), test_loggdemp.js); nederst kobles de på siden (window.LoggDemp). Tallene er Claudes forslag.
 */
(function (rot) {
  // Claudes forslag
  const REGLER = {
    vindu: 120,          // spillminutter: samme melding innen så lang tid blir én linje med «×n»
    forklaring: 1440,    // spillminutter: en forklarende setning (uten tall) som er vist så nylig, tas bort fra en ny melding
    minForklaring: 24,   // tegn: kortere setninger regnes ikke som forklaring
    værHver: 360,        // spillminutter: det samme store værskiftet meldes ikke oftere
    maks: 400,           // så mange ulike meldinger huskes (de eldste glemmes)
    // (løkka r1, kritiker I: «Speidertropp 1 har lastet nødlageret. (×22)», «Under ild! (×17)») en melding som gjentar seg innen vinduet,
    // flyttes bare øverst i loggen igjen når tallet når et av disse trinnene – ellers telles den stille (den står der alt)
    visVed: [2, 3, 5, 10, 25, 50, 100, 250, 500, 1000],
    // meldinger som bare skal stå én gang per ENGANG.hver spillminutter (samme hendelse meldt fra flere steder i koden)
    ENGANG: { re: /har lastet nødlageret|har med seg .+\. Ta vedkommende med/, hver: 1440 },
    RUTINE: [
      { slag: 'egenpleie', re: /^Du (drikker deg utørst|spiser i leiren)/, hver: 1440 },
      { slag: 'hogst', re: /^(Hogstlaget fant skog|Hogstfeltet er hogd)/, hver: 480 },
      { slag: 'ammunisjon', re: /fyller ammunisjon i leiren/, hver: 360 },
    ],
    vær: /^(Det klarner opp|Det skyer over|Det begynner å (regne|snø)|Tåka kommer sigende|Det blåser opp til storm)\./,
    storVær: /^(Tåka|Det blåser opp til storm|Det begynner å snø)/,
    tips: /^(Vil du|Tips?:)/,
    // RUNDE 14 (kritiker I: «hver omlasting skrev Spillform …, Ravnsund holder til i … og Velkommen tilbake … inn i loggen» – 36 av
    // 61 linjer; kritiker J: etter F5 sto det at fienden holdt en by spilleren holdt): innledningen skrives bare i et NYTT spill.
    // Når et lagret spill åpnes, holdes disse meldingene tilbake (oppsummeringen står i «Velkommen tilbake»-boksen).
    OPPSTART: /^(Spillform: |Velkommen tilbake, |Fikk ikke hentet )| \((rød|grønn)\) holder til /,
  };
  // «Kamp om Bryne … (×4)» og «… (20 m)!» / «… (35 m)!» gir samme nøkkel: tall og «×n» regnes ikke med
  const nøkkel = t => String(t).replace(/\s*\(×\d+\)\s*$/, '').replace(/[\d\s.,]*\d/g, '#').trim();
  const harTall = s => /\d/.test(s);
  // setningene i en melding (en ny setning begynner med stor bokstav, «, ( eller 📻 etter . ! ? …)
  const setninger = t => String(t).split(/(?<=[.!?…])\s+(?=[A-ZÆØÅ«(📻])/);

  function lag(R = REGLER, tips = new Set()) {
    const sist = new Map(), sett = new Map(), engang = new Map(), rutine = {}; let vær = { stor: false, t: -1e9, tekst: '' };
    const nær = (a, b, v) => Math.abs(a - b) <= v;
    function glem(kart) { if (kart.size <= R.maks) return; const n = kart.size - R.maks; let i = 0; for (const k of kart.keys()) { if (i++ >= n) break; kart.delete(k); } }
    // svar: null = hold tilbake, ellers { tekst, fjern } (fjern = indeksen til en gammel linje som skal bort, −1 = ingen)
    // gammelt = et lagret spill er åpnet (ikke et nytt spill): da holdes OPPSTART-meldingene tilbake
    function vurder(t, linjer, nå, gammelt) {
      t = String(t == null ? '' : t); if (!t.trim()) return null; nå = +nå || 0; linjer = linjer || [];
      if (gammelt && R.OPPSTART.test(t)) return null;
      // 3: været
      if (R.vær.test(t)) {
        const første = setninger(t)[0], stor = R.storVær.test(t);
        if (stor) { if (vær.stor && vær.tekst === første && nær(nå, vær.t, R.værHver)) return null; vær = { stor: true, t: nå, tekst: første }; }
        else if (vær.stor && /^Det klarner opp/.test(t)) vær = { stor: false, t: nå, tekst: første };
        else return null;
      }
      // ENGANG: samme hendelse (første setning, uten tall) bare én gang per ENGANG.hver
      if (R.ENGANG && R.ENGANG.re.test(t)) { const ek = nøkkel(setninger(t)[0]), e = engang.get(ek); if (e !== undefined && nær(nå, e, R.ENGANG.hver)) return null; engang.set(ek, nå); glem(engang); }
      // 2: rutine
      for (const r of R.RUTINE) if (r.re.test(t)) { if (rutine[r.slag] !== undefined && nær(nå, rutine[r.slag], r.hver)) return null; rutine[r.slag] = nå; break; }
      // 4: tips og forklaringer som alt er vist
      const S = setninger(t);
      if (S.length > 1) {
        const ut = [S[0]];
        for (const s of S.slice(1)) {
          if (R.tips.test(s)) { if (tips.has(s)) continue; tips.add(s); ut.push(s); continue; }
          if (!harTall(s) && s.length >= R.minForklaring) { const v = sett.get(s); sett.set(s, nå); glem(sett); if (v !== undefined && nær(nå, v, R.forklaring)) continue; }
          ut.push(s);
        }
        t = ut.join(' ');
      } else if (R.tips.test(t)) { if (tips.has(t)) return null; tips.add(t); }
      // 1: samme melding innen vinduet
      const k = nøkkel(t), før = sist.get(k);
      const n = før && nær(nå, før.t, R.vindu) ? før.n + 1 : 1;
      sist.delete(k); sist.set(k, { t: nå, n }); glem(sist);
      // gjentakelser mellom trinnene telles, men vises ikke på nytt
      if (n > 1 && R.visVed && !R.visVed.includes(n)) return null;
      const fjern = n > 1 ? linjer.findIndex(l => nøkkel(l) === k) : -1;
      return { tekst: n > 1 ? t + ' (×' + n + ')' : t, fjern };
    }
    return { vurder, tips, nullstill: () => { sist.clear(); sett.clear(); engang.clear(); for (const k of Object.keys(rutine)) delete rutine[k]; vær = { stor: false, t: -1e9, tekst: '' }; } };
  }

  const api = { REGLER, nøkkel, setninger, lag };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  // ---------- på siden: tipsene som er vist, huskes (riksbrudd-loggtips) ----------
  const NØKKEL = 'riksbrudd-loggtips'; let vist = [];
  try { vist = JSON.parse(localStorage.getItem(NØKKEL) || '[]') || []; } catch (e) { vist = []; }
  const tips = new Set(vist), D = lag(REGLER, tips); let antall = tips.size;
  // et lagret spill er åpnet: spill/lagring.js sier om spillet var nytt da siden ble lastet (LagringSpill.nyttSpill)
  const gammelt = () => { const S = rot.OppstartSpill && OppstartSpill.tilstand && OppstartSpill.tilstand(); return !!(S && S.leir && rot.LagringSpill && LagringSpill.nyttSpill && !LagringSpill.nyttSpill()); };
  rot.LoggDemp = Object.assign(api, { vurder(t, linjer, nå) { const r = D.vurder(t, linjer, nå, gammelt());
      if (tips.size !== antall) { antall = tips.size; try { localStorage.setItem(NØKKEL, JSON.stringify([...tips].slice(-100))); } catch (e) { /* fullt eller sperret */ } }
      return r; }, nullstill: D.nullstill, tips });
})(typeof globalThis !== 'undefined' ? globalThis : this);
