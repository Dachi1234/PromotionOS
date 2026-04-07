import en from '@/messages/en.json'
import ka from '@/messages/ka.json'

const messages: Record<string, Record<string, Record<string, string>>> = { en, ka }

export function t(lang: string, key: string): string {
  const parts = key.split('.')
  if (parts.length !== 2) return key
  const [ns, k] = parts
  return messages[lang]?.[ns]?.[k] ?? messages['en']?.[ns]?.[k] ?? key
}
