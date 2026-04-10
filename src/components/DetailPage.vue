<template>
  <div class="min-h-screen bg-[#f8f9fe]">
    <!-- 顶部导航 -->
    <div class="bg-white sticky top-0 z-10">
      <div class="flex items-center px-4 pt-12 pb-3">
        <button class="flex items-center gap-1 text-gray-600 active:text-gray-400" @click="$emit('back')">
          <van-icon name="arrow-left" size="18" />
          <span class="text-sm">返回</span>
        </button>
        <h2 class="flex-1 text-center text-base font-bold text-gray-800 -ml-12">
          {{ type === '支出' ? '📉 支出详情' : '📈 收入详情' }}
        </h2>
      </div>
    </div>

    <div class="px-4 pt-4 space-y-4 pb-8">
      <!-- 总览卡片 -->
      <div :class="type === '支出' ? 'bg-gradient-to-r from-red-500 to-orange-400' : 'bg-gradient-to-r from-green-500 to-emerald-400'" class="rounded-2xl p-5 text-white">
        <div class="text-sm opacity-80 mb-1">本月{{ type }}总计</div>
        <div class="text-3xl font-bold">¥{{ total.toFixed(0) }}</div>
        <div class="flex gap-6 mt-3">
          <div>
            <div class="text-xs opacity-70">👦 男朋友</div>
            <div class="text-base font-semibold">¥{{ data.expense['男朋友'].toFixed(0) }}</div>
          </div>
          <div>
            <div class="text-xs opacity-70">👧 女朋友</div>
            <div class="text-base font-semibold">¥{{ data.expense['女朋友'].toFixed(0) }}</div>
          </div>
          <div>
            <div class="text-xs opacity-70">💑 共同</div>
            <div class="text-base font-semibold">¥{{ data.expense['共同'].toFixed(0) }}</div>
          </div>
        </div>
      </div>

      <!-- 角色饼状图 -->
      <div v-if="total > 0" class="bg-white rounded-2xl p-4">
        <div class="text-sm text-gray-500 mb-2">角色占比</div>
        <div style="height: 220px" class="flex items-center justify-center">
          <canvas ref="roleChartRef"></canvas>
        </div>
      </div>

      <!-- 分类列表 -->
      <div class="bg-white rounded-2xl p-4">
        <div class="text-sm text-gray-500 mb-3">分类明细</div>
        <div v-if="details.length > 0" class="space-y-1">
          <div
            v-for="item in details"
            :key="item.category"
            class="flex items-center gap-3 px-2 py-3 active:bg-gray-50 rounded-xl transition-colors cursor-pointer border-b border-gray-50 last:border-0"
            @click="$emit('openChart', item.category, type)"
          >
            <span class="text-xl">{{ categoryIcon(item.category) }}</span>
            <div class="flex-1">
              <div class="text-sm font-medium text-gray-800">{{ item.category }}</div>
              <div class="mt-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  :class="type === '支出' ? 'bg-gradient-to-r from-red-400 to-orange-400' : 'bg-gradient-to-r from-green-400 to-emerald-400'"
                  class="h-full rounded-full"
                  :style="{ width: percent(item.total) + '%' }"
                />
              </div>
            </div>
            <div class="text-right">
              <div class="text-sm font-bold text-gray-800">¥{{ item.total.toFixed(0) }}</div>
              <div class="text-xs text-gray-400">{{ percent(item.total).toFixed(1) }}%</div>
            </div>
            <van-icon name="arrow" size="14" class="text-gray-300" />
          </div>
        </div>
        <div v-else class="text-center py-8 text-gray-300 text-sm">暂无{{ type }}记录</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { Chart, ArcElement, DoughnutController, Tooltip, Legend } from 'chart.js'

Chart.register(ArcElement, DoughnutController, Tooltip, Legend)

const props = defineProps({
  type: String,
  month: String
})

defineEmits(['back', 'openChart'])

const data = ref({
  expense: { '男朋友': 0, '女朋友': 0, '共同': 0 },
  income: { '男朋友': 0, '女朋友': 0, '共同': 0 },
  expenseDetails: [],
  incomeDetails: []
})

const roleChartRef = ref(null)
let roleChart = null

const details = computed(() => {
  return props.type === '支出' ? data.value.expenseDetails : data.value.incomeDetails
})

const total = computed(() => {
  const d = props.type === '支出' ? data.value.expense : data.value.income
  return d['男朋友'] + d['女朋友'] + d['共同']
})

const categoryIcons = {
  '餐饮': '🍜', '交通': '🚗', '购物': '🛍️', '娱乐': '🎮',
  '居住': '🏠', '医疗': '💊', '教育': '📚', '通讯': '📱',
  '日用': '🧴', '工资': '💰', '奖金': '🎉', '红包': '🧧',
  '转账': '💳', '其他': '📌'
}

function categoryIcon(c) {
  return categoryIcons[c] || '📌'
}

function percent(amount) {
  if (total.value === 0) return 0
  return (amount / total.value) * 100
}

function renderRoleChart() {
  if (roleChart) roleChart.destroy()
  if (!roleChartRef.value || total.value === 0) return

  const d = props.type === '支出' ? data.value.expense : data.value.income
  const isExpense = props.type === '支出'

  roleChart = new Chart(roleChartRef.value, {
    type: 'doughnut',
    data: {
      labels: ['👦 男朋友', '👧 女朋友', '💑 共同'],
      datasets: [{
        data: [d['男朋友'], d['女朋友'], d['共同']],
        backgroundColor: [
          'rgba(59,130,246,0.75)',
          'rgba(236,72,153,0.75)',
          'rgba(139,92,246,0.75)'
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '55%',
      plugins: {
        legend: { position: 'right', labels: { boxWidth: 12, padding: 10, font: { size: 12 } } },
        tooltip: { callbacks: { label: (ctx) => `¥${ctx.parsed.toFixed(0)}` } }
      }
    }
  })
}

async function fetchData() {
  try {
    const res = await fetch(`/api/dashboard?month=${props.month}`)
    const raw = await res.json()
    data.value = {
      expense: { '男朋友': 0, '女朋友': 0, '共同': 0, ...raw.expense },
      income: { '男朋友': 0, '女朋友': 0, '共同': 0, ...raw.income },
      expenseDetails: raw.expenseDetails || [],
      incomeDetails: raw.incomeDetails || []
    }
    await nextTick()
    renderRoleChart()
  } catch {
    // 忽略
  }
}

watch(() => props.month, fetchData)
onMounted(fetchData)
</script>
