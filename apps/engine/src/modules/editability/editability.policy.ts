/**
 * Centralized editability policy for campaigns and their child entities.
 *
 * Before this module there were two divergent gates:
 *
 *   • `campaign.service.ts` — blocked edits on `active` entirely (must
 *     pause first), blocked all edits on `ended` / `archived`.
 *   • `mechanic.routes.ts#assertCampaignEditable` — blocked only
 *     `ended` / `archived`, leaving mechanic / reward-def / rule edits
 *     wide open on live campaigns.
 *
 * The mismatch meant operators could mutate mechanic config on a running
 * campaign (changing `ranking_metric`, reshaping aggregation rules, etc.)
 * even though the campaign itself was "locked". This module replaces
 * both gates with a single policy:
 *
 *   draft / scheduled → all edits allowed (structural + tweak)
 *   active  / paused  → tweaks only   (operational knobs, no shape change)
 *   ended   / archived → no edits
 *
 * Rationale — "tweaks-only" on live campaigns is the minimum set of
 * adjustments an operator can make without invalidating in-flight
 * player state:
 *
 *   • `displayOrder`  — pure presentation
 *   • `isActive`      — enabling/disabling a mechanic from gameplay
 *                       (existing player_campaign_stats stay valid;
 *                       stops further contribution)
 *   • `probabilityWeight` — reshapes reward distribution going forward;
 *     past rewards are not retroactively altered
 *   • `conditionConfig`   — reward eligibility tweaks; same rationale
 *
 * A *structural* change — adding/removing a mechanic, changing a metric
 * key, adding an aggregation rule — would require back-filling or
 * invalidating player_campaign_stats rows, which we don't have a story
 * for yet. Forcing those into draft/scheduled is the conservative
 * default.
 */

import { AppError } from '../../lib/errors'

export type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'ended'
  | 'archived'

export type EditKind = 'structural' | 'tweak'

export interface EditAction {
  /** Whether the edit alters structure (create/delete/shape) or is operational. */
  kind: EditKind
  /**
   * Stable, dotted identifier for the action — logged verbatim into
   * `campaign_audit_log.action_id`. Keep these unique so a log search
   * like `action_id = 'mechanic.config.update'` is meaningful.
   */
  actionId: string
}

export function canEdit(status: CampaignStatus, kind: EditKind): boolean {
  if (status === 'ended' || status === 'archived') return false
  if (status === 'active' || status === 'paused') return kind === 'tweak'
  return true // draft / scheduled
}

/**
 * Raise an AppError if the action is not permitted for the given status.
 * The error code distinguishes the two "no" cases:
 *
 *   CAMPAIGN_IMMUTABLE        — status is ended/archived; nothing can change
 *   CAMPAIGN_LOCKED_STRUCTURAL — status is active/paused; operational tweaks
 *                                are fine, but structural edits require
 *                                reverting to draft/scheduled first
 */
export function assertCanEdit(
  status: CampaignStatus,
  action: EditAction,
): void {
  if (canEdit(status, action.kind)) return

  if (status === 'ended' || status === 'archived') {
    throw new AppError(
      'CAMPAIGN_IMMUTABLE',
      `Campaign with status "${status}" cannot be modified`,
      409,
    )
  }
  // status is 'active' | 'paused' and action.kind is 'structural'
  throw new AppError(
    'CAMPAIGN_LOCKED_STRUCTURAL',
    'Structural edits are not allowed on active or paused campaigns. ' +
      'Only operational tweaks (displayOrder, isActive, probabilityWeight, ' +
      'conditionConfig) are permitted. To change structure, return the ' +
      'campaign to draft.',
    409,
  )
}

/**
 * Classify a mechanic PUT patch as tweak or structural.
 *
 * Tweak fields: `displayOrder`, `isActive`. Everything else — notably
 * `config` (which drives aggregation-rule inference) and `type` (not
 * currently mutable but defensive) — is structural.
 */
export function classifyMechanicPatch(patch: {
  config?: unknown
  type?: unknown
  displayOrder?: unknown
  isActive?: unknown
}): EditKind {
  if (patch.config !== undefined) return 'structural'
  if (patch.type !== undefined) return 'structural'
  return 'tweak'
}

/**
 * Classify a reward-definition PUT patch as tweak or structural.
 *
 * Tweak fields: `probabilityWeight`, `conditionConfig`. A `type` or
 * `config` change reshapes what the reward actually gives the player
 * and is structural.
 */
export function classifyRewardDefinitionPatch(patch: {
  type?: unknown
  config?: unknown
  probabilityWeight?: unknown
  conditionConfig?: unknown
}): EditKind {
  if (patch.type !== undefined) return 'structural'
  if (patch.config !== undefined) return 'structural'
  return 'tweak'
}
