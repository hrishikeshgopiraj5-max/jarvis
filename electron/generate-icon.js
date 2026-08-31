/**
 * Generate JARVIS Crystal Orb Icon
 * Creates a 256x256 PNG and .ico file for the desktop app
 */

const fs = require('fs');
const path = require('path');

// ── Create ICO file manually ──────────────────────────────────
// ICO format: header + directory entry + PNG data

function createICO(pngBuffer, size) {
  // ICO Header (6 bytes)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);      // Reserved
  header.writeUInt16LE(1, 2);      // Type: ICO
  header.writeUInt16LE(1, 4);      // Number of images

  // ICO Directory Entry (16 bytes)
  const dirEntry = Buffer.alloc(16);
  dirEntry.writeUInt8(size >= 256 ? 0 : size, 0);  // Width
  dirEntry.writeUInt8(size >= 256 ? 0 : size, 1);  // Height
  dirEntry.writeUInt8(0, 2);        // Color palette
  dirEntry.writeUInt8(0, 3);        // Reserved
  dirEntry.writeUInt16LE(1, 4);     // Color planes
  dirEntry.writeUInt16LE(32, 6);    // Bits per pixel
  dirEntry.writeUInt32LE(pngBuffer.length, 8);   // Image size
  dirEntry.writeUInt32LE(22, 12);   // Offset (6 + 16 = 22)

  return Buffer.concat([header, dirEntry, pngBuffer]);
}

// ── Create a simple but nice crystal icon using raw pixel data ──
// We'll create a minimal valid PNG with a crystal design

function createCrystalPNG(size) {
  // Create a canvas-like buffer
  const width = size;
  const height = size;
  const channels = 4; // RGBA

  const pixels = Buffer.alloc(width * height * channels);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.35;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      const idx = (y * width + x) * channels;

      // Background glow
      const glowDist = dist / (width * 0.5);
      const glow = Math.max(0, 1 - glowDist * glowDist) * 0.4;

      // Crystal body
      const crystalShape = getCrystalValue(x, y, cx, cy, radius);

      if (crystalShape > 0) {
        // Inside crystal
        const facet = getCrystalFacet(x, y, cx, cy, radius);

        // Color: cyan-blue-purple gradient
        const r = Math.floor(40 + facet * 60 + glow * 80);
        const g = Math.floor(80 + facet * 100 + glow * 120);
        const b = Math.floor(150 + facet * 80 + glow * 60);
        const a = Math.floor(200 + facet * 55);

        pixels[idx] = Math.min(255, r);
        pixels[idx + 1] = Math.min(255, g);
        pixels[idx + 2] = Math.min(255, b);
        pixels[idx + 3] = Math.min(255, a);
      } else if (glow > 0.05) {
        // Outer glow
        pixels[idx] = Math.floor(40 + glow * 100);
        pixels[idx + 1] = Math.floor(120 + glow * 100);
        pixels[idx + 2] = Math.floor(200 + glow * 55);
        pixels[idx + 3] = Math.floor(glow * 180);
      } else {
        // Transparent background
        pixels[idx] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 0;
      }
    }
  }

  return encodePNG(width, height, pixels);
}

function getCrystalValue(x, y, cx, cy, r) {
  // Octagonal crystal shape
  const dx = (x - cx) / r;
  const dy = (y - cy) / r;
  const angle = Math.atan2(dy, dx) + Math.PI;
  const sides = 8;
  const segment = (Math.PI * 2) / sides;
  const sector = angle % segment;
  const normalizedDist = Math.sqrt(dx * dx + dy * dy);

  // Crystal boundary
  const crystalRadius = 0.85 + 0.1 * Math.cos(angle * 3);
  if (normalizedDist < crystalRadius) return 1;
  if (normalizedDist < crystalRadius + 0.05) return (1 - (normalizedDist - crystalRadius) / 0.05) * 0.5;
  return 0;
}

function getCrystalFacet(x, y, cx, cy, r) {
  const dx = (x - cx) / r;
  const dy = (y - cy) / r;
  const angle = Math.atan2(dy, dx);

  // Create faceted look
  const facet1 = Math.abs(Math.sin(angle * 4)) * 0.5;
  const facet2 = Math.abs(Math.cos(angle * 3 + 0.5)) * 0.3;
  const highlight = Math.max(0, 1 - Math.sqrt((dx + 0.2) * (dx + 0.2) + (dy + 0.2) * (dy + 0.2)) * 1.5);

  return facet1 + facet2 + highlight * 0.4;
}

// ── Minimal PNG encoder ────────────────────────────────────────
function encodePNG(width, height, rgbaPixels) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);   // bit depth
  ihdr.writeUInt8(6, 9);   // color type (RGBA)
  ihdr.writeUInt8(0, 10);  // compression
  ihdr.writeUInt8(0, 11);  // filter
  ihdr.writeUInt8(0, 12);  // interlace

  // IDAT chunk - raw image data with zlib
  const rawData = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 4)] = 0; // filter: none
    rgbaPixels.copy(rawData, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }

  // Compress with zlib (simple deflate)
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(rawData);

  // Build chunks
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData), 0);

  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ── Generate the icon ──────────────────────────────────────────
console.log('Generating JARVIS crystal orb icon...');

const png256 = createCrystalPNG(256);
const png48 = createCrystalPNG(48);
const png32 = createCrystalPNG(32);
const png16 = createCrystalPNG(16);

// Save PNG
fs.writeFileSync(path.join(__dirname, 'icon.png'), png256);
console.log('Created icon.png (256x256)');

// Save ICO (with multiple sizes)
const ico = createICO(png256, 256);
fs.writeFileSync(path.join(__dirname, 'icon.ico'), ico);
console.log('Created icon.ico');

console.log('Done! JARVIS icon generated.');
