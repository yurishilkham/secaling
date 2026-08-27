// Membaca tabel `name` dari file TTF untuk memastikan nama fontFamily yang benar.
// Ini penting karena iOS memakai nama internal font (bukan nama file),
// sementara Android memakai nama file. Jalankan: node scripts/font-names.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'assets/fonts';
const WANTED = {
  1: 'Family(1)',
  2: 'Subfamily(2)',
  4: 'FullName(4)',
  6: 'PostScript(6)',
  16: 'TypoFamily(16)',
  17: 'TypoSubfamily(17)',
};

function readNames(file) {
  const b = readFileSync(file);
  const numTables = b.readUInt16BE(4);

  let nameOffset = 0;
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    if (b.toString('ascii', rec, rec + 4) === 'name') {
      nameOffset = b.readUInt32BE(rec + 8);
      break;
    }
  }
  if (!nameOffset) return {};

  const count = b.readUInt16BE(nameOffset + 2);
  const stringOffset = nameOffset + b.readUInt16BE(nameOffset + 4);

  const out = {};
  for (let i = 0; i < count; i++) {
    const rec = nameOffset + 6 + i * 12;
    const platformId = b.readUInt16BE(rec);
    const nameId = b.readUInt16BE(rec + 6);
    const length = b.readUInt16BE(rec + 8);
    const offset = b.readUInt16BE(rec + 10);
    if (!(nameId in WANTED) || nameId in out) continue;
    const start = stringOffset + offset;
    const raw = b.subarray(start, start + length);
    out[nameId] = platformId === 3 ? raw.toString('utf16le').replace(/\0/g, '') : raw.toString('latin1');
  }

  // platformId 3 adalah UTF-16BE, bukan LE — perbaiki dengan swap byte
  for (const [k, v] of Object.entries(out)) {
    if (/\u0000/.test(v)) out[k] = v.replace(/\u0000/g, '');
  }
  return out;
}

function readNamesBE(file) {
  const b = readFileSync(file);
  const numTables = b.readUInt16BE(4);
  let nameOffset = 0;
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    if (b.toString('ascii', rec, rec + 4) === 'name') {
      nameOffset = b.readUInt32BE(rec + 8);
      break;
    }
  }
  if (!nameOffset) return {};
  const count = b.readUInt16BE(nameOffset + 2);
  const stringOffset = nameOffset + b.readUInt16BE(nameOffset + 4);
  const out = {};
  for (let i = 0; i < count; i++) {
    const rec = nameOffset + 6 + i * 12;
    const platformId = b.readUInt16BE(rec);
    const nameId = b.readUInt16BE(rec + 6);
    const length = b.readUInt16BE(rec + 8);
    const offset = b.readUInt16BE(rec + 10);
    if (!(nameId in WANTED) || nameId in out) continue;
    const start = stringOffset + offset;
    let s = '';
    if (platformId === 3) {
      for (let j = 0; j < length; j += 2) s += String.fromCharCode(b.readUInt16BE(start + j));
    } else {
      s = b.toString('latin1', start, start + length);
    }
    out[nameId] = s;
  }
  return out;
}

const files = readdirSync(DIR).filter((f) => f.endsWith('.ttf')).sort();
for (const f of files) {
  const names = readNamesBE(join(DIR, f));
  console.log(`\n== ${f}`);
  for (const id of Object.keys(WANTED)) {
    if (names[id]) console.log(`   ${WANTED[id].padEnd(18)} ${names[id]}`);
  }
}
console.log('');
