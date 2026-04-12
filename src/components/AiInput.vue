<template>
  <!-- AI 记账输入区域 -->
  <div class="bg-white rounded-2xl shadow-sm p-4">
    <h2 class="text-gray-800 font-semibold text-base mb-3">智能记账</h2>

    <div class="flex gap-2">
      <van-field
        v-model="inputText"
        placeholder="说一句话来记账，如：今天和女朋友吃火锅花了200"
        type="textarea"
        rows="1"
        autosize
        class="flex-1 !bg-gray-50 !rounded-xl !border-0"
        @keyup.enter="submitInput"
      />
      <van-button
        type="primary"
        size="small"
        :disabled="!inputText.trim()"
        class="!rounded-xl !h-auto !px-4"
        @click="submitInput"
      >
        记一笔
      </van-button>
    </div>

    <!-- 处理状态 -->
    <div v-if="pendingItems.length > 0" class="mt-3 space-y-2">
      <div
        v-for="item in pendingItems"
        :key="item.id"
        class="flex items-center gap-2 px-3 py-2 rounded-xl"
        :class="item.status === 'processing' ? 'bg-blue-50' : item.status === 'done' ? 'bg-green-50' : 'bg-red-50'"
      >
        <van-loading v-if="item.status === 'processing'" size="16" color="#ff6b81" />
        <span v-else-if="item.status === 'done'" class="text-green-500 text-sm">✓</span>
        <span v-else class="text-red-500 text-sm">✗</span>
        <span class="text-xs text-gray-500 flex-1 truncate">{{ item.text }}</span>
        <span v-if="item.status === 'processing'" class="text-xs text-blue-400">记账中...</span>
        <span v-else-if="item.status === 'done'" class="text-xs text-green-400">¥{{ item.amount }}</span>
        <span v-else class="text-xs text-red-400">失败</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { showToast } from 'vant'
import { formatLocalDate } from '../utils/date.js'

const emit = defineEmits(['saved'])

const props = defineProps({
  identity: String
})

const inputText = ref('')
const pendingItems = ref([])
let idCounter = 0

function submitInput() {
  const text = inputText.value.trim()
  if (!text) return

  inputText.value = ''
  const item = { id: ++idCounter, text, status: 'processing', amount: '' }
  pendingItems.value.push(item)
  processItem(item, text)
}

async function processItem(item, text) {
  try {
    // 1. AI 解析
    const parseRes = await fetch('/api/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, identity: props.identity })
    })
    if (!parseRes.ok) throw new Error()
    const parsed = await parseRes.json()

    // 2. 直接保存，无需确认
    const saveRes = await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...parsed, date: formatLocalDate(new Date()) })
    })
    if (!saveRes.ok) throw new Error()

    item.status = 'done'
    item.amount = parsed.amount.toFixed(0)
    showToast(`记账成功 ¥${parsed.amount}`)
    emit('saved')
  } catch {
    item.status = 'failed'
    showToast('记账失败: ' + text.slice(0, 10) + '...')
  }

  // 3 秒后清除已完成/失败的项
  setTimeout(() => {
    pendingItems.value = pendingItems.value.filter(p => p.status === 'processing')
  }, 3000)
}
</script>
