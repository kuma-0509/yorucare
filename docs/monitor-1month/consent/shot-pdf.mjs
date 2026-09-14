// 出力したPDFそのものを1ページずつ画像にして、実際のページ送りを目で確認する
import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const dir = path.dirname(fileURLToPath(import.meta.url));
const pdfPath = path.join(dir, process.argv[2] || 'ヨルケア参加同意説明書_A4.pdf');
const data = fs.readFileSync(pdfPath).toString('base64');
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 840, height: 1200 } });
await p.goto('http://127.0.0.1:8731/viewer.html');
await p.waitForFunction(() => window.pdfReady);
const n = await p.evaluate(async (b64) => {
  const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const doc = await window.pdfjsLib.getDocument({ data: bin }).promise;
  for (let i = 1; i <= doc.numPages; i++) {
    const pg = await doc.getPage(i);
    const vp = pg.getViewport({ scale: 1.3 });
    const cv = document.createElement('canvas');
    cv.width = vp.width; cv.height = vp.height; cv.id = 'p' + i;
    cv.style.cssText = 'display:block;margin:0 auto 14px;background:#fff';
    document.getElementById('o').append(cv);
    await pg.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
  }
  return doc.numPages;
}, data);
for (let i = 1; i <= n; i++) await p.locator('#p' + i).screenshot({ path: path.join(dir, `pg${i}.png`) });
console.log(`${n}ページを pg1..pg${n}.png に描画`);
await b.close();
