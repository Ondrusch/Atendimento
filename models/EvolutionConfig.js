const pool = require("../config/database");

class EvolutionConfig {
  static async create(configData) {
    const { name, server_url, api_key, webhook_url = null } = configData;

    const query = `
      INSERT INTO evolution_configs (name, server_url, api_key, webhook_url)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await pool.query(query, [
      name,
      server_url,
      api_key,
      webhook_url,
    ]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = "SELECT * FROM evolution_configs WHERE id = $1";
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findAll() {
    const query = `
      SELECT ec.*, 
             COUNT(i.id) as total_instances,
             COUNT(CASE WHEN i.is_active = true THEN 1 END) as active_instances
      FROM evolution_configs ec
      LEFT JOIN instances i ON ec.id = i.evolution_config_id
      GROUP BY ec.id
      ORDER BY ec.created_at DESC
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  static async findActive() {
    const query =
      "SELECT * FROM evolution_configs WHERE is_active = true ORDER BY created_at DESC";
    const result = await pool.query(query);
    return result.rows;
  }

  static async update(id, configData) {
    const { name, server_url, api_key, webhook_url, is_active } = configData;

    const query = `
      UPDATE evolution_configs 
      SET name = $1, server_url = $2, api_key = $3, webhook_url = $4, is_active = $5
      WHERE id = $6
      RETURNING *
    `;

    const result = await pool.query(query, [
      name,
      server_url,
      api_key,
      webhook_url,
      is_active,
      id,
    ]);
    return result.rows[0];
  }

  static async toggleActive(id) {
    const query = `
      UPDATE evolution_configs 
      SET is_active = NOT is_active
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async delete(id) {
    // Primeiro verificar se há instâncias associadas
    const checkQuery =
      "SELECT COUNT(*) as count FROM instances WHERE evolution_config_id = $1";
    const checkResult = await pool.query(checkQuery, [id]);

    if (parseInt(checkResult.rows[0].count) > 0) {
      throw new Error(
        "Não é possível excluir uma configuração que possui instâncias associadas"
      );
    }

    const query = "DELETE FROM evolution_configs WHERE id = $1";
    await pool.query(query, [id]);
  }

  static async getWithInstances(id) {
    const query = `
      SELECT ec.*,
             json_agg(
               json_build_object(
                 'id', i.id,
                 'name', i.name,
                 'instance_id', i.instance_id,
                 'is_active', i.is_active,
                 'created_at', i.created_at
               ) ORDER BY i.created_at DESC
             ) FILTER (WHERE i.id IS NOT NULL) as instances
      FROM evolution_configs ec
      LEFT JOIN instances i ON ec.id = i.evolution_config_id
      WHERE ec.id = $1
      GROUP BY ec.id
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async testConnection(configId) {
    const config = await this.findById(configId);
    if (!config) {
      throw new Error("Configuração não encontrada");
    }

    // Aqui você pode implementar um teste real de conexão com a Evolution API
    // Por exemplo, fazer uma requisição para verificar se a API está respondendo
    try {
      const axios = require("axios");
      const response = await axios.get(
        `${config.server_url}/instance/fetchInstances`,
        {
          headers: {
            apikey: config.api_key,
          },
          timeout: 10000,
        }
      );

      return {
        success: true,
        message: "Conexão estabelecida com sucesso",
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        message: "Falha na conexão: " + error.message,
        error: error.response?.data || error.message,
      };
    }
  }

  static async getStats(configId) {
    const query = `
      SELECT 
        COUNT(DISTINCT i.id) as total_instances,
        COUNT(DISTINCT CASE WHEN i.is_active = true THEN i.id END) as active_instances,
        COUNT(DISTINCT conv.id) as total_conversations,
        COUNT(DISTINCT CASE WHEN conv.status = 'active' THEN conv.id END) as active_conversations,
        COUNT(m.id) as total_messages
      FROM evolution_configs ec
      LEFT JOIN instances i ON ec.id = i.evolution_config_id
      LEFT JOIN conversations conv ON i.id = conv.instance_id
      LEFT JOIN messages m ON conv.id = m.conversation_id
      WHERE ec.id = $1
      GROUP BY ec.id
    `;

    const result = await pool.query(query, [configId]);
    return (
      result.rows[0] || {
        total_instances: 0,
        active_instances: 0,
        total_conversations: 0,
        active_conversations: 0,
        total_messages: 0,
      }
    );
  }
}

module.exports = EvolutionConfig;
