<center><a href="https://npmjs.com/package/read-permalink"><img src="https://shieldcn.dev/npm/v/read-permalink.svg?variant=secondary&logo=npm&label=latest+version" alt="Latest version on npm"/></a> <a href="https://github.com/Jaid/read-permalink/raw/HEAD/license.txt"><img src="https://shieldcn.dev/github/license/Jaid/read-permalink.svg?variant=secondary" alt="License"/></a></center>

# read-permalink

read URL search parameters and packed state from permalinks

## minimal example

```ts
import readPermalink from 'read-permalink'

const state = readPermalink('?tab=details&data=eyJzZXR0aW5ncyI6eyJ0aGVtZSI6ImRhcmsifX0')

// {tab: 'details', settings: {theme: 'dark'}}
console.log(state)
```

## features

- synchronous permalink parsing by default, with an opt-in asynchronous native-first mode
- one `readPermalink` API whose return type follows the `sync` and `format` options
- Optis runtime schemas with defaults, required keys, normalizations and inferred result types
- strict `parseBoolean` and finite `parseNumber` helpers for URL normalization
- optional schema-aware `State` results for incremental state manipulation
- reads ordinary query parameters and packed permalink state into one plain object
- deterministic left-to-right query merging, with packed fragment state applied last
- descriptor-selected JSON, compression and Base64 decoding pipeline
- Base64 and Base64URL support
- browser-friendly API that can default to the current URL

## installation

<a href="https://npmjs.com/package/read-permalink"><img src="https://shieldcn.dev/badge/npm-read--permalink-C23039.svg?variant=secondary&logo=npm" alt="read-permalink on npm"/></a>

```sh
npm install --save read-permalink
```

## usage

`readPermalink(url, options?)` reads ordinary query parameters from left to right, decodes packed state at the configured query key and applies packed fragment state last.

By default it uses the synchronous JavaScript decoders and returns the result directly. Pass `{sync: false}` to use the asynchronous native-first decompression path.

```ts
const syncState = readPermalink(url)
const asyncState = await readPermalink(url, {sync: false})
```

The TypeScript return type follows `sync` and `format`, so literal options produce the matching result without overload-order dependence.

`readPermalink()` defaults to the current browser URL. Outside a browser, pass a string or `URL` explicitly.

The descriptor may be omitted when using the defaults. Base64 padding is optional.

### options

The second parameter configures the Optis schema, packed-state sources, execution mode and result format:

```ts
readPermalink(url, {
  query: 'state',
  fragment: 'state',
  format: 'state',
})
```

`query` and `fragment` accept `string | boolean` and default to `true`:

- `true` uses the default key `data`
- a string uses that key instead
- `false` disables packed-state decoding for that source

Disabling query packed-state decoding does not disable ordinary query parameters. For example, with `{query: false}`, `?data=hello&a=1` produces `{data: 'hello', a: '1'}`.

`sync` accepts `boolean` and defaults to `true`:

- `true` or omitted → synchronous JavaScript decompression and a direct result
- `false` → asynchronous native-first decompression and a `Promise`

`format` is either `plain` or `state` and defaults to `plain`:

- `plain` → return the decoded object directly
- `state` → return the `State` instance containing that object in `value`

With an Optis `schema`, the result type is inferred as `optis.Processed<typeof schema>`. This gives four precise return modes:

```ts
const a = readPermalink(url, {schema})
// optis.Processed<typeof schema>

const b = readPermalink(url, {schema, sync: false})
// Promise<optis.Processed<typeof schema>>

const c = readPermalink(url, {schema, format: 'state'})
// State<typeof schema>

const d = readPermalink(url, {
  schema,
  format: 'state',
  sync: false,
})
// Promise<State<typeof schema>>
```

### runtime schema

Add `optis` as a direct dependency when constructing schemas in your application. Pass an [Optis](https://npmjs.com/package/optis) instance as `schema` to apply defaults, check required keys and normalize values at runtime. No explicit result-type argument is needed:

```ts
import optis from 'optis'
import readPermalink, {parseBoolean, parseNumber} from 'read-permalink'

const schema = optis({
  defaults: {
    page: 1,
    enabled: false,
  },
  normalizations: {
    page: parseNumber,
    enabled: parseBoolean,
  },
})

const result = readPermalink('?page=3&enabled=false', {schema})
// Inferred as {page: number, enabled: boolean}.
console.log(result)
// {page: 3, enabled: false}
```

Optis processes the final merged object, not each query entry independently. Query entries still merge from left to right and a matching fragment still wins. This lets required keys come from any source and prevents defaults or intermediate invalid values from interfering with precedence. Normalizations also receive values decoded from packed state, which may already be numbers, booleans or objects. Write normalizers that accept `unknown` and handle the input types you allow.

Defaults alone do not coerce URL strings. Use `normalizations` for conversion and validation. Normalization-only keys are inferred by Optis as optional fields; defaults and required declarations make them required. `read-permalink` exports `parseBoolean`, which accepts only `true`, `false`, `1` and `0` (including their string forms), and `parseNumber`, which accepts finite numbers and nonempty numeric strings. Optis is an options processor, not an automatic type validator: type-only declarations and `extendTyped()` do not add runtime validation.

Missing runtime-required keys throw Optis’s `RequiredOptionsError`. Errors thrown by normalizers propagate unchanged. Synchronous reads throw; asynchronous reads reject. Both `plain` and `state` formats process the schema before returning successfully. Unknown URL keys are preserved at runtime, following Optis’s behavior, but are not added to the inferred schema type.

Without `schema`, ordinary query values remain strings and packed values retain their decoded types. Precise result typing comes from the runtime schema rather than an unchecked caller-provided shape.

For reusable options, use `satisfies ReadPermalinkOptions<typeof schema>` to check the options without widening the literal `sync` and `format` values.

### State

`State` provides the same merge mechanics for incremental use. Pass a schema as the second constructor argument to infer the processed `value` type:

```ts
import optis from 'optis'
import {parseNumber, State} from 'read-permalink'

const schema = optis({
  defaults: {count: 0},
  normalizations: {count: parseNumber},
})
const state = new State('', schema)

state.applyQuery('?count=42')
console.log(state.value)
// {count: 42}
```

Schema-backed states accumulate raw values and process them lazily when `value` is read. This allows incremental patches to supply required keys before processing. The processed plain object is cached until another patch is applied. Each subsequent processing pass starts from raw state, so non-idempotent normalizations do not compound. Use pure, synchronous normalizers and update state through the apply methods rather than mutating `value`; previously returned processed objects are shallow snapshots, not live views. Schema-backed `apply()` accepts raw `Record<string, unknown>` patches because normalization has not happened yet.

Without a schema, `new State()` retains its existing raw, live-object behavior.

`apply(patch)` safely merges an object into the current value. `applyQuery(search, option?)` applies ordinary query parameters and packed-state entries from left to right. `applyFragment(hash, option?)` applies a packed-state fragment. The source option uses the same `string | boolean` semantics as the top-level function. The methods return the same `State` instance for chaining.

`applyQueryAsync()` and `applyFragmentAsync()` provide the native-first asynchronous decompression path used by `readPermalink(..., {sync: false})`.

When a `State` comes from `readPermalink(..., {format: 'state'})`, it also retains the literal input:

```ts
const state = readPermalink(url, {
  format: 'state',
})

state.getInput()
state.getConsumedInput()
```

`getInput()` returns the original input string unchanged. `getConsumedInput()` returns that input with handled portions removed. Query entries are consumed when they are applied. A matching packed fragment is consumed only when fragment handling is enabled; `{fragment: false}` or an unrelated fragment leaves the hash in the consumed input.

#### consume and discard URL state

In a browser, request `format: 'state'`, consume the values you need, then replace the current history entry with the remaining input to discard the values that were handled without reloading the page:

```ts
const state = readPermalink(window.location.href, {
  schema,
  format: 'state',
})

const page = state.value.page
const remainingInput = state.getConsumedInput()

if (remainingInput !== state.getInput()) {
  window.history.replaceState(null, '', remainingInput)
}
```

The consumed query/hash state is removed from the address bar without reloading the page or adding another browser-history entry. Disabled or unrelated sources remain because they were not consumed.

`State` also accepts an optional input string in its constructor when it is used directly and input tracking is desired.

### descriptors

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

## development

Maintain README content in `docs/tldw`. Do not edit `readme.md` directly.

`bun run readme` regenerates it. `bun run build` regenerates the README before creating the production package.

### setting up

```sh
git clone git@github.com:Jaid/read-permalink.git
cd read-permalink
bun install
```

### testing

```sh
bun run test
```

## license

[MIT License](https://github.com/Jaid/read-permalink/raw/HEAD/license.txt)<br>
Copyright © 2026, Jaid \<jaid.jsx@gmail.com> (https://github.com/jaid)

<!--
readme generated with tldw v9.7.0 from ./docs/tldw
github.com/Jaid/tldw
-->
