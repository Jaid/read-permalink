import BrotliEngine from './BrotliEngine.ts'
import GzipEngine from './GzipEngine.ts'
import LzmaEngine from './LzmaEngine.ts'
import UncompressedEngine from './UncompressedEngine.ts'

export const defaultCompressionEngine = new UncompressedEngine
export const compressionEngines = [
  defaultCompressionEngine,
  new BrotliEngine,
  new GzipEngine,
  new LzmaEngine,
]

export default compressionEngines
