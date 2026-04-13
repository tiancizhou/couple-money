<template>
  <!-- 历史记录列表 -->
  <div class="bg-white rounded-2xl shadow-sm p-4">
    <h2 class="text-gray-800 font-semibold text-base mb-3">历史记录</h2>

    <div v-if="records.length === 0" class="text-center py-8 text-gray-300">
      <div class="text-4xl mb-2">📝</div>
      <p class="text-sm">暂无记录，快来记一笔吧</p>
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="group in groupedRecords"
        :key="group.date"
        class="mb-3"
      >
        <!-- 日期分组标题 -->
        <div class="text-xs text-gray-400 mb-2 flex items-center gap-2">
          <span>{{ formatDate(group.date) }}</span>
          <span class="text-primary font-medium">-¥{{ group.totalExpense.toFixed(0) }}</span>
          <span v-if="group.totalIncome > 0" class="text-green-500 font-medium">+¥{{ group.totalIncome.toFixed(0) }}</span>
        </div>

        <!-- 当日记录 -->
        <div
          v-for="r in group.items"
          :key="r.id"
          class="flex items-center gap-3 py-2.5 px-3 bg-gray-50 rounded-xl mb-1.5 active:scale-[0.98] transition-transform cursor-pointer"
          @click="openEdit(r)"
        >
          <div class="text-xl">{{ r.icon || categoryIcon(r.category) }}</div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-800 font-medium">{{ r.note || r.category }}</span>
              <span
                class="text-xs px-1.5 py-0.5 rounded-full"
                :class="roleTagClass(r.role)"
              >{{ r.role }}</span>
            </div>
            <div class="text-xs text-gray-400 mt-0.5">{{ r.category }}</div>
          </div>
          <div class="text-base font-bold" :class="r.type === '收入' ? 'text-green-600' : amountClass(r.role)">
            {{ r.type === '收入' ? '+' : '-' }}¥{{ r.amount.toFixed(0) }}
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <van-dialog
      v-model:show="showEdit"
      title="重新描述"
      show-cancel-button
      @confirm="onEditConfirm"
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
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { showToast } from 'vant'
import { useCategories } from '../utils/categories.js'

const { categoryIcon } = useCategories()

const props = defineProps({
  month: String
})

const records = ref([])

const showEdit = ref(false)
const editingRecord = ref(null)
const editText = ref('')

function openEdit(record) {
  editingRecord.value = record
  editText.value = ''
  showEdit.value = true
}

function onEditConfirm() {
  const text = editText.value.trim()
  if (!text) {
    showToast('请输入描述')
    return
  }
  const recordId = editingRecord.value.id
  showToast('正在重新解析...')
  ;(async () => {
    try {
      const parseRes = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, identity: localStorage.getItem('identity') || '男朋友', previous: { amount: editingRecord.value.amount, category: editingRecord.value.category, role: editingRecord.value.role, type: editingRecord.value.type, note: editingRecord.value.note } })
      })
      if (!parseRes.ok) throw new Error()
      const parsed = await parseRes.json()

      const updateRes = await fetch(`/api/records/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      })
      if (!updateRes.ok) throw new Error()

      showToast('更新成功')
      fetchData()
    } catch {
      showToast('更新失败，请重试')
    }
  })()
}

// 按日期分组
const groupedRecords = computed(() => {
  const map = {}
  for (const r of records.value) {
    if (!map[r.date]) map[r.date] = { date: r.date, items: [], totalExpense: 0, totalIncome: 0 }
    map[r.date].items.push(r)
    if (r.type === '收入') map[r.date].totalIncome += r.amount
    else map[r.date].totalExpense += r.amount
  }
  return Object.values(map).sort((a, b) => b.date.localeCompare(a.date))
})

function roleTagClass(role) {
  const map = {
    '男朋友': 'bg-blue-100 text-blue-500',
    '女朋友': 'bg-pink-100 text-pink-500',
    '共同': 'bg-purple-100 text-purple-500'
  }
  return map[role] || 'bg-gray-100 text-gray-500'
}

function amountClass(role) {
  const map = {
    '男朋友': 'text-blue-600',
    '女朋友': 'text-pink-600',
    '共同': 'text-purple-600'
  }
  return map[role] || 'text-gray-600'
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`
}

async function fetchData() {
  try {
    const res = await fetch(`/api/records?month=${props.month}`)
    records.value = await res.json()
  } catch {
    // 忽略
  }
}

watch(() => props.month, fetchData)
onMounted(fetchData)

defineExpose({ refresh: fetchData })
</script>
