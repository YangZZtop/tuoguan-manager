<template>
  <div class="statistics-page">
    <el-row :gutter="20">
      <el-col :span="24">
        <el-card>
          <div class="filter-bar">
            <el-radio-group v-model="timeRange" @change="loadData">
              <el-radio-button label="month">本月</el-radio-button>
              <el-radio-button label="quarter">本季度</el-radio-button>
              <el-radio-button label="year">本年</el-radio-button>
              <el-radio-button label="custom">自定义</el-radio-button>
            </el-radio-group>
            <el-date-picker v-if="timeRange === 'custom'" v-model="customRange" type="daterange"
              range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期"
              value-format="YYYY-MM-DD" style="margin-left: 10px" @change="loadData" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="6">
        <div class="stat-card green">
          <p class="label">总收入</p>
          <p class="value">¥{{ stats.totalIncome.toFixed(2) }}</p>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card orange">
          <p class="label">总支出</p>
          <p class="value">¥{{ stats.totalExpense.toFixed(2) }}</p>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card blue">
          <p class="label">净利润</p>
          <p class="value">¥{{ stats.profit.toFixed(2) }}</p>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card purple">
          <p class="label">利润率</p>
          <p class="value">{{ stats.profitRate }}%</p>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="16">
        <el-card header="收支趋势">
          <div ref="trendChartRef" style="height: 350px"></div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card header="支出分类占比">
          <div ref="expensePieRef" style="height: 350px"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <el-card header="学生人数趋势">
          <div ref="studentChartRef" style="height: 300px"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card header="套餐收入分布">
          <div ref="packagePieRef" style="height: 300px"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center">
              <span>收支明细</span>
              <el-button type="primary" size="small" @click="exportExcel">
                <el-icon><Download /></el-icon>导出Excel
              </el-button>
            </div>
          </template>
          <el-tabs v-model="activeTab">
            <el-tab-pane label="收入明细" name="income">
              <el-table :data="incomeList" stripe max-height="300">
                <el-table-column prop="pay_date" label="日期" width="120" />
                <el-table-column prop="student_name" label="学生" width="100" />
                <el-table-column prop="package_name" label="套餐" width="100" />
                <el-table-column prop="amount" label="金额" width="100">
                  <template #default="{ row }">¥{{ row.amount }}</template>
                </el-table-column>
                <el-table-column prop="pay_method" label="支付方式" width="100" />
                <el-table-column prop="remark" label="备注" />
              </el-table>
            </el-tab-pane>
            <el-tab-pane label="支出明细" name="expense">
              <el-table :data="expenseList" stripe max-height="300">
                <el-table-column prop="date" label="日期" width="120" />
                <el-table-column prop="category_name" label="分类" width="100" />
                <el-table-column prop="amount" label="金额" width="100">
                  <template #default="{ row }">¥{{ row.amount }}</template>
                </el-table-column>
                <el-table-column prop="description" label="描述" />
                <el-table-column prop="remark" label="备注" />
              </el-table>
            </el-tab-pane>
          </el-tabs>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useBranchStore } from '@/stores/branch'
import * as echarts from 'echarts'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'

const branchStore = useBranchStore()
const timeRange = ref('month')
const customRange = ref([])
const activeTab = ref('income')

const trendChartRef = ref(null)
const expensePieRef = ref(null)
const studentChartRef = ref(null)
const packagePieRef = ref(null)

const stats = ref({ totalIncome: 0, totalExpense: 0, profit: 0, profitRate: 0 })
const incomeList = ref([])
const expenseList = ref([])

const dateRange = computed(() => {
  const now = dayjs()
  switch (timeRange.value) {
    case 'month':
      return [now.startOf('month').format('YYYY-MM-DD'), now.endOf('month').format('YYYY-MM-DD')]
    case 'quarter':
      return [now.startOf('quarter').format('YYYY-MM-DD'), now.endOf('quarter').format('YYYY-MM-DD')]
    case 'year':
      return [now.startOf('year').format('YYYY-MM-DD'), now.endOf('year').format('YYYY-MM-DD')]
    case 'custom':
      return customRange.value?.length === 2 ? customRange.value : [now.startOf('month').format('YYYY-MM-DD'), now.endOf('month').format('YYYY-MM-DD')]
    default:
      return [now.startOf('month').format('YYYY-MM-DD'), now.endOf('month').format('YYYY-MM-DD')]
  }
})

onMounted(() => loadData())

async function loadData() {
  const branchId = branchStore.currentBranch?.id
  if (!branchId) return

  const [startDate, endDate] = dateRange.value

  // 收入统计
  const incomeRes = await window.electronAPI.query(
    `SELECT p.*, s.name as student_name, pk.name as package_name 
     FROM payments p 
     LEFT JOIN students s ON p.student_id = s.id 
     LEFT JOIN packages pk ON p.package_id = pk.id
     WHERE s.branch_id = ? AND p.pay_date BETWEEN ? AND ?
     ORDER BY p.pay_date DESC`,
    [branchId, startDate, endDate]
  )
  incomeList.value = incomeRes.success ? incomeRes.data : []
  stats.value.totalIncome = incomeList.value.reduce((sum, r) => sum + (r.amount || 0), 0)

  // 支出统计
  const expenseRes = await window.electronAPI.query(
    `SELECT e.*, c.name as category_name FROM expenses e 
     LEFT JOIN expense_categories c ON e.category_id = c.id
     WHERE e.branch_id = ? AND e.date BETWEEN ? AND ?
     ORDER BY e.date DESC`,
    [branchId, startDate, endDate]
  )
  expenseList.value = expenseRes.success ? expenseRes.data : []
  stats.value.totalExpense = expenseList.value.reduce((sum, r) => sum + (r.amount || 0), 0)

  // 计算利润
  stats.value.profit = stats.value.totalIncome - stats.value.totalExpense
  stats.value.profitRate = stats.value.totalIncome > 0 
    ? ((stats.value.profit / stats.value.totalIncome) * 100).toFixed(1) 
    : 0

  // 渲染图表
  renderTrendChart(startDate, endDate, branchId)
  renderExpensePie()
  renderStudentChart(branchId)
  renderPackagePie()
}

async function renderTrendChart(startDate, endDate, branchId) {
  const chart = echarts.init(trendChartRef.value)
  
  // 按月统计
  const months = []
  const incomeData = []
  const expenseData = []
  
  let current = dayjs(startDate).startOf('month')
  const end = dayjs(endDate)
  
  while (current.isBefore(end) || current.isSame(end, 'month')) {
    const monthStart = current.format('YYYY-MM-DD')
    const monthEnd = current.endOf('month').format('YYYY-MM-DD')
    months.push(current.format('YYYY-MM'))
    
    const incomeRes = await window.electronAPI.get(
      `SELECT SUM(amount) as total FROM payments 
       WHERE student_id IN (SELECT id FROM students WHERE branch_id = ?) 
       AND pay_date BETWEEN ? AND ?`,
      [branchId, monthStart, monthEnd]
    )
    incomeData.push(incomeRes.data?.total || 0)
    
    const expenseRes = await window.electronAPI.get(
      `SELECT SUM(amount) as total FROM expenses WHERE branch_id = ? AND date BETWEEN ? AND ?`,
      [branchId, monthStart, monthEnd]
    )
    expenseData.push(expenseRes.data?.total || 0)
    
    current = current.add(1, 'month')
  }

  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['收入', '支出', '利润'] },
    xAxis: { type: 'category', data: months },
    yAxis: { type: 'value' },
    series: [
      { name: '收入', type: 'bar', data: incomeData, itemStyle: { color: '#67c23a' } },
      { name: '支出', type: 'bar', data: expenseData, itemStyle: { color: '#e6a23c' } },
      { name: '利润', type: 'line', data: incomeData.map((v, i) => v - expenseData[i]), itemStyle: { color: '#409eff' } }
    ]
  })
}

function renderExpensePie() {
  const chart = echarts.init(expensePieRef.value)
  
  // 按分类汇总
  const categoryMap = {}
  expenseList.value.forEach(e => {
    const name = e.category_name || '其他'
    categoryMap[name] = (categoryMap[name] || 0) + e.amount
  })
  
  const data = Object.entries(categoryMap).map(([name, value]) => ({ name, value }))

  chart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      data,
      label: { formatter: '{b}\n{d}%' }
    }]
  })
}

async function renderStudentChart(branchId) {
  const chart = echarts.init(studentChartRef.value)
  
  const months = []
  const data = []
  
  for (let i = 5; i >= 0; i--) {
    const month = dayjs().subtract(i, 'month')
    months.push(month.format('M月'))
    
    const res = await window.electronAPI.get(
      `SELECT COUNT(*) as count FROM students 
       WHERE branch_id = ? AND enroll_date <= ? AND (quit_date IS NULL OR quit_date > ?)`,
      [branchId, month.endOf('month').format('YYYY-MM-DD'), month.endOf('month').format('YYYY-MM-DD')]
    )
    data.push(res.data?.count || 0)
  }

  chart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: months },
    yAxis: { type: 'value' },
    series: [{ type: 'line', data, smooth: true, areaStyle: { opacity: 0.3 }, itemStyle: { color: '#409eff' } }]
  })
}

function renderPackagePie() {
  const chart = echarts.init(packagePieRef.value)
  
  const packageMap = {}
  incomeList.value.forEach(p => {
    const name = p.package_name || '其他'
    packageMap[name] = (packageMap[name] || 0) + p.amount
  })
  
  const data = Object.entries(packageMap).map(([name, value]) => ({ name, value }))

  chart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
    series: [{
      type: 'pie',
      radius: '60%',
      data,
      label: { formatter: '{b}\n¥{c}' }
    }]
  })
}

function exportExcel() {
  const incomeSheet = XLSX.utils.json_to_sheet(incomeList.value.map(r => ({
    '日期': r.pay_date,
    '学生': r.student_name,
    '套餐': r.package_name,
    '金额': r.amount,
    '支付方式': r.pay_method,
    '备注': r.remark
  })))
  
  const expenseSheet = XLSX.utils.json_to_sheet(expenseList.value.map(r => ({
    '日期': r.date,
    '分类': r.category_name,
    '金额': r.amount,
    '描述': r.description,
    '备注': r.remark
  })))
  
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, incomeSheet, '收入明细')
  XLSX.utils.book_append_sheet(wb, expenseSheet, '支出明细')
  
  XLSX.writeFile(wb, `收支报表_${dateRange.value[0]}_${dateRange.value[1]}.xlsx`)
}
</script>

<style scoped>
.filter-bar { display: flex; align-items: center; }

.stat-card {
  padding: 20px;
  border-radius: 8px;
  color: white;
  text-align: center;
}
.stat-card.green { background: linear-gradient(135deg, #11998e, #38ef7d); }
.stat-card.orange { background: linear-gradient(135deg, #f093fb, #f5576c); }
.stat-card.blue { background: linear-gradient(135deg, #667eea, #764ba2); }
.stat-card.purple { background: linear-gradient(135deg, #4facfe, #00f2fe); }

.stat-card .label { margin: 0 0 8px 0; opacity: 0.9; }
.stat-card .value { margin: 0; font-size: 28px; font-weight: bold; }
</style>
