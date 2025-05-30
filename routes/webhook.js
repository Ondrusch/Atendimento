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
    console.log("🔗 Webhook recebido:", JSON.stringify(req.body, null, 2));

    const webhookData = req.body;

    // A estrutura correta do webhook é diretamente no body
    const { event, instance, data: eventData } = webhookData;

    if (!event || !instance || !eventData) {
      console.log("❌ Dados do webhook inválidos - faltam campos obrigatórios");
      console.log("Event:", event, "Instance:", instance, "Data:", !!eventData);
      return res.status(400).json({
        success: false,
        message: "Dados do webhook inválidos",
      });
    }

    console.log(`📧 Processando evento: ${event} para instância: ${instance}`);

    // Processar diferentes tipos de eventos
    switch (event) {
      case "messages.upsert":
        console.log("📨 Processando messages.upsert");
        await processMessageUpsert(eventData, instance);
        break;

      case "messages.update":
        console.log("🔄 Processando messages.update");
        await processMessageUpdate(eventData, instance);
        break;

      case "connection.update":
        console.log("🔌 Processando connection.update");
        await processConnectionUpdate(eventData, instance);
        break;

      default:
        console.log(`⚠️ Evento não processado: ${event}`);
    }

    console.log("✅ Webhook processado com sucesso");
    res.json({
      success: true,
      message: "Webhook processado com sucesso",
    });
  } catch (error) {
    console.error("❌ Erro ao processar webhook:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao processar webhook",
      error: error.message,
    });
  }
});

// Processar mensagens recebidas/enviadas
async function processMessageUpsert(eventData, instanceName) {
  try {
    console.log(
      `🔄 Iniciando processamento da mensagem para instância: ${instanceName}`
    );

    const { key, pushName, message, messageType, messageTimestamp } = eventData;
    const { remoteJid, fromMe, id: messageId } = key;

    console.log(`📱 Dados da mensagem:`, {
      messageId,
      remoteJid,
      fromMe,
      pushName,
      messageType,
    });

    // Ignorar mensagens de grupos por enquanto
    if (EvolutionService.isGroup(remoteJid)) {
      console.log("⏭️ Mensagem de grupo ignorada");
      return;
    }

    // Buscar a instância no banco
    console.log(`🔍 Buscando instância: ${instanceName}`);
    const instance = await Instance.findByInstanceIdOrName(instanceName);
    if (!instance) {
      console.error(`❌ Instância não encontrada: ${instanceName}`);
      console.log(
        `ℹ️ Tentando buscar por instance_id OU name = "${instanceName}"`
      );
      return;
    }
    console.log(`✅ Instância encontrada:`, instance.name);

    // Se for mensagem enviada por mim (fromMe: true), não processar como nova mensagem
    if (fromMe) {
      console.log("📤 Mensagem enviada por mim - não criando nova mensagem");

      // Extrair número do telefone
      const phone = EvolutionService.extractPhoneFromJid(remoteJid);
      console.log(`📞 Telefone extraído: ${phone}`);

      // Atualizar nome do contato se necessário
      console.log(`👤 Atualizando nome do contato...`);
      const contact = await Contact.create({
        phone: phone,
        name: pushName || null, // Usar o pushName do remoteJid para mensagens fromMe
      });
      console.log(`✅ Contato atualizado:`, contact.name || contact.phone);

      return; // Não criar mensagem no banco para fromMe: true
    }

    // Extrair número do telefone
    const phone = EvolutionService.extractPhoneFromJid(remoteJid);
    console.log(`📞 Telefone extraído: ${phone}`);

    // Criar ou atualizar contato
    console.log(`👤 Criando/atualizando contato...`);
    const contact = await Contact.create({
      phone: phone,
      name: pushName || null,
    });
    console.log(`✅ Contato processado:`, contact.name || contact.phone);

    // Buscar ou criar conversa
    console.log(`💬 Buscando conversa...`);
    let conversation = await Conversation.findByContactAndInstance(
      contact.id,
      instance.id
    );
    if (!conversation) {
      console.log(`🆕 Criando nova conversa...`);
      conversation = await Conversation.create({
        contact_id: contact.id,
        instance_id: instance.id,
        status: "waiting",
      });
      console.log(`✅ Nova conversa criada:`, conversation.id);
    } else {
      console.log(`✅ Conversa existente encontrada:`, conversation.id);
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

    console.log(`📝 Processando conteúdo da mensagem...`);
    console.log(`🔍 Estrutura da mensagem:`, Object.keys(message));

    // Extrair conteúdo baseado no tipo de mensagem
    if (message.conversation) {
      content = message.conversation;
      console.log(`💬 Mensagem de texto simples: ${content}`);
    } else if (message.extendedTextMessage) {
      content = message.extendedTextMessage.text;
      console.log(`📄 Mensagem de texto estendida: ${content}`);
    } else if (message.imageMessage) {
      content = message.imageMessage.caption || "";
      mediaBase64 = message.imageMessage.base64 || null;
      mediaMimetype = message.imageMessage.mimetype;
      mediaFilename = message.imageMessage.fileName || "image.jpg";
      console.log(`🖼️ Mensagem de imagem: ${content || "[Sem legenda]"}`);
    } else if (message.videoMessage) {
      content = message.videoMessage.caption || "";
      mediaBase64 = message.videoMessage.base64 || null;
      mediaMimetype = message.videoMessage.mimetype;
      mediaFilename = message.videoMessage.fileName || "video.mp4";
      console.log(`🎥 Mensagem de vídeo: ${content || "[Sem legenda]"}`);
    } else if (message.audioMessage) {
      content = "[Áudio]";
      mediaBase64 = message.audioMessage.base64 || null;
      mediaMimetype = message.audioMessage.mimetype;
      mediaFilename = "audio.ogg";
      console.log(`🎵 Mensagem de áudio`);
    } else if (message.documentMessage) {
      content = message.documentMessage.title || "[Documento]";
      mediaBase64 = message.documentMessage.base64 || null;
      mediaMimetype = message.documentMessage.mimetype;
      mediaFilename = message.documentMessage.fileName || "document";
      console.log(`📎 Mensagem de documento: ${content}`);
    } else if (message.stickerMessage) {
      content = "[Sticker]";
      mediaBase64 = message.stickerMessage.base64 || null;
      mediaMimetype = message.stickerMessage.mimetype;
      mediaFilename = "sticker.webp";
      console.log(`😊 Mensagem de sticker`);
    } else if (message.locationMessage) {
      latitude = message.locationMessage.degreesLatitude;
      longitude = message.locationMessage.degreesLongitude;
      locationName = message.locationMessage.name || "";
      locationAddress = message.locationMessage.address || "";
      content = `📍 Localização: ${locationName || "Sem nome"}`;
      console.log(`📍 Mensagem de localização: ${content}`);
    } else {
      console.log(`⚠️ Tipo de mensagem não reconhecido`, Object.keys(message));
      content = "[Mensagem não suportada]";
    }

    // Determinar tipo da mensagem
    let msgType = "text";
    if (message.imageMessage) msgType = "image";
    else if (message.videoMessage) msgType = "video";
    else if (message.audioMessage) msgType = "audio";
    else if (message.documentMessage) msgType = "document";
    else if (message.stickerMessage) msgType = "sticker";
    else if (message.locationMessage) msgType = "location";

    console.log(`📊 Tipo de mensagem determinado: ${msgType}`);

    // Salvar mensagem no banco
    console.log(`💾 Salvando mensagem no banco...`);
    const savedMessage = await Message.create({
      conversation_id: conversation.id,
      message_id: messageId,
      sender_type: fromMe ? "user" : "contact",
      sender_id: fromMe ? null : null,
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
    console.log(`✅ Mensagem salva com ID: ${savedMessage.id}`);

    // Atualizar última mensagem da conversa
    console.log(`🔄 Atualizando última mensagem da conversa...`);
    await Conversation.updateLastMessage(conversation.id);

    // Emitir evento via Socket.IO para atualizar interface em tempo real
    console.log(`📡 Emitindo eventos Socket.IO...`);
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
      console.log(`✅ Eventos Socket.IO emitidos`);
    } else {
      console.log(`⚠️ Socket.IO não disponível`);
    }

    console.log(
      `✅ Mensagem processada com sucesso: ${content.substring(0, 50)}...`
    );
  } catch (error) {
    console.error("❌ Erro ao processar message.upsert:", error);
    console.error("Stack trace:", error.stack);
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
