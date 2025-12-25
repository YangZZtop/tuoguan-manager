// 浏览器环境下使用 localStorage 模拟数据库
const DB_KEY = 'tuoguan_db'

function getDb() {
  const data = localStorage.getItem(DB_KEY)
  if (data) {
    return JSON.parse(data)
  }
  // 初始化默认数据
  const defaultDb = {
    branches: [],
    students: [],
    classes: [],
    student_class: [],
    packages: [
      { id: 1, name: '午托', type: 'lunch', price: 800, duration: 30, description: '中午托管，含午餐', created_at: new Date().toISOString() },
      { id: 2, name: '晚托', type: 'evening', price: 1000, duration: 30, description: '下午放学后托管，含晚餐', created_at: new Date().toISOString() },
      { id: 3, name: '全托', type: 'full', price: 1500, duration: 30, description: '午托+晚托，含两餐', created_at: new Date().toISOString() }
    ],
    payments: [],
    attendance: [],
    leaves: [],
    employees: [],
    schedules: [],
    expense_categories: [
      { id: 1, name: '餐饮食材', created_at: new Date().toISOString() },
      { id: 2, name: '房租', created_at: new Date().toISOString() },
      { id: 3, name: '水电费', created_at: new Date().toISOString() },
      { id: 4, name: '员工工资', created_at: new Date().toISOString() },
      { id: 5, name: '教学物资', created_at: new Date().toISOString() },
      { id: 6, name: '设备维护', created_at: new Date().toISOString() },
      { id: 7, name: '其他', created_at: new Date().toISOString() }
    ],
    expenses: [],
    settings: [],
    _nextId: 100
  }
  localStorage.setItem(DB_KEY, JSON.stringify(defaultDb))
  return defaultDb
}

function saveDb(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

function getNextId(db) {
  db._nextId = (db._nextId || 100) + 1
  return db._nextId
}

// 简单 SQL 解析执行
export function mockQuery(sql, params = []) {
  const db = getDb()
  const sqlLower = sql.toLowerCase().trim()
  
  console.log('SQL:', sql, 'Params:', params)
  
  try {
    // INSERT
    if (sqlLower.startsWith('insert')) {
      const tableMatch = sql.match(/insert\s+into\s+(\w+)/i)
      if (!tableMatch) return { success: false, error: 'Invalid INSERT' }
      const table = tableMatch[1]
      
      const columnsMatch = sql.match(/\(([^)]+)\)\s*values/i)
      if (!columnsMatch) return { success: false, error: 'Invalid INSERT columns' }
      const columns = columnsMatch[1].split(',').map(c => c.trim())
      
      const newId = getNextId(db)
      const newRow = { 
        id: newId, 
        created_at: new Date().toISOString(),
        status: 'active' // 默认状态
      }
      
      columns.forEach((col, i) => {
        if (params[i] !== undefined) {
          newRow[col] = params[i]
        }
      })
      
      if (!db[table]) db[table] = []
      db[table].push(newRow)
      saveDb(db)
      
      console.log('Inserted into', table, ':', newRow)
      return { success: true, data: { lastInsertRowid: newId, changes: 1 } }
    }
    
    // SELECT
    if (sqlLower.startsWith('select')) {
      // 解析表名
      const fromMatch = sql.match(/from\s+(\w+)/i)
      if (!fromMatch) return { success: true, data: [] }
      const table = fromMatch[1]
      
      let data = [...(db[table] || [])]
      
      // 解析 WHERE 条件
      const whereMatch = sql.match(/where\s+(.+?)(?:\s+order|\s+group|\s+limit|$)/i)
      if (whereMatch) {
        const whereClause = whereMatch[1]
        let paramIdx = 0
        
        // 先统计有多少个 ? 占位符
        const placeholders = (whereClause.match(/\?/g) || []).length
        
        data = data.filter(row => {
          let match = true
          let localParamIdx = 0
          
          // 解析各种条件
          const conditions = whereClause.split(/\s+and\s+/i)
          
          for (const cond of conditions) {
            const condLower = cond.toLowerCase().trim()
            
            // field = ?
            const eqMatch = cond.match(/(\w+)\s*=\s*\?/i)
            if (eqMatch) {
              const field = eqMatch[1]
              const value = params[localParamIdx++]
              if (row[field] != value) {
                match = false
              }
              continue
            }
            
            // field LIKE ?
            if (condLower.includes('like')) {
              const likeMatch = cond.match(/(\w+)\s+like\s+\?/i)
              if (likeMatch) {
                const field = likeMatch[1]
                const pattern = params[localParamIdx++]
                const searchVal = pattern.replace(/%/g, '')
                if (!row[field] || !row[field].toString().includes(searchVal)) {
                  match = false
                }
              }
              continue
            }
            
            // field BETWEEN ? AND ?
            if (condLower.includes('between')) {
              const betweenMatch = cond.match(/(\w+)\s+between\s+\?\s+and\s+\?/i)
              if (betweenMatch) {
                const field = betweenMatch[1]
                const start = params[localParamIdx++]
                const end = params[localParamIdx++]
                if (row[field] < start || row[field] > end) {
                  match = false
                }
              }
              continue
            }
            
            // field >= ?
            const gteMatch = cond.match(/(\w+)\s*>=\s*\?/i)
            if (gteMatch) {
              const field = gteMatch[1]
              const value = params[localParamIdx++]
              if (row[field] < value) {
                match = false
              }
              continue
            }
            
            // field IN (SELECT ...)  - 简化处理，跳过子查询
            if (condLower.includes('in (select')) {
              // 子查询太复杂，简化为返回 true
              continue
            }
          }
          
          return match
        })
      }
      
      // ORDER BY
      if (sqlLower.includes('order by')) {
        const orderMatch = sql.match(/order\s+by\s+(\w+)(?:\s+(asc|desc))?/i)
        if (orderMatch) {
          const field = orderMatch[1]
          const desc = orderMatch[2]?.toLowerCase() === 'desc'
          data.sort((a, b) => {
            if (desc) return (b[field] || 0) > (a[field] || 0) ? 1 : -1
            return (a[field] || 0) > (b[field] || 0) ? 1 : -1
          })
        }
      }
      
      // COUNT(*)
      if (sqlLower.includes('count(*)')) {
        return { success: true, data: { count: data.length } }
      }
      
      // SUM(field)
      const sumMatch = sql.match(/sum\((\w+)\)/i)
      if (sumMatch) {
        const field = sumMatch[1]
        const total = data.reduce((sum, row) => sum + (parseFloat(row[field]) || 0), 0)
        return { success: true, data: { total } }
      }
      
      console.log('SELECT from', table, ':', data.length, 'rows')
      return { success: true, data }
    }
    
    // UPDATE
    if (sqlLower.startsWith('update')) {
      const tableMatch = sql.match(/update\s+(\w+)/i)
      if (!tableMatch) return { success: false, error: 'Invalid UPDATE' }
      const table = tableMatch[1]
      
      // 解析 SET 子句
      const setMatch = sql.match(/set\s+(.+?)\s+where/i)
      if (!setMatch) return { success: false, error: 'Invalid UPDATE SET' }
      
      const setParts = setMatch[1].split(',').map(s => s.trim())
      const setFields = setParts.map(p => p.split('=')[0].trim())
      
      // 解析 WHERE id = ?
      const whereMatch = sql.match(/where\s+id\s*=\s*\?/i)
      if (!whereMatch) return { success: false, error: 'UPDATE requires WHERE id = ?' }
      
      const id = params[params.length - 1]
      const row = db[table]?.find(r => r.id == id)
      
      if (row) {
        setFields.forEach((field, i) => {
          row[field] = params[i]
        })
        saveDb(db)
        console.log('Updated', table, 'id:', id)
      }
      
      return { success: true, data: { changes: row ? 1 : 0 } }
    }
    
    // DELETE
    if (sqlLower.startsWith('delete')) {
      const tableMatch = sql.match(/delete\s+from\s+(\w+)/i)
      if (!tableMatch) return { success: false, error: 'Invalid DELETE' }
      const table = tableMatch[1]
      
      // WHERE id = ?
      if (sql.match(/where\s+id\s*=\s*\?/i)) {
        const id = params[params.length - 1]
        const before = db[table]?.length || 0
        db[table] = db[table]?.filter(r => r.id != id) || []
        saveDb(db)
        console.log('Deleted from', table, 'id:', id)
        return { success: true, data: { changes: before - (db[table]?.length || 0) } }
      }
      
      // WHERE field = ?
      const whereMatch = sql.match(/where\s+(\w+)\s*=\s*\?/i)
      if (whereMatch) {
        const field = whereMatch[1]
        const value = params[0]
        const before = db[table]?.length || 0
        db[table] = db[table]?.filter(r => r[field] != value) || []
        saveDb(db)
        return { success: true, data: { changes: before - (db[table]?.length || 0) } }
      }
      
      return { success: true, data: { changes: 0 } }
    }
    
    return { success: true, data: [] }
  } catch (error) {
    console.error('Mock DB Error:', error, sql, params)
    return { success: false, error: error.message }
  }
}

export function mockGet(sql, params = []) {
  const result = mockQuery(sql, params)
  if (result.success && Array.isArray(result.data)) {
    return { success: true, data: result.data[0] || null }
  }
  return result
}

// 初始化 mock API
export function initMockAPI() {
  if (!window.electronAPI) {
    window.electronAPI = {
      query: mockQuery,
      get: mockGet
    }
    console.log('Mock database initialized (localStorage)')
  }
}
