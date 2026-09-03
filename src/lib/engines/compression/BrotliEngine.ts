import CompressionEngine from './base/CompressionEngine.ts'

export default class BrotliEngine extends CompressionEngine {
  readonly aliases = new Set(['b', 'br', 'brotli'])

  async decode(input: Uint8Array) {
    const stream = new DecompressionStream('brotli')
    const output = new Response(stream.readable).arrayBuffer()
    const writer = stream.writable.getWriter()
    await writer.write(Uint8Array.from(input))
    await writer.close()
    return new Uint8Array(await output)
  }
}
