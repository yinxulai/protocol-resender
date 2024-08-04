import { generatePeriodicDistribution } from './helper'
import { TaskPeriodicDistributionRule } from './type'

import { getRandomHighPort } from './helper'

describe('getRandomHighPort', () => {
  it('should generate a random port within the valid range', () => {
    const MIN_PORT = 49152
    const MAX_PORT = 65535

    for (let i = 0; i < 1000; i++) {
      const port = getRandomHighPort()
      expect(port).toBeGreaterThanOrEqual(MIN_PORT)
      expect(port).toBeLessThanOrEqual(MAX_PORT)
    }
  })

  it('should generate different ports on multiple calls', () => {
    const ports = new Set()
    for (let i = 0; i < 1000; i++) {
      ports.add(getRandomHighPort())
    }
    // Check if there are multiple unique ports
    expect(ports.size).toBeGreaterThan(1)
  })
})


describe('generatePeriodicDistribution', () => {
  test('should generate correct distribution array for daily cycle with 10 minute interval', () => {
    const rule: TaskPeriodicDistributionRule = {
      type: 'periodic',
      amount: 1000,
      cycle: 'day',
      distribution: [0, 0.1, 0.1, 0.2, 0.3, 0.1, 0.1, 0.1]
    }

    const interval = 10 * 60 // 10分钟
    const result = generatePeriodicDistribution(rule, interval)

    const totalSum = result.reduce((sum, value) => sum + value, 0)
    expect(totalSum).toBeCloseTo(1000, 5)

    const nonZeroValues = result.filter(value => value > 0)
    expect(nonZeroValues.length).toBeGreaterThan(0)
  })

  test('should distribute error randomly to non-zero values', () => {
    const rule: TaskPeriodicDistributionRule = {
      type: 'periodic',
      amount: 100,
      cycle: 'day',
      distribution: [0, 0.1, 0.1, 0.2, 0.3, 0.1, 0.1, 0.1]
    }

    const interval = 10 * 60 // 10分钟
    const result = generatePeriodicDistribution(rule, interval)

    const totalSum = result.reduce((sum, value) => sum + value, 0)
    expect(totalSum).toBeCloseTo(100, 5)

    const nonZeroValues = result.filter(value => value > 0)
    expect(nonZeroValues.length).toBeGreaterThan(0)
  })
})
