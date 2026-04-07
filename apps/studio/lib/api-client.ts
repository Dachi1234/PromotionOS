const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL ?? 'http://localhost:3000'

interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  meta?: { page: number; pageSize: number; totalItems: number; totalPages: number }
  error?: { code: string; message: string; details?: unknown }
}

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('studio_jwt')
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const token = this.getToken()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) ?? {}),
    }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const res = await fetch(`${ENGINE_URL}${path}`, { ...options, headers })

    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('studio_jwt')
        window.location.href = '/login'
      }
      throw new Error('Unauthorized')
    }

    const json = await res.json() as ApiResponse<T>
    if (!json.success && json.error) {
      throw new ApiError(json.error.code, json.error.message, res.status)
    }
    return json
  }

  get<T>(path: string) { return this.request<T>(path) }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined })
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined })
  }

  put<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined })
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' })
  }
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const api = new ApiClient()
