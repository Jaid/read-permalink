import Engine from '../../base/Engine.ts'

export default abstract class SerializationEngine extends Engine {
  abstract decode(input: Uint8Array): unknown
}
