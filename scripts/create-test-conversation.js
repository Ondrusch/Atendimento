const pool = require("../config/database");
const { v4: uuidv4 } = require("uuid");

async function createTestConversation() {
  try {
    console.log("🚀 Criando conversa de teste...\n");

    // 1. Criar um contato de teste
    const contactId = uuidv4();
    const contact = await pool.query(
      `
      INSERT INTO contacts (id, phone, name, avatar_url, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `,
      [contactId, "5511999999999", "Cliente Teste", null]
    );

    console.log("✅ Contato criado:", contact.rows[0].name);

    // 2. Criar uma conversa de teste
    const conversationId = uuidv4();
    const conversation = await pool.query(
      `
      INSERT INTO conversations (id, contact_id, status, priority, last_message_at, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW())
      RETURNING *
    `,
      [conversationId, contactId, "waiting", "normal"]
    );

    console.log("✅ Conversa criada:", conversationId);

    // 3. Criar mensagens de teste
    const messages = [
      {
        content: "Olá! Preciso de ajuda com meu pedido.",
        is_from_me: false,
        message_type: "text",
      },
      {
        content: "Olá! Em que posso ajudá-lo?",
        is_from_me: true,
        message_type: "text",
      },
      {
        content: "Meu pedido não chegou ainda.",
        is_from_me: false,
        message_type: "text",
      },
      {
        content: "Vou verificar o status para você.",
        is_from_me: true,
        message_type: "text",
      },
    ];

    console.log("📨 Criando mensagens...");

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const messageId = uuidv4();

      await pool.query(
        `
        INSERT INTO messages (
          id, conversation_id, message_id, sender_type, sender_id, content, 
          message_type, is_from_me, status, timestamp, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      `,
        [
          messageId,
          conversationId,
          `test_msg_${i}`,
          msg.is_from_me ? "user" : "contact",
          null,
          msg.content,
          msg.message_type,
          msg.is_from_me,
          "delivered",
          Date.now() + i * 60000, // Cada mensagem 1 minuto depois
        ]
      );

      console.log(`   ${msg.is_from_me ? "➡️" : "⬅️"} ${msg.content}`);
    }

    // 4. Atualizar última mensagem da conversa
    await pool.query(
      `
      UPDATE conversations 
      SET last_message_at = NOW()
      WHERE id = $1
    `,
      [conversationId]
    );

    console.log("\n✅ Conversa de teste criada com sucesso!");
    console.log("\n📋 Resumo:");
    console.log(`   Conversa ID: ${conversationId}`);
    console.log(
      `   Contato: ${contact.rows[0].name} (${contact.rows[0].phone})`
    );
    console.log(`   Mensagens: ${messages.length}`);
    console.log("   Status: waiting (aguardando atendimento)");
    console.log("\n🎯 Agora acesse o sistema e você verá a conversa na lista!");
  } catch (error) {
    console.error("❌ Erro ao criar conversa de teste:", error);
  } finally {
    process.exit();
  }
}

createTestConversation();
