
import { PrismaClient } from '@prisma/client'
import { createApiServer } from './api-server'

import pkg from '../package.json'
import { createTaskScheduler } from './task-scheduler'

console.log("Version:", pkg.version)

const datasourceUrl = process.env.DATABASE_URL
const apiPort = parseInt(process.env.API_PORT!) || 3000

const db = new PrismaClient({ datasourceUrl })

const taskScheduler = createTaskScheduler(db)
const apiServer = createApiServer(apiPort, db)

taskScheduler.start().then(() => console.log('task scheduler started'))
apiServer.start().then(() => console.log(`api server started on port ${apiPort}`))

process.on('SIGINT', async () => {
  await taskScheduler.close()
  await apiServer.close()
  db.$disconnect()
  process.exit(0)
})
