const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

let mainWindow
let db
let SQL

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

async function initDatabase() {
  const initSqlJs = require('sql.js')
  SQL = await initSqlJs()
  
  const dbPath = path.join(app.getPath('userData'), 'tuoguan.db')
  
  // 如果数据库文件存在，加载它
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }
  
  // 创建表
  db.run(`
    -- 分店表
    CREATE TABLE IF NOT EXISTS branches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      manager TEXT,
      status TEXT DEFAULT 'active',
      remark TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.run(`
    -- 学生表
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branch_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      grade TEXT,
      school TEXT,
      parent_name TEXT,
      parent_phone TEXT,
      emergency_contact TEXT,
      emergency_phone TEXT,
      status TEXT DEFAULT 'active',
      enroll_date TEXT,
      quit_date TEXT,
      remark TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.run(`
    -- 班级表
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branch_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      teacher_id INTEGER,
      capacity INTEGER DEFAULT 30,
      remark TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.run(`
    -- 学生班级关联表
    CREATE TABLE IF NOT EXISTS student_class (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER,
      class_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.run(`
    -- 托管套餐表
    CREATE TABLE IF NOT EXISTS packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      price REAL NOT NULL,
      duration INTEGER DEFAULT 30,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.run(`
    -- 缴费记录表
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      package_id INTEGER,
      amount REAL NOT NULL,
      pay_date TEXT,
      start_date TEXT,
      end_date TEXT,
      pay_method TEXT,
      remark TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.run(`
    -- 考勤表
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      sign_in_time TEXT,
      sign_out_time TEXT,
      status TEXT DEFAULT 'normal',
      remark TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.run(`
    -- 请假表
    CREATE TABLE IF NOT EXISTS leaves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      reason TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.run(`
    -- 员工表
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branch_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      role TEXT,
      salary REAL,
      entry_date TEXT,
      status TEXT DEFAULT 'active',
      remark TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.run(`
    -- 排班表
    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      shift_type TEXT,
      remark TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.run(`
    -- 支出分类表
    CREATE TABLE IF NOT EXISTS expense_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.run(`
    -- 支出记录表
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branch_id INTEGER NOT NULL,
      category_id INTEGER,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      description TEXT,
      remark TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.run(`
    -- 系统设置表
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.run(`
    -- 用户表
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      role TEXT DEFAULT 'user',
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 初始化默认管理员
  const users = db.exec('SELECT COUNT(*) as count FROM users')
  if (users[0]?.values[0][0] === 0) {
    db.run('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
      ['admin', '123456', '管理员', 'admin'])
  }

  // 初始化默认支出分类
  const categories = db.exec('SELECT COUNT(*) as count FROM expense_categories')
  if (categories[0]?.values[0][0] === 0) {
    const defaultCategories = ['餐饮食材', '房租', '水电费', '员工工资', '教学物资', '设备维护', '其他']
    defaultCategories.forEach(name => {
      db.run('INSERT INTO expense_categories (name) VALUES (?)', [name])
    })
  }

  // 初始化默认套餐
  const packages = db.exec('SELECT COUNT(*) as count FROM packages')
  if (packages[0]?.values[0][0] === 0) {
    db.run('INSERT INTO packages (name, type, price, duration, description) VALUES (?, ?, ?, ?, ?)',
      ['午托', 'lunch', 800, 30, '中午托管，含午餐'])
    db.run('INSERT INTO packages (name, type, price, duration, description) VALUES (?, ?, ?, ?, ?)',
      ['晚托', 'evening', 1000, 30, '下午放学后托管，含晚餐'])
    db.run('INSERT INTO packages (name, type, price, duration, description) VALUES (?, ?, ?, ?, ?)',
      ['全托', 'full', 1500, 30, '午托+晚托，含两餐'])
  }

  // 保存数据库
  saveDatabase()
}

function saveDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'tuoguan.db')
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(dbPath, buffer)
}

// IPC 处理器 - 查询
ipcMain.handle('db:query', (event, sql, params = []) => {
  try {
    const sqlTrim = sql.trim().toUpperCase()
    if (sqlTrim.startsWith('SELECT')) {
      const result = db.exec(sql, params)
      if (result.length === 0) {
        return { success: true, data: [] }
      }
      // 转换为对象数组
      const columns = result[0].columns
      const values = result[0].values
      const data = values.map(row => {
        const obj = {}
        columns.forEach((col, i) => {
          obj[col] = row[i]
        })
        return obj
      })
      return { success: true, data }
    } else {
      db.run(sql, params)
      saveDatabase()
      const lastId = db.exec('SELECT last_insert_rowid()')[0]?.values[0][0]
      return { success: true, data: { lastInsertRowid: lastId, changes: db.getRowsModified() } }
    }
  } catch (error) {
    console.error('DB Error:', error.message, sql)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:get', (event, sql, params = []) => {
  try {
    const result = db.exec(sql, params)
    if (result.length === 0 || result[0].values.length === 0) {
      return { success: true, data: null }
    }
    const columns = result[0].columns
    const row = result[0].values[0]
    const obj = {}
    columns.forEach((col, i) => {
      obj[col] = row[i]
    })
    return { success: true, data: obj }
  } catch (error) {
    console.error('DB Error:', error.message, sql)
    return { success: false, error: error.message }
  }
})

app.whenReady().then(async () => {
  await initDatabase()
  await createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// 退出前保存数据库
app.on('before-quit', () => {
  if (db) {
    saveDatabase()
  }
})
