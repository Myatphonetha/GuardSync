/**
 * BLE notify values arrive as base64. This turns them into the UTF-8 CSV line
 * the Argon firmware prints.
 */
export function decodeBleCharacteristicValue(b64: string): string {
  try {
    if (typeof globalThis.atob === 'function') {
      return globalThis.atob(b64);
    }
  } catch {
    /* fall through */
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Buffer } = require('buffer') as typeof import('buffer');
    return Buffer.from(b64, 'base64').toString('utf8');
  } catch {
    return '';
  }
}
