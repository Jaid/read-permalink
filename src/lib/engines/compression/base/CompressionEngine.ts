import Engine from '../../base/Engine.ts'

export default abstract class CompressionEngine extends Engine {
  abstract decode(input: Uint8Array): Promise<Uint8Array> | Uint8Array
}
