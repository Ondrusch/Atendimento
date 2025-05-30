const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// Importar rotas
const authRoutes = require("./routes/auth");
const webhookRoutes = require("./routes/webhook");
const conversationRoutes = require("./routes/conversations");
const adminRoutes = require("./routes/admin");

// Importar middleware
const { authMiddleware } = require("./middleware/auth");

// Importar modelos para verificar conexão com banco
const pool = require("./config/database");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Middleware para logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, "public")));

// Rotas da API
app.use("/api/auth", authRoutes);
app.use("/webhook", webhookRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/admin", adminRoutes);

// ENDPOINT TEMPORÁRIO PARA CRIAR CONVERSA DE TESTE
app.post("/api/create-test-conversation", async (req, res) => {
  try {
    console.log("🚀 Criando conversa de teste via API...");

    const { v4: uuidv4 } = require("uuid");

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

    // 2. Criar uma conversa de teste
    const conversationId = uuidv4();
    await pool.query(
      `
      INSERT INTO conversations (id, contact_id, status, priority, last_message_at, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW())
      RETURNING *
    `,
      [conversationId, contactId, "waiting", "normal"]
    );

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
          Date.now() + i * 60000,
        ]
      );
    }

    // 4. Atualizar última mensagem da conversa
    await pool.query(
      `UPDATE conversations SET last_message_at = NOW() WHERE id = $1`,
      [conversationId]
    );

    console.log("✅ Conversa de teste criada com sucesso!");

    res.json({
      success: true,
      message: "Conversa de teste criada com sucesso!",
      data: {
        conversationId,
        contactName: contact.rows[0].name,
        messagesCount: messages.length,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao criar conversa de teste:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar conversa de teste",
      error: error.message,
    });
  }
});

// Rota de status da API
app.get("/api/status", async (req, res) => {
  try {
    // Testar conexão com banco
    await pool.query("SELECT 1");

    res.json({
      success: true,
      message: "API funcionando corretamente",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    });
  } catch (error) {
    console.error("Erro no status da API:", error);
    res.status(500).json({
      success: false,
      message: "Erro na conexão com o banco de dados",
    });
  }
});

// Rota para servir o frontend (SPA)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Socket.IO para comunicação em tempo real
const connectedUsers = new Map();

io.on("connection", (socket) => {
  console.log("Usuário conectado:", socket.id);

  // Autenticação do socket
  socket.on("authenticate", async (token) => {
    try {
      const jwt = require("jsonwebtoken");
      const User = require("./models/User");

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (user) {
        socket.userId = user.id;
        socket.userName = user.name;
        socket.userRole = user.role;

        connectedUsers.set(user.id, {
          socketId: socket.id,
          name: user.name,
          role: user.role,
          connectedAt: new Date(),
        });

        socket.emit("authenticated", {
          success: true,
          user: {
            id: user.id,
            name: user.name,
            role: user.role,
          },
        });

        // Notificar outros usuários sobre a conexão
        socket.broadcast.emit("user_connected", {
          id: user.id,
          name: user.name,
          role: user.role,
        });

        console.log(`Usuário autenticado: ${user.name} (${user.email})`);
      } else {
        socket.emit("authentication_error", { message: "Token inválido" });
      }
    } catch (error) {
      console.error("Erro na autenticação do socket:", error);
      socket.emit("authentication_error", { message: "Erro na autenticação" });
    }
  });

  // Entrar em uma conversa específica
  socket.on("join_conversation", (conversationId) => {
    socket.join(`conversation_${conversationId}`);
    console.log(
      `Usuário ${socket.userName} entrou na conversa ${conversationId}`
    );
  });

  // Sair de uma conversa específica
  socket.on("leave_conversation", (conversationId) => {
    socket.leave(`conversation_${conversationId}`);
    console.log(
      `Usuário ${socket.userName} saiu da conversa ${conversationId}`
    );
  });

  // Usuário está digitando
  socket.on("typing", (data) => {
    socket.to(`conversation_${data.conversationId}`).emit("user_typing", {
      userId: socket.userId,
      userName: socket.userName,
      conversationId: data.conversationId,
    });
  });

  // Usuário parou de digitar
  socket.on("stop_typing", (data) => {
    socket.to(`conversation_${data.conversationId}`).emit("user_stop_typing", {
      userId: socket.userId,
      userName: socket.userName,
      conversationId: data.conversationId,
    });
  });

  // Atualizar status do usuário
  socket.on("update_status", async (status) => {
    try {
      const User = require("./models/User");
      await User.updateStatus(socket.userId, status);

      // Notificar outros usuários sobre a mudança de status
      socket.broadcast.emit("user_status_changed", {
        userId: socket.userId,
        status: status,
      });
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  });

  // Desconexão
  socket.on("disconnect", async () => {
    if (socket.userId) {
      try {
        const User = require("./models/User");
        await User.updateStatus(socket.userId, "offline");

        connectedUsers.delete(socket.userId);

        // Notificar outros usuários sobre a desconexão
        socket.broadcast.emit("user_disconnected", {
          userId: socket.userId,
        });

        console.log(`Usuário desconectado: ${socket.userName}`);
      } catch (error) {
        console.error("Erro ao processar desconexão:", error);
      }
    }
  });
});

// Função para emitir eventos para usuários específicos
function emitToUser(userId, event, data) {
  const userConnection = connectedUsers.get(userId);
  if (userConnection) {
    io.to(userConnection.socketId).emit(event, data);
  }
}

// Função para emitir eventos para uma conversa específica
function emitToConversation(conversationId, event, data) {
  io.to(`conversation_${conversationId}`).emit(event, data);
}

// Função para obter usuários conectados
function getConnectedUsers() {
  return Array.from(connectedUsers.values());
}

// Exportar io e funções utilitárias
module.exports = {
  app,
  server,
  io,
  emitToUser,
  emitToConversation,
  getConnectedUsers,
};

// Iniciar servidor
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.APP_URL || `http://localhost:${PORT}`;

server.listen(PORT, () => {
  console.log(`
🚀 Servidor iniciado com sucesso!
📡 Porta: ${PORT}
🌐 URL: ${BASE_URL}
📊 Webhook URL: ${BASE_URL}/webhook
🔗 API Base: ${BASE_URL}/api
  `);
});

// Tratamento de erros não capturados
process.on("uncaughtException", (error) => {
  console.error("Erro não capturado:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Promise rejeitada não tratada:", reason);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("Recebido SIGTERM, encerrando servidor...");
  server.close(() => {
    console.log("Servidor encerrado.");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("Recebido SIGINT, encerrando servidor...");
  server.close(() => {
    console.log("Servidor encerrado.");
    process.exit(0);
  });
});
