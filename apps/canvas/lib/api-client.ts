const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL ?? 'http://localhost:3000'

export async function publicApi<T>(path: string, sessionToken: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'x-session-token': sessionToken,
    ...((options.headers as Record<string, string>) ?? {}),
  }
  if (options.body) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${ENGINE_URL}${path}`, { ...options, headers })
  const json = await res.json()
  if (!json.success) {
    const msg = json.error?.message ?? 'API error'
    throw new Error(res.status === 403 ? `403: ${msg}` : msg)
  }
  return json.data as T
}

export async function adminApi<T>(path: string, jwt: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${jwt}`,
    ...((options.headers as Record<string, string>) ?? {}),
  }
  if (options.body) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${ENGINE_URL}${path}`, { ...options, headers })
  const json = await res.json()
  if (!json.success) throw new Error(json.error?.message ?? 'API error')
  return json.data as T
}
