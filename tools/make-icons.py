#!/usr/bin/env python3
"""Render the app's code-native Norwegian mountain mark at installation sizes."""
from pathlib import Path
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "icons"
SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108"><rect width="108" height="108" fill="#10283F"/><path fill="#F7F5EF" d="M22 72 43 35 56 54 67 43 87 72Z"/><path fill="#10283F" d="M43 46 50 56 44 54 39 57Z"/><path fill="#BA3546" d="M24 79h60v5H24z"/></svg>'
for name, size in [("icon-192",192),("icon-512",512),("maskable-192",192),("maskable-512",512),("apple-touch-icon",180),("badge-96",96)]:
    badge = name == "badge-96"
    img = Image.new("RGBA", (size*4,size*4), (0,0,0,0) if badge else "#10283F")
    draw = ImageDraw.Draw(img)
    scale = size*4/108
    points = lambda coords: [(x*scale,y*scale) for x,y in coords]
    draw.polygon(points([(22,72),(43,35),(56,54),(67,43),(87,72)]), fill="white" if badge else "#F7F5EF")
    if not badge:
        draw.polygon(points([(43,46),(50,56),(44,54),(39,57)]), fill="#10283F")
        draw.rectangle([24*scale,79*scale,84*scale,84*scale],fill="#BA3546")
    img.resize((size,size),Image.Resampling.LANCZOS).save(OUT/(name+".png"))
(OUT/"favicon.svg").write_text(SVG)
