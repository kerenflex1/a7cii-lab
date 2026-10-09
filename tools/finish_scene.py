"""Finish a packed scene: phone tier (m/), poster.jpg, tiers + extra metadata.

usage: python3 finish_scene.py <scene_dir> [--json '{"capK":6500,...}'] [--depth-scale 1.0]
- m/ tier: every stack JPEG resized to 1600 px in linear light, depth.png to 1024 px, motion.png (if any) to depth size
- poster.jpg: 480 px from ev0
- --json: keys merged into scene.json (subjects, credit, note, capK, motion ...)
- --depth-scale: multiply depth min/max (metric rescale)
"""
import argparse, json, os
import cv2
import numpy as np
from PIL import Image


def dec(x): return np.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4)
def enc(x): x = np.clip(x, 0, 1); return np.where(x <= 0.0031308, 12.92 * x, 1.055 * x ** (1 / 2.4) - 0.055)


def resize_srgb(path, w):
    im = np.asarray(Image.open(path).convert("RGB")).astype(np.float32) / 255
    h = round(im.shape[0] * w / im.shape[1])
    r = cv2.resize(dec(im), (w, h), interpolation=cv2.INTER_AREA)
    return Image.fromarray((enc(r) * 255 + .5).astype(np.uint8))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dir"); ap.add_argument("--json", default=None); ap.add_argument("--depth-scale", type=float, default=1.0); ap.add_argument("--q", type=int, default=84)
    a = ap.parse_args()
    d = a.dir; m = json.load(open(f"{d}/scene.json"))
    if a.json:
        m.update(json.loads(open(a.json).read() if os.path.exists(a.json) else a.json))
    if a.depth_scale != 1.0:
        m["depth"]["min"] *= a.depth_scale; m["depth"]["max"] *= a.depth_scale
    os.makedirs(f"{d}/m", exist_ok=True)
    sizes = {}
    for n in m["stack"]:
        resize_srgb(f"{d}/{n}.jpg", 1600).save(f"{d}/m/{n}.jpg", quality=a.q, optimize=True, progressive=True)
        sizes[n] = os.path.getsize(f"{d}/m/{n}.jpg") // 1024
    dp = Image.open(f"{d}/depth.png")
    dm = dp.resize((1024, round(dp.height * 1024 / dp.width)), Image.BILINEAR)
    dm.save(f"{d}/m/depth.png", optimize=True); sizes["depth"] = os.path.getsize(f"{d}/m/depth.png") // 1024
    if m.get("motion") and os.path.exists(f"{d}/motion.png"):
        mo = Image.open(f"{d}/motion.png").convert("RGBA")
        mo.resize(dm.size, Image.BILINEAR).save(f"{d}/m/motion.png", optimize=True)
        sizes["motion"] = os.path.getsize(f"{d}/m/motion.png") // 1024
    resize_srgb(f"{d}/ev0.jpg", 480).save(f"{d}/poster.jpg", quality=80, optimize=True, progressive=True)
    m["tiers"] = {"m": {"w": 1600, "path": "m/"}, "l": {"w": m["width"], "path": ""}}
    m["poster"] = "poster.jpg"
    m.setdefault("capK", m.get("kelvin"))
    json.dump(m, open(f"{d}/scene.json", "w"), ensure_ascii=False)
    print(os.path.basename(d), "m tier KB", sizes, "total", sum(sizes.values()), "poster KB", os.path.getsize(f"{d}/poster.jpg") // 1024)


if __name__ == "__main__":
    main()
