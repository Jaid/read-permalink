import type CompressionEngine from './compression/base/CompressionEngine.ts'
import type EncodingEngine from './encoding/base/EncodingEngine.ts'
import type SerializationEngine from './serialization/base/SerializationEngine.ts'

export type EngineSet = {
  compression: CompressionEngine
  encoding: EncodingEngine
  serialization: SerializationEngine
}
