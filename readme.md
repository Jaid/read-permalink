# read-permalink

Read URL search parameters and packed state from permalinks.

`await readPermalink(url)` returns a plain object. Ordinary query parameters are applied from left to right as strings. A `data` query parameter decodes an engine-described object and applies it at that position. A `#data:` fragment is applied last and therefore overrides query state.

The default engine pipeline is JSON → uncompressed → Base64. Descriptors can override individual stages, for example `j;br;base64` or `application/json;brotli;base64`. JSON accepts `j`, `json`, and `application/json`; Brotli accepts `b`, `br`, and `brotli` and is decoded with the environment's native `DecompressionStream`; Base64 accepts both Base64 and Base64URL input through `from-base64`.

The descriptor may be omitted when using the defaults. Base64 padding is optional.

`readPermalink()` defaults to the current browser URL. Outside a browser, pass a string or `URL` explicitly.

YAML and LZMA descriptors are recognized (y, yaml, pplication/yaml; l, lzma) but their engines are placeholders and throw when decoding is attempted.
