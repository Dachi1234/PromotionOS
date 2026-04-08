import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

import { buildApp } from './app'
import { startAllWorkers, stopAllWorkers } from './workers/index'
import { createBullMQConnection, createRedisClient } from './lib/redis'

const PORT = parseInt(process.env.PORT ?? '3000', 10)
const HOST = process.env.HOST ?? '0.0.0.0'

async function start(): Promise<void> {
  const app = await buildApp()

  if (process.env.ENABLE_WORKERS === 'true') {
    const bullmqRedis = createBullMQConnection()
    if (!bullmqRedis) {
      app.log.warn(
        'ENABLE_WORKERS=true but REDIS_URL is not set — workers will not start',
      )
    } else {
      const redisClient = createRedisClient()
      const workers = startAllWorkers(bullmqRedis, app.db, redisClient)
      app.decorate('rewardQueue', workers.rewardExecutor.rewardQueue)
      app.log.info('1 BullMQ worker + 4 timer-based schedulers started')
    }
  }

  app.addHook('onClose', async () => {
    await stopAllWorkers()
  })

  try {
    await app.listen({ port: PORT, host: HOST })
    app.log.info(`PromoEngine running at http://${HOST}:${PORT}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason)
  process.exit(1)
})

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err)
  process.exit(1)
})

start()
