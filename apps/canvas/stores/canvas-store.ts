import { create } from 'zustand'

interface CanvasState {
  sessionToken: string | null
  language: 'en' | 'ka'
  isBuilder: boolean
  campaignSlug: string | null
  campaignId: string | null
  theme: {
    primaryColor: string
    secondaryColor: string
    backgroundColor: string
    fontFamily: string
    borderRadius: string
    textColor: string
    cardBg: string
    cardBorder: string
    cardShadow: string
  }
  setSessionToken: (token: string | null) => void
  setLanguage: (lang: 'en' | 'ka') => void
  setBuilder: (isBuilder: boolean) => void
  setCampaignSlug: (slug: string | null) => void
  setCampaignId: (id: string | null) => void
  setTheme: (theme: Partial<CanvasState['theme']>) => void
}

export const useCanvasStore = create<CanvasState>((set) => ({
  sessionToken: null,
  language: 'ka',
  isBuilder: false,
  campaignSlug: null,
  campaignId: null,
  theme: {
    primaryColor: '#7c3aed',
    secondaryColor: '#6366f1',
    backgroundColor: '#0f172a',
    fontFamily: 'Inter, sans-serif',
    borderRadius: '8px',
    textColor: '#f8fafc',
    cardBg: '#1e293b',
    cardBorder: '#334155',
    cardShadow: 'md',
  },
  setSessionToken: (token) => set({ sessionToken: token }),
  setLanguage: (language) => set({ language }),
  setBuilder: (isBuilder) => set({ isBuilder }),
  setCampaignSlug: (slug) => set({ campaignSlug: slug }),
  setCampaignId: (id) => set({ campaignId: id }),
  setTheme: (partial) => set((s) => ({ theme: { ...s.theme, ...partial } })),
}))
