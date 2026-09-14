// 各 .dc.html から検証用プレビューを生成する（手作業コピーをやめる）
import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const css = fs.readFileSync(path.join(dir, 'gf.css'), 'utf8');
const pairs = [...css.matchAll(/font-weight:\s*(\d+);[\s\S]*?url\((https:\/\/fonts\.gstatic\.com[^)]*)\)/g)].map(m => [m[1], m[2]]);
const uniq = [...new Set(pairs.map(([, u]) => u))];
const face = pairs.map(([w, u]) =>
  `@font-face{font-family:'Noto Sans JP';font-style:normal;font-weight:${w};font-display:block;src:url('fonts/n${uniq.indexOf(u) + 1}.ttf') format('truetype');}`).join('\n');
for (const name of process.argv.slice(2)) {
  const src = fs.readFileSync(path.join(dir, name + '.dc.html'), 'utf8');
  const inner = src.split('<x-dc>')[1].split('</x-dc>')[0];
  const helmet = inner.match(/<helmet>([\s\S]*?)<\/helmet>/);
  const body = inner.replace(helmet[0], '');
  fs.writeFileSync(path.join(dir, `preview-${name}.html`),
    `<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>${face}</style>`
    + `${helmet[1].replace(/<link[^>]*fonts\.googleapis[^>]*>/, '')}</head><body style="margin:0">${body}</body></html>`);
  console.log(`preview-${name}.html を生成`);
}
