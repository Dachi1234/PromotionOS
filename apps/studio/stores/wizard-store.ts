import { create } from 'zustand'

export type MechanicType = 'WHEEL' | 'WHEEL_IN_WHEEL' | 'LEADERBOARD' | 'LEADERBOARD_LAYERED' | 'MISSION' | 'PROGRESS_BAR' | 'CASHOUT'

export interface WizardMechanic {
  id: string
  type: MechanicType
  label: string
  config: Record<string, unknown>
  displayOrder: number
  isActive: boolean
  triggers: WizardTrigger[]
  aggregationRules: WizardAggregationRule[]
  rewardDefinitions: WizardRewardDefinition[]
}

export interface WizardTrigger {
  id: string
  eventType: string
  filters: Record<string, unknown>
}

export interface WizardAggregationRule {
  id: string
  sourceEventType: string
  metric: 'COUNT' | 'SUM' | 'AVERAGE'
  field?: string
  windowType: string
  windowSizeHours?: number
  transformation: { operation: string; parameter?: number }[]
}

export interface WizardRewardDefinition {
  id: string
  type: string
  config: Record<string, unknown>
  probabilityWeight?: number
  conditionConfig?: Record<string, unknown> | null
  rankRange?: { fromRank: number; toRank: number }
  stepId?: string
}

export interface ConditionNode {
  type?: string
  value?: unknown
  operator?: 'AND' | 'OR'
  conditions?: ConditionNode[]
}

export interface WizardDependency {
  id: string
  parentMechanicId: string
  childMechanicId: string
  unlockCondition: Record<string, unknown>
}

export interface WizardState {
  campaignId: string | null
  draftId: string | null
  currentStep: number
  lastSavedAt: string | null
  isDirty: boolean

  // Step 1: Basics
  name: string
  slug: string
  description: string
  startsAt: string
  endsAt: string
  currency: string

  // Step 2: Targeting
  targetingMode: 'all' | 'segment' | 'csv'
  conditionTree: ConditionNode | null
  csvPlayerIds: string[]

  // Step 3: Mechanics
  mechanics: WizardMechanic[]
  dependencies: WizardDependency[]

  // Step 6: Frontend
  canvasConfig: Record<string, unknown> | null

  // Actions
  setStep: (step: number) => void
  updateBasics: (data: Partial<Pick<WizardState, 'name' | 'slug' | 'description' | 'startsAt' | 'endsAt' | 'currency'>>) => void
  setTargeting: (mode: 'all' | 'segment' | 'csv', tree: ConditionNode | null) => void
  setCsvPlayerIds: (ids: string[]) => void
  addMechanic: (mechanic: WizardMechanic) => void
  updateMechanic: (id: string, data: Partial<WizardMechanic>) => void
  removeMechanic: (id: string) => void
  reorderMechanics: (ids: string[]) => void
  addDependency: (dep: WizardDependency) => void
  removeDependency: (id: string) => void
  setCanvasConfig: (config: Record<string, unknown> | null) => void
  markDirty: () => void
  markSaved: () => void
  reset: () => void
  hydrate: (data: Partial<WizardState>) => void
}

const initialState = {
  campaignId: null,
  draftId: null,
  currentStep: 1,
  lastSavedAt: null,
  isDirty: false,
  name: '',
  slug: '',
  description: '',
  startsAt: '',
  endsAt: '',
  currency: 'GEL',
  targetingMode: 'all' as const,
  conditionTree: null,
  csvPlayerIds: [],
  mechanics: [],
  dependencies: [],
  canvasConfig: null,
}

export const useWizardStore = create<WizardState>((set) => ({
  ...initialState,

  setStep: (step) => set({ currentStep: step }),

  updateBasics: (data) => set((s) => ({ ...s, ...data, isDirty: true })),

  setTargeting: (mode, tree) => set({ targetingMode: mode, conditionTree: tree, isDirty: true }),

  setCsvPlayerIds: (ids) => set({ csvPlayerIds: ids, isDirty: true }),

  addMechanic: (mechanic) => set((s) => ({
    mechanics: [...s.mechanics, mechanic],
    isDirty: true,
  })),

  updateMechanic: (id, data) => set((s) => ({
    mechanics: s.mechanics.map((m) => m.id === id ? { ...m, ...data } : m),
    isDirty: true,
  })),

  removeMechanic: (id) => set((s) => ({
    mechanics: s.mechanics.filter((m) => m.id !== id),
    dependencies: s.dependencies.filter((d) => d.parentMechanicId !== id && d.childMechanicId !== id),
    isDirty: true,
  })),

  reorderMechanics: (ids) => set((s) => ({
    mechanics: ids.map((id, i) => {
      const m = s.mechanics.find((m) => m.id === id)!
      return { ...m, displayOrder: i }
    }),
    isDirty: true,
  })),

  addDependency: (dep) => set((s) => ({ dependencies: [...s.dependencies, dep], isDirty: true })),
  removeDependency: (id) => set((s) => ({ dependencies: s.dependencies.filter((d) => d.id !== id), isDirty: true })),
  setCanvasConfig: (config) => set({ canvasConfig: config, isDirty: true }),
  markDirty: () => set({ isDirty: true }),
  markSaved: () => set({ isDirty: false, lastSavedAt: new Date().toISOString() }),
  reset: () => set(initialState),
  hydrate: (data) => set((s) => ({ ...s, ...data, isDirty: false })),
}))
