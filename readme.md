<center><a href="https://npmjs.com/package/read-permalink"><img src="https://shieldcn.dev/npm/v/read-permalink.svg?variant=secondary&logo=npm&label=latest+version" alt="Latest version on npm"/></a> <a href="https://github.com/Jaid/read-permalink/raw/HEAD/license.txt"><img src="https://shieldcn.dev/github/license/Jaid/read-permalink.svg?variant=secondary" alt="License"/></a></center>

# read-permalink

read URL search parameters and packed state from permalinks

## minimal example

```ts
import readPermalink from 'read-permalink'

const state = await readPermalink('?tab=details&data=eyJlbmFibGVkIjp0cnVlfQ')

// {tab: 'details', enabled: true}
console.log(state)
```

## features

- reads ordinary query parameters and packed permalink state into one plain object
- deterministic left-to-right query merging, with `#data:` fragment state applied last
- descriptor-selected JSON, compression and Base64 decoding pipeline
- native-first Brotli and zstd decompression with JavaScript fallbacks
- Base64 and Base64URL support
- browser-friendly API that can default to the current URL

## installation

<a href="https://npmjs.com/package/read-permalink"><img src="https://shieldcn.dev/badge/npm-read--permalink-C23039.svg?variant=secondary&logo=npm" alt="read-permalink on npm"/></a>

```sh
npm install --save read-permalink
```

## usage

`await readPermalink(url)` returns a plain object. Ordinary query parameters are applied from left to right as strings. A `data` query parameter decodes an engine-described object and applies it at that position. A `#data:` fragment is applied last and therefore overrides query state.

The descriptor may be omitted when using the defaults. Base64 padding is optional.

`readPermalink()` defaults to the current browser URL. Outside a browser, pass a string or `URL` explicitly.

### descriptors

The default engine pipeline is JSON → uncompressed → Base64. A descriptor overrides individual stages:

```text
?data=j;br;base64=<payload>
?data=j;zstd;base64=<payload>
?data=application/json;gzip;base64=<payload>
```

| stage | formats and aliases | behavior |
| --- | --- | --- |
| Serialization | `j`, `json`, `application/json` | JSON decoding |
| Compression | `u`, `uncompressed` | no decompression |
| Compression | `b`, `br`, `brotli` | native `DecompressionStream`, falling back to `decode-brotli` if native decoding throws |
| Compression | `z`, `zst`, `zstd`, `zstandard` | native `DecompressionStream`, falling back to `decode-zstd` if native decoding throws |
| Compression | `g`, `gz`, `gzip` | native `DecompressionStream` |
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
