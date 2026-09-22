import FallbackDecompressionStreamEngine from './base/FallbackDecompressionStreamEngine.ts'

export default class BrotliEngine extends FallbackDecompressionStreamEngine {
  readonly aliases = new Set(['b', 'br', 'brotli'])
  readonly format = 'brotli'

  protected async decodeFallback(input: Uint8Array) {
    const {default: decodeBrotli} = await import('decode-brotli')
    return decodeBrotli(input)
  }
}
