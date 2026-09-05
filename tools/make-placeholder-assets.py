#!/usr/bin/env python3
"""Genera gli asset segnaposto di BIM Lead Capture.

Gli originali del brand (assets/water.jpg, assets/logo.png, assets/cherry.png)
vanno semplicemente sovrascritti: i nomi file restano questi.

    pip install numpy Pillow
    python3 tools/make-placeholder-assets.py

water.jpg non e' una foto: e' un render di caustiche calcolate sulla
divergenza del campo d'onda, quindi regge lo shader senza sembrare un
gradiente CSS. Resta comunque un segnaposto.
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
ICONS = os.path.join(ROOT, "icons")
FONT_900 = os.environ.get("MONTSERRAT_900", "/tmp/montserrat-900.ttf")

ACQUA = (0x7F, 0xD1, 0xD8)
PETROLIO = (0x11, 0x4B, 0x5F)
CREMA = (0xFD, 0xFB, 0xF6)
CILIEGIA = (0xF2, 0x6D, 0x6D)

W, H = 1600, 1200
rng = np.random.default_rng(7)


def blur(arr, sigma):
    """Sfocatura gaussiana periodica in frequenza (Pillow non filtra mode F)."""
    h, w = arr.shape
    ky = np.fft.fftfreq(h)[:, None] * h
    kx = np.fft.fftfreq(w)[None, :] * w
    k2 = (kx / w) ** 2 + (ky / h) ** 2
    kernel = np.exp(-2.0 * (np.pi * sigma) ** 2 * k2)
    return np.fft.ifft2(np.fft.fft2(arr) * kernel).real


def spectral_noise(shape, beta, kmin=0.0, kmax=1e9):
    """Rumore frattale periodico: spettro a legge di potenza, fasi casuali."""
    h, w = shape
    ky = np.fft.fftfreq(h)[:, None] * h
    kx = np.fft.fftfreq(w)[None, :] * w
    k = np.sqrt(kx * kx + ky * ky)
    amp = np.zeros_like(k)
    band = (k >= max(kmin, 1e-6)) & (k <= kmax)
    amp[band] = k[band] ** (-beta)
    phase = rng.uniform(0, 2 * np.pi, size=(h, w))
    field = np.fft.ifft2(amp * np.exp(1j * phase)).real
    return field / (np.abs(field).max() + 1e-9)


def wave_field(shape):
    """Campo d'altezza tipo spettro oceanico + derivate analitiche in Fourier."""
    h, w = shape
    ky = np.fft.fftfreq(h)[:, None] * h
    kx = np.fft.fftfreq(w)[None, :] * w
    k = np.sqrt(kx * kx + ky * ky)
    k_safe = np.maximum(k, 1e-6)
    peak = 15.0
    amp = (k_safe / peak) ** 2 * np.exp(-((k_safe / peak) ** 2)) / k_safe
    amp[k > 95] = 0.0
    amp[k < 2] = 0.0
    # dispersione direzionale morbida: niente strisce
    theta = np.arctan2(ky, kx)
    amp *= 0.45 + 0.55 * np.cos(theta - 0.7) ** 2
    spec = amp * np.exp(1j * rng.uniform(0, 2 * np.pi, size=(h, w)))

    def deriv(mult):
        return np.fft.ifft2(mult * spec).real

    hx, hy = deriv(1j * kx), deriv(1j * ky)
    hxx, hyy, hxy = deriv(-kx ** 2), deriv(-ky ** 2), deriv(-kx * ky)
    # scala unica: la curvatura deve stare in un intorno di 1/profondita',
    # altrimenti il determinante esplode e le caustiche diventano filamenti
    s = 0.34 / (np.std(hxx + hyy) + 1e-9)
    return (hx * s, hy * s, hxx * s, hyy * s, hxy * s)


def make_water(path):
    hx, hy, hxx, hyy, hxy = wave_field((H, W))

    # profondita': piu' fonda in alto, con variazione lenta (secche e canali)
    yy = np.linspace(0, 1, H)[:, None] * np.ones((1, W))
    depth = 0.42 + 0.58 * (1.0 - yy) ** 1.25
    depth += 0.13 * spectral_noise((H, W), 2.6, kmax=5)
    depth = np.clip(depth, 0.34, 1.15)

    # fondale sabbioso: grana su piu' scale + increspature diagonali blande
    sand = 0.68 + 0.17 * spectral_noise((H, W), 2.1, kmin=2, kmax=22)
    sand += 0.09 * spectral_noise((H, W), 1.5, kmin=22, kmax=150)
    warp = 9.0 * spectral_noise((H, W), 2.5, kmax=8)
    ripples = np.sin(np.arange(W)[None, :] * 0.052
                     + np.arange(H)[:, None] * 0.038 + warp)
    sand += 0.038 * ripples
    sand = np.clip(sand, 0.0, 1.0)
    seabed = np.stack([
        0.97 * sand + 0.03,
        0.93 * sand + 0.05,
        0.80 * sand + 0.09,
    ], axis=-1)

    # caustiche: 1/|det(I + d*Hess(h))|, la compressione del fascio rifratto
    d = depth * 1.55
    det = 1.0 + d * (hxx + hyy) + d * d * (hxx * hyy - hxy * hxy)
    caustic = 1.0 / np.maximum(np.abs(det), 0.30)
    caustic = blur(np.clip(caustic, 0.0, 3.4), 0.9)
    caustic = caustic ** 1.15
    caustic *= 1.0 / max(np.mean(caustic), 1e-6)
    caustic = 0.80 + 0.42 * caustic

    lit = seabed * caustic[..., None]

    # assorbimento Beer-Lambert: il rosso muore per primo, resta il turchese
    sigma = np.array([2.05, 0.40, 0.22])
    trans = np.exp(-sigma[None, None, :] * depth[..., None])
    water_col = np.array([0.50, 0.84, 0.86])
    deep_col = np.array([0.16, 0.56, 0.64])
    mix = np.clip(depth[..., None] * 0.62, 0.0, 1.0)
    body = water_col[None, None, :] * (1.0 - mix) + deep_col[None, None, :] * mix
    col = lit * trans + body * (1.0 - trans)

    # superficie: normale dalle onde lunghe, Fresnel sul cielo, glint radi
    nsx, nsy = blur(hx, 2.2) * 0.030, blur(hy, 2.2) * 0.030
    nz = np.ones_like(nsx)
    nlen = np.sqrt(nsx * nsx + nsy * nsy + nz * nz)
    nx, ny, nz = nsx / nlen, nsy / nlen, nz / nlen
    view = np.array([0.0, -0.42, 0.91])
    view /= np.linalg.norm(view)
    ndv = np.clip(nx * view[0] + ny * view[1] + nz * view[2], 0.0, 1.0)
    fresnel = 0.012 + 0.16 * (1.0 - ndv) ** 5
    sky = np.array([0.82, 0.94, 0.97])
    col = col * (1.0 - fresnel[..., None]) + sky[None, None, :] * fresnel[..., None]

    sun = np.array([-0.28, -0.50, 0.82])
    sun /= np.linalg.norm(sun)
    half = sun + view
    half /= np.linalg.norm(half)
    ndh = np.clip(nx * half[0] + ny * half[1] + nz * half[2], 0.0, 1.0)
    glint = np.clip((ndh - 0.995) / 0.005, 0.0, 1.0) ** 2
    col += glint[..., None] * np.array([1.0, 0.99, 0.94])[None, None, :] * 0.55

    # luce piu' calda dove l'acqua e' bassa
    warm = np.clip(1.0 - depth, 0.0, 1.0)[..., None]
    col += warm * np.array([0.07, 0.05, 0.0])[None, None, :]

    # spalla morbida invece del taglio netto: niente cyan bruciato
    col = 1.0 - np.exp(-1.28 * np.clip(col, 0.0, None))
    lum = col @ np.array([0.24, 0.62, 0.14])
    col = lum[..., None] + (col - lum[..., None]) * 0.97  # desatura un filo
    col = np.clip(col, 0.0, 1.0) ** (1.0 / 1.02)
    col += rng.normal(0.0, 0.004, size=col.shape)  # grana
    col = np.clip(col, 0.0, 1.0)

    img = Image.fromarray((col * 255).astype(np.uint8), mode="RGB")
    img = img.filter(ImageFilter.GaussianBlur(0.4))
    img.save(path, "JPEG", quality=88, optimize=True, progressive=True)
    print("water.jpg", img.size, os.path.getsize(path) // 1024, "KB")


def bezier(p0, p1, p2, n=48):
    return [(
        (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
        (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1],
    ) for t in (i / (n - 1.0) for i in range(n))]


def make_cherry(path):
    s = 640
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    joint = (330, 92)

    for end_pt, ctrl in (((196, 356), (214, 196)), ((410, 368), (416, 200))):
        pts = bezier(joint, ctrl, end_pt)
        d.line(pts, fill=(0x2F, 0x6D, 0x4F, 255), width=15, joint="curve")

    leaf_a = bezier((330, 92), (392, 20), (474, 44))
    leaf_b = bezier((474, 44), (398, 76), (330, 92))
    d.polygon(leaf_a + leaf_b[1:], fill=(0x3C, 0x8A, 0x63, 255))
    d.line(bezier((338, 84), (398, 46), (466, 46)), fill=(0x2F, 0x6D, 0x4F, 255), width=4)

    for cx, cy, r in ((196, 356, 88), (410, 368, 98)):
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=CILIEGIA + (255,))
        d.ellipse([cx - r * 0.46, cy - r * 0.64, cx - r * 0.04, cy - r * 0.20],
                  fill=(255, 218, 218, 205))
        d.ellipse([cx + r * 0.26, cy + r * 0.32, cx + r * 0.44, cy + r * 0.50],
                  fill=(255, 214, 214, 110))
    img = img.crop(img.getbbox())
    img.save(path)
    print("cherry.png", img.size)


def make_logo(path):
    w, h = 1400, 460
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    try:
        f1 = ImageFont.truetype(FONT_900, 132)
        f2 = ImageFont.truetype(FONT_900, 132)
    except OSError:
        f1 = f2 = ImageFont.load_default()
    for text, font, y in (("BORN IN", f1, 60), ("MONGE", f2, 232)):
        bbox = d.textbbox((0, 0), text, font=font)
        d.text(((w - (bbox[2] - bbox[0])) / 2 - bbox[0], y), text,
               font=font, fill=CREMA + (255,))
    img.save(path)
    print("logo.png", img.size)


def make_icon(path, size, rounded=True):
    img = Image.new("RGBA", (size, size), ACQUA + (255,))
    d = ImageDraw.Draw(img)
    d.ellipse([-size * 0.35, size * 0.45, size * 0.75, size * 1.55],
              fill=(0x5F, 0xC0, 0xC8, 255))
    d.ellipse([size * 0.40, size * 0.58, size * 1.45, size * 1.60],
              fill=(0x9B, 0xDD, 0xE1, 255))
    try:
        font = ImageFont.truetype(FONT_900, int(size * 0.34))
    except OSError:
        font = ImageFont.load_default()
    bbox = d.textbbox((0, 0), "BIM", font=font)
    d.text(((size - (bbox[2] - bbox[0])) / 2 - bbox[0],
            size * 0.30 - bbox[1]), "BIM", font=font, fill=PETROLIO + (255,))
    img.save(path)
    print(os.path.basename(path), img.size)


if __name__ == "__main__":
    os.makedirs(ASSETS, exist_ok=True)
    os.makedirs(ICONS, exist_ok=True)
    make_water(os.path.join(ASSETS, "water.jpg"))
    make_cherry(os.path.join(ASSETS, "cherry.png"))
    make_logo(os.path.join(ASSETS, "logo.png"))
    for size in (192, 512):
        make_icon(os.path.join(ICONS, f"icon-{size}.png"), size)
    make_icon(os.path.join(ICONS, "apple-touch-icon.png"), 180)
