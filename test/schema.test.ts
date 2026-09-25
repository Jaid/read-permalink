import type {ReadPermalinkOptions} from '#src/main.ts'

import {expect, expectTypeOf, test} from 'bun:test'

import optis, {RequiredOptionsError} from 'optis'

import readPermalink, {parseBoolean, parseNumber, State} from '#src/main.ts'

const encoder = new TextEncoder
const encode = (value: unknown) => encoder.encode(JSON.stringify(value)).toBase64({
  alphabet: 'base64url',
  omitPadding: true,
})
const schemaInput = {
  defaults: {
    count: 1,
    enabled: false,
  },
  normalizations: {
    count: parseNumber,
    enabled: parseBoolean,
    label: String,
  },
}
const schema = optis(schemaInput)
type Result = {
  count: number
  enabled: boolean
  label?: string
}

test('URL normalization helpers use strict boolean and finite-number semantics', () => {
  for (const value of [true, 'true', 1, '1']) {
    expect(parseBoolean(value)).toBeTrue()
  }
  for (const value of [false, 'false', 0, '0']) {
    expect(parseBoolean(value)).toBeFalse()
  }
  for (const value of ['', 'TRUE', 'yes', ' false ', 2, null]) {
    expect(() => parseBoolean(value)).toThrow(TypeError)
  }
  for (const value of [0, -2.5, '1e3', ' 12 ', '0xff']) {
    expect(parseNumber(value)).toBe(Number(value))
  }
  for (const value of ['', ' ', 'no', 'NaN', 'Infinity', Number.NaN, Infinity, true, null]) {
    expect(() => parseNumber(value)).toThrow(TypeError)
  }
})
test('infers normalized values in every return mode', async () => {
  const input = '?count=42&enabled=false&label=hello'
  const sync = readPermalink(input, {schema})
  const async = readPermalink(input, {
    schema,
    sync: false,
  })
  const syncState = readPermalink(input, {
    schema,
    format: 'state',
  })
  const asyncState = readPermalink(input, {
    schema,
    format: 'state',
    sync: false,
  })
  expectTypeOf(sync).toEqualTypeOf<Result>()
  expectTypeOf(async).toEqualTypeOf<Promise<Result>>()
  expectTypeOf(syncState).toEqualTypeOf<State<typeof schema>>()
  expectTypeOf(asyncState).toEqualTypeOf<Promise<State<typeof schema>>>()
  expectTypeOf(syncState.value).toEqualTypeOf<Result>()
  const expected = {
    count: 42,
    enabled: false,
    label: 'hello',
  }
  expect(sync).toEqual(expected)
  expect(await async).toEqual(expected)
  expect(syncState.value).toEqual(expected)
  const resolvedState = await asyncState
  expect(resolvedState.value).toEqual(expected)
})
test('accepts Optis factory input directly', async () => {
  const input = '?count=42&enabled=false&label=hello'
  const sync = readPermalink(input, {schema: schemaInput})
  const async = readPermalink(input, {
    schema: schemaInput,
    sync: false,
  })
  const state = readPermalink(input, {
    schema: schemaInput,
    format: 'state',
  })
  expectTypeOf(sync).toEqualTypeOf<Result>()
  expectTypeOf(async).toEqualTypeOf<Promise<Result>>()
  expectTypeOf(state).toEqualTypeOf<State<typeof schemaInput>>()
  const expected = {
    count: 42,
    enabled: false,
    label: 'hello',
  }
  expect(sync).toEqual(expected)
  expect(await async).toEqual(expected)
  expect(state.value).toEqual(expected)
})
test('supports reusable options and dynamic return modes', async () => {
  const options = {
    schema,
    sync: true,
  } satisfies ReadPermalinkOptions<typeof schema>
  expectTypeOf(readPermalink('', options)).toEqualTypeOf<Result>()
  const dynamic = (sync: boolean, format: 'plain' | 'state') => readPermalink('?count=3', {
    schema,
    sync,
    format,
  })
  expectTypeOf<ReturnType<typeof dynamic>>().toEqualTypeOf<Promise<Result | State<typeof schema>> | Result | State<typeof schema>>()
  expect(await dynamic(false, 'plain')).toEqual({
    count: 3,
    enabled: false,
  })
  expect(dynamic(true, 'state')).toBeInstanceOf(State)
})
test('applies defaults on empty input and preserves unknown keys', async () => {
  expect(readPermalink('', {
    schema,
    sync: true,
  })).toEqual({
    count: 1,
    enabled: false,
  })
  expect<Record<string, unknown>>(await readPermalink('?extra=value', {
    schema,
    sync: false,
  })).toEqual({
    count: 1,
    enabled: false,
    extra: 'value',
  })
})
test('normalizes only the final merged values', async () => {
  const inputs: Array<unknown> = []
  const finalSchema = optis({
    requiredKeys: ['count'] as const,
    normalizations: {count: (value: unknown) => {
      inputs.push(value)
      return Number(value) + 1
    }},
  })
  const query = encode({count: 2})
  const fragment = encode({count: '4'})
  const input = `?count=invalid&data=${query}&count=3#data:j=${fragment}`
  for (const sync of [true, false]) {
    const result = await readPermalink(input, {
      schema: finalSchema,
      sync,
    })
    expect(result).toEqual({count: 5})
  }
  expect(inputs).toEqual(['4', '4'])
})
test('required keys can come from a fragment or defaults', async () => {
  const required = optis({
    requiredKeys: ['count'] as const,
    normalizations: {count: Number},
  })
  const input = `?label=test#data:j=${encode({count: '7'})}`
  expect<Record<string, unknown>>(readPermalink(input, {
    schema: required,
    sync: true,
  })).toEqual({
    label: 'test',
    count: 7,
  })
  expect<Record<string, unknown>>(await readPermalink(input, {
    schema: required,
    sync: false,
  })).toEqual({
    label: 'test',
    count: 7,
  })
  const withDefault = required.extend({defaults: {count: 8}})
  expect(readPermalink('', {
    schema: withDefault,
    sync: true,
  })).toEqual({count: 8})
  for (const format of ['plain', 'state'] as const) {
    expect(() => readPermalink('', {
      schema: required,
      sync: true,
      format,
    })).toThrow(RequiredOptionsError)
    expect(readPermalink('', {
      schema: required,
      format,
      sync: false,
    })).rejects.toBeInstanceOf(RequiredOptionsError)
    expect(() => readPermalink('?count=no', {
      schema,
      sync: true,
      format,
    })).toThrow('Expected a finite number.')
    expect(readPermalink('?count=no', {
      schema,
      format,
      sync: false,
    })).rejects.toThrow('Expected a finite number.')
  }
})
test('incremental State processing is lazy and never compounds normalizations', async () => {
  let calls = 0
  const increment = optis({
    requiredKeys: ['count'] as const,
    normalizations: {count: (value: unknown) => {
      calls++
      return Number(value) + 1
    }},
  })
  const state = new State('original', increment)
  expectTypeOf<typeof state.value>().toEqualTypeOf<{count: number}>()
  expect(state.apply({label: 'hello'})).toBe(state)
  expect(() => state.value).toThrow(RequiredOptionsError)
  state.applyQuery('?count=2')
  const first = state.value
  expect<Record<string, unknown>>(first).toEqual({
    label: 'hello',
    count: 3,
  })
  expect<Record<string, unknown>>(state.value).toBe(first)
  expect(calls).toBe(1)
  state.apply({label: 'changed'})
  expect<Record<string, unknown>>(state.value).toEqual({
    label: 'changed',
    count: 3,
  })
  expect<Record<string, unknown>>(first).toEqual({
    label: 'hello',
    count: 3,
  })
  expect(calls).toBe(2)
  await state.applyQueryAsync('?count=4')
  await state.applyFragmentAsync(`#data:j=${encode({count: 6})}`)
  expect(state.value.count).toBe(7)
  expect(state.getInput()).toBe('original')
})
test('State returned from readPermalink retains schema and input tracking', async () => {
  const input = `?count=2#data:j=${encode({enabled: 'true'})}`
  const state = readPermalink(input, {
    schema,
    format: 'state',
  })
  expect(state.getInput()).toBe(input)
  expect(state.getConsumedInput()).toBe('')
  state.applyQuery('?count=9&enabled=false')
  expect<Record<string, unknown>>(state.value).toEqual({
    count: 9,
    enabled: false,
  })
})
test('schemas respect custom and disabled packed-state sources', async () => {
  const input = `?packed=${encode({count: '5'})}#packed:j=${encode({count: '6'})}`
  expect(readPermalink(input, {
    schema,
    query: 'packed',
    fragment: 'packed',
  })).toEqual({
    count: 6,
    enabled: false,
  })
  expect<Record<string, unknown>>(readPermalink('?data=literal&count=3#data:invalid', {
    schema,
    query: false,
    fragment: false,
  })).toEqual({
    data: 'literal',
    count: 3,
    enabled: false,
  })
})
test('schema processing preserves safe own properties', () => {
  const payload = encoder.encode('{"__proto__":{"polluted":true},"count":"2"}').toBase64({
    alphabet: 'base64url',
    omitPadding: true,
  })
  const result = readPermalink(`?constructor=hello&data=${payload}`, {
    schema,
    sync: true,
  })
  expect(Object.getPrototypeOf(result)).toBe(Object.prototype)
  expect(Object.hasOwn(result, '__proto__')).toBeTrue()
  expect(Object.getOwnPropertyDescriptor(result, '__proto__')?.value).toEqual({polluted: true})
  expect(Object.hasOwn(result, 'constructor')).toBeTrue()
  expect(result.count).toBe(2)
})
test('normalizes defaults and skips absent optional keys', () => {
  const called: Array<unknown> = []
  const defaultsSchema = optis({
    defaults: {count: 4},
    normalizations: {
      count: (value: unknown) => Number(value) + 1,
      optional: (value: unknown) => {
        called.push(value)
        return String(value)
      },
    },
  })
  const state = readPermalink('', {
    schema: defaultsSchema,
    sync: true,
    format: 'state',
  })
  expect(state.value).toEqual({count: 5})
  expect(state.value).toEqual({count: 5})
  state.applyQuery('?other=value')
  expect(state.value.count).toBe(5)
  expect(called).toEqual([])
})
test('preserves normalization errors and allows correcting failed State processing', async () => {
  const error = new Error('Invalid value.')
  const validatingSchema = optis({
    defaults: {count: 0},
    normalizations: {count: (value: unknown) => {
      if (value === 'invalid') {
        throw error
      }
      return Number(value)
    }},
  })
  try {
    readPermalink('?count=invalid', {
      schema: validatingSchema,
      sync: true,
    })
    throw new Error('Expected normalization to fail.')
  } catch (error_) {
    expect(error_).toBe(error)
  }
  const caught = await readPermalink('?count=invalid', {
    schema: validatingSchema,
    sync: false,
  }).catch((error_: unknown) => error_)
  expect(caught).toBe(error)
  const state = new State('', validatingSchema)
  state.applyQuery('?count=invalid')
  expect(() => state.value).toThrow(error)
  state.applyQuery('?count=3')
  expect(state.value.count).toBe(3)
})
