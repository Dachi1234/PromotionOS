import { mkdir, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { randomUUID } from 'node:crypto'

/**
 * Thin storage abstraction — lets us keep the upload route ignorant of
 * where bytes actually land. LocalDiskStorage is for dev/self-hosted and
 * writes to `public/uploads` under the engine's CWD; it returns a public
 * URL that Fastify serves via @fastify/static.
 *
 * Swap `makeStorage()` to return a SupabaseStorage (or S3Storage) when
 * you're ready — the route and the client helper don't change.
 */

export interface StoredObject {
  /** Public URL the browser can load directly (absolute or relative). */
  url: string
  /** Server-side path / storage key, useful for deletion later. */
  key: string
  /** Bytes written. */
  size: number
  /** MIME type echoed back, convenient for clients. */
  contentType: string
}

export interface IStorage {
  save(opts: {
    buffer: Buffer
    filename: string
    contentType: string
    folder?: string
  }): Promise<StoredObject>
}

/**
 * Filesystem-backed storage. Files land under
 *   <engine-cwd>/public/uploads/<folder>/<uuid>.<ext>
 * and are served at
 *   <PUBLIC_BASE_URL>/uploads/<folder>/<uuid>.<ext>
 *
 * `PUBLIC_BASE_URL` defaults to the engine's own origin, which is fine as
 * long as the engine is reachable from the player's browser (it already
 * is — they call /api/v1/... directly).
 */
export class LocalDiskStorage implements IStorage {
  constructor(
    private readonly rootDir: string,
    private readonly publicBaseUrl: string,
  ) {}

  async save({ buffer, filename, contentType, folder = 'misc' }: {
    buffer: Buffer
    filename: string
    contentType: string
    folder?: string
  }): Promise<StoredObject> {
    const ext = sanitizeExt(extname(filename) || inferExt(contentType))
    const safeFolder = sanitizeFolder(folder)
    const id = randomUUID()
    const relKey = `${safeFolder}/${id}${ext}`
    const absPath = join(this.rootDir, relKey)

    await mkdir(join(this.rootDir, safeFolder), { recursive: true })
    await writeFile(absPath, buffer)

    return {
      url: `${this.publicBaseUrl}/uploads/${relKey}`,
      key: relKey,
      size: buffer.byteLength,
      contentType,
    }
  }
}

function sanitizeFolder(folder: string): string {
  // Only allow a-z, 0-9, dash; anything else gets dropped. Keeps the
  // caller from writing to ../../etc/shadow via a crafted folder value.
  const cleaned = folder.toLowerCase().replace(/[^a-z0-9-]/g, '')
  return cleaned.length > 0 ? cleaned : 'misc'
}

function sanitizeExt(ext: string): string {
  if (!ext.startsWith('.')) return ''
  const cleaned = ext.toLowerCase().replace(/[^.a-z0-9]/g, '')
  // Guard against absurdly long extensions (e.g. .tar.gz.tar.gz...).
  return cleaned.length > 10 ? '' : cleaned
}

function inferExt(contentType: string): string {
  switch (contentType) {
    case 'image/png': return '.png'
    case 'image/jpeg': return '.jpg'
    case 'image/webp': return '.webp'
    case 'image/gif': return '.gif'
    case 'image/svg+xml': return '.svg'
    default: return ''
  }
}

let _storage: IStorage | null = null

export function makeStorage(): IStorage {
  if (_storage) return _storage
  // Engine's CWD at runtime is the repo's apps/engine dir (tsx watch
  // src/server.ts) — `public/uploads` sits alongside `src` so rebuilds
  // don't wipe it.
  const rootDir = join(process.cwd(), 'public', 'uploads')
  const publicBaseUrl = (process.env.PUBLIC_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`).replace(/\/$/, '')
  _storage = new LocalDiskStorage(rootDir, publicBaseUrl)
  return _storage
}
