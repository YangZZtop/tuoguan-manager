<template>
  <el-container class="main-layout">
    <el-aside width="220px" class="sidebar">
      <div class="logo">
        <el-icon><Shop /></el-icon>
        <span>托管店管理</span>
      </div>
      
      <div class="branch-info" @click="switchBranch">
        <el-icon><Location /></el-icon>
        <span>{{ branchStore.currentBranch?.name }}</span>
        <el-icon class="arrow"><ArrowRight /></el-icon>
      </div>

      <el-menu
        :default-active="activeMenu"
        router
        class="menu"
      >
        <el-menu-item index="/main/dashboard">
          <el-icon><DataAnalysis /></el-icon>
          <span>首页概览</span>
        </el-menu-item>
        
        <el-sub-menu index="student">
          <template #title>
            <el-icon><User /></el-icon>
            <span>学生管理</span>
          </template>
          <el-menu-item index="/main/students">学生列表</el-menu-item>
          <el-menu-item index="/main/classes">班级管理</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="finance">
          <template #title>
            <el-icon><Money /></el-icon>
            <span>收费管理</span>
          </template>
          <el-menu-item index="/main/packages">套餐设置</el-menu-item>
          <el-menu-item index="/main/payments">缴费记录</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="attendance">
          <template #title>
            <el-icon><Calendar /></el-icon>
            <span>考勤管理</span>
          </template>
          <el-menu-item index="/main/attendance">签到签退</el-menu-item>
          <el-menu-item index="/main/leaves">请假管理</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="employee">
          <template #title>
            <el-icon><Avatar /></el-icon>
            <span>员工管理</span>
          </template>
          <el-menu-item index="/main/employees">员工列表</el-menu-item>
          <el-menu-item index="/main/schedules">排班管理</el-menu-item>
        </el-sub-menu>

        <el-menu-item index="/main/expenses">
          <el-icon><Wallet /></el-icon>
          <span>支出管理</span>
        </el-menu-item>

        <el-menu-item index="/main/statistics">
          <el-icon><TrendCharts /></el-icon>
          <span>数据统计</span>
        </el-menu-item>

        <el-sub-menu index="settings">
          <template #title>
            <el-icon><Setting /></el-icon>
            <span>系统设置</span>
          </template>
          <el-menu-item index="/main/branches">分店管理</el-menu-item>
          <el-menu-item index="/main/settings">其他设置</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <h2>{{ currentTitle }}</h2>
      </el-header>
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBranchStore } from '@/stores/branch'

const route = useRoute()
const router = useRouter()
const branchStore = useBranchStore()

const activeMenu = computed(() => route.path)
const currentTitle = computed(() => route.meta?.title || '首页')

function switchBranch() {
  branchStore.clearBranch()
  router.push('/')
}
</script>

<style scoped>
.main-layout {
  height: 100%;
}

.sidebar {
  background: #304156;
  color: white;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 18px;
  font-weight: bold;
  background: #263445;
}

.branch-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #263445;
  cursor: pointer;
  font-size: 14px;
  border-bottom: 1px solid #1f2d3d;
}

.branch-info:hover {
  background: #1f2d3d;
}

.branch-info .arrow {
  margin-left: auto;
}

.menu {
  border-right: none;
  background: transparent;
}

.menu:deep(.el-menu-item),
.menu:deep(.el-sub-menu__title) {
  color: #bfcbd9;
}

.menu:deep(.el-menu-item:hover),
.menu:deep(.el-sub-menu__title:hover) {
  background: #263445;
}

.menu:deep(.el-menu-item.is-active) {
  color: #409eff;
  background: #263445;
}

.menu:deep(.el-sub-menu .el-menu) {
  background: #1f2d3d;
}

.header {
  background: white;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  align-items: center;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

.header h2 {
  font-size: 18px;
  font-weight: 500;
  color: #333;
}

.main-content {
  background: #f5f7fa;
  padding: 20px;
}
</style>
