<template>
  <div class="page-container">
    <el-card>
      <div class="toolbar">
        <el-button type="primary" @click="openDialog()">
          <el-icon><Plus /></el-icon>新增班级
        </el-button>
      </div>

      <el-table :data="tableData" stripe v-loading="loading">
        <el-table-column prop="name" label="班级名称" width="150" />
        <el-table-column prop="teacher_name" label="负责老师" width="120" />
        <el-table-column prop="capacity" label="容量" width="80" />
        <el-table-column prop="student_count" label="当前人数" width="100" />
        <el-table-column prop="remark" label="备注" />
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openDialog(row)">编辑</el-button>
            <el-button size="small" type="primary" @click="manageStudents(row)">管理学生</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑班级' : '新增班级'" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="班级名称" required>
          <el-input v-model="form.name" placeholder="请输入班级名称" />
        </el-form-item>
        <el-form-item label="负责老师">
          <el-select v-model="form.teacher_id" placeholder="请选择老师" style="width: 100%">
            <el-option v-for="t in teachers" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="容量">
          <el-input-number v-model="form.capacity" :min="1" :max="100" />
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

    <!-- 管理学生弹窗 -->
    <el-dialog v-model="studentDialogVisible" title="管理班级学生" width="700px">
      <el-transfer
        v-model="selectedStudents"
        :data="allStudents"
        :titles="['未分班学生', '班级学生']"
        :props="{ key: 'id', label: 'name' }"
      />
      <template #footer>
        <el-button @click="studentDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveStudents">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useBranchStore } from '@/stores/branch'
import { ElMessage, ElMessageBox } from 'element-plus'

const branchStore = useBranchStore()
const tableData = ref([])
const teachers = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const studentDialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const currentClassId = ref(null)
const allStudents = ref([])
const selectedStudents = ref([])

const defaultForm = { name: '', teacher_id: null, capacity: 30, remark: '' }
const form = ref({ ...defaultForm })

onMounted(() => {
  loadData()
  loadTeachers()
})

async function loadData() {
  loading.value = true
  const result = await window.electronAPI.query(
    `SELECT c.*, e.name as teacher_name,
     (SELECT COUNT(*) FROM student_class WHERE class_id = c.id) as student_count
     FROM classes c 
     LEFT JOIN employees e ON c.teacher_id = e.id
     WHERE c.branch_id = ? ORDER BY c.id DESC`,
    [branchStore.currentBranch.id]
  )
  tableData.value = result.success ? result.data : []
  loading.value = false
}

async function loadTeachers() {
  const result = await window.electronAPI.query(
    'SELECT id, name FROM employees WHERE branch_id = ? AND status = ?',
    [branchStore.currentBranch.id, 'active']
  )
  teachers.value = result.success ? result.data : []
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
    ElMessage.warning('请输入班级名称')
    return
  }

  let result
  if (isEdit.value) {
    result = await window.electronAPI.query(
      'UPDATE classes SET name=?, teacher_id=?, capacity=?, remark=? WHERE id=?',
      [form.value.name, form.value.teacher_id, form.value.capacity, form.value.remark, editId.value]
    )
  } else {
    result = await window.electronAPI.query(
      'INSERT INTO classes (branch_id, name, teacher_id, capacity, remark) VALUES (?, ?, ?, ?, ?)',
      [branchStore.currentBranch.id, form.value.name, form.value.teacher_id, form.value.capacity, form.value.remark]
    )
  }

  if (result.success) {
    ElMessage.success(isEdit.value ? '修改成功' : '添加成功')
    dialogVisible.value = false
    loadData()
  }
}

async function handleDelete(row) {
  await ElMessageBox.confirm('确定删除该班级吗？', '提示', { type: 'warning' })
  await window.electronAPI.query('DELETE FROM student_class WHERE class_id = ?', [row.id])
  const result = await window.electronAPI.query('DELETE FROM classes WHERE id = ?', [row.id])
  if (result.success) {
    ElMessage.success('删除成功')
    loadData()
  }
}

async function manageStudents(row) {
  currentClassId.value = row.id
  
  // 获取所有在托学生
  const studentsRes = await window.electronAPI.query(
    'SELECT id, name FROM students WHERE branch_id = ? AND status = ?',
    [branchStore.currentBranch.id, 'active']
  )
  allStudents.value = studentsRes.success ? studentsRes.data : []
  
  // 获取当前班级学生
  const classStudentsRes = await window.electronAPI.query(
    'SELECT student_id FROM student_class WHERE class_id = ?',
    [row.id]
  )
  selectedStudents.value = classStudentsRes.success ? classStudentsRes.data.map(s => s.student_id) : []
  
  studentDialogVisible.value = true
}

async function saveStudents() {
  // 先删除原有关联
  await window.electronAPI.query('DELETE FROM student_class WHERE class_id = ?', [currentClassId.value])
  
  // 添加新关联
  for (const studentId of selectedStudents.value) {
    await window.electronAPI.query(
      'INSERT INTO student_class (student_id, class_id) VALUES (?, ?)',
      [studentId, currentClassId.value]
    )
  }
  
  ElMessage.success('保存成功')
  studentDialogVisible.value = false
  loadData()
}
</script>

<style scoped>
.toolbar {
  display: flex;
  margin-bottom: 16px;
}
</style>
