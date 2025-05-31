const express = require("express");
const axios = require("axios");
const User = require("../models/User");
const EvolutionConfig = require("../models/EvolutionConfig");
const Instance = require("../models/Instance");
const EvolutionService = require("../services/EvolutionService");
const ContactProfileService = require("../services/ContactProfileService");
const {
  authMiddleware,
  adminMiddleware,
  supervisorMiddleware,
} = require("../middleware/auth");

const router = express.Router();

// ===== USUÁRIOS =====

// Listar usuários
router.get("/users", authMiddleware, supervisorMiddleware, async (req, res) => {
  try {
    const users = await User.findAll();
    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Erro ao listar usuários:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
});

// Buscar usuário específico
router.get(
  "/users/:id",
  authMiddleware,
  supervisorMiddleware,
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Usuário não encontrado",
        });
      }

      // Não retornar a senha
      delete user.password;

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error("Erro ao buscar usuário:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }
);

// Criar usuário
router.post("/users", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Nome, email e senha são obrigatórios",
      });
    }

    // Verificar se email já existe
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email já está em uso",
      });
    }

    const user = await User.create({ name, email, password, role });

    res.status(201).json({
      success: true,
      message: "Usuário criado com sucesso",
      data: user,
    });
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
});

// Atualizar usuário
router.put("/users/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, email, role, avatar_url, password } = req.body;

    // Preparar dados para atualização
    const updateData = {
      name,
      email,
      role,
      avatar_url,
    };

    // Se senha foi fornecida, incluir na atualização
    if (password && password.trim() !== "") {
      updateData.password = password;
    }

    const user = await User.update(req.params.id, updateData);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuário não encontrado",
      });
    }

    res.json({
      success: true,
      message: "Usuário atualizado com sucesso",
      data: user,
    });
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
});

// Excluir usuário
router.delete(
  "/users/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      await User.delete(req.params.id);

      res.json({
        success: true,
        message: "Usuário excluído com sucesso",
      });
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }
);

// Obter usuários online
router.get("/users/online", authMiddleware, async (req, res) => {
  try {
    const users = await User.getOnlineUsers();
    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Erro ao obter usuários online:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
});

// ===== CONFIGURAÇÕES EVOLUTION API =====

// Listar configurações
router.get(
  "/evolution-configs",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const configs = await EvolutionConfig.findAll();
      res.json({
        success: true,
        data: configs,
      });
    } catch (error) {
      console.error("Erro ao listar configurações:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }
);

// Buscar configuração específica
router.get(
  "/evolution-configs/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const config = await EvolutionConfig.findById(req.params.id);

      if (!config) {
        return res.status(404).json({
          success: false,
          message: "Configuração não encontrada",
        });
      }

      res.json({
        success: true,
        data: config,
      });
    } catch (error) {
      console.error("Erro ao buscar configuração:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }
);

// Criar configuração
router.post(
  "/evolution-configs",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { name, server_url, api_key, webhook_url } = req.body;

      if (!name || !server_url || !api_key) {
        return res.status(400).json({
          success: false,
          message: "Nome, URL do servidor e API key são obrigatórios",
        });
      }

      const config = await EvolutionConfig.create({
        name,
        server_url,
        api_key,
        webhook_url,
      });

      res.status(201).json({
        success: true,
        message: "Configuração criada com sucesso",
        data: config,
      });
    } catch (error) {
      console.error("Erro ao criar configuração:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }
);

// Atualizar configuração
router.put(
  "/evolution-configs/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { name, server_url, api_key, webhook_url, is_active } = req.body;

      const config = await EvolutionConfig.update(req.params.id, {
        name,
        server_url,
        api_key,
        webhook_url,
        is_active,
      });

      if (!config) {
        return res.status(404).json({
          success: false,
          message: "Configuração não encontrada",
        });
      }

      res.json({
        success: true,
        message: "Configuração atualizada com sucesso",
        data: config,
      });
    } catch (error) {
      console.error("Erro ao atualizar configuração:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }
);

// Excluir configuração
router.delete(
  "/evolution-configs/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      await EvolutionConfig.delete(req.params.id);

      res.json({
        success: true,
        message: "Configuração excluída com sucesso",
      });
    } catch (error) {
      console.error("Erro ao excluir configuração:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Erro interno do servidor",
      });
    }
  }
);

// Testar configuração
router.post(
  "/evolution-configs/:id/test",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const config = await EvolutionConfig.findById(req.params.id);

      if (!config) {
        return res.status(404).json({
          success: false,
          message: "Configuração não encontrada",
        });
      }

      // Teste básico de conexão com a Evolution API
      try {
        const response = await axios.get(
          `${config.server_url}/manager/findInstances`,
          {
            headers: {
              apikey: config.api_key,
              "Content-Type": "application/json",
            },
            timeout: 10000,
          }
        );

        // Se o teste foi bem-sucedido, ativar a configuração
        await EvolutionConfig.update(req.params.id, {
          ...config,
          is_active: true,
        });

        res.json({
          success: true,
          data: {
            success: true,
            message: "Conexão estabelecida com sucesso. Configuração ativada!",
            response: response.data,
          },
        });
      } catch (apiError) {
        res.json({
          success: true,
          data: {
            success: false,
            message: `Falha na conexão: ${apiError.message}`,
          },
        });
      }
    } catch (error) {
      console.error("Erro ao testar configuração:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }
);

// Obter estatísticas da configuração
router.get(
  "/evolution-configs/:id/stats",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const stats = await EvolutionConfig.getStats(req.params.id);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Erro ao obter estatísticas:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }
);

// ===== INSTÂNCIAS =====

// Listar instâncias
router.get("/instances", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const instances = await Instance.findAll();
    res.json({
      success: true,
      data: instances,
    });
  } catch (error) {
    console.error("Erro ao listar instâncias:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
});

// Buscar instância específica
router.get(
  "/instances/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const instance = await Instance.findById(req.params.id);

      if (!instance) {
        return res.status(404).json({
          success: false,
          message: "Instância não encontrada",
        });
      }

      res.json({
        success: true,
        data: instance,
      });
    } catch (error) {
      console.error("Erro ao buscar instância:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }
);

// Criar instância
router.post("/instances", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, instance_id, evolution_config_id } = req.body;

    if (!name || !instance_id || !evolution_config_id) {
      return res.status(400).json({
        success: false,
        message: "Nome, ID da instância e configuração são obrigatórios",
      });
    }

    // Verificar se já existe uma instância com o mesmo instance_id na mesma configuração
    const isDuplicate = await Instance.checkDuplicate(
      instance_id,
      evolution_config_id
    );
    if (isDuplicate) {
      return res.status(400).json({
        success: false,
        message: "Já existe uma instância com este ID nesta configuração",
      });
    }

    // Buscar configuração da Evolution API
    const config = await EvolutionConfig.findById(evolution_config_id);
    if (!config) {
      return res.status(404).json({
        success: false,
        message: "Configuração Evolution API não encontrada",
      });
    }

    // Criar instância no banco de dados
    const instance = await Instance.create({
      name,
      instance_id,
      evolution_config_id,
    });

    // Tentar criar instância na Evolution API se estiver ativa
    if (config.is_active) {
      const evolutionService = new EvolutionService(
        config.server_url,
        config.api_key
      );
      const webhookUrl =
        config.webhook_url ||
        `${
          process.env.BASE_URL || req.protocol + "://" + req.get("host")
        }/webhook`;

      const result = await evolutionService.createInstance(
        instance_id,
        webhookUrl
      );

      if (!result.success) {
        console.warn(
          `⚠️ Falha ao criar instância na Evolution API: ${result.error}`
        );
        // Não falha a operação, apenas avisa
      } else {
        console.log(`✅ Instância ${instance_id} criada na Evolution API`);
      }
    }

    res.status(201).json({
      success: true,
      message: "Instância criada com sucesso",
      data: instance,
    });
  } catch (error) {
    console.error("Erro ao criar instância:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
});

// Atualizar instância
router.put(
  "/instances/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { name, instance_id, evolution_config_id, is_active } = req.body;

      // Verificar duplicata se instance_id ou config foram alterados
      if (instance_id && evolution_config_id) {
        const isDuplicate = await Instance.checkDuplicate(
          instance_id,
          evolution_config_id,
          req.params.id
        );
        if (isDuplicate) {
          return res.status(400).json({
            success: false,
            message: "Já existe uma instância com este ID nesta configuração",
          });
        }
      }

      const instance = await Instance.update(req.params.id, {
        name,
        instance_id,
        evolution_config_id,
        is_active,
      });

      if (!instance) {
        return res.status(404).json({
          success: false,
          message: "Instância não encontrada",
        });
      }

      res.json({
        success: true,
        message: "Instância atualizada com sucesso",
        data: instance,
      });
    } catch (error) {
      console.error("Erro ao atualizar instância:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }
);

// Excluir instância
router.delete(
  "/instances/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      // Buscar instância com configuração antes de deletar
      const instance = await Instance.findById(req.params.id);

      if (!instance) {
        return res.status(404).json({
          success: false,
          message: "Instância não encontrada",
        });
      }

      // Se estiver ativa, tentar remover da Evolution API
      if (instance.is_active) {
        const config = await EvolutionConfig.findById(
          instance.evolution_config_id
        );

        if (config && config.is_active) {
          const evolutionService = new EvolutionService(
            config.server_url,
            config.api_key
          );

          console.log(
            `🔄 Removendo instância ${instance.instance_id} da Evolution API...`
          );

          // Desconectar primeiro
          await evolutionService.disconnectInstance(instance.instance_id);

          // Depois deletar
          const result = await evolutionService.deleteInstance(
            instance.instance_id
          );

          if (!result.success) {
            console.warn(
              `⚠️ Falha ao remover instância da Evolution API: ${result.error}`
            );
          } else {
            console.log(
              `✅ Instância ${instance.instance_id} removida da Evolution API`
            );
          }
        }
      }

      // Deletar do banco de dados
      await Instance.delete(req.params.id);

      res.json({
        success: true,
        message: "Instância excluída com sucesso",
      });
    } catch (error) {
      console.error("Erro ao excluir instância:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Erro interno do servidor",
      });
    }
  }
);

// Obter estatísticas da instância
router.get(
  "/instances/:id/stats",
  authMiddleware,
  supervisorMiddleware,
  async (req, res) => {
    try {
      const stats = await Instance.getStats(req.params.id);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Erro ao obter estatísticas da instância:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }
);

// Obter conversas da instância
router.get(
  "/instances/:id/conversations",
  authMiddleware,
  supervisorMiddleware,
  async (req, res) => {
    try {
      const { status, limit } = req.query;
      const filters = {};

      if (status) filters.status = status;
      if (limit) filters.limit = parseInt(limit);

      const conversations = await Instance.getConversations(
        req.params.id,
        filters
      );

      res.json({
        success: true,
        data: conversations,
      });
    } catch (error) {
      console.error("Erro ao obter conversas da instância:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }
);

// Alternar status ativo/inativo da instância
router.post(
  "/instances/:id/toggle",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      // Buscar instância com configuração
      const instance = await Instance.findById(req.params.id);

      if (!instance) {
        return res.status(404).json({
          success: false,
          message: "Instância não encontrada",
        });
      }

      // Buscar configuração da Evolution API
      const config = await EvolutionConfig.findById(
        instance.evolution_config_id
      );
      if (!config || !config.is_active) {
        return res.status(400).json({
          success: false,
          message: "Configuração Evolution API não encontrada ou inativa",
        });
      }

      const evolutionService = new EvolutionService(
        config.server_url,
        config.api_key
      );
      const webhookUrl =
        config.webhook_url ||
        `${
          process.env.BASE_URL || req.protocol + "://" + req.get("host")
        }/webhook`;

      let evolutionResult;

      if (instance.is_active) {
        // Desativar: desconectar e deletar da Evolution API
        console.log(`🔄 Desativando instância ${instance.instance_id}...`);

        // Primeiro desconectar
        await evolutionService.disconnectInstance(instance.instance_id);

        // Depois deletar
        evolutionResult = await evolutionService.deleteInstance(
          instance.instance_id
        );

        if (!evolutionResult.success) {
          console.warn(
            `⚠️ Falha ao deletar instância da Evolution API: ${evolutionResult.error}`
          );
        } else {
          console.log(
            `✅ Instância ${instance.instance_id} removida da Evolution API`
          );
        }
      } else {
        // Ativar: criar na Evolution API
        console.log(`🔄 Ativando instância ${instance.instance_id}...`);

        evolutionResult = await evolutionService.createInstance(
          instance.instance_id,
          webhookUrl
        );

        if (!evolutionResult.success) {
          console.warn(
            `⚠️ Falha ao criar instância na Evolution API: ${evolutionResult.error}`
          );
        } else {
          console.log(
            `✅ Instância ${instance.instance_id} criada na Evolution API`
          );
        }
      }

      // Atualizar status no banco independente do resultado da Evolution API
      const updatedInstance = await Instance.toggleActive(req.params.id);

      res.json({
        success: true,
        message: `Instância ${
          updatedInstance.is_active ? "ativada" : "desativada"
        } com sucesso`,
        data: updatedInstance,
        evolutionApiResult: evolutionResult,
      });
    } catch (error) {
      console.error("Erro ao alternar status da instância:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }
);

// Conectar instância (obter QR Code)
router.post(
  "/instances/:id/connect",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const instance = await Instance.findById(req.params.id);

      if (!instance) {
        return res.status(404).json({
          success: false,
          message: "Instância não encontrada",
        });
      }

      if (!instance.is_active) {
        return res.status(400).json({
          success: false,
          message: "Instância deve estar ativa para conectar",
        });
      }

      const config = await EvolutionConfig.findById(
        instance.evolution_config_id
      );
      if (!config || !config.is_active) {
        return res.status(400).json({
          success: false,
          message: "Configuração Evolution API não encontrada ou inativa",
        });
      }

      const evolutionService = new EvolutionService(
        config.server_url,
        config.api_key
      );
      const result = await evolutionService.connectInstance(
        instance.instance_id
      );

      res.json({
        success: result.success,
        message: result.success
          ? "QR Code gerado com sucesso"
          : "Falha ao gerar QR Code",
        data: result.data,
        error: result.error,
      });
    } catch (error) {
      console.error("Erro ao conectar instância:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }
);

// Desconectar instância
router.post(
  "/instances/:id/disconnect",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const instance = await Instance.findById(req.params.id);

      if (!instance) {
        return res.status(404).json({
          success: false,
          message: "Instância não encontrada",
        });
      }

      const config = await EvolutionConfig.findById(
        instance.evolution_config_id
      );
      if (!config || !config.is_active) {
        return res.status(400).json({
          success: false,
          message: "Configuração Evolution API não encontrada ou inativa",
        });
      }

      const evolutionService = new EvolutionService(
        config.server_url,
        config.api_key
      );
      const result = await evolutionService.disconnectInstance(
        instance.instance_id
      );

      res.json({
        success: result.success,
        message: result.success
          ? "Instância desconectada com sucesso"
          : "Falha ao desconectar instância",
        data: result.data,
        error: result.error,
      });
    } catch (error) {
      console.error("Erro ao desconectar instância:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }
);

// Obter status da instância na Evolution API
router.get(
  "/instances/:id/status",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const instance = await Instance.findById(req.params.id);

      if (!instance) {
        return res.status(404).json({
          success: false,
          message: "Instância não encontrada",
        });
      }

      const config = await EvolutionConfig.findById(
        instance.evolution_config_id
      );
      if (!config || !config.is_active) {
        return res.status(400).json({
          success: false,
          message: "Configuração Evolution API não encontrada ou inativa",
        });
      }

      const evolutionService = new EvolutionService(
        config.server_url,
        config.api_key
      );
      const result = await evolutionService.getInstanceStatus(
        instance.instance_id
      );

      res.json({
        success: result.success,
        data: result.data,
        error: result.error,
      });
    } catch (error) {
      console.error("Erro ao obter status da instância:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }
);

// Reiniciar instância
router.post(
  "/instances/:id/restart",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const instance = await Instance.findById(req.params.id);

      if (!instance) {
        return res.status(404).json({
          success: false,
          message: "Instância não encontrada",
        });
      }

      const config = await EvolutionConfig.findById(
        instance.evolution_config_id
      );
      if (!config || !config.is_active) {
        return res.status(400).json({
          success: false,
          message: "Configuração Evolution API não encontrada ou inativa",
        });
      }

      const evolutionService = new EvolutionService(
        config.server_url,
        config.api_key
      );
      const result = await evolutionService.restartInstance(
        instance.instance_id
      );

      res.json({
        success: result.success,
        message: result.success
          ? "Instância reiniciada com sucesso"
          : "Falha ao reiniciar instância",
        data: result.data,
        error: result.error,
      });
    } catch (error) {
      console.error("Erro ao reiniciar instância:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }
);

// ===== PERFIS DE CONTATOS =====

// Atualizar perfis de contatos em lote
router.post(
  "/contacts/update-profiles",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { contacts } = req.body;

      if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            "Lista de contatos é obrigatória e deve ser um array não vazio",
        });
      }

      // Validar estrutura dos contatos
      for (const contact of contacts) {
        if (!contact.phone || !contact.instanceName) {
          return res.status(400).json({
            success: false,
            message: "Cada contato deve ter 'phone' e 'instanceName'",
          });
        }
      }

      console.log(
        `🔄 Iniciando atualização em lote de ${contacts.length} perfis de contatos...`
      );

      const results = await ContactProfileService.updateMultipleContactProfiles(
        contacts
      );

      const successCount = results.filter((r) => r.success && r.updated).length;
      const errorCount = results.filter((r) => !r.success).length;

      console.log(
        `✅ Atualização em lote concluída: ${successCount} sucessos, ${errorCount} erros`
      );

      res.json({
        success: true,
        message: `Atualização concluída: ${successCount} perfis atualizados, ${errorCount} erros`,
        data: {
          total: contacts.length,
          updated: successCount,
          errors: errorCount,
          results: results,
        },
      });
    } catch (error) {
      console.error("Erro ao atualizar perfis em lote:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
        error: error.message,
      });
    }
  }
);

module.exports = router;
