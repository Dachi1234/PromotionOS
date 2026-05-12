import { create } from 'zustand'
import { DEFAULT_THEME, type ThemeId } from '@/lib/themes'

export interface BuilderMechanicReward {
  id: string
  mechanicId: string
  type: string
  config: Record<string, unknown>
  /** Optional compound-condition tied to this reward. Populated for
   *  wheel-in-wheel style mechanics where each reward has a paired
   *  follow-up action (e.g. "Wager $30 within 24h" to unlock a bonus).
   *  The builder panel reads `label` / `condition_type` to render the
   *  wedge → condition preview on image wheels. */
  conditionConfig?: {
    condition_type?: string
    target_value?: number
    time_limit_hours?: number
    label?: string
  } | null
}

export interface BuilderMechanic {
  id: string
  type: string
  label?: string
  config: Record<string, unknown>
  rewards: BuilderMechanicReward[]
}

/** Responsive breakpoint the renderer is currently targeting.
 *  - In runtime: derived from viewport width.
 *  - In the builder: derived from the device-mode picker (phone → mobile,
 *    tablet/desktop/both → desktop). Blocks read overrides from the node's
 *    `_mobile` bucket when this is 'mobile', falling back to the base props. */
export type ResponsiveBreakpoint = 'mobile' | 'desktop'

interface CanvasState {
  sessionToken: string | null
  language: 'en' | 'ka'
  isBuilder: boolean
  isTestMode: boolean
  isAdminPreview: boolean
  campaignSlug: string | null
  campaignId: string | null
  builderMechanics: BuilderMechanic[]
  /** The breakpoint currently driving block rendering + reads.
   *  Default 'desktop' so SSR/legacy code paths keep behaving as before. */
  currentBreakpoint: ResponsiveBreakpoint
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
  setCurrentBreakpoint: (bp: ResponsiveBreakpoint) => void
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
  currentBreakpoint: 'desktop',
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
  setCurrentBreakpoint: (bp) => set({ currentBreakpoint: bp }),
}))
