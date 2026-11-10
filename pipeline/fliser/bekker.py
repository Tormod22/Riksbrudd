"""Bekker og elver som linjer for Dovre-piloten: NVE Elvenett (ELVIS, NLOD / CC BY 4.0) -> site/dovre-fliser/data/bekker.json.

Kilde: https://kart.nve.no/enterprise/rest/services/Elvenett1/MapServer/2 (elvenett, linjer med Strahler-orden).
  ElvBekk           – bekker og smale elver (én linje)            -> type 0
  ElvBekkMidtlinje  – midtlinjen i brede elver (elva er en flate) -> type 1
  InnsjøMidtlinje og ElvelinjeFiktiv hoppes over (de går gjennom innsjøene, vannet ligger alt i kartet).
Kulvert: der en bekk (orden ≤ 3) krysser en veg (data/fliser/veger.json, NVDB), kuttes linjen i vegbredden + 1,5 m på hver side,
så vannet går under vegen. Større elver krysser vegen på bru: de kuttes ikke.

Format (kompakt, heltall i meter):
  {"kilde": "...", "x0": X, "y0": Y, "linjer": [[type, orden, navn-nr (-1 = uten navn), x, y, dx, dy, dx, dy, ...], ...], "navn": [...]}
  første punkt er relativt til (x0, y0), de neste er differanser fra forrige punkt.
Bruk: python3 bekker.py   (henter fra NVE; råfilene hurtiglagres i arbeid/elvis/)
"""
import os, json, urllib.request, urllib.parse
from shapely.geometry import LineString, MultiLineString
from shapely import STRtree
from shapely.ops import unary_union
from felles import DOVRE

HER = os.path.dirname(os.path.abspath(__file__)); ROT = os.path.join(HER, '..', '..')
ARB = os.path.join(HER, 'arbeid', 'elvis'); os.makedirs(ARB, exist_ok=True)
UT = os.path.join(ROT, 'site', 'dovre-fliser', 'data', 'bekker.json')
NVE = 'https://kart.nve.no/enterprise/rest/services/Elvenett1/MapServer/2/query'
TYPE = {'ElvBekk': 0, 'ElvBekkMidtlinje': 1}
VEGBREDDE = {'E': 8, 'R': 7.5, 'F': 6.5, 'K': 5.5, 'P': 4, 'S': 3.5}
KULVERT_MAKS_ORDEN = 3


def hent(url):
    for forsok in range(4):
        try: return urllib.request.urlopen(url, timeout=180).read()
        except Exception as e: print('prøver igjen:', e, flush=True)
    raise RuntimeError('fikk ikke hentet ' + url[:120])


def elvis(bb):
    ut, fra = [], 0
    while True:
        f = os.path.join(ARB, f'{fra}.json')
        if not os.path.exists(f):
            q = urllib.parse.urlencode({'where': '1=1', 'geometry': ','.join(str(v) for v in bb), 'geometryType': 'esriGeometryEnvelope',
                                        'inSR': 25833, 'outSR': 25833, 'spatialRel': 'esriSpatialRelIntersects',
                                        'outFields': 'objekttype,elveordenstrahler,elvenavn', 'resultOffset': fra,
                                        'resultRecordCount': 2000, 'orderByFields': 'objectid', 'f': 'json'})
            open(f, 'wb').write(hent(f'{NVE}?{q}'))
        d = json.load(open(f))
        if 'error' in d: raise RuntimeError(str(d['error'])[:300])
        ut += d['features']; fra += len(d['features'])
        print('elvis', fra, flush=True)
        if not d['features'] or not d.get('exceededTransferLimit'): break
    return ut


def main():
    bb = DOVRE
    vegl = json.load(open(os.path.join(ROT, 'data', 'fliser', 'veger.json')))
    veger = [LineString(v['p']).buffer(VEGBREDDE.get(v['c'], 5) / 2 + 1.5, cap_style=2) for v in vegl if len(v['p']) > 1]
    tre = STRtree(veger)
    navn, nr = [], {}
    linjer, lengde, kutt = [], 0.0, 0
    for f in elvis(bb):
        a, g = f['attributes'], f.get('geometry')
        t = TYPE.get(a['objekttype'])
        if t is None or not g: continue
        o = int(a['elveordenstrahler'] or 1)
        geo = MultiLineString(g['paths']) if len(g['paths']) > 1 else LineString(g['paths'][0])
        geo = geo.intersection(__import__('shapely').geometry.box(*bb))
        if geo.is_empty: continue
        if t == 0 and o <= KULVERT_MAKS_ORDEN:
            nær = [veger[i] for i in tre.query(geo, predicate='intersects')]
            if nær: geo = geo.difference(unary_union(nær)); kutt += 1
        n = a['elvenavn']
        ni = -1
        if n:
            if n not in nr: nr[n] = len(navn); navn.append(n)
            ni = nr[n]
        deler = list(geo.geoms) if hasattr(geo, 'geoms') else [geo]
        for d in deler:
            if d.geom_type != 'LineString' or d.length < 4: continue
            d = d.simplify(0.8)
            P = [(round(x), round(y)) for x, y in d.coords]
            Q = [P[0]] + [p for i, p in enumerate(P[1:], 1) if p != P[i - 1]]
            if len(Q) < 2: continue
            lengde += d.length
            r = [t, o, ni, Q[0][0] - int(bb[0]), Q[0][1] - int(bb[1])]
            for i in range(1, len(Q)): r += [Q[i][0] - Q[i - 1][0], Q[i][1] - Q[i - 1][1]]
            linjer.append(r)
    ut = {'kilde': 'Elvenett (ELVIS): NVE (NLOD)', 'x0': int(bb[0]), 'y0': int(bb[1]), 'linjer': linjer, 'navn': navn}
    json.dump(ut, open(UT, 'w'), separators=(',', ':'), ensure_ascii=False)
    print(f'{len(linjer)} linjer, {lengde / 1000:.0f} km, {kutt} kulvertkutt, {os.path.getsize(UT) / 1e6:.2f} MB -> {UT}')


if __name__ == '__main__':
    main()
