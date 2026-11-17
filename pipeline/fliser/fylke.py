"""Grensa for ett fylke (med sjøområdet) til site/dovre-fliser/data/<navn>.json – brukes av spill/omraade.js til et mindre spillkart.
(17. nov, brukeren: «lag et kart av bare Rogaland fylke, da det per nå er mer praktisk å spille på et litt mindre kart».)

Kilde: Kartverket, Administrative enheter (WFS, CC BY 4.0), objekttypen Fylke. Ringen forenkles (Douglas–Peucker, 40 m) og skrives
som heltall i meter (EPSG:25833), delta-kodet: { navn, nr, bb: [x0, y0, x1, y1], ring: [x, y, dx, dy, …] }.

Bruk: python3 pipeline/fliser/fylke.py 11 rogaland            (henter fra Kartverket)
      python3 pipeline/fliser/fylke.py 11 rogaland svar.xml   (leser et lagret svar)"""
import json, os, re, sys, urllib.parse, urllib.request

HER = os.path.dirname(os.path.abspath(__file__))
WFS = 'https://wfs.geonorge.no/skwms1/wfs.administrative_enheter'
NS = 'https://skjema.geonorge.no/SOSI/produktspesifikasjon/AdmEnheter/20240101'
TOLERANSE = 40.0


def hent(nr):
    filt = (f'<fes:Filter xmlns:fes="http://www.opengis.net/fes/2.0" xmlns:app="{NS}"><fes:PropertyIsEqualTo>'
            f'<fes:ValueReference>app:fylkesnummer</fes:ValueReference><fes:Literal>{nr}</fes:Literal></fes:PropertyIsEqualTo></fes:Filter>')
    q = urllib.parse.urlencode({'service': 'WFS', 'version': '2.0.0', 'request': 'GetFeature', 'typeNames': 'app:Fylke', 'srsName': 'urn:ogc:def:crs:EPSG::25833', 'filter': filt})
    with urllib.request.urlopen(WFS + '?' + q, timeout=180) as r: return r.read().decode('utf-8')


def ringer(xml):
    """De ytre ringene i svaret, lengste først."""
    ut = []
    for m in re.finditer(r'<gml:exterior>.*?<gml:posList>([^<]*)</gml:posList>', xml, re.S):
        t = [float(v) for v in m.group(1).split()]; ut.append([(t[i], t[i + 1]) for i in range(0, len(t) - 1, 2)])
    return sorted(ut, key=len, reverse=True)


def forenkle(P, tol):
    """Douglas–Peucker uten rekursjon."""
    if len(P) < 3: return P[:]
    behold = [False] * len(P); behold[0] = behold[-1] = True; stakk = [(0, len(P) - 1)]
    while stakk:
        a, b = stakk.pop(); ax, ay = P[a]; bx, by = P[b]; dx, dy = bx - ax, by - ay; L = (dx * dx + dy * dy) ** .5; best, bi = 0.0, -1
        for i in range(a + 1, b):
            px, py = P[i]; d = abs(dx * (ay - py) - (ax - px) * dy) / L if L else ((px - ax) ** 2 + (py - ay) ** 2) ** .5
            if d > best: best, bi = d, i
        if best > tol: behold[bi] = True; stakk.append((a, bi)); stakk.append((bi, b))
    return [p for p, k in zip(P, behold) if k]


def kode(navn, nr, ring):
    R = [(int(round(x)), int(round(y))) for x, y in ring]
    if R[0] != R[-1]: R.append(R[0])
    d = []; fx = fy = 0
    for x, y in R: d += [x - fx, y - fy]; fx, fy = x, y
    xs = [p[0] for p in R]; ys = [p[1] for p in R]
    return {'navn': navn, 'nr': nr, 'kilde': 'Kartverket, Administrative enheter (CC BY 4.0)', 'bb': [min(xs), min(ys), max(xs), max(ys)], 'ring': d}


def dekod(o):
    ut = []; x = y = 0
    for i in range(0, len(o['ring']), 2): x += o['ring'][i]; y += o['ring'][i + 1]; ut.append((x, y))
    return ut


if __name__ == '__main__':
    nr, fil = int(sys.argv[1]), sys.argv[2]
    xml = open(sys.argv[3], encoding='utf-8').read() if len(sys.argv) > 3 else hent(nr)
    navn = re.search(r'<app:fylkesnavn>([^<]*)', xml).group(1); R = ringer(xml); assert R, 'ingen ring i svaret'
    ring = forenkle(R[0], TOLERANSE); o = kode(navn, nr, ring)
    ut = os.path.join(HER, '..', '..', 'site', 'dovre-fliser', 'data', fil + '.json'); json.dump(o, open(ut, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print(navn, len(R[0]), '->', len(ring), 'punkter', os.path.getsize(ut) // 1000, 'KB', 'bb', o['bb'], 'km', (o['bb'][2] - o['bb'][0]) // 1000, 'x', (o['bb'][3] - o['bb'][1]) // 1000)
