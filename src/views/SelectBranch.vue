<template>
  <div class="select-branch">
    <div class="container">
      <h1>托管店管理系统</h1>
      <p class="subtitle">请选择要管理的分店</p>
      
      <div class="branch-list" v-if="branches.length > 0">
        <div 
          class="branch-card" 
          v-for="branch in branches" 
          :key="branch.id"
          @click="selectBranch(branch)"
        >
          <el-icon class="icon"><Shop /></el-icon>
          <div class="info">
            <h3>{{ branch.name }}</h3>
            <p>{{ branch.address || '暂无地址' }}</p>
          </div>
        </div>
      </div>
      
      <el-empty v-else description="暂无分店，请先添加">
        <el-button type="primary" @click="showAddDialog = true">添加分店</el-button>
      </el-empty>

      <div class="actions" v-if="branches.length > 0">
        <el-button @click="showAddDialog = true">
          <el-icon><Plus /></el-icon>添加新分店
        </el-button>
      </div>
    </div>

    <!-- 添加分店弹窗 -->
    <el-dialog v-model="showAddDialog" title="添加分店" width="400px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="分店名称" required>
          <el-input v-model="form.name" placeholder="请输入分店名称" />
        </el-form-item>
        <el-form-item label="地址">
          <el-input v-model="form.address" placeholder="请输入地址" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="form.phone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="负责人">
          <el-input v-model="form.manager" placeholder="请输入负责人" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="addBranch">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBranchStore } from '@/stores/branch'
import { ElMessage } from 'element-plus'

const router = useRouter()
const branchStore = useBranchStore()
const branches = ref([])
const showAddDialog = ref(false)
const form = ref({
  name: '',
  address: '',
  phone: '',
  manager: ''
})

onMounted(async () => {
  // 检查是否有已保存的分店
  const hasInit = await branchStore.initBranch()
  if (hasInit) {
    router.push('/main')
    return
  }
  await loadBranches()
})

async function loadBranches() {
  branches.value = await branchStore.loadBranches()
}

function selectBranch(branch) {
  branchStore.setBranch(branch)
  router.push('/main')
}

async function addBranch() {
  if (!form.value.name) {
    ElMessage.warning('请输入分店名称')
    return
  }
  
  const result = await window.electronAPI.query(
    'INSERT INTO branches (name, address, phone, manager) VALUES (?, ?, ?, ?)',
    [form.value.name, form.value.address, form.value.phone, form.value.manager]
  )
  
  if (result.success) {
    ElMessage.success('添加成功')
    showAddDialog.value = false
    form.value = { name: '', address: '', phone: '', manager: '' }
    await loadBranches()
  }
}
</script>

<style scoped>
.select-branch {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.container {
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
  min-width: 500px;
  text-align: center;
}

h1 {
  color: #333;
  margin-bottom: 8px;
}

.subtitle {
  color: #666;
  margin-bottom: 30px;
}

.branch-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.branch-card {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.branch-card:hover {
  border-color: #667eea;
  background: #f8f9ff;
  transform: translateX(5px);
}

.branch-card .icon {
  font-size: 32px;
  color: #667eea;
  margin-right: 16px;
}

.branch-card .info {
  text-align: left;
}

.branch-card .info h3 {
  margin: 0 0 4px 0;
  color: #333;
}

.branch-card .info p {
  margin: 0;
  color: #999;
  font-size: 13px;
}

.actions {
  margin-top: 20px;
}
</style>
