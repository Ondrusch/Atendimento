const axios = require("axios");
const Instance = require("../models/Instance");

class EvolutionService {
  constructor(serverUrl, apiKey) {
    this.serverUrl = serverUrl;
    this.apiKey = apiKey;
    this.axios = axios.create({
      baseURL: serverUrl,
      headers: {
        apikey: apiKey,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });
  }

  // Enviar mensagem de texto
  async sendText(instanceId, number, text, options = {}) {
    try {
      const data = {
        number: number,
        text: text,
      };

      // Adicionar campos opcionais apenas se tiverem valor
      if (options.delay && options.delay > 0) {
        data.delay = options.delay;
      }

      if (options.linkPreview) {
        data.linkPreview = options.linkPreview;
      }

      if (options.mentionsEveryOne) {
        data.mentionsEveryOne = options.mentionsEveryOne;
      }

      if (options.mentioned && options.mentioned.length > 0) {
        data.mentioned = options.mentioned;
      }

      if (options.quoted) {
        data.quoted = options.quoted;
      }

      const response = await this.axios.post(
        `/message/sendText/${instanceId}`,
        data
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error(
        "Erro ao enviar mensagem de texto:",
        error.response?.data || error.message
      );
      console.error(
        "Detalhes completos do erro:",
        JSON.stringify(error.response?.data, null, 2)
      );
      console.error("Status:", error.response?.status);
      console.error("URL chamada:", error.config?.url);
      console.error(
        "Dados enviados:",
        JSON.stringify(error.config?.data, null, 2)
      );
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  // Enviar mídia
  async sendMedia(instanceId, number, mediaData, options = {}) {
    try {
      const data = {
        number: number,
        mediatype: mediaData.mediatype,
        mimetype: mediaData.mimetype,
        caption: mediaData.caption || "",
        media: mediaData.media, // base64 ou URL
        fileName: mediaData.fileName || "",
        delay: options.delay || 0,
        linkPreview: options.linkPreview || false,
        mentionsEveryOne: options.mentionsEveryOne || false,
        mentioned: options.mentioned || [],
        quoted: options.quoted || null,
      };

      const response = await this.axios.post(
        `/message/sendMedia/${instanceId}`,
        data
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error(
        "Erro ao enviar mídia:",
        error.response?.data || error.message
      );
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  // Enviar áudio
  async sendAudio(instanceId, number, audioBase64, options = {}) {
    try {
      const data = {
        number: number,
        audio: audioBase64,
        delay: options.delay || 0,
        linkPreview: options.linkPreview || false,
        mentionsEveryOne: options.mentionsEveryOne || false,
        mentioned: options.mentioned || [],
        quoted: options.quoted || null,
      };

      const response = await this.axios.post(
        `/message/sendWhatsAppAudio/${instanceId}`,
        data
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error(
        "Erro ao enviar áudio:",
        error.response?.data || error.message
      );
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  // Enviar sticker
  async sendSticker(instanceId, number, stickerBase64, options = {}) {
    try {
      const data = {
        number: number,
        sticker: stickerBase64,
        delay: options.delay || 0,
        linkPreview: options.linkPreview || false,
        mentionsEveryOne: options.mentionsEveryOne || false,
        mentioned: options.mentioned || [],
        quoted: options.quoted || null,
      };

      const response = await this.axios.post(
        `/message/sendSticker/${instanceId}`,
        data
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error(
        "Erro ao enviar sticker:",
        error.response?.data || error.message
      );
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  // Enviar localização
  async sendLocation(instanceId, number, locationData, options = {}) {
    try {
      const data = {
        number: number,
        name: locationData.name,
        address: locationData.address,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        delay: options.delay || 0,
        linkPreview: options.linkPreview || false,
        mentionsEveryOne: options.mentionsEveryOne || false,
        mentioned: options.mentioned || [],
        quoted: options.quoted || null,
      };

      const response = await this.axios.post(
        `/message/sendLocation/${instanceId}`,
        data
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error(
        "Erro ao enviar localização:",
        error.response?.data || error.message
      );
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  // Marcar mensagem como lida
  async markAsRead(instanceId, remoteJid, messageId) {
    try {
      const data = {
        readMessages: [
          {
            remoteJid: remoteJid,
            id: messageId,
          },
        ],
      };

      const response = await this.axios.post(
        `/chat/markMessageAsRead/${instanceId}`,
        data
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error(
        "Erro ao marcar como lida:",
        error.response?.data || error.message
      );
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  // Obter informações do contato
  async getContactInfo(instanceId, number) {
    try {
      const response = await this.axios.get(
        `/chat/whatsappNumbers/${instanceId}`,
        {
          params: { numbers: [number] },
        }
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error(
        "Erro ao obter info do contato:",
        error.response?.data || error.message
      );
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  // Buscar perfil do contato (profilePicUrl e pushname)
  async findContactProfile(instanceId, remoteJid) {
    try {
      const response = await this.axios.post(
        `/chat/findContacts/${instanceId}`,
        {
          where: {
            remoteJid: remoteJid,
          },
        }
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error(
        "Erro ao buscar perfil do contato:",
        error.response?.data || error.message
      );
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  // Obter status da instância
  async getInstanceStatus(instanceId) {
    try {
      const response = await this.axios.get(
        `/instance/connectionState/${instanceId}`
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error(
        "Erro ao obter status da instância:",
        error.response?.data || error.message
      );
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  // Configurar webhook
  async setWebhook(instanceId, webhookUrl, events = []) {
    try {
      const data = {
        webhook: {
          url: webhookUrl,
          events:
            events.length > 0
              ? events
              : [
                  "APPLICATION_STARTUP",
                  "QRCODE_UPDATED",
                  "CONNECTION_UPDATE",
                  "MESSAGES_UPSERT",
                  "MESSAGES_UPDATE",
                  "SEND_MESSAGE",
                ],
        },
      };

      const response = await this.axios.post(
        `/webhook/set/${instanceId}`,
        data
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error(
        "Erro ao configurar webhook:",
        error.response?.data || error.message
      );
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  // Método estático para criar instância do serviço baseado na instância do banco
  static async createFromInstance(instanceId) {
    const instance = await Instance.findByInstanceId(instanceId);
    if (!instance) {
      throw new Error("Instância não encontrada");
    }

    return new EvolutionService(instance.server_url, instance.api_key);
  }

  // Método estático para criar instância do serviço baseado no ID da instância do banco
  static async createFromInstanceDbId(instanceDbId) {
    const instance = await Instance.findById(instanceDbId);
    if (!instance) {
      throw new Error("Instância não encontrada");
    }

    return new EvolutionService(instance.server_url, instance.api_key);
  }

  // Validar número de telefone
  static validatePhoneNumber(phone) {
    // Remove todos os caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, "");

    // Verifica se tem pelo menos 10 dígitos (formato mínimo)
    if (cleanPhone.length < 10) {
      return null;
    }

    // Se não tem código do país, adiciona 55 (Brasil)
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      return `55${cleanPhone}@s.whatsapp.net`;
    }

    // Se já tem código do país
    if (cleanPhone.length >= 12) {
      return `${cleanPhone}@s.whatsapp.net`;
    }

    return null;
  }

  // Extrair número do remoteJid
  static extractPhoneFromJid(remoteJid) {
    return remoteJid.replace("@s.whatsapp.net", "").replace("@c.us", "");
  }

  // Verificar se é um grupo
  static isGroup(remoteJid) {
    return remoteJid.includes("@g.us");
  }

  // Processar mídia base64
  static processMediaBase64(base64Data, mimeType) {
    try {
      // Remove o prefixo data:mime/type;base64, se existir
      const base64Clean = base64Data.replace(/^data:[^;]+;base64,/, "");

      // Determina a extensão do arquivo baseado no mimeType
      const extensions = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/gif": "gif",
        "image/webp": "webp",
        "video/mp4": "mp4",
        "video/avi": "avi",
        "audio/mpeg": "mp3",
        "audio/ogg": "ogg",
        "audio/wav": "wav",
        "application/pdf": "pdf",
        "application/msword": "doc",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
          "docx",
      };

      const extension = extensions[mimeType] || "bin";
      const fileName = `file_${Date.now()}.${extension}`;

      return {
        base64: base64Clean,
        fileName: fileName,
        mimeType: mimeType,
        size: Math.round((base64Clean.length * 3) / 4), // Tamanho aproximado em bytes
      };
    } catch (error) {
      console.error("Erro ao processar mídia base64:", error);
      return null;
    }
  }
}

module.exports = EvolutionService;
