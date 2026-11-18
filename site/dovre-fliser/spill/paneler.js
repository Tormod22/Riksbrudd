'use strict';
/* Riksbrudd – PANELENE SOM ÉN FAMILIE (18. nov, runde 2 av nattarbeidet «ui»). Åtte pakker la til egne paneler uten å se hverandre:
 * ulike rammer, skrifter og lukkeknapper, og de åpnet seg oppå hverandre. Denne fila (lastes sist blant panelene) gir:
 *  1. SAMME RAMME: mørk flate, gullkant, tittel i IM Fell English, samme lukkeknapp – for id-ene i NYE (de gamle har stilen fra spillhud.js).
 *  2. FASTE PLASSER: venstre (menyer), høyre (ark), midt (kort). Åpner du et panel, lukkes det som sto på samme plass – ved å trykke
 *     på panelets egen lukkeknapp, så eieren rydder selv. På telefon deler venstre og høyre plass (de dekker hverandre der).
 *     Dette skjer bare rett etter at SPILLEREN har trykket eller tastet (ekte hendelse siste 1,5 s) – eller når Paneler.test = true –
 *     så kontrollskriptet, som åpner panelene fra koden, får ha dem åpne samtidig som før.
 * Reglene øverst er uten DOM (Paneler.plass/viker – test_paneler.js). window.Paneler.
 */
(function (rot) {
  const PLASS = { venstre: ['leirmeny', 'folkmeny', 'samfunnmeny', 'region', 'krig'], høyre: ['karakterark', 'verdenpanel', 'sjopanel', 'krigpanel', 'sekk', 'tropppanel', 'stridpanel'], midt: ['personkort', 'evpanel'] };
  const plass = id => Object.keys(PLASS).find(p => PLASS[p].includes(id)) || null;
  // hvilke åpne paneler som må vike når «ny» åpnes (smal = telefon: venstre og høyre er samme plass)
  function viker(ny, åpne, smal) { const p = plass(ny); if (!p) return []; const samme = q => q === p || (smal && p !== 'midt' && q !== 'midt' && q !== null); return åpne.filter(id => id !== ny && samme(plass(id))); }
  const Paneler = { PLASS, plass, viker, test: false };
  if (typeof module !== 'undefined' && module.exports) { module.exports = Paneler; return; }
  rot.Paneler = Paneler;
  const $ = id => document.getElementById(id), ALLE = Object.values(PLASS).flat();
  const NYE = ['region', 'samfunnmeny', 'personkort', 'samfunnkort', 'krigpanel', 'verdenpanel', 'sjopanel', 'evpanel', 'flytkort', 'flytgruppe', 'marsjvalg', 'hendelse'], sel = (e, f = '') => NYE.map(id => `body #${id}${e}${f}`).join(', ');
  const css = document.createElement('style');
  css.textContent = `${sel('')}{ background:linear-gradient(180deg,#241c10 0,#17120a 150px); border:1px solid #8a7440; box-shadow:0 0 0 1px #0d0a06, inset 0 1px 0 rgba(255,230,160,.06), 0 12px 34px rgba(0,0,0,.65); border-radius:4px; color:var(--ink,#e7dcc3); scrollbar-width:thin; scrollbar-color:#5a4f38 transparent; }
${sel(' h2')}{ font-family:"IM Fell English",serif; font-weight:400; font-size:21px; letter-spacing:.03em; margin-top:0; padding-bottom:5px; border-bottom:1px solid #5a4a2a; }
${sel(' h3')}{ font-family:inherit; font-size:13px; letter-spacing:.07em; text-transform:uppercase; color:#c9b26a; font-weight:600; }
#personkort h3, #samfunnkort h3, #hendelse h3, #flytkort h3{ font-family:"IM Fell English",serif; font-size:19px; letter-spacing:.02em; text-transform:none; font-weight:400; color:#f0dc9a; }
${sel(' .lukk')}{ width:30px; height:30px; padding:0; line-height:1; font-size:17px; background:linear-gradient(180deg,#2a2215,#17120a); border:1px solid #5a4a2a; border-radius:3px; color:var(--ink,#e7dcc3); cursor:pointer; float:none; margin:0; }
${sel(' .lukk', ':hover')}{ border-color:#e8d48a; }
${sel(' button:not(.lukk)')}{ background:#241c10; border:1px solid #5a4a2a; color:var(--ink,#e7dcc3); border-radius:3px; font:inherit; } ${sel(' button:not(.lukk):not(:disabled)', ':hover')}{ border-color:#c9b26a; } ${sel(' button', ':disabled')}{ opacity:.45; }
body.spill #region, body.spill #samfunnmeny{ left:10px; top:calc(var(--topp,58px) + 6px); z-index:7; max-height:calc(100% - var(--topp,58px) - 76px); overflow-y:auto; }
body.spill #verdenpanel, body.spill #sjopanel, body.spill #krigpanel, body.spill #karakterark, body.spill #tropppanel, body.spill #sekk{ right:10px; left:auto; top:calc(var(--topp,58px) + 6px); z-index:11; max-height:calc(100% - var(--topp,58px) - 76px); overflow-y:auto; }
body #region .lukk, body #krigpanel .lukk, body #verdenpanel .lukk, body #sjopanel .lukk, body #evpanel .lukk, body #personkort .lukk{ position:absolute; right:8px; top:8px; }
body #flytgruppe{ z-index:5; }
body #personkort, body #evpanel{ z-index:14; } body #samfunnkort, body #hendelse, body #flytkort{ z-index:15; }
body.kort #region, body.kort #samfunnmeny, body.kort #verdenpanel, body.kort #sjopanel, body.kort #krigpanel{ left:calc(8px + env(safe-area-inset-left,0px)); right:calc(8px + env(safe-area-inset-right,0px)); top:calc(var(--topp,44px) + 4px); bottom:calc(6px + env(safe-area-inset-bottom,0px)); width:auto; max-width:none; max-height:none; overflow-y:auto; z-index:11; }
body.kort #personkort, body.kort #evpanel, body.kort #samfunnkort{ left:calc(8px + env(safe-area-inset-left,0px)); right:calc(8px + env(safe-area-inset-right,0px)); width:auto; max-width:none; max-height:calc(100% - var(--topp,44px) - 20px); overflow-y:auto; transform:none; }
@keyframes panelinn2{ from{ opacity:0; translate:0 8px; } } #region.på, #samfunnmeny.på, #verdenpanel.på, #sjopanel.på, #krigpanel.på, #evpanel.på, #personkort.på, #samfunnkort.på{ animation:panelinn2 .18s ease-out; }
@media (prefers-reduced-motion:reduce){ #region.på, #samfunnmeny.på, #verdenpanel.på, #sjopanel.på, #krigpanel.på, #evpanel.på, #personkort.på, #samfunnkort.på{ animation:none; } }`;
  document.head.appendChild(css);
  // ---------- ett panel per plass ----------
  let sistEkte = 0; for (const t of ['pointerdown', 'keydown', 'click']) window.addEventListener(t, e => { if (e.isTrusted) sistEkte = performance.now(); }, true);
  const vises = id => { const e = $(id); return !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden'; };
  function lukk(id) { const e = $(id); if (!e) return false;
    if (id === 'krig') { if (rot.StrategiSpill && StrategiSpill.erÅpen && StrategiSpill.erÅpen() && $('krigknapp')) { $('krigknapp').click(); return true; } return false; }
    if (id === 'leirmeny') { if ($('leirknapp')) { $('leirknapp').click(); return true; } return false; }
    if (id === 'stridpanel') { if (rot.StridSpill && StridSpill.lukk) { StridSpill.lukk(); return true; } e.classList.remove('på'); return true; }
    const b = e.querySelector('.lukk, button[aria-label^="Lukk"]'); if (b) { b.click(); return true; } return false; }
  let før = new Set();
  function sjekk() { const nå = new Set(ALLE.filter(vises)), nye = [...nå].filter(id => !før.has(id));
    if (nye.length && (Paneler.test === true || performance.now() - sistEkte < 1500)) { const smal = document.body.classList.contains('kort'), ny = nye[nye.length - 1];
      for (const id of viker(ny, [...nå], smal)) { if (lukk(id)) nå.delete(id); }
      // et panel på venstre plass dekker lagpanelet nede til venstre: det lukkes (som Leir og Folk alt gjør)
      if ((plass(ny) === 'venstre' || smal) && plass(ny) !== 'midt' && typeof rot.lukkPanel === 'function' && vises('panel')) rot.lukkPanel(); }
    før = new Set(ALLE.filter(vises)); }
  setInterval(sjekk, 120);
  Paneler.sjekk = sjekk; Paneler.åpne = () => ALLE.filter(vises); Paneler.lukk = lukk; Paneler.NYE = NYE;
})(typeof globalThis !== 'undefined' ? globalThis : this);
