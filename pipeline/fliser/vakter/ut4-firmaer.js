// Vakt for pakka «ut4-firmaer» (fase Ø5, 28. nov; docs/natt/ut4-firmaer.md): firmaene og samarbeidet.
// 1) HOLDNING: en levert kontrakt fra Storlia Tømmer telles én gang og løfter holdningen;
// 2) FAST KUNDE: kommandoen firmaSamarbeid gjør Storlia til fast kunde, og morgenens tilbud kommer fra dem (rivalene tar det ikke, betaling × 1,15);
// 3) VÅPENHVILE: med Ravnsund innen 10 km av leiren er det ingen ild mellom et rødt og et blått lag i området (KROKER.ild = 0), AI-en ser
//    fred der (AI.hvileVed), og Ravnsund går ikke mot leiren (Fraksjoner.velg med vernet); utenfor området gjelder den ikke;
// 4) ALLIANSE: et grønt lag ingen av dere ser, blir synlig når dere er alliert med Mosevakt (delt etterretning);
// 5) HØVLERIET: låses opp av Storlia (holdning og leveranser), tas i bruk på et sagbruk, og sagbruket gir 1,4 × planker.
// Setter alt tilbake: firmaene, selskapet, kassa, lagene, leirens bygg og lagringen.
module.exports = {
  navn: 'ut4-firmaer',
  kjør: async (pg, profil) => pg.evaluate(async () => {
    const feil = [], d = {}, krev = (b, t) => { if (!b) feil.push(t); };
    const Fi = window.Firma, FS = window.FirmaSpill, SS = window.SelskapSpill, SK = window.Selskap, OS = window.OppstartSpill, LS = window.LeirSpill;
    if (!Fi || !FS || !SS || !SK || !OS || !LS || !window.KOMMANDO) return { ok: false, tekst: 'Firma, FirmaSpill, SelskapSpill, Selskap, OppstartSpill, LeirSpill eller KOMMANDO mangler', data: {} };
    FS.start(); const S = SS.tilstand(), L = LS.tilstand(), F0 = FS.tilstand(); if (!S || !L || !FS.klar()) return { ok: false, tekst: 'selskapet, leiren eller firmaene er ikke startet', data: {} };
    const penger = () => OS.tilstand().penger, settPenger = v => { const p = penger(); if (p > v) OS.betal(p - v); else if (p < v) OS.gi(v - p); };
    const før = { penger: penger(), S: SK.tilJSON(S), F: Fi.tilJSON(F0), enh: ENHETER.slice(), bygg: L.bygg.slice(), aiPå: window.AI ? AI.på : null,
      lagring: Object.keys(localStorage).filter(n => /^riksbrudd-(selskap|firma|k2)/.test(n)).map(n => [n, localStorage.getItem(n)]), logg: typeof loggLinjer !== 'undefined' ? loggLinjer.slice() : null };
    const leir = OS.tilstand().leir;
    try {
      OS.gi(50e6); const F = FS.tilstand(), st = Fi.finn(F, 'Storlia Tømmer');
      krev(F.firmaer.length >= 7 && F.firmaer.every(f => f.hjem), 'firmaene mangler hjemsted');
      // ---------- 1) holdningen ----------
      const h0 = st.holdning, k = { id: 'vakt-ut4-k', type: 'hold', status: 'levert', giver: { slag: 'firma', navn: 'Storlia Tømmer' }, betaling: 1e6 };
      S.sider.blå.ferdige.unshift(k); FS.telKontrakter(); FS.telKontrakter();
      d.holdning = [h0, st.holdning]; krev(st.holdning === h0 + Fi.REGLER.holdning.levert && st.levert === 1, `holdningen steg ikke ved levering (${h0} -> ${st.holdning})`);
      // ---------- 2) fast kunde ----------
      st.holdning = 60; st.levert = 3;
      const r = KOMMANDO({ type: 'firmaSamarbeid', firma: 'Storlia Tømmer', slag: 'fast' }); krev(r.ok && st.fast, 'fast kunde ble ikke inngått: ' + (r.feil || ''));
      const før2 = S.tilbud.length, tb = FS.morgen(true), kt = tb.find(q => q.giver.navn === 'Storlia Tømmer');
      d.fast = kt ? { tittel: kt.tittel, kr: kt.betaling } : null;
      krev(kt && kt.fast && kt.fastKunde === 'Storlia Tømmer' && S.tilbud.includes(kt) && S.tilbud.length === før2 + tb.length, 'fast kunde ga ikke et tilbud fra Storlia');
      const br = Fi.finn(F, 'Brattli Mineral'); br.holdning = 60; br.levert = 2; KOMMANDO({ type: 'firmaSamarbeid', firma: 'Brattli Mineral', slag: 'fast' });
      const kb = FS.fastTilbud(br); krev(kb && kb.giver.navn === 'Brattli Mineral' && kb.fast, 'fast kunde uten varer (Brattli) ga ikke et vanlig tilbud');
      // ---------- 3) våpenhvile ----------
      const rød = nyttLag('Vakt ut4 rød', leir.x + 1500, leir.y, 'rød'), blå = nyttLag('Vakt ut4 blå', leir.x + 1300, leir.y, 'blå'); ENHETER.push(rød, blå);
      const ild = (a, b) => KROKER.ild.reduce((p, f) => { try { const v = f(a, b); return p * (Number.isFinite(v) ? v : 1); } catch (e) { return p; } }, 1);
      const utenIld = ild(rød, blå);
      const rp = KOMMANDO({ type: 'paktInngå', pakt: 'hvile', side: 'rød', r: 10000, døgn: 7 }); krev(rp.ok, 'våpenhvilen ble ikke inngått: ' + (rp.feil || ''));
      d.ild = [utenIld, ild(rød, blå), ild(blå, rød)];
      krev(utenIld > 0 && ild(rød, blå) === 0 && ild(blå, rød) === 0, 'våpenhvilen stoppet ikke ilden i området: ' + d.ild.join(' / '));
      krev(window.AI && AI.pakter === F.pakter && AI.hvileVed('rød', 'blå', leir.x + 3000, leir.y) && !AI.hvileVed('rød', 'blå', leir.x + 30000, leir.y) && !AI.hvile('rød', 'blå'), 'AI-en ser ikke våpenhvilen i området (og bare der)');
      const fjern = { x: leir.x + 30000, y: leir.y }; rød.x = fjern.x; blå.x = fjern.x - 200;
      krev(ild(rød, blå) > 0, 'våpenhvilen gjaldt også utenfor området'); rød.x = leir.x + 1500; blå.x = leir.x + 1300;
      const vern = (x, y) => AI.hvileVed('rød', 'blå', x, y);
      const v = Fraksjoner.velg(rød, { side: 'rød', byer: [], fiender: [], venner: [rød], hjem: [leir.x + 20000, leir.y], vern, leir: { x: leir.x, y: leir.y, navn: 'leiren din' } });
      const v0 = Fraksjoner.velg(rød, { side: 'rød', byer: [], fiender: [], venner: [rød], hjem: [leir.x + 20000, leir.y], leir: { x: leir.x, y: leir.y, navn: 'leiren din' } });
      d.ai = [v0.hva, v.hva]; krev(v0.hva === 'leir' && v.hva !== 'leir', 'Ravnsund gikk mot leiren under våpenhvilen: ' + d.ai.join(' / '));
      // ---------- 4) allianse: delt etterretning ----------
      const grønn = nyttLag('Vakt ut4 grønn', leir.x + 40000, leir.y + 40000, 'grønn'); ENHETER.push(grønn);
      const sånFør = synlig(grønn);
      // våpenhvilen med Ravnsund hindrer alliansen med Mosevakt (begge sider) – den tas bort først
      F.pakter.length = 0; const ra = KOMMANDO({ type: 'paktInngå', pakt: 'allianse', side: 'grønn', døgn: 7 });
      d.allianse = [sånFør, synlig(grønn), ra.ok];
      krev(ra.ok && !sånFør && synlig(grønn), 'alliansen viser ikke Mosevakts lag: ' + JSON.stringify(d.allianse) + ' ' + (ra.feil || ''));
      krev(ild(grønn, blå) === 0 && AI.hvile('grønn', 'blå'), 'alliansen ga ikke fred overalt');
      // ---------- 5) høvleriet ----------
      const sag = { id: 987654, nr: 987654, type: 'sagbruk', hp: 1, igjen: 0, nivå: 1, x: leir.x + 50, y: leir.y + 50, r: 0 }; L.bygg.push(sag);
      st.holdning = 70; st.levert = 4; FS.tekno();
      krev(F.tekno.høvleri, 'Storlia låste ikke opp høvleriet');
      const p0 = penger(), rt = KOMMANDO({ type: 'firmaTekno', id: 'høvleri' });
      krev(rt.ok && sag.høvleri && p0 - penger() === Fi.REGLER.TEKNO.høvleri.pris, 'høvleriet ble ikke tatt i bruk: ' + (rt.feil || ''));
      const ut = window.Produksjon && Produksjon.utFor ? Produksjon.utFor(sag) : {}; d.høvleri = ut.tre;
      krev(Math.abs(ut.tre / Produksjon.REGLER.maskiner.sagbruk.ut.tre - 1.4) < .01, 'sagbruket med høvleri gir ikke 1,4 × planker');
      // panelet: fanen Partnere tegnes og har rivalene og firmaene
      const html = FS.fane(); krev(/Ravnsund/.test(html) && /Mosevakt/.test(html) && /Storlia Tømmer/.test(html) && /Høvleri/.test(html), 'fanen Partnere mangler innhold');
    } catch (e) { feil.push('unntak: ' + e.message); }
    finally {
      for (const [n, vv] of før.lagring) localStorage.setItem(n, vv);
      ENHETER.length = 0; ENHETER.push(...før.enh); L.bygg.length = 0; L.bygg.push(...før.bygg);
      SS.sett(før.S); FS.sett(før.F); FS.tekno(); settPenger(før.penger); if (window.AI && før.aiPå !== null) AI.pakter = FS.tilstand().pakter;
      if (før.logg && typeof loggLinjer !== 'undefined') { loggLinjer.length = 0; loggLinjer.push(...før.logg); }
      for (const [n, vv] of før.lagring) localStorage.setItem(n, vv);
      skitten = true;
    }
    return { ok: !feil.length, tekst: feil.length ? feil.join('; ') : `holdning ${d.holdning.join('->')}, fast kunde «${d.fast && d.fast.tittel}», ild i våpenhvilen ${d.ild.join('/')}, AI ${d.ai.join('->')}, alliansen viser lagene, høvleri ${d.høvleri.toFixed(2)} m³/t`, data: d };
  }),
};
