import {expect, test} from 'bun:test'

const {default: readPermalink} = await import('#src/main.ts')

test('should run', () => {
  const result = readPermalink()
  expect(result).toBe('read-permalink') // TODO Test actual functionality
})
