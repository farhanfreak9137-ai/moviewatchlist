// Regenerates PWA + Android launcher icons from the WatchVault brand mark.
// Usage: node scripts/generate-icons.mjs
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const res = path.join(root, 'android', 'app', 'src', 'main', 'res');

const defs = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ff2d55"/>
      <stop offset="0.55" stop-color="#e5133a"/>
      <stop offset="1" stop-color="#ff8a00"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
  </defs>`;
const mark = `
  <path d="M21 13h22a4 4 0 0 1 4 4v35l-15-9.5L17 52V17a4 4 0 0 1 4-4z" fill="#fff"/>
  <path d="M28.5 21.5v13l10.5-6.5z" fill="url(#bg)"/>`;

// Rounded-square icon (PWA + legacy Android launcher)
const squareSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${defs}
  <rect width="64" height="64" rx="16" fill="url(#bg)"/>
  <rect width="64" height="32" rx="16" fill="url(#shine)"/>${mark}</svg>`;

// Full-bleed square for maskable PWA icon (no rounded corners, mark kept in safe zone)
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${defs}
  <rect width="64" height="64" fill="url(#bg)"/>
  <g transform="translate(32 32) scale(0.8) translate(-32 -32.5)">${mark}</g></svg>`;

// Circle icon (legacy round launcher)
const roundSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${defs}
  <circle cx="32" cy="32" r="32" fill="url(#bg)"/>
  <g transform="translate(32 32) scale(0.85) translate(-32 -32.5)">${mark}</g></svg>`;

// Adaptive-icon foreground: 108dp canvas, opaque gradient, mark inside the 66dp safe zone
const foregroundSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108">${defs}
  <rect width="108" height="108" fill="url(#bg)"/>
  <g transform="translate(54 54) scale(1.2) translate(-32 -32.5)">${mark}</g></svg>`;

const render = (svg, size, out) => {
  mkdirSync(path.dirname(out), { recursive: true });
  return sharp(Buffer.from(svg), { density: 1200 }).resize(size, size).png().toFile(out);
};

const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const jobs = [
  render(maskableSvg, 192, path.join(root, 'public', 'icon-192.png')),
  render(maskableSvg, 512, path.join(root, 'public', 'icon-512.png')),
  render(squareSvg, 180, path.join(root, 'src', 'app', 'apple-icon.png')),
];
for (const [name, k] of Object.entries(densities)) {
  const dir = path.join(res, `mipmap-${name}`);
  jobs.push(render(squareSvg, Math.round(48 * k), path.join(dir, 'ic_launcher.png')));
  jobs.push(render(roundSvg, Math.round(48 * k), path.join(dir, 'ic_launcher_round.png')));
  jobs.push(render(foregroundSvg, Math.round(108 * k), path.join(dir, 'ic_launcher_foreground.png')));
}
await Promise.all(jobs);

// favicon.ico: single 48px PNG wrapped in an ICO container
const png = await sharp(Buffer.from(squareSvg), { density: 1200 }).resize(48, 48).png().toBuffer();
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(1, 4); // image count
header.writeUInt8(48, 6); // width
header.writeUInt8(48, 7); // height
header.writeUInt16LE(1, 10); // color planes
header.writeUInt16LE(32, 12); // bits per pixel
header.writeUInt32LE(png.length, 14); // image size
header.writeUInt32LE(22, 18); // image offset
const { writeFileSync } = await import('node:fs');
writeFileSync(path.join(root, 'src', 'app', 'favicon.ico'), Buffer.concat([header, png]));

console.log(`Generated ${jobs.length + 1} icons.`);
