"""Cut a rectilinear camera view out of an equirectangular HDRI.

usage: python3 hdri_view.py <file.hdr> <out.exr|out.npy|out.jpg> --yaw DEG --pitch DEG --focal MM --width PX [--aspect 1.5] [--ev STOPS]
       python3 hdri_view.py <file.hdr> <out_dir> --contact            # 12 yaw previews at 24mm to pick a direction

focal is a full-frame focal length (36x24 mm sensor). Output .npy/.exr is linear float32 RGB.
"""
import argparse, os
import cv2
import numpy as np

cv2.setNumThreads(8)
SENSOR_W, SENSOR_H = 36.0, 24.0


def load_hdr(path, max_w=None):
    img = cv2.imread(path, cv2.IMREAD_UNCHANGED)  # float32 BGR, linear
    if img is None:
        raise SystemExit(f"cannot read {path}")
    img = img[:, :, ::-1]
    if max_w and img.shape[1] > max_w:
        img = cv2.resize(img, (max_w, max_w // 2), interpolation=cv2.INTER_AREA)
    return np.ascontiguousarray(img)


def rectilinear(equi, yaw, pitch, focal_mm, width, aspect=1.5, roll=0.0):
    """Sample a pinhole view. yaw: + looks right; pitch: + looks down (positive tilts the view toward the ground)."""
    H, W = equi.shape[:2]
    height = int(round(width / aspect))
    fx = focal_mm / SENSOR_W * width  # focal in pixels
    xs = (np.arange(width) + 0.5 - width / 2) / fx
    ys = -(np.arange(height) + 0.5 - height / 2) / fx
    X, Y = np.meshgrid(xs, ys)
    Z = np.ones_like(X)
    d = np.stack([X, Y, Z], -1)
    d /= np.linalg.norm(d, axis=-1, keepdims=True)
    cy, sy = np.cos(np.radians(yaw)), np.sin(np.radians(yaw))
    cp, sp = np.cos(np.radians(pitch)), np.sin(np.radians(pitch))
    cr, sr = np.cos(np.radians(roll)), np.sin(np.radians(roll))
    Rr = np.array([[cr, -sr, 0], [sr, cr, 0], [0, 0, 1]])
    Rp = np.array([[1, 0, 0], [0, cp, -sp], [0, sp, cp]])
    Ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
    d = d @ (Ry @ Rp @ Rr).T
    lon = np.arctan2(d[..., 0], d[..., 2])
    lat = np.arcsin(np.clip(d[..., 1], -1, 1))
    u = ((lon / (2 * np.pi)) + 0.5) * W - 0.5
    v = (0.5 - lat / np.pi) * H - 0.5
    out = cv2.remap(equi, u.astype(np.float32), v.astype(np.float32), cv2.INTER_CUBIC, borderMode=cv2.BORDER_WRAP)
    return out


def tonemap_preview(lin, ev=0.0):
    x = lin * (2.0 ** ev)
    x = x / (1 + x)  # Reinhard
    return (np.clip(x, 0, 1) ** (1 / 2.2) * 255).astype(np.uint8)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src"); ap.add_argument("out")
    ap.add_argument("--yaw", type=float, default=0); ap.add_argument("--pitch", type=float, default=0)
    ap.add_argument("--roll", type=float, default=0)
    ap.add_argument("--focal", type=float, default=24); ap.add_argument("--width", type=int, default=4096)
    ap.add_argument("--aspect", type=float, default=1.5); ap.add_argument("--ev", type=float, default=0)
    ap.add_argument("--contact", action="store_true"); ap.add_argument("--max_w", type=int, default=None)
    a = ap.parse_args()
    equi = load_hdr(a.src, a.max_w)
    if a.contact:
        os.makedirs(a.out, exist_ok=True)
        tiles = []
        for yaw in range(0, 360, 30):
            v = rectilinear(equi, yaw, a.pitch, 24, 600)
            t = tonemap_preview(v, a.ev)
            cv2.putText(t, f"yaw {yaw}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2)
            tiles.append(t)
        rows = [np.hstack(tiles[i:i + 4]) for i in range(0, 12, 4)]
        name = os.path.splitext(os.path.basename(a.src))[0]
        cv2.imwrite(os.path.join(a.out, name + ".contact.jpg"), np.vstack(rows)[:, :, ::-1], [cv2.IMWRITE_JPEG_QUALITY, 85])
        print("wrote contact sheet")
        return
    v = rectilinear(equi, a.yaw, a.pitch, a.focal, a.width, a.aspect, a.roll)
    ext = os.path.splitext(a.out)[1].lower()
    if ext == ".npy":
        np.save(a.out, v.astype(np.float32))
    elif ext == ".exr":
        cv2.imwrite(a.out, v[:, :, ::-1].astype(np.float32))
    else:
        cv2.imwrite(a.out, tonemap_preview(v, a.ev)[:, :, ::-1], [cv2.IMWRITE_JPEG_QUALITY, 90])
    print("wrote", a.out, v.shape, f"max={v.max():.1f} mean={v.mean():.4f}")


if __name__ == "__main__":
    main()
