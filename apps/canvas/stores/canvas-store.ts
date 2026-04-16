import { create } from 'zustand'
import { DEFAULT_THEME, type ThemeId } from '@/lib/themes'

export interface BuilderMechanicReward {
  id: string
  mechanicId: string
  type: string
  config: Record<string, unknown>
}

export interface BuilderMechanic {
  id: string
  type: string
  label?: string
  config: Record<string, unknown>
  rewards: BuilderMechanicReward[]
}

interface CanvasState {
  sessionToken: string | null
  language: 'en' | 'ka'
  isBuilder: boolean
  isTestMode: boolean
  isAdminPreview: boolean
  campaignSlug: string | null
  campaignId: string | null
  builderMechanics: BuilderMechanic[]
  /** The active `data-theme` value — selects a full token bundle defined
   *  in `app/globals.css`. See `lib/themes.ts` for the catalog. */
  themeId: ThemeId
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
  setTestMode: (isTestMode: boolean) => void
  setAdminPreview: (isAdminPreview: boolean) => void
  setCampaignSlug: (slug: string | null) => void
  setCampaignId: (id: string | null) => void
  setBuilderMechanics: (mechanics: BuilderMechanic[]) => void
  setTheme: (theme: Partial<CanvasState['theme']>) => void
  setThemeId: (id: ThemeId) => void
}

export const useCanvasStore = create<CanvasState>((set) => ({
  sessionToken: null,
  language: 'ka',
  isBuilder: false,
  isTestMode: false,
  isAdminPreview: false,
  campaignSlug: null,
  campaignId: null,
  builderMechanics: [],
  themeId: DEFAULT_THEME,
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
  setTestMode: (isTestMode) => set({ isTestMode }),
  setAdminPreview: (isAdminPreview) => set({ isAdminPreview }),
  setCampaignSlug: (slug) => set({ campaignSlug: slug }),
  setCampaignId: (id) => set({ campaignId: id }),
  setBuilderMechanics: (mechanics) => set({ builderMechanics: mechanics }),
  setTheme: (partial) => set((s) => ({ theme: { ...s.theme, ...partial } })),
  setThemeId: (id) => set({ themeId: id }),
}))
