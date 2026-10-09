"""Measure the α7C II body from the background-removed photos and emit millimetre geometry.

usage: python3 tools/gen_camera_art.py  ->  tools/work/camera_geom.json

Sources (tools/work/cut/*.png come from tools/cutout.py on CC0 ILCE-7CR photos, identical body to ILCE-7CM2):
  rear.png  near-orthographic rear view      body width 2600 px  -> 124.0 mm   (origin px 40,115)
  front.png near-orthographic front view     body width 2694 px  -> 124.0 mm   (origin px 16,60)
  top.png   oblique top view (half-scale coordinates measured on a 1626 px preview)
            body width 1490 px -> 124 mm (12.0 px/mm); vertical foreshortening from the mode-dial ellipse
            (h/w = 0.92) -> depth scale 11.04 px/mm; front face of the top plate at y=230 -> 15 mm.
Every (x, y) below was read off gridded crops (tools/work/ca/*_g.jpg) at control centres; sizes are full extents.
The JS in app/js/camera-art.js uses these numbers (rounded) and hand-drawn, Help-Guide style shapes.
"""
import json, os
import numpy as np, cv2
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
CUT = os.path.join(HERE, "work", "cut")
BODY = {"w": 124.0, "h": 71.1, "d": 63.4}

REAR = dict(s=124 / 2600, x0=40, y0=115, pts={
    # id: (cx, cy, w, h) in source pixels (w,h = full size; circles use w=h=diameter)
    "evf": (332, 291, 664, 346), "evf-window": (342, 298, 291, 204), "eye-sensor": (585, 300, 55, 136),
    "diopter": (764, 345, 152, 152), "menu": (1409, 291, 215, 73), "c1": (1682, 291, 122, 122),
    "rear-dial-l": (2055, 291, 309, 72), "af-on": (2055, 536, 173, 173), "icon-magnify": (1942, 436, 50, 50),
    "fn": (2051, 785, 118, 118), "icon-send": (1942, 691, 50, 50), "label-disp": (2205, 849, 105, 40),
    "control-wheel": (2205, 1100, 392, 392), "wheel-recess": (2205, 1100, 454, 454), "wheel-center": (2205, 1100, 164, 164),
    "label-iso": (2467, 1100, 70, 40), "icon-timer": (1938, 1073, 50, 50), "icon-burst": (1938, 1160, 50, 50),
    "icon-index": (2229, 1360, 50, 50), "label-c2": (2415, 1313, 60, 40), "playback": (2109, 1431, 118, 118),
    "c2": (2349, 1422, 118, 118), "monitor": (1071, 1046, 1596, 1037), "monitor-glass": (1073, 1050, 1564, 1010),
    "hinge": (186, 1032, 173, 1082), "grip-rear": (2436, 822, 418, 973), "shoe-back": (1136, 165, 437, 118),
    "mode-dial-back": (1810, 98, 371, 94), "rear-dial-r-back": (2412, 155, 358, 99),
})
FRONT = dict(s=124 / 2694, x0=16, y0=60, pts={
    "front-dial": (320, 390, 380, 90), "shutter-front": (380, 170, 340, 160), "rear-dial-r-front": (380, 80, 340, 60),
    "mode-dial-front": (890, 60, 440, 75), "sony": (994, 256, 406, 70), "af-illuminator": (810, 410, 56, 56),
    "mic-1": (1290, 160, 60, 30), "mic-2": (1950, 184, 60, 30), "mount": (1606, 840, 1288, 1288),
    "mount-silver": (1606, 840, 1140, 1140), "throat": (1606, 840, 1003, 1003), "sensor": (1606, 840, 782, 521),
    "mount-index": (1964, 412, 40, 40), "lens-release": (980, 1170, 104, 104), "alpha": (2400, 280, 160, 100),
    "front-badge": (2390, 425, 220, 92), "grip": (382, 1000, 752, 1300), "strap-lug": (2760, 200, 60, 120),
})
TOP = dict(pts={  # half-scale preview px; converted with x0=70, 12 px/mm; y: 15 + (y-230)/11.04*1.0 (mm)
    "shoe": (688, 420, 265, 250), "sensor-mark": (490, 330, 40, 20), "speaker": (302, 300, 65, 12),
    "top-label": (197, 435, 135, 30), "mode-dial": (1130, 347, 265, 245), "mode-index": (950, 340, 20, 4),
    "sq-tab": (1290, 290, 40, 30), "movie": (1430, 280, 80, 80), "shutter": (1340, 130, 150, 150),
    "rear-dial-r": (1470, 470, 220, 220), "off": (1460, 145, 50, 25), "on": (1430, 195, 40, 25),
})


def conv(tbl):
    s, x0, y0 = tbl["s"], tbl["x0"], tbl["y0"]
    return {k: {"x": round((cx - x0) * s, 2), "y": round((cy - y0) * s, 2), "w": round(w * s, 2), "h": round(h * s, 2)}
            for k, (cx, cy, w, h) in tbl["pts"].items()}


def conv_top(tbl):
    out = {}
    for k, (cx, cy, w, h) in tbl["pts"].items():
        out[k] = {"x": round((cx - 70) / 12.0, 2), "y": round(15 + (cy - 230) / 11.04, 2), "w": round(w / 12.0, 2), "h": round(h / 11.04, 2)}
    return out


def outline(name, crop, x0, y0, s, eps=6):
    a = np.array(Image.open(os.path.join(CUT, name + ".png")))[..., 3][crop[1]:crop[3], crop[0]:crop[2]]
    m = cv2.morphologyEx((a > 128).astype(np.uint8) * 255, cv2.MORPH_OPEN, np.ones((25, 25), np.uint8))
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cs, key=cv2.contourArea)
    ap = cv2.approxPolyDP(c, eps, True)[:, 0]
    return [[round(float((x + crop[0] - x0) * s), 2), round(float((y + crop[1] - y0) * s), 2)] for x, y in ap]


def main():
    geom = {
        "body": BODY,
        "rear": conv(REAR), "front": conv(FRONT), "top": conv_top(TOP),
        "outline": {
            "rear": outline("rear", (30, 0, 2651, 1600), REAR["x0"], REAR["y0"], REAR["s"]),
            "front": outline("front", (0, 0, 2730, 1600), FRONT["x0"], FRONT["y0"], FRONT["s"]),
        },
    }
    os.makedirs(os.path.join(HERE, "work"), exist_ok=True)
    out = os.path.join(HERE, "work", "camera_geom.json")
    json.dump(geom, open(out, "w"), indent=1)
    for v in ("rear", "front", "top"):
        print(v, {k: (d["x"], d["y"], d["w"], d["h"]) for k, d in geom[v].items()})
    print("wrote", out)


if __name__ == "__main__":
    main()
