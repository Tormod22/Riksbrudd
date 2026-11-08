"""Infrastruktur for hele Norge (fase A i docs/plan-spillmekanikk.md) -> infra.json + manifest.json, release kart-infra-<hash>.

Lag (alle i EPSG:25833, hele meter):
  bru       NVDB 60 Bru, slik vegnettet var 1. juni ÅR (veg-, gang- og jernbanebruer; ikke kulverter/«bru i fylling»)
  tunnel    NVDB 67 Tunnelløp (linja gjennom fjellet; endene er portalene), navn/lengde/år fra 581 Tunnel når de mangler
  ferje     NVDB 770 Ferjesamband (sjøvegen)       ferjekai  NVDB 64 Ferjekai
  kraft     NVE vannkraftverk i drift (ytelse MW)  dam       NVE dammer            magasin  NVE regulerte magasin
  olje      Sokkeldirektoratet innretninger         ror       rørledninger          felt     olje- og gassfelt
  tettsted  SSB tettsteder 1.1.ÅR (omriss og folketall)

Hvert objekt er en liste: [id, egenskaper ..., geometri]. Geometrien er en liste av deler, hver del flat og
delta-kodet: [x0, y0, dx1, dy1, dx2, dy2, ...] (meter). Punkter har én del med ett punkt. Feltnavnene står i «felt».
id er kildens egen id (NVDB-objekt-id, NVE-nummer, Sodir npdid, SSB tettstedsnummer), så en spillserver kan holde
tilstanden (hel/skadet/sprengt) per objekt og finne igjen det samme objektet i nye versjoner.

Bruk: python3 infra.py UTMAPPE [ÅR]      -> UTMAPPE/infra.json, manifest.json, tag.txt
"""
import os, sys, json, gzip, time, hashlib, re, urllib.request, urllib.parse
import xml.etree.ElementTree as ET
from shapely import wkt as WKT
from shapely.geometry import LineString, Polygon, MultiPolygon, Point
from shapely import simplify as forenkle

T0 = time.time()
def logg(*a): print(f'[{time.time() - T0:6.0f} s]', *a, flush=True)
ÅR = int(sys.argv[2]) if len(sys.argv) > 2 else int(os.environ.get('AAR', 2023))
DATO = f'{ÅR}-06-01'
HODE = {'X-Client': 'riksbrudd', 'Accept': 'application/json', 'User-Agent': 'riksbrudd-kartbygger'}


BUFFER = os.environ.get('INFRA_BUFFER')   # mappe for svar (bare ved utprøving: hver henting lagres og brukes igjen)

def hent(url, forsok=8):
    if BUFFER:
        f = os.path.join(BUFFER, hashlib.sha1(url.encode()).hexdigest())
        if os.path.exists(f): return open(f, 'rb').read()
        os.makedirs(BUFFER, exist_ok=True); d = hent.__wrapped__(url, forsok); open(f, 'wb').write(d); return d
    return hent.__wrapped__(url, forsok)

def _hent(url, forsok):
    for k in range(forsok):
        try: return urllib.request.urlopen(urllib.request.Request(url, headers=HODE), timeout=300).read()
        except Exception as e:
            if k == forsok - 1: raise
            vent = 3 * 2 ** k if k < 6 else 60
            logg('prøver igjen om', vent, 's:', str(e)[:120]); time.sleep(vent)
hent.__wrapped__ = _hent


# ---------- geometri: forenkle, runde av og delta-kode ----------
def del_(koord):
    ut, px, py = [], 0, 0
    for n, (x, y) in enumerate(koord):
        x, y = round(x), round(y)
        if n and x == px and y == py: continue
        ut += [x, y] if n == 0 else [x - px, y - py]; px, py = x, y
    return ut

def linjer(g, tol):
    if g is None or g.is_empty: return []
    g = forenkle(g, tol) if tol else g
    deler = list(g.geoms) if hasattr(g, 'geoms') else [g]
    return [d for d in (del_([c[:2] for c in l.coords]) for l in deler if l.geom_type == 'LineString') if len(d) >= 4]

def flater(g, tol, min_areal=0.0):
    if g is None or g.is_empty: return []
    if not g.is_valid: g = g.buffer(0)
    g = forenkle(g, tol, preserve_topology=True) if tol else g
    ut = []
    for p in (g.geoms if hasattr(g, 'geoms') else [g]):
        if p.geom_type != 'Polygon' or p.area < min_areal: continue
        ut.append(del_(p.exterior.coords))
        ut += [del_(r.coords) for r in p.interiors if Polygon(r).area >= max(min_areal, 4 * tol * tol)]
    return [d for d in ut if len(d) >= 8]

def punkt(x, y):
    if not all(isinstance(v, (int, float)) and v == v for v in (x, y)): return None   # Sodir har noen få uten gyldig posisjon
    return [[round(x), round(y)]]


# ---------- NVDB ----------
def nvdb(typ, inkluder='egenskaper,geometri'):
    q = urllib.parse.urlencode({'inkluder': inkluder, 'srid': '5973', 'antall': 1000, 'tidspunkt': DATO})
    u, ut = f'https://nvdbapiles.atlas.vegvesen.no/vegobjekter/api/v4/vegobjekter/{typ}?{q}', []
    while u:
        d = json.loads(hent(u)); ut += d['objekter']
        nx = d['metadata'].get('neste'); u = nx['href'] if nx and d['metadata'].get('returnert') else None
    logg(f'NVDB {typ}: {len(ut)}'); return ut

def egenskap(o, *navn):
    for e in o.get('egenskaper', []):
        if e.get('navn') in navn and e.get('verdi') not in (None, ''): return e['verdi']
    return None

def år_av(v):
    m = re.search(r'(1[89]\d\d|20\d\d)', str(v)) if v is not None else None
    return int(m.group(1)) if m else None

def tall(v):
    try: return round(float(v), 1)
    except Exception: return None


def bruer():
    ut, kat = [], {}
    for o in nvdb(60):
        k = egenskap(o, 'Brukategori') or ''
        kat[k] = kat.get(k, 0) + 1
        if k not in ('Vegbru', 'G/S-bru', 'Jernbanebru'): continue   # ikke bru i fylling/kulvert, vegoverbygg, støttemur, ferjeleie
        if not o.get('geometri'): continue
        g = WKT.loads(o['geometri']['wkt']); d = linjer(g, 2.0)
        if not d: c = g.centroid; d = punkt(c.x, c.y)
        t = {'Vegbru': 0, 'G/S-bru': 1, 'Jernbanebru': 2}[k]   # 0 vegbru, 1 gang/sykkel, 2 jernbane
        ut.append([o['id'], egenskap(o, 'Navn'), tall(egenskap(o, 'Lengde')), år_av(egenskap(o, 'Byggeår')),
                   t, d])
    logg('brukategorier:', kat); return ut

def tunneler():
    meta = {}
    for o in nvdb(581, 'egenskaper,relasjoner'):
        m = (egenskap(o, 'Navn'), tall(egenskap(o, 'Lengde, offisiell', 'Lengde offisiell', 'Lengde')),
             år_av(egenskap(o, 'Åpningsår')), 1 if str(egenskap(o, 'Undersjøisk') or '').lower().startswith('ja') else 0)
        for b in (o.get('relasjoner', {}).get('barn') or []):
            for v in b.get('vegobjekter', []): meta[v if isinstance(v, int) else v.get('id')] = m
    ut = []
    for o in nvdb(67, 'egenskaper,geometri,relasjoner'):
        if not o.get('geometri'): continue
        m = meta.get(o['id'], (None, None, None, 0))
        d = linjer(WKT.loads(o['geometri']['wkt']), 5.0)
        if not d: continue
        ut.append([o['id'], egenskap(o, 'Navn') or m[0], tall(egenskap(o, 'Lengde', 'Lengde, offisiell')) or m[1],
                   år_av(egenskap(o, 'Åpningsår')) or m[2], m[3], d])
    return ut

def ferjer():
    ut = []
    for o in nvdb(770):
        if not o.get('geometri'): continue
        d = linjer(WKT.loads(o['geometri']['wkt']), 25.0)
        if d: ut.append([o['id'], egenskap(o, 'Navn'), d])
    kaier = []
    for o in nvdb(64):
        if not o.get('geometri'): continue
        c = WKT.loads(o['geometri']['wkt']).centroid
        kaier.append([o['id'], egenskap(o, 'Navn'), punkt(c.x, c.y)])
    return ut, kaier


# ---------- ArcGIS REST (NVE, Sokkeldirektoratet) ----------
def arcgis(base, lag, hvor='1=1'):
    ut, fra = [], 0
    while True:
        q = urllib.parse.urlencode({'where': hvor, 'outFields': '*', 'outSR': 25833, 'f': 'json', 'resultOffset': fra,
                                    'resultRecordCount': 1000, 'orderByFields': 'objectid' if 'nve' in base else 'OBJECTID'})
        d = json.loads(hent(f'{base}/{lag}/query?{q}'))
        if 'error' in d: raise RuntimeError(str(d['error'])[:300])
        f = d.get('features', []); ut += f; fra += len(f)
        if not f or not d.get('exceededTransferLimit'): break
    logg(f'{base.split("/")[2]} {lag}: {len(ut)}'); return ut

def esri_linje(g): return LineString(g['paths'][0]) if len(g['paths']) == 1 else __import__('shapely').geometry.MultiLineString(g['paths'])

def esri_flate(g):
    """ArcGIS-ringer: ytre ringer går med klokka, hull mot klokka."""
    ytre, hull = [], []
    for r in g.get('rings', []):
        if len(r) < 4: continue
        a = sum((r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]) for i in range(len(r) - 1))
        (ytre if a < 0 else hull).append(r)
    ps = [Polygon(y) for y in ytre]
    for h in hull:
        hp = Polygon(h)
        for i, p in enumerate(ps):
            if p.contains(hp.representative_point()): ps[i] = Polygon(p.exterior.coords, list(p.interiors) + [hp.exterior]); break
    return MultiPolygon(ps) if ps else None

NVE = 'https://kart.nve.no/enterprise/rest/services/Vannkraft1/MapServer'
SODIR = 'https://factmaps.sodir.no/api/rest/services/DataService/Data/FeatureServer'

def nve():
    kraft = [[a['vannkraftverknr'], a['vannkraftverknavn'], tall(a['maksytelse_mw']), a['idriftsattaar'], punkt(f['geometry']['x'], f['geometry']['y'])]
             for f in arcgis(NVE, 0) if (a := f['attributes'])['status'] == 'D' and f.get('geometry')]
    kraft = [k for k in kraft if k[-1]]
    dam = []
    for f in arcgis(NVE, 5):
        a = f['attributes']
        if a['status'] != 'D' or not f.get('geometry'): continue
        d = linjer(esri_linje(f['geometry']), 2.0)
        if d: dam.append([a['damnr'], a['damnavn'] or a['magasinnavn'], a['idriftsattaar'], a['magasinnr'], d])
    mag = []
    for f in arcgis(NVE, 6):
        a = f['attributes']
        if a['status'] != 'D' or not f.get('geometry'): continue
        d = flater(esri_flate(f['geometry']), 30.0, 2000.0)
        if d: mag.append([a['magasinnr'], (a['magasinnavn'] or '').title() or None, a['hoyesteregulertevannstand_moh'],
                          a['lavesteregulertevannstand_moh'], tall(a['volumoppdemt_mm3']), d])
    return kraft, dam, mag

OLJE_TYPE = {'MULTI WELL TEMPLATE': 1, 'SINGLE WELL TEMPLATE': 1, 'SUBSEA STRUCTURE': 1, 'MANIFOLD': 1, 'PIPELINE END MANIFOLD': 1}
def sodir():
    olje = []
    for f in arcgis(SODIR, 6000):
        a = f['attributes']; fase = (a['fclPhase'] or '').upper()
        if not f.get('geometry') or fase in ('REMOVED', 'DISPOSAL COMPLETED', 'ABANDONED IN PLACE', 'DECOMMISSIONED'): continue
        kind = (a['fclKind'] or '').upper()
        t = (3 if 'ONSHORE' in kind or 'LAND' in kind else 2 if a['fclFixedOrMoveable'] == 'MOVEABLE' or 'FPSO' in kind or 'FLOAT' in kind
             else 0 if a['fclSurface'] == 'Y' else 1)   # 0 plattform, 1 havbunn, 2 flytende, 3 på land
        p = punkt(f['geometry'].get('x'), f['geometry'].get('y'))
        if p: olje.append([a['fclNpdidFacility'], a['fclName'], t, a['fclBelongsToName'], fase.lower() or None, (a['fclFunctions'] or '').lower() or None, p])
    ror = []
    for f in arcgis(SODIR, 6100):
        a = f['attributes']
        if not f.get('geometry') or (a['pplCurrentPhase'] or '').upper() in ('DECOMMISSIONED', 'REMOVED', 'ABANDONED'): continue
        d = linjer(esri_linje(f['geometry']), 50.0)
        if d: ror.append([a['pplNpdidPipeline'], a['pplMapLabel'] or a['pplBelongsToName'], (a['pplMedium'] or '').lower() or None, tall(a['pplDimension']),
                          a['fclNameFrom'], a['fclNameTo'], d])
    felt = []
    for f in arcgis(SODIR, 7100):
        a = f['attributes']
        if not f.get('geometry'): continue
        d = flater(esri_flate(f['geometry']), 100.0)
        if d: felt.append([a['fldNpdidField'], (a['fldName'] or '').title(), (a['fldHcType'] or '').lower() or None, a['fldCurrentActivitySatus'], a['fldDiscoveryYear'], d])
    return olje, ror, felt


# ---------- SSB tettsteder (WFS, GML 3.2) ----------
def tettsteder():
    u = ('https://kart.ssb.no/api/mapserver/v1/wfs/tettsteder?service=WFS&version=2.0.0&request=GetFeature'
         f'&typeNames=ms:tettsted_{ÅR}&srsName=EPSG:25833')
    fil = os.path.join(os.environ.get('TMPDIR', '/tmp'), f'tettsted_{ÅR}.xml')
    open(fil, 'wb').write(hent(u)); logg('tettsteder hentet:', os.path.getsize(fil) // 1_000_000, 'MB')
    MS, GML = '{http://mapserver.gis.umn.edu/mapserver}', '{http://www.opengis.net/gml/3.2}'
    ut = []
    for _, el in ET.iterparse(fil):
        if el.tag != MS + f'tettsted_{ÅR}': continue
        ps = []
        for pol in el.iter(GML + 'Polygon'):
            ringer = [[float(v) for v in pl.text.split()] for pl in pol.iter(GML + 'posList')]
            ringer = [list(zip(r[0::2], r[1::2])) for r in ringer]
            if ringer and len(ringer[0]) >= 4: ps.append(Polygon(ringer[0], [r for r in ringer[1:] if len(r) >= 4]))
        d = flater(MultiPolygon(ps) if ps else None, 25.0, 400.0)
        if d:
            ut.append([int(el.findtext(MS + 'tettnr')), el.findtext(MS + 'tettstedsn'), int(float(el.findtext(MS + 'tot_bef') or 0)), d])
        el.clear()
    os.remove(fil); logg('tettsteder:', len(ut)); return ut


FELT = {
    'bru': ['id', 'navn', 'lengde', 'aar', 'type', 'geo'],               # type 0 vegbru, 1 gang/sykkel, 2 jernbane
    'tunnel': ['id', 'navn', 'lengde', 'aar', 'undersjoisk', 'geo'],
    'ferje': ['id', 'navn', 'geo'], 'ferjekai': ['id', 'navn', 'geo'],
    'kraft': ['id', 'navn', 'mw', 'aar', 'geo'], 'dam': ['id', 'navn', 'aar', 'magasin', 'geo'],
    'magasin': ['id', 'navn', 'hrv', 'lrv', 'volum_mm3', 'geo'],
    'olje': ['id', 'navn', 'type', 'felt', 'fase', 'funksjon', 'geo'],    # type 0 plattform, 1 havbunn, 2 flytende, 3 på land
    'ror': ['id', 'navn', 'medium', 'tommer', 'fra', 'til', 'geo'],
    'felt': ['id', 'navn', 'hydrokarbon', 'status', 'funnet', 'geo'],
    'tettsted': ['id', 'navn', 'folk', 'geo'],
}
KILDER = {'bru': 'NVDB (Statens vegvesen, NLOD)', 'tunnel': 'NVDB', 'ferje': 'NVDB', 'ferjekai': 'NVDB',
          'kraft': 'NVE (NLOD)', 'dam': 'NVE', 'magasin': 'NVE', 'olje': 'Sokkeldirektoratet (NLOD)', 'ror': 'Sokkeldirektoratet',
          'felt': 'Sokkeldirektoratet', 'tettsted': 'SSB (CC BY 4.0)'}


def main(utmappe):
    os.makedirs(utmappe, exist_ok=True)
    lag = {}
    lag['bru'] = bruer(); lag['tunnel'] = tunneler(); lag['ferje'], lag['ferjekai'] = ferjer()
    lag['kraft'], lag['dam'], lag['magasin'] = nve(); lag['olje'], lag['ror'], lag['felt'] = sodir()
    lag['tettsted'] = tettsteder()
    for k in lag: lag[k].sort(key=lambda o: (o[0] is None, o[0] if o[0] is not None else 0))
    data = {'aar': ÅR, 'crs': 'EPSG:25833', 'kilder': KILDER, 'felt': FELT, 'lag': lag}
    tekst = json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    open(os.path.join(utmappe, 'infra.json'), 'wb').write(tekst)
    tag = f'kart-infra-{ÅR}-' + hashlib.sha256(tekst).hexdigest()[:12]
    stat = {k: len(v) for k, v in lag.items()}
    man = {'versjon': tag, 'aar': ÅR, 'kilder': KILDER, 'filer': {'infra': [{'fil': 'infra.json', 'byte': len(tekst), 'gzip': len(gzip.compress(tekst))}]},
           'statistikk': stat}
    json.dump(man, open(os.path.join(utmappe, 'manifest.json'), 'w'), ensure_ascii=False, indent=1)
    open(os.path.join(utmappe, 'tag.txt'), 'w').write(tag)
    logg('ferdig:', tag, round(len(tekst) / 1e6, 2), 'MB (gzip', round(man['filer']['infra'][0]['gzip'] / 1e6, 2), 'MB)', stat)


if __name__ == '__main__':
    main(sys.argv[1])
