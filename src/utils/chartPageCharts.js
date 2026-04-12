import {
  Chart,
  ArcElement,
  DoughnutController,
  LineController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js'

let registered = false

export function registerChartPageCharts() {
  if (registered) return

  Chart.register(
    ArcElement,
    DoughnutController,
    LineController,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend
  )

  registered = true
}
