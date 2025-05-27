const fs = require("fs");
const path = require("path");
const pool = require("../config/database");

async function initDatabase() {
  try {
    console.log("🔄 Iniciando configuração do banco de dados...");

    // Ler o arquivo schema.sql
    const schemaPath = path.join(__dirname, "../database/schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf8");

    // Dividir o schema em comandos individuais
    const commands = schema
      .split(";")
      .map((cmd) => cmd.trim())
      .filter((cmd) => cmd.length > 0 && !cmd.startsWith("--"));

    // Executar cada comando
    for (const command of commands) {
      if (command.includes("CREATE DATABASE") || command.includes("\\c")) {
        // Pular comandos específicos do PostgreSQL CLI
        continue;
      }

      try {
        await pool.query(command);
        console.log("✅ Comando executado com sucesso");
      } catch (error) {
        if (error.message.includes("already exists")) {
          console.log("⚠️  Objeto já existe, continuando...");
        } else {
          console.error("❌ Erro ao executar comando:", error.message);
        }
      }
    }

    console.log("✅ Banco de dados configurado com sucesso!");

    // Verificar se o usuário admin existe
    const adminCheck = await pool.query(
      "SELECT id FROM users WHERE email = 'admin@sistema.com'"
    );

    if (adminCheck.rows.length === 0) {
      console.log("👤 Criando usuário administrador padrão...");
      const bcrypt = require("bcryptjs");
      const hashedPassword = await bcrypt.hash("admin123", 10);

      await pool.query(
        `INSERT INTO users (name, email, password, role) 
         VALUES ($1, $2, $3, $4)`,
        ["Administrador", "admin@sistema.com", hashedPassword, "admin"]
      );

      console.log("✅ Usuário administrador criado!");
      console.log("📧 Email: admin@sistema.com");
      console.log("🔑 Senha: admin123");
    } else {
      console.log("👤 Usuário administrador já existe");
    }
  } catch (error) {
    console.error("❌ Erro na configuração do banco:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  initDatabase();
}

module.exports = initDatabase;
