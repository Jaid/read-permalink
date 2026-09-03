import getEngines, {isEngineDescriptor} from '#src/getEngines.ts'

type PermalinkState = Record<string, unknown>
type Input = URL | string

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
const setStateValue = (state: PermalinkState, key: string, value: unknown) => {
  Object.defineProperty(state, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  })
}
const applyPatch = (state: PermalinkState, patch: PermalinkState) => {
  for (const [key, value] of Object.entries(patch)) {
    setStateValue(state, key, value)
  }
}
const decodeData = async (value: string): Promise<PermalinkState> => {
  const [possibleDescriptor, possiblePayload] = splitOnce(value, '=')
  const hasDescriptor = possiblePayload !== undefined && isEngineDescriptor(possibleDescriptor)
  const engines = getEngines(hasDescriptor ? possibleDescriptor : '')
  const payload = hasDescriptor ? possiblePayload : value
  const encoded = engines.encoding.decode(payload)
  const decompressed = await engines.compression.decode(encoded)
  const decoded = engines.serialization.decode(decompressed)
  if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) {
    throw new TypeError('Permalink data payload must decode to an object.')
  }
  return decoded as PermalinkState
}
const getUrl = (input?: Input) => {
  if (input instanceof URL) {
    return input
  }
  const browserLocation = (globalThis as typeof globalThis & {location?: {href: string}}).location
  if (input === undefined) {
    if (!browserLocation) {
      throw new TypeError('readPermalink() isn’t running in a browser and thus needs an input URL')
    }
    return new URL(browserLocation.href)
  }
  return new URL(input, browserLocation?.href ?? 'http://localhost')
}
const applyQuery = async (state: PermalinkState, search: string) => {
  const query = search.startsWith('?') ? search.slice(1) : search
  if (!query) {
    return
  }
  for (const entry of query.split('&')) {
    if (!entry) {
      continue
    }
    const [rawKey, rawValue = ''] = splitOnce(entry, '=')
    const key = decodeComponent(rawKey, true)
    if (key === 'data') {
      applyPatch(state, await decodeData(decodeComponent(rawValue)))
      continue
    }
    setStateValue(state, key, decodeComponent(rawValue, true))
  }
}
const applyHash = async (state: PermalinkState, hash: string) => {
  const fragment = hash.startsWith('#') ? hash.slice(1) : hash
  if (!fragment.startsWith('data:')) {
    return
  }
  applyPatch(state, await decodeData(decodeComponent(fragment.slice('data:'.length))))
}
const readPermalink = async <ShapeGeneric extends object = PermalinkState>(input?: Input): Promise<ShapeGeneric> => {
  const url = getUrl(input)
  const state: PermalinkState = {}
  await applyQuery(state, url.search)
  await applyHash(state, url.hash)
  return state as ShapeGeneric
}

export default readPermalink
