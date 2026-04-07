import type { Queue } from 'bullmq'
import type { EventRepository, ListEventsOptions } from './event.repository'
import type { IngestEventInput } from './event.schema'

export class EventService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly ingestionQueue: Queue | null = null,
  ) {}

  async ingestEvent(input: IngestEventInput) {
    const event = await this.eventRepository.create({
      playerId: input.playerId,
      campaignId: input.campaignId,
      eventType: input.eventType,
      payload: input.payload,
      occurredAt: input.occurredAt,
    })

    if (this.ingestionQueue) {
      try {
        await this.ingestionQueue.add('process-event', {
          rawEventId: event.id,
        })
      } catch (err) {
        console.warn('[EventService] Failed to enqueue event to BullMQ, fallback sweep will catch it:', err)
      }
    }

    return { eventId: event.id }
  }

  async listEvents(options: ListEventsOptions) {
    return this.eventRepository.list(options)
  }
}
