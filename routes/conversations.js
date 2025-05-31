const express = require("express");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const EvolutionService = require("../services/EvolutionService");
const ContactProfileService = require("../services/ContactProfileService");
const { authMiddleware } = require("../middleware/auth");
const Instance = require("../models/Instance");

const router = express.Router();

// Listar conversas
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { status, assigned_to_me, unassigned, limit = 50 } = req.query;

    const filters = {};

    if (status) filters.status = status;
    if (assigned_to_me === "true") filters.assigned_user_id = req.user.id;
    if (unassigned === "true") filters.unassigned = true;
    if (limit) filters.limit = parseInt(limit);

    const conversations = await Conversation.findAll(filters);

    res.json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    console.error("Erro ao listar conversas:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
});

// Obter conversa específica
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversa não encontrada",
      });
    }

    // Atualizar perfil do contato automaticamente quando a conversa for acessada
    if (conversation.contact_phone && conversation.instance_name) {
      console.log(
        `🔄 Atualizando perfil do contato ${conversation.contact_phone}...`
      );

      // Executar atualização de perfil em background (não aguardar)
      ContactProfileService.updateContactProfile(
        conversation.contact_phone,
        conversation.instance_name
      )
        .then((profileResult) => {
          if (profileResult.success && profileResult.updated) {
            console.log(
              `✅ Perfil atualizado automaticamente para ${conversation.contact_phone}`
            );

            // Emitir evento via Socket.IO para atualizar frontend em tempo real
            const io = require("../server").io;
            if (io) {
              io.emit("contact_profile_updated", {
                conversation_id: conversation.id,
                contact_phone: conversation.contact_phone,
                profile_data: profileResult.data,
              });
            }
          }
        })
        .catch((error) => {
          console.warn(
            `⚠️ Erro ao atualizar perfil automaticamente:`,
            error.message
          );
        });
    }

    res.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    console.error("Erro ao obter conversa:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
});

// Assumir conversa
router.post("/:id/assign", authMiddleware, async (req, res) => {
  try {
    const conversation = await Conversation.assignToUser(
      req.params.id,
      req.user.id
    );

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversa não encontrada",
      });
    }

    // Emitir evento via Socket.IO
    const io = require("../server").io;
    if (io) {
      io.emit("conversation_assigned", {
        conversation_id: conversation.id,
        assigned_user_id: req.user.id,
        assigned_user_name: req.user.name,
      });
    }

    res.json({
      success: true,
      message: "Conversa assumida com sucesso",
      data: conversation,
    });
  } catch (error) {
    console.error("Erro ao assumir conversa:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
});

// Transferir conversa
router.post("/:id/transfer", authMiddleware, async (req, res) => {
  try {
    const { to_user_id, reason } = req.body;

    if (!to_user_id) {
      return res.status(400).json({
        success: false,
        message: "ID do usuário de destino é obrigatório",
      });
    }

    // Verificar se o usuário de destino existe
    const targetUser = await User.findById(to_user_id);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "Usuário de destino não encontrado",
      });
    }

    const result = await Conversation.transfer(
      req.params.id,
      req.user.id,
      to_user_id,
      reason
    );

    // Emitir evento via Socket.IO
    const io = require("../server").io;
    if (io) {
      io.emit("conversation_transferred", {
        conversation_id: req.params.id,
        from_user_id: req.user.id,
        from_user_name: req.user.name,
        to_user_id: to_user_id,
        to_user_name: targetUser.name,
        reason: reason,
      });
    }

    res.json({
      success: true,
      message: "Conversa transferida com sucesso",
      data: result,
    });
  } catch (error) {
    console.error("Erro ao transferir conversa:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
});

// Finalizar conversa
router.post("/:id/close", authMiddleware, async (req, res) => {
  try {
    const conversation = await Conversation.close(req.params.id);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversa não encontrada",
      });
    }

    // Emitir evento via Socket.IO
    const io = require("../server").io;
    if (io) {
      io.emit("conversation_closed", {
        conversation_id: conversation.id,
        closed_by_user_id: req.user.id,
        closed_by_user_name: req.user.name,
      });
    }

    res.json({
      success: true,
      message: "Conversa finalizada com sucesso",
      data: conversation,
    });
  } catch (error) {
    console.error("Erro ao finalizar conversa:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
});

// Obter mensagens da conversa
router.get("/:id/messages", authMiddleware, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const messages = await Message.findByConversation(
      req.params.id,
      parseInt(limit),
      parseInt(offset)
    );

    res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error("Erro ao obter mensagens:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
});

// Enviar mensagem
router.post("/:id/messages", authMiddleware, async (req, res) => {
  try {
    const { type, content, media, location } = req.body;

    // Obter dados da conversa
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversa não encontrada",
      });
    }

    // Buscar a instância pelo nome para obter as configurações
    const instance = await Instance.findByName(conversation.instance_name);
    if (!instance) {
      return res.status(404).json({
        success: false,
        message: "Instância não encontrada",
      });
    }

    // Criar serviço Evolution API
    const evolutionService = new EvolutionService(
      instance.server_url,
      instance.api_key
    );
    const phone = EvolutionService.validatePhoneNumber(
      conversation.contact_phone
    );

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Número de telefone inválido",
      });
    }

    let result;

    // Enviar mensagem baseado no tipo
    switch (type) {
      case "text":
        result = await evolutionService.sendText(
          conversation.instance_name,
          phone,
          content
        );
        break;

      case "media":
        if (!media || !media.base64 || !media.mimetype) {
          return res.status(400).json({
            success: false,
            message: "Dados de mídia inválidos",
          });
        }

        result = await evolutionService.sendMedia(
          conversation.instance_name,
          phone,
          {
            mediatype: media.mediatype || "image",
            mimetype: media.mimetype,
            caption: content || "",
            media: media.base64,
            fileName: media.filename || "file",
          }
        );
        break;

      case "audio":
        if (!media || !media.base64) {
          return res.status(400).json({
            success: false,
            message: "Dados de áudio inválidos",
          });
        }

        result = await evolutionService.sendAudio(
          conversation.instance_name,
          phone,
          media.base64
        );
        break;

      case "sticker":
        if (!media || !media.base64) {
          return res.status(400).json({
            success: false,
            message: "Dados de sticker inválidos",
          });
        }

        result = await evolutionService.sendSticker(
          conversation.instance_name,
          phone,
          media.base64
        );
        break;

      case "location":
        if (!location || !location.latitude || !location.longitude) {
          return res.status(400).json({
            success: false,
            message: "Dados de localização inválidos",
          });
        }

        result = await evolutionService.sendLocation(
          conversation.instance_name,
          phone,
          location
        );
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Tipo de mensagem inválido",
        });
    }

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: "Erro ao enviar mensagem",
        error: result.error,
      });
    }

    // Salvar mensagem no banco
    const messageData = {
      conversation_id: conversation.id,
      message_id: result.data.key?.id || null,
      sender_type: "user",
      sender_id: req.user.id,
      content: content || "",
      message_type: type,
      is_from_me: true,
      timestamp: Date.now(),
    };

    if (media) {
      messageData.media_base64 = media.base64;
      messageData.media_mimetype = media.mimetype;
      messageData.media_filename = media.filename;
    }

    if (location) {
      messageData.latitude = location.latitude;
      messageData.longitude = location.longitude;
      messageData.location_name = location.name;
      messageData.location_address = location.address;
    }

    const savedMessage = await Message.create(messageData);

    // Atualizar última mensagem da conversa
    await Conversation.updateLastMessage(conversation.id);

    // Emitir evento via Socket.IO
    const io = require("../server").io;
    if (io) {
      io.emit("new_message", {
        conversation_id: conversation.id,
        message: savedMessage,
      });
    }

    res.json({
      success: true,
      message: "Mensagem enviada com sucesso",
      data: savedMessage,
    });
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
});

// Marcar mensagens como lidas
router.post("/:id/mark-read", authMiddleware, async (req, res) => {
  try {
    await Message.markAsRead(req.params.id);

    res.json({
      success: true,
      message: "Mensagens marcadas como lidas",
    });
  } catch (error) {
    console.error("Erro ao marcar como lidas:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
});

// Adicionar nota à conversa
router.post("/:id/notes", authMiddleware, async (req, res) => {
  try {
    const { note } = req.body;

    if (!note) {
      return res.status(400).json({
        success: false,
        message: "Nota é obrigatória",
      });
    }

    const savedNote = await Conversation.addNote(
      req.params.id,
      req.user.id,
      note
    );

    res.json({
      success: true,
      message: "Nota adicionada com sucesso",
      data: savedNote,
    });
  } catch (error) {
    console.error("Erro ao adicionar nota:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
});

// Obter notas da conversa
router.get("/:id/notes", authMiddleware, async (req, res) => {
  try {
    const notes = await Conversation.getNotes(req.params.id);

    res.json({
      success: true,
      data: notes,
    });
  } catch (error) {
    console.error("Erro ao obter notas:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
});

// Obter histórico de transferências
router.get("/:id/transfers", authMiddleware, async (req, res) => {
  try {
    const transfers = await Conversation.getTransferHistory(req.params.id);

    res.json({
      success: true,
      data: transfers,
    });
  } catch (error) {
    console.error("Erro ao obter histórico de transferências:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
});

// Atualizar perfil do contato (profilePicUrl e pushname)
router.post("/:id/update-contact-profile", authMiddleware, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversa não encontrada",
      });
    }

    if (!conversation.contact_phone || !conversation.instance_name) {
      return res.status(400).json({
        success: false,
        message: "Dados de contato ou instância não encontrados",
      });
    }

    console.log(
      `🔄 Atualizando perfil manualmente para ${conversation.contact_phone}...`
    );

    const profileResult = await ContactProfileService.updateContactProfile(
      conversation.contact_phone,
      conversation.instance_name
    );

    if (profileResult.success) {
      // Emitir evento via Socket.IO se houve atualização
      if (profileResult.updated) {
        const io = require("../server").io;
        if (io) {
          io.emit("contact_profile_updated", {
            conversation_id: conversation.id,
            contact_phone: conversation.contact_phone,
            profile_data: profileResult.data,
          });
        }
      }

      res.json({
        success: true,
        message: profileResult.message,
        updated: profileResult.updated,
        data: profileResult.data || null,
      });
    } else {
      res.status(500).json({
        success: false,
        message: profileResult.message,
        error: profileResult.error,
      });
    }
  } catch (error) {
    console.error("Erro ao atualizar perfil do contato:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: error.message,
    });
  }
});

module.exports = router;
