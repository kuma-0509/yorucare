// 出したPDFの中身を実際に読み、載っていなければならない文言が
// 全部あるか確かめる。レイアウトの都合で1行だけ消える事故が起きたため、
// 「組んだHTMLが正しい」ではなく「PDFに入っている」を確かめる。
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const dir = path.dirname(fileURLToPath(import.meta.url));

const PDFS = ['ヨルケア募集チラシ_両面_A4.pdf', 'ヨルケア募集チラシ_両面_入稿用（塗り足し3mm付き）.pdf'];
// 1ページ目（表）と2ページ目（裏）に必ず載っていること
const MUST = [
  [ '夜の20分から始める、セルフケア習慣。', '参加費 無料', '2026年10月20日',
    'モニター開始前後のアンケート2回', '申込締切', '10月13日', '@615ixfwt',
    'yorucare.yuki.kumagai@gmail.com',
    'かかりつけの医療機関にご相談ください。' ],
  [ '1週間の流れ', '21:00〜21:20', '21:25〜21:45', '伊藤 美幸', '熊谷 祐希',
    'よくある質問', 'かかりつけの医療機関にご相談ください。' ],
];

const types = { '.mjs': 'text/javascript', '.html': 'text/html', '.js': 'text/javascript' };
const server = http.createServer((req, res) => {
  const f = path.join(dir, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(dir) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(0, '127.0.0.1');
await new Promise(r => server.once('listening', r));
const base = `http://127.0.0.1:${server.address().port}`;

const b = await chromium.launch();
const p = await b.newPage();
await p.goto(base + '/pdf-viewer.html');
await p.waitForFunction(() => window.pdfReady);

let bad = 0;
for (const name of PDFS) {
  const file = path.join(dir, name);
  if (!fs.existsSync(file)) { console.error(`${name}: ファイルがない`); bad++; continue; }
  const pages = await p.evaluate(async (b64) => {
    const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const doc = await window.pdfjsLib.getDocument({ data: bin }).promise;
    const out = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const tc = await (await doc.getPage(i)).getTextContent();
      out.push(tc.items.map(it => it.str).join(''));
    }
    return out;
  }, fs.readFileSync(file).toString('base64'));

  if (pages.length !== 2) { console.error(`${name}: ${pages.length}ページ（2ページのはず）`); bad++; }
  MUST.forEach((needles, i) => {
    // PDFから取り出した文字は縦組み用の字形（⽉ ⽇ など）になることがあるので
    // NFKCで揃えてから比べる。空白も無視する。
    const norm = t => t.normalize('NFKC').replace(/\s+/g, '');
    const text = norm(pages[i] || '');
    for (const n of needles) {
      if (!text.includes(norm(n))) { console.error(`${name} ${i + 1}ページ: 「${n}」が入っていない`); bad++; }
    }
  });
  if (!bad) console.log(`${name}: OK（2ページ・必須文言 ${MUST.flat().length}件すべて確認）`);
}
await b.close(); server.close();
process.exit(bad ? 1 : 0);
