"""Setter blokkene (blokk.py) sammen til kartet for hele Norge:
- samler flisene fra alle blokkene per lag,
- lager oversiktsnivåene z0–z5 av z6-flisene (høyde, kart, terreng),
- deler hvert lag i filer under 1,8 GB (GitHub-releaser tillater 2 GB per fil): først etter zoom, så i nord–sør-striper,
- skriver manifest.json som visningen leser (hvilken fil som har hvilke fliser).

Bruk: python3 sammen.py BLOKKMAPPE UTMAPPE      (BLOKKMAPPE har undermapper X_Y/ med *.pmtiles og stat.json)
Skriver også UTMAPPE/tag.txt = kart-norge-<år>-<hash>, navnet på GitHub-releasen.
"""
import os, sys, io, json, glob, hashlib, numpy as np
from PIL import Image
from pmtiles.reader import MmapSource, all_tiles
from pmtiles.writer import Writer
from pmtiles.tile import zxy_to_tileid, TileType, Compression
from felles import CRS, X0, Y0, TILE, span
from fliskode import Lerret, kod_hoyde, kod_terreng, webp, presisjon, INGEN

GRENSE = 1_800_000_000
TYPER = {'hoyde': (TileType.WEBP, Compression.NONE), 'kart': (TileType.WEBP, Compression.NONE),
         'terreng': (TileType.WEBP, Compression.NONE), 'vektor': (TileType.MVT, Compression.GZIP)}


def les_blokker(inn):
    lag = {n: {} for n in TYPER}; stat = []
    for d in sorted(glob.glob(os.path.join(inn, '*', 'stat.json'))):
        stat.append(json.load(open(d))); mappe = os.path.dirname(d)
        for n in TYPER:
            p = os.path.join(mappe, n + '.pmtiles')
            if not os.path.exists(p): continue
            with open(p, 'rb') as f:
                for (z, x, y), data in all_tiles(MmapSource(f)): lag[n][(z, x, y)] = data
    return lag, stat


def bilde(data): return np.array(Image.open(io.BytesIO(data)).convert('RGB'))


def oversikt(lag):
    """z0–z5 av z6-flisene."""
    for n in ('hoyde', 'kart', 'terreng'):
        z6 = {(x, y): d for (z, x, y), d in lag[n].items() if z == 6}
        if not z6: continue
        xs, ys = [x for x, _ in z6], [y for _, y in z6]; x0, y0 = min(xs), min(ys); W, H = max(xs) - x0 + 1, max(ys) - y0 + 1
        if n == 'hoyde':
            a = np.full((H * TILE, W * TILE), np.nan, np.float32)
            for (x, y), d in z6.items():
                p = bilde(d).astype(np.float64); v = p[..., 0] * 256 + p[..., 1]
                a[(y - y0) * TILE:(y - y0 + 1) * TILE, (x - x0) * TILE:(x - x0 + 1) * TILE] = np.where(v > 0, v / presisjon(6) - 1000, np.nan)[1:-1, 1:-1]
            L, mate, kod = Lerret(a, x0, y0, 6), 'snitt', None
        elif n == 'kart':
            a = np.zeros((H * TILE, W * TILE, 3), np.uint8); a[:] = INGEN
            for (x, y), d in z6.items(): a[(y - y0) * TILE:(y - y0 + 1) * TILE, (x - x0) * TILE:(x - x0 + 1) * TILE] = bilde(d)
            L, mate = Lerret(a, x0, y0, 6), 'snitt'
        else:
            a = np.full((H * TILE, W * TILE), 255, np.uint8)
            for (x, y), d in z6.items(): a[(y - y0) * TILE:(y - y0 + 1) * TILE, (x - x0) * TILE:(x - x0 + 1) * TILE] = bilde(d)[..., 0]
            L, mate = Lerret(a, x0, y0, 6), 'naermest'
        L = L.ned(mate)
        while L.z >= 0:
            for x, y, t in L.fliser(kant=1 if n == 'hoyde' else 0):
                if n == 'hoyde' and not np.all(np.isnan(t[1:-1, 1:-1])): lag[n][(L.z, x, y)] = kod_hoyde(t, L.z)
                elif n == 'kart' and (t != INGEN).any(): lag[n][(L.z, x, y)] = webp(t)
                elif n == 'terreng' and (t != 255).any(): lag[n][(L.z, x, y)] = kod_terreng(t)
            if L.z == 0: break
            L = L.ned(mate)


def del_opp(fliser):
    """Deler et lag i filer under GRENSE: hele zoomnivåer sammen så langt det går, ellers striper av z6-kolonner."""
    per_z = {}
    for (z, x, y), d in fliser.items(): per_z.setdefault(z, []).append(((z, x, y), d))
    deler, nå, størrelse = [], [], 0
    for z in sorted(per_z):
        sz = sum(len(d) for _, d in per_z[z])
        if sz > GRENSE:   # for stort alene: striper etter x på z6
            if nå: deler.append((nå, None)); nå, størrelse = [], 0
            kol = {}
            for t in per_z[z]: kol.setdefault(t[0][1] >> max(0, z - 6), []).append(t)
            stripe, s, xa = [], 0, None
            for k in sorted(kol):
                ks = sum(len(d) for _, d in kol[k])
                if stripe and s + ks > GRENSE: deler.append((stripe, (xa, xb))); stripe, s = [], 0
                if not stripe: xa = k
                stripe += kol[k]; s += ks; xb = k
            if stripe: deler.append((stripe, (xa, xb)))
            continue
        if nå and størrelse + sz > GRENSE: deler.append((nå, None)); nå, størrelse = [], 0
        nå += per_z[z]; størrelse += sz
    if nå: deler.append((nå, None))
    return deler


def skriv(sti, fliser, ttype, komp):
    fliser.sort(key=lambda t: zxy_to_tileid(*t[0])); zs = [z for (z, _, _), _ in fliser]
    with open(sti, 'wb') as f:
        w = Writer(f)
        for (z, x, y), d in fliser: w.write_tile(zxy_to_tileid(z, x, y), d)
        w.finalize({'tile_type': ttype, 'tile_compression': komp, 'min_zoom': min(zs), 'max_zoom': max(zs),
                    'min_lon_e7': 0, 'min_lat_e7': 0, 'max_lon_e7': 0, 'max_lat_e7': 0, 'center_zoom': 0, 'center_lon_e7': 0, 'center_lat_e7': 0},
                   {'crs': CRS, 'rutenett': {'x0': X0, 'y0': Y0, 'res0': 16384, 'tile': TILE}})
    return os.path.getsize(sti)


def main(inn, ut):
    os.makedirs(ut, exist_ok=True)
    lag, stat = les_blokker(inn)
    print('blokker:', len(stat), {n: len(v) for n, v in lag.items()}, flush=True)
    oversikt(lag)
    blokker = [s['blokk'] for s in stat if not s.get('tom')]
    xs = [b[0] for b in blokker]; ys = [b[1] for b in blokker]
    omr = [X0 + min(xs) * span(6), Y0 - (max(ys) + 1) * span(6), X0 + (max(xs) + 1) * span(6), Y0 - min(ys) * span(6)]
    man = {'rutenett': {'crs': CRS, 'x0': X0, 'y0': Y0, 'res0': 16384, 'tile': TILE}, 'omrade': omr, 'blokker': blokker,
           'filer': {}, 'statistikk': {}}
    h = hashlib.sha256()
    for n, (tt, komp) in TYPER.items():
        man['filer'][n] = []
        for i, (fl, xs6) in enumerate(del_opp(lag[n])):
            fil = f'{n}-{i}.pmtiles'; b = skriv(os.path.join(ut, fil), fl, tt, komp)
            zs = [z for (z, _, _), _ in fl]
            man['filer'][n].append({'fil': fil, 'zmin': min(zs), 'zmax': max(zs), 'x6': list(xs6) if xs6 else None, 'byte': b, 'fliser': len(fl)})
            h.update(open(os.path.join(ut, fil), 'rb').read()); print(fil, round(b / 1e6, 1), 'MB', flush=True)
    man['statistikk'] = {'blokker': len(stat), 'tomme': sum(1 for s in stat if s.get('tom')),
                         'landsat_dekning_min': min((s['landsat']['dekning'] for s in stat if 'landsat' in s), default=None),
                         'veger': sum(s.get('veger', 0) for s in stat), 'bygg': sum(s.get('bygg', 0) for s in stat)}
    år = stat[0].get('år', 1986) if stat else 0
    tag = f'kart-norge-{år}-' + h.hexdigest()[:12]; man['versjon'] = tag; man['år'] = år
    man['veger_per'] = f'{år}-06-01'
    json.dump(man, open(os.path.join(ut, 'manifest.json'), 'w'), ensure_ascii=False, indent=1)
    open(os.path.join(ut, 'tag.txt'), 'w').write(tag); print('versjon', tag)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
