#!/usr/bin/env python3
"""Generates every icon for Røde dager from the app's own typeface.

The mark is a red "17" in Source Serif 4 Semibold on warm paper: the most
recognisable red day in the Norwegian calendar, set in the numerals the app
uses everywhere.

    pip install pillow fonttools brotli
    python3 tools/make-icons.py
"""
import io
import os

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..")
FONT = os.path.join(ROOT, "fonts", "source-serif-4-600.woff2")
OUT = os.path.join(ROOT, "icons")

PAPER = "#F4F1E8"
RED = "#B3122E"
TEXT = "17"
SS = 4  # supersampling


def ttf_bytes():
    font = TTFont(FONT)
    font.flavor = None
    buf = io.BytesIO()
    font.save(buf)
    return buf.getvalue()


def glyph_outline():
    """SVG path for TEXT in font units (y up), plus its ink bounds."""
    font = TTFont(FONT)
    glyphs = font.getGlyphSet()
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]
    pen = SVGPathPen(glyphs)
    bounds = BoundsPen(glyphs)
    x = 0
    kern = -40  # tighten the pair slightly; numerals are spaced for tables
    for ch in TEXT:
        name = cmap[ord(ch)]
        glyphs[name].draw(TransformPen(pen, (1, 0, 0, 1, x, 0)))
        glyphs[name].draw(TransformPen(bounds, (1, 0, 0, 1, x, 0)))
        x += hmtx[name][0] + kern
    return pen.getCommands(), bounds.bounds


def svg_icon(size=64, radius=0.225, ink_height=0.5):
    path, (x0, y0, x1, y1) = glyph_outline()
    scale = size * ink_height / (y1 - y0)
    w = (x1 - x0) * scale
    tx = (size - w) / 2 - x0 * scale
    ty = (size + (y1 - y0) * scale) / 2 + y0 * scale
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}" '
        f'role="img" aria-label="Røde dager">\n'
        f'  <rect width="{size}" height="{size}" rx="{size * radius:.2f}" fill="{PAPER}"/>\n'
        f'  <path fill="{RED}" transform="translate({tx:.3f} {ty:.3f}) scale({scale:.5f} {-scale:.5f})" d="{path}"/>\n'
        f'</svg>\n'
    )


def raster(size, ink_height, rounded, background=PAPER, fill=RED):
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if background:
        if rounded:
            d.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * 0.225), fill=background)
        else:
            d.rectangle([0, 0, s, s], fill=background)
    font = ImageFont.truetype(io.BytesIO(ttf_bytes()), size=int(s * ink_height * 1.45))
    # Tighten the pair the same way as the SVG.
    parts = [(ch, font.getbbox(ch)) for ch in TEXT]
    kern = -0.04 * font.size
    width = sum(b[2] - b[0] for _, b in parts) + kern * (len(parts) - 1)
    top = min(b[1] for _, b in parts)
    bottom = max(b[3] for _, b in parts)
    x = (s - width) / 2
    y = (s - (bottom - top)) / 2 - top
    for ch, b in parts:
        d.text((x - b[0], y), ch, font=font, fill=fill)
        x += (b[2] - b[0]) + kern
    return img.resize((size, size), Image.LANCZOS)


def save(img, name):
    path = os.path.normpath(os.path.join(OUT, name))
    img.save(path, "PNG", optimize=True)
    print("wrote", os.path.basename(path), img.size)


os.makedirs(OUT, exist_ok=True)
save(raster(192, 0.42, True), "icon-192.png")
save(raster(512, 0.42, True), "icon-512.png")
# Maskable: full bleed, mark inside the 80 % safe circle.
save(raster(192, 0.34, False), "maskable-192.png")
save(raster(512, 0.34, False), "maskable-512.png")
save(raster(180, 0.42, False), "apple-touch-icon.png")
# Android status-bar badge: white on transparent, the system tints it.
save(raster(96, 0.5, False, background=None, fill="#FFFFFF"), "badge-96.png")

with open(os.path.join(OUT, "favicon.svg"), "w", encoding="utf-8") as f:
    f.write(svg_icon())
print("wrote favicon.svg")
