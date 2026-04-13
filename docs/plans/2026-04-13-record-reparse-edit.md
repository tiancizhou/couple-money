# 记录重新描述修改 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 用户点击历史记录可重新输入描述，AI 重新解析后更新原记录

**Architecture:** 后端新增 updateRecord + PUT API，前端 HistoryList 点击记录弹出编辑弹窗，重新调用 AI 解析并更新

**Tech Stack:** Fastify, better-sqlite3, Vue 3, Vant Dialog

---

### Task 1: 后端 - updateRecord 数据库函数

**Files:**
- Modify: `database.js:35-39` (addRecord 下方新增)

**Step 1: 在 database.js 中 addRecord 函数后新增 updateRecord**

在 `database.js` 的 `addRecord` 函数之后（约第 40 行）添加：

```js
export function updateRecord(id, { amount, category, role, type, note }) {
  const stmt = db.prepare(
    'UPDATE records SET amount = ?, category = ?, role = ?, type = ?, note = ? WHERE id = ?'
  )
  return stmt.run(amount, category, role, type, note, id)
}
```

**Step 2: 验证语法**

Run: `node -e "import('./database.js').then(m => console.log(typeof m.updateRecord))"`
Expected: `function`

**Step 3: Commit**

```bash
git add database.js
git commit -m "feat: add updateRecord database function"
```

---

### Task 2: 后端 - PUT /api/records/:id 路由

**Files:**
- Modify: `server.js:6` (import updateRecord)
- Modify: `server.js:88` (records POST 路由之后新增 PUT 路由)

**Step 1: 在 server.js import 行添加 updateRecord**

修改 `server.js` 第 6 行的 import，在 `getDailyTrend` 后添加 `updateRecord`：

```js
import { addRecord, getRecordsByMonth, getDashboard, getMonths, getCategoryDaily, getCategoryRoleBreakdown, getDailyTrend, updateRecord } from './database.js'
```

**Step 2: 在 POST /api/records 路由之后添加 PUT 路由**

在 `server.js` 的 `app.post('/api/records', ...)` 路由之后（约第 89 行后）添加：

```js
  app.put('/api/records/:id', async (req, reply) => {
    const id = Number(req.params.id)
    const { amount, category, role, type, note } = req.body
    if (!id || !amount) return reply.code(400).send({ error: '缺少必要字段' })
    const result = updateRecord(id, { amount, category, role, type, note })
    if (result.changes === 0) return reply.code(404).send({ error: '记录不存在' })
    return { updated: result.changes }
  })
```

**Step 3: Commit**

```bash
git add server.js
git commit -m "feat: add PUT /api/records/:id endpoint"
```

---

### Task 3: 前端 - HistoryList 点击编辑功能

**Files:**
- Modify: `src/components/HistoryList.vue`

**Step 1: 添加编辑弹窗和逻辑到 HistoryList.vue**

1. 在 `<template>` 中，在最外层 `<div>` 的闭合标签 `</div>` 前添加编辑弹窗：

```html
    <!-- 编辑弹窗 -->
    <van-dialog
      v-model:show="showEdit"
      title="重新描述"
      show-cancel-button
      :before-close="onEditBeforeClose"
      confirm-button-text="重新解析"
    >
      <div class="px-4 py-2">
        <div class="text-xs text-gray-400 mb-2">
          当前：{{ editingRecord?.category }} · ¥{{ editingRecord?.amount?.toFixed(0) }} · {{ editingRecord?.note }}
        </div>
        <van-field
          v-model="editText"
          placeholder="重新描述这笔账目"
          type="textarea"
          rows="2"
          autosize
          class="!bg-gray-50 !rounded-xl !border-0"
        />
      </div>
    </van-dialog>
```

2. 在 `<script setup>` 中添加所需的导入：

在 `import { ref, computed, watch, onMounted } from 'vue'` 后添加：
```js
import { showToast } from 'vant'
```

3. 在 `const records = ref([])` 之后添加编辑相关的状态和函数：

```js
const showEdit = ref(false)
const editingRecord = ref(null)
const editText = ref('')

function openEdit(record) {
  editingRecord.value = record
  editText.value = ''
  showEdit.value = true
}

async function onEditBeforeClose(action) {
  if (action !== 'confirm') return true
  const text = editText.value.trim()
  if (!text) {
    showToast('请输入描述')
    return false
  }
  try {
    const parseRes = await fetch('/api/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, identity: localStorage.getItem('identity') || '男朋友' })
    })
    if (!parseRes.ok) throw new Error()
    const parsed = await parseRes.json()

    const updateRes = await fetch(`/api/records/${editingRecord.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed)
    })
    if (!updateRes.ok) throw new Error()

    showToast('更新成功')
    fetchData()
    return true
  } catch {
    showToast('更新失败，请重试')
    return false
  }
}
```

4. 在记录条目的外层 `<div>` 上添加 `@click="openEdit(r)"`：

找到：
```html
          class="flex items-center gap-3 py-2.5 px-3 bg-gray-50 rounded-xl mb-1.5"
```
在同行的 `<div` 标签上添加 `@click="openEdit(r)"` 属性。

**Step 2: 验证前端无语法错误**

Run: `npx vite build`
Expected: 构建成功

**Step 3: Commit**

```bash
git add src/components/HistoryList.vue
git commit -m "feat: add record edit with AI re-parse in HistoryList"
```

---

### Task 4: 集成验证

**Step 1: 启动开发服务器**

Run: `node index.js` (后端) 和 `npm run dev` (前端)

**Step 2: 手动测试**

1. 在历史记录中点击任意一条记录
2. 确认弹出编辑弹窗，显示当前记录信息
3. 输入新的描述（如将"吃饭30"改为"打车30"）
4. 点击"重新解析"
5. 确认 AI 解析成功，记录已更新，列表刷新
