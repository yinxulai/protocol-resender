export interface Server {
  close: () => Promise<void>
  start: () => Promise<void>
}

export interface SenderResult {
  success: boolean
  message: string
}

export interface Sender<Spec> {
  send(spec: Spec): Promise<SenderResult>
}

/** 定时任务；在到达指定时间后执行 */
// export interface TaskScheduledRule {
//   type: 'scheduled'
//   date: string // ISO 8601 标准 例如: 2023-08-03T14:30:00Z 或 2023-08-03T14:30:00+08:00 
// }

/** 周期任务；在到达指定时间后执行 */
// export interface TaskPeriodicRule {
//   type: 'periodic'
//   date: string // ISO 8601 标准 例如: 2023-08-03T14:30:00Z 或 2023-08-03T14:30:00+08:00 
//   cycle: 'day' | 'week' | 'month'
// }

/** 周期分布；根据指定分布周期性执行 */
export interface TaskPeriodicDistributionRule {
  type: 'periodicDistribution'
  amount: number
  cycle: 'day' | 'week' | 'month'
  distribution: number[] // 分布范围，表示在 cycle 范围内的数据分布情况，正常来说累积值应该为 1， 例如: [0, 0.1, 0.1, 0.2, 0.3, 0.5, 0.7, 0.3]
}

export type TaskRule = TaskPeriodicDistributionRule

export interface HttpSpec {
  url: string
  host?: string
  method: string
  headers?: Record<string, string>

  // 是否接收完整响应，默认 false
  receiveResponse?: boolean

  // 超时配置，默认 10s
  timeout?: number

  // 重定向配置
  maxRedirects?: number
  followRedirects?: boolean
}
