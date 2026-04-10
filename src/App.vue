<template>
  <div class="min-h-screen bg-[#f8f9fe]">
    <!-- 页面切换动画 -->
    <transition :name="transitionName">
      <!-- 首页 -->
      <div v-if="page === 'home'" key="home" class="min-h-screen pb-20">
        <div class="bg-gradient-to-r from-primary to-primary-light px-5 pt-12 pb-8 rounded-b-3xl">
          <h1 class="text-white text-2xl font-bold text-center">心动账本</h1>
          <p class="text-white/80 text-sm text-center mt-1">{{ currentMonth }}</p>
          <div class="flex justify-center gap-3 mt-3">
            <button
              class="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
              :class="identity === '男朋友'
                ? 'bg-white text-primary shadow-md'
                : 'bg-white/20 text-white'"
              @click="identity = '男朋友'"
            >👦 男朋友</button>
            <button
              class="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
              :class="identity === '女朋友'
                ? 'bg-white text-primary shadow-md'
                : 'bg-white/20 text-white'"
              @click="identity = '女朋友'"
            >👧 女朋友</button>
          </div>
        </div>
        <div class="px-4 -mt-4 space-y-4">
          <Dashboard
            :month="currentMonth"
            ref="dashboardRef"
            @month-change="onMonthChange"
            @open-detail="onOpenDetail"
          />
          <AiInput :identity="identity" @saved="onRecordSaved" />
          <HistoryList :month="currentMonth" ref="historyRef" />
        </div>
      </div>

      <!-- 详情页（支出/收入） -->
      <div v-else-if="page === 'detail'" key="detail" class="min-h-screen">
        <DetailPage
          :type="detailType"
          :month="currentMonth"
          @back="goBack"
          @open-chart="onOpenChart"
        />
      </div>

      <!-- 图表页 -->
      <div v-else-if="page === 'chart'" key="chart" class="min-h-screen">
        <ChartPage
          :category="chartCategory"
          :type="chartType"
          :month="currentMonth"
          @back="page = 'detail'"
        />
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import Dashboard from './components/Dashboard.vue'
import AiInput from './components/AiInput.vue'
import HistoryList from './components/HistoryList.vue'
import DetailPage from './components/DetailPage.vue'
import ChartPage from './components/ChartPage.vue'

const currentMonth = ref(new Date().toISOString().slice(0, 7))
const identity = ref(localStorage.getItem('identity') || '男朋友')
watch(identity, (val) => localStorage.setItem('identity', val))
const historyRef = ref(null)
const dashboardRef = ref(null)

const page = ref('home')
const detailType = ref('支出')
const chartCategory = ref('')
const chartType = ref('支出')
const transitionName = ref('slide-left')

function goBack() {
  transitionName.value = 'slide-right'
  page.value = 'home'
}

function onOpenDetail(type) {
  detailType.value = type
  transitionName.value = 'slide-left'
  page.value = 'detail'
}

function onOpenChart(category, type) {
  chartCategory.value = category
  chartType.value = type
  transitionName.value = 'slide-left'
  page.value = 'chart'
}

function onMonthChange(month) {
  currentMonth.value = month
}

function onRecordSaved() {
  dashboardRef.value?.refresh()
  historyRef.value?.refresh()
}
</script>

<style>
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.3s ease;
  position: absolute;
  width: 100%;
}
.slide-left-enter-from { transform: translateX(100%); }
.slide-left-leave-to { transform: translateX(-30%); }
.slide-right-enter-from { transform: translateX(-30%); }
.slide-right-leave-to { transform: translateX(100%); }
</style>
