import type { EventRepository, ListEventsOptions } from './event.repository'
import type { IngestEventInput } from './event.schema'
import type { EventPipelineService } from '../../services/event-pipeline.service'

export class EventService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly pipeline: EventPipelineService | null = null,
  ) {}

  async ingestEvent(input: IngestEventInput) {
    const event = await this.eventRepository.create({
      playerId: input.playerId,
      campaignId: input.campaignId,
      eventType: input.eventType,
      payload: input.payload,
      occurredAt: input.occurredAt,
    })

    if (this.pipeline) {
      try {
        await this.pipeline.processEvent(event)
      } catch (err) {
        console.error('[EventService] Pipeline processing failed (event saved, will need re-fire):', err)
      }
    }

    return { eventId: event.id }
  }

  async listEvents(options: ListEventsOptions) {
    return this.eventRepository.list(options)
  }
}
