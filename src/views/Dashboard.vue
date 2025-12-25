<template>
  <div class="dashboard">
    <el-row :gutter="20">
      <el-col :span="6">
        <div class="stat-card blue">
          <div class="icon"><el-icon><User /></el-icon></div>
          <div class="info">
            <p class="value">{{ stats.studentCount }}</p>
            <p class="label">在托学生</p>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card green">
          <div class="icon"><el-icon><Money /></el-icon></div>
          <div class="info">
            <p class="value">¥{{ stats.monthIncome }}</p>
            <p class="label">本月收入</p>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card orange">
          <div class="icon"><el-icon><Wallet /></el-icon></div>
          <div class="info">
            <p class="value">¥{{ stats.monthExpense }}</p>
            <p class="label">本月支出</p>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card purple">
          <div class="icon"><el-icon><Warning /></el-icon></div>
          <div class="info">
            <p class="value">{{ stats.overdueCount }}</p>
            <p class="label">欠费学生</p>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="12">
        <el-card header="今日考勤">
          <div class="attendance-summary">
            <div class="item">
              <span class="num green">{{ todayAttendance.signedIn }}</span>
              <span class="text">已签到</span>
            </div>
            <div class="item">
              <span class="num orange">{{ todayAttendance.notSignedIn }}</span>
              <span class="text">未签到</span>
            </div>
            <div class="item">
              <span class="num blue">{{ todayAttendance.onLeave }}</span>
              <span class="text">请假</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card header="快捷操作">
          <div class="quick-actions">
            <el-button type="primary" @click="$router.push('/main/students')">
              <el-icon><Plus /></el-icon>新增学生
            </el-button>
            <el-button type="success" @click="$router.push('/main/attendance')">
              <el-icon><Check /></el-icon>学生签到
            </el-button>
            <el-button type="warning" @click="$router.push('/main/payments')">
              <el-icon><Money /></el-icon>收费登记
            </el-button>
            <el-button type="info" @click="$router.push('/main/expenses')">
              <el-icon><Wallet /></el-icon>支出登记
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="16">
        <el-card header="收支趋势">
          <div ref="chartRef" style="height: 300px;"></div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card header="即将到期">
          <el-table :data="expiringList" size="small" max-height="300">
            <el-table-column prop="name" label="学生" width="80" />
            <el-table-column prop="end_date" label="到期日" />
            <el-table-column prop="days" label="剩余">
              <template #default="{ row }">
                <el-tag :type="row.days <= 3 ? 'danger' : 'warning'" size="small">
                  {{ row.days }}天
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useBranchStore } from '@/stores/branch'
import * as echarts from 'echarts'
import dayjs from 'dayjs'

const branchStore = useBranchStore()
const chartRef = ref(null)

const stats = ref({
  studentCount: 0,
  monthIncome: 0,
  monthExpense: 0,
  overdueCount: 0
})

const todayAttendance = ref({
  signedIn: 0,
  notSignedIn: 0,
  onLeave: 0
})

const expiringList = ref([])

onMounted(async () => {
  await loadStats()
  initChart()
})

async function loadStats() {
  const branchId = branchStore.currentBranch?.id
  if (!branchId) return

  // 在托学生数
  const studentRes = await window.electronAPI.get(
    'SELECT COUNT(*) as count FROM students WHERE branch_id = ? AND status = ?',
    [branchId, 'active']
  )
  stats.value.studentCount = studentRes.data?.count || 0

  // 本月收入
  const monthStart = dayjs().startOf('month').format('YYYY-MM-DD')
  const incomeRes = await window.electronAPI.get(
    'SELECT SUM(amount) as total FROM payments WHERE student_id IN (SELECT id FROM students WHERE branch_id = ?) AND pay_date >= ?',
    [branchId, monthStart]
  )
  stats.value.monthIncome = incomeRes.data?.total || 0

  // 本月支出
  const expenseRes = await window.electronAPI.get(
    'SELECT SUM(amount) as total FROM expenses WHERE branch_id = ? AND date >= ?',
    [branchId, monthStart]
  )
  stats.value.monthExpense = expenseRes.data?.total || 0

  // 今日考勤
  const today = dayjs().format('YYYY-MM-DD')
  const signedRes = await window.electronAPI.get(
    `SELECT COUNT(*) as count FROM attendance 
     WHERE student_id IN (SELECT id FROM students WHERE branch_id = ?) 
     AND date = ? AND sign_in_time IS NOT NULL`,
    [branchId, today]
  )
  todayAttendance.value.signedIn = signedRes.data?.count || 0
  todayAttendance.value.notSignedIn = stats.value.studentCount - todayAttendance.value.signedIn

  // 即将到期
  const weekLater = dayjs().add(7, 'day').format('YYYY-MM-DD')
  const expiringRes = await window.electronAPI.query(
    `SELECT s.name, p.end_date FROM payments p 
     JOIN students s ON p.student_id = s.id 
     WHERE s.branch_id = ? AND p.end_date BETWEEN ? AND ?
     ORDER BY p.end_date`,
    [branchId, today, weekLater]
  )
  if (expiringRes.success) {
    expiringList.value = expiringRes.data.map(item => ({
      ...item,
      days: dayjs(item.end_date).diff(dayjs(), 'day')
    }))
  }
}

function initChart() {
  const chart = echarts.init(chartRef.value)
  const months = []
  const incomeData = []
  const expenseData = []
  
  for (let i = 5; i >= 0; i--) {
    months.push(dayjs().subtract(i, 'month').format('M月'))
    incomeData.push(Math.floor(Math.random() * 10000) + 5000)
    expenseData.push(Math.floor(Math.random() * 5000) + 2000)
  }

  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['收入', '支出'] },
    xAxis: { type: 'category', data: months },
    yAxis: { type: 'value' },
    series: [
      { name: '收入', type: 'line', data: incomeData, smooth: true, itemStyle: { color: '#67c23a' } },
      { name: '支出', type: 'line', data: expenseData, smooth: true, itemStyle: { color: '#e6a23c' } }
    ]
  })
}
</script>

<style scoped>
.stat-card {
  display: flex;
  align-items: center;
  padding: 20px;
  border-radius: 8px;
  color: white;
}

.stat-card.blue { background: linear-gradient(135deg, #667eea, #764ba2); }
.stat-card.green { background: linear-gradient(135deg, #11998e, #38ef7d); }
.stat-card.orange { background: linear-gradient(135deg, #f093fb, #f5576c); }
.stat-card.purple { background: linear-gradient(135deg, #4facfe, #00f2fe); }

.stat-card .icon {
  font-size: 40px;
  margin-right: 16px;
  opacity: 0.8;
}

.stat-card .value {
  font-size: 28px;
  font-weight: bold;
  margin: 0;
}

.stat-card .label {
  margin: 4px 0 0 0;
  opacity: 0.9;
}

.attendance-summary {
  display: flex;
  justify-content: space-around;
  padding: 20px 0;
}

.attendance-summary .item {
  text-align: center;
}

.attendance-summary .num {
  display: block;
  font-size: 32px;
  font-weight: bold;
}

.attendance-summary .num.green { color: #67c23a; }
.attendance-summary .num.orange { color: #e6a23c; }
.attendance-summary .num.blue { color: #409eff; }

.attendance-summary .text {
  color: #999;
  font-size: 14px;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 10px 0;
}
</style>
