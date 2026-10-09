"""Pack a scene for the simulator.

usage:
  python3 pack_scene.py --id night_square --src work/night.npy --kind hdr --focal 24 --ev100 4 --kelvin 3000 --anchor-ev 0 --out ../app/scenes
  python3 pack_scene.py --id kyoto --src raw/photos/kyoto.jpg --kind ldr --focal 50 --ev100 11.3 --kelvin 6000 --out ../app/scenes

Writes <out>/<id>/{ev0.jpg, ev-4.jpg, ev-8.jpg, depth.png, scene.json}.
  ev0   = sRGB(clip(L*k))         k chosen so the anchor exposure looks normal
  ev-4  = sRGB(clip(L*k/16))      recovers 4 more stops of highlights
  ev-8  = sRGB(clip(L*k/256))     recovers 8 more stops (sun, lamps)
  depth = 8-bit log depth between dmin..dmax (metres), 2048 px wide
Linear reconstruction in the shader: L = ev0 < 0.9 ? lin(ev0) : ev-4 < 0.9 ? lin(ev-4)*16 : lin(ev-8)*256
"""
import argparse, json, os
import cv2
import numpy as np
from PIL import Image

cv2.setNumThreads(8)


def srgb_encode(x):
    x = np.clip(x, 0, 1)
    return np.where(x <= 0.0031308, 12.92 * x, 1.055 * np.power(x, 1 / 2.4) - 0.055)


def srgb_decode(x):
    return np.where(x <= 0.04045, x / 12.92, np.power((x + 0.055) / 1.055, 2.4))


def load_linear(path, kind, max_w):
    if path.endswith(".npy"):
        lin = np.load(path).astype(np.float32)
    elif path.endswith(".exr") or path.endswith(".hdr"):
        lin = cv2.imread(path, cv2.IMREAD_UNCHANGED)[:, :, ::-1].astype(np.float32)
    else:
        im = np.asarray(Image.open(path).convert("RGB")).astype(np.float32) / 255
        lin = srgb_decode(im)
        if kind == "ldr":
            # gentle inverse tone map: give JPEG highlights ~1.3 stops of fake headroom so
            # stopping down shows some recovery instead of a hard white wall
            lum = lin.mean(-1, keepdims=True)
            boost = 1 + 1.5 * np.clip((lum - 0.7) / 0.3, 0, 1) ** 2
            lin = lin * boost
    if lin.shape[1] > max_w:
        h = int(round(lin.shape[0] * max_w / lin.shape[1]))
        lin = cv2.resize(lin, (max_w, h), interpolation=cv2.INTER_AREA)
    lin = np.nan_to_num(lin, nan=0.0, posinf=0.0, neginf=0.0)
    return np.ascontiguousarray(np.clip(lin, 0, None))


def auto_anchor(lin):
    """scale so that the log-average luminance lands on 0.18 (a normal exposure)."""
    lum = 0.2126 * lin[..., 0] + 0.7152 * lin[..., 1] + 0.0722 * lin[..., 2]
    logavg = np.exp(np.mean(np.log(lum + 1e-4)))
    return 0.18 / logavg


def write_jpeg(path, arr8, q):
    Image.fromarray(arr8).save(path, quality=q, subsampling=2, optimize=True, progressive=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--id", required=True); ap.add_argument("--src", required=True)
    ap.add_argument("--kind", choices=["hdr", "ldr"], required=True)
    ap.add_argument("--focal", type=float, required=True, help="focal length (mm, full frame) the source image corresponds to")
    ap.add_argument("--ev100", type=float, required=True, help="EV at ISO100 of a correct exposure of this scene (metering calibration)")
    ap.add_argument("--kelvin", type=float, default=5500, help="dominant illuminant colour temperature of the scene")
    ap.add_argument("--anchor-k", type=float, default=None, help="manual linear scale instead of auto")
    ap.add_argument("--max-w", type=int, default=4096)
    ap.add_argument("--depth", default=None, help="precomputed .depth.npy (otherwise Depth Pro runs on ev0)")
    ap.add_argument("--out", default="../app/scenes")
    ap.add_argument("--title", default="")
    a = ap.parse_args()

    out = os.path.join(a.out, a.id); os.makedirs(out, exist_ok=True)
    lin = load_linear(a.src, a.kind, a.max_w)
    k = a.anchor_k or auto_anchor(lin)
    lin *= k
    H, W = lin.shape[:2]
    print(f"{a.id}: {W}x{H} k={k:.4f} max={lin.max():.1f}")

    stack = {"ev0": 1.0, "ev-4": 1 / 16, "ev-8": 1 / 256}
    files = {}
    for name, s in stack.items():
        img8 = (srgb_encode(lin * s) * 255 + 0.5).astype(np.uint8)
        if name != "ev0" and a.kind == "ldr" and name == "ev-8":
            continue  # LDR sources have no 8-stop headroom
        p = os.path.join(out, name + ".jpg"); write_jpeg(p, img8, 86 if name == "ev0" else 82)
        files[name] = os.path.getsize(p) // 1024

    # depth
    if a.depth:
        depth = np.load(a.depth).astype(np.float32)
    else:
        import depth as dp
        tmp = os.path.join(out, "ev0.jpg")
        focal_px = a.focal / 36.0 * W
        depth, _, _ = dp.run(tmp, focal_px)
    if depth.shape[:2] != (H, W):
        depth = cv2.resize(depth, (W, H), interpolation=cv2.INTER_LINEAR)
    depth = np.clip(depth, 0.05, 5000)
    dmin, dmax = float(np.percentile(depth, 0.1)), float(np.percentile(depth, 99.9))
    dmin = max(0.05, dmin * 0.9); dmax = min(5000, dmax * 1.1)
    ld = (np.log(depth) - np.log(dmin)) / (np.log(dmax) - np.log(dmin))
    d8 = (np.clip(ld, 0, 1) * 255 + 0.5).astype(np.uint8)
    dw = min(2048, W); dh = int(round(H * dw / W))
    d8 = cv2.resize(d8, (dw, dh), interpolation=cv2.INTER_AREA)
    Image.fromarray(d8).save(os.path.join(out, "depth.png"), optimize=True)
    files["depth"] = os.path.getsize(os.path.join(out, "depth.png")) // 1024

    # luminance thumbnail for metering (linear, 128 px wide, stored as float list)
    lum = 0.2126 * lin[..., 0] + 0.7152 * lin[..., 1] + 0.0722 * lin[..., 2]
    tw = 128; th = int(round(H * tw / W))
    lumt = cv2.resize(lum, (tw, th), interpolation=cv2.INTER_AREA)

    meta = {
        "id": a.id, "title": a.title, "kind": a.kind, "width": W, "height": H,
        "srcFocal": a.focal, "ev100": a.ev100, "kelvin": a.kelvin,
        "stack": [n for n in stack if n in files], "depth": {"min": dmin, "max": dmax, "w": dw, "h": dh},
        "lum": {"w": tw, "h": th, "data": [round(float(v), 5) for v in lumt.flatten()]},
        "gain": round(float(1 / k), 5) if a.kind == "ldr" else 1.0, "subjects": [], "motion": None, "sizesKB": files,
    }
    json.dump(meta, open(os.path.join(out, "scene.json"), "w"), ensure_ascii=False)
    print("sizes KB:", files, "depth range m:", round(dmin, 2), round(dmax, 1))


if __name__ == "__main__":
    main()
