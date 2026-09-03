import CompressionEngine from './base/CompressionEngine.ts'

export default class UncompressedEngine extends CompressionEngine {
  readonly aliases = new Set(['u', 'uncompressed'])

  decode(input: Uint8Array) {
    return input
  }
}
