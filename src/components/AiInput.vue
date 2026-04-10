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

    <!-- 处理中队列 -->
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
        <span v-if="item.status === 'processing'" class="text-xs text-blue-400">解析中...</span>
        <span v-else-if="item.status === 'done'" class="text-xs text-green-400">已确认</span>
        <span v-else class="text-xs text-red-400">失败</span>
      </div>
    </div>

    <!-- 确认弹窗 -->
    <van-dialog
      v-model:show="showConfirm"
      title="确认记账信息"
      show-cancel-button
      @confirm="saveRecord"
      @cancel="onConfirmCancel"
    >
      <div v-if="currentParsed" class="px-6 py-4 space-y-3 text-sm">
        <div class="flex justify-between">
          <span class="text-gray-500">金额</span>
          <span class="font-bold text-lg" :class="currentParsed.type === '收入' ? 'text-green-600' : 'text-primary'">
            {{ currentParsed.type === '收入' ? '+' : '-' }}¥{{ currentParsed.amount }}
          </span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">分类</span>
          <span class="text-gray-800">{{ currentParsed.category }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">角色</span>
          <span :class="roleClass">{{ currentParsed.role }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">类型</span>
          <span :class="currentParsed.type === '收入' ? 'text-green-600' : 'text-red-400'">{{ currentParsed.type }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">备注</span>
          <span class="text-gray-800">{{ currentParsed.note }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">日期</span>
          <span class="text-gray-800">{{ todayStr }}</span>
        </div>
      </div>
    </van-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { showToast } from 'vant'

const emit = defineEmits(['saved'])

const props = defineProps({
  identity: String
})

const inputText = ref('')
const todayStr = new Date().toISOString().slice(0, 10)

// 异步队列
const pendingItems = ref([])
const confirmQueue = ref([]) // 已解析完成，等待确认的列表
const showConfirm = ref(false)
const currentParsed = ref(null)
let idCounter = 0

const roleClass = computed(() => {
  if (!currentParsed.value) return ''
  const map = { '男朋友': 'text-blue-600', '女朋友': 'text-pink-600', '共同': 'text-purple-600' }
  return map[currentParsed.value.role] || 'text-gray-800'
})

// 提交输入（非阻塞）
function submitInput() {
  const text = inputText.value.trim()
  if (!text) return

  // 立即清空输入框，用户可以继续输入
  inputText.value = ''

  const item = { id: ++idCounter, text, status: 'processing' }
  pendingItems.value.push(item)

  // 异步调用 AI
  processItem(item, text)
}

async function processItem(item, text) {
  try {
    const res = await fetch('/api/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, identity: props.identity })
    })
    if (!res.ok) throw new Error()
    const parsed = await res.json()

    // 加入确认队列
    confirmQueue.value.push({ item, parsed })
    // 尝试弹出下一个确认
    showNextConfirm()
  } catch {
    item.status = 'failed'
    showToast('解析失败: ' + text.slice(0, 10) + '...')
    // 3 秒后移除失败项
    setTimeout(() => {
      pendingItems.value = pendingItems.value.filter(p => p.id !== item.id)
    }, 3000)
  }
}

function showNextConfirm() {
  if (showConfirm.value || confirmQueue.value.length === 0) return

  const next = confirmQueue.value.shift()
  currentParsed.value = next.parsed
  next.item.status = 'done'
  showConfirm.value = true
}

async function saveRecord() {
  if (!currentParsed.value) return
  try {
    await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...currentParsed.value,
        date: todayStr
      })
    })
    showToast('记账成功')
    emit('saved')
  } catch {
    showToast('保存失败')
  }
  currentParsed.value = null

  // 清除已完成项（延迟）
  setTimeout(() => {
    pendingItems.value = pendingItems.value.filter(p => p.status === 'processing')
  }, 1500)

  // 弹出下一个确认
  setTimeout(showNextConfirm, 300)
}

function onConfirmCancel() {
  currentParsed.value = null
  setTimeout(showNextConfirm, 300)
}
</script>
