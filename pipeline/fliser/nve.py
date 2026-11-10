"""Bekker/elver og kraftledninger for HELE Norge fra NVE (NLOD) -> biter per blokk i flisnettet, release kart-nve-<hash>.

Kilder (kart.nve.no/enterprise, ArcGIS REST, EPSG:25833):
  Elvenett1/MapServer/2      Elvenett (ELVIS): ElvBekk (type 0) og ElvBekkMidtlinje (type 1, brede elver), Strahler-orden
  Nettanlegg5/MapServer/0,1  transmisjons- og regionalnett (luftledning), /3 master, /4 trafostasjoner
  Nettanlegg4/MapServer/2    distribusjonsnett (22 kV)
Samme regler som Dovre-skriptene bekker.py og kraft.py (de lager de små reservefilene i site/dovre-fliser/data/).
Kulvert (bekk under veg) kuttes IKKE her, men i 3D-visningen mot vegene i utsnittet (spill/bekker-visning.js, u.påVeg).

Bitdeling: blokker på BLOKK_Z (z7 = 32 768 m) i flisnettet (felles.py). Linjene klippes ved blokkanten.
  bekker.json: bitene etter hverandre, hver bit er et JSON-objekt i samme format som data/bekker.json
               {"x0", "y0" (blokkens hjørne), "linjer": [[type, orden, navn-nr, x, y, dx, dy, ...]], "navn": [...]}.
               Tre nivåer per blokk: 0 grov (brede elver og orden ≥ 5), 1 mellom (orden 3–4), 2 fin (orden 1–2).
  kraft.json:  bitene etter hverandre {"x0", "y0", "d": 1, "linjer": [{"kv", "n", "navn", "m": [x, y, dx, dy, ...], "e"}], "trafo": [[x, y, kv]]}
               (m og trafo relativt til x0, y0). To nivåer: 0 transmisjon/regional (+ trafo), 1 distribusjon (22 kV).
               En mastrekke som krysser blokkanten tar med første mast i neste blokk (spennet over kanten er i blokken der det starter);
               visningen slår sammen like master (Kraft.utsnitt).
  manifest.json: {"versjon": tag, "z": 7, "x0", "y0", "span", "bekker": {"bx,by": [[fra, lengde], ...3]}, "kraft": {"bx,by": [[fra, lengde], ...2]}, ...}
               lengde 0 = tom bit. Hver bit hentes for seg via /api/kart/<tag>/<fil>/<fra>/<lengde> (Vercel komprimerer svaret).
Bruk: python3 nve.py UTMAPPE        (hurtiglager for NVE-svarene: arbeid/nve/)
"""
import os, sys, json, time, math, hashlib, urllib.request, urllib.parse
from concurrent.futures import ThreadPoolExecutor
from shapely.geometry import LineString, box
from shapely import STRtree

HER = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HER)
from felles import X0, Y0, span
import kraft as KR

NVE = 'https://kart.nve.no/enterprise/rest/services/'
ARB = os.path.join(HER, 'arbeid', 'nve')
BLOKK_Z = 7
SPAN = span(BLOKK_Z)
TYPE = {'ElvBekk': 0, 'ElvBekkMidtlinje': 1}
TRÅDER = int(os.environ.get('NVE_TRAADER', '8'))


def nivå_bekk(t, o):
    return 0 if t == 1 or o >= 5 else 1 if o >= 3 else 2


def blokk(x, y):
    return int((x - X0) // SPAN), int((Y0 - y) // SPAN)


def blokk_boks(bx, by):
    return (X0 + bx * SPAN, Y0 - (by + 1) * SPAN, X0 + (bx + 1) * SPAN, Y0 - by * SPAN)


# ---------- henting ----------
def hent_url(url):
    for forsøk in range(6):
        try:
            d = json.loads(urllib.request.urlopen(url, timeout=180).read())
            if 'error' in d: raise RuntimeError(str(d['error'])[:300])
            return d
        except Exception as e:
            print('prøver igjen:', str(e)[:200], flush=True); time.sleep(2 + 4 * forsøk)
    raise RuntimeError('fikk ikke hentet ' + url[:160])


def spør(lag, **q):
    q.setdefault('f', 'json')
    return NVE + lag + '/query?' + urllib.parse.urlencode(q)


def oid_spenn(lag, where):
    st = json.dumps([{'statisticType': 'min', 'onStatisticField': 'objectid', 'outStatisticFieldName': 'a'},
                     {'statisticType': 'max', 'onStatisticField': 'objectid', 'outStatisticFieldName': 'b'}])
    a = hent_url(spør(lag, where=where, outStatistics=st))['features'][0]['attributes']
    return int(a['a']), int(a['b'])


def hent_lag(lag, where='1=1', felt='*', ekstra=None, steg=2000):
    """Hele laget i biter etter objectid (≤ 2000 per svar), parallelt, hurtiglagret. Gir en generator med features per side."""
    a, b = oid_spenn(lag, where)
    mappe = os.path.join(ARB, lag.replace('/', '_')); os.makedirs(mappe, exist_ok=True)
    def side(fra):
        f = os.path.join(mappe, f'{fra}.json')
        if os.path.exists(f):
            try: return json.load(open(f))
            except Exception: pass
        q = dict(where=f'({where}) and objectid >= {fra} and objectid < {fra + steg}', outFields=felt, outSR=25833, returnGeometry='true')
        if ekstra: q.update(ekstra)
        d = hent_url(spør(lag, **q))
        if d.get('exceededTransferLimit'): raise RuntimeError(f'{lag}: mer enn grensen i {fra}–{fra + steg}')
        fe = d.get('features', [])
        json.dump(fe, open(f + '.tmp', 'w')); os.replace(f + '.tmp', f)
        return fe
    starter = list(range(a, b + 1, steg)); n = 0; t0 = time.time()
    with ThreadPoolExecutor(TRÅDER) as ex:
        for i, fe in enumerate(ex.map(side, starter)):
            n += len(fe)
            if i % 50 == 0: print(f'{lag}: side {i}/{len(starter)}, {n} objekter, {time.time() - t0:.0f} s', flush=True)
            yield fe
    print(f'{lag}: {n} objekter', flush=True)


# ---------- koding ----------
def delta(P, x0, y0):
    r = [P[0][0] - x0, P[0][1] - y0]
    for i in range(1, len(P)): r += [P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]]
    return r


def rens(coords):
    P = [(round(x), round(y)) for x, y in coords]
    return [P[0]] + [p for i, p in enumerate(P[1:], 1) if p != P[i - 1]]


def klipp_blokker(geo):
    """Deler en linje på blokkene den berører: [((bx, by), LineString), ...]."""
    x0, y0, x1, y1 = geo.bounds
    a0, b1 = blokk(x0, y0); a1, b0 = blokk(x1, y1)
    if a0 == a1 and b0 == b1: return [((a0, b0), geo)]
    ut = []
    for bx in range(a0, a1 + 1):
        for by in range(b0, b1 + 1):
            d = geo.intersection(box(*blokk_boks(bx, by)))
            if d.is_empty: continue
            for g in (d.geoms if hasattr(d, 'geoms') else [d]):
                if g.geom_type == 'LineString': ut.append(((bx, by), g))
    return ut


# ---------- bekker ----------
def bekker():
    biter = {}   # (bx, by, nivå) -> {'linjer': [...], 'navn': [], 'nr': {}}
    lengde = 0.0; antall = 0
    for side in hent_lag('Elvenett1/MapServer/2', "objekttype in ('ElvBekk','ElvBekkMidtlinje')", 'objekttype,elveordenstrahler,elvenavn',
                         {'maxAllowableOffset': 0.8, 'geometryPrecision': 0}):
        for f in side:
            a, g = f['attributes'], f.get('geometry')
            t = TYPE.get(a['objekttype'])
            if t is None or not g: continue
            o = int(a['elveordenstrahler'] or 1); nv = nivå_bekk(t, o); n = a['elvenavn']
            for P in g['paths']:
                if len(P) < 2: continue
                geo = LineString(P)
                if geo.length < 4: continue
                for (bx, by), d in klipp_blokker(geo):
                    if d.length < 4: continue
                    Q = rens(d.coords)
                    if len(Q) < 2: continue
                    bit = biter.setdefault((bx, by, nv), {'linjer': [], 'navn': [], 'nr': {}})
                    ni = -1
                    if n:
                        if n not in bit['nr']: bit['nr'][n] = len(bit['navn']); bit['navn'].append(n)
                        ni = bit['nr'][n]
                    x0, _, _, y1 = blokk_boks(bx, by)
                    bit['linjer'].append([t, o, ni] + delta(Q, int(x0), int(y1 - SPAN)))
                    lengde += d.length; antall += 1
    print(f'bekker: {antall} linjebiter, {lengde / 1000:.0f} km i {len(biter)} biter', flush=True)
    return biter, {'linjer': antall, 'km': round(lengde / 1000)}


# ---------- kraft ----------
def kraft():
    D = {}
    for lag in ('Nettanlegg5/MapServer/0', 'Nettanlegg5/MapServer/1', 'Nettanlegg5/MapServer/3', 'Nettanlegg5/MapServer/4', 'Nettanlegg4/MapServer/2'):
        D[lag] = [f for s in hent_lag(lag, felt='objectid,spenning_kv,navn' if lag != 'Nettanlegg5/MapServer/3' else 'objectid') for f in s]
    linjer = []
    for nivå, lag in ((1, 'Nettanlegg5/MapServer/0'), (2, 'Nettanlegg5/MapServer/1'), (3, 'Nettanlegg4/MapServer/2')):
        for f in D[lag]:
            a = f['attributes']
            for P in (f.get('geometry') or {}).get('paths', []):
                if len(P) > 1: linjer.append({'kv': int(a.get('spenning_kv') or (22 if nivå == 3 else 66)), 'n': nivå, 'navn': a.get('navn') or '', 'P': P})
    master = KR.klynger([(f['geometry']['x'], f['geometry']['y']) for f in D['Nettanlegg5/MapServer/3'] if f.get('geometry')])
    for l in linjer: l['L'] = KR.kjede(l['P']); l['ekte'] = []
    store = [l for l in linjer if l['n'] < 3]
    tre = STRtree([LineString(l['P']) for l in store])
    # hver mast til nærmeste store linje (innen 30 m), med romlig indeks
    from shapely.geometry import Point
    for x, y in master:
        best = None
        for i in tre.query(Point(x, y).buffer(30)):
            l = store[int(i)]; d, s = KR.projiser(l['P'], l['L'], x, y)
            if d < 30 and (best is None or d < best[0]): best = (d, s, l)
        if best: best[2]['ekte'].append(best[1])
    biter = {}; nm = 0
    for l in linjer:
        M = [(*KR.punkt_ved(l['P'], l['L'], s), e) for s, e in KR.master_langs(l['P'], l['ekte'], KR.AVSTAND[l['n']])]
        nv = 0 if l['n'] < 3 else 1
        for (bx, by), bit in master_blokker(M):
            x0, _, _, y1 = blokk_boks(bx, by); ox, oy = int(x0), int(y1 - SPAN)
            Q = [(round(x), round(y)) for x, y, _ in bit]
            B = biter.setdefault((bx, by, nv), {'linjer': [], 'trafo': []})
            B['linjer'].append({'kv': l['kv'], 'n': l['n'], 'navn': l['navn'], 'm': delta(Q, ox, oy), 'e': ''.join('1' if e else '0' for _, _, e in bit)})
            nm += len(bit)
    for f in D['Nettanlegg5/MapServer/4']:
        g = f.get('geometry')
        if not g: continue
        bx, by = blokk(g['x'], g['y']); x0, _, _, y1 = blokk_boks(bx, by)
        biter.setdefault((bx, by, 0), {'linjer': [], 'trafo': []})['trafo'].append([round(g['x'] - x0), round(g['y'] - (y1 - SPAN)), int(f['attributes'].get('spenning_kv') or 0)])
    for B in biter.values(): B['linjer'].sort(key=lambda l: l['n'])
    st = {'linjer': len(linjer), 'master': nm, 'master_nve': len(master), 'trafo': len(D['Nettanlegg5/MapServer/4'])}
    print('kraft:', st, len(biter), 'biter', flush=True)
    return biter, st


def master_blokker(M):
    """Deler mastrekka [(x, y, ekte)] på blokkene: hver mast i sin blokk, og en bit tar med første mast etter seg (spennet over kanten)."""
    ut, bit, k = [], [], None
    for i, p in enumerate(M):
        b = blokk(p[0], p[1])
        if k is not None and b != k:
            bit.append(p)
            if len(bit) > 1: ut.append((k, bit))
            bit = []
        k = b; bit.append(p)
    if len(bit) > 1: ut.append((k, bit))
    return ut


# ---------- utskrift ----------
def skriv(utmappe, navn, biter, nivåer, lag_obj):
    fil = os.path.join(utmappe, navn + '.json'); idx = {}; pos = 0
    with open(fil, 'wb') as f:
        for (bx, by, nv) in sorted(biter):
            x0, _, _, y1 = blokk_boks(bx, by)
            b = json.dumps(lag_obj(biter[(bx, by, nv)], int(x0), int(y1 - SPAN)), separators=(',', ':'), ensure_ascii=False).encode()
            f.write(b)
            idx.setdefault(f'{bx},{by}', [[0, 0] for _ in range(nivåer)])[nv] = [pos, len(b)]; pos += len(b)
    return fil, idx, pos


def main():
    utmappe = sys.argv[1]; os.makedirs(utmappe, exist_ok=True)
    hva = sys.argv[2].split(',') if len(sys.argv) > 2 else ['bekker', 'kraft']
    man = {'z': BLOKK_Z, 'x0': X0, 'y0': Y0, 'span': SPAN, 'kilde': {}, 'statistikk': {}, 'byte': {}}
    h = hashlib.sha256()
    if 'kraft' in hva:
        B, st = kraft()
        fil, idx, n = skriv(utmappe, 'kraft', B, 2, lambda b, x0, y0: {'x0': x0, 'y0': y0, 'd': 1, 'linjer': b['linjer'], 'trafo': b['trafo']})
        man['kraft'] = idx; man['statistikk']['kraft'] = st; man['byte']['kraft'] = n
        man['kilde']['kraft'] = 'NVE Nettanlegg (NLOD 2.0), hentet ' + time.strftime('%Y-%m-%d')
        h.update(open(fil, 'rb').read())
    if 'bekker' in hva:
        B, st = bekker()
        fil, idx, n = skriv(utmappe, 'bekker', B, 3, lambda b, x0, y0: {'x0': x0, 'y0': y0, 'linjer': b['linjer'], 'navn': b['navn']})
        man['bekker'] = idx; man['statistikk']['bekker'] = st; man['byte']['bekker'] = n
        man['kilde']['bekker'] = 'Elvenett (ELVIS): NVE (NLOD)'
        h.update(open(fil, 'rb').read())
    tag = 'kart-nve-' + h.hexdigest()[:12]
    man['versjon'] = tag
    json.dump(man, open(os.path.join(utmappe, 'manifest.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    open(os.path.join(utmappe, 'tag.txt'), 'w').write(tag)
    print(tag, json.dumps(man['statistikk'], ensure_ascii=False), {k: round(v / 1e6, 1) for k, v in man['byte'].items()}, 'MB')


if __name__ == '__main__':
    main()
