<template>
  <div class="page-container">
    <el-card>
      <div class="toolbar">
        <el-button type="primary" @click="openDialog()">
          <el-icon><Plus /></el-icon>新增分店
        </el-button>
      </div>

      <el-table :data="tableData" stripe v-loading="loading">
        <el-table-column prop="name" label="分店名称" width="150" />
        <el-table-column prop="address" label="地址" />
        <el-table-column prop="phone" label="联系电话" width="130" />
        <el-table-column prop="manager" label="负责人" width="100" />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
              {{ row.status === 'active' ? '营业中' : '已关闭' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openDialog(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
            <el-button size="small" v-if="row.status === 'active'" type="warning" @click="handleClose(row)">关闭</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑分店' : '新增分店'" width="500px">
      <el-form :model="form" label-width="100px">
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
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
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
const isEdit = ref(false)
const editId = ref(null)

const defaultForm = { name: '', address: '', phone: '', manager: '', remark: '' }
const form = ref({ ...defaultForm })

onMounted(() => loadData())

async function loadData() {
  loading.value = true
  const result = await window.electronAPI.query('SELECT * FROM branches ORDER BY id DESC')
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
  if (!form.value.name) {
    ElMessage.warning('请输入分店名称')
    return
  }

  let result
  if (isEdit.value) {
    result = await window.electronAPI.query(
      'UPDATE branches SET name=?, address=?, phone=?, manager=?, remark=? WHERE id=?',
      [form.value.name, form.value.address, form.value.phone, form.value.manager, form.value.remark, editId.value]
    )
  } else {
    result = await window.electronAPI.query(
      'INSERT INTO branches (name, address, phone, manager, remark, status) VALUES (?, ?, ?, ?, ?, ?)',
      [form.value.name, form.value.address, form.value.phone, form.value.manager, form.value.remark, 'active']
    )
  }

  if (result.success) {
    ElMessage.success(isEdit.value ? '修改成功' : '添加成功')
    dialogVisible.value = false
    loadData()
  }
}

async function handleDelete(row) {
  await ElMessageBox.confirm('删除分店将同时删除该分店下所有数据，确定删除吗？', '警告', { type: 'warning' })
  
  // 删除关联数据
  await window.electronAPI.query('DELETE FROM expenses WHERE branch_id = ?', [row.id])
  await window.electronAPI.query('DELETE FROM schedules WHERE employee_id IN (SELECT id FROM employees WHERE branch_id = ?)', [row.id])
  await window.electronAPI.query('DELETE FROM employees WHERE branch_id = ?', [row.id])
  await window.electronAPI.query('DELETE FROM attendance WHERE student_id IN (SELECT id FROM students WHERE branch_id = ?)', [row.id])
  await window.electronAPI.query('DELETE FROM leaves WHERE student_id IN (SELECT id FROM students WHERE branch_id = ?)', [row.id])
  await window.electronAPI.query('DELETE FROM payments WHERE student_id IN (SELECT id FROM students WHERE branch_id = ?)', [row.id])
  await window.electronAPI.query('DELETE FROM student_class WHERE student_id IN (SELECT id FROM students WHERE branch_id = ?)', [row.id])
  await window.electronAPI.query('DELETE FROM students WHERE branch_id = ?', [row.id])
  await window.electronAPI.query('DELETE FROM classes WHERE branch_id = ?', [row.id])
  
  const result = await window.electronAPI.query('DELETE FROM branches WHERE id = ?', [row.id])
  if (result.success) {
    ElMessage.success('删除成功')
    loadData()
  }
}

async function handleClose(row) {
  await ElMessageBox.confirm('确定关闭该分店吗？', '提示', { type: 'warning' })
  const result = await window.electronAPI.query(
    'UPDATE branches SET status = ? WHERE id = ?',
    ['closed', row.id]
  )
  if (result.success) {
    ElMessage.success('操作成功')
    loadData()
  }
}
</script>

<style scoped>
.toolbar { display: flex; margin-bottom: 16px; }
</style>
