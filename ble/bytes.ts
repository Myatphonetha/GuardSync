/**
 * A Bluetooth value arrives as base64 text. This turns it back into bytes
 * so protocol.ts can read the chip's little-endian numbers.
 *
 * Called by: stream.ts
 */
export function base64ToBytes(b64: string): Uint8Array {
  const binary = base64ToBinary(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i) & 0xff;
  }
  return out;
}

function base64ToBinary(b64: string): string {
  try {
    if (typeof globalThis.atob === 'function') {
      return globalThis.atob(b64);
    }
  } catch {
    /* try Buffer next */
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Buffer } = require('buffer') as typeof import('buffer');
    return Buffer.from(b64, 'base64').toString('latin1');
  } catch {
    return '';
  }
}
