import { Task } from '@prisma/client'

import type { HttpSpec, SenderResult, Server } from '@/type'
import { createHttpSender } from './http'

interface SenderManager extends Server {
  send(task: Task): Promise<SenderResult>
}

export function createSenderManager(): SenderManager {
  const http = createHttpSender()

  return {
    async send(task) {
      if (task.protocol === 'http') {
        const spec = task.spec! as unknown as HttpSpec
        return http.send(spec)
      }

      return {
        success: false,
        message: 'unsupported protocol'
      }
    },
    async start() {
      return
    },
    async close() {
      return
    }
  }
}
