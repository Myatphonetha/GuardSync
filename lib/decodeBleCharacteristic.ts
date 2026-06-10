/** Decode react-native-ble-plx base64 characteristic value to UTF-8 text. */
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
