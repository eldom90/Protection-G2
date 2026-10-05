// Enkripcija poruka pomocu tweetnacl (XSalsa20-Poly1305, "secretbox").
// Radi i bez HTTPS-a, sto je bitno jer se aplikacija tokom razvoja
// ucitava preko lokalne mreze (http://192.168.x.x).
//
// VAZNO: ovo je DEMO. Kljuc se pravi nasumicno pri svakom pokretanju i
// "dijele" ga obje strane unutar iste aplikacije. U pravom proizvodu
// razmjena kljuceva ide preko provjerenog protokola (npr. Signal protokol).
import nacl from 'tweetnacl';

const key = nacl.randomBytes(nacl.secretbox.keyLength);
const enc = new TextEncoder();
const dec = new TextDecoder();

/** Poravnava duzinu poruke na blokove od 32 bajta, da duzina sifre ne otkriva duzinu teksta. */
const PAD_BLOCK = 32;

function pad(bytes: Uint8Array): Uint8Array {
  const total = Math.ceil((bytes.length + 2) / PAD_BLOCK) * PAD_BLOCK;
  const out = new Uint8Array(total);
  out[0] = bytes.length >> 8;
  out[1] = bytes.length & 0xff;
  out.set(bytes, 2);
  out.set(nacl.randomBytes(total - 2 - bytes.length), 2 + bytes.length);
  return out;
}

function unpad(bytes: Uint8Array): Uint8Array {
  const len = (bytes[0] << 8) | bytes[1];
  return bytes.slice(2, 2 + len);
}

function toB64(u: Uint8Array): string {
  let s = '';
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return btoa(s);
}

function fromB64(b: string): Uint8Array {
  const s = atob(b);
  const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return u;
}

/** Sifruje tekst. Vraca base64 (nonce + sifrat). */
export function seal(text: string): string {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const box = nacl.secretbox(pad(enc.encode(text)), nonce, key);
  const all = new Uint8Array(nonce.length + box.length);
  all.set(nonce, 0);
  all.set(box, nonce.length);
  return toB64(all);
}

/** Desifruje poruku. Vraca null ako je poruka ostecena ili kljuc ne odgovara. */
export function open(sealed: string): string | null {
  try {
    const all = fromB64(sealed);
    const nonce = all.slice(0, nacl.secretbox.nonceLength);
    const box = all.slice(nacl.secretbox.nonceLength);
    const plain = nacl.secretbox.open(box, nonce, key);
    return plain ? dec.decode(unpad(plain)) : null;
  } catch {
    return null;
  }
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Nasumicni znakovi za prikaz na telefonu. Duzina je zaokruzena na blokove od 16. */
export function noise(textLength: number): string {
  if (textLength === 0) return '';
  const n = Math.ceil(textLength / 16) * 16;
  const r = nacl.randomBytes(n);
  let out = '';
  for (let i = 0; i < n; i++) out += B64[r[i] % 64];
  return out;
}

/** Fisher-Yates mijesanje sa kriptografski sigurnim brojevima. */
export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const r = nacl.randomBytes(4);
    const j = (((r[0] << 24) | (r[1] << 16) | (r[2] << 8) | r[3]) >>> 0) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
