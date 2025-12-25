<template>
  <div class="page-container">
    <el-card>
      <div class="toolbar">
        <el-button type="primary" @click="openDialog()">
          <el-icon><Plus /></el-icon>新增用户
        </el-button>
      </div>

      <el-table :data="tableData" stripe v-loading="loading">
        <el-table-column prop="username" label="用户名" width="150" />
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'danger' : 'info'" size="small">
              {{ row.role === 'admin' ? '管理员' : '普通用户' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
              {{ row.status === 'active' ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180" />
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openDialog(row)">编辑</el-button>
            <el-button size="small" type="warning" @click="resetPassword(row)">重置密码</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)" :disabled="row.username === 'admin'">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑用户' : '新增用户'" width="450px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="用户名" required>
          <el-input v-model="form.username" placeholder="请输入用户名" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="form.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="密码" required v-if="!isEdit">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" show-password />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.role" style="width: 100%">
            <el-option label="管理员" value="admin" />
            <el-option label="普通用户" value="user" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" active-value="active" inactive-value="disabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 重置密码弹窗 -->
    <el-dialog v-model="passwordDialogVisible" title="重置密码" width="400px">
      <el-form :model="passwordForm" label-width="80px">
        <el-form-item label="新密码" required>
          <el-input v-model="passwordForm.password" type="password" placeholder="请输入新密码" show-password />
        </el-form-item>
        <el-form-item label="确认密码" required>
          <el-input v-model="passwordForm.confirmPassword" type="password" placeholder="请再次输入密码" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="passwordDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmResetPassword">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const tableData = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const passwordDialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const resetUserId = ref(null)

const defaultForm = { username: '', name: '', password: '', role: 'user', status: 'active' }
const form = ref({ ...defaultForm })
const passwordForm = ref({ password: '', confirmPassword: '' })

onMounted(() => loadData())

async function loadData() {
  loading.value = true
  const result = await window.electronAPI.query('SELECT * FROM users ORDER BY id')
  tableData.value = result.success ? result.data : []
  loading.value = false
}

function openDialog(row = null) {
  if (row) {
    isEdit.value = true
    editId.value = row.id
    form.value = { ...row }
  } else {
    isEdit.value = false
    editId.value = null
    form.value = { ...defaultForm }
  }
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!form.value.username) {
    ElMessage.warning('请输入用户名')
    return
  }
  if (!isEdit.value && !form.value.password) {
    ElMessage.warning('请输入密码')
    return
  }

  let result
  if (isEdit.value) {
    result = await window.electronAPI.query(
      'UPDATE users SET name=?, role=?, status=? WHERE id=?',
      [form.value.name, form.value.role, form.value.status, editId.value]
    )
  } else {
    // 检查用户名是否存在
    const exist = await window.electronAPI.get(
      'SELECT id FROM users WHERE username = ?',
      [form.value.username]
    )
    if (exist.data) {
      ElMessage.error('用户名已存在')
      return
    }
    
    result = await window.electronAPI.query(
      'INSERT INTO users (username, password, name, role, status) VALUES (?, ?, ?, ?, ?)',
      [form.value.username, form.value.password, form.value.name, form.value.role, form.value.status]
    )
  }

  if (result.success) {
    ElMessage.success(isEdit.value ? '修改成功' : '添加成功')
    dialogVisible.value = false
    loadData()
  }
}

async function handleDelete(row) {
  if (row.username === 'admin') {
    ElMessage.warning('不能删除默认管理员')
    return
  }
  await ElMessageBox.confirm('确定删除该用户吗？', '提示', { type: 'warning' })
  const result = await window.electronAPI.query('DELETE FROM users WHERE id = ?', [row.id])
  if (result.success) {
    ElMessage.success('删除成功')
    loadData()
  }
}

function resetPassword(row) {
  resetUserId.value = row.id
  passwordForm.value = { password: '', confirmPassword: '' }
  passwordDialogVisible.value = true
}

async function confirmResetPassword() {
  if (!passwordForm.value.password) {
    ElMessage.warning('请输入新密码')
    return
  }
  if (passwordForm.value.password !== passwordForm.value.confirmPassword) {
    ElMessage.warning('两次密码不一致')
    return
  }
  
  const result = await window.electronAPI.query(
    'UPDATE users SET password = ? WHERE id = ?',
    [passwordForm.value.password, resetUserId.value]
  )
  
  if (result.success) {
    ElMessage.success('密码重置成功')
    passwordDialogVisible.value = false
  }
}
</script>

<style scoped>
.toolbar { display: flex; margin-bottom: 16px; }
</style>
