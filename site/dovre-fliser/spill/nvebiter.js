'use strict';
// NVE-data for hele Norge (bekker/elver fra Elvenett og kraftledninger fra Nettanlegg, NLOD) i biter per blokk i flisnettet.
// Releasen NVE_TAG lages av pipeline/fliser/nve.py i .github/workflows/nve.yml og settes her av pipeline/fliser/bruk_nve.py.
// manifest.json sier hvor hver bit (blokk på z7 = 32 768 m, ett detaljnivå) ligger i bekker.json / kraft.json; en bit hentes via
// /api/kart/<tag>/<fil>/<fra>/<lengde> først når 2D-kartet eller 3D-utsnittet trenger den, og huskes (maks MAKS biter per lag).
// Svarer ikke releasen (eller NVE_TAG er tom), brukes reservefila for Dovre-piloten i data/ (alle nivåer i én bit).
// Reglene for hvilke blokker et område trenger (blokker) er uten DOM og testes i pipeline/fliser/test_nvebiter.js.
(function (rot) {
  const NVE_TAG = 'kart-nve-2d1249891ac1';
  const MAKS = 160;

  // nøklene «bx,by» til blokkene som berører bb = [x0, y0, x1, y1] (meter, EPSG:25833)
  function blokker(man, bb) {
    const s = man.span, ut = [];
    const a0 = Math.floor((bb[0] - man.x0) / s), a1 = Math.floor((bb[2] - man.x0) / s), b0 = Math.floor((man.y0 - bb[3]) / s), b1 = Math.floor((man.y0 - bb[1]) / s);
    if (a1 - a0 > 40 || b1 - b0 > 40) return ut;
    for (let a = a0; a <= a1; a++) for (let b = b0; b <= b1; b++) ut.push(a + ',' + b);
    return ut;
  }

  let manifest = null;
  function hentManifest() {
    if (manifest) return manifest;
    manifest = (!NVE_TAG || /ingen$/.test(NVE_TAG) || typeof fetch === 'undefined') ? Promise.resolve(null)
      : fetch(`/api/kart/${NVE_TAG}/manifest.json/0/1048576`).then(r => (r.ok ? r.json() : null)).then(m => (m && m.versjon === NVE_TAG ? m : null)).catch(() => null);
    return manifest;
  }

  // Ett lag: navn = 'bekker' | 'kraft', reserve = adressen til Dovre-fila, les(json, nivå) = gjør en bit om til visningens form.
  // hent(bb, nivåer) -> Promise med bitene (lastet), har(bb, nivåer) -> bitene som alt er lastet (og bestiller resten; påLastet() kalles når en kommer).
  function lag(navn, reserve, les, påLastet) {
    const biter = new Map(), venter = new Map(), STAT = { hentet: 0, byte: 0, feil: 0, kilde: null };
    let res = null;
    const klar = hentManifest().then(m => {
      if (m && m[navn]) { STAT.kilde = 'release'; return m; }
      STAT.kilde = 'reserve';
      res = fetch(reserve).then(r => (r.ok ? r.json() : null)).then(d => (d ? les(d, -1) : null)).catch(() => null);
      return null;
    });
    function husk(k, v) { biter.delete(k); biter.set(k, v); while (biter.size > MAKS) biter.delete(biter.keys().next().value); }
    function bestill(m, k, nv) {
      const nøkkel = k + ':' + nv; if (biter.has(nøkkel)) { const v = biter.get(nøkkel); husk(nøkkel, v); return Promise.resolve(v); }
      if (venter.has(nøkkel)) return venter.get(nøkkel);
      const r = m[navn][k], b = r && r[nv];
      if (!b || !b[1]) { husk(nøkkel, null); return Promise.resolve(null); }
      const p = fetch(`/api/kart/${NVE_TAG}/${navn}.json/${b[0]}/${b[1]}`).then(s => { if (!s.ok) throw new Error('HTTP ' + s.status); return s.text(); })
        .then(t => { STAT.hentet++; STAT.byte += t.length; const v = les(JSON.parse(t), nv); husk(nøkkel, v); venter.delete(nøkkel); if (påLastet) påLastet(); return v; })
        .catch(e => { STAT.feil++; venter.delete(nøkkel); console.warn('nve', navn, k, e && e.message); return null; });
      venter.set(nøkkel, p); return p;
    }
    async function hent(bb, nivåer) {
      const m = await klar;
      if (!m) { const r = await res; return r ? [r] : []; }
      const ps = []; for (const k of blokker(m, bb)) for (const nv of nivåer) ps.push(bestill(m, k, nv));
      return (await Promise.all(ps)).filter(Boolean);
    }
    let mSync = undefined, rSync = null;
    klar.then(m => { mSync = m; if (!m && res) res.then(r => { rSync = r; if (r && påLastet) påLastet(); }); else if (påLastet) påLastet(); });
    function har(bb, nivåer) {
      if (mSync === undefined) return [];
      if (!mSync) return rSync ? [rSync] : [];
      const ut = [];
      for (const k of blokker(mSync, bb)) for (const nv of nivåer) { const n = k + ':' + nv; if (biter.has(n)) { const v = biter.get(n); if (v) ut.push(v); } else bestill(mSync, k, nv); }
      return ut;
    }
    return { hent, har, klar, STAT };
  }

  const NveBiter = { NVE_TAG, blokker, lag, MAKS };
  if (typeof module !== 'undefined' && module.exports) module.exports = NveBiter; else rot.NveBiter = NveBiter;
})(typeof window !== 'undefined' ? window : globalThis);
