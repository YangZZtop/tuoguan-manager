<template>
  <div class="page-container">
    <el-card>
      <div class="toolbar">
        <el-date-picker v-model="dateRange" type="daterange" range-separator="至" 
          start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD"
          style="width: 260px" @change="loadData" />
        <el-select v-model="filterCategory" placeholder="分类筛选" style="width: 120px; margin-left: 10px" clearable @change="loadData">
          <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
        <el-button type="primary" style="margin-left: auto" @click="openDialog()">
          <el-icon><Plus /></el-icon>新增支出
        </el-button>
        <el-button @click="openCategoryDialog">管理分类</el-button>
      </div>

      <el-table :data="tableData" stripe v-loading="loading" show-summary :summary-method="getSummary">
        <el-table-column prop="date" label="日期" width="120" />
        <el-table-column prop="category_name" label="分类" width="120">
          <template #default="{ row }">
            <el-tag size="small">{{ row.category_name }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="金额" width="120">
          <template #default="{ row }">¥{{ row.amount }}</template>
        </el-table-column>
        <el-table-column prop="description" label="描述" />
        <el-table-column prop="remark" label="备注" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openDialog(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑支出 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑支出' : '新增支出'" width="500px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="日期" required>
          <el-date-picker v-model="form.date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="分类" required>
          <el-select v-model="form.category_id" placeholder="请选择分类" style="width: 100%">
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="金额" required>
          <el-input-number v-model="form.amount" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" placeholder="如：买菜、交房租等" />
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

    <!-- 管理分类 -->
    <el-dialog v-model="categoryDialogVisible" title="管理支出分类" width="400px">
      <div style="margin-bottom: 10px;">
        <el-input v-model="newCategory" placeholder="输入新分类名称" style="width: 200px" />
        <el-button type="primary" style="margin-left: 10px" @click="addCategory">添加</el-button>
      </div>
      <el-table :data="categories" size="small">
        <el-table-column prop="name" label="分类名称" />
        <el-table-column label="操作" width="80">
          <template #default="{ row }">
            <el-button size="small" type="danger" link @click="deleteCategory(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
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
const categories = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const categoryDialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const dateRange = ref([])
const filterCategory = ref('')
const newCategory = ref('')

const defaultForm = {
  date: dayjs().format('YYYY-MM-DD'),
  category_id: null, amount: 0, description: '', remark: ''
}
const form = ref({ ...defaultForm })

onMounted(() => {
  loadData()
  loadCategories()
})

async function loadData() {
  loading.value = true
  let sql = `SELECT e.*, c.name as category_name FROM expenses e 
             LEFT JOIN expense_categories c ON e.category_id = c.id
             WHERE e.branch_id = ?`
  const params = [branchStore.currentBranch.id]
  
  if (dateRange.value?.length === 2) {
    sql += ' AND e.date BETWEEN ? AND ?'
    params.push(dateRange.value[0], dateRange.value[1])
  }
  if (filterCategory.value) {
    sql += ' AND e.category_id = ?'
    params.push(filterCategory.value)
  }
  sql += ' ORDER BY e.date DESC, e.id DESC'
  
  const result = await window.electronAPI.query(sql, params)
  tableData.value = result.success ? result.data : []
  loading.value = false
}

async function loadCategories() {
  const result = await window.electronAPI.query('SELECT * FROM expense_categories ORDER BY id')
  categories.value = result.success ? result.data : []
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
  if (!form.value.date || !form.value.category_id || !form.value.amount) {
    ElMessage.warning('请填写完整信息')
    return
  }

  let result
  if (isEdit.value) {
    result = await window.electronAPI.query(
      'UPDATE expenses SET date=?, category_id=?, amount=?, description=?, remark=? WHERE id=?',
      [form.value.date, form.value.category_id, form.value.amount, form.value.description, form.value.remark, editId.value]
    )
  } else {
    result = await window.electronAPI.query(
      'INSERT INTO expenses (branch_id, date, category_id, amount, description, remark) VALUES (?, ?, ?, ?, ?, ?)',
      [branchStore.currentBranch.id, form.value.date, form.value.category_id, form.value.amount, form.value.description, form.value.remark]
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
  const result = await window.electronAPI.query('DELETE FROM expenses WHERE id = ?', [row.id])
  if (result.success) {
    ElMessage.success('删除成功')
    loadData()
  }
}

function openCategoryDialog() {
  categoryDialogVisible.value = true
}

async function addCategory() {
  if (!newCategory.value) return
  const result = await window.electronAPI.query(
    'INSERT INTO expense_categories (name) VALUES (?)',
    [newCategory.value]
  )
  if (result.success) {
    ElMessage.success('添加成功')
    newCategory.value = ''
    loadCategories()
  }
}

async function deleteCategory(row) {
  await ElMessageBox.confirm('确定删除该分类吗？', '提示', { type: 'warning' })
  const result = await window.electronAPI.query('DELETE FROM expense_categories WHERE id = ?', [row.id])
  if (result.success) {
    ElMessage.success('删除成功')
    loadCategories()
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
