import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const jobs = [
  { src: '/home/user/yorucare/docs/ito.jpg',        mime: 'image/webp', out: 'ito.jpg',      cx: 0.47, cy: 0.36, side: 0.78 },
  { src: '/home/user/yorucare/docs/kumagai.jpg.jpg', mime: 'image/jpeg', out: 'kumagai.jpg', cx: 0.61, cy: 0.30, side: 0.72 },
];

const b = await chromium.launch();
const p = await b.newPage();
await p.setContent('<!doctype html><body>');
for (const j of jobs) {
  const url = `data:${j.mime};base64,` + fs.readFileSync(j.src).toString('base64');
  const res = await p.evaluate(async ({ url, cx, cy, side }) => {
    const img = new Image();
    img.src = url;
    await img.decode();
    const S = Math.round(Math.min(img.naturalWidth, img.naturalHeight) * side);
    let x = Math.max(0, Math.min(Math.round(img.naturalWidth * cx - S / 2), img.naturalWidth - S));
    let y = Math.max(0, Math.min(Math.round(img.naturalHeight * cy - S / 2), img.naturalHeight - S));
    const c = document.createElement('canvas');
    c.width = c.height = 340;
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, x, y, S, S, 0, 0, 340, 340);
    for (const q of [0.86, 0.8, 0.74, 0.66, 0.58]) {
      const d = c.toDataURL('image/jpeg', q);
      const bytes = Math.round((d.length - d.indexOf(',') - 1) * 3 / 4);
      if (bytes < 66000) return { data: d.split(',')[1], bytes, q, src: [img.naturalWidth, img.naturalHeight], crop: [x, y, S] };
    }
    return null;
  }, { url, cx: j.cx, cy: j.cy, side: j.side });
  if (!res) { console.log('FAILED', j.out); continue; }
  fs.writeFileSync(j.out, Buffer.from(res.data, 'base64'));
  console.log(j.out, `${res.bytes}B q=${res.q} 元=${res.src.join('x')} 切出=${res.crop.join(',')}`);
}
await b.close();
