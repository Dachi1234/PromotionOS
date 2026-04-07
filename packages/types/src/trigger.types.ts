import type { z } from 'zod'
import type {
  triggerConfigSchema,
  triggerFilterSchema,
  eventTypeEnumSchema,
} from '@promotionos/zod-schemas'

export type TriggerConfig = z.infer<typeof triggerConfigSchema>
export type TriggerFilter = z.infer<typeof triggerFilterSchema>
export type EventTypeEnum = z.infer<typeof eventTypeEnumSchema>
