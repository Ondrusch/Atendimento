const pool = require("../config/database");
const bcrypt = require("bcryptjs");

class User {
  static async create(userData) {
    const { name, email, password, role = "atendente" } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO users (name, email, password, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role, status, created_at
    `;

    const result = await pool.query(query, [name, email, hashedPassword, role]);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = "SELECT * FROM users WHERE email = $1";
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  static async findById(id) {
    const query =
      "SELECT id, name, email, role, status, avatar_url, created_at FROM users WHERE id = $1";
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findAll() {
    const query =
      "SELECT id, name, email, role, status, avatar_url, created_at FROM users ORDER BY name";
    const result = await pool.query(query);
    return result.rows;
  }

  static async updateStatus(id, status) {
    const query =
      "UPDATE users SET status = $1 WHERE id = $2 RETURNING id, name, email, role, status";
    const result = await pool.query(query, [status, id]);
    return result.rows[0];
  }

  static async update(id, userData) {
    const { name, email, role, avatar_url } = userData;
    const query = `
      UPDATE users 
      SET name = $1, email = $2, role = $3, avatar_url = $4
      WHERE id = $5
      RETURNING id, name, email, role, status, avatar_url
    `;

    const result = await pool.query(query, [name, email, role, avatar_url, id]);
    return result.rows[0];
  }

  static async delete(id) {
    const query = "DELETE FROM users WHERE id = $1";
    await pool.query(query, [id]);
  }

  static async validatePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async getOnlineUsers() {
    const query =
      "SELECT id, name, email, role, status FROM users WHERE status = 'online' ORDER BY name";
    const result = await pool.query(query);
    return result.rows;
  }
}

module.exports = User;
