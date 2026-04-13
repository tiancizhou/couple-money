import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import fastifyCors from '@fastify/cors'
import { fileURLToPath } from 'url'
import path from 'path'
import { addRecord, getRecordsByMonth, getDashboard, getMonths, getCategoryDaily, getCategoryRoleBreakdown, getDailyTrend, updateRecord } from './database.js'
import { formatLocalMonth } from './src/utils/date.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ============ 智谱 AI 配置 ============
const ZHIPU_API_KEY = 'da13bde5f5954e1583cfda71314cfc75.p4Y0sOlCJW8rIr3k'
const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/anthropic/v1/messages'

async function callZhipuAI(userMessage, identity, previous) {
  let systemPrompt = `你是一个记账助手。当前使用者是"${identity}"。用户会描述一笔收支，你需要提取以下信息并以纯 JSON 格式返回（不要 markdown 代码块）：
{
  "amount": 数字，金额（单位：元，始终为正数）,
  "category": 字符串，分类（餐饮/交通/购物/娱乐/居住/医疗/教育/通讯/日用/工资/奖金/红包/转账/其他）,
  "role": 字符串，消费角色（男朋友/女朋友/共同）,
  "type": 字符串，"支出"或"收入",
  "note": 字符串，简短备注
}

规则：
- type 判断：如果是收入（工资、奖金、红包、转账收入等），设为"收入"；否则默认"支出"
- role 判断：如果提到"一起"、"两人"等共同消费关键词，设为"共同"；如果明确说"她/他/女朋友/男朋友"花的且不是当前使用者，设为对方的身份；否则默认为当前使用者"${identity}"
- category 选择最接近的分类
- note 简洁概括内容
- 只返回 JSON，不要任何其他文字`
  if (previous) {
    systemPrompt += `\n\n上一条解析结果（供参考修改）：\n${JSON.stringify(previous)}\n请结合用户的修改描述，在上次结果基础上调整。`
  }

  const response = await fetch(ZHIPU_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ZHIPU_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'glm-4.5-air',
      max_tokens: 200,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userMessage }
      ]
    })
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`智谱 API 错误: ${response.status} ${err}`)
  }

  const data = await response.json()
  console.log('智谱 API 响应:', JSON.stringify(data, null, 2))
  const content = data.content?.[0]?.text?.trim()
    || data.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error('无法解析 AI 响应: ' + JSON.stringify(data))
  // 去除可能的 markdown 代码块包裹
  const jsonStr = content.replace(/^```json?\s*/, '').replace(/\s*```$/, '')
  return JSON.parse(jsonStr)
}

// ============ Fastify 服务器 ============
export async function buildServer() {
  const app = Fastify({ logger: false })

  await app.register(fastifyCors, { origin: true })

  // API 路由
  app.post('/api/parse', async (req, reply) => {
    const { text, identity, previous } = req.body
    if (!text) return reply.code(400).send({ error: '请输入记账内容' })
    try {
      const result = await callZhipuAI(text, identity, previous)
      return result
    } catch (err) {
      console.error('AI 解析错误:', err.message)
      return reply.code(500).send({ error: 'AI 解析失败，请重试' })
    }
  })

  app.post('/api/records', async (req, reply) => {
    const { amount, category, role, type, note, date } = req.body
    if (!amount || !date) return reply.code(400).send({ error: '缺少必要字段' })
    const result = addRecord({ amount, category, role, type, note, date })
    return { id: result.lastInsertRowid }
  })

  app.put('/api/records/:id', async (req, reply) => {
    const id = Number(req.params.id)
    const { amount, category, role, type, note } = req.body
    if (!id || !amount) return reply.code(400).send({ error: '缺少必要字段' })
    const result = updateRecord(id, { amount, category, role, type, note })
    if (result.changes === 0) return reply.code(404).send({ error: '记录不存在' })
    return { updated: result.changes }
  })

  app.get('/api/records', async (req) => {
    const month = req.query.month || formatLocalMonth(new Date())
    return getRecordsByMonth(month)
  })

  app.get('/api/dashboard', async (req) => {
    const month = req.query.month || formatLocalMonth(new Date())
    return getDashboard(month)
  })

  app.get('/api/months', async () => {
    return getMonths()
  })

  // 图表数据：每日总趋势
  app.get('/api/charts/daily', async (req) => {
    const month = req.query.month || formatLocalMonth(new Date())
    const type = req.query.type || '支出'
    return getDailyTrend(month, type)
  })

  // 图表数据：某分类的每日趋势
  app.get('/api/charts/category-daily', async (req) => {
    const month = req.query.month || formatLocalMonth(new Date())
    const { category, type } = req.query
    if (!category) return { error: '缺少 category' }
    return getCategoryDaily(month, category, type || '支出')
  })

  // 图表数据：某分类的角色分布
  app.get('/api/charts/category-roles', async (req) => {
    const month = req.query.month || formatLocalMonth(new Date())
    const { category, type } = req.query
    if (!category) return { error: '缺少 category' }
    return getCategoryRoleBreakdown(month, category, type || '支出')
  })

  // 托管前端静态文件（生产模式）
  const distPath = path.join(__dirname, 'dist')
  try {
    await app.register(fastifyStatic, {
      root: distPath,
      prefix: '/',
      wildcard: false
    })
    // SPA fallback
    app.setNotFoundHandler(async (_req, reply) => {
      return reply.sendFile('index.html')
    })
  } catch {
    // 开发模式下 dist 目录不存在，跳过
  }

  return app
}
