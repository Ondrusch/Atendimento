const express = require("express");
const Contact = require("../models/Contact");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Instance = require("../models/Instance");
const EvolutionService = require("../services/EvolutionService");

const router = express.Router();

// Endpoint para receber webhooks da Evolution API
router.post("/", async (req, res) => {
  try {
    console.log("Webhook recebido:", JSON.stringify(req.body, null, 2));

    const webhookData = req.body;

    // Verificar se é um array (como no exemplo fornecido)
    const data = Array.isArray(webhookData) ? webhookData[0] : webhookData;

    if (!data || !data.body) {
      return res.status(400).json({
        success: false,
        message: "Dados do webhook inválidos",
      });
    }

    const { event, instance, data: eventData } = data.body;

    // Processar diferentes tipos de eventos
    switch (event) {
      case "messages.upsert":
        await processMessageUpsert(eventData, instance);
        break;

      case "messages.update":
        await processMessageUpdate(eventData, instance);
        break;

      case "connection.update":
        await processConnectionUpdate(eventData, instance);
        break;

      default:
        console.log(`Evento não processado: ${event}`);
    }

    res.json({
      success: true,
      message: "Webhook processado com sucesso",
    });
  } catch (error) {
    console.error("Erro ao processar webhook:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao processar webhook",
    });
  }
});

// Processar mensagens recebidas/enviadas
async function processMessageUpsert(eventData, instanceName) {
  try {
    const { key, pushName, message, messageType, messageTimestamp } = eventData;
    const { remoteJid, fromMe, id: messageId } = key;

    // Ignorar mensagens de grupos por enquanto
    if (EvolutionService.isGroup(remoteJid)) {
      return;
    }

    // Buscar a instância no banco
    const instance = await Instance.findByInstanceId(instanceName);
    if (!instance) {
      console.error(`Instância não encontrada: ${instanceName}`);
      return;
    }

    // Extrair número do telefone
    const phone = EvolutionService.extractPhoneFromJid(remoteJid);

    // Criar ou atualizar contato
    const contact = await Contact.create({
      phone: phone,
      name: pushName || null,
    });

    // Buscar ou criar conversa
    let conversation = await Conversation.findByContactAndInstance(
      contact.id,
      instance.id
    );
    if (!conversation) {
      conversation = await Conversation.create({
        contact_id: contact.id,
        instance_id: instance.id,
        status: "waiting",
      });
    }

    // Processar conteúdo da mensagem
    let content = "";
    let mediaBase64 = null;
    let mediaMimetype = null;
    let mediaFilename = null;
    let latitude = null;
    let longitude = null;
    let locationName = null;
    let locationAddress = null;

    // Extrair conteúdo baseado no tipo de mensagem
    if (message.conversation) {
      content = message.conversation;
    } else if (message.extendedTextMessage) {
      content = message.extendedTextMessage.text;
    } else if (message.imageMessage) {
      content = message.imageMessage.caption || "";
      mediaBase64 = message.imageMessage.base64 || null;
      mediaMimetype = message.imageMessage.mimetype;
      mediaFilename = message.imageMessage.fileName || "image.jpg";
    } else if (message.videoMessage) {
      content = message.videoMessage.caption || "";
      mediaBase64 = message.videoMessage.base64 || null;
      mediaMimetype = message.videoMessage.mimetype;
      mediaFilename = message.videoMessage.fileName || "video.mp4";
    } else if (message.audioMessage) {
      content = "[Áudio]";
      mediaBase64 = message.audioMessage.base64 || null;
      mediaMimetype = message.audioMessage.mimetype;
      mediaFilename = "audio.ogg";
    } else if (message.documentMessage) {
      content = message.documentMessage.title || "[Documento]";
      mediaBase64 = message.documentMessage.base64 || null;
      mediaMimetype = message.documentMessage.mimetype;
      mediaFilename = message.documentMessage.fileName || "document";
    } else if (message.stickerMessage) {
      content = "[Sticker]";
      mediaBase64 = message.stickerMessage.base64 || null;
      mediaMimetype = message.stickerMessage.mimetype;
      mediaFilename = "sticker.webp";
    } else if (message.locationMessage) {
      latitude = message.locationMessage.degreesLatitude;
      longitude = message.locationMessage.degreesLongitude;
      locationName = message.locationMessage.name || "";
      locationAddress = message.locationMessage.address || "";
      content = `📍 Localização: ${locationName || "Sem nome"}`;
    }

    // Determinar tipo da mensagem
    let msgType = "text";
    if (message.imageMessage) msgType = "image";
    else if (message.videoMessage) msgType = "video";
    else if (message.audioMessage) msgType = "audio";
    else if (message.documentMessage) msgType = "document";
    else if (message.stickerMessage) msgType = "sticker";
    else if (message.locationMessage) msgType = "location";

    // Salvar mensagem no banco
    const savedMessage = await Message.create({
      conversation_id: conversation.id,
      message_id: messageId,
      sender_type: fromMe ? "user" : "contact",
      sender_id: fromMe ? null : null, // Aqui você pode identificar o usuário se necessário
      content: content,
      message_type: msgType,
      media_base64: mediaBase64,
      media_mimetype: mediaMimetype,
      media_filename: mediaFilename,
      latitude: latitude,
      longitude: longitude,
      location_name: locationName,
      location_address: locationAddress,
      is_from_me: fromMe,
      timestamp: messageTimestamp,
    });

    // Atualizar última mensagem da conversa
    await Conversation.updateLastMessage(conversation.id);

    // Emitir evento via Socket.IO para atualizar interface em tempo real
    const io = require("../server").io;
    if (io) {
      io.emit("new_message", {
        conversation_id: conversation.id,
        message: savedMessage,
        contact: contact,
        instance: instance,
      });

      // Se for uma nova conversa, emitir evento
      if (conversation.status === "waiting") {
        io.emit("new_conversation", {
          conversation: conversation,
          contact: contact,
          instance: instance,
          last_message: savedMessage,
        });
      }
    }

    console.log(`Mensagem processada: ${content.substring(0, 50)}...`);
  } catch (error) {
    console.error("Erro ao processar message.upsert:", error);
  }
}

// Processar atualizações de mensagem (status de entrega, leitura, etc.)
async function processMessageUpdate(eventData, instanceName) {
  try {
    const { key, update } = eventData;
    const { id: messageId } = key;

    if (update.status) {
      await Message.updateStatus(messageId, update.status);

      // Emitir evento via Socket.IO
      const io = require("../server").io;
      if (io) {
        io.emit("message_status_update", {
          message_id: messageId,
          status: update.status,
        });
      }
    }
  } catch (error) {
    console.error("Erro ao processar message.update:", error);
  }
}

// Processar atualizações de conexão
async function processConnectionUpdate(eventData, instanceName) {
  try {
    console.log(`Atualização de conexão para ${instanceName}:`, eventData);

    // Aqui você pode implementar lógica para lidar com mudanças de status da conexão
    // Por exemplo, atualizar status da instância no banco de dados
  } catch (error) {
    console.error("Erro ao processar connection.update:", error);
  }
}

module.exports = router;
