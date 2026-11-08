"""Landene vest for flisnettet (Storbritannia, Shetland, Irland, Færøyene, Island, kysten av Nord-Frankrike) som ett grovt bilde.
Flisnettet starter ved X0 = −200 km (felles.py), så dette kan ikke være fliser: visningen tegner bildet under kartet.
Samme kilder og stil som omland.py (Copernicus DEM GLO-90, ESA WorldCover 2021), skyggen og fargene er ferdig bakt inn
(samme lys som visningen, omlandets lysstyrke OMLAND_LYS, vann og hav i HAV-blått).
Bruk: python3 vest.py  -> site/dovre-fliser/data/vest.webp (grensene står i VEST i index.html)"""
import os, numpy as np
from concurrent.futures import ThreadPoolExecutor
from PIL import Image
import omland
from fliskode import PAL

B = (-1300000.0, 5650000.0, -200000.0, 8000000.0)   # minx, miny, maxx, maxy (EPSG:25833)
R = 500.0                                           # meter per punkt
HAV, LYS = np.array([44, 74, 102], np.float32), 0.8   # som HAV og OMLAND_LYS i index.html

def main():
    W, H = round((B[2] - B[0]) / R), round((B[3] - B[1]) / R); h = np.full((H, W), np.nan, np.float32); tex = np.zeros((H, W, 3), np.uint8)
    nx, ny = 4, 6; bw, bh = W // nx, -(-H // ny)
    def bit(ij):
        i, j = ij; x0, y1 = B[0] + i * bw * R, B[3] - j * bh * R; w = bw if i < nx - 1 else W - i * bw; hh = min(bh, H - j * bh)
        a, t = omland.rute((x0, y1 - hh * R, x0 + w * R, y1), R)
        h[j * bh:j * bh + hh, i * bw:i * bw + w] = a; tex[j * bh:j * bh + hh, i * bw:i * bw + w] = t; omland.logg('vest', i, j)
    with ThreadPoolExecutor(6) as ex: list(ex.map(bit, [(i, j) for j in range(ny) for i in range(nx)]))
    vann = np.all(tex == np.array(PAL[3], np.uint8), axis=2) | np.isnan(h)
    z = np.where(np.isnan(h), 0, h); ve = 2.0
    gx = np.zeros_like(z); gy = np.zeros_like(z)
    gx[:, 1:-1] = (z[:, 2:] - z[:, :-2]) / (2 * R) * ve; gy[1:-1] = (z[2:] - z[:-2]) / (2 * R) * ve   # dz østover, dz nedover (sørover)
    Lx, Ly, Lz = -.5417, .5417, .6428
    s = np.maximum(0, (-gx * Lx + gy * Ly + Lz) / np.sqrt(gx * gx + gy * gy + 1)) / Lz; f = .3 + .7 * np.minimum(1.35, s)
    ut = tex.astype(np.float32) * LYS * f[..., None]; ut[vann] = HAV
    p = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'site', 'dovre-fliser', 'data', 'vest.webp')
    Image.fromarray(np.clip(ut, 0, 255).astype(np.uint8)).save(p, 'WEBP', quality=82, method=6)
    omland.logg('ferdig', W, 'x', H, os.path.getsize(p) // 1000, 'KB', 'land', round(float((~vann).mean()), 3))

if __name__ == '__main__': main()
