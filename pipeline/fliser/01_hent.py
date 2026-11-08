"""Henter rådata til flisene for et område i EPSG:25833 og lagrer dem i arbeid/ (ikke i git).

- Høyde: Kartverkets nasjonale høydemodell (DTM, 1 m grunnlag) via WCS, CC BY 4.0.
  Hele området i 8 m (z11), kjerneområdet rundt Dombås i 2 m (z13).
- Landsat 5 13. aug 1987 (USGS, fritt): bånd fra Microsoft Planetary Computer, reprojisert til 32 m-nettet (z9).
Krever rasterio, numpy, tifffile. Bak proxy: pek CURL_CA_BUNDLE på proxyens sertifikatfil (aldri slå av sjekken).
Bruk: python3 01_hent.py   (hopper over det som allerede er hentet)
"""
import os, io, json, urllib.request, urllib.parse, numpy as np, tifffile
import rasterio
from rasterio.warp import reproject, Resampling, transform_bounds
from rasterio.transform import from_origin
from felles import CRS, DOVRE, DOMBAS, res

ARB = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'arbeid'); os.makedirs(ARB, exist_ok=True)
WCS = "https://wcs.geonorge.no/skwms1/wcs.hoyde-dtm-nhm-25833"


def hent(url, data=None, headers={}):
    for forsok in range(4):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, data=data, headers=headers), timeout=300).read()
        except Exception as e:
            print('prøver igjen:', e)
    raise RuntimeError('fikk ikke hentet ' + url[:120])


def hoyde(bounds, r, navn, bit=2000):
    ut = os.path.join(ARB, navn)
    if os.path.exists(ut): print('har', navn); return
    minx, miny, maxx, maxy = bounds
    W, H = round((maxx - minx) / r), round((maxy - miny) / r)
    a = np.full((H, W), np.nan, np.float32)
    for j in range(0, H, bit):
        for i in range(0, W, bit):
            w, h = min(bit, W - i), min(bit, H - j)
            bx = (minx + i * r, maxy - (j + h) * r, minx + (i + w) * r, maxy - j * r)
            q = dict(service='WCS', version='1.0.0', request='GetCoverage', coverage='nhm_dtm_topo_25833', crs=CRS,
                     bbox=','.join(f'{v:.1f}' for v in bx), width=w, height=h, format='GeoTIFF')
            t = tifffile.imread(io.BytesIO(hent(WCS + '?' + urllib.parse.urlencode(q)))).astype(np.float32)
            t[(t < -500) | (t > 3000)] = np.nan  # ingen data (sjø) -> NaN
            a[j:j + h, i:i + w] = t
            print(navn, j, i, float(np.nanmin(t)), float(np.nanmax(t)), flush=True)
    np.save(ut, a)


def landsat(bounds, r):
    ut = os.path.join(ARB, 'landsat.npz')
    if os.path.exists(ut): print('har landsat'); return
    bbox4326 = list(transform_bounds(CRS, 'EPSG:4326', *bounds))
    q = {"collections": ["landsat-c2-l2"], "bbox": bbox4326, "datetime": "1987-08-13T00:00:00Z/1987-08-13T23:59:59Z",
         "query": {"platform": {"in": ["landsat-5"]}}, "limit": 20}
    js = json.loads(hent("https://planetarycomputer.microsoft.com/api/stac/v1/search", json.dumps(q).encode(),
                         {"Content-Type": "application/json"}))
    feats = {f['id']: f for f in js['features']}
    sign = lambda h: json.loads(hent("https://planetarycomputer.microsoft.com/api/sas/v1/sign?href=" + urllib.parse.quote(h, safe='')))['href']
    scener = [s for s in ['LT05_L2SP_199017_19870813_02_T1', 'LT05_L2SP_199016_19870813_02_T1'] if s in feats]
    print('scener', scener, flush=True)
    minx, miny, maxx, maxy = bounds
    W, H = round((maxx - minx) / r), round((maxy - miny) / r)
    T = from_origin(minx, maxy, r, r); mos = {}
    for b in ['red', 'green', 'blue', 'nir08', 'swir16']:
        ut_b = np.zeros((H, W), np.float32)
        for sid in scener:
            with rasterio.open(sign(feats[sid]['assets'][b]['href'])) as src:
                tmp = np.zeros((H, W), np.float32)
                reproject(rasterio.band(src, 1), tmp, dst_transform=T, dst_crs=CRS,
                          resampling=Resampling.bilinear, src_nodata=0, dst_nodata=0)
                m = ut_b == 0; ut_b[m] = tmp[m]
        mos[b] = ut_b; print('bånd', b, round(float((ut_b > 0).mean()), 3), flush=True)
    np.savez_compressed(ut, **mos)


if __name__ == '__main__':
    landsat(DOVRE, res(9))
    hoyde(DOVRE, res(11), 'hoyde_8m.npy')
    hoyde(DOMBAS, res(13), 'hoyde_2m.npy')
