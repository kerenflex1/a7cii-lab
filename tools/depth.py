"""Run Apple Depth Pro on an image and save metric depth.

usage: python3 depth.py <image> <out_prefix> [focal_px]
Writes <out_prefix>.depth.npy (float32 metres), <out_prefix>.depth.png (preview, log scale).
If focal_px is given it is used instead of the model's own focal estimate.
"""
import sys, time
import numpy as np
import torch
from PIL import Image
from transformers import DepthProImageProcessorFast, DepthProForDepthEstimation

MODEL = "apple/DepthPro-hf"


def run(path, focal_px=None, device=None):
    device = device or ("mps" if torch.backends.mps.is_available() else "cpu")
    proc = DepthProImageProcessorFast.from_pretrained(MODEL)
    model = DepthProForDepthEstimation.from_pretrained(MODEL).to(device).eval()
    img = Image.open(path).convert("RGB")
    inputs = proc(images=img, return_tensors="pt").to(device)
    t = time.time()
    with torch.no_grad():
        out = model(**inputs)
    post = proc.post_process_depth_estimation(out, target_sizes=[(img.height, img.width)])[0]
    depth = post["predicted_depth"].float().cpu().numpy()
    fov = float(post["field_of_view"].cpu()) if post.get("field_of_view") is not None else None
    f_est = float(post["focal_length"].cpu()) if post.get("focal_length") is not None else None
    if focal_px and f_est:
        depth = depth * (focal_px / f_est)  # depth scales linearly with assumed focal length
    print(f"{path}: {img.size} fov={fov} focal_est={f_est} depth[{depth.min():.2f}..{depth.max():.2f}]m {time.time()-t:.1f}s")
    return depth, f_est, fov


def save(depth, prefix):
    np.save(prefix + ".depth.npy", depth.astype(np.float32))
    d = np.log(np.clip(depth, 0.1, 1000))
    d = (d - d.min()) / (d.max() - d.min() + 1e-6)
    Image.fromarray((255 * (1 - d)).astype(np.uint8)).save(prefix + ".depth.png")


if __name__ == "__main__":
    img, prefix = sys.argv[1], sys.argv[2]
    focal = float(sys.argv[3]) if len(sys.argv) > 3 else None
    depth, _, _ = run(img, focal)
    save(depth, prefix)
