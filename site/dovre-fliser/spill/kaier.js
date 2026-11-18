/* Riksbrudd – KAIER OG HAVNER i hele Norge (17. nov, brukeren: «kan vi få med alle plasser hvor det er kaier, da det senere kan være
 * et strategisk område å plassere leiren»). Dataene lages av pipeline/fliser/kaier.py (OpenStreetMap, ODbL) -> release
 * kart-kaier-<hash>, tas i bruk med bruk_kaier.py (KAIER_TAG under). Reglene øverst uten DOM (Node: require('./kaier')),
 * visningen nederst: merker i 2D-kartet etter målestokken, trykk på et merke gir navnet, kailengden og avstanden til leiren,
 * «Kaier» av/på i ☰. window.Kaier (regler) og window.KaierSpill.
 */
(function (rot) {
  'use strict';
  const NAVN = { 1: 'Kai', 2: 'Småbåthavn', 3: 'Havn', 4: 'Ferjeterminal' };
  // Les fila: { n, navn, d: [dx, dy, t, l, navn] } -> kolonner sortert på x.
  function les(o) { const n = o && o.d ? Math.floor(o.d.length / 5) : 0, K = { n, x: new Int32Array(n), y: new Int32Array(n), t: new Uint8Array(n), l: new Int32Array(n), ni: new Int32Array(n), navn: (o && o.navn) || [] };
    let x = 0, y = 0; for (let i = 0; i < n; i++) { const j = i * 5; x += o.d[j]; y += o.d[j + 1]; K.x[i] = x; K.y[i] = y; K.t[i] = o.d[j + 2]; K.l[i] = o.d[j + 3]; K.ni[i] = o.d[j + 4]; } return K; }
  // første plass med x >= X (binærsøk)
  function fra(K, X) { let a = 0, b = K.n; while (a < b) { const m = (a + b) >> 1; if (K.x[m] < X) a = m + 1; else b = m; } return a; }
  // plassene innenfor boksen
  function iBoks(K, x0, x1, y0, y1) { const ut = []; for (let i = fra(K, x0); i < K.n && K.x[i] <= x1; i++) if (K.y[i] >= y0 && K.y[i] <= y1) ut.push(i); return ut; }
  // nærmeste sted innen r meter: { i, d } eller null. filter(i) kan velge bort
  function nær(K, x, y, r, filter) { let best = null; for (let i = fra(K, x - r); i < K.n && K.x[i] <= x + r; i++) { if (filter && !filter(i)) continue; const d = Math.hypot(K.x[i] - x, K.y[i] - y); if (d <= r && (!best || d < best.d)) best = { i, d }; } return best; }
  // Vises stedet ved denne målestokken (m = meter per punkt på skjermen)? Store ting langt ute, småkaier først nær.
  function vises(t, l, m) { if (t >= 3) return m < 160; if (t === 2) return m < 70; return l >= 150 ? m < 70 : l >= 50 ? m < 28 : m < 11; }
  const navn = (K, i) => (K.ni[i] ? K.navn[K.ni[i] - 1] : ''), tekst = (K, i) => { const n = navn(K, i), t = NAVN[K.t[i]] || 'Kai'; return (n ? `${n} (${t.toLowerCase()})` : t) + (K.l[i] > 0 ? `, ${K.l[i]} m kai` : ''); };
  // Hvor god er kaien for en leir? Større fartøy trenger lang kai: 'liten' (småbåter), 'middels' (sjark, lekter), 'stor' (lasteskip, ferje).
  const størrelse = (t, l) => (t >= 3 || l >= 150 ? 'stor' : t === 2 || l >= 50 ? 'middels' : 'liten');
  const api = { NAVN, les, fra, iBoks, nær, vises, navn, tekst, størrelse };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  rot.Kaier = api;

  // ---------- visningen ----------
  const KAIER_TAG = 'kart-kaier-c1e697d7cce4';
  let K = null, henter = false, vis = true, valgtKai = -1;
  try { vis = localStorage.getItem('riksbrudd-kaier') !== '0'; } catch (e) { vis = true; }
  async function hent(forsøk = 1) { if (!KAIER_TAG || K || henter) return; henter = true;
    try { const m = await hentManifest(KAIER_TAG); if (!m) throw new Error('fikk ikke manifestet'); const f = m.filer.kaier[0], BIT = 4194304, biter = [];
      for (let a = 0; a < f.byte; a += BIT) biter.push(hentMedFrist(`/api/kart/${KAIER_TAG}/${f.fil}/${a}/${Math.min(BIT, f.byte - a)}`, 60000, 'arrayBuffer').then(s => { if (!s.r.ok) throw new Error('HTTP ' + s.r.status); return s.data; }));
      const deler = await Promise.all(biter), alt = new Uint8Array(deler.reduce((a, d) => a + d.byteLength, 0)); let p = 0; for (const d of deler) { alt.set(new Uint8Array(d), p); p += d.byteLength; }
      K = les(JSON.parse(new TextDecoder().decode(alt))); skitten = true; const k = document.getElementById('kilde'); if (k && !k.textContent.includes('Kaier')) k.textContent += ' · Kaier: © OpenStreetMap-bidragsytere (ODbL)';
    } catch (e) { if (forsøk < 3) setTimeout(() => { henter = false; hent(forsøk + 1); }, 60000 * forsøk); return; } finally { if (K) henter = false; } }
  setTimeout(hent, 3000);
  const FARGE = { 1: '#9fc0dc', 2: '#8fd0c0', 3: '#e8d48a', 4: '#a9c6df' };
  function merke(g, x, y, t, r, valgt) { g.fillStyle = 'rgba(15,11,7,.82)'; g.strokeStyle = FARGE[t] || FARGE[1]; g.lineWidth = valgt ? 2.4 : 1.4; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); g.stroke();
    // anker: stokk, tverrstang og bue
    const s = r * .58; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y - s); g.lineTo(x, y + s); g.moveTo(x - s * .55, y - s * .45); g.lineTo(x + s * .55, y - s * .45); g.moveTo(x - s, y + s * .15); g.quadraticCurveTo(x - s * .8, y + s, x, y + s); g.quadraticCurveTo(x + s * .8, y + s, x + s, y + s * .15); g.stroke(); }
  // 18. nov (nattarbeid «ui»): færre merker som standard – index.html (KAI_VIKTIG) sier om kaien betyr noe for det du gjør nå
  const viktig = (i, m) => typeof KAI_VIKTIG !== 'function' || KAI_VIKTIG(K.x[i], K.y[i], K.t[i], K.l[i], m);
  KROKER.tegn.push((g, vx0, vy1) => { if (!K || !vis) return; const m = kam.m; if (m >= 160) return; const x1 = vx0 + VW * m, y0 = vy1 - VH * m, I = iBoks(K, vx0 - 20 * m, x1 + 20 * m, y0 - 20 * m, vy1 + 20 * m);
    g.save(); g.font = '12.5px "Cormorant Garamond", serif'; g.textAlign = 'center'; let tegnet = 0;
    for (const i of I) { const t = K.t[i]; if (!(vises(t, K.l[i], m) && viktig(i, m)) && i !== valgtKai) continue; if (++tegnet > 600) break; const x = (K.x[i] - vx0) / m, y = (vy1 - K.y[i]) / m, r = t >= 3 ? 8 : t === 2 || K.l[i] >= 150 ? 7 : 5.5; merke(g, x, y, t, r, i === valgtKai);
      const n = navn(K, i); if (n && (m < (t >= 3 ? 40 : 9) || i === valgtKai)) { const yt = window.Etikett ? Etikett.tekst(g, n, x, y + r + 12, 1) : y + r + 12; g.lineWidth = 3; g.strokeStyle = 'rgba(15,11,7,.85)'; g.strokeText(n, x, yt); g.fillStyle = FARGE[t] || FARGE[1]; g.fillText(n, x, yt); } }
    g.restore(); });
  // trykk på et merke: sist i lista, så lag, bygg og annet går foran
  KROKER.trykk.push((X, Y) => { if (rot.SjoSpill && SjoSpill.trykk(X, Y)) return true; if (!K || !vis || kam.m >= 160) return false; const f = nær(K, X, Y, 13 * kam.m, i => vises(K.t[i], K.l[i], kam.m) && viktig(i, kam.m)); if (!f) { if (valgtKai >= 0) { valgtKai = -1; skitten = true; } return false; }
    valgtKai = f.i; skitten = true;
    // sjøen (spill/sjo-visning.js): en båt som venter på et mål, seiler hit; ellers åpnes kaia i sjøpanelet
    if (rot.SjoSpill && SjoSpill.kai(f.i)) return true;
    const S = rot.OppstartSpill && OppstartSpill.tilstand(), L = S && S.leir, d = L ? Math.hypot(K.x[f.i] - L.x, K.y[f.i] - L.y) : null, st = størrelse(K.t[f.i], K.l[f.i]);
    logg(`${tekst(K, f.i)}. ${st === 'stor' ? 'Stor nok for lasteskip og ferjer.' : st === 'middels' ? 'Passer for sjarker og lektere.' : 'Bare for småbåter.'}${d !== null ? ` ${d < 1000 ? Math.round(d / 10) * 10 + ' m' : (d / 1000).toFixed(d < 10000 ? 1 : 0).replace('.', ',') + ' km'} fra leiren.` : ''}`); return true; });
  // ---------- av/på i ☰ ----------
  const meny = document.getElementById('lagmeny'); if (meny) { const b = document.createElement('button'); b.id = 'vis-kaier'; b.textContent = 'Kaier'; const sett = () => { b.classList.toggle('av', !vis); b.setAttribute('aria-pressed', String(vis)); };
    b.onclick = () => { vis = !vis; try { localStorage.setItem('riksbrudd-kaier', vis ? '1' : '0'); } catch (e) { /* sperret */ } sett(); skitten = true; }; sett(); meny.appendChild(b); }
  rot.KaierSpill = { data: () => K, tag: KAIER_TAG, hent, settData: o => { K = o && o.d ? les(o) : o || null; valgtKai = -1; skitten = true; return K; }, nær: (x, y, r) => (K ? nær(K, x, y, r) : null), tekst: i => (K ? tekst(K, i) : ''), vis: v => { if (v !== undefined) { vis = !!v; skitten = true; } return vis; } };
})(typeof globalThis !== 'undefined' ? globalThis : this);
