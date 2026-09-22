import type {PermalinkState, StateSourceOption} from './State.ts'

import State from './State.ts'

export type ReadPermalinkOptions = {
  format?: 'plain' | 'state'
  fragment?: StateSourceOption
  query?: StateSourceOption
  sync?: boolean
}
type Input = URL | string
type ReadPermalinkAsyncPlainOptions = ReadPermalinkOptions & {
  format?: 'plain'
  sync?: false
}
type ReadPermalinkAsyncStateOptions = ReadPermalinkOptions & {
  format: 'state'
  sync?: false
}
type ReadPermalinkSyncPlainOptions = ReadPermalinkOptions & {
  format?: 'plain'
  sync: true
}
type ReadPermalinkSyncStateOptions = ReadPermalinkOptions & {
  format: 'state'
  sync: true
}
type ResolvedInput = {
  literal: string
  url: URL
}

const resolveInput = (input?: Input): ResolvedInput => {
  if (input instanceof URL) {
    return {
      literal: input.href,
      url: input,
    }
  }
  const browserLocation = (globalThis as typeof globalThis & {location?: {href: string}}).location
  if (input === undefined) {
    if (!browserLocation) {
      throw new TypeError('readPermalink() isn’t running in a browser and thus needs an input URL')
    }
    return {
      literal: browserLocation.href,
      url: new URL(browserLocation.href),
    }
  }
  return {
    literal: input,
    url: new URL(input, browserLocation?.href ?? 'http://localhost'),
  }
}
const readPermalinkSync = <ShapeGeneric extends object>(input: ResolvedInput, options: ReadPermalinkOptions) => {
  const state = new State<ShapeGeneric>(input.literal)
  state.applyQuery(input.url.search, options.query ?? true)
  state.applyFragment(input.url.hash, options.fragment ?? true)
  return state
}
const readPermalinkAsync = async <ShapeGeneric extends object>(input: ResolvedInput, options: ReadPermalinkOptions) => {
  const state = new State<ShapeGeneric>(input.literal)
  await state.applyQueryAsync(input.url.search, options.query ?? true)
  await state.applyFragmentAsync(input.url.hash, options.fragment ?? true)
  return state
}
const formatState = <ShapeGeneric extends object>(state: State<ShapeGeneric>, format: ReadPermalinkOptions['format']) => {
  return format === 'state' ? state : state.value
}
const formatStateAsync = async <ShapeGeneric extends object>(state: Promise<State<ShapeGeneric>>, format: ReadPermalinkOptions['format']) => {
  return formatState(await state, format)
}
// The caller-provided shape intentionally narrows the decoded object.
function readPermalink<ShapeGeneric extends object = PermalinkState>(input: Input | undefined, options: ReadPermalinkSyncStateOptions): State<ShapeGeneric>
// The caller-provided shape intentionally narrows the decoded object.
// eslint-disable-next-line typescript/no-unnecessary-type-parameters
function readPermalink<ShapeGeneric extends object = PermalinkState>(input: Input | undefined, options: ReadPermalinkSyncPlainOptions): ShapeGeneric
// The caller-provided shape intentionally narrows the decoded object.
function readPermalink<ShapeGeneric extends object = PermalinkState>(input: Input | undefined, options: ReadPermalinkAsyncStateOptions): Promise<State<ShapeGeneric>>
function readPermalink<ShapeGeneric extends object = PermalinkState>(input?: Input, options?: ReadPermalinkAsyncPlainOptions): Promise<ShapeGeneric>
function readPermalink<ShapeGeneric extends object = PermalinkState>(input: Input | undefined, options: ReadPermalinkOptions): Promise<ShapeGeneric | State<ShapeGeneric>> | ShapeGeneric | State<ShapeGeneric>
function readPermalink<ShapeGeneric extends object = PermalinkState>(input?: Input, options: ReadPermalinkOptions = {}): Promise<ShapeGeneric | State<ShapeGeneric>> | ShapeGeneric | State<ShapeGeneric> {
  const resolvedInput = resolveInput(input)
  if (options.sync) {
    return formatState(readPermalinkSync<ShapeGeneric>(resolvedInput, options), options.format)
  }
  return formatStateAsync(readPermalinkAsync<ShapeGeneric>(resolvedInput, options), options.format)
}

export {default as State} from './State.ts'
export default readPermalink
