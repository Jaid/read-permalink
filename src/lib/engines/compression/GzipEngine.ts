import DecompressionStreamEngine from './base/DecompressionStreamEngine.ts'

export default class GzipEngine extends DecompressionStreamEngine {
  readonly aliases = new Set(['g', 'gz', 'gzip'])
  readonly format = 'gzip'
}
