import CompressionEngine from './CompressionEngine.ts'

export default abstract class DecompressionStreamEngine extends CompressionEngine {
  abstract readonly format: ConstructorParameters<typeof DecompressionStream>[0]

  override async decodeAsync(input: Uint8Array) {
    try {
      const stream = new DecompressionStream(this.format)
      const response = new Response(stream.readable)
      const output = response.arrayBuffer()
      const writer = stream.writable.getWriter()
      await writer.write(Uint8Array.from(input))
      await writer.close()
      return new Uint8Array(await output)
    } catch {
      return this.decode(input)
    }
  }
}
