const EMPTY = { '男朋友': 0, '女朋友': 0, '共同': 0 }

export function getRoleTotalsByType(summary, type) {
  const key = type === '收入' ? 'income' : 'expense'
  return { ...EMPTY, ...(summary[key] || {}) }
}
