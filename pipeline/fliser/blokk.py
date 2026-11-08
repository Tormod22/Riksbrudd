"""Bygger én blokk av Norge et gitt år (standard 2023): en z6-flis (65,5 × 65,5 km) med alle lag, som egne PMTiles-filer.
Kjøres i GitHub Actions for hver blokk fra blokker.py; sammen.py setter blokkene sammen.

  høyde    Kartverket DTM (WCS), 8 m, hentet med 512 m margin (sømløse kanter mellom blokkene), z6–z11
  ÅR >= 2017 (Sentinel-2-tiden):
  kart     Sentinel-2 L2A, sommeren ÅR, skyfri median (SCL-maske), stil 1-farge etter arealklasse, 16 m, z6–z10
  terreng  ESA WorldCover 2021 (10 m), med tettbebyggelse (klasse 7), z6–z10
  ÅR < 2017 (Landsat 5-tiden, f.eks. 1986):
  kart     Landsat 5, somrene ÅR-1 til ÅR+2, skyfri median (QA_PIXEL), 32 m, z6–z9; terreng klassifisert fra samme
  Alltid:
  vektor   veger fra NVDB slik vegnettet var 1. juni ÅR (tidspunkt) og bygg fra matrikkelen, z8–z13

Bruk: python3 blokk.py X Y [utmappe] [år]      (utmappe: standard arbeid/blokker/X_Y, år: miljøvariabel AAR eller 2023)
Krever: numpy, pillow, rasterio, pyproj, shapely, tifffile, mapbox-vector-tile, pmtiles. Bak proxy: CURL_CA_BUNDLE.
"""
import os, sys, io, json, time, urllib.request, urllib.parse, concurrent.futures as cf
import numpy as np, tifffile
from pyproj import Transformer
from shapely.geometry import LineString, Point, box
from shapely import clip_by_rect, STRtree
from pmtiles.writer import Writer
from pmtiles.tile import zxy_to_tileid, TileType, Compression
from felles import CRS, TILE, res, span, tile_bounds
from fliskode import Lerret, kod_hoyde, kod_terreng, webp, klassifiser, flisomraade, mvt, INGEN, fra_worldcover, farge

HER = os.path.dirname(os.path.abspath(__file__))
ZB = 6                 # blokknivå
MARGIN = 512.0         # meter rundt blokken for høyden (delelig med alle nivåenes piksel ned til z6? 512 = 2 px på z6)
ÅR = int(os.environ.get('AAR', '2023'))   # miljøvariabel AAR (bash tåler ikke «Å» i navnet) eller 4. argument
VEG_DATO = f'{ÅR}-06-01'
IKKE_BYGD = {'IG', 'RA', 'GR', 'BR', 'BF'}   # bare tillatelse, eller revet/brent/flyttet
T0 = time.time()
def logg(*a): print(f'[{time.time() - T0:6.0f} s]', *a, flush=True)


def hent(url, data=None, headers={}, forsok=8):
    """Henter med nye forsøk. 429 (for mange forespørsler) og nettbrudd hendte med 20 blokker samtidig 8. nov:
    vent da lenger (Retry-After om kilden oppgir det), opptil ca. 4 min til sammen."""
    for k in range(forsok):
        try: return urllib.request.urlopen(urllib.request.Request(url, data=data, headers=headers), timeout=300).read()
        except Exception as e:
            if k == forsok - 1: raise
            vent = 3 * 2 ** k if k < 6 else 60
            ra = getattr(e, 'headers', None) and e.headers.get('Retry-After')
            if ra and ra.isdigit(): vent = max(vent, min(120, int(ra)))
            logg('prøver igjen om', vent, 's:', str(e)[:120]); time.sleep(vent)


# ---------- høyde ----------
# Dekningen til Kartverkets WCS (DescribeCoverage 8. nov): fastlandet, ikke Svalbard. Utsnitt helt utenfor gir
# «BBOX is invalid» (det knakk fire kystblokker i vest); delvis utenfor går fint.
WCS_DEKNING = (-100275.0, 6399725.0, 1150255.0, 8000275.0)

def hoyde(b, r=8.0, bit=2080):
    WCS = "https://wcs.geonorge.no/skwms1/wcs.hoyde-dtm-nhm-25833"
    minx, miny, maxx, maxy = b; W, H = round((maxx - minx) / r), round((maxy - miny) / r)
    a = np.full((H, W), np.nan, np.float32)
    def del_(ji):
        j, i = ji; w, h = min(bit, W - i), min(bit, H - j)
        bx = (minx + i * r, maxy - (j + h) * r, minx + (i + w) * r, maxy - j * r)
        d = WCS_DEKNING
        if bx[2] <= d[0] or bx[0] >= d[2] or bx[3] <= d[1] or bx[1] >= d[3]: return   # helt utenfor: hav (eller Svalbard)
        q = dict(service='WCS', version='1.0.0', request='GetCoverage', coverage='nhm_dtm_topo_25833', crs=CRS,
                 bbox=','.join(f'{v:.1f}' for v in bx), width=w, height=h, format='GeoTIFF')
        for forsok in range(5):   # ødelagte/avkuttede bilder hender (blokk 3,40 8. nov): hent på nytt
            data = hent(WCS + '?' + urllib.parse.urlencode(q))
            if data[:2] not in (b'II', b'MM'):   # ikke TIFF: tjenesten svarte med en feilmelding
                if b'BBOX is invalid' in data: return
                raise RuntimeError('høydetjenesten svarte: ' + data[:300].decode('utf-8', 'replace'))
            try: t = tifffile.imread(io.BytesIO(data)).astype(np.float32); break
            except Exception as e:
                if forsok == 4: raise
                logg('ødelagt høydebilde, prøver igjen:', str(e)[:100]); time.sleep(3 * (forsok + 1))
        t[(t < -500) | (t > 3000) | (t == 0)] = np.nan   # tjenesten gir havet nøyaktig 0 m: regnes som hav
        a[j:j + h, i:i + w] = t[:h, :w]
    with cf.ThreadPoolExecutor(4) as ex: list(ex.map(del_, [(j, i) for j in range(0, H, bit) for i in range(0, W, bit)]))
    return a


# ---------- Landsat 1985–88, skyfri median ----------
def landsat(b, år=1986, r=32.0, maks_scener=14, nok=3):
    import rasterio
    from rasterio.warp import reproject, Resampling, transform_bounds
    from rasterio.transform import from_origin
    minx, miny, maxx, maxy = b; W, H = round((maxx - minx) / r), round((maxy - miny) / r)
    ll = list(transform_bounds(CRS, 'EPSG:4326', *b))
    feats = []
    for a in (år - 1, år, år + 1, år + 2):
        q = {"collections": ["landsat-c2-l2"], "bbox": ll, "datetime": f"{a}-06-15T00:00:00Z/{a}-09-10T23:59:59Z",
             "query": {"platform": {"in": ["landsat-5"]}, "eo:cloud_cover": {"lt": 70}}, "limit": 200}
        feats += json.loads(hent("https://planetarycomputer.microsoft.com/api/stac/v1/search", json.dumps(q).encode(), {"Content-Type": "application/json"}))['features']
    # helst 1986 og lite skyer
    feats.sort(key=lambda f: f['properties']['eo:cloud_cover'] + 8 * abs(int(f['properties']['datetime'][:4]) - år))
    logg('landsat:', len(feats), 'kandidater')
    sign = lambda h: json.loads(hent("https://planetarycomputer.microsoft.com/api/sas/v1/sign?href=" + urllib.parse.quote(h, safe='')))['href']
    T = from_origin(minx, maxy, r, r); BÅND = ['red', 'green', 'blue', 'nir08', 'swir16']
    stabel = {k: [] for k in BÅND}; alle = {k: [] for k in BÅND}; antall = np.zeros((H, W), np.uint8); brukt = []
    def les(f, bånd, nearest=False):
        import rasterio
        with rasterio.open(sign(f['assets'][bånd]['href'])) as src:
            dst = np.zeros((H, W), np.float32 if not nearest else np.uint16)
            reproject(rasterio.band(src, 1), dst, dst_transform=T, dst_crs=CRS,
                      resampling=Resampling.nearest if nearest else Resampling.bilinear, src_nodata=0 if not nearest else 1, dst_nodata=0 if not nearest else 1)
            return dst
    for f in feats:
        if len(brukt) >= maks_scener or (antall >= nok).mean() > 0.995: break
        try:
            with cf.ThreadPoolExecutor(6) as ex:
                qa = ex.submit(les, f, 'qa_pixel', True); bb = {k: ex.submit(les, f, k) for k in BÅND}
                qa = qa.result(); bb = {k: v.result() for k, v in bb.items()}
        except Exception as e:
            logg('hopper over', f['id'], str(e)[:100]); continue
        # klar: ikke fyll (bit 0), ikke utvidet sky (1), sky (3) eller skygge (4)
        klar = ((qa & 0b11011) == 0) & (bb['red'] > 0)
        if klar.mean() < 0.01: continue
        for k in BÅND:
            stabel[k].append(np.where(klar, bb[k], np.nan).astype(np.float32))
            alle[k].append(np.where(bb[k] > 0, bb[k], np.nan).astype(np.float32))   # reserve: QA kaller ofte snø og is for sky
        antall += klar; brukt.append(f['id'])
        logg('  scene', f['id'], f"sky {f['properties']['eo:cloud_cover']:.0f} %", f'dekning {(antall > 0).mean():.3f}')
    ut = {}
    for k in BÅND:
        if stabel[k]:
            with np.errstate(all='ignore'):
                m = np.nanmedian(np.stack(stabel[k]), axis=0)
                hull = np.isnan(m)
                if hull.any(): m[hull] = np.nanmedian(np.stack(alle[k]), axis=0)[hull]   # ingen klare opptak: median av alle
            ut[k] = np.where(np.isnan(m), 0, m).astype(np.float32)
        else: ut[k] = np.zeros((H, W), np.float32)
        stabel[k] = alle[k] = None
    return ut, brukt, float((antall > 0).mean())


def skoggrense_for(b, rader):
    """Skoggrense per rad (moh.) etter breddegrad: ca. 1150 m ved 60° N, 980 m på Dovre, 350 m i Finnmark (70° N).
    Grov tilnærming; kysten ligger lavere enn innlandet (TODO: avstand til kysten)."""
    tr = Transformer.from_crs(CRS, 'EPSG:4326', always_xy=True)
    ys = b[3] - (np.arange(rader) + .5) * (b[3] - b[1]) / rader
    _, lat = tr.transform(np.full(rader, (b[0] + b[2]) / 2), ys)
    return np.clip(1150 - 80 * (np.asarray(lat) - 60), 250, 1200)[:, None]


# ---------- Sentinel-2 (sommeren ÅR) og WorldCover ----------
def sentinel2(b, år, r=16.0, maks_scener=12, nok=3):
    """Skyfri median av rød/grønn/blå (reflektans 0–1) for sommeren `år`, i nettet r meter. SCL: 4 vegetasjon, 5 bart,
    6 vann, 7 uklassifisert, 11 snø regnes som klart; skyer, skygger, cirrus og manglende data ikke."""
    import rasterio
    from rasterio.warp import reproject, Resampling, transform_bounds
    from rasterio.transform import from_origin
    minx, miny, maxx, maxy = b; W, H = round((maxx - minx) / r), round((maxy - miny) / r)
    ll = list(transform_bounds(CRS, 'EPSG:4326', *b))
    q = {"collections": ["sentinel-2-l2a"], "bbox": ll, "datetime": f"{år}-06-15T00:00:00Z/{år}-08-31T23:59:59Z",
         "query": {"eo:cloud_cover": {"lt": 50}}, "limit": 300}
    feats = json.loads(hent("https://planetarycomputer.microsoft.com/api/stac/v1/search", json.dumps(q).encode(), {"Content-Type": "application/json"}))['features']
    feats.sort(key=lambda f: f['properties']['eo:cloud_cover'])
    logg('sentinel-2:', len(feats), 'kandidater')
    sign = lambda h: json.loads(hent("https://planetarycomputer.microsoft.com/api/sas/v1/sign?href=" + urllib.parse.quote(h, safe='')))['href']
    T = from_origin(minx, maxy, r, r); BÅND = ['B04', 'B03', 'B02']
    def les(f, bånd, kategori=False):
        import rasterio
        with rasterio.open(sign(f['assets'][bånd]['href'])) as src:
            dst = np.zeros((H, W), np.uint16)
            reproject(rasterio.band(src, 1), dst, dst_transform=T, dst_crs=CRS, src_nodata=0, dst_nodata=0,
                      resampling=Resampling.nearest if kategori else Resampling.average)
            return dst
    # Minnevennlig: klare verdier lagres som heltall (DN + 1, 0 = mangler) i én ferdig tabell; reserven er første verdi
    # uansett sky (QA kaller ofte snø og is for sky). Ca. 1,2 GB for 12 scener i 16 m, mot 7 GB med flyttall.
    stabel = np.zeros((len(BÅND), maks_scener, H, W), np.uint16); reserve = np.zeros((len(BÅND), H, W), np.uint16)
    antall = np.zeros((H, W), np.uint8); brukt = []
    for f in feats:
        if len(brukt) >= maks_scener or (antall >= nok).mean() > 0.995: break
        try:
            with cf.ThreadPoolExecutor(4) as ex:
                scl = ex.submit(les, f, 'SCL', True); bb = {k: ex.submit(les, f, k) for k in BÅND}
                scl = scl.result(); bb = {k: v.result() for k, v in bb.items()}
        except Exception as e:
            logg('hopper over', f['id'], str(e)[:100]); continue
        if not (bb['B04'] > 0).any(): continue
        forskyv = 1000 if f['properties'].get('s2:processing_baseline', '00.00') >= '04.00' else 0   # fra 2022: DN = 10000·ρ + 1000
        klar = np.isin(scl, (4, 5, 6, 7, 11)) & (bb['B04'] > 0)
        s = len(brukt)
        for i, k in enumerate(BÅND):
            dn = np.clip(bb[k].astype(np.int32) - forskyv, 0, 65534).astype(np.uint16) + 1   # +1 så 0 betyr «mangler»
            stabel[i, s] = np.where(klar, dn, 0)
            reserve[i] = np.where((reserve[i] == 0) & (bb[k] > 0), dn, reserve[i])
        del bb, scl
        antall += klar; brukt.append(f['id'])
        logg('  scene', f['id'], f"sky {f['properties']['eo:cloud_cover']:.0f} %", f'dekning {(antall > 0).mean():.3f}')
    S = len(brukt); ut = np.full((H, W, len(BÅND)), np.nan, np.float32)
    for i in range(len(BÅND)):
        for j in range(0, H, 256):   # median bit for bit
            st = stabel[i, :S, j:j + 256].astype(np.float32); st[st == 0] = np.nan
            with np.errstate(all='ignore'): m = np.nanmedian(st, axis=0) if S else np.full(st.shape[1:], np.nan, np.float32)
            r_ = reserve[i, j:j + 256].astype(np.float32); m = np.where(np.isnan(m) & (r_ > 0), r_, m)
            ut[j:j + 256, :, i] = (m - 1) / 10000
    del stabel
    return ut, brukt, float((antall > 0).mean())


def worldcover(b, r=16.0):
    """ESA WorldCover 2021 (10 m) i nettet r meter, mest vanlige klasse per rute (mode)."""
    import rasterio
    from rasterio.warp import reproject, Resampling, transform_bounds
    from rasterio.transform import from_origin
    minx, miny, maxx, maxy = b; W, H = round((maxx - minx) / r), round((maxy - miny) / r)
    q = {"collections": ["esa-worldcover"], "bbox": list(transform_bounds(CRS, 'EPSG:4326', *b)), "limit": 20}
    feats = [f for f in json.loads(hent("https://planetarycomputer.microsoft.com/api/stac/v1/search", json.dumps(q).encode(), {"Content-Type": "application/json"}))['features'] if '2021' in f['id']]
    sign = lambda h: json.loads(hent("https://planetarycomputer.microsoft.com/api/sas/v1/sign?href=" + urllib.parse.quote(h, safe='')))['href']
    ut = np.zeros((H, W), np.uint8); T = from_origin(minx, maxy, r, r)
    for f in feats:
        with rasterio.open(sign(f['assets']['map']['href'])) as src:
            tmp = np.zeros((H, W), np.uint8)
            reproject(rasterio.band(src, 1), tmp, dst_transform=T, dst_crs=CRS, src_nodata=0, dst_nodata=0, resampling=Resampling.mode)
            ut = np.where(ut == 0, tmp, ut)
    logg('worldcover:', [f['id'] for f in feats])
    return ut


# ---------- veger og bygg ----------
def veger(b):
    q = urllib.parse.urlencode({'kartutsnitt': ','.join(f'{v:.0f}' for v in b), 'srid': '5973', 'antall': 1000, 'tidspunkt': VEG_DATO})
    base = "https://nvdbapiles.atlas.vegvesen.no/vegnett/api/v4/veglenkesekvenser/segmentert?" + q
    u, ut = base, []
    while u:
        d = json.loads(hent(u, headers={'X-Client': 'riksbrudd', 'Accept': 'application/json'}))
        for o in d['objekter']:
            if o.get('detaljnivå') not in ('Vegtrase og kjørebane', 'Vegtrase'): continue
            kat = (o.get('vegsystemreferanse') or {}).get('vegsystem', {}).get('vegkategori', 'P')
            if kat == 'P' and o.get('typeVeg') != 'Enkel bilveg': continue
            wkt = o['geometri']['wkt']; i, j = wkt.find('('), wkt.rfind(')')
            p = [[float(c.split()[0]), float(c.split()[1])] for c in wkt[i + 1:j].replace('(', '').replace(')', '').split(',')]
            if len(p) > 1: ut.append({'c': kat, 'p': p})
        nx = d['metadata'].get('neste')
        u = base + '&start=' + urllib.parse.quote(nx['start']) if nx and d['objekter'] else None
    return ut

def bygg(b):
    import re
    bb = ','.join(f'{v:.0f}' for v in b)
    base = ("https://wfs.geonorge.no/skwms1/wfs.matrikkelen-bygningspunkt?service=WFS&version=2.0.0&request=GetFeature"
            f"&typeNames=app:Bygning&srsName={CRS}&bbox={bb},{CRS}&count=5000&startIndex=")
    ut, start = [], 0
    while True:
        x = hent(base + str(start)).decode('utf-8', 'ignore')
        feats = re.findall(r'<app:Bygning .*?</app:Bygning>', x, re.S)
        for f in feats:
            t = re.search(r'<app:bygningstype>(\d+)', f); p = re.search(r'<gml:pos>([\d.]+) ([\d.]+)', f); st = re.search(r'<app:bygningsstatus>(\w+)', f)
            if t and p and not (st and st.group(1) in IKKE_BYGD):
                X, Y = float(p.group(1)), float(p.group(2))
                if X > 2e6: X, Y = Y, X
                if b[0] <= X < b[2] and b[1] <= Y < b[3]: ut.append([round(X, 1), round(Y, 1), int(t.group(1))])
        if len(feats) < 5000: break
        start += 5000
    return ut


# ---------- skriving ----------
def skriv(sti, fliser, ttype, komp):
    if not fliser: return 0
    fliser.sort(key=lambda t: zxy_to_tileid(*t[0]))
    zs = [z for (z, _, _), _ in fliser]
    with open(sti, 'wb') as f:
        w = Writer(f)
        for (z, x, y), d in fliser: w.write_tile(zxy_to_tileid(z, x, y), d)
        w.finalize({'tile_type': ttype, 'tile_compression': komp, 'min_zoom': min(zs), 'max_zoom': max(zs),
                    'min_lon_e7': 0, 'min_lat_e7': 0, 'max_lon_e7': 0, 'max_lat_e7': 0, 'center_zoom': 0, 'center_lon_e7': 0, 'center_lat_e7': 0}, {})
    return os.path.getsize(sti)


def main(bx, by, ut):
    os.makedirs(ut, exist_ok=True)
    B = tile_bounds(ZB, bx, by); M = (B[0] - MARGIN, B[1] - MARGIN, B[2] + MARGIN, B[3] + MARGIN)
    stat = {'blokk': [bx, by], 'grenser': B, 'år': ÅR}
    logg('blokk', bx, by, B)

    # høyde
    h8 = hoyde(M); land = float((~np.isnan(h8)).mean()); stat['land'] = land; logg('høyde ferdig, land', round(land, 3))
    if land == 0:
        stat['tom'] = True; json.dump(stat, open(os.path.join(ut, 'stat.json'), 'w')); logg('bare sjø – ingenting å bygge'); return
    hf = []; L = Lerret.fra(h8, M, 11, np.nan); h32 = None
    while L.z >= ZB:
        for x, y, t in L.fliser(kant=1, innenfor=flisomraade(bx, by, L.z)):
            if not np.all(np.isnan(t[1:-1, 1:-1])): hf.append(((L.z, x, y), kod_hoyde(t, L.z)))
        if L.z == 9: h32 = L
        L = L.ned('snitt')
    del h8
    stat['hoyde'] = skriv(os.path.join(ut, 'hoyde.pmtiles'), hf, TileType.WEBP, Compression.NONE); logg('høydefliser', len(hf))

    if ÅR >= 2017:   # Sentinel-2 og WorldCover, 16 m (z10)
        zk = 10; x0, y0, x1, y1 = flisomraade(bx, by, zk)
        rgb, brukt, dekning = sentinel2(B, ÅR); stat['satellitt'] = {'kilde': f'Sentinel-2 L2A sommeren {ÅR}', 'scener': brukt, 'dekning': round(dekning, 4)}
        k = fra_worldcover(worldcover(B))
        k[(k == 255) & np.isnan(rgb[..., 0])] = 255
        tex = farge(k, rgb); del rgb
    else:            # Landsat 5, 32 m (z9)
        zk = 9; x0, y0, x1, y1 = flisomraade(bx, by, zk)
        bånd, brukt, dekning = landsat(B, ÅR); stat['satellitt'] = {'kilde': f'Landsat 5 somrene {ÅR - 1}–{ÅR + 2}', 'scener': brukt, 'dekning': round(dekning, 4)}
        oy = (y0 - h32.ty0) * TILE; ox = (x0 - h32.tx0) * TILE
        dem = h32.a[oy:oy + (y1 - y0 + 1) * TILE, ox:ox + (x1 - x0 + 1) * TILE]
        k, tex = klassifiser(bånd, dem, skoggrense_for(B, dem.shape[0])); del bånd
    stat['landsat'] = stat['satellitt']   # gammelt navn (sammen.py)
    tf, kf = [], []
    Lk = Lerret(k, x0, y0, zk); Lt = Lerret(tex, x0, y0, zk)
    while Lk.z >= ZB:
        for x, y, t in Lk.fliser():
            if (t != 255).any(): tf.append(((Lk.z, x, y), kod_terreng(t)))
        for x, y, t in Lt.fliser():
            if (t != INGEN).any(): kf.append(((Lt.z, x, y), webp(t)))
        Lk = Lk.ned('naermest'); Lt = Lt.ned('snitt')
    stat['terreng'] = skriv(os.path.join(ut, 'terreng.pmtiles'), tf, TileType.WEBP, Compression.NONE)
    stat['kart'] = skriv(os.path.join(ut, 'kart.pmtiles'), kf, TileType.WEBP, Compression.NONE)
    stat['klasser'] = {int(a): int(c) for a, c in zip(*np.unique(k, return_counts=True))}
    logg('terreng og kart ferdig')

    # veger 1986 og bygg -> vektor
    vg = veger(M); bg = bygg(B); stat['veger'] = len(vg); stat['bygg'] = len(bg); logg('veger', len(vg), 'bygg', len(bg))
    linjer = [LineString(v['p']) for v in vg]; kat = [v['c'] for v in vg]; punkt = [Point(b[0], b[1]) for b in bg]
    tl, tp = STRtree(linjer), STRtree(punkt)
    VIS = {8: 'ERF', 9: 'ERFK'}
    vf = []
    for z in range(8, 14):
        s = span(z); buf = s * 8 / TILE; xa, ya, xb, yb = flisomraade(bx, by, z)
        for y in range(ya, yb + 1):
            for x in range(xa, xb + 1):
                minx, miny, maxx, maxy = tile_bounds(z, x, y); lag = []
                q = lambda X, Y: (round((X - minx) / s * 4096), round((maxy - Y) / s * 4096))
                f = []
                for i in tl.query(box(minx - buf, miny - buf, maxx + buf, maxy + buf)):
                    if kat[i] not in VIS.get(z, 'ERFKPS'): continue
                    g = clip_by_rect(linjer[i], minx - buf, miny - buf, maxx + buf, maxy + buf)
                    if g.is_empty: continue
                    if z < 13: g = g.simplify(res(z) * 0.5)
                    for part in getattr(g, 'geoms', [g]):
                        if part.geom_type != 'LineString' or len(part.coords) < 2: continue
                        c = [q(X, Y) for X, Y in part.coords]; c = [p for n, p in enumerate(c) if n == 0 or p != c[n - 1]]
                        if len(c) >= 2: f.append({'geometry': LineString(c), 'properties': {'k': kat[i]}})
                if f: lag.append({'name': 'veg', 'features': f})
                if z >= 11:
                    bf = [{'geometry': Point(*q(punkt[i].x, punkt[i].y)), 'properties': {'t': bg[i][2]}}
                          for i in tp.query(box(minx, miny, maxx, maxy)) if minx <= punkt[i].x < maxx and miny <= punkt[i].y < maxy]
                    if bf: lag.append({'name': 'bygg', 'features': bf})
                if lag: vf.append(((z, x, y), mvt(lag)))
    stat['vektor'] = skriv(os.path.join(ut, 'vektor.pmtiles'), vf, TileType.MVT, Compression.GZIP)
    stat['sekunder'] = round(time.time() - T0)
    json.dump(stat, open(os.path.join(ut, 'stat.json'), 'w'), indent=1); logg('ferdig', json.dumps({k: stat[k] for k in ('hoyde', 'kart', 'terreng', 'vektor', 'veger', 'bygg')}))


if __name__ == '__main__':
    bx, by = int(sys.argv[1]), int(sys.argv[2])
    if len(sys.argv) > 4: ÅR = int(sys.argv[4]); VEG_DATO = f'{ÅR}-06-01'
    main(bx, by, sys.argv[3] if len(sys.argv) > 3 else os.path.join(HER, 'arbeid', 'blokker', f'{bx}_{by}'))
