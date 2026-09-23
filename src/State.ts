import type {OptisProcessed, OptisSchema} from 'optis'

import getEngines, {isEngineDescriptor} from './getEngines.ts'

export type PermalinkState = Record<string, unknown>
export type StateValue<SchemaGeneric extends OptisSchema | undefined> = SchemaGeneric extends OptisSchema ? OptisProcessed<SchemaGeneric> : PermalinkState
export type StateSourceOption = boolean | string
type StatePatch = PermalinkState

const decodeComponent = (value: string, plusAsSpace = false) => {
  return decodeURIComponent(plusAsSpace ? value.replaceAll('+', ' ') : value)
}
const splitOnce = (value: string, separator: string) => {
  const index = value.indexOf(separator)
  if (index === -1) {
    return [value, undefined] as const
  }
  return [value.slice(0, index), value.slice(index + separator.length)] as const
}
const getDataInput = (value: string) => {
  const [possibleDescriptor, possiblePayload] = splitOnce(value, '=')
  const hasDescriptor = possiblePayload !== undefined && isEngineDescriptor(possibleDescriptor)
  return {
    engines: getEngines(hasDescriptor ? possibleDescriptor : ''),
    payload: hasDescriptor ? possiblePayload : value,
  }
}
const getPermalinkState = (decoded: unknown) => {
  if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) {
    throw new TypeError('Permalink data payload must decode to an object.')
  }
  return decoded as PermalinkState
}
const decodeData = (value: string) => {
  const {engines, payload} = getDataInput(value)
  const encoded = engines.encoding.decode(payload)
  const decompressed = engines.compression.decode(encoded)
  return getPermalinkState(engines.serialization.decode(decompressed))
}
const decodeDataAsync = async (value: string) => {
  const {engines, payload} = getDataInput(value)
  const encoded = engines.encoding.decode(payload)
  const decompressed = await engines.compression.decodeAsync(encoded)
  return getPermalinkState(engines.serialization.decode(decompressed))
}
const getSourceKey = (option: StateSourceOption) => {
  if (option === false) {
    return false
  }
  return option === true ? 'data' : option
}
const removeFragment = (input: string) => {
  const index = input.indexOf('#')
  return index === -1 ? input : input.slice(0, index)
}
const removeQuery = (input: string) => {
  const fragmentIndex = input.indexOf('#')
  const fragment = fragmentIndex === -1 ? '' : input.slice(fragmentIndex)
  const beforeFragment = fragmentIndex === -1 ? input : input.slice(0, fragmentIndex)
  const queryIndex = beforeFragment.indexOf('?')
  return queryIndex === -1 ? input : beforeFragment.slice(0, queryIndex) + fragment
}

export default class State<SchemaGeneric extends OptisSchema | undefined = undefined> {
  private consumedFragment = false
  private consumedQuery = false
  private readonly input: string
  private processed: StateValue<SchemaGeneric> | undefined
  private readonly raw: PermalinkState = {}
  private readonly schema: SchemaGeneric | undefined

  constructor(input = '', schema?: SchemaGeneric) {
    this.input = input
    this.schema = schema
  }

  get value(): StateValue<SchemaGeneric> {
    if (!this.schema) {
      return this.raw as StateValue<SchemaGeneric>
    }
    // Keep raw values separate so non-idempotent normalizations never compound.
    return this.processed ??= this.schema.process({...this.raw}) as StateValue<SchemaGeneric>
  }

  apply(patch: StatePatch) {
    for (const [key, value] of Object.entries(patch)) {
      this.set(key, value)
    }
    return this
  }

  applyFragment(hash: string, option: StateSourceOption = true) {
    const key = getSourceKey(option)
    if (key === false) {
      return this
    }
    const fragment = hash.startsWith('#') ? hash.slice(1) : hash
    const prefix = `${key}:`
    if (fragment.startsWith(prefix)) {
      this.apply(decodeData(decodeComponent(fragment.slice(prefix.length))))
      this.consumedFragment = true
    }
    return this
  }

  async applyFragmentAsync(hash: string, option: StateSourceOption = true) {
    const key = getSourceKey(option)
    if (key === false) {
      return this
    }
    const fragment = hash.startsWith('#') ? hash.slice(1) : hash
    const prefix = `${key}:`
    if (fragment.startsWith(prefix)) {
      this.apply(await decodeDataAsync(decodeComponent(fragment.slice(prefix.length))))
      this.consumedFragment = true
    }
    return this
  }

  applyQuery(search: string, option: StateSourceOption = true) {
    const packedKey = getSourceKey(option)
    const query = search.startsWith('?') ? search.slice(1) : search
    if (!query) {
      return this
    }
    let consumed = false
    for (const entry of query.split('&')) {
      if (!entry) {
        continue
      }
      const [rawKey, rawValue = ''] = splitOnce(entry, '=')
      const key = decodeComponent(rawKey, true)
      if (packedKey !== false && key === packedKey) {
        this.apply(decodeData(decodeComponent(rawValue)))
      } else {
        this.set(key, decodeComponent(rawValue, true))
      }
      consumed = true
    }
    this.consumedQuery ||= consumed
    return this
  }

  async applyQueryAsync(search: string, option: StateSourceOption = true) {
    const packedKey = getSourceKey(option)
    const query = search.startsWith('?') ? search.slice(1) : search
    if (!query) {
      return this
    }
    let consumed = false
    for (const entry of query.split('&')) {
      if (!entry) {
        continue
      }
      const [rawKey, rawValue = ''] = splitOnce(entry, '=')
      const key = decodeComponent(rawKey, true)
      if (packedKey !== false && key === packedKey) {
        this.apply(await decodeDataAsync(decodeComponent(rawValue)))
      } else {
        this.set(key, decodeComponent(rawValue, true))
      }
      consumed = true
    }
    this.consumedQuery ||= consumed
    return this
  }

  getConsumedInput() {
    let output = this.input
    if (this.consumedQuery) {
      output = removeQuery(output)
    }
    if (this.consumedFragment) {
      output = removeFragment(output)
    }
    return output
  }

  getInput() {
    return this.input
  }

  private set(key: string, value: unknown) {
    this.processed = undefined
    Object.defineProperty(this.raw, key, {
      configurable: true,
      enumerable: true,
      value,
      writable: true,
    })
  }
}
