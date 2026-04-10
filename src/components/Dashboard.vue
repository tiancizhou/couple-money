<template>
  <!-- 看板卡片 -->
  <div class="bg-white rounded-2xl shadow-sm p-4">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-gray-800 font-semibold text-base">本月概览</h2>
      <button
        class="text-xs text-gray-400 flex items-center gap-1"
        @click="showMonthPicker = true"
      >
        {{ displayMonth }}
        <van-icon name="arrow-down" size="12" />
      </button>
    </div>

    <!-- 支出入口 -->
    <div
      class="mb-3 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-4 active:scale-[0.98] transition-transform"
      @click="$emit('openDetail', '支出')"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-sm">📉</div>
          <span class="text-sm text-gray-600">支出</span>
        </div>
        <div class="flex items-center gap-1">
          <span class="text-xl font-bold text-red-500">¥{{ totalExpense.toFixed(0) }}</span>
          <van-icon name="arrow" size="14" class="text-gray-300" />
        </div>
      </div>
      <div class="flex gap-4 mt-2">
        <span class="text-xs text-blue-400">👦 ¥{{ data.expense['男朋友'].toFixed(0) }}</span>
        <span class="text-xs text-pink-400">👧 ¥{{ data.expense['女朋友'].toFixed(0) }}</span>
        <span class="text-xs text-purple-400">💑 ¥{{ data.expense['共同'].toFixed(0) }}</span>
      </div>
    </div>

    <!-- 收入口 -->
    <div
      class="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 active:scale-[0.98] transition-transform"
      @click="$emit('openDetail', '收入')"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm">📈</div>
          <span class="text-sm text-gray-600">收入</span>
        </div>
        <div class="flex items-center gap-1">
          <span class="text-xl font-bold text-green-600">¥{{ totalIncome.toFixed(0) }}</span>
          <van-icon name="arrow" size="14" class="text-gray-300" />
        </div>
      </div>
      <div class="flex gap-4 mt-2">
        <span class="text-xs text-blue-400">👦 ¥{{ data.income['男朋友'].toFixed(0) }}</span>
        <span class="text-xs text-pink-400">👧 ¥{{ data.income['女朋友'].toFixed(0) }}</span>
        <span class="text-xs text-purple-400">💑 ¥{{ data.income['共同'].toFixed(0) }}</span>
      </div>
    </div>

    <!-- 月份选择器 -->
    <van-popup v-model:show="showMonthPicker" position="bottom" round>
      <van-picker
        :columns="monthColumns"
        @confirm="onMonthConfirm"
        @cancel="showMonthPicker = false"
        :default-index="defaultMonthIndex"
        title="选择月份"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { showToast } from 'vant'

const props = defineProps({
  month: String
})

const emit = defineEmits(['monthChange', 'openDetail'])

const emptyData = () => ({
  expense: { '男朋友': 0, '女朋友': 0, '共同': 0 },
  income: { '男朋友': 0, '女朋友': 0, '共同': 0 },
  expenseDetails: [],
  incomeDetails: []
})

const data = ref(emptyData())
const showMonthPicker = ref(false)
const months = ref([])

const displayMonth = computed(() => {
  const [y, m] = props.month.split('-')
  return `${y}年${parseInt(m)}月`
})

const totalExpense = computed(() => {
  return data.value.expense['男朋友'] + data.value.expense['女朋友'] + data.value.expense['共同']
})

const totalIncome = computed(() => {
  return data.value.income['男朋友'] + data.value.income['女朋友'] + data.value.income['共同']
})

const monthColumns = computed(() => {
  const now = new Date().toISOString().slice(0, 7)
  const list = [...months.value]
  if (!list.includes(now)) list.unshift(now)
  return list.map(m => {
    const [y, mo] = m.split('-')
    return { text: `${y}年${parseInt(mo)}月`, value: m }
  })
})

const defaultMonthIndex = computed(() => {
  const idx = monthColumns.value.findIndex(c => c.value === props.month)
  return idx >= 0 ? idx : 0
})

function onMonthConfirm({ selectedValues }) {
  if (selectedValues && selectedValues[0]) {
    emit('monthChange', selectedValues[0])
  }
  showMonthPicker.value = false
}

async function fetchData() {
  try {
    const res = await fetch(`/api/dashboard?month=${props.month}`)
    const raw = await res.json()
    data.value = {
      expense: { ...emptyData().expense, ...raw.expense },
      income: { ...emptyData().income, ...raw.income },
      expenseDetails: raw.expenseDetails || [],
      incomeDetails: raw.incomeDetails || []
    }
  } catch {
    showToast('获取数据失败')
  }
}

async function fetchMonths() {
  try {
    const res = await fetch('/api/months')
    months.value = await res.json()
  } catch {
    // 忽略
  }
}

watch(() => props.month, fetchData)
onMounted(() => {
  fetchData()
  fetchMonths()
})

defineExpose({ refresh: fetchData })
</script>
