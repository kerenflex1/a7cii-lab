"""Like commons_search.py but keeps only photos whose EXIF f-number >= 4 (deep DOF)."""
import re
import commons_search as cs
_orig = cs.search
def search(query, limit):
    out = []
    for it in _orig(query, limit):
        m = re.search(r"[\d.]+", it.get("fnum") or "")
        if m and float(m.group()) >= 4:
            out.append(it)
    return out
cs.search = search
if __name__ == "__main__":
    cs.main()
