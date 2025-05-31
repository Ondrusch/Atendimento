const EvolutionService = require("./EvolutionService");
const Contact = require("../models/Contact");
const Instance = require("../models/Instance");

class ContactProfileService {
  /**
   * Atualiza o perfil de um contato (profilePicUrl e pushname) usando a Evolution API
   * @param {string} phone - Número de telefone do contato
   * @param {string} instanceName - Nome da instância
   * @returns {Promise<Object>} Resultado da atualização
   */
  static async updateContactProfile(phone, instanceName) {
    try {
      console.log(
        `🔍 Buscando perfil do contato ${phone} na instância ${instanceName}`
      );

      // Buscar dados da instância
      const instance = await Instance.findByName(instanceName);
      if (!instance) {
        throw new Error(`Instância '${instanceName}' não encontrada`);
      }

      // Criar serviço da Evolution API
      const evolutionService = new EvolutionService(
        instance.server_url,
        instance.api_key
      );

      // Formatar número para remoteJid
      const remoteJid = EvolutionService.validatePhoneNumber(phone);
      if (!remoteJid) {
        throw new Error(`Número de telefone inválido: ${phone}`);
      }

      // Buscar informações do perfil na Evolution API
      const profileResult = await evolutionService.findContactProfile(
        instanceName,
        remoteJid
      );

      if (!profileResult.success) {
        console.warn(
          `⚠️ Não foi possível buscar perfil do contato ${phone}:`,
          profileResult.error
        );
        return {
          success: false,
          message: "Não foi possível buscar perfil do contato",
          error: profileResult.error,
        };
      }

      // Extrair dados do perfil
      const contactData = profileResult.data;
      let profileData = {};

      // Verificar se retornou dados
      if (contactData && Array.isArray(contactData) && contactData.length > 0) {
        const contact = contactData[0];

        // Extrair pushname e profilePicUrl
        profileData.pushname =
          contact.pushname || contact.verifiedName || contact.name || null;
        profileData.profilePicUrl = contact.profilePicUrl || null;

        console.log(`✅ Dados do perfil encontrados:`, {
          phone,
          pushname: profileData.pushname,
          hasProfilePic: !!profileData.profilePicUrl,
        });
      } else {
        console.log(`ℹ️ Nenhum dado de perfil encontrado para ${phone}`);
        return {
          success: true,
          message: "Nenhum dado de perfil encontrado",
          updated: false,
        };
      }

      // Atualizar no banco de dados se houver dados
      if (profileData.pushname || profileData.profilePicUrl) {
        const updatedContact = await Contact.updateProfile(phone, profileData);

        if (updatedContact) {
          console.log(`✅ Perfil atualizado com sucesso para ${phone}`);
          return {
            success: true,
            message: "Perfil atualizado com sucesso",
            updated: true,
            data: {
              phone,
              pushname: profileData.pushname,
              profilePicUrl: profileData.profilePicUrl,
              contact: updatedContact,
            },
          };
        }
      }

      return {
        success: true,
        message: "Nenhuma atualização necessária",
        updated: false,
      };
    } catch (error) {
      console.error(`❌ Erro ao atualizar perfil do contato ${phone}:`, error);
      return {
        success: false,
        message: "Erro interno ao atualizar perfil",
        error: error.message,
      };
    }
  }

  /**
   * Atualiza perfis de múltiplos contatos
   * @param {Array} contacts - Array de objetos {phone, instanceName}
   * @returns {Promise<Array>} Resultados das atualizações
   */
  static async updateMultipleContactProfiles(contacts) {
    const results = [];

    for (const contact of contacts) {
      const result = await this.updateContactProfile(
        contact.phone,
        contact.instanceName
      );

      results.push({
        phone: contact.phone,
        instanceName: contact.instanceName,
        ...result,
      });

      // Pequeno delay para não sobrecarregar a API
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return results;
  }
}

module.exports = ContactProfileService;
