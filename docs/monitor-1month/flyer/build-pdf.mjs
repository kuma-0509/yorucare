// チラシPDFを2種類つくる。
//
// 各面は「自分のCSSだけ」で組む。以前は1つのHTMLに表と裏を並べ、表のCSSだけを
// 入れていたため、裏面が表のCSSで組まれて崩れていた（表の記録が残る）。
// なので面ごとに1ページのPDFを作り、最後に1つに綴じる。
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { PDFDocument } from './node_modules/pdf-lib/cjs/index.js';
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
  return { style: helmet[1].replace(/<link[^>]*fonts\.googleapis[^>]*>/, ''),
           body: inner.replace(helmet[0], '') };
}

// 塗り足しを切った版は、隠すのではなく塗り足し0で組み直す。
// 余白は calc(var(--bleed) + n) で書いてあるので、--bleed を 0 にすれば
// 仕上がり線からの距離は塗り足し版と同じになる。
// （以前は 816×1145 のまま -11px ずらして隠していたが、紙からはみ出した
//   絶対配置の中身は印刷時に消えてしまい、注記の最終行が落ちていた）
const VARIANTS = [
  { out: 'ヨルケア募集チラシ_両面_入稿用（塗り足し3mm付き）.pdf',
    page: { width: '216mm', height: '303mm' }, css: '@page{ size:216mm 303mm; margin:0; }' },
  { out: 'ヨルケア募集チラシ_両面_A4.pdf',
    page: { width: '210mm', height: '297mm' },
    css: `@page{ size:A4; margin:0; }
          :root{ --bleed:0px; --pad-x:40px; }   /* 51px = 塗り足し11 + 左右マージン40 */
          .sheet{ width:794px; height:1123px; }  /* A4 仕上がり（96dpi） */` },
];

const browser = await chromium.launch();
for (const v of VARIANTS) {
  const merged = await PDFDocument.create();
  for (const name of ['Main', 'Back']) {
    const { style, body } = part(name);
    const doc = `<!doctype html><html lang="ja"><head><meta charset="utf-8">
<style>${face}
html,body{ margin:0; padding:0; }
</style>${style}<style>${v.css}</style></head><body>${body}</body></html>`;
    const tmp = path.join(dir, `print-${name}.html`);
    fs.writeFileSync(tmp, doc);

    const p = await browser.newPage();
    await p.goto('file://' + tmp);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(800);
    if (!await p.evaluate(() => document.fonts.check("16px 'Noto Sans JP'"))) {
      console.error(`${v.out} / ${name}: フォントが読み込めていません`); process.exit(1);
    }
    // 紙に収まっているか。収まっていなければ overflow:hidden が黙って切り落とす。
    const over = await p.evaluate(() => {
      const s = document.querySelector('.sheet');
      const sum = [...s.children].reduce((a, c) => a + c.getBoundingClientRect().height, 0);
      return +(sum - s.getBoundingClientRect().height).toFixed(1);
    });
    if (over > 0) { console.error(`${v.out} / ${name}: 中身が紙より ${over}px 高い（下が切れます）`); process.exit(1); }

    const buf = await p.pdf({ ...v.page, printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 }, preferCSSPageSize: true });
    await p.close();

    const one = await PDFDocument.load(buf);
    const [pg] = await merged.copyPages(one, [0]);
    merged.addPage(pg);
  }
  const bytes = await merged.save();
  fs.writeFileSync(path.join(dir, v.out), bytes);
  console.log(`${v.out}  ${(bytes.length / 1024).toFixed(0)}KB  ${merged.getPageCount()}ページ`);
}
await browser.close();
