import fastify from 'fastify'
import { PrismaClient, Prisma, Status, Task } from '@prisma/client'

import type { HttpSpec, Server, TaskRule } from '../type'

interface Response<T = unknown> {
  200: T,
  '4xx': {
    error: string
    message: string
  },
  '5xx': {
    error: string
    message: string
  }
}

interface QueryPaging {
  size: number
  page: number
}

interface CreateTaskRequest {
  spec: HttpSpec
  status: Status
  rule: TaskRule
  protocol: string
  requestId: string
  createdTime: Date
  updatedTime: Date
}

type CreateTaskResponse = Response<{}>

interface StartTaskRequest {
  id: string
}

type StartTaskResponse = Response<{}>

interface StopTaskRequest {
  id: string
}

type StopTaskResponse = Response<{}>

interface TaskFilter {
  status?: Status
  protocol?: string
}

interface QueryTaskRequest {
  filter?: TaskFilter
  paging?: QueryPaging
}

type QueryTaskResponse = Response<{
  count: number
  tasks: Task[]
}>

export function createApiServer(port: number, db: PrismaClient): Server {
  const debugLog = process.env.DEBUG_LOG
  const server = fastify({ logger: debugLog === 'true' })

  //** token 检查 */
  server.addHook('preHandler', (request, reply, done) => {
    const apiToken = process.env.API_TOKEN
    if (typeof apiToken !== 'string') {
      return done()
    }

    // 从 Authorization 头部获取凭证
    const { authorization } = request.headers

    // 验证 Authorization 头部是否存在
    if (!authorization) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    // 解析 Authorization 头部
    const [type, token] = authorization.split(' ')

    // 验证凭证是否合法
    if (type !== 'Bearer' || token !== apiToken) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    done()
  })

  /** 创建任务 */
  server.post<{ Body: CreateTaskRequest, Reply: CreateTaskResponse }>('/create', async (request, reply) => {
    await db.task.create({
      data: {
        status: 'Ready',
        protocol: request.body.protocol,
        spec: request.body.spec as unknown as Prisma.JsonObject,
        rule: request.body.rule as unknown as Prisma.JsonObject
      }
    })
  })

  /** 开始任务 */
  server.post<{ Body: StartTaskRequest, Reply: StartTaskResponse }>('/start', async (request, reply) => {
    const task = await db.task.findFirst({ where: { id: request.body.id } })
    if (task == null) return reply.code(400).send({ error: 'Bad Request', message: 'Task not found' })
    await db.task.update({ where: { id: request.body.id }, data: { status: 'Ready' } })
  })

  /** 暂停任务 */
  server.post<{ Body: StopTaskRequest, Reply: StopTaskResponse }>('/stop', async (request, reply) => {
    const task = await db.task.findFirst({ where: { id: request.body.id } })
    if (task == null) return reply.code(400).send({ error: 'Bad Request', message: 'Task not found' })
    await db.task.update({ where: { id: request.body.id }, data: { status: 'Stopped' } })
  })

  /** 查询任务 */
  server.post<{ Body: QueryTaskRequest, Reply: QueryTaskResponse }>('/query', async (request, reply) => {
    const { filter, paging } = request.body

    const where: Prisma.TaskWhereInput = {}

    if (filter && filter.protocol) {
      where.protocol = filter.protocol
    }

    if (filter && filter.status) {
      where.status = filter.status
    }

    const count = await db.task.count({ where })

    const pageSize = paging?.size || 10
    const pageIndex = paging?.page || 1
    const tasks = await db.task.findMany({
      where,
      take: pageSize,
      skip: (pageIndex - 1) * pageSize,
      orderBy: { createdTime: 'desc' }
    })

    return reply.code(200).send({
      tasks,
      count
    })
  })

  function close() {
    return new Promise<void>((resolve) => {
      server.close(resolve)
    })
  }

  function start() {
    return new Promise<void>((resolve) => {
      server.listen({ port, host: '0.0.0.0' }, err => {
        if (err) {
          console.error(err)
          process.exit(1)
        }

        resolve()
      })
    })
  }

  return { start, close }
}
