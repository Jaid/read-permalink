`readPermalink(url, options?)` reads ordinary query parameters from left to right, decodes packed state at the configured query key and applies packed fragment state last.

By default it uses the asynchronous native-first decompression path and returns a plain object through a `Promise`. Pass `{sync: true}` to use the synchronous JavaScript decoders.

```ts
const asyncState = await readPermalink(url)
const syncState = readPermalink(url, {sync: true})
```

The TypeScript overloads follow `sync` and `format`, so literal options produce the matching return type.

`readPermalink()` defaults to the current browser URL. Outside a browser, pass a string or `URL` explicitly.

The descriptor may be omitted when using the defaults. Base64 padding is optional.

# options

The second parameter configures packed-state sources, execution mode and result format:

```ts
readPermalink(url, {
  query: 'state',
  fragment: 'state',
  sync: true,
  format: 'state',
})
```

`query` and `fragment` accept `string | boolean` and default to `true`:

- `true` uses the default key `data`
- a string uses that key instead
- `false` disables packed-state decoding for that source

Disabling query packed-state decoding does not disable ordinary query parameters. For example, with `{query: false}`, `?data=hello&a=1` produces `{data: 'hello', a: '1'}`.

`sync` accepts `boolean` and defaults to `false`:

- `false` or omitted → asynchronous native-first decompression and a `Promise`
- `true` → synchronous JavaScript decompression and a direct result

`format` is either `plain` or `state` and defaults to `plain`:

- `plain` → return the decoded object directly
- `state` → return the `State<Shape>` instance containing that object in `value`

This gives four precise return modes:

```ts
const a = readPermalink<Shape>(url)
// Promise<Shape>

const b = readPermalink<Shape>(url, {sync: true})
// Shape

const c = readPermalink<Shape>(url, {format: 'state'})
// Promise<State<Shape>>

const d = readPermalink<Shape>(url, {
  format: 'state',
  sync: true,
})
// State<Shape>
```

# State

`State<Shape>` provides the same merge mechanics for incremental use. Its `value` property is typed as `Shape` and remains a plain object.

```ts
import {State} from 'read-permalink'

const state = new State<{enabled: boolean, mode: string, tab: string}>

state
  .apply({mode: 'details'})
  .applyQuery('?tab=overview')
  .applyFragment('#data:j=eyJlbmFibGVkIjp0cnVlfQ')

console.log(state.value)
// {mode: 'details', tab: 'overview', enabled: true}
```

`apply(patch)` safely merges an object into the current value. `applyQuery(search, option?)` applies ordinary query parameters and packed-state entries from left to right. `applyFragment(hash, option?)` applies a packed-state fragment. The source option uses the same `string | boolean` semantics as the top-level function. The methods return the same `State` instance for chaining.

`applyQueryAsync()` and `applyFragmentAsync()` provide the native-first asynchronous decompression path used when `sync` is not enabled.

When a `State` comes from `readPermalink(..., {format: 'state'})`, it also retains the literal input:

```ts
const state = readPermalink(url, {
  format: 'state',
  sync: true,
})

state.getInput()
state.getConsumedInput()
```

`getInput()` returns the original input string unchanged. `getConsumedInput()` returns that input with handled portions removed. Query entries are consumed when they are applied. A matching packed fragment is consumed only when fragment handling is enabled; `{fragment: false}` or an unrelated fragment leaves the hash in the consumed input.

## consume and discard URL state

In a browser, request `format: 'state'`, consume the values you need, then navigate to the remaining input to discard the values that were handled:

```ts
const state = await readPermalink<{
  settings?: {
    theme: string
  }
}>(window.location.href, {
  format: 'state',
})

const settings = state.value.settings
const remainingInput = state.getConsumedInput()

if (remainingInput !== state.getInput()) {
  window.location.href = remainingInput
}
```

After the navigation, the consumed query/hash state is gone from the address bar. Disabled or unrelated sources remain because they were not consumed.

`State` also accepts an optional input string in its constructor when it is used directly and input tracking is desired.

# descriptors

The default engine pipeline is JSON → uncompressed → Base64. A descriptor overrides individual stages:

```text
?data=j;br;base64=<payload>
?data=j;zstd;base64=<payload>
?data=application/json;gzip;base64=<payload>
```

| stage | formats and aliases | synchronous decoding |
| --- | --- | --- |
| Serialization | `j`, `json`, `application/json` | JSON decoding |
| Compression | `u`, `uncompressed` | no decompression |
| Compression | `b`, `br`, `brotli` | `decode-brotli` |
| Compression | `z`, `zst`, `zstd`, `zstandard` | `decode-zstd` |
| Compression | `g`, `gz`, `gzip` | `fflate` |
| Encoding | `base64` | Base64 and Base64URL through `from-base64` |

YAML (`y`, `yaml`, `application/yaml`) and LZMA (`l`, `lzma`) descriptors are recognized, but their engines are placeholders and throw when decoding is attempted.