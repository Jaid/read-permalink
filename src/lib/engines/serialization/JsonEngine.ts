import SerializationEngine from './base/SerializationEngine.ts'

const textDecoder = new TextDecoder

export default class JsonEngine extends SerializationEngine {
  readonly aliases = new Set([
    'application/json',
    'j',
    'json',
  ])

  decode(input: Uint8Array) {
    return JSON.parse(textDecoder.decode(input)) as unknown
  }
}
