import type { Queue } from 'bullmq'
import type { Mechanic } from '@promotionos/db'
import type { MissionResult, ClaimResult, MissionStepState } from '@promotionos/types'
import type { PlayerMechanicStateRepository } from '../../repositories/player-mechanic-state.repository'
import type { PlayerCampaignStatsRepository } from '../../repositories/player-campaign-stats.repository'
import type { PlayerRewardRepository } from '../../repositories/player-reward.repository'
import { AppError } from '../../lib/errors'

interface MissionStep {
  step_id: string
  order: number
  title: string
  metric_type: string
  target_value: number
  time_limit_hours: number
  reward_definition_id: string
}

interface MissionConfig {
  execution_mode: 'sequential' | 'parallel'
  steps: MissionStep[]
}

interface MissionState {
  steps: Record<string, MissionStepState>
}

export class MissionService {
  constructor(
    private readonly stateRepo: PlayerMechanicStateRepository,
    private readonly statsRepo: PlayerCampaignStatsRepository,
    private readonly playerRewardRepo: PlayerRewardRepository,
    private readonly rewardExecutionQueue: Queue,
  ) {}

  async handleAction(
    playerId: string,
    mechanic: Mechanic,
    action: { type: string; stepId?: string },
  ): Promise<MissionResult | ClaimResult> {
    if (action.type === 'claim-step' && action.stepId) {
      return this.claimStep(playerId, mechanic, action.stepId)
    }
    return this.getProgress(playerId, mechanic)
  }

  async getProgress(playerId: string, mechanic: Mechanic): Promise<MissionResult> {
    const config = mechanic.config as MissionConfig
    const missionState = await this.getOrInitState(playerId, mechanic)

    const stepResults = config.steps
      .sort((a, b) => a.order - b.order)
      .map((step) => {
        const stepState = missionState.steps[step.step_id]
        const current = stepState?.current_value ?? 0
        const target = step.target_value
        return {
          stepId: step.step_id,
          title: step.title,
          status: stepState?.status ?? 'locked',
          currentValue: current,
          targetValue: target,
          percentage: Math.min((current / target) * 100, 100),
        }
      })

    return {
      type: 'mission',
      executionMode: config.execution_mode,
      steps: stepResults,
    }
  }

  async evaluateProgress(playerId: string, mechanic: Mechanic, _referenceTime?: Date): Promise<void> {
    const config = mechanic.config as MissionConfig
    const missionState = await this.getOrInitState(playerId, mechanic)

    for (const step of config.steps) {
      const stepState = missionState.steps[step.step_id]
      if (!stepState || stepState.status !== 'active') continue

      if (stepState.expires_at && new Date(stepState.expires_at) < new Date()) {
        stepState.status = 'expired'
        // Persist expiration to database
        await this.stateRepo.upsert(playerId, mechanic.id, missionState)
        continue
      }

      const stat = await this.statsRepo.findPlayerStat(
        playerId,
        mechanic.campaignId,
        mechanic.id,
        step.metric_type,
        'campaign',
      )

      const currentValue = stat ? Number(stat.value) : 0
      stepState.current_value = currentValue

      if (currentValue >= step.target_value && stepState.status === 'active') {
        stepState.status = 'completed'
        stepState.completed_at = new Date().toISOString()
      }
    }

    await this.stateRepo.upsert(playerId, mechanic.id, missionState)
  }

  async claimStep(
    playerId: string,
    mechanic: Mechanic,
    stepId: string,
  ): Promise<ClaimResult> {
    const config = mechanic.config as MissionConfig
    const missionState = await this.getOrInitState(playerId, mechanic)

    const step = config.steps.find((s) => s.step_id === stepId)
    if (!step) {
      throw new AppError('STEP_NOT_FOUND', `Step ${stepId} not found`, 404)
    }

    const stepState = missionState.steps[stepId]
    if (stepState?.expires_at && new Date(stepState.expires_at) < new Date()) {
      throw new AppError('STEP_EXPIRED', `Step ${stepId} has expired`, 400)
    }
    if (!stepState || stepState.status !== 'completed') {
      throw new AppError('STEP_NOT_CLAIMABLE', `Step ${stepId} is not completed`, 400)
    }

    stepState.status = 'claimed'
    stepState.claimed_at = new Date().toISOString()

    if (config.execution_mode === 'sequential') {
      this.activateNextStep(config, missionState, step.order)
    }

    await this.stateRepo.upsert(playerId, mechanic.id, missionState)

    const playerReward = await this.playerRewardRepo.create({
      playerId,
      campaignId: mechanic.campaignId,
      mechanicId: mechanic.id,
      rewardDefinitionId: step.reward_definition_id,
      status: 'pending',
      grantedAt: new Date(),
    })

    await this.rewardExecutionQueue.add('execute-reward', {
      playerRewardId: playerReward.id,
    })

    return {
      type: 'claim',
      playerRewardId: playerReward.id,
      rewardType: 'pending',
      status: 'pending',
    }
  }

  private async getOrInitState(
    playerId: string,
    mechanic: Mechanic,
  ): Promise<MissionState> {
    const existing = await this.stateRepo.findByPlayerAndMechanic(playerId, mechanic.id)
    if (existing && existing.state) {
      return existing.state as MissionState
    }

    const config = mechanic.config as MissionConfig
    const steps: Record<string, MissionStepState> = {}
    const sorted = [...config.steps].sort((a, b) => a.order - b.order)

    for (const step of sorted) {
      const isFirst = step.order === sorted[0]!.order
      const isActive = config.execution_mode === 'parallel' || isFirst
      const now = new Date()

      steps[step.step_id] = {
        status: isActive ? 'active' : 'locked',
        activated_at: isActive ? now.toISOString() : null,
        completed_at: null,
        claimed_at: null,
        expires_at: isActive
          ? new Date(now.getTime() + step.time_limit_hours * 3600_000).toISOString()
          : null,
        current_value: 0,
        target_value: step.target_value,
      }
    }

    const state: MissionState = { steps }
    await this.stateRepo.upsert(playerId, mechanic.id, state)
    return state
  }

  private activateNextStep(
    config: MissionConfig,
    state: MissionState,
    currentOrder: number,
  ): void {
    const sorted = [...config.steps].sort((a, b) => a.order - b.order)
    const nextStep = sorted.find((s) => s.order > currentOrder)
    if (!nextStep) return

    const stepState = state.steps[nextStep.step_id]
    if (!stepState || stepState.status !== 'locked') return

    const now = new Date()
    stepState.status = 'active'
    stepState.activated_at = now.toISOString()
    stepState.expires_at = new Date(now.getTime() + nextStep.time_limit_hours * 3600_000).toISOString()
  }
}
