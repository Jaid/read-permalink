import FallbackDecompressionStreamEngine from './base/FallbackDecompressionStreamEngine.ts'

export default class ZstdEngine extends FallbackDecompressionStreamEngine {
  readonly aliases = new Set(['z', 'zst', 'zstd', 'zstandard'])
  readonly format = 'zstd'

  protected async decodeFallback(input: Uint8Array) {
    const {default: decodeZstd} = await import('decode-zstd')
    return decodeZstd(input)
  }
}
