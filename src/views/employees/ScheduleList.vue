<template>
  <div class="page-container">
    <el-card>
      <div class="toolbar">
        <el-date-picker v-model="currentWeek" type="week" format="YYYY 第 ww 周" 
          placeholder="选择周" @change="loadData" />
        <el-button type="primary" style="margin-left: auto" @click="openDialog()">
          <el-icon><Plus /></el-icon>新增排班
        </el-button>
      </div>

      <el-table :data="tableData" stripe v-loading="loading" border>
        <el-table-column prop="name" label="员工" width="100" fixed />
        <el-table-column v-for="(day, index) in weekDays" :key="index" :label="day.label" width="120">
          <template #default="{ row }">
            <div class="schedule-cell">
              <el-tag v-if="row.schedules[day.date]" size="small" :type="shiftTypeMap[row.schedules[day.date]]?.type">
                {{ shiftTypeMap[row.schedules[day.date]]?.label }}
              </el-tag>
              <span v-else class="rest">休息</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="editSchedule(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑排班' : '新增排班'" width="500px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="员工" required>
          <el-select v-model="form.employee_id" placeholder="请选择员工" style="width: 100%">
            <el-option v-for="e in employees" :key="e.id" :label="e.name" :value="e.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期" required>
          <el-date-picker v-model="form.date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="班次" required>
          <el-select v-model="form.shift_type" placeholder="请选择班次" style="width: 100%">
            <el-option label="早班" value="morning" />
            <el-option label="午班" value="noon" />
            <el-option label="晚班" value="evening" />
            <el-option label="全天" value="full" />
          </el-select>
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

    <!-- 编辑员工周排班 -->
    <el-dialog v-model="weekDialogVisible" :title="`编辑 ${editEmployee?.name} 的排班`" width="600px">
      <el-form label-width="100px">
        <el-form-item v-for="day in weekDays" :key="day.date" :label="day.label">
          <el-select v-model="weekSchedule[day.date]" placeholder="休息" clearable style="width: 200px">
            <el-option label="早班" value="morning" />
            <el-option label="午班" value="noon" />
            <el-option label="晚班" value="evening" />
            <el-option label="全天" value="full" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="weekDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveWeekSchedule">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useBranchStore } from '@/stores/branch'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import weekOfYear from 'dayjs/plugin/weekOfYear'
dayjs.extend(weekOfYear)

const branchStore = useBranchStore()
const tableData = ref([])
const employees = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const weekDialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const currentWeek = ref(new Date())
const editEmployee = ref(null)
const weekSchedule = ref({})

const shiftTypeMap = {
  morning: { label: '早班', type: 'success' },
  noon: { label: '午班', type: 'warning' },
  evening: { label: '晚班', type: 'primary' },
  full: { label: '全天', type: 'danger' }
}

const defaultForm = { employee_id: null, date: '', shift_type: '', remark: '' }
const form = ref({ ...defaultForm })

const weekDays = computed(() => {
  const start = dayjs(currentWeek.value).startOf('week')
  const days = []
  const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  for (let i = 0; i < 7; i++) {
    const d = start.add(i, 'day')
    days.push({
      date: d.format('YYYY-MM-DD'),
      label: `${dayNames[i]}\n${d.format('MM-DD')}`
    })
  }
  return days
})

onMounted(() => {
  loadEmployees()
  loadData()
})

async function loadEmployees() {
  const result = await window.electronAPI.query(
    'SELECT id, name FROM employees WHERE branch_id = ? AND status = ?',
    [branchStore.currentBranch.id, 'active']
  )
  employees.value = result.success ? result.data : []
}

async function loadData() {
  loading.value = true
  
  const startDate = weekDays.value[0].date
  const endDate = weekDays.value[6].date
  
  // 获取该周所有排班
  const scheduleRes = await window.electronAPI.query(
    `SELECT s.*, e.name FROM schedules s 
     LEFT JOIN employees e ON s.employee_id = e.id
     WHERE e.branch_id = ? AND s.date BETWEEN ? AND ?`,
    [branchStore.currentBranch.id, startDate, endDate]
  )
  
  // 按员工分组
  const scheduleMap = {}
  if (scheduleRes.success) {
    scheduleRes.data.forEach(s => {
      if (!scheduleMap[s.employee_id]) {
        scheduleMap[s.employee_id] = { id: s.employee_id, name: s.name, schedules: {} }
      }
      scheduleMap[s.employee_id].schedules[s.date] = s.shift_type
    })
  }
  
  // 补充没有排班的员工
  employees.value.forEach(e => {
    if (!scheduleMap[e.id]) {
      scheduleMap[e.id] = { id: e.id, name: e.name, schedules: {} }
    }
  })
  
  tableData.value = Object.values(scheduleMap)
  loading.value = false
}

function openDialog(row = null) {
  isEdit.value = false
  editId.value = null
  form.value = { ...defaultForm }
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!form.value.employee_id || !form.value.date || !form.value.shift_type) {
    ElMessage.warning('请填写完整信息')
    return
  }

  // 检查是否已存在
  const existRes = await window.electronAPI.get(
    'SELECT id FROM schedules WHERE employee_id = ? AND date = ?',
    [form.value.employee_id, form.value.date]
  )
  
  let result
  if (existRes.data) {
    result = await window.electronAPI.query(
      'UPDATE schedules SET shift_type=?, remark=? WHERE id=?',
      [form.value.shift_type, form.value.remark, existRes.data.id]
    )
  } else {
    result = await window.electronAPI.query(
      'INSERT INTO schedules (employee_id, date, shift_type, remark) VALUES (?, ?, ?, ?)',
      [form.value.employee_id, form.value.date, form.value.shift_type, form.value.remark]
    )
  }

  if (result.success) {
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadData()
  }
}

function editSchedule(row) {
  editEmployee.value = row
  weekSchedule.value = { ...row.schedules }
  weekDialogVisible.value = true
}

async function saveWeekSchedule() {
  // 先删除该员工该周的所有排班
  const startDate = weekDays.value[0].date
  const endDate = weekDays.value[6].date
  await window.electronAPI.query(
    'DELETE FROM schedules WHERE employee_id = ? AND date BETWEEN ? AND ?',
    [editEmployee.value.id, startDate, endDate]
  )
  
  // 添加新排班
  for (const [date, shift] of Object.entries(weekSchedule.value)) {
    if (shift) {
      await window.electronAPI.query(
        'INSERT INTO schedules (employee_id, date, shift_type) VALUES (?, ?, ?)',
        [editEmployee.value.id, date, shift]
      )
    }
  }
  
  ElMessage.success('保存成功')
  weekDialogVisible.value = false
  loadData()
}
</script>

<style scoped>
.toolbar { display: flex; margin-bottom: 16px; }
.schedule-cell { text-align: center; }
.rest { color: #999; font-size: 12px; }
</style>
