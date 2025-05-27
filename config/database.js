const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "chat_multiatendimento",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Teste de conexão
pool.on("connect", () => {
  console.log("✅ Conectado ao banco PostgreSQL");
});

pool.on("error", (err) => {
  console.error("❌ Erro na conexão com o banco:", err);
});

module.exports = pool;
