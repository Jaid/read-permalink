import type {ReadPermalinkOptions, State} from 'read-permalink'

import optis from 'optis'
import readPermalink, {parseBoolean, parseNumber} from 'read-permalink'

const schema = optis({
  defaults: {
    enabled: false,
  },
  normalizations: {
    count: parseNumber,
    enabled: parseBoolean,
  },
})
const syncPlain = readPermalink('?count=1&enabled=false', {
  schema,
  sync: true,
})
const count: number | undefined = syncPlain.count
const enabled: boolean = syncPlain.enabled
const syncState = readPermalink('?count=1', {
  schema,
  sync: true,
  format: 'state',
})
const state: State<typeof schema> = syncState
const stateCount: number | undefined = state.value.count
const asyncPlain: Promise<{
  count?: number
  enabled: boolean
}> = readPermalink('?count=1', {schema})
const asyncState: Promise<State<typeof schema>> = readPermalink('?count=1', {
  schema,
  format: 'state',
})
const reusableOptions = {
  schema,
  sync: true,
} satisfies ReadPermalinkOptions<typeof schema>
const reusableResult: {
  count?: number
  enabled: boolean
} = readPermalink('?count=2', reusableOptions)
export {asyncPlain, asyncState, count, enabled, reusableResult, state, stateCount}
