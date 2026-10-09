"""Search Wikimedia Commons for freely licensed candidate photos and build a contact sheet.

usage: python3 commons_search.py <outdir> <tag> "<search query>" [limit]
Writes <outdir>/<tag>.json (metadata) and <outdir>/<tag>.jpg (numbered contact sheet).
"""
import io, json, sys, urllib.parse, urllib.request
from PIL import Image, ImageDraw

UA = {"User-Agent": "A7CII-Trainer/1.0 (educational photo simulator; keren@flexipur.co.il)"}
OK_LICENSES = ("cc0", "cc-by", "cc by", "public domain", "pd")


def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def search(query, limit):
    params = {
        "action": "query", "format": "json", "generator": "search",
        "gsrnamespace": 6, "gsrsearch": f"filetype:bitmap {query}", "gsrlimit": min(limit, 50),
        "prop": "imageinfo", "iiprop": "url|size|extmetadata", "iiurlwidth": 400,
    }
    data = json.loads(get("https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)))
    out = []
    for p in sorted(data.get("query", {}).get("pages", {}).values(), key=lambda p: p.get("index", 0)):
        if "imageinfo" not in p:
            continue
        ii = p["imageinfo"][0]
        meta = ii.get("extmetadata", {})
        lic = meta.get("LicenseShortName", {}).get("value", "")
        if ii["width"] < 3000 or not any(k in lic.lower() for k in OK_LICENSES):
            continue
        if "nd" in lic.lower().split("-"):
            continue
        out.append({
            "title": p["title"], "w": ii["width"], "h": ii["height"], "url": ii["url"],
            "thumb": ii["thumburl"], "page": ii["descriptionurl"], "license": lic,
            "artist": meta.get("Artist", {}).get("value", ""),
            "fnum": meta.get("FNumber", {}).get("value", ""),
        })
    return out


def main():
    outdir, tag, query = sys.argv[1], sys.argv[2], sys.argv[3]
    limit = int(sys.argv[4]) if len(sys.argv) > 4 else 40
    items = search(query, limit)[:24]
    json.dump(items, open(f"{outdir}/{tag}.json", "w"), ensure_ascii=False, indent=1)
    cols, cw, ch = 6, 300, 220
    rows = max(1, (len(items) + cols - 1) // cols)
    sheet = Image.new("RGB", (cols * cw, rows * ch), "white")
    d = ImageDraw.Draw(sheet)
    for i, it in enumerate(items):
        try:
            im = Image.open(io.BytesIO(get(it["thumb"]))).convert("RGB")
        except Exception:
            continue
        im.thumbnail((cw - 6, ch - 26))
        x, y = (i % cols) * cw, (i // cols) * ch
        sheet.paste(im, (x + 3, y + 3))
        d.rectangle([x + 3, y + ch - 22, x + cw - 3, y + ch - 2], fill="black")
        d.text((x + 8, y + ch - 19), f"#{i} {it['w']}x{it['h']} f{it['fnum']}", fill="yellow")
    sheet.save(f"{outdir}/{tag}.jpg", quality=85)
    print(tag, len(items))


if __name__ == "__main__":
    main()
