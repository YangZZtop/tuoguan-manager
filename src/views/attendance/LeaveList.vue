<template>
  <div class="page-container">
    <el-card>
      <div class="toolbar">
        <el-input v-model="searchKey" placeholder="搜索学生" style="width: 200px" clearable @clear="loadData">
          <template #append><el-button @click="loadData"><el-icon><Search /></el-icon></el-button></template>
        </el-input>
        <el-button type="primary" style="margin-left: auto" @click="openDialog()">
          <el-icon><Plus /></el-icon>新增请假
        </el-button>
      </div>

      <el-table :data="tableData" stripe v-loading="loading">
        <el-table-column prop="student_name" label="学生" width="100" />
        <el-table-column prop="start_date" label="开始日期" width="120" />
        <el-table-column prop="end_date" label="结束日期" width="120" />
        <el-table-column prop="days" label="天数" width="80">
          <template #default="{ row }">{{ row.days }}天</template>
        </el-table-column>
        <el-table-column prop="reason" label="请假原因" />
        <el-table-column prop="created_at" label="登记时间" width="180" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openDialog(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑请假' : '新增请假'" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="学生" required>
          <el-select v-model="form.student_id" placeholder="请选择学生" filterable style="width: 100%">
            <el-option v-for="s in students" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="请假日期" required>
          <el-date-picker v-model="dateRange" type="daterange" range-separator="至"
            start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="请假原因">
          <el-input v-model="form.reason" type="textarea" rows="3" placeholder="请输入请假原因" />
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
import { ref, onMounted, watch } from 'vue'
import { useBranchStore } from '@/stores/branch'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'

const branchStore = useBranchStore()
const tableData = ref([])
const students = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const searchKey = ref('')
const dateRange = ref([])

const defaultForm = { student_id: null, start_date: '', end_date: '', reason: '' }
const form = ref({ ...defaultForm })

watch(dateRange, (val) => {
  if (val?.length === 2) {
    form.value.start_date = val[0]
    form.value.end_date = val[1]
  }
})

onMounted(() => {
  loadData()
  loadStudents()
})

async function loadData() {
  loading.value = true
  let sql = `SELECT l.*, s.name as student_name FROM leaves l 
             LEFT JOIN students s ON l.student_id = s.id
             WHERE s.branch_id = ?`
  const params = [branchStore.currentBranch.id]
  
  if (searchKey.value) {
    sql += ' AND s.name LIKE ?'
    params.push(`%${searchKey.value}%`)
  }
  sql += ' ORDER BY l.id DESC'
  
  const result = await window.electronAPI.query(sql, params)
  if (result.success) {
    tableData.value = result.data.map(row => ({
      ...row,
      days: dayjs(row.end_date).diff(dayjs(row.start_date), 'day') + 1
    }))
  }
  loading.value = false
}

async function loadStudents() {
  const result = await window.electronAPI.query(
    'SELECT id, name FROM students WHERE branch_id = ? AND status = ?',
    [branchStore.currentBranch.id, 'active']
  )
  students.value = result.success ? result.data : []
}

function openDialog(row = null) {
  if (row) {
    isEdit.value = true
    editId.value = row.id
    form.value = { ...row }
    dateRange.value = [row.start_date, row.end_date]
  } else {
    isEdit.value = false
    editId.value = null
    form.value = { ...defaultForm }
    dateRange.value = []
  }
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!form.value.student_id || !form.value.start_date || !form.value.end_date) {
    ElMessage.warning('请填写完整信息')
    return
  }

  let result
  if (isEdit.value) {
    result = await window.electronAPI.query(
      'UPDATE leaves SET student_id=?, start_date=?, end_date=?, reason=? WHERE id=?',
      [form.value.student_id, form.value.start_date, form.value.end_date, form.value.reason, editId.value]
    )
  } else {
    result = await window.electronAPI.query(
      'INSERT INTO leaves (student_id, start_date, end_date, reason) VALUES (?, ?, ?, ?)',
      [form.value.student_id, form.value.start_date, form.value.end_date, form.value.reason]
    )
  }

  if (result.success) {
    ElMessage.success(isEdit.value ? '修改成功' : '添加成功')
    dialogVisible.value = false
    loadData()
  }
}

async function handleDelete(row) {
  await ElMessageBox.confirm('确定删除该记录吗？', '提示', { type: 'warning' })
  const result = await window.electronAPI.query('DELETE FROM leaves WHERE id = ?', [row.id])
  if (result.success) {
    ElMessage.success('删除成功')
    loadData()
  }
}
</script>

<style scoped>
.toolbar { display: flex; margin-bottom: 16px; }
</style>
