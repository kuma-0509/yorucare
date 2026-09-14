// 同意説明書（yorucare-consent.html）から印刷用PDFを作る。
// Google Fonts はこのコンテナから読めないので、取得済みの実フォントを @font-face で埋め込む。
import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const b64 = f => fs.readFileSync(path.join(dir, 'fonts', f)).toString('base64');
const face = (fam, w, f) =>
  `@font-face{font-family:'${fam}';font-style:normal;font-weight:${w};font-display:block;src:url(data:font/ttf;base64,${b64(f)}) format('truetype');}`;

const fonts = [
  face('Noto Sans JP', 400, 'n1.ttf'),
  face('Noto Sans JP', 500, 'n2.ttf'),
  face('Noto Sans JP', 700, 'n3.ttf'),
  face('Noto Sans JP', 900, 'n4.ttf'),
  face('Zen Old Mincho', 600, 'm1.ttf'),
  face('Zen Old Mincho', 700, 'm2.ttf'),
].join('\n');

// 印刷専用の上書き。画面用の値（760px幅・15px）は紙には合わないので紙の寸法に合わせる。
const printCss = `
  @page{ size:A4; margin:16mm 15mm 17mm; }
  html,body{ background:#fff !important; }
  body{ font-size:13.5px; line-height:1.8; }
  .sheet{ max-width:none; margin:0; padding:0; }
  .tablewrap{ overflow:visible; }
  /* 見出しだけがページ末尾に取り残されるのを防ぐ */
  h1,h2,h3{ break-after:avoid; page-break-after:avoid; }
  h2,h3,p,li,tr,table,.warn,.split>div,.agree li,.doc-head,footer{ break-inside:avoid; page-break-inside:avoid; }
  section{ margin-top:30px; }
  .split{ break-inside:avoid; page-break-inside:avoid; }
  footer{ break-before:avoid; page-break-before:avoid; }
`;

const src = fs.readFileSync(path.join(dir, 'consent.html'), 'utf8')
  .replace(/<link[^>]*fonts\.googleapis[^>]*>\s*/, '');
const html = `<!doctype html><html lang="ja" data-theme="light"><head><meta charset="utf-8">`
  + `<style>${fonts}</style>${src.replace(/^<title>[\s\S]*?<\/title>/, '')}`;
// <style> と本文はそのまま流用し、最後に印刷用CSSを足して勝たせる
const out = html.replace('</style>\n\n<div class="sheet">', `</style>\n<style>${printCss}</style>\n\n<div class="sheet">`);
if (out === html) { console.error('印刷用CSSの差し込みに失敗'); process.exit(1); }
fs.writeFileSync(path.join(dir, 'print.html'), out);

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('file://' + path.join(dir, 'print.html'), { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
for (const f of ["13.5px 'Noto Sans JP'", "700 19px 'Zen Old Mincho'"]) {
  const ok = await page.evaluate(s => document.fonts.check(s), f);
  if (!ok) { console.error(`フォント未読込: ${f}`); await browser.close(); process.exit(1); }
}

// 「21:00〜21:20」が行末で割れないよう、時刻の範囲だけ折り返し禁止にする
const wrapped = await page.evaluate(() => {
  let n = 0;
  for (const td of document.querySelectorAll('td')) {
    if (td.children.length) continue;
    const html = td.textContent.replace(/(\d{1,2}:\d{2}\s*〜\s*\d{1,2}:\d{2})/g,
      m => { n++; return `<span style="white-space:nowrap">${m}</span>`; });
    if (n) td.innerHTML = html;
  }
  return n;
});
if (wrapped < 3) { console.error(`時刻の折り返し禁止が効いていない（${wrapped}件）`); await browser.close(); process.exit(1); }

const pdf = path.join(dir, 'ヨルケア参加同意説明書_A4.pdf');
await page.pdf({
  path: pdf, format: 'A4', printBackground: true, preferCSSPageSize: true,
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate:
    `<div style="width:100%;font-family:sans-serif;font-size:8px;color:#8794a3;`
    + `padding:0 15mm;display:flex;justify-content:space-between;">`
    + `<span>ヨルケア 参加同意説明書　第1版（2026年9月14日）</span>`
    + `<span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
});
await browser.close();

const size = fs.statSync(pdf).size;
const buf = fs.readFileSync(pdf);
const pages = (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
const subsets = (buf.toString('latin1').match(/\/FontFile2/g) || []).length;
console.log(`${path.basename(pdf)}  ${Math.round(size / 1024)}KB  ${pages}ページ  埋め込みフォント ${subsets}件`);
if (pages < 1 || subsets < 1) { console.error('PDFの検証に失敗'); process.exit(1); }
