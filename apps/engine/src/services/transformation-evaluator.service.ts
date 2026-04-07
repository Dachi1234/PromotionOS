import type { TransformationConfig } from '@promotionos/types'

export interface TransformationResult {
  inputValue: number
  transformedValue: number
  description: string
}

function applySingle(value: number, config: TransformationConfig): { value: number; label: string } {
  switch (config.operation) {
    case 'NONE':
      return { value, label: 'raw' }
    case 'MULTIPLY':
      return {
        value: value * (config.factor ?? 1),
        label: `×${config.factor ?? 1}`,
      }
    case 'PERCENTAGE':
      return {
        value: value * ((config.factor ?? 100) / 100),
        label: `${config.factor ?? 100}%`,
      }
    case 'CAP':
      return {
        value: Math.min(value, config.cap ?? Infinity),
        label: `cap(${config.cap ?? '∞'})`,
      }
    default:
      return { value, label: 'unknown' }
  }
}

export function applyTransformationChain(
  inputValue: number,
  transformation: TransformationConfig | TransformationConfig[],
): TransformationResult {
  const chain = Array.isArray(transformation) ? transformation : [transformation]
  const steps: string[] = [String(inputValue)]

  let current = inputValue
  for (const step of chain) {
    const result = applySingle(current, step)
    current = result.value
    steps.push(`${result.label} → ${current}`)
  }

  return {
    inputValue,
    transformedValue: current,
    description: steps.join(' → '),
  }
}

export function extractValueFromPayload(
  payload: Record<string, unknown>,
  field?: string,
): number {
  if (!field) {
    const amount = payload['amount']
    if (typeof amount === 'number') return amount
    if (typeof amount === 'string') {
      const parsed = parseFloat(amount)
      if (!isNaN(parsed)) return parsed
    }
    return 0
  }

  const val = payload[field]
  if (typeof val === 'number') return val
  if (typeof val === 'string') {
    const parsed = parseFloat(val)
    if (!isNaN(parsed)) return parsed
  }
  return 0
}
