const pool = require("../config/database");
const bcrypt = require("bcryptjs");

async function fixAdminUser() {
  try {
    console.log("🔍 Diagnosticando problema de login do admin...");

    // 1. Verificar se o usuário existe
    const userCheck = await pool.query(
      "SELECT id, name, email, password, role FROM users WHERE email = 'admin@sistema.com'"
    );

    if (userCheck.rows.length === 0) {
      console.log("❌ Usuário admin não encontrado!");
      console.log("📝 Criando usuário admin...");

      const hashedPassword = await bcrypt.hash("admin123", 10);
      await pool.query(
        `INSERT INTO users (name, email, password, role) 
         VALUES ($1, $2, $3, $4)`,
        ["Administrador", "admin@sistema.com", hashedPassword, "admin"]
      );

      console.log("✅ Usuário admin criado com sucesso!");
      console.log("📧 Email: admin@sistema.com");
      console.log("🔑 Senha: admin123");
      return;
    }

    const user = userCheck.rows[0];
    console.log("✅ Usuário admin encontrado:");
    console.log(`   ID: ${user.id}`);
    console.log(`   Nome: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);

    // 2. Testar a senha atual
    console.log("\n🔐 Testando senha atual...");
    const isCurrentPasswordValid = await bcrypt.compare(
      "admin123",
      user.password
    );

    if (isCurrentPasswordValid) {
      console.log("✅ Senha atual está CORRETA!");
      console.log("🎉 O usuário admin deveria conseguir logar com admin123");

      // Testar a função de validação
      console.log("\n🧪 Testando função de validação...");
      const User = require("../models/User");
      const foundUser = await User.findByEmail("admin@sistema.com");

      if (foundUser) {
        const isValid = await User.validatePassword(
          "admin123",
          foundUser.password
        );
        console.log(
          `🔍 Resultado da validação: ${isValid ? "VÁLIDA" : "INVÁLIDA"}`
        );

        if (!isValid) {
          console.log("❌ Problema na função de validação detectado!");
        }
      }
    } else {
      console.log("❌ Senha atual está INCORRETA!");
      console.log("🔧 Corrigindo senha para admin123...");

      const correctHash = await bcrypt.hash("admin123", 10);
      await pool.query("UPDATE users SET password = $1 WHERE email = $2", [
        correctHash,
        "admin@sistema.com",
      ]);

      console.log("✅ Senha corrigida com sucesso!");

      // Verificar novamente
      const verification = await bcrypt.compare("admin123", correctHash);
      console.log(`🔍 Verificação: ${verification ? "SUCESSO" : "FALHOU"}`);
    }

    // 3. Verificar estrutura da tabela
    console.log("\n📋 Verificando estrutura da tabela users...");
    const tableInfo = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);

    console.log("Colunas da tabela:");
    tableInfo.rows.forEach((col) => {
      console.log(
        `   ${col.column_name}: ${col.data_type} (${
          col.is_nullable === "YES" ? "nullable" : "not null"
        })`
      );
    });

    console.log("\n✅ Diagnóstico concluído!");
    console.log("\n📝 Para testar o login:");
    console.log("   Email: admin@sistema.com");
    console.log("   Senha: admin123");
  } catch (error) {
    console.error("❌ Erro durante o diagnóstico:", error);
  } finally {
    await pool.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  fixAdminUser();
}

module.exports = fixAdminUser;
