# 托管店管理系统

多分店托管机构管理系统，支持学生管理、收费管理、考勤管理、支出管理、数据统计等功能。

## 功能模块

- 分店管理：多分店独立数据
- 学生管理：学生档案、入托/退托
- 班级管理：班级设置、学生分班
- 收费管理：套餐设置（午托/晚托/全托）、缴费记录
- 考勤管理：签到签退、请假管理
- 员工管理：员工信息、排班管理
- 支出管理：分类支出记录
- 数据统计：收支分析、利润报表、Excel导出

## 运行方式

### 1. 安装依赖
```bash
npm install
```

### 2. 开发模式
```bash
# 仅运行 Web 版本
npm run dev

# 运行 Electron 桌面版
npm run electron:dev
```

### 3. 打包成 exe
```bash
npm run electron:build
```

打包后的 exe 文件在 `dist_electron` 目录下。

## 技术栈

- Electron 28
- Vue 3 + Vite
- Element Plus
- SQLite (better-sqlite3)
- ECharts
- XLSX (Excel导出)
