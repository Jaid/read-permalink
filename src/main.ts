import type {StateSchemaInput, StateSourceOption, StateValue} from './State.ts'

import State from './State.ts'

export type ReadPermalinkOptions<SchemaGeneric extends StateSchemaInput | undefined = undefined> = ReadPermalinkBaseOptions & {
  format?: ResultFormat
  sync?: boolean
} & (SchemaGeneric extends StateSchemaInput ? {
  /** Processes the final merged URL state with Optis defaults, required keys and normalizations. */
  schema: SchemaGeneric
} : {
  schema?: undefined
})
type Input = URL | string
type ResultFormat = 'plain' | 'state'
type ReadPermalinkBaseOptions = {
  fragment?: StateSourceOption
  query?: StateSourceOption
}
type ReadPermalinkCallOptions<
  SchemaGeneric extends StateSchemaInput | undefined,
  SyncGeneric extends boolean | undefined,
  FormatGeneric extends ResultFormat | undefined,
> = ReadPermalinkBaseOptions & {
  format?: FormatGeneric
  schema?: SchemaGeneric
  sync?: SyncGeneric
}
type ReadPermalinkFormattedResult<
  SchemaGeneric extends StateSchemaInput | undefined,
  FormatGeneric extends ResultFormat | undefined,
> = FormatGeneric extends 'state'
  ? State<SchemaGeneric>
  : FormatGeneric extends 'plain' | undefined
    ? StateValue<SchemaGeneric>
    : State<SchemaGeneric> | StateValue<SchemaGeneric>
type ReadPermalinkResult<
  SchemaGeneric extends StateSchemaInput | undefined,
  SyncGeneric extends boolean | undefined,
  FormatGeneric extends ResultFormat | undefined,
> = SyncGeneric extends false
  ? Promise<ReadPermalinkFormattedResult<SchemaGeneric, FormatGeneric>>
  : SyncGeneric extends true | undefined
    ? ReadPermalinkFormattedResult<SchemaGeneric, FormatGeneric>
    : Promise<ReadPermalinkFormattedResult<SchemaGeneric, FormatGeneric>> | ReadPermalinkFormattedResult<SchemaGeneric, FormatGeneric>
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
const formatState = <SchemaGeneric extends StateSchemaInput | undefined>(state: State<SchemaGeneric>, format: ResultFormat | undefined) => {
  const value = state.value
  return format === 'state' ? state : value
}
function readPermalink<
  const SyncGeneric extends boolean | undefined = undefined,
  const FormatGeneric extends ResultFormat | undefined = undefined,
  SchemaGeneric extends StateSchemaInput | undefined = undefined,
>(
  input?: Input,
  options?: ReadPermalinkCallOptions<SchemaGeneric, SyncGeneric, FormatGeneric>,
): ReadPermalinkResult<SchemaGeneric, SyncGeneric, FormatGeneric> {
  const resolvedInput = resolveInput(input)
  const state = new State<SchemaGeneric>(resolvedInput.literal, options?.schema)
  if (options?.sync !== false) {
    state.applyQuery(resolvedInput.url.search, options?.query ?? true)
    state.applyFragment(resolvedInput.url.hash, options?.fragment ?? true)
    return formatState(state, options?.format) as ReadPermalinkResult<SchemaGeneric, SyncGeneric, FormatGeneric>
  }
  return (async () => {
    await state.applyQueryAsync(resolvedInput.url.search, options.query ?? true)
    await state.applyFragmentAsync(resolvedInput.url.hash, options.fragment ?? true)
    return formatState(state, options.format)
  })() as ReadPermalinkResult<SchemaGeneric, SyncGeneric, FormatGeneric>
}

export default readPermalink

export {parseBoolean, parseNumber} from './parsers.ts'

export {default as State} from './State.ts'
export type {StateSchemaInput} from './State.ts'
