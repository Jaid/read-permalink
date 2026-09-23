import {expect, test} from 'bun:test'
import {Buffer} from 'node:buffer'
import {brotliCompressSync, gzipSync} from 'node:zlib'

import readPermalink, {State} from '#src/main.ts'

const encode = (value: unknown, encoding: BufferEncoding = 'base64url') => {
  return Buffer.from(JSON.stringify(value)).toString(encoding)
}
const encodeBytes = (value: Uint8Array) => value.toBase64({
  alphabet: 'base64url',
  omitPadding: true,
})
test('State applies patches, queries and fragments', () => {
  const queryPayload = encode({
    fromQuery: true,
    override: 'query',
  })
  const fragmentPayload = encode({
    fromFragment: true,
    override: 'fragment',
  })
  const state = new State
  expect(state.apply({
    initial: true,
    override: 'initial',
  })).toBe(state)
  expect(state.applyQuery(`?named=value&data=${queryPayload}`)).toBe(state)
  expect(state.applyFragment(`#data:j=${fragmentPayload}`)).toBe(state)
  expect(state.value).toEqual({
    initial: true,
    override: 'fragment',
    named: 'value',
    fromQuery: true,
    fromFragment: true,
  })
  expect(Object.getPrototypeOf(state.value)).toBe(Object.prototype)
})
test('sync option controls the return type and runtime mode', async () => {
  const syncResult: Record<string, unknown> = readPermalink('https://example.com?a=1')
  const asyncResult: Promise<Record<string, unknown>> = readPermalink('https://example.com?a=1', {sync: false})
  expect(syncResult).toEqual({a: '1'})
  expect(syncResult instanceof Promise).toBeFalse()
  expect(asyncResult).toBeInstanceOf(Promise)
  expect(await asyncResult).toEqual({a: '1'})
})
test('format option controls plain versus State results', async () => {
  const syncState = readPermalink('https://example.com?a=1', {
    format: 'state',
  })
  const asyncState = await readPermalink('https://example.com?a=1', {
    format: 'state',
    sync: false,
  })
  expect(syncState).toBeInstanceOf(State)
  expect(syncState.value).toEqual({a: '1'})
  expect(asyncState).toBeInstanceOf(State)
  expect(asyncState.value).toEqual({a: '1'})
  expect(readPermalink('https://example.com?a=1', {
    format: 'plain',
  })).toEqual({a: '1'})
  expect(await readPermalink('https://example.com?a=1', {
    format: 'plain',
    sync: false,
  })).toEqual({a: '1'})
})
test('State tracks literal and consumed input', () => {
  const payload = encode({fromFragment: true})
  const input = `https://example.com/path?a=1#data:j=${payload}`
  const state = readPermalink(input, {
    format: 'state',
    sync: true,
  })
  expect(state.getInput()).toBe(input)
  expect(state.getConsumedInput()).toBe('https://example.com/path')
})
test('disabled fragments remain in consumed input', () => {
  const payload = encode({ignored: true})
  const input = `https://example.com/path?a=1#data:j=${payload}`
  const state = readPermalink(input, {
    format: 'state',
    fragment: false,
    sync: true,
  })
  expect(state.value).toEqual({a: '1'})
  expect(state.getConsumedInput()).toBe(`https://example.com/path#data:j=${payload}`)
})
test('unrelated fragments remain in consumed input', () => {
  const input = '?a=1#section'
  const state = readPermalink(input, {
    format: 'state',
    sync: true,
  })
  expect(state.getInput()).toBe(input)
  expect(state.getConsumedInput()).toBe('#section')
})
test('supports custom packed-state keys', async () => {
  const queryPayload = encode({
    fromQuery: true,
    override: 'query',
  })
  const fragmentPayload = encode({
    fromFragment: true,
    override: 'fragment',
  })
  const url = `https://example.com?packed=${queryPayload}&data=plain#packed:j=${fragmentPayload}`
  const sourceOptions = {
    fragment: 'packed',
    query: 'packed',
  } as const
  const expected = {
    data: 'plain',
    fromFragment: true,
    fromQuery: true,
    override: 'fragment',
  }
  expect(readPermalink(url, {
    ...sourceOptions,
    sync: true,
  })).toEqual(expected)
  expect(await readPermalink(url, {
    ...sourceOptions,
    sync: false,
  })).toEqual(expected)
})
test('can disable packed-state query and fragment handling', async () => {
  const fragmentPayload = encode({ignored: true})
  const url = `https://example.com?data=literal&a=1#data:j=${fragmentPayload}`
  const sourceOptions = {
    fragment: false,
    query: false,
  } as const
  const expected = {
    a: '1',
    data: 'literal',
  }
  expect(readPermalink(url, {
    ...sourceOptions,
    sync: true,
  })).toEqual(expected)
  expect(await readPermalink(url, {
    ...sourceOptions,
    sync: false,
  })).toEqual(expected)
})
test('reads named query parameters as strings synchronously', () => {
  expect(readPermalink('https://example.com?a=1&b=hello+world&empty=', {sync: true})).toEqual({
    a: '1',
    b: 'hello world',
    empty: '',
  })
})
test('reads an unprefixed JSON Base64 data payload synchronously', () => {
  const payload = encode({
    a: 1,
    enabled: true,
    nested: {value: 'x'},
  })
  expect(readPermalink(`https://example.com?data=${payload}`)).toEqual({
    a: 1,
    enabled: true,
    nested: {value: 'x'},
  })
})
test('accepts JSON descriptor aliases synchronously', () => {
  const payload = encode({a: 1})
  for (const descriptor of ['j', 'json', 'json;base64', 'application/json', 'application/json;base64']) {
    expect(readPermalink(`https://example.com?data=${descriptor}=${payload}`, {sync: true})).toEqual({a: 1})
  }
})
test('synchronously decodes Brotli payloads', () => {
  const payload = encodeBytes(brotliCompressSync(Buffer.from(JSON.stringify({
    compressed: true,
    format: 'brotli',
  }))))
  expect(readPermalink(`https://example.com?data=j;br;base64=${payload}`, {sync: true})).toEqual({
    compressed: true,
    format: 'brotli',
  })
})
test('synchronously decodes gzip payloads', () => {
  const payload = encodeBytes(gzipSync(Buffer.from(JSON.stringify({
    compressed: true,
    format: 'gzip',
  }))))
  expect(readPermalink(`https://example.com?data=j;gz;base64=${payload}`, {sync: true})).toEqual({
    compressed: true,
    format: 'gzip',
  })
})
test('synchronously decodes zstd payloads', () => {
  const payload = encodeBytes(Bun.zstdCompressSync(Buffer.from(JSON.stringify({
    compressed: true,
    format: 'zstd',
  }))))
  expect(readPermalink(`https://example.com?data=j;zstd;base64=${payload}`, {sync: true})).toEqual({
    compressed: true,
    format: 'zstd',
  })
})
test('explicit async mode decodes compressed payloads', async () => {
  const brotliPayload = encodeBytes(brotliCompressSync(Buffer.from(JSON.stringify({format: 'brotli'}))))
  const gzipPayload = encodeBytes(gzipSync(Buffer.from(JSON.stringify({format: 'gzip'}))))
  const zstdPayload = encodeBytes(Bun.zstdCompressSync(Buffer.from(JSON.stringify({format: 'zstd'}))))
  expect(await readPermalink(`https://example.com?data=j;br;base64=${brotliPayload}`, {sync: false})).toEqual({format: 'brotli'})
  expect(await readPermalink(`https://example.com?data=j;gz;base64=${gzipPayload}`, {sync: false})).toEqual({format: 'gzip'})
  expect(await readPermalink(`https://example.com?data=j;zstd;base64=${zstdPayload}`, {sync: false})).toEqual({format: 'zstd'})
})
test('explicit async mode falls back to synchronous decoders when native decompression fails', async () => {
  const brotliPayload = encodeBytes(brotliCompressSync(Buffer.from(JSON.stringify({fallback: 'brotli'}))))
  const gzipPayload = encodeBytes(gzipSync(Buffer.from(JSON.stringify({fallback: 'gzip'}))))
  const zstdPayload = encodeBytes(Bun.zstdCompressSync(Buffer.from(JSON.stringify({fallback: 'zstd'}))))
  const nativeDecompressionStream = Object.getOwnPropertyDescriptor(globalThis, 'DecompressionStream')
  Object.defineProperty(globalThis, 'DecompressionStream', {
    configurable: true,
    value: class {
      constructor() {
        throw new Error('Native decompression unavailable.')
      }
    },
  })
  try {
    expect(await readPermalink(`https://example.com?data=j;br;base64=${brotliPayload}`, {sync: false})).toEqual({fallback: 'brotli'})
    expect(await readPermalink(`https://example.com?data=j;gz;base64=${gzipPayload}`, {sync: false})).toEqual({fallback: 'gzip'})
    expect(await readPermalink(`https://example.com?data=j;zstd;base64=${zstdPayload}`, {sync: false})).toEqual({fallback: 'zstd'})
  } finally {
    if (nativeDecompressionStream) {
      Object.defineProperty(globalThis, 'DecompressionStream', nativeDecompressionStream)
    } else {
      delete (globalThis as {DecompressionStream?: unknown}).DecompressionStream
    }
  }
})
test('preserves literal plus signs in standard Base64 data', () => {
  const payload = encode({value: '¾'}, 'base64')
  expect(payload).toContain('+')
  expect(readPermalink(`https://example.com?data=${payload}`, {sync: true})).toEqual({value: '¾'})
})
test('applies query entries from left to right', () => {
  const payload = encode({
    a: 'packed',
    b: 'packed',
    packedOnly: true,
  })
  expect(readPermalink(`https://example.com?a=before&data=${payload}&b=after`, {sync: true})).toEqual({
    a: 'packed',
    b: 'after',
    packedOnly: true,
  })
  expect(readPermalink(`https://example.com?data=${payload}&a=after`, {sync: true})).toEqual({
    a: 'after',
    b: 'packed',
    packedOnly: true,
  })
})
test('later duplicate named parameters override earlier ones', () => {
  expect(readPermalink('https://example.com?a=1&a=2', {sync: true})).toEqual({a: '2'})
})
test('hash data overrides all query state', () => {
  const queryPayload = encode({
    a: 'query-data',
    b: 'query-data',
  })
  const hashPayload = encode({
    a: 'hash-data',
    c: 3,
  })
  expect(readPermalink(`https://example.com?a=query&data=${queryPayload}&b=named#data:j=${hashPayload}`, {sync: true})).toEqual({
    a: 'hash-data',
    b: 'named',
    c: 3,
  })
})
test('ignores unrelated hashes', () => {
  expect(readPermalink('https://example.com?a=1#section', {sync: true})).toEqual({a: '1'})
})
test('accepts relative URLs and URL instances', () => {
  expect(readPermalink('?a=1', {sync: true})).toEqual({a: '1'})
  expect(readPermalink(new URL('https://example.com/?a=2'), {sync: true})).toEqual({a: '2'})
})
test('rejects non-object JSON data payloads synchronously', () => {
  expect(() => readPermalink(`https://example.com?data=${encode([1, 2, 3])}`, {sync: true})).toThrow(TypeError)
  expect(() => readPermalink(`https://example.com?data=${encode('value')}`, {sync: true})).toThrow(TypeError)
  expect(() => readPermalink(`https://example.com?data=${encode(null)}`, {sync: true})).toThrow(TypeError)
})
test('does not allow URL state to mutate the result prototype', () => {
  const payload = encodeBytes(Buffer.from('{"__proto__":{"polluted":true},"safe":1}'))
  const result = readPermalink(`https://example.com?__proto__=named&data=${payload}`, {sync: true})
  expect(Object.getPrototypeOf(result)).toBe(Object.prototype)
  expect(Object.hasOwn(result, '__proto__')).toBeTrue()
  expect(result.__proto__).toEqual({polluted: true})
  expect(result.safe).toBe(1)
})
