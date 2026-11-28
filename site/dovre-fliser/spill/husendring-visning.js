/* HUSENDRING – visningen (fase B3, 28. nov). Reglene: spill/husendring.js. Modellen: spill/bygning.js. Plantegningen: spill/plantegning-visning.js.
 * - Trykk på en vegg eller et rom i plantegningen (når huset er stort nok på skjermen) -> raden i etasjevelgeren #plan2d viser hva du kan
 *   gjøre, og hva det gir, koster og tar: rive veggen, lage dør/vindu der du trykket, sette inn bjelke, rive gulvet/taket, sette inn søyle.
 *   Uten noe valgt: «Riv loftet/2. etasje» (øverste etasje som står) og «Riv hele huset». Åpninger (vindu/dør) får også «Tett».
 * - Raser noe, sier byggelaget fra først: «Dette er en bærende vegg. Uten bjelke raser dekket over (ca. 24 m²).» – «Gjør det likevel» /
 *   «Sett inn bjelke og riv». Gjør du det likevel, raser delene (vises i plantegningen og i 3D), raset gir litt skrot, og en av dem på
 *   jobben kan bli skadet.
 * - ARBEIDET er jobber for folk på «riving» (spill/ressurser.js: startDel – samme kø, haug ved huset og frakt som «Riv hus»). Bjelker og
 *   søyler tar stål fra lageret når de bestilles. Tetting gjør du selv (karakteren går dit, som med barrikader).
 * - «Riv hele huset» bruker riving av hele hus i ressurser.js – nå etasje for etasje ovenfra (etasjene forsvinner fra plantegningen etter
 *   framdriften) og kan stoppes: da står resten, og en ny riving gir bare det som står igjen.
 * - 3D: hus med endringer får mørke hull i fasaden der ytterveggen er revet eller har fått en ny åpning, og steinhauger/rester der noe er
 *   revet eller har rast (ett instansnett for hullene, ett for haugene). Selve husets kropp (hus3d) får ikke ekte hull.
 * - Alt går gjennom kommandoen «husEndre» (plantegning-visning.js registrerer den; sjekk/utfør kommer hit når k.he er satt).
 *   Endringene lagres i endringsloggen «riksbrudd-bygninger» (bare endringene, per leir) – også de som er bestilt (i «riksbrudd-ressurser»).
 * API: window.HusEndring (eier, sjekk, utfør, beskriv, rad, knapper, rivInfo, handlinger, velg, S, hull3d, sjekk3d).
 */
(function () {
  'use strict';
  const HR = window.HusEndringRegler, PT = window.Plantegning; if (!HR || !PT || typeof document === 'undefined') return;
  const P2 = () => window.Plantegning2D || null, BG = () => window.Bygning || null, RS = () => window.Ressurser || null;
  const S = { valgt: null, varsel: null };
  const tegnPå = () => { if (typeof skitten !== 'undefined') skitten = true; };
  const tall = v => String(Math.round(v * 100) / 100).replace('.', ',');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const leirXY = () => { const s = window.OppstartSpill && OppstartSpill.tilstand && OppstartSpill.tilstand(); return s && s.leir ? { x: s.leir.x, y: s.leir.y } : null; };
  const leiren = () => (window.LeirSpill && LeirSpill.tilstand ? LeirSpill.tilstand() : null);
  const R = () => (window.RessursSpill ? RessursSpill.tilstand() : null);
  const folk = () => (window.Folk && Folk.arbeidere ? Folk.arbeidere('riving') : 0);
  const varVis = () => { const p = P2(); if (p && p.visVelger) p.visVelger(); };
  const etasjeFor = h => { const p = P2(); const n = p ? p.S.etasje : 1; return h.m && h.m.etasjer.some(e => e.n === n) ? n : 1; };
  const finnEt = (m, n) => m.etasjer.find(e => e.n === n) || null;
  // materialer leiren kan ta imot (leiren har ikke glass ennå – det blir igjen i huset)
  const iLeiren = M => { const u = {}; for (const k of ['tre', 'betong', 'stål']) if ((M[k] || 0) > 0) u[k] = M[k]; return u; };

  // ---------- huset og modellen ----------
  // huset fra hurtiglageret i plantegningen, ellers laget på nytt fra det endringsloggen husker om det (kart)
  function husFor(i) {
    const p = P2(); if (!p) return null; let h = p.hus(i);
    if (!h) { const k = p.logg().kart && p.logg().kart[i]; if (!k) return null; h = p.nyttHus(k.P, k.e, k.tett); }
    if (!h.m) p.modell(i); return h.m ? h : null;
  }
  // husets egne endringer: det kartet vet om huset lagres sammen med endringene
  function føre(h, endringer) {
    const p = P2(), L = p.logg();
    for (const d of endringer) PT.leggTil(L, h.i, d);
    PT.husKart(L, h.i, h.e, h.tett, h.Pv); p.oppdater(h); p.lagre(); tegnPå();
    try { if (p.planker3d) p.planker3d(); } catch (e) { /* uten 3D */ }
    try { hull3d(); } catch (e) { console.warn('husendring i 3D:', e); }
  }
  // husarbeid som er bestilt og ikke ferdig, for et hus
  const jobberFor = i => { const r = R(); return r ? r.jobber.filter(j => j.type === 'riving' && j.hus && j.hus.i === i && !j.stoppet && j.gjort < j.arbeid) : []; };
  const bestilt = (i, n, del, id) => jobberFor(i).find(j => j.endringer && j.endringer.some(d => (d.e === n || d.e === null) && d.del === del && d.id === id)) || null;

  // valget som handlingene regnes for (fra kommandoen eller panelet)
  const valgAv = k => (k.del === 'vegg' ? { del: 'vegg', id: k.id, t: k.t } : k.del === 'rom' ? { del: 'rom', id: k.id, x: k.x, y: k.y } : { del: 'etasje' });
  function handlingFor(h, k) { return HR.handlinger(h.m, k.e, valgAv(k)).find(a => a.k === k.he) || null; }

  // ---------- «Riv hele huset»: etasje for etasje ovenfra ----------
  // Det ressurser.js trenger for å rive huset: andelen som står igjen og etasjene ovenfra (rivSteg følger dem etter framdriften)
  function rivInfo(hus) {
    if (!hus || !hus.P) return hus; const p = P2(); if (!p) return hus;
    let h = p.hus(hus.i);
    if (!h) { let P = hus.P.map(q => [q[0], q[1]]); if (PT.arealS(P) < 0) P.reverse(); const k = p.logg().kart && p.logg().kart[hus.i];
      h = k ? p.nyttHus(k.P, k.e, k.tett) : p.nyttHus(P, { i: hus.i, t: hus.t, h: hus.h }, 0); }
    const m = p.modell(hus.i); if (!m) return hus;
    PT.husKart(p.logg(), h.i, h.e, h.tett, h.Pv); p.lagre();
    return Object.assign({}, hus, { andel: HR.andelIgjen(m), etasjer: HR.etasjerOvenfra(m) });
  }

  // ---------- kommandoen «husEndre» (k.he = handlingen) ----------
  const eier = k => !!k && typeof k.he === 'string';
  function sjekk(k) {
    if (!Number.isFinite(k.hus) || !Number.isFinite(k.e)) return 'Ugyldig endring.';
    const h = husFor(k.hus); if (!h) return 'Huset er ikke lastet.';
    const lx = leirXY(), L = leiren(); if (!lx || !L || !L.lager) return 'Ingen leir ennå.';
    if (k.he === 'hus') {
      if (!RS() || !R()) return 'Riving mangler.';
      if (R().jobber.some(j => j.type === 'riving' && !j.endringer && !j.stoppet && j.hus.i === h.i)) return 'Huset rives allerede.';
      const ut = RS().husUtbytte(h.e.t, RS().areal(h.Pv), h.e.h || 6); if (ut.feil) return ut.feil;
      const c = PT.ramme(h.Pv); if (Math.hypot(c[0] - lx.x, c[1] - lx.y) > RS().REGLER.maksAvstand) return `For langt fra leiren (høyst ${RS().REGLER.maksAvstand / 1000} km).`;
      return null;
    }
    if (k.he === 'tett' || k.he === 'utett') {
      const o = PT.figur(h.m, k.e).åpninger.find(q => q.id === k.id); if (!o || o.tilstand === 'revet') return 'Åpningen finnes ikke.';
      if (k.he === 'tett') { if (o.sperre) return 'Den er alt sperret.'; const t = HR.tettTre(o); if ((L.lager.tre || 0) < t) return `Ikke nok tre i lageret (trenger ${tall(t)} m³ planker).`; }
      else if (o.sperre !== 'tettet') return 'Den er ikke tettet.';
      return null;
    }
    if (!RS() || !R()) return 'Riving mangler.';
    const a = handlingFor(h, k); if (!a) return 'Det kan ikke gjøres her.'; if (!a.ok) return a.feil || 'Det går ikke.';
    if (a.raser && !k.likevel) return 'Byggelaget sier fra: ' + (a.advarsel || HR.rasTekst(h.m, a.ras, false));
    const del = a.endringer[a.endringer.length - 1]; if (bestilt(h.i, del.e, del.del, del.id)) return 'Det er alt bestilt.';
    if (a.stål > (L.lager.stål || 0) + 1e-9) return `Ikke nok stål i lageret (trenger ${tall(a.stål)} t til ${a.endringer.some(d => d.del === 'søyle') ? 'søylen' : 'bjelken'}).`;
    const c = PT.ramme(h.Pv); if (Math.hypot(c[0] - lx.x, c[1] - lx.y) > RS().REGLER.maksAvstand) return `For langt fra leiren (høyst ${RS().REGLER.maksAvstand / 1000} km).`;
    return null;
  }
  function utfør(k) {
    const h = husFor(k.hus), L = leiren(), lx = leirXY(), ingen = folk() ? '' : ' – men ingen har oppgaven «riving» (sett noen i Folk)';
    if (k.he === 'hus') {
      const r = RS().startRiving(R(), rivInfo({ i: h.i, P: h.Pv, t: h.e.t, h: h.e.h || 6 }), lx); if (r.feil) return { feil: r.feil };
      RessursSpill.lagre(); tegnPå();
      return { ok: true, tekst: `Huset rives etasje for etasje ovenfra: gir ${HR.matTekst(r.jobb.mat) || 'lite'}${ingen}. Du kan stoppe når du har nok.`, jobb: r.jobb.id };
    }
    if (k.he === 'tett' || k.he === 'utett') {
      const o = PT.figur(h.m, k.e).åpninger.find(q => q.id === k.id), t = HR.tettTre(o);
      if (k.he === 'tett') { L.lager.tre = Math.round(((L.lager.tre || 0) - t) * 100) / 100; føre(h, [{ e: k.e, del: 'åpning', id: k.id, gjør: 'tett' }]); return { ok: true, tekst: `Åpningen er tettet med bord (${tall(t)} m³ tre fra lageret).` }; }
      const igjen = Math.round(t * .5 * 100) / 100; if (window.Leir && Leir.leggInn) Leir.leggInn(L, 'tre', igjen); else L.lager.tre = (L.lager.tre || 0) + igjen;
      føre(h, [{ e: k.e, del: 'åpning', id: k.id, gjør: 'åpne' }]); return { ok: true, tekst: `Bordene er tatt ned (${tall(igjen)} m³ tre tilbake).` };
    }
    const a = handlingFor(h, k), navn = HR.jobbNavn(a.k, k.del === 'vegg' ? finnEt(h.m, k.e).vegger[k.id] : null);
    if (a.stål > 0) L.lager.stål = Math.round(((L.lager.stål || 0) - a.stål) * 1000) / 1000;
    const r = RS().startDel(R(), { hus: { i: h.i, P: h.Pv, t: h.e.t, h: h.e.h || 6 }, endringer: a.endringer, mat: iLeiren(a.mat), timer: a.timer, navn }, lx);
    if (r.feil) { if (a.stål > 0) L.lager.stål = Math.round((L.lager.stål + a.stål) * 1000) / 1000; return { feil: r.feil }; }
    if (a.raser) r.jobb.likevel = true; r.jobb.stål = a.stål;
    PT.husKart(P2().logg(), h.i, h.e, h.tett, h.Pv); P2().lagre(); RessursSpill.lagre(); S.valgt = null; S.varsel = null; tegnPå();
    const n = folk(), tid = n ? ` Tar ca. ${HR.tidTekst(a.timer / Math.max(.1, n * (window.Folk && Folk.tempo ? Folk.tempo('riving') : 1)))} med ${n} på riving.` : '';
    return { ok: true, tekst: `Husarbeid bestilt (${navn}): ${HR.matTekst(iLeiren(a.mat)) ? 'gir ' + HR.matTekst(iLeiren(a.mat)) : 'gir ingen materialer'}${a.stål ? `, bruker ${tall(a.stål)} t stål` : ''}.${tid}${ingen}`, jobb: r.jobb.id };
  }
  const beskriv = k => ({ hus: 'river et hus', tett: 'tetter en åpning', utett: 'tar ned bord' }[k.he] || 'bestiller husarbeid');
  // send kommandoen (KOMMANDO når den finnes)
  function send(k) { const p = P2(); if (!p) return { ok: false }; return p.endre(Object.assign({ hus: k.hus, e: k.e, del: k.del || 'vegg', id: k.id === undefined ? 0 : k.id, gjør: k.gjør || 'riv' }, k)); }

  // ---------- panelet (raden i etasjevelgeren) ----------
  const VEGG = { ytter: 'yttervegg', skille: 'skillevegg', gavl: 'gavlvegg' }, STOFF = { tre: 'tre', mur: 'mur', betong: 'betong', blikk: 'blikk', glass: 'glass', stål: 'stål' };
  const kostTekst = a => [HR.matTekst(iLeiren(a.mat)) ? 'gir ' + HR.matTekst(iLeiren(a.mat)) : '', a.stål ? `${tall(a.stål)} t stål` : '', a.timer ? HR.tidTekst(a.timer) : ''].filter(Boolean).join(' · ');
  const knapp = (he, tekst, eg) => `<button type="button" data-he="${he}"${eg || ''}>${tekst}</button>`;
  function rad(h, n, et) {
    if (!h || !h.m || !et) return '';
    const v = S.valgt && S.valgt.i === h.i && S.valgt.e === n ? S.valgt : null;
    if (S.varsel && v) {
      const a = S.varsel;
      return `<div class="rad valg he-varsel"><span class="he-adv" role="alert">${esc(a.tekst)}</span>` + knapp('likevel', 'Gjør det likevel', ' id="helikevel"')
        + (a.alternativ ? knapp(a.alternativ, a.altTekst || 'Sett inn bjelke', ' id="hebjelke"') : '') + knapp('avbryt', 'Avbryt') + '</div>';
    }
    if (v) {
      const e = finnEt(h.m, n); let tittel = '';
      if (v.del === 'vegg') { const w = e.vegger[v.id]; if (!w || !HR.står(w)) { S.valgt = null; return rad(h, n, et); }
        const vn = VEGG[w.type] || 'vegg', Lm = tall(Math.round(Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]) * 10) / 10);
        tittel = `${w.bærende ? 'Bærende ' + vn : vn[0].toUpperCase() + vn.slice(1)} · ${STOFF[w.stoff] || w.stoff} · ${Lm} m`; }
      else if (v.del === 'rom') { const r = e.rom[v.id]; tittel = `${PT.romNavn(r && r.rolle)} · ${tall(Math.round(r ? r.areal : 0))} m²`; }
      else tittel = et.navn;
      const jb = v.del === 'vegg' ? bestilt(h.i, n, 'vegg', v.id) || bestilt(h.i, n, 'bjelke', v.id) || bestilt(h.i, n, 'åpning', v.id) : v.del === 'rom' ? jobberFor(h.i).find(j => j.endringer && j.endringer.some(d => d.e === n && ((d.del === 'søyle' && d.id === v.id) || d.del === 'dekke'))) : null;
      let html = `<div class="rad valg"><span>${esc(tittel)} i ${esc(et.navn.toLowerCase())}</span>`;
      if (jb) html += `<small>Bestilt: ${esc(jb.navn)} – ${Math.round(RS().fram(jb) * 100)} %</small>`;
      const H = HR.handlinger(h.m, n, v);
      for (const a of H) { if (a.k === 'bjelkeRiv') continue; html += knapp(a.k, `${esc(a.tekst)}${a.raser ? ' ⚠' : ''}<small> ${esc(a.ok ? kostTekst(a) : a.feil || '')}</small>`, a.ok ? ` title="${esc(kostTekst(a))}"` : ` disabled title="${esc(a.feil || '')}"`); }
      if (!H.length) html += '<small>Ingenting å gjøre her.</small>';
      return html + knapp('avbryt', 'Avbryt') + '</div>';
    }
    // ingenting valgt: øverste etasje og hele huset
    const liste = HR.etasjerOvenfra(h.m), hel = R() && R().jobber.find(j => j.type === 'riving' && !j.endringer && !j.stoppet && j.hus.i === h.i);
    let html = `<div class="rad"><small>${esc(et.navn)}${et.stengt ? ' (stengt)' : ''} · trykk på en vegg, et rom, et vindu eller en dør</small>`;
    if (hel) html += `<small> · Huset rives: ${Math.round(RS().fram(hel) * 100)} %</small>` + knapp('stopp', 'Stopp rivingen', ' id="hestopp"');
    else {
      if (liste[0] === n && liste.length > 1) { const a = HR.handlinger(h.m, n, { del: 'etasje' })[0]; if (a) html += knapp('etasje', `${esc(a.tekst)}<small> ${esc(kostTekst(a))}</small>`, ' id="heetasje"' + (a.ok ? '' : ' disabled')); }
      html += knapp('hus', 'Riv hele huset', ' id="hehus" title="Etasje for etasje ovenfra – du kan stoppe når du har nok"');
    }
    return html + '</div>';
  }
  function knapper(h, n, o) {
    S.valgt = null; S.varsel = null;
    if (o.tilstand === 'ødelagt') return '';
    if (!o.sperre) return knapp('tett', `Tett (${tall(HR.tettTre(o))} m³ tre)`, ' id="hetett" title="Bord på begge sider – du gjør det selv"');
    if (o.sperre === 'tettet') return knapp('utett', 'Fjern bordene', ' id="heutett"');
    return '';
  }
  const css = document.createElement('style');
  css.textContent = `#plan2d .he-adv{ color:#f0c08a; flex:1 0 100%; margin-bottom:3px; } #plan2d .valg small{ color:var(--ink-dim,#a69b82); }
#plan2d button small{ color:var(--ink-dim,#a69b82); font-size:12px; } #plan2d button:disabled{ opacity:.45; cursor:default; }
#plan2d .he-varsel{ border-top-color:#b5543c; }
@media (max-width:700px){ #plan2d button small{ display:block; font-size:11px; } #plan2d{ max-height:44vh; overflow-y:auto; } }`;
  document.head.appendChild(css);

  // knappene (etasjevelgeren lytter selv først; den tegner raden på nytt etterpå)
  function trykkKnapp(he, h, n) {
    const v = S.valgt;
    if (he === 'avbryt') { S.valgt = null; S.varsel = null; }
    else if (he === 'stopp') { const r = R(), j = r && r.jobber.find(q => q.type === 'riving' && !q.endringer && !q.stoppet && q.hus.i === h.i);
      if (j) { RS().avbryt(r, j.id); RessursSpill.lagre(); if (typeof logg === 'function') logg('Rivingen er stoppet: det som står, blir stående. Det som er revet, fraktes hjem.'); } }
    else if (he === 'hus') { S.valgt = { i: h.i, e: n, del: 'hus' }; S.varsel = { he: 'hus', tekst: 'Hele huset rives etasje for etasje ovenfra av folk på «riving». Du kan stoppe når du har nok.' }; }
    else if (he === 'likevel') { const a = S.varsel; if (a) { S.varsel = null; const k = a.he === 'hus' ? { hus: h.i, e: 1, del: 'hus', he: 'hus' } : Object.assign({}, a.k, { likevel: true }); const r = send(k); if (r && r.ok) S.valgt = null; } }
    else if (he === 'tett' || he === 'utett') { const pv = P2().S.valgt; if (pv) { P2().handling({ hus: pv.i, e: pv.e, del: 'åpning', id: pv.id, gjør: he === 'tett' ? 'tett' : 'åpne', he }); } }
    else {
      const valg = v && v.i === h.i ? v : { i: h.i, e: n, del: 'etasje' };
      const k = { hus: h.i, e: n, del: valg.del, id: valg.id === undefined ? 0 : valg.id, t: valg.t, x: valg.x, y: valg.y, he };
      if (he === 'bjelkeRiv') k.likevel = true;
      const a = handlingFor(h, k);
      if (a && a.raser && !k.likevel) { S.valgt = valg; S.varsel = { he, k, tekst: a.advarsel || HR.rasTekst(h.m, a.ras, false), alternativ: HR.handlinger(h.m, n, valgAv(k)).some(q => q.k === 'bjelkeRiv' && q.ok) && he === 'riv' ? 'bjelkeRiv' : null, altTekst: 'Sett inn bjelke' }; }
      else { const r = send(k); if (r && r.ok) { S.valgt = null; S.varsel = null; } }
    }
    varVis(); tegnPå();
  }
  function hovedHus() { const p = P2(); if (!p) return null; const l = p.S.nær.filter(h => h.klar && h.m); if (p.S.fokus) { const f = l.find(h => h.i === p.S.fokus.i); if (f) return f; }
    return l.sort((a, b) => Math.hypot((a.bb[0] + a.bb[2]) / 2 - kam.x, (a.bb[1] + a.bb[3]) / 2 - kam.y) - Math.hypot((b.bb[0] + b.bb[2]) / 2 - kam.x, (b.bb[1] + b.bb[3]) / 2 - kam.y))[0] || null; }
  function kobleKnapper() {
    const v = document.getElementById('plan2d'); if (!v) return setTimeout(kobleKnapper, 500);
    v.addEventListener('click', ev => { const b = ev.target.closest('button[data-he]'); if (!b || b.disabled) return; const h = (S.valgt && husFor(S.valgt.i)) || hovedHus(); if (!h) return; trykkKnapp(b.dataset.he, h, S.valgt ? S.valgt.e : etasjeFor(h)); });
  }
  kobleKnapper();

  // ---------- trykk på en vegg eller et rom ----------
  if (typeof KROKER !== 'undefined' && KROKER.trykk) KROKER.trykk.push((X, Y) => {
    const p = P2(); if (!p || !p.aktiv() || !BG()) return false;
    for (const h of p.S.nær) {
      if (!h.klar || !h.m) continue; if (X < h.bb[0] - 2 || X > h.bb[2] + 2 || Y < h.bb[1] - 2 || Y > h.bb[3] + 2) continue;
      if (Math.max(h.bb[2] - h.bb[0], h.bb[3] - h.bb[1]) / kam.m < PT.REGLER.detaljPunkter * .8) continue;
      const n = etasjeFor(h), x = X - h.o[0], y = Y - h.o[1];
      const w = HR.veggVed(h.m, n, x, y, Math.min(.8, Math.max(.3, 10 * kam.m)));
      if (w) { S.valgt = { i: h.i, e: n, del: 'vegg', id: w.w.id, t: w.t }; S.varsel = null; p.S.valgt = null; varVis(); tegnPå(); return true; }
      const r = HR.romVed(h.m, n, x, y);
      if (r) { S.valgt = { i: h.i, e: n, del: 'rom', id: r.id, x, y }; S.varsel = null; p.S.valgt = null; varVis(); tegnPå(); return true; }
    }
    if (S.valgt) { S.valgt = null; S.varsel = null; varVis(); tegnPå(); }
    return false;
  });

  // ---------- tegningen oppå plantegningen ----------
  const F = { valgt: '#f0d79a', bestilt: '#e8a25a', hull: 'rgba(181,84,60,.5)', hullKant: '#b5543c', takRast: 'rgba(181,84,60,.25)' };
  function skravur(g, P, X, Y, farge, steg) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const p of P) { const a = X(p), b = Y(p); x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b); }
    g.save(); g.beginPath(); P.forEach((p, k) => (k ? g.lineTo(X(p), Y(p)) : g.moveTo(X(p), Y(p)))); g.closePath(); g.clip();
    g.strokeStyle = farge; g.lineWidth = 1; g.beginPath(); for (let s = x0 - (y1 - y0); s < x1; s += steg) { g.moveTo(s, y1); g.lineTo(s + (y1 - y0), y0); } g.stroke(); g.restore();
  }
  if (typeof KROKER !== 'undefined' && KROKER.tegn) KROKER.tegn.push((g, vx0, vy1) => {
    const p = P2(); if (!p || !p.aktiv()) return; const m = kam.m, sx = x => (x - vx0) / m, sy = y => (vy1 - y) / m;
    for (const h of p.S.nær) {
      if (!h.klar || !h.m) continue; const str = Math.max(h.bb[2] - h.bb[0], h.bb[3] - h.bb[1]) / m; if (str < PT.REGLER.minPunkter * .8) continue;
      const n = etasjeFor(h), e = finnEt(h.m, n), [ox, oy] = h.o, X = q => sx(ox + q[0]), Y = q => sy(oy + q[1]); if (!e) continue;
      g.save();
      // hull i gulvet (dekket i denne etasjen har rast eller er revet) og tak som har rast over øverste etasje
      for (const f of e.dekke.felt) if ((f.tilstand === 'rast' || f.tilstand === 'revet') && e.rom[f.rom]) { const r = e.rom[f.rom]; skravur(g, r.P, X, Y, F.hull, 6);
        g.strokeStyle = F.hullKant; g.setLineDash([4, 3]); g.lineWidth = 1.2; g.beginPath(); r.P.forEach((q, k) => (k ? g.lineTo(X(q), Y(q)) : g.moveTo(X(q), Y(q)))); g.closePath(); g.stroke(); g.setLineDash([]);
        if (str > 110) { let cx = 0, cy = 0; for (const q of r.P) { cx += q[0]; cy += q[1]; } g.fillStyle = '#f0c08a'; g.font = '12px "Cormorant Garamond", Georgia, serif'; g.textAlign = 'center'; g.fillText(f.tilstand === 'rast' ? 'rast' : 'hull i gulvet', X([cx / 4, cy / 4]), Y([cx / 4, cy / 4]) - 14); } }
      const øv = h.m.etasjer.filter(q => q.tilstand !== 'revet').slice(-1)[0];
      if (øv === e) { const A = h.m.akse; for (const f of h.m.tak.felt) if (f.tilstand === 'rast' || f.tilstand === 'revet') {
        const hj = [[f.u0, A.v0], [f.u1, A.v0], [f.u1, A.v1], [f.u0, A.v1]].map(([u, v]) => [u * A.ux + v * A.vx, u * A.uy + v * A.vy]); skravur(g, hj, X, Y, F.takRast, 9); } }
      // bestilt husarbeid: oransje stiplet over delen
      for (const j of jobberFor(h.i)) {
        if (!j.endringer) { g.strokeStyle = F.bestilt; g.setLineDash([8, 5]); g.lineWidth = 2; g.beginPath(); h.m.P.forEach((q, k) => (k ? g.lineTo(X(q), Y(q)) : g.moveTo(X(q), Y(q)))); g.closePath(); g.stroke(); g.setLineDash([]); continue; }
        for (const d of j.endringer) {
          if (d.e !== n && d.e !== null) continue; g.strokeStyle = F.bestilt; g.fillStyle = F.bestilt;
          if (d.del === 'vegg' || d.del === 'bjelke' || d.del === 'åpning') { const w = e.vegger[d.vegg !== undefined ? d.vegg : d.id]; if (!w) continue;
            if (d.del === 'åpning') { const L = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]), ux = (w.b[0] - w.a[0]) / L, uy = (w.b[1] - w.a[1]) / L, a = [w.a[0] + ux * (d.t - d.b / 2), w.a[1] + uy * (d.t - d.b / 2)], b = [w.a[0] + ux * (d.t + d.b / 2), w.a[1] + uy * (d.t + d.b / 2)];
              g.lineWidth = Math.max(4, .35 / m); g.beginPath(); g.moveTo(X(a), Y(a)); g.lineTo(X(b), Y(b)); g.stroke(); }
            else { g.setLineDash(d.del === 'bjelke' ? [3, 3] : [7, 4]); g.lineWidth = Math.max(3, (w.tykk || .15) / m + 2); g.beginPath(); g.moveTo(X(w.a), Y(w.a)); g.lineTo(X(w.b), Y(w.b)); g.stroke(); g.setLineDash([]); } }
          else if (d.del === 'dekke') { const f = e.dekke.felt[d.id], r = f && e.rom[f.rom]; if (r) skravur(g, r.P, X, Y, F.bestilt, 8); }
          else if (d.del === 'søyle') { const s = Math.max(5, .35 / m); g.fillRect(X([d.x, d.y]) - s / 2, Y([d.x, d.y]) - s / 2, s, s); }
        }
      }
      // valgt vegg eller rom
      const v = S.valgt && S.valgt.i === h.i && S.valgt.e === n ? S.valgt : null;
      if (v && v.del === 'vegg' && e.vegger[v.id]) { const w = e.vegger[v.id]; g.strokeStyle = F.valgt; g.shadowColor = '#f0d79a'; g.shadowBlur = 8; g.lineWidth = Math.max(5, (w.tykk || .15) / m + 4); g.globalAlpha = .85; g.beginPath(); g.moveTo(X(w.a), Y(w.a)); g.lineTo(X(w.b), Y(w.b)); g.stroke(); g.globalAlpha = 1; }
      if (v && v.del === 'rom' && e.rom[v.id]) { const r = e.rom[v.id]; g.strokeStyle = F.valgt; g.lineWidth = 2; g.setLineDash([6, 4]); g.beginPath(); r.P.forEach((q, k) => (k ? g.lineTo(X(q), Y(q)) : g.moveTo(X(q), Y(q)))); g.closePath(); g.stroke(); g.setLineDash([]); }
      g.restore();
    }
  });

  // ---------- tiden: ferdig husarbeid, og «Riv hele huset» etasje for etasje ----------
  let akk = 0;
  if (typeof KROKER !== 'undefined' && KROKER.sim) KROKER.sim.push(dt => {
    const r = R(), p = P2(); if (!r || !p || !BG()) return; akk += dt; if (akk < .25 && !(r.husFerdig && r.husFerdig.length)) return; akk = 0;
    let endret = false;
    while (r.husFerdig && r.husFerdig.length) {
      const q = r.husFerdig.shift(); endret = true; const h = husFor(q.hus); if (!h) continue;
      const pr = HR.prøv(h.m, q.endringer); føre(h, q.endringer);
      let tekst = `Husarbeid ferdig: ${q.navn || 'del av huset'}.`;
      if (pr.raser) {
        tekst = `Raset! ${q.navn ? q.navn[0].toUpperCase() + q.navn.slice(1) : 'Husarbeidet'}: ${pr.rasDel.dekke ? `dekket (ca. ${pr.rasDel.dekke} m²)` : ''}${pr.rasDel.dekke && pr.rasDel.tak ? ' og ' : ''}${pr.rasDel.tak ? `taket (ca. ${pr.rasDel.tak} m²)` : ''}${!pr.rasDel.sum ? 'vegger' : ''} falt ned.`;
        const F0 = window.FolkSpill && FolkSpill.tilstand && FolkSpill.tilstand(), på = F0 ? F0.personer.filter(x => x.oppgave === 'riving' && x.helse > .05 && !x.borte) : [];
        const s = HR.skade(pr.rasM2, på.length, q.jobb || 1);
        if (s) { const x = på[s.hvem]; x.helse = Math.max(.05, Math.round((x.helse - s.tap) * 100) / 100); tekst += ` ${x.navn} sto under og ble skadet (helse ${Math.round(x.helse * 100)} %).`; }
      }
      if (typeof logg === 'function') logg(tekst);
    }
    // hele huset: etasjene forsvinner ovenfra etter framdriften
    for (const j of r.jobber) {
      if (j.type !== 'riving' || j.endringer || !Array.isArray(j.etasjer) || j.etasjer.length < 2) continue;
      const k = HR.rivSteg(j.etasjer, RS().fram(j)); if (!k) continue; const h = husFor(j.hus.i); if (!h) continue;
      const nye = []; for (const n of j.etasjer.slice(0, k)) { const e = finnEt(h.m, n); if (e && e.tilstand !== 'revet') nye.push({ e: n, del: 'etasje', gjør: 'riv' }); }
      if (nye.length) { const navn = nye.map(d => (finnEt(h.m, d.e).loft ? 'loftet' : finnEt(h.m, d.e).navn.toLowerCase())).join(' og '); føre(h, nye); endret = true;
        if (typeof logg === 'function') logg(`Rivingen: ${navn} er revet (${Math.round(RS().fram(j) * 100)} %).`); }
    }
    if (endret) { RessursSpill.lagre(); varVis(); }
  });

  // ---------- 3D: hull i fasaden og rester der noe er revet eller har rast ----------
  // Bare hus i utsnittet med slike endringer (som plankene i plantegning-visning.js). Ett instansnett for hullene, ett for haugene.
  let HULL = null, HAUG = null;
  function fjern3d() { for (const q of [HULL, HAUG]) if (q) { if (q.parent) q.parent.remove(q); q.geometry.dispose(); q.material.dispose(); } HULL = HAUG = null; }
  const strukturell = d => !(d.del === 'åpning' && (d.gjør === 'barrikader' || d.gjør === 'åpne' || d.gjør === 'tett'));
  const hash = (a, b) => { let n = (a * 73856093) ^ (b * 19349663); n = Math.imul(n ^ (n >>> 13), 0x5bd1e995); n ^= n >>> 15; return (n >>> 0) / 4294967296; };
  function hull3d(u0, R0) {
    const R3x = R0 || (typeof R3 !== 'undefined' ? R3 : null), u = u0 || (R3x && R3x.ut); fjern3d();
    const p = P2(); if (!R3x || !R3x.scene || !u || !u.hus || !u.hus.omriss || typeof THREE === 'undefined' || !BG() || !p) return { hull: 0, hauger: 0 };
    const hull = [], haug = [], L = p.logg();
    for (const P of u.hus.omriss) {
      if (!P.bygg || !P.dør) continue; const i = P.bygg.i, endr = PT.endringer(L, i); if (!endr.some(strukturell)) continue;
      const h = husFor(i); if (!h || !h.m) continue; const z0 = P.dør.z0 + .05;
      for (const e of h.m.etasjer) {
        if (e.kjeller) continue;
        for (const w of e.vegger) {
          const Lw = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]); if (Lw < .3) continue;
          const ux = (w.b[0] - w.a[0]) / Lw, uy = (w.b[1] - w.a[1]) / Lw, nx = uy, ny = -ux, ute = w.type === 'ytter' || w.type === 'gavl', off = (w.tykk || .2) / 2 + .06;
          const pkt = (t, o) => [h.o[0] + w.a[0] + ux * t + nx * o - u.cx, h.o[1] + w.a[1] + uy * t + ny * o - u.cy];
          const borte = !HR.står(w);
          // en revet eller rast yttervegg: hele flaten er et mørkt hull (gavlen bare den nederste halvdelen)
          if (borte && ute) { const hh = w.type === 'gavl' ? e.høyde / 2 : e.høyde, [x, y] = pkt(Lw / 2, off); hull.push({ x, y, z: z0 + e.z + hh / 2, ux, uy, nx, ny, l: Lw - .1, h: hh - .05 }); }
          // rester på bakken under det som er revet eller har rast
          if (borte) { const n = Math.max(1, Math.min(4, Math.round(Lw / 2.5)));
            for (let k = 0; k < n; k++) { const t = (k + .5) / n * Lw, f = hash(i * 7 + e.n, w.id * 13 + k), [x, y] = pkt(t, ute ? off + .6 : 0); haug.push({ x, y, z: z0 + .15, s: .7 + f * .7, a: f * 6.28, f, stein: w.stoff !== 'tre' }); } }
          // nye åpninger i ytterveggen: mørkt hull på fasaden
          if (!borte && ute) for (const o of e.åpninger) if (o.vegg === w.id && o.ny && o.tilstand !== 'revet' && !o.sperre) { const [x, y] = pkt(o.t, off); hull.push({ x, y, z: z0 + e.z + (o.ned || 0) + o.h / 2, ux, uy, nx, ny, l: o.b, h: o.h }); }
        }
        // rast eller revet gulv: haug midt i rommet på bakken
        for (const f of e.dekke.felt) if ((f.tilstand === 'rast' || f.tilstand === 'revet') && e.rom[f.rom] && e.n > 1) { const r = e.rom[f.rom]; let cx = 0, cy = 0; for (const q of r.P) { cx += q[0]; cy += q[1]; } cx /= r.P.length; cy /= r.P.length;
          const g = hash(i, 900 + e.n * 31 + f.id); haug.push({ x: h.o[0] + cx - u.cx, y: h.o[1] + cy - u.cy, z: z0 + .2, s: 1 + g * Math.min(1.5, Math.sqrt(r.areal) / 4), a: g * 6.28, f: g, stein: e.dekke.stoff !== 'tre' }); }
      }
    }
    const M = new THREE.Matrix4(), A = new THREE.Vector3(), N = new THREE.Vector3(), Z = new THREE.Vector3(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), Sk = new THREE.Vector3(), E = new THREE.Euler();
    if (hull.length) {
      HULL = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x0d0b09 }), hull.length);
      hull.forEach((q, k) => { A.set(q.ux * q.l, q.uy * q.l, 0); N.set(q.nx * .04, q.ny * .04, 0); Z.set(0, 0, q.h); M.makeBasis(A, N, Z); M.setPosition(q.x, q.y, q.z); HULL.setMatrixAt(k, M); });
      HULL.instanceMatrix.needsUpdate = true; HULL.userData.kilde = 'husendring-visning.js'; R3x.scene.add(HULL);
    }
    if (haug.length) {
      HAUG = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.5, 0), new THREE.MeshLambertMaterial({ color: 0xffffff }), haug.length);
      const C = new THREE.Color();
      haug.forEach((q, k) => { E.set(0, 0, q.a); Q.setFromEuler(E); Sk.set(q.s * 1.6, q.s * 1.1, q.s * .55); V.set(q.x, q.y, q.z); M.compose(V, Q, Sk); HAUG.setMatrixAt(k, M);
        C.setRGB(q.stein ? .42 + q.f * .1 : .36 + q.f * .08, q.stein ? .40 + q.f * .1 : .27 + q.f * .06, q.stein ? .37 + q.f * .1 : .18 + q.f * .05); HAUG.setColorAt(k, C); });
      HAUG.instanceMatrix.needsUpdate = true; if (HAUG.instanceColor) HAUG.instanceColor.needsUpdate = true; HAUG.userData.kilde = 'husendring-visning.js'; R3x.scene.add(HAUG);
    }
    return { hull: hull.length, hauger: haug.length };
  }
  if (typeof KROKER !== 'undefined' && KROKER.sett3d) KROKER.sett3d.push((u, R) => { try { hull3d(u, R); } catch (e) { console.warn('husendring i 3D:', e); } });

  window.HusEndring = { eier, sjekk, utfør, beskriv, rad, knapper, rivInfo, husFor, handlingFor, trykkKnapp, send, S, hull3d,
    velg: v => { S.valgt = v; S.varsel = null; varVis(); tegnPå(); },
    sjekk3d: () => ({ hull: HULL ? HULL.count : 0, hauger: HAUG ? HAUG.count : 0 }) };
})();
