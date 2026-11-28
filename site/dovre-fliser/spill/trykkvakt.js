'use strict';
/* Riksbrudd – TRYKKVAKT (28. nov, pakke «ut8-kr-telefon»; kritikken fra Jonas Bakke: «Gi lønnstillegg» virket ikke på 60×, og en flis i
 * Leir → Bygg var borte før fingeren slapp – knappene virket først når spillet sto på pause).
 *
 * Årsaken: paneler som tegnes på nytt (hvert sekund, eller når en leder/jobbtavla/søkerne endrer noe i KROKER.sim) bytter ut knappen
 * mellom «ned» og «opp». Med mus fyrer nettleseren da ingen «click» i det hele tatt (målt: pointerdown på den gamle knappen,
 * pointerup på den nye – ingen klikk). På høy fart endrer tekstene seg hvert sekund, så det skjer ofte.
 *
 * Tre ting her, generelt for alle paneler:
 *  1. pekerNede(el) (index.html) svarer også sant i REGLER.hold ms etter at fingeren slapp – men ikke mens nettleseren behandler et
 *     trykk (window.event), så panelet som skal oppdateres av selve knappen, gjør det med en gang. Paneler som tegnes av seg selv
 *     (timer, KROKER.sim), venter da til klikket er levert.
 *  2. Et tapt klikk leveres likevel: ble knappen fingeren gikk ned på byttet ut, og står det en like knapp (samme merke, tekst, id
 *     og data-felter) der fingeren slapp, får den klikket – én gang (enten nettleseren sendte klikket eller ikke).
 *  3. Trykkvakt.bytt(boks, nye): et panel som tegnes på nytt, beholder de delene som ikke er endret (samme node, samme knapp), så
 *     knappene beholder identiteten sin. Brukes av Folk-panelet (spill/folk-visning.js).
 *
 * Reglene (likKnapp, beholde) er rene funksjoner uten DOM-avhengighet utover nodenes egenskaper (test: pipeline/fliser/test_trykkvakt.js).
 */
(function (rot) {
  // Claudes forslag: hvor lenge et panel venter etter at fingeren slapp (ms), hvor langt fingeren kan ha flyttet seg (px) før det
  // regnes som en dra-bevegelse og ikke et trykk, og hvor lenge vi venter på nettleserens eget klikk før det leveres (ms)
  const REGLER = { hold: 350, flytt: 12, ventKlikk: 60 };
  const KLIKKBAR = 'button, [role="button"], a[href], summary, .bygg.kort, [data-klikk]';

  // ---------- reglene ----------
  // nøkkel(n): det som gjør to knapper «like» – merket, tekst, id og data-felter (ikke klasse/stil, som kan skifte med tilstanden)
  function nøkkel(n) {
    if (!n || !n.tagName) return '';
    const data = []; const at = n.attributes || [];
    for (let i = 0; i < at.length; i++) { const a = at[i]; if (a.name === 'id' || a.name.startsWith('data-') || a.name === 'aria-label') data.push(a.name + '=' + a.value); }
    return n.tagName + '|' + String(n.textContent || '').replace(/\s+/g, ' ').trim() + '|' + data.sort().join(',');
  }
  const likKnapp = (a, b) => !!a && !!b && a !== b && nøkkel(a) === nøkkel(b);
  // har(n): noden har en hendelse satt som egenskap (onclick, onchange …) – da kan vi ikke bytte innholdet under den
  const HENDELSER = ['onclick', 'onchange', 'oninput', 'onkeydown', 'onpointerdown', 'onpointerup', 'onmousedown', 'onsubmit'];
  const har = n => HENDELSER.some(h => typeof n[h] === 'function');
  // ident(n): id og data-felter – to bokser med ulik ident er to ulike ting (søker 1 og søker 2), og byttes helt
  function ident(n) { const ut = []; const at = n.attributes || []; for (let i = 0; i < at.length; i++) { const a = at[i]; if (a.name === 'id' || a.name.startsWith('data-')) ut.push(a.name + '=' + a.value); } return n.tagName + '|' + ut.sort().join(','); }

  // ---------- bytt(boks, nye): behold det som er likt ----------
  // gml og ny er elementer: like (outerHTML) -> behold gml. Samme merke og ident, uten hendelser på noen av dem og like mange barn
  // -> behold gml, rett attributtene og gå inn i barna. Ellers byttes gml ut med ny.
  function flett(gml, ny) {
    if (gml.nodeType === 3 && ny.nodeType === 3) { if (gml.nodeValue !== ny.nodeValue) gml.nodeValue = ny.nodeValue; return gml; }
    if (gml.nodeType !== 1 || ny.nodeType !== 1) { gml.replaceWith(ny); return ny; }
    if (gml.outerHTML === ny.outerHTML) return gml;
    if (gml.tagName !== ny.tagName || ident(gml) !== ident(ny) || har(gml) || har(ny) || gml.childNodes.length !== ny.childNodes.length
      || /^(SELECT|INPUT|TEXTAREA|OPTION|IMG|CANVAS|SVG)$/i.test(gml.tagName)) { gml.replaceWith(ny); return ny; }
    // attributtene
    for (const a of [...gml.attributes]) if (!ny.hasAttribute(a.name)) gml.removeAttribute(a.name);
    for (const a of [...ny.attributes]) if (gml.getAttribute(a.name) !== a.value) gml.setAttribute(a.name, a.value);
    const G = [...gml.childNodes], N = [...ny.childNodes];
    for (let i = 0; i < G.length; i++) flett(G[i], N[i]);
    return gml;
  }
  // bytt(boks, nye): nye = liste med noder (eller et element med barna som skal inn). Svarer antall noder som ble beholdt.
  function bytt(boks, nye) {
    const N = Array.isArray(nye) ? nye : [...(nye.childNodes || [])];
    const G = [...boks.childNodes]; let beholdt = 0;
    if (G.length !== N.length || !G.length) { boks.replaceChildren(...N); return 0; }
    for (let i = 0; i < G.length; i++) { const r = flett(G[i], N[i]); if (r === G[i]) beholdt++; }
    return beholdt;
  }

  const api = { REGLER, nøkkel, likKnapp, ident, bytt, flett, test: false, levert: 0 };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  rot.Trykkvakt = api;
  if (typeof document === 'undefined') return;

  // ---------- 1: pekerNede holder litt etter at fingeren slapp ----------
  let ned = null, sistOpp = null;
  const iHendelse = () => { const e = rot.event; return !!(e && e.type && !/^(pointermove|mousemove|scroll|wheel)$/.test(e.type)); };
  function koble() {
    const orig = rot.pekerNede; if (typeof orig !== 'function' || orig.__trykkvakt) return typeof orig === 'function';
    const ny = el => { if (!el) return false; if (orig(el)) return true;
      return !!(sistOpp && performance.now() - sistOpp.t < REGLER.hold && sistOpp.el && el.contains(sistOpp.el) && !iHendelse()); };
    ny.__trykkvakt = true; rot.pekerNede = ny; return true;
  }
  if (!koble()) { const t = setInterval(() => { if (koble()) clearInterval(t); }, 200); }

  // ---------- 2: tapte klikk leveres ----------
  const klikkbar = n => (n && n.closest ? n.closest(KLIKKBAR) : null);
  rot.addEventListener('pointerdown', e => { if (!e.isTrusted) return; sp('ned', e.pointerType + ' ' + Math.round(e.clientX) + ',' + Math.round(e.clientY) + ' ' + (e.target.id || e.target.tagName)); if (e.button > 0) { ned = null; return; } const k = klikkbar(e.target); ned = k ? { k, sig: nøkkel(k), x: e.clientX, y: e.clientY, klikk: false } : null; }, true);
  rot.addEventListener('pointercancel', e => { if (e.isTrusted) { ned = null; sistOpp = null; } }, true);
  function finnLik(n, x, y) {
    if (!n || n.k.isConnected) return null;
    const under = document.elementFromPoint(x, y), k = klikkbar(under);
    return k && k !== n.k && nøkkel(k) === n.sig && !k.disabled ? k : null;
  }
  function lever(n, k) { if (n.klikk) return; n.klikk = true; api.levert++; try { k.click(); } catch (x) { /* knappen feilet selv */ } }
  // de siste avgjørelsene (for feilsøking og vakta): [hva, tekst]
  const spor = api.spor = []; const sp = (h, t) => { spor.push([h, t]); if (spor.length > 12) spor.shift(); };
  rot.addEventListener('pointerup', e => {
    // (andre moduler sender egne pointer-hendelser – de er ikke fingeren)
    if (!e.isTrusted) return; sp('opp', e.pointerType + ' ' + Math.round(e.clientX) + ',' + Math.round(e.clientY)); sistOpp = { t: performance.now(), el: e.target };
    const n = ned; if (!n) return; n.ux = e.clientX; n.uy = e.clientY;
    if (Math.hypot(e.clientX - n.x, e.clientY - n.y) > REGLER.flytt) { ned = null; return; }
    // kom ikke nettleserens eget klikk (mus: knappen ble byttet mens den var nede), leveres det her
    setTimeout(() => { if (ned !== n || n.klikk) { sp('vent', ned !== n ? 'ny peker' : 'klikket kom'); return; } const k = finnLik(n, n.ux, n.uy); sp('vent', k ? 'levert' : n.k.isConnected ? 'samme knapp' : 'ingen lik ved ' + Math.round(n.ux) + ',' + Math.round(n.uy) + ' (' + ((document.elementFromPoint(n.ux, n.uy) || {}).tagName || '-') + ')'); if (k) lever(n, k); }, REGLER.ventKlikk);
  }, true);
  rot.addEventListener('click', e => {
    const n = ned; if (!n || !e.isTrusted) return; sp('klikk', (e.target.id || e.target.tagName) + (n.k.isConnected ? ' (samme)' : ' (byttet)'));
    // klikket gikk til den nye knappen (berøring treffer det som står der fingeren slapp): ferdig
    if (n.k.isConnected || (n.klikk)) { n.klikk = true; return; }
    const k = finnLik(n, e.clientX, e.clientY);
    if (k && !k.contains(e.target)) { e.stopPropagation(); e.preventDefault(); lever(n, k); return; }
    n.klikk = true;
  }, true);
})(typeof globalThis !== 'undefined' ? globalThis : this);
