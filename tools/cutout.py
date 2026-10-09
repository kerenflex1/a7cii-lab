"""Remove the background from product photos with BiRefNet (MIT licence) and save RGBA.

usage: python3 cutout.py <in.jpg> <out.png> [crop x0,y0,x1,y1 in 0..1]
"""
import sys
import numpy as np
import torch
from PIL import Image
from torchvision import transforms
from transformers import AutoModelForImageSegmentation

dev = "mps" if torch.backends.mps.is_available() else "cpu"
model = AutoModelForImageSegmentation.from_pretrained("ZhengPeng7/BiRefNet", trust_remote_code=True).to(dev).eval().float()
tf = transforms.Compose([transforms.Resize((1024, 1024)), transforms.ToTensor(),
                         transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])])


def cut(src, dst, crop=None):
    im = Image.open(src).convert("RGB")
    if crop:
        W, H = im.size
        im = im.crop((int(crop[0] * W), int(crop[1] * H), int(crop[2] * W), int(crop[3] * H)))
    with torch.no_grad():
        pred = model(tf(im).unsqueeze(0).to(dev))[-1].sigmoid().cpu()[0, 0]
    mask = transforms.functional.resize(pred.unsqueeze(0), [im.height, im.width])[0].numpy()
    a = (np.clip(mask, 0, 1) * 255).astype(np.uint8)
    out = im.copy(); out.putalpha(Image.fromarray(a))
    bbox = out.getbbox()
    out = out.crop(bbox)
    out.save(dst)
    print(dst, out.size)


if __name__ == "__main__":
    crop = [float(v) for v in sys.argv[3].split(",")] if len(sys.argv) > 3 else None
    cut(sys.argv[1], sys.argv[2], crop)
