import decodeZstd from 'decode-zstd'

import DecompressionStreamEngine from './base/DecompressionStreamEngine.ts'

export default class ZstdEngine extends DecompressionStreamEngine {
  readonly aliases = new Set(['z', 'zst', 'zstd', 'zstandard'])
  readonly format = 'zstd'

  decode(input: Uint8Array) {
    return decodeZstd(input)
  }
}
