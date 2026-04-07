import type { z } from 'zod'
import type {
  eventTypeSchema,
  ingestEventSchema,
  listEventsQuerySchema,
} from '@promotionos/zod-schemas'

export type EventType = z.infer<typeof eventTypeSchema>
export type IngestEventInput = z.infer<typeof ingestEventSchema>
export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>
