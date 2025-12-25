<template>
  <div class="page-container">
    <el-card>
      <div class="toolbar">
        <el-button type="primary" @click="openDialog()">
          <el-icon><Plus /></el-icon>新增套餐
        </el-button>
      </div>

      <el-table :data="tableData" stripe v-loading="loading">
        <el-table-column prop="name" label="套餐名称" width="150" />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="typeMap[row.type]?.tag" size="small">{{ typeMap[row.type]?.label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="price" label="价格" width="120">
          <template #default="{ row }">¥{{ row.price }}</template>
        </el-table-column>
        <el-table-column prop="duration" label="时长(天)" width="100" />
        <el-table-column prop="description" label="描述" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openDialog(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑套餐' : '新增套餐'" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="套餐名称" required>
          <el-input v-model="form.name" placeholder="请输入套餐名称" />
        </el-form-item>
        <el-form-item label="套餐类型" required>
          <el-select v-model="form.type" placeholder="请选择类型" style="width: 100%">
            <el-option label="午托" value="lunch" />
            <el-option label="晚托" value="evening" />
            <el-option label="全托" value="full" />
          </el-select>
        </el-form-item>
        <el-form-item label="价格" required>
          <el-input-number v-model="form.price" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="时长(天)">
          <el-input-number v-model="form.duration" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" rows="2" />
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
import { ElMessage, ElMessageBox } from 'element-plus'

const tableData = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref(null)

const typeMap = {
  lunch: { label: '午托', tag: 'success' },
  evening: { label: '晚托', tag: 'warning' },
  full: { label: '全托', tag: 'primary' }
}

const defaultForm = { name: '', type: 'lunch', price: 0, duration: 30, description: '' }
const form = ref({ ...defaultForm })

onMounted(() => loadData())

async function loadData() {
  loading.value = true
  const result = await window.electronAPI.query('SELECT * FROM packages ORDER BY id DESC')
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
  if (!form.value.name || !form.value.type) {
    ElMessage.warning('请填写完整信息')
    return
  }

  let result
  if (isEdit.value) {
    result = await window.electronAPI.query(
      'UPDATE packages SET name=?, type=?, price=?, duration=?, description=? WHERE id=?',
      [form.value.name, form.value.type, form.value.price, form.value.duration, form.value.description, editId.value]
    )
  } else {
    result = await window.electronAPI.query(
      'INSERT INTO packages (name, type, price, duration, description) VALUES (?, ?, ?, ?, ?)',
      [form.value.name, form.value.type, form.value.price, form.value.duration, form.value.description]
    )
  }

  if (result.success) {
    ElMessage.success(isEdit.value ? '修改成功' : '添加成功')
    dialogVisible.value = false
    loadData()
  }
}

async function handleDelete(row) {
  await ElMessageBox.confirm('确定删除该套餐吗？', '提示', { type: 'warning' })
  const result = await window.electronAPI.query('DELETE FROM packages WHERE id = ?', [row.id])
  if (result.success) {
    ElMessage.success('删除成功')
    loadData()
  }
}
</script>

<style scoped>
.toolbar { display: flex; margin-bottom: 16px; }
</style>
