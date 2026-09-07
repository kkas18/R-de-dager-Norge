#!/usr/bin/env python3
"""Genererer alle ikonene til Røde dager. Kjør: python3 tools/make-icons.py"""
from PIL import Image, ImageDraw
import os

INK   = (23, 24, 26, 255)
PAPER = (245, 245, 243, 255)
GREY  = (208, 207, 202, 255)
RED   = (186, 12, 47, 255)
OUT   = os.path.join(os.path.dirname(__file__), "..", "icons")
SS    = 4  # supersampling


def mark(size, safe, rounded):
    """Kalenderark med rutenett der én rute er rød."""
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    if rounded:
        d.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * 0.225), fill=INK)
    else:
        d.rectangle([0, 0, s, s], fill=INK)

    # Kalenderark
    w = s * safe
    h = w * 1.02
    x0 = (s - w) / 2
    y0 = (s - h) / 2
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], radius=w * 0.12, fill=PAPER)

    # To ringfester i toppfeltet
    tw, th = w * 0.055, h * 0.085
    for cx in (x0 + w * 0.30, x0 + w * 0.70):
        d.rounded_rectangle([cx - tw / 2, y0 + h * 0.09,
                             cx + tw / 2, y0 + h * 0.09 + th],
                            radius=tw / 2, fill=INK)

    # Toppfeltets skillelinje
    head = h * 0.30
    d.rectangle([x0, y0 + head, x0 + w, y0 + head + max(1, s * 0.006)], fill=GREY)

    # Rutenett 3 x 2, siste rute er rød
    pad = w * 0.15
    gx0, gy0 = x0 + pad, y0 + head + h * 0.14
    gw = w - pad * 2
    gh = h - head - h * 0.14 - pad * 0.95
    gap = gw * 0.13
    cw = (gw - gap * 2) / 3
    ch = (gh - gap) / 2
    for r in range(2):
        for c in range(3):
            cx = gx0 + c * (cw + gap)
            cy = gy0 + r * (ch + gap)
            hot = (r == 1 and c == 2)
            d.rounded_rectangle([cx, cy, cx + cw, cy + ch],
                                radius=min(cw, ch) * 0.34,
                                fill=RED if hot else GREY)

    return img.resize((size, size), Image.LANCZOS)


def save(img, name):
    path = os.path.normpath(os.path.join(OUT, name))
    img.save(path, "PNG", optimize=True)
    print("skrev", os.path.basename(path), img.size)


os.makedirs(OUT, exist_ok=True)
save(mark(192, 0.60, True),  "icon-192.png")
save(mark(512, 0.60, True),  "icon-512.png")
save(mark(192, 0.50, False), "maskable-192.png")
save(mark(512, 0.50, False), "maskable-512.png")
save(mark(180, 0.60, True),  "apple-touch-icon.png")

