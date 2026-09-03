import SerializationEngine from './base/SerializationEngine.ts'

export default class YamlEngine extends SerializationEngine {
  readonly aliases = new Set(['application/yaml', 'y', 'yaml'])

  decode(_input: Uint8Array): unknown {
    throw new Error('YAML deserialization is not implemented yet.')
  }
}
