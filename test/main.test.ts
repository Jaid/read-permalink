import {expect, test} from 'bun:test'
import {Buffer} from 'node:buffer'
import {brotliCompressSync, gzipSync} from 'node:zlib'

import readPermalink from '#src/main.ts'

const encode = (value: unknown, encoding: BufferEncoding = 'base64url') => {
  return Buffer.from(JSON.stringify(value)).toString(encoding)
}
test('reads named query parameters as strings', async () => {
  expect(await readPermalink('https://example.com?a=1&b=hello+world&empty=')).toEqual({
    a: '1',
    b: 'hello world',
    empty: '',
  })
})
test('reads an unprefixed JSON Base64 data payload', async () => {
  const payload = encode({
    a: 1,
    enabled: true,
    nested: {value: 'x'},
  })
  expect(await readPermalink(`https://example.com?data=${payload}`)).toEqual({
    a: 1,
    enabled: true,
    nested: {value: 'x'},
  })
})
test('accepts JSON descriptor aliases', async () => {
  const payload = encode({a: 1})
  for (const descriptor of ['j', 'json', 'json;base64', 'application/json', 'application/json;base64']) {
    expect(await readPermalink(`https://example.com?data=${descriptor}=${payload}`)).toEqual({a: 1})
  }
})
test('decodes Brotli payloads through DecompressionStream', async () => {
  const payload = Buffer.from(brotliCompressSync(Buffer.from(JSON.stringify({
    compressed: true,
    nested: {value: 42},
  })))).toString('base64url')
  expect(await readPermalink(`https://example.com?data=j;br;base64=${payload}`)).toEqual({
    compressed: true,
    nested: {value: 42},
  })
})
test('decodes gzip payloads through DecompressionStream', async () => {
  const payload = Buffer.from(gzipSync(Buffer.from(JSON.stringify({
    compressed: true,
    format: 'gzip',
  })))).toString('base64url')
  expect(await readPermalink(`https://example.com?data=j;gz;base64=${payload}`)).toEqual({
    compressed: true,
    format: 'gzip',
  })
})
test('supports an explicit result shape', async () => {
  type Shape = {
    count: number
    label: string
  }
  const payload = encode({
    count: 2,
    label: 'hello',
  })
  const result = await readPermalink<Shape>(`https://example.com?data=${payload}`)
  const count: number = result.count
  const label: string = result.label
  expect({
    count,
    label,
  }).toEqual({
    count: 2,
    label: 'hello',
  })
})
test('preserves literal plus signs in standard Base64 data', async () => {
  const payload = encode({value: '¾'}, 'base64')
  expect(payload).toContain('+')
  expect(await readPermalink(`https://example.com?data=${payload}`)).toEqual({value: '¾'})
})
test('applies query entries from left to right', async () => {
  const payload = encode({
    a: 'packed',
    b: 'packed',
    packedOnly: true,
  })
  expect(await readPermalink(`https://example.com?a=before&data=${payload}&b=after`)).toEqual({
    a: 'packed',
    b: 'after',
    packedOnly: true,
  })
  expect(await readPermalink(`https://example.com?data=${payload}&a=after`)).toEqual({
    a: 'after',
    b: 'packed',
    packedOnly: true,
  })
})
test('later duplicate named parameters override earlier ones', async () => {
  expect(await readPermalink('https://example.com?a=1&a=2')).toEqual({a: '2'})
})
test('hash data overrides all query state', async () => {
  const queryPayload = encode({
    a: 'query-data',
    b: 'query-data',
  })
  const hashPayload = encode({
    a: 'hash-data',
    c: 3,
  })
  expect(await readPermalink(`https://example.com?a=query&data=${queryPayload}&b=named#data:j=${hashPayload}`)).toEqual({
    a: 'hash-data',
    b: 'named',
    c: 3,
  })
})
test('ignores unrelated hashes', async () => {
  expect(await readPermalink('https://example.com?a=1#section')).toEqual({a: '1'})
})
test('accepts relative URLs and URL instances', async () => {
  expect(await readPermalink('?a=1')).toEqual({a: '1'})
  expect(await readPermalink(new URL('https://example.com/?a=2'))).toEqual({a: '2'})
})
test('rejects non-object JSON data payloads', async () => {
  await expect(readPermalink(`https://example.com?data=${encode([1, 2, 3])}`)).rejects.toThrow(TypeError)
  await expect(readPermalink(`https://example.com?data=${encode('value')}`)).rejects.toThrow(TypeError)
  await expect(readPermalink(`https://example.com?data=${encode(null)}`)).rejects.toThrow(TypeError)
})
test('does not allow URL state to mutate the result prototype', async () => {
  const payload = Buffer.from('{"__proto__":{"polluted":true},"safe":1}').toString('base64url')
  const result = await readPermalink(`https://example.com?__proto__=named&data=${payload}`)
  expect(Object.getPrototypeOf(result)).toBe(Object.prototype)
  expect(Object.hasOwn(result, '__proto__')).toBeTrue()
  expect(result.__proto__).toEqual({polluted: true})
  expect(result.safe).toBe(1)
})
