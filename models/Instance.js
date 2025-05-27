const pool = require("../config/database");

class Instance {
  static async create(instanceData) {
    const { name, instance_id, evolution_config_id } = instanceData;

    const query = `
      INSERT INTO instances (name, instance_id, evolution_config_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await pool.query(query, [
      name,
      instance_id,
      evolution_config_id,
    ]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT i.*, ec.name as config_name, ec.server_url, ec.api_key
      FROM instances i
      LEFT JOIN evolution_configs ec ON i.evolution_config_id = ec.id
      WHERE i.id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findByInstanceId(instanceId) {
    const query = `
      SELECT i.*, ec.name as config_name, ec.server_url, ec.api_key
      FROM instances i
      LEFT JOIN evolution_configs ec ON i.evolution_config_id = ec.id
      WHERE i.instance_id = $1
    `;

    const result = await pool.query(query, [instanceId]);
    return result.rows[0];
  }

  static async findAll() {
    const query = `
      SELECT i.*, 
             ec.name as config_name, ec.server_url,
             COUNT(DISTINCT conv.id) as total_conversations,
             COUNT(DISTINCT CASE WHEN conv.status = 'active' THEN conv.id END) as active_conversations
      FROM instances i
      LEFT JOIN evolution_configs ec ON i.evolution_config_id = ec.id
      LEFT JOIN conversations conv ON i.id = conv.instance_id
      GROUP BY i.id, ec.name, ec.server_url
      ORDER BY i.created_at DESC
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  static async findByConfig(configId) {
    const query = `
      SELECT i.*,
             COUNT(DISTINCT conv.id) as total_conversations,
             COUNT(DISTINCT CASE WHEN conv.status = 'active' THEN conv.id END) as active_conversations
      FROM instances i
      LEFT JOIN conversations conv ON i.id = conv.instance_id
      WHERE i.evolution_config_id = $1
      GROUP BY i.id
      ORDER BY i.created_at DESC
    `;

    const result = await pool.query(query, [configId]);
    return result.rows;
  }

  static async findActive() {
    const query = `
      SELECT i.*, ec.name as config_name, ec.server_url, ec.api_key
      FROM instances i
      INNER JOIN evolution_configs ec ON i.evolution_config_id = ec.id
      WHERE i.is_active = true AND ec.is_active = true
      ORDER BY i.created_at DESC
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  static async update(id, instanceData) {
    const { name, instance_id, evolution_config_id, is_active } = instanceData;

    const query = `
      UPDATE instances 
      SET name = $1, instance_id = $2, evolution_config_id = $3, is_active = $4
      WHERE id = $5
      RETURNING *
    `;

    const result = await pool.query(query, [
      name,
      instance_id,
      evolution_config_id,
      is_active,
      id,
    ]);
    return result.rows[0];
  }

  static async toggleActive(id) {
    const query = `
      UPDATE instances 
      SET is_active = NOT is_active
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async delete(id) {
    // Primeiro verificar se há conversas associadas
    const checkQuery =
      "SELECT COUNT(*) as count FROM conversations WHERE instance_id = $1";
    const checkResult = await pool.query(checkQuery, [id]);

    if (parseInt(checkResult.rows[0].count) > 0) {
      throw new Error(
        "Não é possível excluir uma instância que possui conversas associadas"
      );
    }

    const query = "DELETE FROM instances WHERE id = $1";
    await pool.query(query, [id]);
  }

  static async getStats(instanceId) {
    const query = `
      SELECT 
        COUNT(DISTINCT conv.id) as total_conversations,
        COUNT(DISTINCT CASE WHEN conv.status = 'waiting' THEN conv.id END) as waiting_conversations,
        COUNT(DISTINCT CASE WHEN conv.status = 'active' THEN conv.id END) as active_conversations,
        COUNT(DISTINCT CASE WHEN conv.status = 'closed' THEN conv.id END) as closed_conversations,
        COUNT(DISTINCT cont.id) as total_contacts,
        COUNT(m.id) as total_messages,
        COUNT(CASE WHEN m.is_from_me = true THEN 1 END) as sent_messages,
        COUNT(CASE WHEN m.is_from_me = false THEN 1 END) as received_messages
      FROM instances i
      LEFT JOIN conversations conv ON i.id = conv.instance_id
      LEFT JOIN contacts cont ON conv.contact_id = cont.id
      LEFT JOIN messages m ON conv.id = m.conversation_id
      WHERE i.id = $1
      GROUP BY i.id
    `;

    const result = await pool.query(query, [instanceId]);
    return (
      result.rows[0] || {
        total_conversations: 0,
        waiting_conversations: 0,
        active_conversations: 0,
        closed_conversations: 0,
        total_contacts: 0,
        total_messages: 0,
        sent_messages: 0,
        received_messages: 0,
      }
    );
  }

  static async getConversations(instanceId, filters = {}) {
    let query = `
      SELECT conv.*, 
             cont.name as contact_name, cont.phone as contact_phone,
             u.name as assigned_user_name,
             (SELECT content FROM messages WHERE conversation_id = conv.id ORDER BY created_at DESC LIMIT 1) as last_message
      FROM conversations conv
      LEFT JOIN contacts cont ON conv.contact_id = cont.id
      LEFT JOIN users u ON conv.assigned_user_id = u.id
      WHERE conv.instance_id = $1
    `;

    const params = [instanceId];
    let paramCount = 1;

    if (filters.status) {
      paramCount++;
      query += ` AND conv.status = $${paramCount}`;
      params.push(filters.status);
    }

    query += ` ORDER BY conv.last_message_at DESC`;

    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async checkDuplicate(instanceId, configId, excludeId = null) {
    let query = `
      SELECT COUNT(*) as count 
      FROM instances 
      WHERE instance_id = $1 AND evolution_config_id = $2
    `;

    const params = [instanceId, configId];

    if (excludeId) {
      query += ` AND id != $3`;
      params.push(excludeId);
    }

    const result = await pool.query(query, params);
    return parseInt(result.rows[0].count) > 0;
  }
}

module.exports = Instance;
