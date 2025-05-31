const express = require("express");
const User = require("../models/User");
const EvolutionConfig = require("../models/EvolutionConfig");
const Instance = require("../models/Instance");
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
    const { name, email, role, avatar_url } = req.body;

    const user = await User.update(req.params.id, {
      name,
      email,
      role,
      avatar_url,
    });

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

// Testar conexão
router.post(
  "/evolution-configs/:id/test",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const result = await EvolutionConfig.testConnection(req.params.id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Erro ao testar conexão:", error);
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
router.get(
  "/instances",
  authMiddleware,
  supervisorMiddleware,
  async (req, res) => {
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

    const instance = await Instance.create({
      name,
      instance_id,
      evolution_config_id,
    });

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
      const instance = await Instance.toggleActive(req.params.id);

      if (!instance) {
        return res.status(404).json({
          success: false,
          message: "Instância não encontrada",
        });
      }

      res.json({
        success: true,
        message: `Instância ${
          instance.is_active ? "ativada" : "desativada"
        } com sucesso`,
        data: instance,
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
