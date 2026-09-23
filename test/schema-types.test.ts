import type {ReadPermalinkOptions} from '#src/main.ts'

import {expectTypeOf, test} from 'bun:test'

import optis from 'optis'

import readPermalink, {State} from '#src/main.ts'

test('schema inference cannot be replaced with unchecked result types', async () => {
  const schema = optis({
    defaults: {count: 0},
    normalizations: {count: Number},
  })
  // @ts-expect-error TS2344 The public generic controls execution mode, not an asserted result shape.
  await readPermalink<{count: string}>('', {schema})
  // @ts-expect-error TS2322 Schema-specific options require the matching runtime schema.
  const missing: ReadPermalinkOptions<typeof schema> = {sync: true}
  missing
  const result = readPermalink('', {
    schema,
    sync: true,
  })
  expectTypeOf(result.count).toEqualTypeOf<number>()
  // @ts-expect-error TS2322 The normalized field is a number, not a string.
  const wrong: string = result.count
  wrong
  // @ts-expect-error TS2339 Undeclared keys have no inferred type.
  result.undeclared
  const state = new State('', schema)
  expectTypeOf(state.value.count).toEqualTypeOf<number>()
  const generalOptions: ReadPermalinkOptions = {sync: true}
  await readPermalink('', generalOptions)
})
