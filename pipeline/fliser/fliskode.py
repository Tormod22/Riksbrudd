"""Felles kode for å lage fliser: rutenett-justerte lerret, koding av lagene og klassifisering av Landsat.
Brukes av blokk.py (hele Norge) og har samme koding som Dovre-piloten (02_fliser.py)."""
import io, gzip, numpy as np
from PIL import Image
from felles import X0, Y0, TILE, res, span, tiles_for

# ---------- koding (samme som visningen leser) ----------
def presisjon(z): return 10 if z >= 12 else 2      # høyde: 0,1 m på z12–13, 0,5 m ellers

def webp_tapsfri(rgb):
    b = io.BytesIO(); Image.fromarray(rgb).save(b, 'WEBP', lossless=True, quality=50, method=4); return b.getvalue()

def webp(rgb, q=80):
    b = io.BytesIO(); Image.fromarray(rgb).save(b, 'WEBP', quality=q, method=4); return b.getvalue()

def kod_hoyde(h, z):
    v = np.where(np.isnan(h), 0, np.clip(np.round((h + 1000) * presisjon(z)), 1, 65535)).astype(np.uint32)
    return webp_tapsfri(np.dstack([(v >> 8), (v & 255), np.zeros_like(v)]).astype(np.uint8))

def kod_terreng(k): return webp_tapsfri(np.dstack([k, k, k]))


# ---------- lerret: et rutenett-justert bilde over alle fliser som dekker et område ----------
class Lerret:
    def __init__(self, a, tx0, ty0, z): self.a, self.tx0, self.ty0, self.z = a, tx0, ty0, z

    @staticmethod
    def fra(src, bounds, z, fyll):
        """src dekker bounds nøyaktig med oppløsning res(z); bounds må ligge på pikselnettet."""
        t = tiles_for(bounds, z); tx0 = min(x for x, _ in t); ty0 = min(y for _, y in t)
        nx = max(x for x, _ in t) - tx0 + 1; ny = max(y for _, y in t) - ty0 + 1
        a = np.full((ny * TILE, nx * TILE) + src.shape[2:], fyll, src.dtype)
        r = res(z); ox = round((bounds[0] - (X0 + tx0 * span(z))) / r); oy = round(((Y0 - ty0 * span(z)) - bounds[3]) / r)
        h, w = min(src.shape[0], a.shape[0] - oy), min(src.shape[1], a.shape[1] - ox)
        a[oy:oy + h, ox:ox + w] = src[:h, :w]
        return Lerret(a, tx0, ty0, z)

    def ned(self, mate):
        """Halv oppløsning (ett nivå ned). mate: 'snitt' (NaN-sikkert) eller 'naermest'."""
        tx0, ty0 = self.tx0 // 2, self.ty0 // 2
        px, py = (self.tx0 - 2 * tx0) * TILE, (self.ty0 - 2 * ty0) * TILE
        h, w = self.a.shape[:2]; H = -(-(py + h) // (2 * TILE)) * 2 * TILE; W = -(-(px + w) // (2 * TILE)) * 2 * TILE
        fyll = np.nan if self.a.dtype.kind == 'f' else (255 if self.a.dtype == np.uint8 and self.a.ndim == 2 else 0)
        b = np.full((H, W) + self.a.shape[2:], fyll, self.a.dtype); b[py:py + h, px:px + w] = self.a
        if mate == 'naermest': c = b[0::2, 0::2]
        else:
            r = b.reshape(H // 2, 2, W // 2, 2, *self.a.shape[2:])
            if self.a.dtype.kind == 'f':
                with np.errstate(all='ignore'): c = np.nanmean(r, axis=(1, 3)).astype(self.a.dtype)
            else: c = r.mean(axis=(1, 3)).round().astype(self.a.dtype)
        return Lerret(c, tx0, ty0, self.z - 1)

    def fliser(self, kant=0, innenfor=None):
        """Gir (x, y, bilde) for hver flis; kant = piksler fra naboene rundt. innenfor = (x0, y0, x1, y1) i flisnummer."""
        a = np.pad(self.a, [(kant, kant), (kant, kant)] + [(0, 0)] * (self.a.ndim - 2), mode='edge') if kant else self.a
        for j in range(self.a.shape[0] // TILE):
            for i in range(self.a.shape[1] // TILE):
                x, y = self.tx0 + i, self.ty0 + j
                if innenfor and not (innenfor[0] <= x <= innenfor[2] and innenfor[1] <= y <= innenfor[3]): continue
                yield x, y, a[j * TILE:j * TILE + TILE + 2 * kant, i * TILE:i * TILE + TILE + 2 * kant]


def flisomraade(bx, by, z, zb=6):
    """Flisnumrene på nivå z som ligger inni blokken (bx, by) på nivå zb."""
    k = 2 ** (z - zb); return (bx * k, by * k, (bx + 1) * k - 1, (by + 1) * k - 1)


# ---------- Landsat 5 (Collection 2, nivå 2) -> arealklasse og stil 1-farge ----------
PAL = {0: (128, 116, 96), 1: (64, 82, 48), 2: (136, 128, 86), 3: (22, 30, 38), 4: (222, 220, 208), 5: (150, 142, 88), 6: (108, 104, 70)}
INGEN = (26, 23, 16)
LYS = (0.01, 0.30)   # reflektans som strekkes til 0–1 for lysstyrken i kartfargen

def klassifiser(bånd, dem, skoggrense=1050):
    """bånd: dict red/green/blue/nir08/swir16 (rå DN, 0 = ingen data). dem: høyde i samme nett. Returnerer (klasse, farge).
    Klasser: 0 snaufjell, 1 skog, 2 hei, 3 vann, 4 snø, 5 dyrket, 6 myr, 255 ingen data. Tersklene er fra Dovre-piloten.
    skoggrense: tall eller tabell som kan kringkastes mot dem (blokk.py gir én verdi per rad etter breddegrad)."""
    sc = lambda a: np.clip(a * 0.0000275 - 0.2, 0, 1)
    R, G, B, N, S = [sc(bånd[k]) for k in ['red', 'green', 'blue', 'nir08', 'swir16']]
    finnes = bånd['red'] > 0
    d = np.where(np.isnan(dem), 0, dem)
    ndvi = (N - R) / (N + R + 1e-6); ndwi = (G - N) / (G + N + 1e-6); ndsi = (G - S) / (G + S + 1e-6)
    k = np.zeros(R.shape, np.uint8)
    k[ndvi > 0.15] = 2
    k[(ndvi > 0.5) & (d < skoggrense)] = 1
    k[(ndvi > 0.55) & (d < 800) & (S > 0.14)] = 5
    k[(ndvi > 0.3) & (ndvi < 0.5) & (d > 800) & (S < 0.1) & (N < 0.2)] = 6
    k[(ndsi > 0.4) & (G > 0.25)] = 4
    k[(ndwi > 0.1) & (N < 0.12)] = 3
    k[np.isnan(dem) & ~(ndwi > 0)] = 3          # utenfor land i høydemodellen = sjø
    k[~finnes] = 255
    tex = np.zeros(R.shape + (3,), np.float32)
    for kl, c in PAL.items(): tex[k == kl] = c
    # fast strekk for hele landet (ikke per blokk – det ville gitt skjøter mellom blokkene)
    rgb = np.clip((np.dstack([R, G, B]) - LYS[0]) / (LYS[1] - LYS[0]), 0, 1)
    lum = rgb.mean(axis=2, keepdims=True); tex = tex * (0.75 + 0.5 * lum); tex[k == 3] = PAL[3]
    tex[~finnes] = INGEN
    return k, np.clip(tex, 0, 255).astype(np.uint8)


def mvt(lag):
    import mapbox_vector_tile
    return gzip.compress(mapbox_vector_tile.encode(lag, default_options={'y_coord_down': True, 'extents': 4096}), mtime=0)
