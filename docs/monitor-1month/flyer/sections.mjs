import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import path from 'node:path'; import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 950, height: 1600 } });
await p.goto('file://' + path.join(dir, `preview-${process.argv[2]}.html`));
await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(1000);
console.log(await p.evaluate(() => {
  const sheet = document.body.firstElementChild;
  const out = [];
  for (const c of sheet.children) {
    const h = Math.round(c.getBoundingClientRect().height);
    if (c.classList.contains('main')) {
      out.push(`main(合計${h})`);
      for (const s of c.children) out.push('   ├ ' + Math.round(s.getBoundingClientRect().height) + 'px  ' + (s.textContent||'').trim().slice(0,22));
    } else out.push(`${h}px  ${(c.textContent||'').trim().slice(0,22)}`);
  }
  return out.join('\n');
}));
await b.close();
