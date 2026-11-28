'use strict';
/* Riksbrudd – PANELET «SELSKAPET» (fase Ø0, 28. nov; docs/plan-selskap-okonomi.md kapittel 1, 15 punkt 1, 2 og 6, og 17).
 * Ett panel med fanene Oversikt, Produksjon, Kontrakter, Byer, Partnere og Eiere – alt det nye i planen samles her, ikke i nye knapper.
 *  - OVERSIKT: navnet og merket, kassa, ukas resultat (dagboka over pengene, PengerSpill), nivå og rykte (spill/selskap.js), folk og lag,
 *    DE FIRE TRINNENE (spill/trinn.js: det nåværende uthevet og hva som trengs for neste) og «Det viktigste nå» (de tre øverste fra
 *    Neste-lista, spill/neste.js).
 *  - KONTRAKTER: kontraktpanelet fra spill/selskap-visning.js (#selskap) flyttes inn i fanen mens den er åpen – samme panel, samme knapper,
 *    ingen ny kontraktvisning. Lukkes fanen, settes det tilbake der det sto.
 *  - BYER: tettstedene i området med eier (Garnison) og lojalitet (RegionSpill), med «Vis i kartet».
 *  - PRODUKSJON, PARTNERE, EIERE: en rolig tekst om hva som kommer (Ø1, Ø5, Ø7).
 * Inngangene: «Selskap» i kommandolinja (samme knapp som før – den åpner nå dette panelet), tast S, «Selskapet» i ☰, Neste-lappen
 * (steget mot neste trinn) og kortet «Storlia Tømmer har hørt om dere». På telefon er panelet et bunnark med fanene som rad øverst.
 * Ett panel om gangen: åpnes det, lukkes panelene på samme plass (spill/paneler.js); åpnes et annet, lukkes dette.
 * DEN FØRSTE HALVTIMEN (punkt 6): etter den første leverte kontrakten kommer et rolig kort «Storlia Tømmer har hørt om dere» som peker
 * hit og til trinnet Leverandør. Ikke i testene (navigator.webdriver) – SelskapetSpill.test = true slår det på.
 * Huskes per leir i localStorage «riksbrudd-selskapet» (høyeste trinn, kortet vist, siste fane). window.SelskapetSpill, window.TrinnSpill.
 * Tekstene og tallene er Claudes forslag.
 */
(function () {
  const B = window.Selskapsbilde, TR = window.Trinn; if (!B || !TR) return;
  const API = { test: false }, auto = () => !navigator.webdriver || API.test === true;
  const NØKKEL = 'riksbrudd-selskapet', $ = id => document.getElementById(id);
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const Sp = () => (window.OppstartSpill && OppstartSpill.tilstand ? OppstartSpill.tilstand() : null);
  const kr = v => (window.Oppstart && Oppstart.kroner ? Oppstart.kroner(v) : B.kr(v));
  const krF = v => (v > 0 ? '+' : '') + (v < 0 ? '−' + kr(-v) : kr(v));
  const smal = () => document.body.classList.contains('kort');

  // ---------- det som huskes per leir ----------
  let H = { leir: '', høyest: 1, storlia: false, fane: 'oversikt' };
  const leirId = () => { const s = Sp(); return s && s.leir ? Math.round(s.leir.x) + ',' + Math.round(s.leir.y) : ''; };
  function les() { const id = leirId(); if (H.leir === id) return; let d = null; try { d = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); } catch (e) { d = null; }
    H = d && d.leir === id ? { leir: id, høyest: Math.max(1, +d.høyest || 1), storlia: !!d.storlia, fane: d.fane || 'oversikt' } : { leir: id, høyest: 1, storlia: false, fane: 'oversikt' }; }
  function lagre() { if (!H.leir || (window.NETT && NETT.gjest)) return; try { localStorage.setItem(NØKKEL, JSON.stringify(H)); } catch (e) { /* fullt eller sperret */ } }

  // ---------- øyeblikksbildet ----------
  const egneLag = () => (typeof ENHETER !== 'undefined' ? ENHETER.filter(s => s.side === 'blå' && (typeof levende !== 'function' || levende(s)) && !s.karakter && !s.leirvakt && !s.sperre) : []);
  function ferdigeBygg() { const L = window.LeirSpill && LeirSpill.tilstand ? LeirSpill.tilstand() : null; if (!L || !Array.isArray(L.bygg)) return 0;
    return L.bygg.filter(b => !b.del && (window.Leir && Leir.ferdig ? Leir.ferdig(b) : !(b.igjen > 0))).length; }
  function egneTettsteder() { let n = 0; try { if (typeof TETTSTEDER !== 'undefined' && TETTSTEDER && TETTSTEDER.forEach) TETTSTEDER.forEach(t => { if (t && t.eier === 'blå') n++; }); } catch (e) { n = 0; } return n; }
  function selskap() { const SS = window.SelskapSpill, S = SS && SS.tilstand ? SS.tilstand() : null, sd = S && S.sider && S.sider.blå; return { SS, S, sd }; }
  function trinnBilde() { const { SS, sd } = selskap(); return { levert: sd && sd.sum ? sd.sum.levert : 0, nivå: SS && SS.nivå ? SS.nivå().nr : 1, bygg: ferdigeBygg(), tettsteder: egneTettsteder() }; }
  function regnTrinn() { les(); return TR.regn(trinnBilde(), H.høyest); }
  function navn() { const s = Sp(), f = s && s.fraksjon; return (f && f.navn) || (window.Fraksjoner && Fraksjoner.FRAKSJONER && Fraksjoner.FRAKSJONER.blå && Fraksjoner.FRAKSJONER.blå.navn) || 'Ditt selskap'; }
  function uke() { const P = window.PengerSpill; if (!P || !P.døgn || !P.døgnNå || !P.tilstand || !P.tilstand()) return null; return B.uke(n => P.døgn(n), P.døgnNå()); }
  function byListe() { const SS = window.SelskapSpill; let st = []; try { st = SS && SS.steder ? SS.steder() : []; } catch (e) { st = []; } const G = window.Garnison, R = window.RegionSpill && RegionSpill.tilstand ? RegionSpill.tilstand() : null;
    return B.byer(st, id => (G && typeof TETTSTEDER !== 'undefined' ? G.tilstand(TETTSTEDER, id).eier : null), id => (R && R.byer && R.byer[id] && G && typeof TETTSTEDER !== 'undefined' && G.tilstand(TETTSTEDER, id).eier === 'blå' ? R.byer[id].loj : null)); }
  function viktigste() { try { const N = window.NesteSpill; return N && N.liste ? B.viktigste(N.liste().filter(k => k.slag !== 'trinn')) : []; } catch (e) { return []; } }

  // ---------- panelet ----------
  const css = document.createElement('style');
  css.textContent = `#selskapet{ display:none; position:fixed; left:10px; top:calc(var(--topp,58px) + 6px); z-index:11; width:min(460px, calc(100vw - 20px)); max-height:calc(100% - var(--topp,58px) - 150px);
  box-sizing:border-box; flex-direction:column; color:var(--ink,#e7dcc3); background:linear-gradient(180deg,#241c10 0,#17120a 150px); border:1px solid #8a7440; border-radius:4px;
  box-shadow:0 0 0 1px #0d0a06, inset 0 1px 0 rgba(255,230,160,.06), 0 12px 34px rgba(0,0,0,.65); }
#selskapet.på{ display:flex; }
#selskapet .shode{ flex:none; display:flex; gap:10px; align-items:center; padding:10px 46px 6px 12px; }
#selskapet .shode .smerke{ flex:none; width:44px; height:44px; } #selskapet .shode h2{ margin:0; font-family:"IM Fell English",serif; font-weight:400; font-size:21px; line-height:1.1; letter-spacing:.02em; }
#selskapet .shode small{ display:block; font-size:12.5px; color:#c9b26a; letter-spacing:.02em; margin-top:2px; }
#selskapet .lukk{ position:absolute; right:8px; top:8px; width:32px; height:30px; padding:0; font-size:17px; line-height:1; background:linear-gradient(180deg,#2a2215,#17120a); border:1px solid #5a4a2a; border-radius:3px; color:inherit; cursor:pointer; }
#selskapet .sfaner{ flex:none; display:flex; gap:0; overflow-x:auto; scrollbar-width:none; border-bottom:1px solid #5a4a2a; padding:0 6px; }
#selskapet .sfaner::-webkit-scrollbar{ display:none; }
#selskapet .sfaner button{ flex:none; min-height:36px; padding:0 10px; background:none; border:0; border-bottom:3px solid transparent; color:#a89970; font:inherit; font-size:14px; cursor:pointer; }
#selskapet .sfaner button.på{ color:#f0e2b0; border-bottom-color:#c9b26a; font-weight:600; } #selskapet .sfaner button.kommer{ color:#7d7258; }
#selskapet .skropp{ flex:1 1 auto; min-height:0; overflow-y:auto; padding:6px 12px 12px; scrollbar-width:thin; scrollbar-color:#5a4f38 transparent; }
#selskapet .sinnleid{ flex:1 1 auto; min-height:0; display:none; flex-direction:column; padding:0 4px 4px; }
#selskapet.ikontrakter .skropp{ display:none; } #selskapet.ikontrakter .sinnleid{ display:flex; }
#selskapet #selskap{ position:static; flex:1 1 auto; min-height:0; width:auto; max-height:none; overflow-y:auto; margin:0; padding:4px 8px 8px; border:0; box-shadow:none; background:none; border-radius:0; z-index:auto; transform:none; }
#selskapet #selskap > .lukk, #selskapet #selskap > .hode{ display:none; }
#selskapet h3{ margin:12px 0 5px; font-size:12.5px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; color:#c9b26a; }
#selskapet .tall{ margin:0; padding:0; list-style:none; } #selskapet .tall li{ display:flex; justify-content:space-between; gap:10px; align-items:baseline; padding:4px 0; border-bottom:1px solid #3a3226; font-size:14px; }
#selskapet .tall li span{ color:#b9ab86; } #selskapet .tall li b{ font-weight:600; text-align:right; font-variant-numeric:tabular-nums; } #selskapet .tall li b.pluss{ color:#b9d48a; } #selskapet .tall li b.minus{ color:#e7a593; }
#selskapet .tall li small{ display:block; font-size:12px; color:#8f8a7c; font-weight:400; }
#selskapet .trinn{ margin:2px 0 0; padding:0; list-style:none; } #selskapet .trinn li{ display:flex; gap:9px; align-items:flex-start; padding:5px 6px; border-left:2px solid #3a3226; margin-left:9px; }
#selskapet .trinn li i{ flex:none; width:20px; height:20px; line-height:20px; margin-left:-18px; border-radius:50%; background:#17120a; border:1px solid #5a4a2a; text-align:center; font-style:normal; font-size:12px; color:#a89970; }
#selskapet .trinn li div{ min-width:0; } #selskapet .trinn li b{ font-weight:600; font-size:14.5px; } #selskapet .trinn li small{ display:block; font-size:12.5px; color:#8f8a7c; line-height:1.3; }
#selskapet .trinn li.gjort i{ background:#4a3d22; border-color:#c9b26a; color:#f0e2b0; } #selskapet .trinn li.gjort b{ color:#b9ab86; } #selskapet .trinn li.gjort{ border-left-color:#8a7440; }
#selskapet .trinn li.nå{ background:#2a2416; border:1px solid #6a5a2e; border-left:2px solid #c9b26a; border-radius:3px; } #selskapet .trinn li.nå i{ background:#c9b26a; border-color:#f0e2b0; color:#17120a; font-weight:700; } #selskapet .trinn li.nå b{ color:#f0e2b0; }
#selskapet .krav{ margin:6px 0 0; padding:7px 9px; background:rgba(255,255,255,.025); border:1px solid #3a3226; border-radius:3px; font-size:13.5px; }
#selskapet .krav div{ padding:2px 0; } #selskapet .krav .ok{ color:#a9c27a; } #selskapet .krav .mangler{ color:#e7dcc3; } #selskapet .krav small{ display:block; color:#8f8a7c; font-size:12.5px; margin-top:3px; }
#selskapet .viktig{ margin:0; padding:0; list-style:none; } #selskapet .viktig li{ display:flex; gap:8px; align-items:center; padding:5px 0; border-bottom:1px solid #3a3226; font-size:14px; }
#selskapet .viktig li span{ flex:1; min-width:0; } #selskapet .viktig li em{ flex:none; font-style:normal; min-width:16px; color:#b48a3c; font-weight:600; }
#selskapet .skropp button:not(.lukk){ min-height:32px; padding:0 10px; background:#241c10; border:1px solid #5a4a2a; color:inherit; border-radius:3px; font:inherit; font-size:13px; cursor:pointer; flex:none; }
#selskapet .skropp button:not(.lukk):hover{ border-color:#c9b26a; } #selskapet .rolig{ color:#c8bfa9; font-size:14px; line-height:1.45; } #selskapet .rolig b{ display:block; font-family:"IM Fell English",serif; font-weight:400; font-size:18px; color:#f0e2b0; margin:14px 0 4px; }
#selskapet .by{ display:flex; gap:8px; align-items:center; padding:5px 0; border-bottom:1px solid #3a3226; font-size:14px; } #selskapet .by > span{ flex:1; min-width:0; } #selskapet .by small{ display:block; color:#8f8a7c; font-size:12.5px; }
#selskapet .by em{ font-style:normal; font-size:12.5px; padding:1px 7px; border-radius:9px; border:1px solid #5a4a2a; color:#c8bfa9; flex:none; }
#selskapet .by em.blå{ border-color:#5d86c0; color:#bcd0ee; } #selskapet .by em.rød{ border-color:#b0443a; color:#e7b3a3; } #selskapet .by em.grønn{ border-color:#5f8a45; color:#b9d48a; }
#selskapet .knapperad{ display:flex; gap:6px; flex-wrap:wrap; margin-top:10px; } #selskapet .notis{ margin:8px 0 0; font-size:13px; color:#d8cba0; font-style:italic; }
body.kort #selskapet{ left:calc(8px + env(safe-area-inset-left,0px)); right:calc(8px + env(safe-area-inset-right,0px)); width:auto; top:auto; bottom:calc(64px + env(safe-area-inset-bottom,0px)); max-height:min(70vh, calc(100% - var(--topp,44px) - 76px)); border-radius:8px 8px 4px 4px; background:#16120c; }
body.kort #selskapet .shode{ padding:8px 44px 4px 10px; } body.kort #selskapet .shode .smerke{ width:34px; height:34px; } body.kort #selskapet .shode h2{ font-size:18px; }
body.kort #selskapet .sfaner button{ padding:0 8px; font-size:13.5px; min-height:38px; }
#storliakort{ position:fixed; left:50%; transform:translateX(-50%); top:calc(var(--topp,58px) + 10px); z-index:19; width:min(420px, calc(100vw - 24px)); box-sizing:border-box;
  background:linear-gradient(180deg,#2a2215,#17120a); border:1px solid #8a7440; box-shadow:0 10px 26px rgba(0,0,0,.55); color:#e7dcc3; padding:9px 12px 10px; font-size:14px; line-height:1.4; border-radius:4px; }
#storliakort small{ display:block; font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:#c9b26a; } #storliakort b{ font-family:"IM Fell English",serif; font-weight:400; font-size:19px; color:#f0e2b0; }
#storliakort p{ margin:4px 0 0; } #storliakort .knapper{ display:flex; gap:6px; justify-content:flex-end; margin-top:7px; }
#storliakort button{ min-height:34px; padding:0 12px; background:#2a2318; border:1px solid #5a4a2a; color:#e7dcc3; font:inherit; font-size:13.5px; cursor:pointer; border-radius:3px; } #storliakort button.hoved{ border-color:#c9b26a; color:#f0e2b0; }
body.kort #storliakort{ top:calc(var(--topp,44px) + 4px); font-size:13px; }
@media (prefers-reduced-motion:no-preference){ #selskapet.på, #storliakort{ animation:selskapinn .16s ease-out; } @keyframes selskapinn{ from{ opacity:0; } } }`;
  document.head.appendChild(css);
  const P = document.createElement('div'); P.id = 'selskapet'; P.setAttribute('role', 'dialog'); P.setAttribute('aria-label', 'Selskapet');
  P.innerHTML = '<button class="lukk" data-sp="lukk" aria-label="Lukk">×</button><div class="shode"></div><div class="sfaner" role="tablist"></div><div class="skropp"></div><div class="sinnleid"></div>';
  document.body.appendChild(P);
  const hode = P.querySelector('.shode'), faner = P.querySelector('.sfaner'), kropp = P.querySelector('.skropp'), innleid = P.querySelector('.sinnleid');
  faner.innerHTML = B.REGLER.FANER.map(f => `<button type="button" role="tab" data-fane="${f.id}" class="${f.klar || (f.id === 'produksjon' && window.ProduksjonSpill) || (f.id === 'partnere' && window.FirmaSpill) || (f.id === 'eiere' && window.BorsSpill) ? '' : 'kommer'}">${esc(f.navn)}</button>`).join('');
  let åpen = false, fane = 'oversikt', sistKropp = '', sistHode = '';

  // ---------- fanene ----------
  function oversikt() {
    const { SS, S, sd } = selskap(), s = Sp(), R = regnTrinn(), u = uke(), F = window.FolkSpill && FolkSpill.tilstand ? FolkSpill.tilstand() : null;
    const nv = SS && SS.nivå ? SS.nivå() : { nr: 1, navn: 'Ukjent' }, rykte = sd && window.Selskap && Selskap.rykteTekst ? Selskap.rykteTekst(sd.rykte) : '';
    const linje = (t, v, kl, under) => `<li><span>${esc(t)}</span><b class="${kl || ''}">${esc(v)}${under ? `<small>${esc(under)}</small>` : ''}</b></li>`;
    let h = '<ul class="tall">';
    h += linje('Kassa', s ? kr(s.penger) : '–');
    if (u) h += linje('Ukas resultat', u.dager ? krF(u.netto) : '–', u.netto > 0 ? 'pluss' : u.netto < 0 ? 'minus' : '', u.dager ? `${kr(u.inn)} inn, ${kr(u.ut)} ut (${u.dager} ${u.dager === 1 ? 'døgn' : 'døgn'})` : '');
    h += linje('Nivå', `${nv.nr} · ${nv.navn}`, '', rykte);
    if (sd && sd.sum) h += linje('Kontrakter', `${sd.sum.levert} levert`, '', `${sd.aktive ? sd.aktive.length : 0} aktive, ${S && S.tilbud ? S.tilbud.length : 0} ledige tilbud`);
    h += linje('Folk', F ? String(F.personer.length) : '–'); h += linje('Lag', String(egneLag().length));
    h += linje('Tettsteder', String(trinnBilde().tettsteder));
    // (Ø7, ut5-bors) verdien og kursen på Gråbørsen
    try { if (window.BorsSpill && BorsSpill.flisLinjer) for (const q of BorsSpill.flisLinjer()) h += linje(q[0], q[1], q[3] || '', q[2]); } catch (e) { /* uten børs */ }
    h += '</ul>';
    h += `<h3>Veien videre</h3><ol class="trinn">` + TR.REGLER.TRINN.map(t => `<li class="${t.nr < R.nr ? 'gjort' : t.nr === R.nr ? 'nå' : ''}" data-trinn="${t.nr}"><i>${t.nr < R.nr ? '✓' : t.nr}</i><div><b>${esc(t.navn)}</b><small>${esc(t.nr === R.nr ? 'Dere er ' + t.du + '. ' + t.hva : t.hva)}</small></div></li>`).join('') + '</ol>';
    if (R.neste) h += `<div class="krav" data-neste="${R.neste.nr}"><div>For trinn ${R.neste.nr}, ${esc(R.neste.navn)}:</div>` + R.krav.map(k => `<div class="${k.ok ? 'ok' : 'mangler'}">${k.ok ? '✓' : '○'} ${esc(k.tekst)}</div>`).join('') + (R.steg ? `<small>${esc(R.steg.hjelp)}</small>` : '') + '</div>';
    else h += `<div class="krav"><div class="ok">Dere har nådd det siste trinnet.</div><small>Eksport, investorer og børsen kommer i senere faser.</small></div>`;
    if (H.storlia && R.nr <= 2) h += `<p class="notis">Storlia Tømmer har hørt om dere. Hold leveransene jevne – de følger med.</p>`;
    // (ut4-eksport, Ø6) eksportordrene, havn/grense og eurokreditten (spill/eksport-visning.js)
    try { if (window.EksportSpill && EksportSpill.oversiktHtml) h += EksportSpill.oversiktHtml(); } catch (e) { /* uten eksport */ }
    // (28. nov, pakke «seier») de tre veiene til seier: makt, penger og gjenoppbygging (spill/seier-visning.js)
    try { if (window.SeierSpill && SeierSpill.oversiktHtml) h += SeierSpill.oversiktHtml(); } catch (e) { /* uten seier */ }
    const V = viktigste();
    h += '<h3>Det viktigste nå</h3>' + (V.length ? '<ul class="viktig">' + V.map((k, i) => `<li><em>${i + 1}</em><span>${esc(k.tekst)}</span>${k.l0 || k.trykk ? `<button type="button" data-sp="gå" data-i="${i}">Gå til</button>` : ''}</li>`).join('') + '</ul>' : '<p class="rolig">Ingenting haster akkurat nå.</p>');
    return h;
  }
  function byer() {
    // (Ø3 byene på laget) fanen fylles av spill/byavtale-visning.js når den finnes: byens kort, forhandling og avtalene
    if (window.ByavtaleSpill && ByavtaleSpill.fane) { const h = ByavtaleSpill.fane(byListe()); if (h) return h; }
    const L = byListe(); if (!L.length) return '<p class="rolig">Ingen tettsteder i området ennå. Kartet laster kanskje fortsatt.</p>';
    let h = `<p class="rolig" style="margin:6px 0">Tettstedene i området og hvem som holder dem. Snart kan dere vinne byene over med avtaler – nå tar dere et tettsted ved å holde det med et lag.</p>`;
    h += L.slice(0, 40).map(b => `<div class="by" data-by="${esc(b.id)}"><span>${esc(b.navn)}<small>${b.folk ? b.folk.toLocaleString('nb-NO') + ' innbyggere' : 'tettsted'}${b.loj !== null ? ' · lojalitet ' + b.loj : ''}</small></span><em class="${esc(b.eier || '')}">${esc(b.eierNavn)}</em><button type="button" data-sp="by" data-id="${esc(b.id)}">Vis</button></div>`).join('');
    h += `<div class="knapperad">${window.RegionSpill && RegionSpill.åpne ? '<button type="button" data-sp="region">Regionen</button>' : ''}${$('krigknapp') ? '<button type="button" data-sp="krig">Krigskartet</button>' : ''}</div>`;
    return h;
  }
  const kommer = f => `<div class="rolig"><b>${esc(f.kommer)}</b>${esc(f.mer)}</div>`;
  function hodeHtml() { const SS = window.SelskapSpill, R = regnTrinn(); return `${SS && SS.merke ? SS.merke('blå', 44) : ''}<div><h2>${esc(navn())}</h2><small>${esc(TR.tekst(R))}</small></div>`; }

  // ---------- kontraktene: panelet fra selskap-visning.js lånes inn i fanen ----------
  let lånt = false;
  function lånInn() { const sel = $('selskap'); if (!sel || !window.SelskapSpill) return false; if (sel.parentNode !== innleid) innleid.appendChild(sel); lånt = true; if (!sel.classList.contains('på')) SelskapSpill.vis(true);
    // den første kontrakten venter på «Ta»: knappen rulles fram (den står under rykte og pris)
    try { const l = SelskapSpill.lapp ? SelskapSpill.lapp() : null, t = l && l.steg === 'ta' && l.k ? sel.querySelector(`[data-s="ta"][data-id="${l.k.id}"]`) : null; if (t) { const r = t.getBoundingClientRect(), q = sel.getBoundingClientRect(); sel.scrollTop += r.top - q.top - q.height / 3; } } catch (e) { /* */ }
    return true; }
  function giTilbake(lukkOgså) { const sel = $('selskap'); if (!lånt) return; lånt = false; if (sel && sel.parentNode === innleid) document.body.appendChild(sel); if (lukkOgså !== false && sel && sel.classList.contains('på') && window.SelskapSpill) SelskapSpill.vis(false); }

  function tegn(tving) {
    if (!åpen) return; if (!tving && typeof window.pekerNede === 'function' && window.pekerNede(P)) return;
    const hh = hodeHtml(); if (hh !== sistHode) { hode.innerHTML = hh; sistHode = hh; }
    for (const b of faner.children) { const p = b.dataset.fane === fane; b.classList.toggle('på', p); b.setAttribute('aria-selected', p ? 'true' : 'false'); }
    P.classList.toggle('ikontrakter', fane === 'kontrakter');
    if (fane === 'kontrakter') { if (!lånt) lånInn(); return; }
    if (lånt) giTilbake();
    const f = B.REGLER.FANER.find(q => q.id === fane) || B.REGLER.FANER[0];
    // (Ø1) fanen Produksjon: maskinene og grafene fra spill/produksjon-visning.js (ProduksjonSpill.html / etter)
    const PR = fane === 'produksjon' && window.ProduksjonSpill ? window.ProduksjonSpill : null;
    // (Ø5, ut4-firmaer) fanen Partnere: firmaene og rivalene fra spill/firma-visning.js (FirmaSpill.fane / trykk)
    const FS = fane === 'partnere' && window.FirmaSpill && FirmaSpill.fane ? window.FirmaSpill : null;
    // (Ø7, ut5-bors) fanen Eiere: kursen, eierne, investorene, andelene og Gråbørsen fra spill/bors-visning.js (BorsSpill.fane / etter / trykk)
    const BO = fane === 'eiere' && window.BorsSpill && BorsSpill.fane ? window.BorsSpill : null;
    const h = fane === 'oversikt' ? oversikt() : fane === 'byer' ? byer() : PR ? PR.html() : FS ? FS.fane() : BO ? BO.fane() : kommer(f);
    const ny = h !== sistKropp || tving;
    if (ny) { const topp = kropp.scrollTop; kropp.innerHTML = h; sistKropp = h; if (!tving) kropp.scrollTop = topp; }
    if (PR) PR.etter(kropp, ny);
    if (BO && BO.etter) BO.etter(kropp, ny);
  }
  // husk = spilleren valgte fanen selv (den åpnes neste gang); fanen et kort eller Neste-lappen åpner, huskes ikke
  function velgFane(id, husk) { if (!B.REGLER.FANER.some(f => f.id === id)) id = 'oversikt'; const ny = id !== fane; fane = id; les(); if (husk && H.fane !== id) { H.fane = id; lagre(); } if (ny) kropp.scrollTop = 0; sistKropp = ''; tegn(true); }

  // ett panel om gangen: det som står på samme plass (venstre, eller alt på telefon) lukkes – som spill/paneler.js gjør
  let førÅpne = new Set();
  function lukkAndre(beholdKontrakter) { try { if (window.Paneler && Paneler.viker && Paneler.åpne && Paneler.lukk) for (const id of Paneler.viker('selskap', Paneler.åpne(), smal())) if (id !== 'selskap') Paneler.lukk(id); } catch (e) { /* */ }
    try { if (typeof window.lukkPanel === 'function') window.lukkPanel(); } catch (e) { /* */ }
    const sel = $('selskap'); if (!beholdKontrakter && sel && sel.classList.contains('på') && !lånt && window.SelskapSpill) SelskapSpill.vis(false); }
  function vis(på, tilFane) {
    const nå = på === undefined ? !åpen : !!på;
    if (nå) { les(); if (!åpen) lukkAndre(tilFane === 'kontrakter'); åpen = true; P.classList.add('på'); velgFane(tilFane || H.fane || 'oversikt');
      førÅpne = new Set(window.Paneler && Paneler.åpne ? Paneler.åpne() : []); }
    else if (åpen) { åpen = false; P.classList.remove('på'); giTilbake(); P.classList.remove('ikontrakter'); }
    if (window.SpillHud && SpillHud.oppdater) try { SpillHud.oppdater(); } catch (e) { /* */ }
  }
  P.addEventListener('click', e => {
    if (e.target.closest('#selskap')) return;
    const f = e.target.closest('.sfaner button'); if (f) { e.stopPropagation(); velgFane(f.dataset.fane, true); return; }
    const b = e.target.closest('[data-sp]'); if (!b) return; e.stopPropagation(); const s = b.dataset.sp;
    if (s.startsWith('ba-') && window.ByavtaleSpill) { if (ByavtaleSpill.trykk(b)) { sistKropp = ''; tegn(); } return; }
    if (s.startsWith('ek-') && window.EksportSpill) { if (EksportSpill.trykk(b)) { sistKropp = ''; tegn(); } return; }
    if (s.startsWith('fi-') && window.FirmaSpill) { if (FirmaSpill.trykk(b)) { sistKropp = ''; tegn(); } return; }
    if (s.startsWith('bo-') && window.BorsSpill) { if (BorsSpill.trykk(b)) { sistKropp = ''; tegn(); } return; }
    if (s === 'lukk') vis(false);
    else if (s === 'gå') { const k = viktigste()[+b.dataset.i]; if (!k) return; if (k.l0) { if (k.l0.pek === 'selskap') { velgFane('kontrakter'); return; } vis(false); if (window.SelskapSpill && SelskapSpill.følgLapp) SelskapSpill.følgLapp(); } else if (k.trykk) { vis(false); k.trykk(); } }
    else if (s === 'by') { const by = byListe().find(q => String(q.id) === b.dataset.id); if (by && Number.isFinite(by.x)) { if (typeof på3d !== 'undefined' && på3d && typeof slå3d === 'function') slå3d(false); kam.x = by.x; kam.y = by.y; if (kam.m > 20) kam.m = 12; skitten = true; if (smal()) vis(false); } }
    else if (s === 'region') { vis(false); RegionSpill.åpne(); }
    else if (s === 'krig') { vis(false); const k = $('krigknapp'); if (k) k.click(); }
  });
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && åpen) vis(false); });
  // tast S (som spill/taster.js: ikke i tekstfelt, på startskjermen, med Ctrl/Alt, mens du går eller bygger)
  window.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || (e.key !== 's' && e.key !== 'S')) return; const t = e.target, tg = t && t.tagName;
    if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT' || (t && t.isContentEditable)) return;
    const st = $('oppstart'); if (st && st.classList.contains('på')) return; if (typeof R3 !== 'undefined' && R3 && R3.fot) return;
    const bv = $('byggvalg'); if (bv && getComputedStyle(bv).display !== 'none') return; if (!Sp() || !Sp().leir) return;
    e.preventDefault(); vis(); });
  // vaktmesteren: tegner jevnlig, lukker panelet når et annet åpnes på samme plass, og tar kontraktpanelet inn når noe annet åpner det
  setInterval(() => { try {
    const sel = $('selskap');
    // spilleren åpnet kontraktene et annet sted (Neste-lappen, Leir → Mål): de vises i fanen Kontrakter. I testene som før.
    if (auto() && sel && sel.classList.contains('på') && !lånt && sel.parentNode !== innleid) { vis(true, 'kontrakter'); return; }
    if (!åpen) return;
    // fanen Kontrakter står åpen, men kontraktpanelet ble lukket (av Esc eller av et annet panel): lukk hele
    if (lånt && sel && !sel.classList.contains('på')) { vis(false); return; }
    const nå = window.Paneler && Paneler.åpne ? Paneler.åpne() : [], nye = nå.filter(id => !førÅpne.has(id) && id !== 'selskap');
    if (nye.some(id => { const p = Paneler.plass ? Paneler.plass(id) : null; return p === 'venstre' || (smal() && p && p !== 'midt'); })) { vis(false); return; }
    førÅpne = new Set(nå); tegn(false);
  } catch (e) { /* neste runde */ } }, 400);
  // telefonen: panelet slutter over bunnmenyen og står i rekka over de andre (spill/skjermlag.js)
  setInterval(() => { const S = window.Skjermlag; if (!S) return; if (S.LØFT && !S.LØFT.includes('selskapet')) S.LØFT.push('selskapet'); if (S.SELV && !S.SELV.includes('selskapet')) S.SELV.push('selskapet'); }, 1000);

  // ---------- inngangene ----------
  // knappen «Selskapet» i kommandolinja (fra selskap-visning.js) åpner nå dette panelet; den heter «Selskap» og har tast S
  { const T = (window.KOMMANDO_TILLEGG || []).find(q => q.k === 'selskap');
    if (T) Object.assign(T, { navn: 'Selskap', tast: 'S', tittel: 'Selskapet: oversikt, veien videre, kontrakter og byer (S)', på: () => åpen || !!($('selskap') && $('selskap').classList.contains('på')), trykk: () => vis() });
    else (window.KOMMANDO_TILLEGG = window.KOMMANDO_TILLEGG || []).push({ k: 'selskap', navn: 'Selskap', tast: 'S', tittel: 'Selskapet: oversikt, veien videre, kontrakter og byer (S)', fins: () => !!(Sp() && Sp().leir), på: () => åpen, trykk: () => vis() }); }
  // «Selskapet» i ☰ (lagt inn av selskap-visning.js)
  { const b = $('vis-selskap'); if (b) b.onclick = () => { vis(true); const m = $('lagmeny'); if (m) m.classList.remove('på'); }; }

  // ---------- trinnet: huskes, meldes, og gir Neste-lappen et steg ----------
  let sistTrinnSjekk = 0;
  function sjekkTrinn() { if (!Sp() || !Sp().leir) return; const R = regnTrinn(); if (R.regnet > H.høyest) { const før = H.høyest; H.høyest = R.regnet; lagre();
    if (auto() && før >= 1) { const t = TR.REGLER.TRINN[R.regnet - 1]; if (typeof logg === 'function') logg(`Selskapet er nå på trinn ${t.nr} av ${TR.REGLER.TRINN.length}: ${t.navn} – ${t.du}. Se Selskap → Oversikt.`);
      try { if (window.DagbokSpill && DagbokSpill.noter) DagbokSpill.noter(`Selskapet nådde trinn ${t.nr}: ${t.navn}.`); } catch (e) { /* */ } } } }
  setInterval(() => { if (performance.now() - sistTrinnSjekk < 1900) return; sistTrinnSjekk = performance.now(); try { sjekkTrinn(); } catch (e) { /* */ } }, 2000);
  // spill/neste.js spør her: steget mot neste trinn (når ingenting mer akutt står foran det i lista)
  function lappInfo() { if (!Sp() || !Sp().leir) return null; const R = regnTrinn(); if (!R.steg) return null;
    return { tekst: R.steg.tekst, hjelp: R.steg.hjelp, om: R.steg.om, trinn: R.nr, trykk: () => gåTilSteg(R.steg.om) }; }
  // trykk på steget: dit det gjøres – Leir → Bygg for bygg, fanen Byer for tettsteder, fanen Kontrakter for kontraktene
  function gåTilSteg(om) { if (om === 'leir') { const lk = $('leirknapp'), lm = $('leirmeny'); if (lk && !(lm && lm.classList.contains('på'))) lk.click(); if (window.LeirSpill && LeirSpill.fane) LeirSpill.fane('bygg'); return; }
    vis(true, om === 'by' ? 'byer' : om === 'kontrakt' ? 'kontrakter' : 'oversikt'); }
  window.TrinnSpill = { regn: regnTrinn, bilde: trinnBilde, lappInfo, høyest: () => (les(), H.høyest) };

  // ---------- DEN FØRSTE HALVTIMEN: «Storlia Tømmer har hørt om dere» ----------
  const annetKort = () => ['levertkort', 'morgenkort', 'hendelse', 'samfunnkort', 'formkort', 'krigkort', 'angrepkort', 'alarm', 'etterspill'].some(id => { const e = $(id); return e && e.getClientRects().length > 0 && (id === 'levertkort' || e.classList.contains('på')); });
  let storliaVent = 0, storliaTid = 0, ventetFra = 0;
  function visStorlia(tving) {
    const gml = $('storliakort'); if (gml) gml.remove(); clearTimeout(storliaTid);
    const T = B.storliaTekst(navn(), regnTrinn()), k = document.createElement('div'); k.id = 'storliakort'; k.setAttribute('role', 'status');
    k.innerHTML = `<small>Nytt i selskapet</small><b>${esc(T.tittel)}</b><p>${esc(T.tekst)}</p><p>${esc(T.neste)}</p><div class="knapper"><button type="button" class="hoved" data-k="åpne">Åpne Selskapet</button><button type="button" data-k="ok">Senere</button></div>`;
    k.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; e.stopPropagation(); k.remove(); clearTimeout(storliaTid); if (b.dataset.k === 'åpne') vis(true, regnTrinn().nr >= 2 ? 'kontrakter' : 'oversikt'); });
    document.body.appendChild(k); H.storlia = true; lagre();
    if (!tving && typeof logg === 'function') logg(`${B.REGLER.storlia.firma} har hørt om dere. Neste mål: trinn 2, Leverandør – se Selskap → Oversikt.`);
    const t0 = performance.now(), se = () => { if (!k.isConnected) return; if (performance.now() - t0 > B.REGLER.storlia.vis * 1000) { k.remove(); return; } storliaTid = setTimeout(se, 1000); }; storliaTid = setTimeout(se, 1000);
    return k;
  }
  // venter til leveringskortet og andre kort er borte, så REGLER.storlia.vent sekunder til (spillet går videre imens)
  function planleggStorlia() { if (!auto()) return; les(); const { sd } = selskap(); if (!B.storliaNå(H, sd && sd.sum ? sd.sum.levert : 0)) return; clearTimeout(storliaVent); ventetFra = 0;
    const prøv = () => { les(); const q = selskap().sd; if (!B.storliaNå(H, q && q.sum ? q.sum.levert : 0)) return;
      if (annetKort() || document.hidden) { ventetFra = 0; storliaVent = setTimeout(prøv, 2000); return; }
      if (!ventetFra) ventetFra = performance.now(); if (performance.now() - ventetFra < B.REGLER.storlia.vent * 1000) { storliaVent = setTimeout(prøv, 1000); return; }
      visStorlia(false); };
    storliaVent = setTimeout(prøv, 1000); }
  window.addEventListener('riksbrudd-kontrakt', e => { if (e && e.detail && e.detail.type === 'levert') setTimeout(planleggStorlia, 500); });
  // et lagret spill der den første kontrakten alt er levert, får kortet én gang når spillet er klart
  window.addEventListener('riksbrudd-spill', () => setTimeout(() => { les(); sistHode = ''; sistKropp = ''; planleggStorlia(); }, 4000));

  Object.assign(API, { vis, erÅpen: () => åpen, fane: () => fane, velgFane, tegn: () => tegn(true), trinn: regnTrinn, storlia: visStorlia, husk: () => (les(), { ...H }), nullstillHusk: d => { les(); Object.assign(H, d || {}); lagre(); }, lesPåNytt: () => { H.leir = ''; les(); }, NØKKEL });
  window.SelskapetSpill = API;
})();
