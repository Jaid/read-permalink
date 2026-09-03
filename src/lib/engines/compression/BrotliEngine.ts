import DecompressionStreamEngine from './base/DecompressionStreamEngine.ts'

export default class BrotliEngine extends DecompressionStreamEngine {
  readonly aliases = new Set(['b', 'br', 'brotli'])
  readonly format = 'brotli'
}
