// Minimal .xlsx reader (no dependencies): returns { sheets: [{ name, rows: [{ A: 'text', B: '…' }] }] }.
// Reads shared strings, inline strings and plain values; formulas give their cached value.
import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

function unzip(buf) {
  // End of central directory: last 22+ bytes, signature 0x06054b50.
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error('not a zip/xlsx file');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = {};
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('bad zip directory');
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(start, start + size);
    files[name] = () => (method === 0 ? raw : inflateRawSync(raw));
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

const unescape = (s) =>
  s.replace(/&(lt|gt|amp|quot|apos|#(\d+)|#x([0-9a-f]+));/gi, (m, n, d, h) =>
    d ? String.fromCodePoint(+d) : h ? String.fromCodePoint(parseInt(h, 16)) : { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" }[n]);

const texts = (xml) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => unescape(m[1])).join('');

export function readXlsx(file) {
  const files = unzip(readFileSync(file));
  const read = (n) => (files[n] ? files[n]().toString('utf8') : '');
  const shared = [...read('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => texts(m[1]));

  const rels = Object.fromEntries(
    [...read('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\s[^>]*?Id="([^"]+)"[^>]*?Target="([^"]+)"/g)].map((m) => [m[1], m[2]]));
  const sheets = [...read('xl/workbook.xml').matchAll(/<sheet\s[^>]*?name="([^"]+)"[^>]*?r:id="([^"]+)"/g)].map((m) => {
    const target = rels[m[2]].replace(/^\/?(xl\/)?/, 'xl/');
    const xml = read(target);
    const rows = [...xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)].map((r) => {
      const row = {};
      for (const c of r[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const ref = (c[1].match(/\br="([A-Z]+)\d+"/) || [])[1];
        const type = (c[1].match(/\bt="(\w+)"/) || [])[1];
        const body = c[2] || '';
        const v = (body.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
        let val = '';
        if (type === 's' && v != null) val = shared[+v] ?? '';
        else if (type === 'inlineStr') val = texts(body);
        else if (v != null) val = unescape(v);
        if (ref && val !== '') row[ref] = val;
      }
      return row;
    });
    return { name: unescape(m[1]), rows };
  });
  return { sheets };
}
