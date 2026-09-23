const trueValues = new Set<unknown>([true, 'true', 1, '1'])
const falseValues = new Set<unknown>([false, 'false', 0, '0'])

export const parseBoolean = (value: unknown) => {
  if (trueValues.has(value)) {
    return true
  }
  if (falseValues.has(value)) {
    return false
  }
  throw new TypeError('Expected true, false, 1 or 0.')
}

export const parseNumber = (value: unknown) => {
  if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) {
    throw new TypeError('Expected a number or a nonempty numeric string.')
  }
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    throw new TypeError('Expected a finite number.')
  }
  return parsed
}
