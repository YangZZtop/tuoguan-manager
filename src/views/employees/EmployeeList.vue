<template>
  <div class="page-container">
    <el-card>
      <div class="toolbar">
        <el-input v-model="searchKey" placeholder="搜索员工" style="width: 200px" clearable @clear="loadData">
          <template #append><el-button @click="loadData"><el-icon><Search /></el-icon></el-button></template>
        </el-input>
        <el-button type="primary" style="margin-left: auto" @click="openDialog()">
          <el-icon><Plus /></el-icon>新增员工
        </el-button>
      </div>

      <el-table :data="tableData" stripe v-loading="loading">
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="phone" label="电话" width="130" />
        <el-table-column prop="role" label="职位" width="100" />
        <el-table-column prop="salary" label="工资" width="100">
          <template #default="{ row }">¥{{ row.salary || 0 }}</template>
        </el-table-column>
        <el-table-column prop="entry_date" label="入职日期" width="120" />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
              {{ row.status === 'active' ? '在职' : '离职' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openDialog(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
            <el-button size="small" v-if="row.status === 'active'" type="warning" @click="handleQuit(row)">离职</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑员工' : '新增员工'" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="姓名" required>
          <el-input v-model="form.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="电话">
          <el-input v-model="form.phone" placeholder="请输入电话" />
        </el-form-item>
        <el-form-item label="职位">
          <el-select v-model="form.role" placeholder="请选择职位" style="width: 100%">
            <el-option label="托管老师" value="托管老师" />
            <el-option label="厨师" value="厨师" />
            <el-option label="保洁" value="保洁" />
            <el-option label="店长" value="店长" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="工资">
          <el-input-number v-model="form.salary" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="入职日期">
          <el-date-picker v-model="form.entry_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
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
import { useBranchStore } from '@/stores/branch'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'

const branchStore = useBranchStore()
const tableData = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const searchKey = ref('')

const defaultForm = {
  name: '', phone: '', role: '托管老师', salary: 0,
  entry_date: dayjs().format('YYYY-MM-DD'), remark: ''
}
const form = ref({ ...defaultForm })

onMounted(() => loadData())

async function loadData() {
  loading.value = true
  let sql = 'SELECT * FROM employees WHERE branch_id = ?'
  const params = [branchStore.currentBranch.id]
  
  if (searchKey.value) {
    sql += ' AND name LIKE ?'
    params.push(`%${searchKey.value}%`)
  }
  sql += ' ORDER BY id DESC'
  
  const result = await window.electronAPI.query(sql, params)
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
    ElMessage.warning('请输入员工姓名')
    return
  }

  let result
  if (isEdit.value) {
    result = await window.electronAPI.query(
      'UPDATE employees SET name=?, phone=?, role=?, salary=?, entry_date=?, remark=? WHERE id=?',
      [form.value.name, form.value.phone, form.value.role, form.value.salary, form.value.entry_date, form.value.remark, editId.value]
    )
  } else {
    result = await window.electronAPI.query(
      'INSERT INTO employees (branch_id, name, phone, role, salary, entry_date, remark, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [branchStore.currentBranch.id, form.value.name, form.value.phone, form.value.role, form.value.salary, form.value.entry_date, form.value.remark, 'active']
    )
  }

  if (result.success) {
    ElMessage.success(isEdit.value ? '修改成功' : '添加成功')
    dialogVisible.value = false
    loadData()
  }
}

async function handleDelete(row) {
  await ElMessageBox.confirm('确定删除该员工吗？', '提示', { type: 'warning' })
  const result = await window.electronAPI.query('DELETE FROM employees WHERE id = ?', [row.id])
  if (result.success) {
    ElMessage.success('删除成功')
    loadData()
  }
}

async function handleQuit(row) {
  await ElMessageBox.confirm('确定该员工离职吗？', '提示', { type: 'warning' })
  const result = await window.electronAPI.query(
    'UPDATE employees SET status = ? WHERE id = ?',
    ['quit', row.id]
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
