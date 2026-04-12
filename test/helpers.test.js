import test from 'node:test'
import assert from 'node:assert/strict'
import { Chart } from 'chart.js'

import { formatLocalDate, formatLocalMonth } from '../src/utils/date.js'
import { getRoleTotalsByType } from '../src/utils/detailSummary.js'
import { registerChartPageCharts } from '../src/utils/chartPageCharts.js'

test('formatLocalDate returns local calendar date for provided Date', () => {
  const value = new Date(2026, 0, 1, 0, 30, 0)
  assert.equal(formatLocalDate(value), '2026-01-01')
})

test('formatLocalMonth returns local calendar month for provided Date', () => {
  const value = new Date(2026, 0, 1, 0, 30, 0)
  assert.equal(formatLocalMonth(value), '2026-01')
})

test('getRoleTotalsByType returns income totals for income detail view', () => {
  const summary = {
    expense: { '男朋友': 10, '女朋友': 20, '共同': 30 },
    income: { '男朋友': 100, '女朋友': 200, '共同': 300 }
  }

  assert.deepEqual(getRoleTotalsByType(summary, '收入'), summary.income)
})

test('getRoleTotalsByType falls back to empty totals when bucket is missing', () => {
  assert.deepEqual(getRoleTotalsByType({}, '支出'), {
    '男朋友': 0,
    '女朋友': 0,
    '共同': 0
  })
})

test('registerChartPageCharts registers the line controller for daily trend charts', () => {
  registerChartPageCharts()

  assert.ok(Chart.registry.controllers.get('line'))
})
