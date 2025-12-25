<template>
  <div class="page-container">
    <el-card>
      <div class="toolbar">
        <el-date-picker v-model="dateRange" type="daterange" range-separator="至" 
          start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD"
          style="width: 260px" @change="loadData" />
        <el-input v-model="searchKey" placeholder="搜索学生" style="width: 150px; margin-left: 10px" clearable @clear="loadData">
          <template #append><el-button @click="loadData"><el-icon><Search /></el-icon></el-button></template>
        </el-input>
        <el-button type="primary" style="margin-left: auto" @click="openDialog()">
          <el-icon><Plus /></el-icon>新增缴费
        </el-button>
      </div>

      <el-table :data="tableData" stripe v-loading="loading" show-summary :summary-method="getSummary">
        <el-table-column prop="student_name" label="学生" width="100" />
        <el-table-column prop="package_name" label="套餐" width="100" />
        <el-table-column prop="amount" label="金额" width="100">
          <template #default="{ row }">¥{{ row.amount }}</template>
        </el-table-column>
        <el-table-column prop="pay_date" label="缴费日期" width="120" />
        <el-table-column prop="start_date" label="开始日期" width="120" />
        <el-table-column prop="end_date" label="结束日期" width="120" />
        <el-table-column prop="pay_method" label="支付方式" width="100" />
        <el-table-column prop="remark" label="备注" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openDialog(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑缴费' : '新增缴费'" width="550px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="学生" required>
          <el-select v-model="form.student_id" placeholder="请选择学生" filterable style="width: 100%">
            <el-option v-for="s in students" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="套餐">
          <el-select v-model="form.package_id" placeholder="请选择套餐" style="width: 100%" @change="onPackageChange">
            <el-option v-for="p in packages" :key="p.id" :label="`${p.name} - ¥${p.price}`" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="金额" required>
          <el-input-number v-model="form.amount" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="缴费日期">
          <el-date-picker v-model="form.pay_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="开始日期">
              <el-date-picker v-model="form.start_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" @change="calcEndDate" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束日期">
              <el-date-picker v-model="form.end_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="支付方式">
          <el-select v-model="form.pay_method" placeholder="请选择" style="width: 100%">
            <el-option label="现金" value="现金" />
            <el-option label="微信" value="微信" />
            <el-option label="支付宝" value="支付宝" />
            <el-option label="银行转账" value="银行转账" />
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useBranchStore } from '@/stores/branch'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'

const branchStore = useBranchStore()
const tableData = ref([])
const students = ref([])
const packages = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const searchKey = ref('')
const dateRange = ref([])
const selectedPackage = ref(null)

const defaultForm = {
  student_id: null, package_id: null, amount: 0,
  pay_date: dayjs().format('YYYY-MM-DD'),
  start_date: dayjs().format('YYYY-MM-DD'),
  end_date: dayjs().add(30, 'day').format('YYYY-MM-DD'),
  pay_method: '微信', remark: ''
}
const form = ref({ ...defaultForm })

onMounted(() => {
  loadData()
  loadStudents()
  loadPackages()
})

async function loadData() {
  loading.value = true
  let sql = `SELECT p.*, s.name as student_name, pk.name as package_name 
             FROM payments p 
             LEFT JOIN students s ON p.student_id = s.id 
             LEFT JOIN packages pk ON p.package_id = pk.id
             WHERE s.branch_id = ?`
  const params = [branchStore.currentBranch.id]
  
  if (dateRange.value?.length === 2) {
    sql += ' AND p.pay_date BETWEEN ? AND ?'
    params.push(dateRange.value[0], dateRange.value[1])
  }
  if (searchKey.value) {
    sql += ' AND s.name LIKE ?'
    params.push(`%${searchKey.value}%`)
  }
  sql += ' ORDER BY p.id DESC'
  
  const result = await window.electronAPI.query(sql, params)
  tableData.value = result.success ? result.data : []
  loading.value = false
}

async function loadStudents() {
  const result = await window.electronAPI.query(
    'SELECT id, name FROM students WHERE branch_id = ? AND status = ?',
    [branchStore.currentBranch.id, 'active']
  )
  students.value = result.success ? result.data : []
}

async function loadPackages() {
  const result = await window.electronAPI.query('SELECT * FROM packages')
  packages.value = result.success ? result.data : []
}

function onPackageChange(pkgId) {
  const pkg = packages.value.find(p => p.id === pkgId)
  if (pkg) {
    selectedPackage.value = pkg
    form.value.amount = pkg.price
    calcEndDate()
  }
}

function calcEndDate() {
  if (selectedPackage.value && form.value.start_date) {
    form.value.end_date = dayjs(form.value.start_date).add(selectedPackage.value.duration, 'day').format('YYYY-MM-DD')
  }
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
  if (!form.value.student_id || !form.value.amount) {
    ElMessage.warning('请填写完整信息')
    return
  }

  let result
  if (isEdit.value) {
    result = await window.electronAPI.query(
      `UPDATE payments SET student_id=?, package_id=?, amount=?, pay_date=?, 
       start_date=?, end_date=?, pay_method=?, remark=? WHERE id=?`,
      [form.value.student_id, form.value.package_id, form.value.amount, form.value.pay_date,
       form.value.start_date, form.value.end_date, form.value.pay_method, form.value.remark, editId.value]
    )
  } else {
    result = await window.electronAPI.query(
      `INSERT INTO payments (student_id, package_id, amount, pay_date, start_date, end_date, pay_method, remark) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [form.value.student_id, form.value.package_id, form.value.amount, form.value.pay_date,
       form.value.start_date, form.value.end_date, form.value.pay_method, form.value.remark]
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
  const result = await window.electronAPI.query('DELETE FROM payments WHERE id = ?', [row.id])
  if (result.success) {
    ElMessage.success('删除成功')
    loadData()
  }
}

function getSummary({ columns, data }) {
  const sums = []
  columns.forEach((col, index) => {
    if (index === 0) {
      sums[index] = '合计'
    } else if (col.property === 'amount') {
      const total = data.reduce((sum, row) => sum + (row.amount || 0), 0)
      sums[index] = `¥${total.toFixed(2)}`
    } else {
      sums[index] = ''
    }
  })
  return sums
}
</script>

<style scoped>
.toolbar { display: flex; margin-bottom: 16px; }
</style>
