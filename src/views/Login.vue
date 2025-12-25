<template>
  <div class="login-page">
    <div class="login-box">
      <h1>托管店管理系统</h1>
      <p class="subtitle">请登录</p>
      
      <el-form :model="form" @submit.prevent="handleLogin">
        <el-form-item>
          <el-input v-model="form.username" placeholder="用户名" prefix-icon="User" size="large" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="form.password" type="password" placeholder="密码" prefix-icon="Lock" size="large" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" style="width: 100%" @click="handleLogin" :loading="loading">
            登 录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()
const loading = ref(false)
const form = ref({
  username: '',
  password: ''
})

onMounted(async () => {
  // 检查是否已登录
  const token = localStorage.getItem('auth_token')
  if (token) {
    router.push('/select-branch')
    return
  }
  
  // 初始化默认管理员账号
  await initAdmin()
})

async function initAdmin() {
  const result = await window.electronAPI.query('SELECT COUNT(*) as count FROM users')
  if (result.success && result.data?.count === 0) {
    // 创建默认管理员
    await window.electronAPI.query(
      'INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)',
      ['admin', '123456', 'admin', '管理员']
    )
  }
}

async function handleLogin() {
  if (!form.value.username || !form.value.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }
  
  loading.value = true
  
  const result = await window.electronAPI.get(
    'SELECT * FROM users WHERE username = ? AND password = ?',
    [form.value.username, form.value.password]
  )
  
  loading.value = false
  
  if (result.success && result.data) {
    localStorage.setItem('auth_token', 'logged_in')
    localStorage.setItem('user_info', JSON.stringify(result.data))
    ElMessage.success('登录成功')
    router.push('/select-branch')
  } else {
    ElMessage.error('用户名或密码错误')
  }
}
</script>

<style scoped>
.login-page {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-box {
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
  width: 380px;
  text-align: center;
}

h1 {
  color: #333;
  margin-bottom: 8px;
  font-size: 24px;
}

.subtitle {
  color: #666;
  margin-bottom: 30px;
}

.tips {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
  color: #999;
  font-size: 12px;
}

.tips p {
  margin: 4px 0;
}
</style>
