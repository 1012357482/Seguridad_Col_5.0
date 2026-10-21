// Genera los íconos PNG de la PWA sin dependencias (escudo verde sobre morado).
// Uso: node scripts/generate-icons.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { crc32, deflateSync } from "node:zlib";

const MORADO_ARRIBA = [0x7b, 0x1f, 0xa2];
const MORADO_ABAJO = [0x5b, 0x1a, 0x8a];
const VERDE = [0x22, 0xe0, 0x7a];
const BLANCO = [0xff, 0xff, 0xff];

const ESCUDO = [
  [0.5, 0.17], [0.78, 0.28], [0.765, 0.55], [0.66, 0.73], [0.5, 0.84], [0.34, 0.73], [0.235, 0.55], [0.22, 0.28],
];
const CHECK = [[0.36, 0.5], [0.455, 0.61], [0.66, 0.39]];

function dentro(x, y, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

function distSeg(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function color(x, y, maskable) {
  // Escala del contenido: el maskable deja zona segura (80 %).
  const s = maskable ? 0.8 : 1;
  const u = (x - 0.5) / s + 0.5, v = (y - 0.5) / s + 0.5;
  if (!maskable) {
    const r = 0.2, cx = Math.min(Math.max(x, r), 1 - r), cy = Math.min(Math.max(y, r), 1 - r);
    if (Math.hypot(x - cx, y - cy) > r) return null; // esquina redondeada transparente
  }
  const fondo = MORADO_ARRIBA.map((c, i) => Math.round(c + (MORADO_ABAJO[i] - c) * y));
  const enCheck = distSeg(u, v, CHECK[0], CHECK[1]) < 0.045 || distSeg(u, v, CHECK[1], CHECK[2]) < 0.045;
  if (enCheck && dentro(u, v, ESCUDO)) return BLANCO;
  if (dentro(u, v, ESCUDO)) return VERDE;
  return fondo;
}

function png(size, maskable) {
  const SS = 4;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let py = 0; py < size; py++) {
    raw[py * (size * 4 + 1)] = 0;
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++)
        for (let sx = 0; sx < SS; sx++) {
          const c = color((px + (sx + 0.5) / SS) / size, (py + (sy + 0.5) / SS) / size, maskable);
          if (c) { r += c[0]; g += c[1]; b += c[2]; a += 255; }
        }
      const n = SS * SS, o = py * (size * 4 + 1) + 1 + px * 4;
      const cov = a / 255;
      raw[o] = cov ? Math.round(r / cov) : 0;
      raw[o + 1] = cov ? Math.round(g / cov) : 0;
      raw[o + 2] = cov ? Math.round(b / cov) : 0;
      raw[o + 3] = Math.round(a / n);
    }
  }
  const chunk = (tipo, datos) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(datos.length);
    const td = Buffer.concat([Buffer.from(tipo), datos]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0)),
  ]);
}

const dir = new URL("../public/icons/", import.meta.url);
mkdirSync(dir, { recursive: true });
writeFileSync(new URL("icon-192.png", dir), png(192, false));
writeFileSync(new URL("icon-512.png", dir), png(512, false));
writeFileSync(new URL("maskable-512.png", dir), png(512, true));
console.log("Íconos generados en public/icons/");
