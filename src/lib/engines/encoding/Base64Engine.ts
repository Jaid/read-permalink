import fromBase64 from 'from-base64'

import EncodingEngine from './base/EncodingEngine.ts'

export default class Base64Engine extends EncodingEngine {
  readonly aliases = new Set(['base64'])

  decode(input: string) {
    return fromBase64(input)
  }
}
