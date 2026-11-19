'use strict';
/* Riksbrudd – «LAGRE OG LAST» (runde 7, 20. nov natt, pakke «lagring»). Kritikken: hver side hadde sin egen lagring uten at spilleren
 * kunne se eller styre den. Nå:
 *   - «Lagre og last: lagret 12:04» i ☰ (gruppen «Annet») og «Lagre» bak «Mer» i kommandolinja åpner panelet #lagremeny;
 *     på startskjermen står «Last inn et lagret spill» nederst (der finnes ikke ☰).
 *   - Panelet: spillet nå (lagres av seg selv, «Lagret 12:04»), tre lagringsplasser og «Automatisk» med navn, dag, fraksjon, kasse og
 *     når de ble lagret; «Lagre her», «Last», «Slett» (bekreftes i raden), «Last ned som fil» og «Hent fra fil» (JSON).
 *   - En plass er ALLE spillnøklene for siden (LagringSide.erSpill – innstillingene som filter, lyd og grafikk følger ikke med), pakket
 *     med Lagring.Plass (spill/lagring.js). Plassene ligger i localStorage «riksbrudd-plass-1/2/3/auto» med sidens ending, så /dovre-fliser,
 *     /norge og /rogaland har hver sine.
 *   - «Last» legger først spillet du har nå i «Automatisk» (så du kan gå tilbake), låser lagringen (LagringSide.lås – det modulene lagrer
 *     når siden lukkes, skriver ikke over), bytter nøklene og laster siden på nytt. Alle modulene leser da sitt eget som vanlig.
 *   - «Automatisk» tas også hvert REGLER.autoMin minutt mens du spiller (ikke i testene: LagringMeny.test).
 *   - Full eller sperret lagring (privat vindu): melding i stedet for krasj, og panelet råder deg til å laste ned spillet som fil.
 * window.LagringMeny: åpne, lukk, erÅpen, plass(id), lagreHer(id, navn), last(id | plass, { lastInn }), slett(id), legg(id, plass),
 * filTekst(id), hentFil(tekst), lastNed(id), status(), taAuto(), REGLER, test.
 */
(function (rot) {
  const LS = rot.LagringSide, LG = rot.Lagring, P = LG && LG.Plass; if (!LS || !P || typeof document === 'undefined') return;
  // Claudes forslag: tre plasser, automatisk kopi hvert tiende minutt med spilling, «Lagret» regnes som gammel etter ett minutt
  const REGLER = { plasser: ['1', '2', '3'], autoMin: 10, gammelMs: 60000, oppdaterMs: 1000 };
  const AUTO = 'auto', api = { REGLER, test: false };
  const ekte = () => !navigator.webdriver || api.test === true;
  const rå = navn => LS.tilRå(navn), plassNøkkel = id => rå('riksbrudd-plass-' + id);
  const el = (t, a = {}, ...barn) => { const e = document.createElement(t); for (const [k, v] of Object.entries(a)) { if (k === 'klasse') e.className = v; else e.setAttribute(k, v); } e.append(...barn); return e; };
  const esc = s => String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const kl = ms => { const d = new Date(ms); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const MND = ['jan.', 'feb.', 'mars', 'april', 'mai', 'juni', 'juli', 'aug.', 'sep.', 'okt.', 'nov.', 'des.'];
  const når = ms => { if (!ms) return ''; const d = new Date(ms), i = new Date(); return (d.toDateString() === i.toDateString() ? 'i dag' : `${d.getDate()}. ${MND[d.getMonth()]}`) + ' kl. ' + kl(ms); };
  const kroner = n => (rot.Oppstart && Oppstart.kroner ? Oppstart.kroner(n) : Math.round(n).toLocaleString('nb-NO') + ' kr');
  const spill = () => rot.OppstartSpill && OppstartSpill.tilstand();
  const harSpill = () => { const S = spill(); return !!(S && S.ferdig && S.leir); };
  function feilTekst(e) {
    const t = e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) ? 'fullt' : 'sperret';
    return t === 'fullt' ? 'Nettleseren har ikke mer plass til lagring. Slett en lagringsplass, eller last ned spillet som fil.'
      : 'Nettleseren lar ikke spillet lagre noe her (privat vindu eller blokkert lagring). Spillet virker, men blir borte når siden lukkes – last det ned som fil for å ta vare på det.';
  }

  // ---------- plassene ----------
  // spillnøklene for siden nå: { navn uten ending: tekst }
  function spillNå() { const ut = {}; for (const [k, v] of Object.entries(LS.rå.alle())) if (LS.erSpill(k, v)) ut[k] = v; return ut; }
  // modulene lagrer det de har i minnet (de lytter på pagehide) – så blir plassen det du ser nå
  function tøm() { try { rot.dispatchEvent(new Event('pagehide')); } catch (e) { /* gammel nettleser */ } try { if (rot.LagringSpill) LagringSpill.lagre(); } catch (e) { /* ingen lagring */ } }
  function plass(id) { let t = null; try { t = LS.rå.get(plassNøkkel(id)); } catch (e) { t = null; } if (!t) return null; const r = P.les(t, LS.her); return r.d ? r.d : { ødelagt: true, feil: r.feil }; }
  const plasser = () => [...REGLER.plasser, AUTO].map(id => ({ id, p: plass(id) }));
  function lagreHer(id, navn) {
    if (!harSpill()) return { feil: 'Det er ikke noe spill å lagre ennå.' };
    tøm(); const pl = P.pakk(spillNå(), { side: LS.her, navn, nå: Date.now() });
    if (!pl.nøkler['riksbrudd-k1']) return { feil: 'Spillet er ikke lagret ennå (lagringen virker ikke her). Last det ned som fil.' };
    try { LS.rå.set(plassNøkkel(id), P.tilFil(pl)); } catch (e) { return { feil: feilTekst(e) }; }
    if (id === AUTO) sistAuto = pl.laget;
    return { ok: true, plass: pl };
  }
  function legg(id, pl) { try { LS.rå.set(plassNøkkel(id), P.tilFil(pl)); return { ok: true }; } catch (e) { return { feil: feilTekst(e) }; } }
  function slett(id) { try { LS.rå.del(plassNøkkel(id)); } catch (e) { /* sperret */ } return { ok: true }; }
  // automatisk kopi (hvert tiende minutt med spilling, og før et annet spill lastes inn)
  let sistAuto = 0; { const a = plass(AUTO); if (a && a.laget) sistAuto = a.laget; }
  const taAuto = (navn) => lagreHer(AUTO, navn || `Automatisk: ${(spill() && spill().fraksjon && spill().fraksjon.navn) || 'spillet'}`);
  // Laster inn en plass eller en fil (plass-objekt fra hentFil). lastInn: false bytter bare nøklene (vakten) – ellers lastes siden på nytt.
  function last(kilde, o = {}) {
    const lastInn = o.lastInn !== false, pl = typeof kilde === 'string' ? plass(kilde) : kilde;
    if (!pl || pl.ødelagt || !pl.nøkler) return { feil: (pl && pl.feil) || 'Plassen er tom.' };
    if (LS.virker() === 'sperret' && lastInn) return { feil: 'Nettleseren lagrer ingenting i dette vinduet, så et spill kan ikke lastes inn her. Åpne spillet i et vanlig vindu.' };
    if (harSpill() && kilde !== AUTO) { const r = taAuto(`Før «${pl.navn}» ble lastet`); if (r.feil) return { feil: 'Fikk ikke tatt vare på spillet du har nå. ' + r.feil }; }
    tøm(); if (rot.LagringSpill) LagringSpill.av(true); LS.lås(true);
    const før = spillNå(), plan = P.byttPlan(før, pl);
    try { for (const k of plan.fjern) LS.rå.del(rå(k)); for (const [k, v] of plan.sett) LS.rå.set(rå(k), v); }
    catch (e) {
      // noe fikk ikke plass: spillet du hadde, settes tilbake slik det var
      try { for (const [k] of plan.sett) if (!(k in før)) LS.rå.del(rå(k)); for (const [k, v] of Object.entries(før)) LS.rå.set(rå(k), v); } catch (e2) { /* det som er igjen, ligger i «Automatisk» */ }
      LS.lås(false); if (rot.LagringSpill) LagringSpill.av(false); return { feil: feilTekst(e) };
    }
    try { LS.rå.set(rå('riksbrudd-lastet'), JSON.stringify({ navn: pl.navn, t: Date.now() })); } catch (e) { /* meldingen etter omlastingen blir borte */ }
    if (lastInn) { lukk(); setTimeout(() => location.reload(), 30); }
    return { ok: true, fjernet: plan.fjern.length, satt: plan.sett.length };
  }
  // filene: teksten som lastes ned, og lesing av en fil (gir { d } eller { feil })
  function filTekst(id) {
    if (id === 'nå') { if (!harSpill()) return null; tøm(); const pl = P.pakk(spillNå(), { side: LS.her, nå: Date.now() }); return pl.nøkler['riksbrudd-k1'] ? P.tilFil(pl) : null; }
    const p = plass(id); return p && !p.ødelagt ? P.tilFil(p) : null;
  }
  const hentFil = tekst => P.les(tekst, LS.her);
  function lastNed(id) {
    const t = filTekst(id); if (!t) return { feil: 'Det er ikke noe spill å laste ned her.' };
    const pl = JSON.parse(t), navn = P.filnavn(pl, new Date());
    try { const url = URL.createObjectURL(new Blob([t], { type: 'application/json' })), a = el('a', { href: url, download: navn }); a.style.display = 'none';
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 2000); } catch (e) { return { feil: 'Nettleseren lot ikke spillet lage fila.' }; }
    return { ok: true, navn, tegn: t.length };
  }

  // ---------- status: «Lagret 12:04» ----------
  function status() {
    const v = LS.virker(), f = LS.feil(), s = rot.LagringSpill && LagringSpill.sist ? LagringSpill.sist() : { ok: 0, feil: 0 };
    const nyFeil = (f && Date.now() - f.t < 10 * 60000 && (!s.ok || f.t > s.ok)) || (s.feil && s.feil > s.ok);
    if (v !== 'ok') return { tilstand: v, kort: 'ikke lagret', tekst: feilTekst({ name: v === 'fullt' ? 'QuotaExceededError' : 'SecurityError' }) };
    if (!harSpill()) return { tilstand: 'tom', kort: '–', tekst: 'Ingen spill i gang. Du kan laste inn et lagret spill eller en fil.' };
    if (nyFeil) return { tilstand: (f && f.type) || 'fullt', kort: 'feilet', tekst: `Siste lagring feilet${f ? ' kl. ' + kl(f.t) : ''}. ` + feilTekst({ name: f && f.type === 'sperret' ? 'SecurityError' : 'QuotaExceededError' }) };
    if (!s.ok) return { tilstand: 'venter', kort: 'snart', tekst: 'Spillet lagres av seg selv i denne nettleseren.' };
    return { tilstand: 'ok', kort: 'lagret ' + kl(s.ok), tekst: `Spillet lagres av seg selv i denne nettleseren. Lagret ${kl(s.ok)}.`, ms: s.ok };
  }

  // ---------- panelet ----------
  const css = document.createElement('style');
  css.textContent = `#lagremeny{ position:fixed; inset:0; z-index:42; display:none; align-items:center; justify-content:center; background:rgba(10,8,5,.72); padding:10px; box-sizing:border-box; }
#lagremeny.på{ display:flex; }
#lagremeny .ark{ box-sizing:border-box; width:min(560px, 100%); max-height:100%; overflow-y:auto; overscroll-behavior:contain; padding:12px 14px 14px; background:var(--panel,#1c170f); border:1px solid #c9b26a; color:var(--ink,#e7dcc3); font-size:14px; line-height:1.35; border-radius:6px; box-shadow:0 10px 40px rgba(0,0,0,.6); }
#lagremeny .topp{ display:flex; justify-content:space-between; align-items:center; gap:8px; margin:0 0 6px; }
#lagremeny .topp b{ font-family:"IM Fell English",serif; font-weight:400; font-size:22px; color:#f0dc9a; }
#lagremeny button{ background:#2a2318; border:1px solid #6a5a36; color:inherit; min-height:34px; padding:2px 11px; font:inherit; font-size:13.5px; cursor:pointer; border-radius:4px; }
#lagremeny button:hover{ border-color:#c9b26a; filter:brightness(1.15); } #lagremeny button:focus-visible{ outline:2px solid #e9d79a; outline-offset:1px; }
#lagremeny button:disabled{ opacity:.45; cursor:default; filter:none; }
#lagremeny button.lukk{ min-width:36px; font-size:20px; padding:0; }
#lagremeny button.fare{ border-color:#8a4a3a; color:#e7b3a3; background:#2a1a16; } #lagremeny button.ja{ border-color:#c9b26a; color:#f0e2b0; }
#lagremeny .status{ margin:0 0 10px; padding:6px 9px; border-left:3px solid #7c9a4e; background:#1f1a12; color:var(--ink-dim,#b9ad92); }
#lagremeny .status.feil{ border-left-color:#c0533a; color:#f0c3b3; background:#2a1712; }
#lagremeny .status b{ color:#e9e0c8; }
#lagremeny .navn{ display:flex; gap:8px; align-items:center; margin:0 0 8px; } #lagremeny .navn[hidden]{ display:none; } #lagremeny .navn span{ white-space:nowrap; color:var(--ink-dim,#a99); font-size:13px; }
#lagremeny .navn input{ flex:1 1 auto; min-width:0; height:32px; box-sizing:border-box; padding:0 8px; background:#14110b; border:1px solid #5a4a2a; color:inherit; font:inherit; border-radius:4px; }
#lagremeny .plass{ display:flex; flex-wrap:wrap; gap:6px 10px; align-items:center; justify-content:space-between; padding:8px 9px; margin:0 0 6px; border:1px solid #3a3226; background:#1e1911; border-radius:4px; }
#lagremeny .plass.nå{ border-color:#5a6a3a; background:#1d1e12; }
#lagremeny .plass.tom .tekst b{ color:var(--ink-dim,#a99); font-weight:400; }
#lagremeny .plass .tekst{ flex:1 1 150px; min-width:0; } #lagremeny .plass .tekst b{ display:block; color:#f0e2b0; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
#lagremeny .plass .tekst small{ display:block; color:var(--ink-dim,#a99); font-size:12.5px; }
#lagremeny .plass .knapper{ display:flex; flex-wrap:wrap; gap:4px; justify-content:flex-end; flex:0 1 auto; max-width:100%; min-width:0; }
#lagremeny .plass.spør{ border-color:#c9b26a; } #lagremeny .plass.spør .tekst b{ white-space:normal; }
#lagremeny h3{ margin:10px 0 5px; font-size:12.5px; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:var(--ink-dim,#a99); border-bottom:1px solid var(--rule,#3a3226); padding-bottom:3px; }
#lagremeny .filrad{ display:flex; flex-wrap:wrap; gap:6px; align-items:center; margin-top:4px; } #lagremeny .filrad small{ color:var(--ink-dim,#a99); flex:1 1 200px; }
#lagremeny .melding{ min-height:1.2em; margin:8px 0 0; color:#e9d79a; } #lagremeny .melding.feil{ color:#f0a890; }
#oppstart .lastinn{ margin:2px 0 10px; padding:6px 9px; border:1px solid var(--rule,#3a3226); background:rgba(0,0,0,.18); border-radius:4px; font-size:13.5px; color:var(--ink-dim,#a99); display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
#oppstart .lastinn button{ background:#2a2318; border:1px solid #c9b26a; color:#f0e2b0; min-height:34px; padding:2px 12px; font:inherit; font-size:13.5px; cursor:pointer; border-radius:4px; }
#oppstart .lastinn button:hover{ filter:brightness(1.15); }
@media (max-width:480px){ #lagremeny{ padding:6px; align-items:flex-start; } #lagremeny .ark{ padding:10px; } #lagremeny .plass{ padding:7px 8px; } }`;
  document.head.appendChild(css);
  const bak = el('div', { id: 'lagremeny', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Lagre og last' }), ark = el('div', { klasse: 'ark' });
  const lukkKn = el('button', { type: 'button', klasse: 'lukk', 'aria-label': 'Lukk' }, '×');
  const statusEl = el('p', { klasse: 'status', 'aria-live': 'polite' }), nåEl = el('div'), listeEl = el('div'), filKortEl = el('div'), meldingEl = el('p', { klasse: 'melding', 'aria-live': 'polite' });
  const navnInn = el('input', { type: 'text', maxlength: String(P.REGLER.navnMaks), placeholder: 'For eksempel «Før angrepet»', 'aria-label': 'Navn på lagringen' });
  const filInn = el('input', { type: 'file', accept: '.json,application/json', hidden: '' });
  const hentKn = el('button', { type: 'button', 'data-gjør': 'hent' }, 'Hent fra fil …');
  const navnRad = el('label', { klasse: 'navn' }, el('span', {}, 'Navn:'), navnInn);
  ark.append(el('div', { klasse: 'topp' }, el('b', {}, 'Lagre og last'), lukkKn), statusEl, nåEl,
    el('h3', {}, 'Lagringsplasser'), navnRad, listeEl,
    el('h3', {}, 'Fil'), el('div', { klasse: 'filrad' }, hentKn, el('small', {}, 'Ta vare på spillet, eller flytt det til en annen maskin: «Last ned» lager en fil, «Hent fra fil» leser den inn igjen.')), filKortEl, filInn, meldingEl);
  bak.appendChild(ark); document.body.appendChild(bak);
  let åpen = false, spør = null, filPlass = null, tidsur = 0;
  function melding(t, feil) { meldingEl.textContent = t || ''; meldingEl.classList.toggle('feil', !!feil); }
  // én rad: id, plass (eller null), tittel
  function rad(id, p, tittel) {
    const tom = !p, ødelagt = p && p.ødelagt, i = p && !ødelagt ? p.info : null, navn = p && !ødelagt ? p.navn : '';
    if (spør && spør.id === id) {
      const T = { slett: [`Slette «${navn}»?`, 'Ja, slett', 'fare'], last: [`Laste «${navn}»? Spillet du har nå, legges i «Automatisk» først, så du kan gå tilbake.`, 'Ja, last', 'ja'],
        over: [`Skrive over «${navn}» med spillet du har nå?`, 'Ja, lagre', 'ja'] }[spør.hva];
      return `<div class="plass spør" data-plass="${id}"><div class="tekst"><b>${esc(T[0])}</b></div><div class="knapper"><button type="button" class="${T[2]}" data-gjør="ja-${spør.hva}" data-plass="${id}">${T[1]}</button><button type="button" data-gjør="avbryt" data-plass="${id}">Avbryt</button></div></div>`;
    }
    const linje = i ? [`Dag ${i.dag} kl. ${i.klokke}`, i.fraksjon, i.penger !== null ? kroner(i.penger) : '', 'lagret ' + når(p.laget)].filter(Boolean).join(' · ') : ødelagt ? 'Kan ikke leses: ' + p.feil : id === AUTO ? `Tas hvert ${REGLER.autoMin}. minutt du spiller, og før et annet spill lastes inn.` : 'Tom plass';
    const kn = [];
    if (id !== AUTO && harSpill()) kn.push(`<button type="button" data-gjør="lagre" data-plass="${id}">Lagre her</button>`);
    if (!tom && !ødelagt) kn.push(`<button type="button" data-gjør="last" data-plass="${id}">Last</button>`, `<button type="button" data-gjør="ned" data-plass="${id}" title="Last ned som fil">Last ned</button>`);
    if (!tom) kn.push(`<button type="button" class="fare" data-gjør="slett" data-plass="${id}">Slett</button>`);
    return `<div class="plass${tom ? ' tom' : ''}" data-plass="${id}"><div class="tekst"><b>${esc(tittel + (navn ? ': ' + navn : ''))}</b><small>${esc(linje)}</small></div><div class="knapper">${kn.join('')}</div></div>`;
  }
  const bytt = (e, h) => { if (e.innerHTML !== h) e.innerHTML = h; };
  function tegn(tving) {
    if (!åpen || (!tving && rot.pekerNede && pekerNede(ark))) return;
    const st = status(), S = spill();
    statusEl.classList.toggle('feil', !['ok', 'venter', 'tom'].includes(st.tilstand)); bytt(statusEl, esc(st.tekst).replace(/Lagret (\d\d:\d\d)\./, 'Lagret <b>$1</b>.'));
    if (harSpill()) {
      const dagTid = typeof tid !== 'undefined' ? P.info({ 'riksbrudd-verden': JSON.stringify({ tid }) }) : { dag: 1, klokke: '06:00' };
      const linje = [`Dag ${dagTid.dag} kl. ${dagTid.klokke}`, S.karakter && S.karakter.navn, Number.isFinite(S.penger) ? kroner(S.penger) : ''].filter(Boolean).join(' · ');
      bytt(nåEl, `<div class="plass nå"><div class="tekst"><b>Spillet nå: ${esc(S.fraksjon && S.fraksjon.navn)}</b><small>${esc(linje)}${st.ms ? ' · lagret ' + kl(st.ms) : ''}</small></div><div class="knapper"><button type="button" data-gjør="ned" data-plass="nå">Last ned som fil</button></div></div>`);
    } else bytt(nåEl, '');
    // uten lagring i nettleseren (sperret) kan ingenting lastes inn – det ville blitt borte ved omlastingen
    const sperret = st.tilstand === 'sperret'; hentKn.disabled = sperret; navnRad.hidden = sperret || !harSpill();
    bytt(listeEl, sperret ? '<div class="plass tom"><div class="tekst"><b>Lagringsplassene virker ikke her</b><small>Nettleseren lagrer ingenting i dette vinduet. Bruk «Last ned som fil», og hent fila i et vanlig vindu.</small></div></div>'
      : REGLER.plasser.map((id, n) => rad(id, plass(id), 'Plass ' + (n + 1))).join('') + rad(AUTO, plass(AUTO), 'Automatisk'));
    if (filPlass) { const i = filPlass.info; bytt(filKortEl, `<div class="plass spør"><div class="tekst"><b>Fra fila: ${esc(filPlass.navn)}</b><small>${esc([`Dag ${i.dag} kl. ${i.klokke}`, i.fraksjon, i.penger !== null ? kroner(i.penger) : '', filPlass.laget ? 'lagret ' + når(filPlass.laget) : ''].filter(Boolean).join(' · '))}</small></div><div class="knapper"><button type="button" class="ja" data-gjør="fil-last">Last inn nå</button>${REGLER.plasser.map((id, n) => `<button type="button" data-gjør="fil-legg" data-plass="${id}">Legg i plass ${n + 1}</button>`).join('')}<button type="button" data-gjør="fil-avbryt">Avbryt</button></div></div>`); }
    else bytt(filKortEl, '');
  }
  function åpne() { åpen = true; spør = null; bak.classList.add('på'); melding(''); if (rot.Meny && Meny.lukk) Meny.lukk(); tegn(true); clearInterval(tidsur); tidsur = setInterval(() => tegn(false), REGLER.oppdaterMs); setTimeout(() => { try { lukkKn.focus({ preventScroll: true }); } catch (e) { /* ok */ } }, 0); return true; }
  function lukk() { if (!åpen) return false; åpen = false; spør = null; filPlass = null; bak.classList.remove('på'); clearInterval(tidsur); oppdaterKnapp(); return true; }
  const navnet = () => navnInn.value.trim();
  function gjør(hva, id) {
    const p = id && id !== 'nå' ? plass(id) : null;
    if (hva === 'lagre') { if (p && !p.ødelagt) { spør = { id, hva: 'over' }; return tegn(true); } hva = 'ja-over'; }
    if (hva === 'ja-over') { spør = null; const r = lagreHer(id, navnet()); if (r.feil) melding(r.feil, true); else { melding(`Lagret «${r.plass.navn}» i plass ${REGLER.plasser.indexOf(id) + 1}.`); navnInn.value = ''; } return tegn(true); }
    if (hva === 'last') { spør = { id, hva: 'last' }; return tegn(true); }
    if (hva === 'ja-last') { spør = null; melding('Laster inn …'); const r = last(id); if (r.feil) melding(r.feil, true); return tegn(true); }
    if (hva === 'slett') { spør = { id, hva: 'slett' }; return tegn(true); }
    if (hva === 'ja-slett') { spør = null; slett(id); melding(`Slettet «${p && p.navn ? p.navn : 'plassen'}».`); return tegn(true); }
    if (hva === 'avbryt') { spør = null; return tegn(true); }
    if (hva === 'ned') { const r = lastNed(id); melding(r.feil ? r.feil : `Lastet ned ${r.navn}.`, !!r.feil); return; }
    if (hva === 'hent') { filInn.value = ''; filInn.click(); return; }
    if (hva === 'fil-avbryt') { filPlass = null; melding(''); return tegn(true); }
    if (hva === 'fil-last') { const pl = filPlass; filPlass = null; melding('Laster inn …'); const r = last(pl); if (r.feil) melding(r.feil, true); return tegn(true); }
    if (hva === 'fil-legg') { const r = legg(id, filPlass); if (r.feil) melding(r.feil, true); else { melding(`«${filPlass.navn}» ligger nå i plass ${REGLER.plasser.indexOf(id) + 1}.`); filPlass = null; } return tegn(true); }
  }
  ark.addEventListener('click', e => { const b = e.target.closest && e.target.closest('button[data-gjør]'); if (!b || !ark.contains(b)) return; e.stopPropagation(); gjør(b.dataset.gjør, b.dataset.plass); });
  lukkKn.onclick = lukk;
  bak.addEventListener('pointerdown', e => { if (e.target === bak) lukk(); });
  rot.addEventListener('keydown', e => { if (åpen && e.key === 'Escape') { e.stopPropagation(); lukk(); } }, true);
  filInn.addEventListener('change', () => { const f = filInn.files && filInn.files[0]; if (!f) return;
    if (f.size > P.REGLER.maksTegn * 2) { melding('Fila er for stor til å være et lagret spill.', true); return; }
    const r = new FileReader(); r.onload = () => { const s = hentFil(String(r.result || '')); if (s.feil) { filPlass = null; melding(s.feil, true); } else { filPlass = s.d; melding(''); } tegn(true); };
    r.onerror = () => melding('Fila kunne ikke leses.', true); r.readAsText(f); });

  // ---------- knappen i ☰ (gruppen «Annet»; lastes før meny.js, så meny.js ordner den inn) og «Lagre» bak «Mer» ----------
  const menyKn = el('button', { type: 'button', id: 'lagreknapp', title: 'Lagre, last og flytt spillet' }, 'Lagre og last: –');
  menyKn.onclick = () => (åpen ? lukk() : åpne());
  const lagmeny = document.getElementById('lagmeny'); if (lagmeny) lagmeny.appendChild(menyKn);
  let sistKnapp = '';
  function oppdaterKnapp() { const t = 'Lagre og last: ' + status().kort; if (t === sistKnapp) return; sistKnapp = t;
    const v = menyKn.querySelector('.verdi'); if (v) v.textContent = status().kort; else menyKn.textContent = t; }
  setInterval(oppdaterKnapp, 5000);
  (rot.KOMMANDO_TILLEGG = rot.KOMMANDO_TILLEGG || []).push({ k: 'lagre', navn: 'Lagre', tast: '', tittel: 'Lagre og last: lagringsplasser og fil',
    ikon: "<path d='M5 4h11l3 3v13H5z'/><path d='M8 4v5h7V4'/><path d='M8 20v-6h8v6'/>", fins: () => true, på: () => åpen, trykk: () => (åpen ? lukk() : åpne()) });
  // på startskjermen (der ☰ ikke kan nås): «Last inn et lagret spill» rett under «Steg 1 av 3» (steg 1 kan være lang å bla i på telefon)
  const oppstart = document.getElementById('oppstart'), oppArk = oppstart && oppstart.querySelector('.ark');
  function startLenke() {
    if (!oppArk || oppArk.querySelector('.lastinn')) return; const h = oppArk.querySelector('h2'); if (!h || !/nytt spill/i.test(h.textContent)) return;
    const n = plasser().filter(q => q.p && !q.p.ødelagt).length;
    const b = el('button', { type: 'button' }, 'Last inn et lagret spill …'); b.onclick = () => { åpne(); };
    const rad = el('div', { klasse: 'lastinn' }, el('span', {}, n ? `Du har ${n} ${n === 1 ? 'lagret spill' : 'lagrede spill'} på denne siden.` : 'Har du lagret spillet som fil?'), b), steg = oppArk.querySelector('.steg');
    if (steg && steg.parentNode === oppArk) steg.after(rad); else oppArk.appendChild(rad);
  }
  // (endringen vår utløser observatøren én gang til, men da finnes .lastinn og ingenting skjer)
  if (oppArk) { new MutationObserver(() => startLenke()).observe(oppArk, { childList: true }); startLenke(); }

  // ---------- etter omlasting, automatisk kopi og feil ----------
  rot.addEventListener('riksbrudd-spill', () => setTimeout(() => {
    let d = null; try { d = JSON.parse(LS.rå.get(rå('riksbrudd-lastet')) || 'null'); LS.rå.del(rå('riksbrudd-lastet')); } catch (e) { d = null; }
    if (d && d.navn && Date.now() - d.t < 120000 && typeof logg === 'function') logg(`Lastet inn «${d.navn}». Spillet du hadde, ligger i «Automatisk» under Lagre og last (☰).`);
    oppdaterKnapp();
  }, 400));
  // hvert minutt: en automatisk kopi når det er REGLER.autoMin minutter siden sist (bare mens siden vises, ikke i testene)
  setInterval(() => { if (!ekte() || !harSpill() || document.visibilityState === 'hidden' || LS.låst()) return;
    if (Date.now() - sistAuto >= REGLER.autoMin * 60000) { const r = taAuto(); if (r.feil) sistAuto = Date.now(); } }, 60000);
  // en lagring som feiler: én melding i loggen per økt (og knappen sier «feilet»)
  let meldt = false;
  LS.nårFeil(f => { oppdaterKnapp(); if (meldt || typeof logg !== 'function') return; meldt = true;
    setTimeout(() => logg(f.type === 'fullt' ? 'Spillet fikk ikke lagret: nettleseren har ikke mer plass. Åpne «Lagre og last» i ☰ og slett en plass eller last ned spillet som fil.'
      : 'Spillet kan ikke lagres i dette vinduet (privat vindu eller blokkert lagring). Åpne «Lagre og last» i ☰ og last ned spillet som fil før du lukker.'), 0); });
  // virker ikke lagringen i det hele tatt (sperret), sies det fra med en gang spillet er i gang
  rot.addEventListener('riksbrudd-spill', () => setTimeout(() => { const v = LS.virker(); if (v === 'ok' || meldt) return; meldt = true;
    if (typeof logg === 'function') logg(v === 'fullt' ? 'Nettleseren har ikke mer plass: spillet lagres ikke. Åpne «Lagre og last» i ☰.' : 'Spillet kan ikke lagres i dette vinduet (privat vindu eller blokkert lagring). Åpne «Lagre og last» i ☰ og last ned spillet som fil før du lukker.');
    oppdaterKnapp(); }, 1200));
  Object.assign(api, { åpne, lukk, erÅpen: () => åpen, plass, plasser, lagreHer, last, slett, legg, filTekst, hentFil, lastNed, status, taAuto, spillNå, tegn: () => tegn(true), AUTO });
  rot.LagringMeny = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
