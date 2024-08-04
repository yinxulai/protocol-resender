import { TaskPeriodicDistributionRule } from './type'

export function getRandomHighPort() {
  // 定义可用的端口范围
  const MIN_PORT = 49152
  const MAX_PORT = 65535

  // 生成随机端口号
  return Math.floor(Math.random() * (MAX_PORT - MIN_PORT + 1)) + MIN_PORT
}

export function promiseToLog<T>(promise: Promise<T>): void {
  promise.catch(err => console.error(err))
}

/**
 * 根据 distribution 生成按指定时间间距数据分布数组
 * @param rule - TaskPeriodicDistributionRule 对象
 * @param interval - 指定的时间间距，单位为秒，应该是 10s 的整倍数
 * @returns 生成的数据分布数组
 */
export function generatePeriodicDistribution(rule: TaskPeriodicDistributionRule, interval: number): number[] {
  function getTotalSeconds(period: string): number {
    switch (period) {
      case 'day':
        return 24 * 60 * 60 // 1 day = 86400 seconds
      case 'week':
        return 7 * 24 * 60 * 60 // 1 week = 604800 seconds
      case 'month':
        const currentDate = new Date()
        const currentYear = currentDate.getFullYear()
        const currentMonth = currentDate.getMonth() + 1 // 月份从 0 开始计数
        const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()
        return daysInMonth * 24 * 60 * 60 // 当前月的总秒数
      default:
        throw new Error('Invalid period. Please use "day", "week", or "month".')
    }
  }

  /**
   * 线性插值
   * @param a - 起点值
   * @param b - 终点值
   * @param t - 插值参数 (0 <= t <= 1)
   */
  function lerp(a: number, b: number, t: number): number {
    return a + t * (b - a)
  }

  /**
   * 将误差随机分布到数组的所有范围上
   * @param array - 分布数组
   * @param error - 需要分配的误差
   * @returns 修改后的数组
   */
  function distributeErrorRandomly(array: number[], error: number): number[] {
    const totalIndices = array.length

    // 获取随机整数
    function getRandomInt(min: number, max: number): number {
      return Math.floor(Math.random() * (max - min + 1)) + min
    }

    // 分配正误差
    while (error > 0) {
      const randomIndex = getRandomInt(0, totalIndices - 1)
      array[randomIndex] += 1
      error -= 1
    }

    // 分配负误差
    while (error < 0) {
      const randomIndex = getRandomInt(0, totalIndices - 1)
      if (array[randomIndex] > 0) { // 确保不减成负数
        array[randomIndex] -= 1
        error += 1
      }
    }

    return array
  }

  let cycleSeconds = getTotalSeconds(rule.cycle)

  if (cycleSeconds % interval !== 0) {
    throw new Error('Interval should be a divisor of the cycle period')
  }

  const steps = cycleSeconds / interval // 计算时间间距内的步数

  const distributionArray: number[] = new Array(steps).fill(0)
  const distributionStep = rule.distribution.length
  const multiplier = steps / distributionStep

  let totalAllocated = 0
  for (let i = 0; i < distributionStep; i++) {
    const start = Math.round(i * multiplier)
    const end = Math.round((i + 1) * multiplier)
    const value = (rule.distribution[i % rule.distribution.length] * rule.amount)
    const nextValue = (rule.distribution[(i + 1) % rule.distribution.length] * rule.amount)

    for (let j = start; j < end; j++) {
      const t = (j - start) / (end - start)
      const interpolatedValue = lerp(value, nextValue, t)
      const allocated = Math.round(interpolatedValue / (end - start))

      distributionArray[j] += allocated
      totalAllocated += allocated
    }
  }

  return  distributeErrorRandomly(distributionArray, rule.amount - totalAllocated)
}
