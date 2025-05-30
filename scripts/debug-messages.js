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

    // Verificar se há conversas
    const conversations = await pool.query(
      "SELECT id, contact_name, contact_phone, status FROM conversations LIMIT 5"
    );
    console.log("\n💬 Conversas encontradas:");
    if (conversations.rows.length === 0) {
      console.log("   ❌ Nenhuma conversa encontrada!");
    } else {
      conversations.rows.forEach((conv) => {
        console.log(
          `   ID: ${conv.id}, Contato: ${
            conv.contact_name || conv.contact_phone
          }, Status: ${conv.status}`
        );
      });
    }

    // Verificar mensagens por conversa
    if (conversations.rows.length > 0) {
      const firstConvId = conversations.rows[0].id;
      const messages = await pool.query(
        "SELECT id, content, message_type, is_from_me, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 5",
        [firstConvId]
      );

      console.log(`\n📨 Mensagens da conversa ${firstConvId}:`);
      if (messages.rows.length === 0) {
        console.log("   ❌ Nenhuma mensagem encontrada para esta conversa!");
      } else {
        messages.rows.forEach((msg) => {
          console.log(
            `   ${msg.is_from_me ? "➡️" : "⬅️"} ${msg.content} (${
              msg.message_type
            }) - ${msg.created_at}`
          );
        });
      }
    }

    console.log("\n✅ Diagnóstico concluído!");
  } catch (error) {
    console.error("❌ Erro:", error);
  } finally {
    process.exit();
  }
}

debugMessages();
