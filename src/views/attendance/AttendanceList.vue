<template>
  <div class="page-container">
    <el-card>
      <div class="toolbar">
        <el-date-picker v-model="currentDate" type="date" value-format="YYYY-MM-DD" 
          placeholder="选择日期" @change="loadData" />
        <el-button type="primary" style="margin-left: 10px" @click="batchSignIn">
          <el-icon><Check /></el-icon>批量签到
        </el-button>
        <el-button type="success" @click="batchSignOut">
          <el-icon><CircleCheck /></el-icon>批量签退
        </el-button>
      </div>

      <el-table :data="tableData" stripe v-loading="loading" @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="50" />
        <el-table-column prop="name" label="学生" width="100" />
        <el-table-column prop="grade" label="年级" width="100" />
        <el-table-column prop="sign_in_time" label="签到时间" width="120">
          <template #default="{ row }">
            <span v-if="row.sign_in_time" class="time-tag green">{{ row.sign_in_time }}</span>
            <span v-else class="time-tag gray">未签到</span>
          </template>
        </el-table-column>
        <el-table-column prop="sign_out_time" label="签退时间" width="120">
          <template #default="{ row }">
            <span v-if="row.sign_out_time" class="time-tag blue">{{ row.sign_out_time }}</span>
            <span v-else class="time-tag gray">未签退</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusMap[row.status]?.type" size="small">{{ statusMap[row.status]?.label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="success" @click="signIn(row)" :disabled="!!row.sign_in_time">签到</el-button>
            <el-button size="small" type="primary" @click="signOut(row)" :disabled="!row.sign_in_time || !!row.sign_out_time">签退</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useBranchStore } from '@/stores/branch'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'

const branchStore = useBranchStore()
const tableData = ref([])
const loading = ref(false)
const currentDate = ref(dayjs().format('YYYY-MM-DD'))
const selectedRows = ref([])

const statusMap = {
  normal: { label: '正常', type: 'success' },
  late: { label: '迟到', type: 'warning' },
  absent: { label: '缺勤', type: 'danger' },
  leave: { label: '请假', type: 'info' }
}

onMounted(() => loadData())

async function loadData() {
  loading.value = true
  
  // 获取所有在托学生
  const studentsRes = await window.electronAPI.query(
    'SELECT id, name, grade FROM students WHERE branch_id = ? AND status = ? ORDER BY name',
    [branchStore.currentBranch.id, 'active']
  )
  
  if (!studentsRes.success) {
    loading.value = false
    return
  }

  // 获取当天考勤记录
  const attendanceRes = await window.electronAPI.query(
    `SELECT * FROM attendance WHERE date = ? AND student_id IN 
     (SELECT id FROM students WHERE branch_id = ?)`,
    [currentDate.value, branchStore.currentBranch.id]
  )
  
  const attendanceMap = {}
  if (attendanceRes.success) {
    attendanceRes.data.forEach(a => {
      attendanceMap[a.student_id] = a
    })
  }

  // 检查请假
  const leavesRes = await window.electronAPI.query(
    `SELECT student_id FROM leaves WHERE ? BETWEEN start_date AND end_date`,
    [currentDate.value]
  )
  const leaveSet = new Set(leavesRes.success ? leavesRes.data.map(l => l.student_id) : [])

  // 合并数据
  tableData.value = studentsRes.data.map(s => {
    const att = attendanceMap[s.id] || {}
    return {
      ...s,
      student_id: s.id,
      attendance_id: att.id,
      sign_in_time: att.sign_in_time,
      sign_out_time: att.sign_out_time,
      status: leaveSet.has(s.id) ? 'leave' : (att.status || 'absent'),
      remark: att.remark
    }
  })
  
  loading.value = false
}

function handleSelectionChange(rows) {
  selectedRows.value = rows
}

async function signIn(row) {
  const time = dayjs().format('HH:mm:ss')
  
  if (row.attendance_id) {
    await window.electronAPI.query(
      'UPDATE attendance SET sign_in_time = ?, status = ? WHERE id = ?',
      [time, 'normal', row.attendance_id]
    )
  } else {
    await window.electronAPI.query(
      'INSERT INTO attendance (student_id, date, sign_in_time, status) VALUES (?, ?, ?, ?)',
      [row.student_id, currentDate.value, time, 'normal']
    )
  }
  
  ElMessage.success(`${row.name} 签到成功`)
  loadData()
}

async function signOut(row) {
  const time = dayjs().format('HH:mm:ss')
  
  await window.electronAPI.query(
    'UPDATE attendance SET sign_out_time = ? WHERE id = ?',
    [time, row.attendance_id]
  )
  
  ElMessage.success(`${row.name} 签退成功`)
  loadData()
}

async function batchSignIn() {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择学生')
    return
  }
  
  const time = dayjs().format('HH:mm:ss')
  for (const row of selectedRows.value) {
    if (!row.sign_in_time) {
      if (row.attendance_id) {
        await window.electronAPI.query(
          'UPDATE attendance SET sign_in_time = ?, status = ? WHERE id = ?',
          [time, 'normal', row.attendance_id]
        )
      } else {
        await window.electronAPI.query(
          'INSERT INTO attendance (student_id, date, sign_in_time, status) VALUES (?, ?, ?, ?)',
          [row.student_id, currentDate.value, time, 'normal']
        )
      }
    }
  }
  
  ElMessage.success('批量签到成功')
  loadData()
}

async function batchSignOut() {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择学生')
    return
  }
  
  const time = dayjs().format('HH:mm:ss')
  for (const row of selectedRows.value) {
    if (row.sign_in_time && !row.sign_out_time && row.attendance_id) {
      await window.electronAPI.query(
        'UPDATE attendance SET sign_out_time = ? WHERE id = ?',
        [time, row.attendance_id]
      )
    }
  }
  
  ElMessage.success('批量签退成功')
  loadData()
}
</script>

<style scoped>
.toolbar { display: flex; margin-bottom: 16px; }
.time-tag {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 13px;
}
.time-tag.green { background: #e1f3d8; color: #67c23a; }
.time-tag.blue { background: #d9ecff; color: #409eff; }
.time-tag.gray { background: #f4f4f5; color: #909399; }
</style>
