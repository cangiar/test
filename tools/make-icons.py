#!/usr/bin/env python3
"""Icone PWA: fondo crema, marchio petrolio, niente altro.

    pip install Pillow
    MONTSERRAT_900=/percorso/montserrat-900.ttf python3 tools/make-icons.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICONS = os.path.join(ROOT, "icons")
FONT = os.environ.get("MONTSERRAT_900", "/tmp/montserrat-900.ttf")

CREMA = (0xFD, 0xFB, 0xF6)
PETROLIO = (0x11, 0x4B, 0x5F)


def icon(path, size):
    img = Image.new("RGB", (size, size), CREMA)
    d = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype(FONT, int(size * 0.30))
    except OSError:
        font = ImageFont.load_default()
    text = "BIM"
    # spaziatura fra le lettere, come nel marchio in alto a sinistra
    track = int(size * 0.05)
    widths = [d.textlength(ch, font=font) for ch in text]
    total = sum(widths) + track * (len(text) - 1)
    box = d.textbbox((0, 0), text, font=font)
    x = (size - total) / 2
    y = (size - (box[3] - box[1])) / 2 - box[1]
    for ch, w in zip(text, widths):
        d.text((x, y), ch, font=font, fill=PETROLIO)
        x += w + track
    img.save(path)
    print(os.path.basename(path), img.size)


if __name__ == "__main__":
    os.makedirs(ICONS, exist_ok=True)
    icon(os.path.join(ICONS, "icon-192.png"), 192)
    icon(os.path.join(ICONS, "icon-512.png"), 512)
    icon(os.path.join(ICONS, "apple-touch-icon.png"), 180)
