/*
 * SIMULERINGEN (22. nov, R16-B – flerspillerplanen M0 punkt 2, første bit): marsjsteget for lagene, fiendens patrulje og
 * kamprunden, flyttet ut av index.html (sim, kamprunde, patruljeMål). Uten DOM: virker i Node (pipeline/fliser/test_simulering.js)
 * og senere i tjeneren. Alt modulen trenger fra siden, sendes inn i Simulering.lag({ … }); det som tegner eller viser
 * (visPanel, skitten, SKUDD med performance.now) gjøres av tilbakekall fra siden.
 *
 * Oppførselen er NØYAKTIG som før i index.html: samme rekkefølge på krokene (KROKER.sim før klokka går, så kamprunden, så
 * patruljen, så marsjen), samme bruk av tilfeldigheten (rng = KRNG i siden) og samme meldinger i loggen.
 *
 * m (det siden sender inn):
 *   lag()            -> lista over lag (ENHETER)
 *   Terreng          terreng.js (KAMPRUNDE_MIN, slattUt, treffsjanse, ildrunde, fordelTreff, uteAvKamp)
 *   kroker           { sim: [], ild: [], fart?: [], salve?: [] } (KROKER i siden; leses på nytt hvert steg)
 *                    salve: (a, b, d, f, rng, tid) -> ekstra treff etter a sin salve mot b (granater, undertrykking; R18-C)
 *   rng()            tilfeldighet for kampen (KRNG)
 *   hentTid(), settTid(t)   spillklokka i spillminutter (tid i siden)
 *   TIME             spillminutter per spilltime (60)
 *   logg(tekst), ordre(lag, X, Y, stille), ser(lag, X, Y), synlig(lag), levende(lag)
 *   patruljelag()    fiendens patrulje (PATRULJELAG) eller null
 *   patruljeMål(fi, nr) -> [X, Y] | null, patruljeAntall  (punktene i runden)
 *   hvile(sideA, sideB)  -> true under våpenhvile (window.AI.hvile)          (valgfri)
 *   herjer()         -> Set med lag som herjer i leiren (window.HERJER)     (valgfri)
 *   treffMelding(mann, lag, hva)  melding når en av spillerens menn treffes  (valgfri; ellers logg)
 *   skudd(a, b)      ett skudd for visningen (SKUDD i siden)                 (valgfri)
 *   framme(lag)      laget er framme (siden oppdaterer panelet)              (valgfri)
 *   flyttet()        noe har flyttet seg (skitten = true)                    (valgfri)
 *   etterKamp()      etter hver kamprunde (panelet, skitten)                 (valgfri)
 *   spiller          spillerens side (standard 'blå')
 */
(function (rot) {
  'use strict';

  // Patruljens neste punkt. Står patruljen langt fra Dovre (motstanderne flyttes til leiren, AI.flytt), går den samme runden rundt
  // stedet den står på; lag som AI-en styrer (s.ai), patruljerer ikke. punkter = PATRULJE, maks = MARSJ_MAKS (lengste marsj).
  function patruljeMål(fi, nr, punkter, maks) {
    if (fi.ai) return null;
    const p0 = punkter[0];
    if (!fi.patruljeBase || Math.hypot(fi.x - fi.patruljeBase[0], fi.y - fi.patruljeBase[1]) > maks) fi.patruljeBase = Math.hypot(fi.x - p0[0], fi.y - p0[1]) > maks ? [fi.x, fi.y] : p0;
    return [fi.patruljeBase[0] + punkter[nr][0] - p0[0], fi.patruljeBase[1] + punkter[nr][1] - p0[1]];
  }

  function lag(m) {
    const T = m.Terreng, SP = m.spiller || 'blå', ingen = () => {};
    const logg = m.logg || ingen, skudd = m.skudd || ingen, framme = m.framme || ingen, flyttet = m.flyttet || ingen, etterKamp = m.etterKamp || ingen;
    const S = { patruljeNr: 0 };

    // Én kamprunde: hvert lag som ikke er slått ut, skyter på fiender det ser (eller som herjer i leiren innen 300 m).
    function kamprunde() {
      const rng = m.rng, kroker = m.kroker, alle = m.lag();
      for (const a of alle) {
        a.skyterPå = a.skyterPå || new Set(); const nå = new Set();
        if (!T.slattUt(a.menn)) for (const b of alle) {
          if (a.side === b.side || !m.levende(b)) continue;
          // våpenhvile (spill/krig-visning.js, AI.hvile): ingen ild, og ingen krok kalles – Forsyning.skyt brukte ellers ammunisjon uten skudd
          if (m.hvile && m.hvile(a.side, b.side)) continue;
          // HERJER (spill/leir-visning.js): fiender som står inne i leiren og ødelegger bygg. De høres og ses av alle innen 300 m, selv om
          // en bakketopp står i veien – ellers kunne et røverlag rasere hele leiren mens egne lag sto 75 m unna uten å løsne skudd.
          const herj = m.herjer ? m.herjer() : null;
          const d = Math.hypot(a.x - b.x, a.y - b.y); if (d > 1150 || (!m.ser(a, b.x, b.y) && !(d < 300 && herj && (herj.has(a) || herj.has(b))))) continue;
          const f = { målISkog: !!b.her && b.her.k === 1, målPåMarsj: !!b.sti, skytterPåMarsj: !!a.sti, høydefordel: a.her && b.her ? a.her.h - b.her.h : 0 };
          if (!a.menn.some(mann => mann.hp >= 1 && T.treffsjanse(mann.våpen || mann.rolle, d, f) > 0)) continue;   // ingen når fram
          // ammunisjonen trekkes i en krok (Forsyning.skyt) – blir det ikke noe skudd (f.eks. «Ild: bare svar» uten å være beskutt), legges den tilbake
          const ammo0 = a.ammo, ildf = kroker.ild.reduce((v, h) => v * h(a, b), 1); if (ildf <= 0) { a.ammo = ammo0; continue; }   // f.eks. tom for ammunisjon (S4)
          let treff = T.ildrunde(a.menn, d, f, rng);
          if (ildf < 1) { let t = 0; for (let i = 0; i < treff; i++) if (rng() < ildf) t++; treff = t; }
          // over 1 (bonus, f.eks. bakgrunnen «soldat» i K1): hvert treff kan gi ett til
          else if (ildf > 1) { let t = treff; for (let i = 0; i < treff; i++) if (rng() < ildf - 1) t++; treff = t; }
          // KROKER.salve (R18-C, spill/bakkekamp-visning.js): etter salven – granater på kort hold gir ekstra treff, maskingevær holder b nede.
          // Krokene bruker rng bare når de faktisk gjør noe, så en kamp uten granater er nøyaktig som før.
          if (kroker.salve) for (const h of kroker.salve) treff += h(a, b, d, f, rng, m.hentTid()) || 0;
          skudd(a, b); nå.add(b);
          if (!a.skyterPå.has(b)) { if (a.side === SP) logg(a.navn + ' skyter mot ' + (m.synlig(b) ? b.navn : 'fienden') + ' (' + Math.round(d) + ' m).'); else if (m.synlig(a)) logg(a.navn + ' åpner ild mot ' + b.navn + '.'); }
          if (!treff) continue;
          for (const [mann, hva] of T.fordelTreff(b.menn, treff, rng)) if (b.side === SP) { if (m.treffMelding) m.treffMelding(mann, b, hva); else logg(mann.navn + ' (' + b.navn + ') er ' + hva + '.'); }
          if (b.side !== SP && m.synlig(b)) logg(b.navn + ': ' + treff + ' treff.');
          if (b.menn[b.leder].hp < 1) { const ny = b.menn.findIndex(mann => mann.hp >= 1); if (ny >= 0) { b.leder = ny; if (b.side === SP) logg(b.menn[ny].navn + ' tar over som lagfører i ' + b.navn + '.'); } }
          if (T.slattUt(b.menn) && !b.slattUtMeldt) { b.slattUtMeldt = true;
            logg(b.navn + ' er slått ut av kamp (' + T.uteAvKamp(b.menn) + ' av 12 falt eller såret).');
            if (b.side !== SP) { const ang = Math.atan2(b.y - a.y, b.x - a.x); m.ordre(b, b.x + Math.cos(ang) * 3000, b.y + Math.sin(ang) * 3000, true); } }
        }
        a.skyterPå = nå;   // meldes på nytt bare når kampen tar seg opp igjen
      }
      etterKamp();
    }

    // Fiendens patrulje: stopper og tar kampen når den ser et av spillerens lag innen 900 m, patruljerer igjen etter 30 rolige minutter.
    function patrulje(tid) {
      const fi = m.patruljelag ? m.patruljelag() : null;
      if (!fi || T.slattUt(fi.menn)) return;
      const fiende = m.lag().find(b => b.side === SP && m.levende(b) && Math.hypot(b.x - fi.x, b.y - fi.y) < 900 && m.ser(fi, b.x, b.y));
      if (fiende) { if (fi.sti) { fi.sti = null; fi.siktSkitten = true; } fi.roligTil = tid + 30; }
      else if (!fi.sti && !fi.planlegger && tid > (fi.roligTil || 0)) { S.patruljeNr = (S.patruljeNr + 1) % m.patruljeAntall; const pm = m.patruljeMål(fi, S.patruljeNr); if (pm) m.ordre(fi, pm[0], pm[1], true); }
    }

    // Marsjen: hvert lag med en rute (s.sti, s.steg = timer per stykke) går dt spillminutter langs den.
    function marsj(dt) {
      const kroker = m.kroker, TIME = m.TIME;
      for (const s of m.lag()) {
        if (!s.sti) continue;
        // KROKER.fart (spill/formasjon-visning.js, spill/krig-visning.js): faktor på marsjfarten per lag
        let igjen = dt / TIME * (kroker.fart ? kroker.fart.reduce((v, f) => v * f(s), 1) : 1); s.timerIgjen -= igjen;
        while (igjen > 0 && s.seg < s.sti.length - 1) {
          const [ax, ay] = s.sti[s.seg], [bx, by] = s.sti[s.seg + 1], t = s.steg[s.seg] || 1e-9, rest = (1 - s.prog) * t;
          s.retning = Math.atan2(by - ay, bx - ax);
          if (igjen >= rest) { igjen -= rest; s.seg++; s.prog = 0; s.x = bx; s.y = by; }
          else { s.prog += igjen / t; igjen = 0; s.x = ax + (bx - ax) * s.prog; s.y = ay + (by - ay) * s.prog; }
        }
        // (ut8-kr-krig, Ingrid 28. nov: «Vaktlaget er framme» etter at laget var slått ut) et lag uten kampklare menn melder ikke at det er framme
        if (s.seg >= s.sti.length - 1) { s.sti = null; s.siktSkitten = true; if (s.side === SP && (!Array.isArray(s.menn) || s.menn.some(q => q.hp >= 1))) logg(s.navn + ' er framme.'); framme(s); }
        flyttet();
      }
    }

    // Ett steg på dt spillminutter (samme rekkefølge som sim() i index.html hadde).
    function steg(dt) {
      for (const f of m.kroker.sim) f(dt);
      const før = m.hentTid(), tid = før + dt; m.settTid(tid);
      if (Math.floor(tid / T.KAMPRUNDE_MIN) !== Math.floor(før / T.KAMPRUNDE_MIN)) kamprunde();   // kamprunde hvert KAMPRUNDE_MIN spillminutt
      patrulje(tid);
      marsj(dt);
    }

    return { steg, kamprunde, patrulje, marsj, tilstand: S };
  }

  const api = { lag, patruljeMål };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Simulering = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
