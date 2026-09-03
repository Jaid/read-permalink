import JsonEngine from './JsonEngine.ts'
import YamlEngine from './YamlEngine.ts'

export const defaultSerializationEngine = new JsonEngine
export const serializationEngines = [
  defaultSerializationEngine,
  new YamlEngine,
]

export default serializationEngines
