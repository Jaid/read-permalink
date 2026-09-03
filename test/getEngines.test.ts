import {expect, test} from 'bun:test'

import getEngines, {isEngineDescriptor} from '#src/getEngines.ts'
import {compressionEngines, defaultCompressionEngine} from '#src/lib/engines/compression/index.ts'
import {defaultEncodingEngine} from '#src/lib/engines/encoding/index.ts'
import {defaultSerializationEngine, serializationEngines} from '#src/lib/engines/serialization/index.ts'

test('uses default engine instances when omitted', () => {
  expect(getEngines()).toEqual({
    compression: defaultCompressionEngine,
    encoding: defaultEncodingEngine,
    serialization: defaultSerializationEngine,
  })
})
test('resolves aliases to registered engines', () => {
  for (const descriptor of ['j', 'json', 'application/json', 'json;base64', 'application/json;base64']) {
    const engines = getEngines(descriptor)
    expect(engines.serialization).toBe(defaultSerializationEngine)
    expect(engines.encoding).toBe(defaultEncodingEngine)
    expect(engines.compression).toBe(defaultCompressionEngine)
  }
  const brotliEngine = compressionEngines.find(engine => engine.matches('brotli'))
  if (!brotliEngine) {
    throw new Error('Brotli engine is not registered.')
  }
  for (const descriptor of ['b', 'br', 'brotli', 'j;b', 'json;brotli;base64']) {
    expect(getEngines(descriptor).compression).toBe(brotliEngine)
  }
  const lzmaEngine = compressionEngines.find(engine => engine.matches('lzma'))
  const yamlEngine = serializationEngines.find(engine => engine.matches('yaml'))
  if (!lzmaEngine || !yamlEngine) {
    throw new Error('Expected LZMA and YAML engines to be registered.')
  }
  for (const descriptor of ['l', 'lzma', 'j;l', 'application/json;lzma;base64']) {
    expect(getEngines(descriptor).compression).toBe(lzmaEngine)
  }
  for (const descriptor of ['y', 'yaml', 'application/yaml', 'y;l', 'application/yaml;lzma;base64']) {
    expect(getEngines(descriptor).serialization).toBe(yamlEngine)
  }
})
test('normalizes whitespace and casing', () => {
  expect(getEngines(' Application/JSON ; BROTLI ; BASE64 ').compression.matches('brotli')).toBeTrue()
})
test('recognizes complete descriptors', () => {
  expect(isEngineDescriptor('application/json;br;base64')).toBeTrue()
  expect(isEngineDescriptor('j')).toBeTrue()
  expect(isEngineDescriptor('')).toBeFalse()
  expect(isEngineDescriptor('json;lzma;base64')).toBeTrue()
  expect(isEngineDescriptor('application/yaml;lzma;base64')).toBeTrue()
})
test('throws when unimplemented engines are used', async () => {
  const lzma = getEngines('l').compression
  const yaml = getEngines('y').serialization
  expect(() => lzma.decode(new Uint8Array)).toThrow('LZMA decompression is not implemented yet.')
  expect(() => yaml.decode(new Uint8Array)).toThrow('YAML deserialization is not implemented yet.')
})
test('rejects unsupported engines', () => {
  expect(() => getEngines('msgpack')).toThrow(TypeError)
})
test('rejects conflicting compression engines', () => {
  expect(() => getEngines('brotli;uncompressed')).toThrow(TypeError)
})
