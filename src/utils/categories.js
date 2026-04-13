import { ref } from 'vue'

const categories = ref([])
const loaded = ref(false)

export function useCategories() {
  async function fetchCategories() {
    try {
      const res = await fetch('/api/categories')
      categories.value = await res.json()
      loaded.value = true
    } catch {
      // 忽略
    }
  }

  function categoryIcon(name) {
    const found = categories.value.find(c => c.name === name)
    return found ? found.icon : '📌'
  }

  if (!loaded.value) fetchCategories()

  return { categories, fetchCategories, categoryIcon }
}
