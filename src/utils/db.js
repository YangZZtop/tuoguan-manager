// 数据库操作封装
export const db = {
  async query(sql, params = []) {
    return await window.electronAPI.query(sql, params)
  },
  
  async get(sql, params = []) {
    return await window.electronAPI.get(sql, params)
  },

  // 通用 CRUD 操作
  async getList(table, branchId, where = '', params = []) {
    let sql = `SELECT * FROM ${table} WHERE branch_id = ?`
    if (where) sql += ` AND ${where}`
    sql += ' ORDER BY id DESC'
    return await this.query(sql, [branchId, ...params])
  },

  async getById(table, id) {
    return await this.get(`SELECT * FROM ${table} WHERE id = ?`, [id])
  },

  async insert(table, data) {
    const keys = Object.keys(data)
    const values = Object.values(data)
    const placeholders = keys.map(() => '?').join(', ')
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`
    return await this.query(sql, values)
  },

  async update(table, id, data) {
    const keys = Object.keys(data)
    const values = Object.values(data)
    const setClause = keys.map(k => `${k} = ?`).join(', ')
    const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`
    return await this.query(sql, [...values, id])
  },

  async delete(table, id) {
    return await this.query(`DELETE FROM ${table} WHERE id = ?`, [id])
  }
}
