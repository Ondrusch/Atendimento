const pool = require("../config/database");

async function debugMessages() {
  try {
    console.log("🔍 Diagnosticando problema das mensagens...\n");

    // Verificar conexão
    await pool.query("SELECT 1");
    console.log("✅ Conexão com banco: OK");

    // Contar tabelas
    const tableChecks = ["conversations", "messages", "contacts", "users"];

    for (const table of tableChecks) {
      try {
        const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`📊 ${table}: ${result.rows[0].count} registros`);
      } catch (err) {
        console.log(`❌ ${table}: Erro - ${err.message}`);
      }
    }

    // Verificar estrutura das conversas
    console.log("\n📋 Estrutura da tabela conversations:");
    const convStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'conversations' 
      ORDER BY ordinal_position
    `);

    convStructure.rows.forEach((col) => {
      console.log(
        `   ${col.column_name}: ${col.data_type} (${
          col.is_nullable === "YES" ? "nullable" : "not null"
        })`
      );
    });

    // Verificar estrutura das mensagens
    console.log("\n📋 Estrutura da tabela messages:");
    const structure = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'messages' 
      ORDER BY ordinal_position
    `);

    structure.rows.forEach((col) => {
      console.log(
        `   ${col.column_name}: ${col.data_type} (${
          col.is_nullable === "YES" ? "nullable" : "not null"
        })`
      );
    });

    // Verificar se há conversas (usando estrutura correta)
    const conversations = await pool.query(
      "SELECT * FROM conversations LIMIT 5"
    );
    console.log("\n💬 Conversas encontradas:");
    if (conversations.rows.length === 0) {
      console.log("   ❌ Nenhuma conversa encontrada!");
      console.log(
        "   ℹ️  Para que as mensagens apareçam, você precisa primeiro receber mensagens via WhatsApp"
      );
      console.log(
        "   ℹ️  As conversas são criadas automaticamente quando chegam mensagens via webhook"
      );
    } else {
      conversations.rows.forEach((conv) => {
        console.log(`   ID: ${conv.id}, Status: ${conv.status}`);
      });
    }

    // Verificar webhooks configurados
    console.log("\n🔗 Verificando configurações de webhook...");
    const instances = await pool.query(
      "SELECT name, webhook_url FROM instances"
    );
    if (instances.rows.length === 0) {
      console.log("   ❌ Nenhuma instância configurada!");
    } else {
      instances.rows.forEach((inst) => {
        console.log(
          `   Instância: ${inst.name}, Webhook: ${
            inst.webhook_url || "Não configurado"
          }`
        );
      });
    }

    console.log("\n✅ Diagnóstico concluído!");
    console.log("\n📝 Resumo do problema:");
    console.log("   - Não há conversas no banco de dados");
    console.log("   - Mensagens só aparecem quando há conversas");
    console.log("   - Conversas são criadas via webhook do WhatsApp");
    console.log("   - Verifique se o webhook está configurado corretamente");
  } catch (error) {
    console.error("❌ Erro:", error);
  } finally {
    process.exit();
  }
}

debugMessages();
