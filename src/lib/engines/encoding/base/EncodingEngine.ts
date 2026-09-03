import Engine from '../../base/Engine.ts'

export default abstract class EncodingEngine extends Engine {
  abstract decode(input: string): Uint8Array
}
