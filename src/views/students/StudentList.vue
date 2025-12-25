<template>
  <div class="page-container">
    <el-card>
      <div class="toolbar">
        <el-input v-model="searchKey" placeholder="搜索学生姓名" style="width: 200px" clearable @clear="loadData">
          <template #append>
            <el-button @click="loadData"><el-icon><Search /></el-icon></el-button>
          </template>
        </el-input>
        <el-select v-model="filterStatus" placeholder="状态筛选" style="width: 120px; margin-left: 10px" @change="loadData">
          <el-option label="全部" value="" />
          <el-option label="在托" value="active" />
          <el-option label="已退" value="quit" />
        </el-select>
        <el-button type="primary" style="margin-left: auto" @click="openDialog()">
          <el-icon><Plus /></el-icon>新增学生
        </el-button>
      </div>

      <el-table :data="tableData" stripe v-loading="loading">
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="grade" label="年级" width="100" />
        <el-table-column prop="school" label="学校" width="150" />
        <el-table-column prop="parent_name" label="家长" width="100" />
        <el-table-column prop="parent_phone" label="联系电话" width="130" />
        <el-table-column prop="enroll_date" label="入托日期" width="120" />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
              {{ row.status === 'active' ? '在托' : '已退' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openDialog(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
            <el-button size="small" v-if="row.status === 'active'" type="warning" @click="handleQuit(row)">退托</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑学生' : '新增学生'" width="600px">
      <el-form :model="form" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="学生姓名" required>
              <el-input v-model="form.name" placeholder="请输入姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="年级">
              <el-select v-model="form.grade" placeholder="请选择年级" style="width: 100%">
                <el-option v-for="g in grades" :key="g" :label="g" :value="g" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="学校">
          <el-input v-model="form.school" placeholder="请输入学校" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="家长姓名">
              <el-input v-model="form.parent_name" placeholder="请输入家长姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话">
              <el-input v-model="form.parent_phone" placeholder="请输入联系电话" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="紧急联系人">
              <el-input v-model="form.emergency_contact" placeholder="请输入紧急联系人" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="紧急电话">
              <el-input v-model="form.emergency_phone" placeholder="请输入紧急电话" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="入托日期">
          <el-date-picker v-model="form.enroll_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
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
const searchKey = ref('')
const filterStatus = ref('')

const grades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三']

const defaultForm = {
  name: '',
  grade: '',
  school: '',
  parent_name: '',
  parent_phone: '',
  emergency_contact: '',
  emergency_phone: '',
  enroll_date: dayjs().format('YYYY-MM-DD'),
  remark: ''
}

const form = ref({ ...defaultForm })
const editId = ref(null)

onMounted(() => loadData())

async function loadData() {
  loading.value = true
  let sql = 'SELECT * FROM students WHERE branch_id = ?'
  const params = [branchStore.currentBranch.id]
  
  if (searchKey.value) {
    sql += ' AND name LIKE ?'
    params.push(`%${searchKey.value}%`)
  }
  if (filterStatus.value) {
    sql += ' AND status = ?'
    params.push(filterStatus.value)
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
    ElMessage.warning('请输入学生姓名')
    return
  }

  let result
  if (isEdit.value) {
    result = await window.electronAPI.query(
      `UPDATE students SET name=?, grade=?, school=?, parent_name=?, parent_phone=?, 
       emergency_contact=?, emergency_phone=?, enroll_date=?, remark=? WHERE id=?`,
      [form.value.name, form.value.grade, form.value.school, form.value.parent_name,
       form.value.parent_phone, form.value.emergency_contact, form.value.emergency_phone,
       form.value.enroll_date, form.value.remark, editId.value]
    )
  } else {
    result = await window.electronAPI.query(
      `INSERT INTO students (branch_id, name, grade, school, parent_name, parent_phone, 
       emergency_contact, emergency_phone, enroll_date, remark, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [branchStore.currentBranch.id, form.value.name, form.value.grade, form.value.school,
       form.value.parent_name, form.value.parent_phone, form.value.emergency_contact,
       form.value.emergency_phone, form.value.enroll_date, form.value.remark]
    )
  }

  if (result.success) {
    ElMessage.success(isEdit.value ? '修改成功' : '添加成功')
    dialogVisible.value = false
    loadData()
  }
}

async function handleDelete(row) {
  await ElMessageBox.confirm('确定删除该学生吗？', '提示', { type: 'warning' })
  const result = await window.electronAPI.query('DELETE FROM students WHERE id = ?', [row.id])
  if (result.success) {
    ElMessage.success('删除成功')
    loadData()
  }
}

async function handleQuit(row) {
  await ElMessageBox.confirm('确定该学生退托吗？', '提示', { type: 'warning' })
  const result = await window.electronAPI.query(
    'UPDATE students SET status = ?, quit_date = ? WHERE id = ?',
    ['quit', dayjs().format('YYYY-MM-DD'), row.id]
  )
  if (result.success) {
    ElMessage.success('操作成功')
    loadData()
  }
}
</script>

<style scoped>
.page-container {
  height: 100%;
}

.toolbar {
  display: flex;
  margin-bottom: 16px;
}
</style>
