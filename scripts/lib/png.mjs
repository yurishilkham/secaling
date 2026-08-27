/**
 * Alat baca/tulis PNG tanpa dependensi luar.
 *
 * Dipakai oleh scripts/icon-audit.mjs dan scripts/build-icons.mjs untuk
 * memeriksa dan membuat aset ikon. Sengaja tidak memakai `sharp` supaya tidak
 * menambah dependensi native yang berat hanya untuk sesekali membuat ikon.
 *
 * Yang didukung: PNG 8-bit, non-interlaced, colorType 0/2/3/4/6.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';

const PNG_SIGNATURE = 0x89504e47;
const CHANNELS_BY_COLOR_TYPE = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

/**
 * Gambar dalam bentuk RGBA datar: satu Uint8Array, 4 byte per piksel,
 * alpha TIDAK dikalikan-muka (straight alpha).
 */
export function decodePng(file) {
  const b = readFileSync(file);
  if (b.readUInt32BE(0) !== PNG_SIGNATURE) throw new Error(`${file}: bukan berkas PNG`);

  const width = b.readUInt32BE(16);
  const height = b.readUInt32BE(20);
  const bitDepth = b[24];
  const colorType = b[25];
  const interlace = b[28];

  if (bitDepth !== 8) throw new Error(`${file}: bitDepth ${bitDepth} belum didukung`);
  if (interlace !== 0) throw new Error(`${file}: PNG interlaced belum didukung`);

  const channels = CHANNELS_BY_COLOR_TYPE[colorType];
  if (!channels) throw new Error(`${file}: colorType ${colorType} belum didukung`);

  const idat = [];
  let palette = null;
  let trns = null;
  let offset = 8;
  while (offset < b.length - 8) {
    const len = b.readUInt32BE(offset);
    const type = b.toString('ascii', offset + 4, offset + 8);
    const start = offset + 8;
    if (type === 'IDAT') idat.push(b.subarray(start, start + len));
    else if (type === 'PLTE') palette = b.subarray(start, start + len);
    else if (type === 'tRNS') trns = b.subarray(start, start + len);
    else if (type === 'IEND') break;
    offset += 12 + len;
  }

  const raw = inflateSync(Buffer.concat(idat));
  const bpp = channels;
  const stride = width * bpp;
  const un = Buffer.alloc(height * stride);

  // Batalkan filter baris PNG
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    const filter = raw[rowStart];
    const rowIn = raw.subarray(rowStart + 1, rowStart + 1 + stride);
    const rowOut = un.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? un.subarray((y - 1) * stride, y * stride) : null;

    for (let x = 0; x < stride; x++) {
      const left = x >= bpp ? rowOut[x - bpp] : 0;
      const up = prev ? prev[x] : 0;
      const upLeft = prev && x >= bpp ? prev[x - bpp] : 0;
      const v = rowIn[x];
      let out;
      switch (filter) {
        case 0:
          out = v;
          break;
        case 1:
          out = v + left;
          break;
        case 2:
          out = v + up;
          break;
        case 3:
          out = v + ((left + up) >> 1);
          break;
        case 4: {
          const p = left + up - upLeft;
          const pa = Math.abs(p - left);
          const pb = Math.abs(p - up);
          const pc = Math.abs(p - upLeft);
          out = v + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft);
          break;
        }
        default:
          throw new Error(`${file}: filter baris ${filter} tidak dikenal`);
      }
      rowOut[x] = out & 0xff;
    }
  }

  // Ubah ke RGBA
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0, p = 0; i < width * height; i++, p += 4) {
    const s = i * channels;
    switch (colorType) {
      case 0:
        rgba[p] = rgba[p + 1] = rgba[p + 2] = un[s];
        rgba[p + 3] = 255;
        break;
      case 2:
        rgba[p] = un[s];
        rgba[p + 1] = un[s + 1];
        rgba[p + 2] = un[s + 2];
        rgba[p + 3] = 255;
        break;
      case 3: {
        const idx = un[s];
        rgba[p] = palette[idx * 3];
        rgba[p + 1] = palette[idx * 3 + 1];
        rgba[p + 2] = palette[idx * 3 + 2];
        rgba[p + 3] = trns && idx < trns.length ? trns[idx] : 255;
        break;
      }
      case 4:
        rgba[p] = rgba[p + 1] = rgba[p + 2] = un[s];
        rgba[p + 3] = un[s + 1];
        break;
      case 6:
        rgba[p] = un[s];
        rgba[p + 1] = un[s + 1];
        rgba[p + 2] = un[s + 2];
        rgba[p + 3] = un[s + 3];
        break;
    }
  }

  return { width, height, data: rgba };
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** Tulis RGBA jadi PNG. `opaque: true` membuang saluran alpha (untuk ikon iOS). */
export function encodePng(img, file, { opaque = false } = {}) {
  const { width, height, data } = img;
  const channels = opaque ? 3 : 4;
  const stride = width * channels;

  // Filter 1 (Sub) lebih kecil hasilnya untuk gambar dengan bidang warna rata
  // dibanding filter 0, dan jauh lebih murah dihitung daripada mencoba semua.
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 1;
    for (let x = 0; x < width; x++) {
      const s = (y * width + x) * 4;
      const d = rowStart + 1 + x * channels;
      const px = [data[s], data[s + 1], data[s + 2], data[s + 3]];
      for (let c = 0; c < channels; c++) {
        const prev = x > 0 ? data[(y * width + x - 1) * 4 + c] : 0;
        raw[d + c] = (px[c] - prev) & 0xff;
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = opaque ? 2 : 6;

  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);

  writeFileSync(file, png);
  return png.length;
}

/**
 * Perkecil/perbesar dengan rata-rata berbobot (box filter) memakai alpha
 * dikalikan-muka.
 *
 * Alpha dikalikan-muka itu wajib: kalau tidak, piksel transparan (yang nilai
 * RGB-nya sering hitam) ikut dirata-rata dan tepi logo jadi punya lingkar
 * gelap. Ini kesalahan klasik saat memperkecil logo.
 */
export function resize(img, outW, outH) {
  const { width: inW, height: inH, data } = img;
  const out = new Uint8Array(outW * outH * 4);
  const xRatio = inW / outW;
  const yRatio = inH / outH;

  for (let y = 0; y < outH; y++) {
    const sy0 = y * yRatio;
    const sy1 = Math.min((y + 1) * yRatio, inH);
    const y0 = Math.floor(sy0);
    const y1 = Math.min(Math.ceil(sy1), inH);

    for (let x = 0; x < outW; x++) {
      const sx0 = x * xRatio;
      const sx1 = Math.min((x + 1) * xRatio, inW);
      const x0 = Math.floor(sx0);
      const x1 = Math.min(Math.ceil(sx1), inW);

      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let wSum = 0;

      for (let sy = y0; sy < y1; sy++) {
        const wy = Math.min(sy + 1, sy1) - Math.max(sy, sy0);
        if (wy <= 0) continue;
        for (let sx = x0; sx < x1; sx++) {
          const wx = Math.min(sx + 1, sx1) - Math.max(sx, sx0);
          if (wx <= 0) continue;
          const w = wx * wy;
          const s = (sy * inW + sx) * 4;
          const alpha = data[s + 3] / 255;
          // dikalikan-muka
          r += data[s] * alpha * w;
          g += data[s + 1] * alpha * w;
          b += data[s + 2] * alpha * w;
          a += data[s + 3] * w;
          wSum += w;
        }
      }

      const d = (y * outW + x) * 4;
      if (wSum === 0 || a === 0) {
        out[d] = out[d + 1] = out[d + 2] = out[d + 3] = 0;
        continue;
      }
      const avgA = a / wSum;
      const unpremul = avgA / 255;
      out[d] = Math.round(Math.min(255, r / wSum / unpremul));
      out[d + 1] = Math.round(Math.min(255, g / wSum / unpremul));
      out[d + 2] = Math.round(Math.min(255, b / wSum / unpremul));
      out[d + 3] = Math.round(avgA);
    }
  }

  return { width: outW, height: outH, data: out };
}

/** Kotak terkecil yang memuat seluruh piksel dengan alpha di atas `threshold`. */
export function opaqueBounds(img, threshold = 8) {
  const { width, height, data } = img;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > threshold) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/** Potong menurut kotak. */
export function crop(img, box) {
  const out = new Uint8Array(box.width * box.height * 4);
  for (let y = 0; y < box.height; y++) {
    const src = ((box.minY + y) * img.width + box.minX) * 4;
    out.set(img.data.subarray(src, src + box.width * 4), y * box.width * 4);
  }
  return { width: box.width, height: box.height, data: out };
}

/** Kanvas kosong, boleh diisi warna hex. */
export function canvas(width, height, hex = null) {
  const data = new Uint8Array(width * height * 4);
  if (hex) {
    const { r, g, b } = parseHex(hex);
    for (let i = 0; i < width * height; i++) {
      const p = i * 4;
      data[p] = r;
      data[p + 1] = g;
      data[p + 2] = b;
      data[p + 3] = 255;
    }
  }
  return { width, height, data };
}

export function parseHex(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/** Tempel `src` ke `dst` di (dx,dy), dicampur menurut alpha. */
export function composite(dst, src, dx, dy) {
  for (let y = 0; y < src.height; y++) {
    const ty = dy + y;
    if (ty < 0 || ty >= dst.height) continue;
    for (let x = 0; x < src.width; x++) {
      const tx = dx + x;
      if (tx < 0 || tx >= dst.width) continue;
      const s = (y * src.width + x) * 4;
      const d = (ty * dst.width + tx) * 4;
      const sa = src.data[s + 3] / 255;
      if (sa === 0) continue;
      const da = dst.data[d + 3] / 255;
      const outA = sa + da * (1 - sa);
      for (let c = 0; c < 3; c++) {
        dst.data[d + c] = Math.round(
          (src.data[s + c] * sa + dst.data[d + c] * da * (1 - sa)) / outA,
        );
      }
      dst.data[d + 3] = Math.round(outA * 255);
    }
  }
  return dst;
}

/** Ganti warna semua piksel terlihat, alpha dipertahankan (untuk versi putih). */
export function tint(img, hex) {
  const { r, g, b } = parseHex(hex);
  const out = new Uint8Array(img.data.length);
  for (let i = 0; i < img.width * img.height; i++) {
    const p = i * 4;
    out[p] = r;
    out[p + 1] = g;
    out[p + 2] = b;
    out[p + 3] = img.data[p + 3];
  }
  return { width: img.width, height: img.height, data: out };
}

/**
 * Radius terjauh piksel terlihat dari titik pusat gambar.
 *
 * Ini ukuran yang benar untuk menilai risiko terpotong pada ikon adaptif
 * Android — bukan sudut kotak pembatas, karena logo berbentuk perisai tidak
 * mengisi sudut kotaknya.
 */
export function maxOpaqueRadius(img, threshold = 8) {
  const cx = (img.width - 1) / 2;
  const cy = (img.height - 1) / 2;
  let max = 0;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (img.data[(y * img.width + x) * 4 + 3] > threshold) {
        const d = Math.hypot(x - cx, y - cy);
        if (d > max) max = d;
      }
    }
  }
  return max;
}

/** Berapa banyak piksel terlihat yang jatuh di luar lingkaran `radius`. */
export function opaqueOutsideCircle(img, radius, threshold = 8) {
  const cx = (img.width - 1) / 2;
  const cy = (img.height - 1) / 2;
  let outside = 0;
  let total = 0;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (img.data[(y * img.width + x) * 4 + 3] > threshold) {
        total++;
        if (Math.hypot(x - cx, y - cy) > radius) outside++;
      }
    }
  }
  return { outside, total, ratio: total ? outside / total : 0 };
}
