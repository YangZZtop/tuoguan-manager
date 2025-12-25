<template>
  <div class="settings-page">
    <el-row :gutter="20">
      <el-col :span="12">
        <el-card header="数据备份">
          <p class="desc">将当前数据库备份到指定位置，建议定期备份以防数据丢失。</p>
          <el-button type="primary" @click="backupData">
            <el-icon><Download /></el-icon>备份数据
          </el-button>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card header="数据恢复">
          <p class="desc">从备份文件恢复数据，恢复后将覆盖当前数据。</p>
          <el-button type="warning" @click="restoreData">
            <el-icon><Upload /></el-icon>恢复数据
          </el-button>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="24">
        <el-card header="关于系统">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="系统名称">托管店管理系统</el-descriptions-item>
            <el-descriptions-item label="版本号">1.0.0</el-descriptions-item>
            <el-descriptions-item label="技术栈">Electron + Vue3 + SQLite</el-descriptions-item>
            <el-descriptions-item label="开发日期">2024</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ElMessage } from 'element-plus'

function backupData() {
  ElMessage.info('备份功能需要在 Electron 环境中运行')
}

function restoreData() {
  ElMessage.info('恢复功能需要在 Electron 环境中运行')
}
</script>

<style scoped>
.desc {
  color: #666;
  margin-bottom: 16px;
  font-size: 14px;
}
</style>
