import dayjs from 'dayjs'
import type { Server, TaskRule } from '@/type'
import { PrismaClient, Status, Task, TaskRecord } from '@prisma/client'
import { promiseToLog, generatePeriodicDistribution, getCurrentDateDistribution } from '@/helper'

import { createSenderManager } from './sender'

type CreateTaskRecordData = Omit<TaskRecord, 'id' | 'taskId'>

// 根据 task 的 rule 信息返回当前轮次应该执行的次数
function getShouldProcessCount(task: Task): number {
  const rule = task.rule as unknown as TaskRule

  // if (rule && rule.type === 'scheduled') {
  //   const currentTime = dayjs(new Date())
  //   const processingTime = dayjs(rule.date)
  //   if (processingTime.isBefore(currentTime)) return 1
  // }

  // 模拟人类的生活习惯
  if (rule && rule.type === 'periodicDistribution') {
    const distribution = generatePeriodicDistribution(rule, 10)
    return getCurrentDateDistribution(distribution, rule.cycle)
  }

  throw new Error('unsupported rule type')
}

export function createTaskScheduler(db: PrismaClient): Server {
  let intervalId: NodeJS.Timeout | undefined
  const senderManager = createSenderManager()

  async function updateTaskStatus(task: Task, status: Status) {
    await db.task.update({
      data: { status },
      where: { id: task.id },
      select: { status: true },
    })
  }

  async function createTaskRecord(task: Task, record: CreateTaskRecordData) {
    await db.taskRecord.create({
      data: {
        taskId: task.id,
        status: record.status,
        result: record.result!,
        startTime: record.startTime,
        completedTime: record.completedTime,
      }
    })
  }

  async function processTask(task: Task) {
    await updateTaskStatus(task, 'Processing')

    const startTime = new Date()
    senderManager.send(task)
      .then(async result => {
        promiseToLog(createTaskRecord(task, {
          startTime,
          status: 'Successful',
          result: result as any,
          completedTime: new Date(),
        }))
      })
      .catch(async err => {
        promiseToLog(createTaskRecord(task, {
          startTime,
          result: err,
          status: 'Failed',
          completedTime: new Date(),
        }))
      })
      .finally(async () => {
        promiseToLog(updateTaskStatus(task, 'Ready'))
      })
  }

  async function start() {
    if (intervalId) return
    intervalId = setInterval(async () => {
      // list all Ready tasks
      const tasks = await db.task.findMany({
        where: { status: 'Ready' }
      })

      for (let index = 0; index < tasks.length; index++) {
        const task = tasks[index]
        const count = getShouldProcessCount(task)
        for (let processIndex = 0; processIndex < count; processIndex++) {
          processTask(task)
        }
      }
    }, 1000)
  }

  async function close() {
    if (intervalId) clearInterval(intervalId)
    intervalId = undefined
  }

  return { start, close }
}
