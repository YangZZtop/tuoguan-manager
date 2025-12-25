import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useBranchStore = defineStore('branch', () => {
  const currentBranch = ref(null)
  const branches = ref([])

  async function loadBranches() {
    const result = await window.electronAPI.query('SELECT * FROM branches WHERE status = ? ORDER BY id', ['active'])
    if (result.success) {
      branches.value = result.data
    }
    return branches.value
  }

  function setBranch(branch) {
    currentBranch.value = branch
    localStorage.setItem('currentBranchId', branch.id)
  }

  function clearBranch() {
    currentBranch.value = null
    localStorage.removeItem('currentBranchId')
  }

  async function initBranch() {
    const savedId = localStorage.getItem('currentBranchId')
    if (savedId) {
      await loadBranches()
      const branch = branches.value.find(b => b.id === parseInt(savedId))
      if (branch) {
        currentBranch.value = branch
        return true
      }
    }
    return false
  }

  return {
    currentBranch,
    branches,
    loadBranches,
    setBranch,
    clearBranch,
    initBranch
  }
})
