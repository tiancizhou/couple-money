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
          {{ icon }} {{ category }} 分析
        </h2>
      </div>
    </div>

    <div class="px-4 pt-4 space-y-4 pb-8">
      <!-- 角色分布饼状图 -->
      <div class="bg-white rounded-2xl p-4">
        <div class="text-sm text-gray-500 mb-2">角色分布</div>
        <div style="height: 240px" class="flex items-center justify-center">
          <canvas ref="pieRef"></canvas>
        </div>
      </div>

      <!-- 每日趋势折线图 -->
      <div class="bg-white rounded-2xl p-4">
        <div class="text-sm text-gray-500 mb-2">每日趋势</div>
        <div style="height: 240px">
          <canvas ref="lineRef"></canvas>
        </div>
      </div>

      <!-- 数据列表 -->
      <div class="bg-white rounded-2xl p-4">
        <div class="text-sm text-gray-500 mb-3">每日明细</div>
        <div v-if="dailyData.length > 0" class="space-y-1">
          <div
            v-for="row in dailyData.slice().reverse()"
            :key="row.date"
            class="flex items-center justify-between px-2 py-2.5 border-b border-gray-50 last:border-0"
          >
            <span class="text-sm text-gray-600">{{ formatDay(row.date) }}</span>
            <span class="text-sm font-bold" :class="type === '支出' ? 'text-red-500' : 'text-green-600'">
              ¥{{ row.total.toFixed(0) }}
            </span>
          </div>
        </div>
        <div v-else class="text-center py-6 text-gray-300 text-sm">暂无数据</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch } from 'vue'
import { Chart, ArcElement, DoughnutController, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js'

Chart.register(ArcElement, DoughnutController, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const props = defineProps({
  category: String,
  type: String,
  month: String
})

defineEmits(['back'])

const categoryIcons = {
  '餐饮': '🍜', '交通': '🚗', '购物': '🛍️', '娱乐': '🎮',
  '居住': '🏠', '医疗': '💊', '教育': '📚', '通讯': '📱',
  '日用': '🧴', '工资': '💰', '奖金': '🎉', '红包': '🧧',
  '转账': '💳', '其他': '📌'
}

const icon = categoryIcons[props.category] || '📌'
const dailyData = ref([])

const pieRef = ref(null)
const lineRef = ref(null)
let pieChart = null
let lineChart = null

function formatDay(dateStr) {
  const d = new Date(dateStr)
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`
}

async function fetchAndRender() {
  const month = props.month
  const category = props.category
  const type = props.type
  const params = `month=${month}&category=${encodeURIComponent(category)}&type=${encodeURIComponent(type)}`

  const [roleRes, dailyRes] = await Promise.all([
    fetch(`/api/charts/category-roles?${params}`).then(r => r.json()),
    fetch(`/api/charts/category-daily?${params}`).then(r => r.json())
  ])

  dailyData.value = dailyRes

  await nextTick()
  renderPie(roleRes)
  renderLine(dailyRes)
}

function renderPie(roleData) {
  if (pieChart) pieChart.destroy()
  if (!pieRef.value) return

  const roleMap = { '男朋友': 0, '女朋友': 0, '共同': 0 }
  for (const row of roleData) {
    if (roleMap[row.role] !== undefined) roleMap[row.role] = row.total
  }
  const hasData = Object.values(roleMap).some(v => v > 0)

  pieChart = new Chart(pieRef.value, {
    type: 'doughnut',
    data: {
      labels: hasData ? ['👦 男朋友', '👧 女朋友', '💑 共同'] : ['暂无数据'],
      datasets: [{
        data: hasData ? [roleMap['男朋友'], roleMap['女朋友'], roleMap['共同']] : [1],
        backgroundColor: hasData
          ? ['rgba(59,130,246,0.75)', 'rgba(236,72,153,0.75)', 'rgba(139,92,246,0.75)']
          : ['rgba(200,200,200,0.3)'],
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

function renderLine(dailyRes) {
  if (lineChart) lineChart.destroy()
  if (!lineRef.value) return

  const [year, month] = props.month.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()

  const dailyMap = {}
  for (const row of dailyRes) {
    const day = parseInt(row.date.split('-')[2])
    dailyMap[day] = row.total
  }

  const labels = []
  const values = []
  for (let d = 1; d <= daysInMonth; d++) {
    labels.push(`${d}日`)
    values.push(dailyMap[d] || 0)
  }

  const isExpense = props.type === '支出'

  lineChart = new Chart(lineRef.value, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor: isExpense ? 'rgba(255,107,129,0.9)' : 'rgba(34,197,94,0.9)',
        backgroundColor: isExpense ? 'rgba(255,107,129,0.08)' : 'rgba(34,197,94,0.08)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.35,
        pointRadius: values.some(v => v > 0) ? 4 : 0,
        pointBackgroundColor: isExpense ? '#ff6b81' : '#22c55e',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => `¥${ctx.parsed.toFixed(0)}` } }
      },
      scales: {
        x: {
          ticks: { maxTicksLimit: 8, font: { size: 10 } },
          grid: { display: false }
        },
        y: {
          ticks: { font: { size: 10 }, callback: (v) => `¥${v}` },
          grid: { color: 'rgba(0,0,0,0.04)' },
          beginAtZero: true
        }
      }
    }
  })
}

watch(() => [props.category, props.type, props.month], fetchAndRender)
onMounted(fetchAndRender)
</script>
