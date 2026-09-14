import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const payload = 'https://line.me/R/ti/p/@615ixfwt';
await QRCode.toFile('line-qr.png', payload, { errorCorrectionLevel: 'H', margin: 4, width: 560, color: { dark: '#000000', light: '#ffffff' } });
console.log('生成:', fs.statSync('line-qr.png').size, 'bytes');

// 生成したQRを読み取って、中身が一致するか確認する
const b = await chromium.launch();
const p = await b.newPage();
await p.setContent('<!doctype html><body>');
const decoded = await p.evaluate(async (url) => {
  const img = new Image(); img.src = url; await img.decode();
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height);
  return { data: Array.from(d.data), w: c.width, h: c.height };
}, 'data:image/png;base64,' + fs.readFileSync('line-qr.png').toString('base64'));
await b.close();

const r = jsQR(Uint8ClampedArray.from(decoded.data), decoded.w, decoded.h);
console.log('読取結果:', r ? r.data : '読み取れませんでした');
console.log('一致:', r && r.data === payload ? 'OK' : 'NG');
