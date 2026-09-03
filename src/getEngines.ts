import type {EngineSet} from '#src/lib/engines/EngineSet.ts'

import {compressionEngines, defaultCompressionEngine} from '#src/lib/engines/compression/index.ts'
import {defaultEncodingEngine, encodingEngines} from '#src/lib/engines/encoding/index.ts'
import {allEngines} from '#src/lib/engines/index.ts'
import {defaultSerializationEngine, serializationEngines} from '#src/lib/engines/serialization/index.ts'

const normalizeToken = (input: string) => input.trim().toLowerCase()
export const isEngineDescriptor = (input: string) => {
  const tokens = input.split(';').map(normalizeToken).filter(Boolean)
  return tokens.length > 0 && tokens.every(token => allEngines.some(engine => engine.matches(token)))
}
const getEngines = (input: string = ''): EngineSet => {
  let compression: EngineSet['compression'] = defaultCompressionEngine
  let encoding: EngineSet['encoding'] = defaultEncodingEngine
  let serialization: EngineSet['serialization'] = defaultSerializationEngine
  let explicitCompression: EngineSet['compression'] | undefined
  let explicitEncoding: EngineSet['encoding'] | undefined
  let explicitSerialization: EngineSet['serialization'] | undefined
  for (const rawToken of input.split(';')) {
    const token = normalizeToken(rawToken)
    if (!token) {
      continue
    }
    const compressionMatch = compressionEngines.find(engine => engine.matches(token))
    if (compressionMatch) {
      if (explicitCompression && explicitCompression !== compressionMatch) {
        throw new TypeError(`Conflicting compression engines in permalink descriptor: ${input}`)
      }
      explicitCompression = compressionMatch
      compression = compressionMatch
      continue
    }
    const encodingMatch = encodingEngines.find(engine => engine.matches(token))
    if (encodingMatch) {
      if (explicitEncoding && explicitEncoding !== encodingMatch) {
        throw new TypeError(`Conflicting encoding engines in permalink descriptor: ${input}`)
      }
      explicitEncoding = encodingMatch
      encoding = encodingMatch
      continue
    }
    const serializationMatch = serializationEngines.find(engine => engine.matches(token))
    if (serializationMatch) {
      if (explicitSerialization && explicitSerialization !== serializationMatch) {
        throw new TypeError(`Conflicting serialization engines in permalink descriptor: ${input}`)
      }
      explicitSerialization = serializationMatch
      serialization = serializationMatch
      continue
    }
    throw new TypeError(`Unsupported permalink engine: ${rawToken.trim()}`)
  }
  return {
    compression,
    encoding,
    serialization,
  }
}

export default getEngines
