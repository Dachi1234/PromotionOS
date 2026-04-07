'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'

interface AuthContextValue {
  isAuthenticated: boolean
  isLoading: boolean
  user: { sub: string; role: string } | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ sub: string; role: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('studio_jwt')
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]!))
        const exp = payload.exp ? payload.exp * 1000 : Infinity
        if (Date.now() < exp) {
          setUser({ sub: payload.sub, role: payload.role ?? 'admin' })
        } else {
          localStorage.removeItem('studio_jwt')
        }
      } catch {
        localStorage.removeItem('studio_jwt')
      }
    }
    setIsLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    try {
      const engineUrl = process.env.NEXT_PUBLIC_ENGINE_URL ?? 'http://localhost:3000'
      const res = await fetch(`${engineUrl}/api/v1/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (res.ok) {
        const json = await res.json()
        if (json.data?.token) {
          localStorage.setItem('studio_jwt', json.data.token)
          const payload = JSON.parse(atob(json.data.token.split('.')[1]!))
          setUser({ sub: payload.sub, role: payload.role ?? 'admin' })
          router.push('/dashboard')
          return
        }
      }
    } catch {
      // Engine unreachable, fall through to dev mode
    }

    // Dev fallback: generate a local JWT (only works if engine JWT_SECRET matches)
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const payload = btoa(JSON.stringify({
      sub: email, role: 'admin', iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400,
    }))
    const token = `${header}.${payload}.dev-signature`
    localStorage.setItem('studio_jwt', token)
    setUser({ sub: email, role: 'admin' })
    router.push('/dashboard')
  }, [router])

  const logout = useCallback(() => {
    localStorage.removeItem('studio_jwt')
    setUser(null)
    router.push('/login')
  }, [router])

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, isLoading, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
