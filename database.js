import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const db = new Database(path.join(__dirname, 'data.db'))

// 启用 WAL 模式提升并发性能
db.pragma('journal_mode = WAL')

// 初始化表
db.exec(`
  CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL,
    category TEXT NOT NULL DEFAULT '其他',
    role TEXT NOT NULL DEFAULT '共同',
    type TEXT NOT NULL DEFAULT '支出',
    note TEXT DEFAULT '',
    date TEXT NOT NULL
  )
`)

// 兼容：如果旧表没有 type 列，自动添加
const columns = db.prepare("PRAGMA table_info(records)").all()
if (!columns.find(c => c.name === 'type')) {
  db.exec("ALTER TABLE records ADD COLUMN type TEXT NOT NULL DEFAULT '支出'")
}
if (!columns.find(c => c.name === 'icon')) {
  db.exec("ALTER TABLE records ADD COLUMN icon TEXT DEFAULT ''")
}

// 初始化分类表
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    icon TEXT NOT NULL DEFAULT '📌'
  )
`)

const defaultCategories = [
  ['餐饮', '🍜'], ['交通', '🚗'], ['购物', '🛍️'], ['娱乐', '🎮'],
  ['居住', '🏠'], ['医疗', '💊'], ['教育', '📚'], ['通讯', '📱'],
  ['日用', '🧴'], ['工资', '💰'], ['奖金', '🎉'], ['红包', '🧧'],
  ['转账', '💳'], ['其他', '📌']
]
const insertCategory = db.prepare('INSERT OR IGNORE INTO categories (name, icon) VALUES (?, ?)')
for (const [name, icon] of defaultCategories) {
  insertCategory.run(name, icon)
}

// 迁移旧数据：将"我"/"她"角色更新为"男朋友"/"女朋友"
db.exec(`UPDATE records SET role = '男朋友' WHERE role = '我'`)
db.exec(`UPDATE records SET role = '女朋友' WHERE role = '她'`)

// 添加记录
export function addRecord({ amount, category, role, type, note, date, icon }) {
  const stmt = db.prepare(
    'INSERT INTO records (amount, category, role, type, note, date, icon) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
  return stmt.run(amount, category, role, type || '支出', note, date, icon || '')
}

export function updateRecord(id, { amount, category, role, type, note, icon }) {
  const stmt = db.prepare(
    'UPDATE records SET amount = ?, category = ?, role = ?, type = ?, note = ?, icon = ? WHERE id = ?'
  )
  return stmt.run(amount, category, role, type, note, icon || '', id)
}

// 按月份查询记录
export function getRecordsByMonth(yearMonth) {
  const stmt = db.prepare(
    `SELECT * FROM records WHERE strftime('%Y-%m', date) = ? ORDER BY date DESC, id DESC`
  )
  return stmt.all(yearMonth)
}

// 获取看板数据
export function getDashboard(yearMonth) {
  const result = {
    expense: { '男朋友': 0, '女朋友': 0, '共同': 0 },
    income: { '男朋友': 0, '女朋友': 0, '共同': 0 },
    expenseDetails: [],
    incomeDetails: []
  }

  // 支出统计
  const expenseStmt = db.prepare(
    `SELECT role, SUM(amount) as total FROM records WHERE strftime('%Y-%m', date) = ? AND type = '支出' GROUP BY role`
  )
  for (const row of expenseStmt.all(yearMonth)) {
    if (result.expense[row.role] !== undefined) result.expense[row.role] = row.total
  }

  // 收入统计
  const incomeStmt = db.prepare(
    `SELECT role, SUM(amount) as total FROM records WHERE strftime('%Y-%m', date) = ? AND type = '收入' GROUP BY role`
  )
  for (const row of incomeStmt.all(yearMonth)) {
    if (result.income[row.role] !== undefined) result.income[row.role] = row.total
  }

  // 支出分类明细
  const expenseDetailStmt = db.prepare(
    `SELECT r.category, SUM(r.amount) as total, MAX(r.icon) as icon FROM records r WHERE strftime('%Y-%m', r.date) = ? AND r.type = '支出' GROUP BY r.category ORDER BY total DESC`
  )
  result.expenseDetails = expenseDetailStmt.all(yearMonth)

  const incomeDetailStmt = db.prepare(
    `SELECT r.category, SUM(r.amount) as total, MAX(r.icon) as icon FROM records r WHERE strftime('%Y-%m', r.date) = ? AND r.type = '收入' GROUP BY r.category ORDER BY total DESC`
  )
  result.incomeDetails = incomeDetailStmt.all(yearMonth)

  return result
}

// 获取有记录的月份列表
export function getMonths() {
  const stmt = db.prepare(
    `SELECT DISTINCT strftime('%Y-%m', date) as month FROM records ORDER BY month DESC`
  )
  return stmt.all().map(r => r.month)
}

// 获取某分类的每日趋势（折线图）
export function getCategoryDaily(yearMonth, category, type) {
  const stmt = db.prepare(
    `SELECT date, SUM(amount) as total FROM records
     WHERE strftime('%Y-%m', date) = ? AND category = ? AND type = ?
     GROUP BY date ORDER BY date`
  )
  return stmt.all(yearMonth, category, type)
}

// 获取某分类的角色分布（饼状图）
export function getCategoryRoleBreakdown(yearMonth, category, type) {
  const stmt = db.prepare(
    `SELECT role, SUM(amount) as total FROM records
     WHERE strftime('%Y-%m', date) = ? AND category = ? AND type = ?
     GROUP BY role`
  )
  return stmt.all(yearMonth, category, type)
}

// 获取每日总趋势（折线图）
export function getDailyTrend(yearMonth, type) {
  const stmt = db.prepare(
    `SELECT date, SUM(amount) as total FROM records
     WHERE strftime('%Y-%m', date) = ? AND type = ?
     GROUP BY date ORDER BY date`
  )
  return stmt.all(yearMonth, type)
}

export function getCategories() {
  return db.prepare('SELECT name, icon FROM categories ORDER BY id').all()
}

export function ensureCategory(name, icon) {
  if (!name) return
  db.prepare('INSERT OR IGNORE INTO categories (name, icon) VALUES (?, ?)').run(name, icon || '📌')
}

export default db
