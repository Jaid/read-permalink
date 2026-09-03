import {compressionEngines} from './compression/index.ts'
import {encodingEngines} from './encoding/index.ts'
import {serializationEngines} from './serialization/index.ts'

export const allEngines = [
  ...compressionEngines,
  ...encodingEngines,
  ...serializationEngines,
]

export default allEngines
