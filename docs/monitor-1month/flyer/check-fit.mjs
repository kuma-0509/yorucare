// 本物のフォントで、塗り足し込みA4（816×1145）に収まるか判定する。はみ出したら異常終了。
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import path from 'node:path'; import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const H = 1145, W = 816, TRIM_BOTTOM = 1145 - 11; // 塗り足し11pxを除いた仕上がり下端
const b = await chromium.launch();
let bad = 0;
for (const name of process.argv.slice(2)) {
  const p = await b.newPage({ viewport: { width: 950, height: 1500 }, deviceScaleFactor: 2 });
  await p.goto('file://' + path.join(dir, `preview-${name}.html`));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(1200);
  const r = await p.evaluate(() => {
    if (!document.fonts.check("16px 'Noto Sans JP'")) return { fontMissing: true };
    const root = document.body.firstElementChild;
    const top = root.getBoundingClientRect().top;
    let worst = 0, culprit = null;
    for (const el of root.querySelectorAll('*')) {
      const bottom = el.getBoundingClientRect().bottom - top;
      if (bottom > worst) { worst = bottom; culprit = (el.textContent || '').trim().slice(0, 26); }
    }
    const grow = root.querySelector('.grow');
    return { worst: Math.round(worst), culprit, grow: grow ? Math.round(grow.getBoundingClientRect().height) : null };
  });
  await p.screenshot({ path: path.join(dir, `preview-${name}.png`), clip: { x: 0, y: 0, width: W, height: H } });
  await p.close();
  if (r.fontMissing) { console.error(`${name}: 本物のフォントが読めていません`); bad++; continue; }
  const over = r.worst - H;
  if (over > 0) { console.error(`${name}: ${over}px はみ出し（「${r.culprit}」）`); bad++; }
  else console.log(`${name}: OK　最下端 ${r.worst}px / 予備の余白 ${r.grow}px`);
}
await b.close();
process.exit(bad ? 1 : 0);
