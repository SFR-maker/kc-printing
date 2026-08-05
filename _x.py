import zipfile, re, sys

def dump(path, label, sheets, maxrows=18, width=26):
    z = zipfile.ZipFile(path)
    ss = []
    if 'xl/sharedStrings.xml' in z.namelist():
        raw = z.read('xl/sharedStrings.xml').decode('utf8')
        for si in re.findall(r'<(?:x:)?si>(.*?)</(?:x:)?si>', raw, re.S):
            ss.append(''.join(re.findall(r'<(?:x:)?t[^>]*>(.*?)</(?:x:)?t>', si, re.S)))
    print("=" * 90); print(label); print("=" * 90)
    for i, nm in enumerate(sheets, 1):
        p = f'xl/worksheets/sheet{i}.xml'
        if p not in z.namelist(): continue
        rows = re.findall(r'<(?:x:)?row[^>]*>(.*?)</(?:x:)?row>', z.read(p).decode('utf8'), re.S)
        print(f"\n--- {nm}  ({len(rows)} rows)")
        for r in rows[:maxrows]:
            cells = []
            for attrs, body in re.findall(r'<(?:x:)?c([^>]*)>(.*?)</(?:x:)?c>', r, re.S):
                v = re.search(r'<(?:x:)?v>(.*?)</(?:x:)?v>', body)
                val = v.group(1) if v else ''
                if 't="s"' in attrs and val.isdigit(): val = ss[int(val)]
                try: val = f"{float(val):g}"
                except: pass
                cells.append(str(val).replace('&amp;','&')[:width])
            if any(cells): print("   " + " | ".join(cells[:8]))

w = sys.argv[1]
if w == "b":
    dump(r"C:/Users/User/Downloads/gotprint_banner_prices_2026-08-04.xlsx", "BANNERS",
         ["All Sizes", "Verified Pricing", "Materials & Add-ons", "File & Proof Notes"])
elif w == "p":
    dump(r"C:/Users/User/Downloads/gotprint_postcard_prices_2026-08-04.xlsx", "POSTCARDS",
         ["Size Pricing", "Paper Pricing", "Shapes & Finishes", "Options & Notes"])
else:
    dump(r"C:/Users/User/Downloads/gotprint_rigid_sign_prices_2026-08-04.xlsx", "RIGID SIGNS",
         ["Material Types", "Popular Size Pricing", "Shape Pricing", "Options & Accessories", "Size Catalog"])
