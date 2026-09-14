"""index.html から印刷用PDF（A4・2ページ）を書き出す。

  pip install playwright pypdf && playwright install chromium
  python3 docs/flyer/build.py [出力先.pdf]

ふだんの修正は index.html を直接編集し、Chrome で開いて
「印刷 → 送信先:PDFに保存 → 用紙A4 → 余白なし → 背景のグラフィックON」
でも同じものが出せる。このスクリプトは版面のはみ出し検査も同時に行う。
"""
import sys, pathlib, os
from playwright.sync_api import sync_playwright
HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE / "index.html"
OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "yorucare-monitor-a4.pdf"
CHROME = os.environ.get("CHROME_PATH")
with sync_playwright() as p:
    b = p.chromium.launch(**({"executable_path": CHROME} if CHROME else {}), args=["--no-sandbox", "--font-render-hinting=none"])
    pg = b.new_page(viewport={"width":1000,"height":1400}, device_scale_factor=2)
    msgs=[]
    pg.on("console", lambda m: msgs.append(m.text))
    pg.on("pageerror", lambda e: msgs.append("ERR "+str(e)))
    pg.goto(SRC.as_uri(), wait_until="networkidle")
    pg.evaluate("document.fonts.ready")
    pg.wait_for_timeout(1200)
    pg.pdf(path=str(OUT), format="A4", print_background=True, margin={"top":"0","bottom":"0","left":"0","right":"0"})
    # Chromium rounds the page box up; snap it to exact A4, anchored at the content's top-left
    from pypdf import PdfReader, PdfWriter
    from pypdf.generic import RectangleObject
    A4W, A4H = 595.2756, 841.8898
    rd = PdfReader(str(OUT)); wr = PdfWriter()
    for page in rd.pages:
        top = float(page.mediabox.top)
        box = RectangleObject([0, top - A4H, A4W, top])
        page.mediabox = box; page.cropbox = box
        wr.add_page(page)
    wr.add_metadata({"/Title": "ヨルケア 1か月モニター募集チラシ（A4両面）", "/Creator": "yorucare flyer source (docs/flyer/index.html)"})
    with open(OUT, "wb") as f: wr.write(f)
    # overflow check
    info = pg.evaluate("""() => {
      const r=[];
      document.querySelectorAll('.panel').forEach((pn,i)=>{
        const pb=pn.getBoundingClientRect();
        pn.querySelectorAll('*').forEach(el=>{
          const b=el.getBoundingClientRect();
          if(!b.width && !b.height) return;
          const over = (b.bottom - pb.bottom > 1) || (b.right - pb.right > 1) || (pb.left - b.left > 1) || (pb.top - b.top > 1);
          if(over) r.push({page:i+1, cls:el.className.toString().slice(0,40), tag:el.tagName,
            over:{b:+(b.bottom-pb.bottom).toFixed(1), r:+(b.right-pb.right).toFixed(1), l:+(pb.left-b.left).toFixed(1), t:+(pb.top-b.top).toFixed(1)}});
        });
      });
      return r;
    }""")
    b.close()
if msgs: print("console:", msgs[:10])
print(f"wrote {OUT}")
print("版面はみ出し:", len(info) or "なし")
for x in info[:25]: print("  ", x)
