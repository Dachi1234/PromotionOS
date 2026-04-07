export interface WindowBounds {
  windowStart: Date
  windowEnd: Date
}

export function calculateWindowBounds(
  windowType: string,
  referenceTime: Date,
  campaignStartsAt?: Date,
  campaignEndsAt?: Date,
  windowSizeHours?: number | null,
): WindowBounds {
  switch (windowType) {
    case 'campaign':
      if (!campaignStartsAt || !campaignEndsAt) {
        throw new Error('campaign window requires campaignStartsAt and campaignEndsAt')
      }
      return { windowStart: campaignStartsAt, windowEnd: campaignEndsAt }

    case 'daily': {
      const start = new Date(referenceTime)
      start.setUTCHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setUTCDate(end.getUTCDate() + 1)
      return { windowStart: start, windowEnd: end }
    }

    case 'weekly': {
      const start = new Date(referenceTime)
      const day = start.getUTCDay()
      const diff = day === 0 ? 6 : day - 1
      start.setUTCDate(start.getUTCDate() - diff)
      start.setUTCHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setUTCDate(end.getUTCDate() + 7)
      return { windowStart: start, windowEnd: end }
    }

    case 'hourly': {
      const start = new Date(referenceTime)
      start.setUTCMinutes(0, 0, 0)
      const end = new Date(start)
      end.setUTCHours(end.getUTCHours() + 1)
      return { windowStart: start, windowEnd: end }
    }

    case 'minute': {
      const start = new Date(referenceTime)
      start.setUTCSeconds(0, 0)
      const end = new Date(start)
      end.setUTCMinutes(end.getUTCMinutes() + 1)
      return { windowStart: start, windowEnd: end }
    }

    case 'rolling': {
      const hours = windowSizeHours ?? 24
      const end = new Date(referenceTime)
      const start = new Date(end.getTime() - hours * 60 * 60 * 1000)
      return { windowStart: start, windowEnd: end }
    }

    default:
      throw new Error(`Unknown window type: ${windowType}`)
  }
}
