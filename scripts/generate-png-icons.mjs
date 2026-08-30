import fs from "fs";
import path from "path";
import zlib from "zlib";

function createPng(width, height, drawFn) {
  const rowSize = width * 4 + 1;
  const raw = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    raw[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawFn(x / width, y / height);
      const pxOffset = rowOffset + 1 + x * 4;
      raw[pxOffset] = r;
      raw[pxOffset + 1] = g;
      raw[pxOffset + 2] = b;
      raw[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(raw);

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, "ascii");
    const crcBuf = Buffer.alloc(4);
    const crc = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const ihdrChunk = chunk("IHDR", ihdr);
  const idatChunk = chunk("IDAT", compressed);
  const iendChunk = chunk("IEND", Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ crcTable[(c ^ buf[i]) & 0xff];
  }
  return (c ^ 0xffffffff) >>> 0;
}

// 1. App Icon Drawer (Square)
function drawLogo(nx, ny) {
  const x = nx * 512;
  const y = ny * 512;
  const rx = 96;

  const isInsideBg = (
    (x >= rx && x <= 512 - rx && y >= 0 && y <= 512) ||
    (x >= 0 && x <= 512 && y >= rx && y <= 512 - rx) ||
    Math.hypot(x - rx, y - rx) <= rx ||
    Math.hypot(x - (512 - rx), y - rx) <= rx ||
    Math.hypot(x - rx, y - (512 - rx)) <= rx ||
    Math.hypot(x - (512 - rx), y - (512 - rx)) <= rx
  );

  if (!isInsideBg) return [0, 0, 0, 0];

  if (isInsideRoundedRect(x, y, 96, 128, 320, 64, 16)) return [255, 255, 255, 255];
  if (isInsideRoundedRect(x, y, 96, 224, 224, 48, 12)) return [238, 241, 255, 255];
  if (isInsideRoundedRect(x, y, 96, 304, 288, 48, 12)) return [238, 241, 255, 255];
  if (isInsideRoundedRect(x, y, 96, 384, 160, 48, 12)) return [255, 255, 255, 255];

  return [61, 90, 254, 255];
}

// 2. Desktop Screenshot Drawer (1280x720 Wide) - Clean modern industrial app mockup
function drawDesktopScreenshot(nx, ny) {
  const x = nx * 1280;
  const y = ny * 720;

  // Background #f8fafc (Slate-50)
  if (y < 60) {
    // Top App Header #ffffff with border
    if (y >= 58) return [226, 232, 240, 255]; // border-slate-200
    // Logo block at top left
    if (x >= 40 && x <= 72 && y >= 14 && y <= 46) {
      return [61, 90, 254, 255];
    }
    // Search bar mockup
    if (x >= 120 && x <= 450 && y >= 14 && y <= 46) {
      return [241, 245, 249, 255];
    }
    return [255, 255, 255, 255];
  }

  // Left card: Inputs (x: 40..580, y: 90..660)
  if (x >= 40 && x <= 580 && y >= 90 && y <= 660) {
    // Card header
    if (y <= 130) return [255, 255, 255, 255];
    // Input boxes
    if ((y >= 160 && y <= 200) || (y >= 230 && y <= 270) || (y >= 300 && y <= 340) || (y >= 370 && y <= 410)) {
      if (x >= 60 && x <= 560) return [248, 250, 252, 255];
    }
    return [255, 255, 255, 255];
  }

  // Right card: Results Hero & Chart (x: 620..1240, y: 90..660)
  if (x >= 620 && x <= 1240 && y >= 90 && y <= 660) {
    // Hero result box at top
    if (y >= 110 && y <= 240 && x >= 640 && x <= 1220) {
      return [238, 242, 255, 255]; // Blue hero bg #eef2ff
    }
    // Result chart / matrix mockup
    if (y >= 260 && y <= 630 && x >= 640 && x <= 1220) {
      return [248, 250, 252, 255];
    }
    return [255, 255, 255, 255];
  }

  return [241, 245, 249, 255]; // Outer Slate bg #f1f5f9
}

// 3. Mobile Screenshot Drawer (540x960 Narrow)
function drawMobileScreenshot(nx, ny) {
  const x = nx * 540;
  const y = ny * 960;

  // Header #ffffff
  if (y < 60) {
    if (y >= 58) return [226, 232, 240, 255];
    if (x >= 20 && x <= 50 && y >= 15 && y <= 45) return [61, 90, 254, 255];
    return [255, 255, 255, 255];
  }

  // Mobile single column cards
  // Card 1: Hero Result (y: 80..220, x: 20..520)
  if (x >= 20 && x <= 520 && y >= 80 && y <= 220) {
    if (x >= 30 && x <= 510 && y >= 90 && y <= 210) return [238, 242, 255, 255];
    return [255, 255, 255, 255];
  }

  // Card 2: Input fields (y: 240..600, x: 20..520)
  if (x >= 20 && x <= 520 && y >= 240 && y <= 600) {
    if ((y >= 280 && y <= 320) || (y >= 350 && y <= 390) || (y >= 420 && y <= 460) || (y >= 490 && y <= 530)) {
      if (x >= 40 && x <= 500) return [248, 250, 252, 255];
    }
    return [255, 255, 255, 255];
  }

  // Card 3: Chart / Spec table (y: 620..920, x: 20..520)
  if (x >= 20 && x <= 520 && y >= 620 && y <= 920) {
    return [255, 255, 255, 255];
  }

  return [241, 245, 249, 255];
}

function isInsideRoundedRect(px, py, rx, ry, rw, rh, rad) {
  if (px < rx || px > rx + rw || py < ry || py > ry + rh) return false;
  const left = rx + rad;
  const right = rx + rw - rad;
  const top = ry + rad;
  const bottom = ry + rh - rad;

  if (px >= left && px <= right) return true;
  if (py >= top && py <= bottom) return true;

  if (px < left && py < top) return Math.hypot(px - left, py - top) <= rad;
  if (px > right && py < top) return Math.hypot(px - right, py - top) <= rad;
  if (px < left && py > bottom) return Math.hypot(px - left, py - bottom) <= rad;
  if (px > right && py > bottom) return Math.hypot(px - right, py - bottom) <= rad;

  return true;
}

const publicDir = path.resolve("public");
fs.writeFileSync(path.join(publicDir, "icon-192.png"), createPng(192, 192, drawLogo));
fs.writeFileSync(path.join(publicDir, "icon-512.png"), createPng(512, 512, drawLogo));
fs.writeFileSync(path.join(publicDir, "apple-touch-icon.png"), createPng(180, 180, drawLogo));
fs.writeFileSync(path.join(publicDir, "screenshot-desktop.png"), createPng(1280, 720, drawDesktopScreenshot));
fs.writeFileSync(path.join(publicDir, "screenshot-mobile.png"), createPng(540, 960, drawMobileScreenshot));

console.log("All PWA icons and rich screenshots generated successfully in public/!");
