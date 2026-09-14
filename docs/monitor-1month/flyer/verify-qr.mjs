import jsQR from 'jsqr';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const b = await chromium.launch();
const p = await b.newPage();
await p.setContent('<!doctype html><body>');
const d = await p.evaluate(async (url) => {
  const img = new Image(); img.src = url; await img.decode();
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  c.getContext('2d').drawImage(img, 0, 0);
  const i = c.getContext('2d').getImageData(0, 0, c.width, c.height);
  return { data: Array.from(i.data), w: c.width, h: c.height };
}, 'data:image/png;base64,' + fs.readFileSync('preview-Main.png').toString('base64'));
await b.close();
const r = jsQR(Uint8ClampedArray.from(d.data), d.w, d.h);
console.log('チラシ上のQR読取:', r ? r.data : '読み取れず');
