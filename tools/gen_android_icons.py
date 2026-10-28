# -*- coding: utf-8 -*-
"""Synhale 2 - Android Launcher Icon Generator
Reads the 1024x1024 master icon (icon.png) and emits density-scaled
ic_launcher / ic_launcher_foreground / ic_launcher_round PNGs following the
Android Adaptive Icon spec (foreground content lives inside the central
72dp/108dp safe zone).
"""
import os
from PIL import Image, ImageDraw, ImageOps

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "..", "icon.png")
RES = os.path.join(ROOT, "..", "android", "app", "src", "main", "res")

# mdpi baseline 48dp launcher -> 108dp adaptive canvas
DENSITIES = {
    "mdpi":    {"launcher": 48,  "foreground": 108},
    "hdpi":    {"launcher": 72,  "foreground": 162},
    "xhdpi":   {"launcher": 96,  "foreground": 216},
    "xxhdpi":  {"launcher": 144, "foreground": 324},
    "xxxhdpi": {"launcher": 192, "foreground": 432},
}

BG_COLOR = (245, 243, 239, 255)  # #F5F3EF sampled from source art


def load_source() -> Image.Image:
    img = Image.open(SRC).convert("RGBA")
    # Flatten any existing alpha onto the canonical background so the
    # resulting artwork is fully opaque.
    bg = Image.new("RGBA", img.size, BG_COLOR)
    bg.alpha_composite(img)
    return bg


def center_square(img: Image.Image) -> Image.Image:
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    return img.crop((left, top, left + side, top + side))


def make_launcher(src: Image.Image, size: int) -> Image.Image:
    """Square launcher icon: full-bleed art."""
    return src.resize((size, size), Image.LANCZOS)


def make_foreground(src: Image.Image, canvas: int) -> Image.Image:
    """Adaptive foreground: art scaled into the central safe zone (~66%)."""
    out = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    inner = int(canvas * 0.66)
    art = src.resize((inner, inner), Image.LANCZOS)
    offset = (canvas - inner) // 2
    out.alpha_composite(art, (offset, offset))
    return out


def make_round(src: Image.Image, size: int) -> Image.Image:
    """Circular launcher icon: full-bleed art clipped to a circle."""
    square = src.resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    d.ellipse((0, 0, size, size), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(square, (0, 0), mask)
    return out


def main() -> None:
    raw = load_source()
    src = center_square(raw)
    for density, dims in DENSITIES.items():
        folder = os.path.join(RES, f"mipmap-{density}")
        os.makedirs(folder, exist_ok=True)
        make_launcher(src, dims["launcher"]).save(
            os.path.join(folder, "ic_launcher.png"), optimize=True)
        make_foreground(src, dims["foreground"]).save(
            os.path.join(folder, "ic_launcher_foreground.png"), optimize=True)
        make_round(src, dims["launcher"]).save(
            os.path.join(folder, "ic_launcher_round.png"), optimize=True)
        print(f"[ok] {density}: launcher={dims['launcher']}px fg={dims['foreground']}px")
    print("All launcher icons regenerated from icon.png")


if __name__ == "__main__":
    main()
