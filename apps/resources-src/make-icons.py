#!/usr/bin/env python3
"""Regenerates every app icon / splash / feature graphic from scratch (Pillow only).

    pip install pillow && python3 apps/resources-src/make-icons.py

Writes assets/app/*.png (used by crew.webmanifest, customer.webmanifest and
employee.html's apple-touch-icon) and apps/{customer,crew}/resources/*.png
(what `npm run assets` feeds into Capacitor). Brand: navy #153238, gold
#b68235, cream #f5f2ec. Edit the drawing below to change the mark.
"""
import math, os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
NAVY = (0x15, 0x32, 0x38); GOLD = (0xb6, 0x82, 0x35); CREAM = (0xf5, 0xf2, 0xec)

def font(sz):
    for p in ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
              "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
              "/System/Library/Fonts/Supplemental/Arial Bold.ttf", "C:/Windows/Fonts/arialbd.ttf"]:
        if os.path.exists(p): return ImageFont.truetype(p, sz)
    return ImageFont.load_default()

def icon(kind, s=1024):
    im = Image.new("RGB", (s, s), NAVY); d = ImageDraw.Draw(im)
    pts = [(x, s * 0.70 + math.sin(x / s * 2 * math.pi) * s * 0.03) for x in range(0, s + 1, 8)]
    d.polygon(pts + [(s, s), (0, s)], fill=GOLD)
    d.polygon([(x, y + s * 0.09) for x, y in pts] + [(s, s), (0, s)], fill=NAVY)
    d.polygon([(x, y + s * 0.15) for x, y in pts] + [(s, s), (0, s)], fill=GOLD)
    f = font(int(s * 0.42)); bb = d.textbbox((0, 0), "GP", font=f); w, h = bb[2] - bb[0], bb[3] - bb[1]
    d.text(((s - w) / 2 - bb[0], s * 0.36 - h / 2 - bb[1]), "GP", font=f, fill=CREAM)
    if kind == "crew":
        f2 = font(int(s * 0.11)); bb = d.textbbox((0, 0), "CREW", font=f2); w = bb[2] - bb[0]
        d.rounded_rectangle([(s - w) / 2 - s * 0.04, s * 0.56, (s + w) / 2 + s * 0.04, s * 0.69], radius=s * 0.03, fill=CREAM)
        d.text(((s - w) / 2 - bb[0], s * 0.58 - bb[1] + s * 0.005), "CREW", font=f2, fill=NAVY)
    return im

os.makedirs(f"{ROOT}/assets/app", exist_ok=True)
for kind in ["customer", "crew"]:
    m = icon(kind)
    for sz in [1024, 512, 192, 180]:
        m.resize((sz, sz), Image.LANCZOS).save(f"{ROOT}/assets/app/{kind}-icon-{sz}.png")
    sp = Image.new("RGB", (2732, 2732), NAVY); sp.paste(m.resize((900, 900), Image.LANCZOS), (916, 916))
    sp.save(f"{ROOT}/assets/app/{kind}-splash-2732.png")
    fg = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0)); fg.paste(m.resize((680, 680), Image.LANCZOS), (172, 172))
    fg.save(f"{ROOT}/assets/app/{kind}-adaptive-fg-1024.png")
    r = f"{ROOT}/apps/{kind}/resources"; os.makedirs(r, exist_ok=True)
    m.save(f"{r}/icon.png"); fg.save(f"{r}/icon-foreground.png")
    Image.new("RGB", (1024, 1024), NAVY).save(f"{r}/icon-background.png")
    sp.save(f"{r}/splash.png"); sp.save(f"{r}/splash-dark.png")
fgph = Image.new("RGB", (1024, 500), NAVY); d = ImageDraw.Draw(fgph)
fgph.paste(icon("customer").resize((320, 320), Image.LANCZOS), (80, 90))
d.text((450, 150), "GULF PROCLEAN", font=font(64), fill=CREAM)
d.text((452, 240), "Residential & commercial cleaning,\nbooked in minutes.", font=font(30), fill=GOLD)
fgph.save(f"{ROOT}/assets/app/feature-graphic-1024x500.png")
print("done")
