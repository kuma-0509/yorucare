import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));

// 実フォントの @font-face（ローカルの ttf を使うのでPDFに確実に埋め込まれる）
const gcss = fs.readFileSync(path.join(dir, 'gf.css'), 'utf8');
const pairs = [...gcss.matchAll(/font-weight:\s*(\d+);[\s\S]*?url\((https:\/\/fonts\.gstatic\.com[^)]*)\)/g)].map(m => [m[1], m[2]]);
const uniq = [...new Set(pairs.map(([, u]) => u))];
const face = pairs.map(([w, u]) =>
  `@font-face{font-family:'Noto Sans JP';font-style:normal;font-weight:${w};font-display:block;src:url('fonts/n${uniq.indexOf(u) + 1}.ttf') format('truetype');}`).join('\n');

function part(name) {
  const src = fs.readFileSync(path.join(dir, name + '.dc.html'), 'utf8');
  const inner = src.split('<x-dc>')[1].split('</x-dc>')[0];
  const helmet = inner.match(/<helmet>([\s\S]*?)<\/helmet>/);
  const style = helmet[1].replace(/<link[^>]*fonts\.googleapis[^>]*>/, '');
  return { style, body: inner.replace(helmet[0], '') };
}
const A = part('Main'), B = part('Back');

// 1) 印刷所入稿用：塗り足し3mm込み 216×303mm
const bleedDoc = `<!doctype html><html lang="ja"><head><meta charset="utf-8">
<style>${face}
@page{ size:216mm 303mm; margin:0; }
html,body{ margin:0; padding:0; }
.page{ width:816px; height:1145px; overflow:hidden; page-break-after:always; }
.page:last-child{ page-break-after:auto; }
</style>${A.style}</head><body>
<div class="page">${A.body}</div><div class="page">${B.body}</div></body></html>`;
fs.writeFileSync(path.join(dir, 'print-bleed.html'), bleedDoc);

// 2) 手元プリント用：仕上がりA4ぴったり（塗り足し分を断裁した状態）
const trimDoc = `<!doctype html><html lang="ja"><head><meta charset="utf-8">
<style>${face}
@page{ size:A4; margin:0; }
html,body{ margin:0; padding:0; }
.page{ width:794px; height:1123px; overflow:hidden; position:relative; page-break-after:always; }
.page:last-child{ page-break-after:auto; }
.page > *{ position:absolute; top:-11px; left:-11px; }
</style>${A.style}</head><body>
<div class="page">${A.body}</div><div class="page">${B.body}</div></body></html>`;
fs.writeFileSync(path.join(dir, 'print-trim.html'), trimDoc);

const b = await chromium.launch();
for (const [file, out, size] of [
  ['print-bleed.html', 'ヨルケア募集チラシ_両面_入稿用（塗り足し3mm付き）.pdf', { width: '216mm', height: '303mm' }],
  ['print-trim.html',  'ヨルケア募集チラシ_両面_A4.pdf',                        { width: '210mm', height: '297mm' }],
]) {
  const p = await b.newPage();
  await p.goto('file://' + path.join(dir, file));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(1200);
  const ok = await p.evaluate(() => document.fonts.check("16px 'Noto Sans JP'"));
  if (!ok) { console.error(`${out}: フォントが読み込めていません`); process.exit(1); }
  await p.pdf({ path: path.join(dir, out), ...size, printBackground: true,
                margin: { top: 0, right: 0, bottom: 0, left: 0 }, preferCSSPageSize: true });
  await p.close();
  console.log(`${out}  ${(fs.statSync(path.join(dir, out)).size / 1024).toFixed(0)}KB`);
}
await b.close();
