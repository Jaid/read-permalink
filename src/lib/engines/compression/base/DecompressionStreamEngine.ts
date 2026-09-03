import CompressionEngine from './CompressionEngine.ts'

export default abstract class DecompressionStreamEngine extends CompressionEngine {
  abstract readonly format: ConstructorParameters<typeof DecompressionStream>[0]

  async decode(input: Uint8Array) {
    const stream = new DecompressionStream(this.format)
    const output = new Response(stream.readable).arrayBuffer()
    const writer = stream.writable.getWriter()
    await writer.write(Uint8Array.from(input))
    await writer.close()
    return new Uint8Array(await output)
  }
}
