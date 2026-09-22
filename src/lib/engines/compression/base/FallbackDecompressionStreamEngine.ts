import DecompressionStreamEngine from './DecompressionStreamEngine.ts'

export default abstract class FallbackDecompressionStreamEngine extends DecompressionStreamEngine {
  override async decode(input: Uint8Array) {
    try {
      return await super.decode(input)
    } catch {
      return this.decodeFallback(input)
    }
  }

  protected abstract decodeFallback(input: Uint8Array): Promise<Uint8Array> | Uint8Array
}
