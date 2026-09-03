import CompressionEngine from './base/CompressionEngine.ts'

export default class LzmaEngine extends CompressionEngine {
  readonly aliases = new Set(['l', 'lzma'])

  decode(_input: Uint8Array): Uint8Array {
    throw new Error('LZMA decompression is not implemented yet.')
  }
}
