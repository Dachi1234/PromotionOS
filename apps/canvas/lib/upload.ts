import { ENGINE_URL } from './api-client'

/**
 * Uploads a single image file through the engine's `/api/v1/admin/uploads`
 * route and returns the public URL. Replaces the old pattern of stuffing
 * a base64 data URL into canvas JSON — those payloads exceeded Fastify's
 * 1 MB body limit and crashed canvas-config PUTs.
 *
 * Auth: the admin JWT lives in `localStorage.studio_jwt` (same bridge
 * the studio wizard uses when it opens the canvas builder in an iframe).
 */
export async function uploadAdminImage(file: File, folder = 'canvas'): Promise<string> {
  const jwt = typeof window !== 'undefined' ? localStorage.getItem('studio_jwt') : null
  if (!jwt) {
    throw new Error('Not authenticated. Reopen the canvas from the Studio wizard.')
  }

  const form = new FormData()
  form.append('file', file)

  const res = await fetch(`${ENGINE_URL}/api/v1/admin/uploads?folder=${encodeURIComponent(folder)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: form,
  })

  const json = (await res.json()) as { success: boolean; data?: { url: string }; error?: { message?: string } }
  if (!res.ok || !json.success || !json.data?.url) {
    throw new Error(json.error?.message ?? `Upload failed (${res.status})`)
  }
  return json.data.url
}
