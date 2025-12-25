import { createRouter, createWebHashHistory } from 'vue-router'
import { useBranchStore } from '@/stores/branch'

const routes = [
  {
    path: '/',
    name: 'SelectBranch',
    component: () => import('@/views/SelectBranch.vue')
  },
  {
    path: '/main',
    name: 'Main',
    component: () => import('@/views/MainLayout.vue'),
    redirect: '/main/dashboard',
    children: [
      { path: 'dashboard', name: 'Dashboard', component: () => import('@/views/Dashboard.vue'), meta: { title: '首页概览' } },
      { path: 'students', name: 'Students', component: () => import('@/views/students/StudentList.vue'), meta: { title: '学生管理' } },
      { path: 'classes', name: 'Classes', component: () => import('@/views/classes/ClassList.vue'), meta: { title: '班级管理' } },
      { path: 'packages', name: 'Packages', component: () => import('@/views/finance/PackageList.vue'), meta: { title: '套餐设置' } },
      { path: 'payments', name: 'Payments', component: () => import('@/views/finance/PaymentList.vue'), meta: { title: '缴费记录' } },
      { path: 'attendance', name: 'Attendance', component: () => import('@/views/attendance/AttendanceList.vue'), meta: { title: '考勤管理' } },
      { path: 'leaves', name: 'Leaves', component: () => import('@/views/attendance/LeaveList.vue'), meta: { title: '请假管理' } },
      { path: 'employees', name: 'Employees', component: () => import('@/views/employees/EmployeeList.vue'), meta: { title: '员工管理' } },
      { path: 'schedules', name: 'Schedules', component: () => import('@/views/employees/ScheduleList.vue'), meta: { title: '排班管理' } },
      { path: 'expenses', name: 'Expenses', component: () => import('@/views/finance/ExpenseList.vue'), meta: { title: '支出管理' } },
      { path: 'statistics', name: 'Statistics', component: () => import('@/views/statistics/StatisticsView.vue'), meta: { title: '数据统计' } },
      { path: 'branches', name: 'Branches', component: () => import('@/views/settings/BranchList.vue'), meta: { title: '分店管理' } },
      { path: 'settings', name: 'Settings', component: () => import('@/views/settings/SettingsView.vue'), meta: { title: '系统设置' } }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  if (to.path !== '/' && to.path !== '/main/branches') {
    const branchStore = useBranchStore()
    if (!branchStore.currentBranch) {
      next('/')
      return
    }
  }
  next()
})

export default router
