`await readPermalink(url)` returns a plain object. Ordinary query parameters are applied from left to right as strings. A `data` query parameter decodes an engine-described object and applies it at that position. A `#data:` fragment is applied last and therefore overrides query state.

The descriptor may be omitted when using the defaults. Base64 padding is optional.

`readPermalink()` defaults to the current browser URL. Outside a browser, pass a string or `URL` explicitly.

# descriptors

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
