"""Kraftnettet for Dovre-piloten: luftledninger med spenning (kV), master og trafostasjoner fra NVE (Nettanlegg, NLOD 2.0).

Kilde: NVEs kartjeneste https://kart.nve.no/enterprise/rest/services (ArcGIS REST, EPSG:25833)
  Nettanlegg5/MapServer/0  Transmisjonsnett_luftledning  (300/420 kV og noe 132 kV, Statnett)
  Nettanlegg5/MapServer/1  Regionalnett_luftledning      (66/132 kV)
  Nettanlegg5/MapServer/3  Master_og_stolper             (master for transmisjons- og regionalnettet; ofte flere punkt per mast = beina)
  Nettanlegg5/MapServer/4  Transformatorstasjoner
  Nettanlegg4/MapServer/2  Distribusjonsnett             (22 kV luftlinjer, bare knekkpunktene – stolpene lages her hver ~90 m)

Ut: site/dovre-fliser/data/kraft.json (i git, < 1 MB):
  {"kilde": "...", "linjer": [{"kv": 300, "n": 1, "navn": "Aura - Vågåmo", "m": [x0, y0, x1, y1, ...], "e": "1101..."}], "trafo": [[x, y, kv], ...]}
  m = mastene i rekkefølge langs linja (hele meter, EPSG:25833), linene henger mellom nabomaster.
  e = én bokstav per mast: 1 = mast fra NVE, 0 = lagt inn her (knekkpunkt eller fylt inn der NVE ikke har mastene).
  n = nettnivå: 1 transmisjon, 2 regional, 3 distribusjon.
Hele Norge kan lages senere i en GitHub Action (som infra.yml) og legges i en release – her bare Dovre (DOVRE i felles.py).
Bruk: python3 pipeline/fliser/kraft.py   (test: python3 pipeline/fliser/test_kraft.py)
"""
import os, json, math, time, urllib.request, urllib.parse

HER = os.path.dirname(os.path.abspath(__file__))
UT = os.path.join(HER, '..', '..', 'site', 'dovre-fliser', 'data', 'kraft.json')
NVE = 'https://kart.nve.no/enterprise/rest/services/'
KANT = 400          # ta med litt utenfor området (linene til masta like utenfor)
AVSTAND = {1: 380, 2: 300, 3: 90}   # vanlig spenn (m) når mastene må lages: store linjer 250–400 m, distribusjon 80–100 m


def hent(lag, bb):
    q = {'where': '1=1', 'geometry': ','.join(str(int(v)) for v in bb), 'geometryType': 'esriGeometryEnvelope', 'inSR': 25833, 'outSR': 25833,
         'spatialRel': 'esriSpatialRelIntersects', 'outFields': '*', 'f': 'json', 'resultRecordCount': 2000}
    ut, fra = [], 0
    while True:
        q['resultOffset'] = fra
        u = NVE + lag + '/query?' + urllib.parse.urlencode(q)
        for forsøk in range(4):
            try: d = json.loads(urllib.request.urlopen(u, timeout=120).read()); break
            except Exception as e: print('prøver igjen:', e, flush=True); time.sleep(3)
        else: raise RuntimeError('fikk ikke hentet ' + lag)
        if 'error' in d: raise RuntimeError(str(d['error']))
        ut += d.get('features', [])
        if not d.get('exceededTransferLimit'): return ut
        fra += len(d['features'])


# ---------- ren geometri (testes i test_kraft.py) ----------
def klynger(punkt, r=15.0):
    """Slår sammen mastepunkt som ligger innen r meter (NVE har ofte ett punkt per mastebein) til midtpunktet."""
    ut, brukt = [], [False] * len(punkt)
    rute = {}
    for i, (x, y) in enumerate(punkt): rute.setdefault((int(x // r), int(y // r)), []).append(i)
    for i, (x, y) in enumerate(punkt):
        if brukt[i]: continue
        gruppe, kø = [], [i]; brukt[i] = True
        while kø:
            k = kø.pop(); gruppe.append(k); a, b = punkt[k]
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    for j in rute.get((int(a // r) + dx, int(b // r) + dy), []):
                        if not brukt[j] and math.hypot(punkt[j][0] - a, punkt[j][1] - b) < r: brukt[j] = True; kø.append(j)
        ut.append((sum(punkt[k][0] for k in gruppe) / len(gruppe), sum(punkt[k][1] for k in gruppe) / len(gruppe)))
    return ut


def kjede(P):
    """Lengde langs linja til hvert punkt."""
    L = [0.0]
    for i in range(1, len(P)): L.append(L[-1] + math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]))
    return L


def projiser(P, L, x, y):
    """(avstand fra linja, lengde langs linja) for punktet."""
    best = (1e18, 0.0)
    for i in range(len(P) - 1):
        ax, ay = P[i]; bx, by = P[i + 1]; dx, dy = bx - ax, by - ay; l2 = dx * dx + dy * dy
        t = 0.0 if l2 == 0 else max(0.0, min(1.0, ((x - ax) * dx + (y - ay) * dy) / l2))
        d = math.hypot(x - ax - t * dx, y - ay - t * dy)
        if d < best[0]: best = (d, L[i] + t * math.sqrt(l2))
    return best


def punkt_ved(P, L, s):
    for i in range(len(P) - 1):
        if L[i + 1] >= s:
            t = 0.0 if L[i + 1] == L[i] else (s - L[i]) / (L[i + 1] - L[i])
            return (P[i][0] + (P[i + 1][0] - P[i][0]) * t, P[i][1] + (P[i + 1][1] - P[i][1]) * t)
    return tuple(P[-1])


def knekk(P, L, grader=3.0):
    """Lengden langs linja til knekkpunktene (der linja svinger mer enn «grader»): der må det stå en mast."""
    ut = []
    for i in range(1, len(P) - 1):
        a = math.atan2(P[i][1] - P[i - 1][1], P[i][0] - P[i - 1][0]); b = math.atan2(P[i + 1][1] - P[i][1], P[i + 1][0] - P[i][0])
        v = abs((b - a + math.pi) % (2 * math.pi) - math.pi)
        if v > math.radians(grader): ut.append(L[i])
    return ut


def master_langs(P, ekte, spenn):
    """Mastene langs en linje: de ekte (lengde langs linja), knekkpunktene og endene, og fyll inn der spennet blir for langt.
    Gir [(s, ekte?)] sortert langs linja."""
    L = kjede(P); tot = L[-1]
    m = sorted([(s, True) for s in ekte])
    for s in [0.0, tot] + knekk(P, L):
        if all(abs(s - t) > spenn * .25 for t, _ in m): m.append((s, False))
    m.sort()
    ut = []
    for i, (s, e) in enumerate(m):
        if ut:
            gap = s - ut[-1][0]
            if gap > spenn * 1.45:
                n = round(gap / spenn); f = ut[-1][0]
                for k in range(1, n): ut.append((f + gap * k / n, False))
        ut.append((s, e))
    return ut


def klipp(M, bb):
    """Deler mastrekka i biter som ligger inne i bb (med én mast utenfor i hver ende så linene går ut av kanten)."""
    inne = [bb[0] <= x <= bb[2] and bb[1] <= y <= bb[3] for x, y, _ in M]
    biter, bit = [], []
    for i, p in enumerate(M):
        nær = inne[i] or (i > 0 and inne[i - 1]) or (i + 1 < len(M) and inne[i + 1])
        if nær: bit.append(p)
        elif bit: biter.append(bit); bit = []
    if bit: biter.append(bit)
    return [b for b in biter if len(b) > 1]


def lag(D):
    from felles import DOVRE
    bb = (DOVRE[0] - KANT, DOVRE[1] - KANT, DOVRE[2] + KANT, DOVRE[3] + KANT)
    linjer = []
    for nivå, lagnavn in ((1, 'Nettanlegg5/MapServer/0'), (2, 'Nettanlegg5/MapServer/1'), (3, 'Nettanlegg4/MapServer/2')):
        for f in D[lagnavn]:
            a = f['attributes']
            for P in f['geometry'].get('paths', []):
                if len(P) > 1: linjer.append({'kv': int(a.get('spenning_kv') or (22 if nivå == 3 else 66)), 'n': nivå, 'navn': a.get('navn') or '', 'P': P})
    master = klynger([(f['geometry']['x'], f['geometry']['y']) for f in D['Nettanlegg5/MapServer/3']])
    # hver mast til nærmeste store linje (innen 30 m)
    for l in linjer: l['L'] = kjede(l['P']); l['ekte'] = []
    store = [l for l in linjer if l['n'] < 3]
    for x, y in master:
        best = None
        for l in store:
            d, s = projiser(l['P'], l['L'], x, y)
            if d < 30 and (best is None or d < best[0]): best = (d, s, l)
        if best: best[2]['ekte'].append(best[1])
    ut = []
    for l in linjer:
        M = [(*punkt_ved(l['P'], l['L'], s), e) for s, e in master_langs(l['P'], l['ekte'], AVSTAND[l['n']])]
        for bit in klipp(M, DOVRE):
            ut.append({'kv': l['kv'], 'n': l['n'], 'navn': l['navn'], 'm': [round(v) for x, y, _ in bit for v in (x, y)], 'e': ''.join('1' if e else '0' for _, _, e in bit)})
    trafo = [[round(f['geometry']['x']), round(f['geometry']['y']), int(f['attributes'].get('spenning_kv') or 0)] for f in D['Nettanlegg5/MapServer/4']
             if DOVRE[0] <= f['geometry']['x'] <= DOVRE[2] and DOVRE[1] <= f['geometry']['y'] <= DOVRE[3]]
    ut.sort(key=lambda l: l['n'])
    return {'kilde': 'NVE Nettanlegg (NLOD 2.0), hentet ' + time.strftime('%Y-%m-%d'), 'linjer': ut, 'trafo': trafo}


def main():
    import sys; sys.path.insert(0, HER)
    from felles import DOVRE
    bb = (DOVRE[0] - KANT, DOVRE[1] - KANT, DOVRE[2] + KANT, DOVRE[3] + KANT)
    D = {}
    for lagnavn in ('Nettanlegg5/MapServer/0', 'Nettanlegg5/MapServer/1', 'Nettanlegg5/MapServer/3', 'Nettanlegg5/MapServer/4', 'Nettanlegg4/MapServer/2'):
        D[lagnavn] = hent(lagnavn, bb); print(lagnavn, len(D[lagnavn]), flush=True)
    K = lag(D)
    json.dump(K, open(UT, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    n = sum(len(l['e']) for l in K['linjer']); e = sum(l['e'].count('1') for l in K['linjer'])
    print(f"{len(K['linjer'])} linjer, {n} master ({e} fra NVE), {len(K['trafo'])} trafostasjoner, {os.path.getsize(UT) / 1024:.0f} KB -> {UT}")


if __name__ == '__main__':
    main()
