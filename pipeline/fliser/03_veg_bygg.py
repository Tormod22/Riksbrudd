"""Henter veger (NVDB API v4, Statens vegvesen, NLOD) og bygningspunkt (matrikkelen, Kartverket, CC BY 4.0)
for hele flisområdet i EPSG:25833 og lagrer dem i data/fliser/ (i git, så 02_fliser.py kan kjøres uten nett).

  veger.json: [{"c": "E"|"R"|"F"|"K"|"P"|"S", "p": [[x, y], ...]}]
  bygg.json:  [[x, y, bygningstype, status], ...]
Bruk: python3 03_veg_bygg.py  (deretter python3 02_fliser.py)
"""
import os, re, json, urllib.request, urllib.parse
from felles import CRS, DOVRE

HER = os.path.dirname(os.path.abspath(__file__)); UT = os.path.join(HER, '..', '..', 'data', 'fliser'); os.makedirs(UT, exist_ok=True)


def hent(url, headers={}):
    for forsok in range(4):
        try: return urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=180).read()
        except Exception as e: print('prøver igjen:', e, flush=True)
    raise RuntimeError('fikk ikke hentet ' + url[:120])


def bygg():
    bb = ','.join(str(int(v)) for v in DOVRE)
    base = ("https://wfs.geonorge.no/skwms1/wfs.matrikkelen-bygningspunkt?service=WFS&version=2.0.0&request=GetFeature"
            f"&typeNames=app:Bygning&srsName={CRS}&bbox={bb},{CRS}&count=5000&startIndex=")
    ut, start = [], 0
    while True:
        x = hent(base + str(start)).decode('utf-8', 'ignore')
        feats = re.findall(r'<app:Bygning .*?</app:Bygning>', x, re.S)
        for f in feats:
            t = re.search(r'<app:bygningstype>(\d+)', f); p = re.search(r'<gml:pos>([\d.]+) ([\d.]+)', f); st = re.search(r'<app:bygningsstatus>(\w+)', f)
            if t and p:
                a, b = float(p.group(1)), float(p.group(2))
                X, Y = (a, b) if a < 2e6 else (b, a)          # tål begge akserekkefølger
                if DOVRE[0] <= X <= DOVRE[2] and DOVRE[1] <= Y <= DOVRE[3]:
                    ut.append([round(X, 1), round(Y, 1), int(t.group(1)), st.group(1) if st else ''])
        print('bygg', start, len(feats), flush=True)
        if len(feats) < 5000: break
        start += 5000
    json.dump(ut, open(os.path.join(UT, 'bygg.json'), 'w')); print('bygg totalt', len(ut))


def veger():
    q = urllib.parse.urlencode({'kartutsnitt': ','.join(str(int(v)) for v in DOVRE), 'srid': '5973', 'antall': 1000})  # 5973 = UTM 33 (EUREF89) i NVDB
    base = "https://nvdbapiles.atlas.vegvesen.no/vegnett/api/v4/veglenkesekvenser/segmentert?" + q
    u = base
    ut = []
    while u:
        d = json.loads(hent(u, {'X-Client': 'riksbrudd', 'Accept': 'application/json'}))
        for o in d['objekter']:
            if o.get('detaljnivå') not in ('Vegtrase og kjørebane', 'Vegtrase'): continue
            kat = (o.get('vegsystemreferanse') or {}).get('vegsystem', {}).get('vegkategori', 'P')
            if kat == 'P' and o.get('typeVeg') != 'Enkel bilveg': continue
            m = re.search(r'\((.*)\)', o['geometri']['wkt'])
            if not m: continue
            p = []
            for c in m.group(1).replace('(', '').replace(')', '').split(','):
                xy = c.split(); p.append([round(float(xy[0]), 1), round(float(xy[1]), 1)])
            if len(p) > 1: ut.append({'c': kat, 'p': p})
        nx = d['metadata'].get('neste')   # «neste»-lenken mangler /api/v4, så den bygges av startnøkkelen
        u = base + '&start=' + urllib.parse.quote(nx['start']) if nx and d['objekter'] else None
        print('veger', len(ut), flush=True)
    json.dump(ut, open(os.path.join(UT, 'veger.json'), 'w')); print('veger totalt', len(ut))


if __name__ == '__main__':
    if not os.path.exists(os.path.join(UT, 'bygg.json')): bygg()
    veger()
