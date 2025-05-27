const pool = require("../config/database");

class Conversation {
  static async create(conversationData) {
    const {
      contact_id,
      instance_id,
      assigned_user_id = null,
      status = "waiting",
    } = conversationData;

    const query = `
      INSERT INTO conversations (contact_id, instance_id, assigned_user_id, status, last_message_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const result = await pool.query(query, [
      contact_id,
      instance_id,
      assigned_user_id,
      status,
    ]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT c.*, 
             cont.name as contact_name, cont.phone as contact_phone, cont.avatar_url as contact_avatar,
             u.name as assigned_user_name, u.email as assigned_user_email,
             i.name as instance_name, i.instance_id
      FROM conversations c
      LEFT JOIN contacts cont ON c.contact_id = cont.id
      LEFT JOIN users u ON c.assigned_user_id = u.id
      LEFT JOIN instances i ON c.instance_id = i.id
      WHERE c.id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findByContactAndInstance(contactId, instanceId) {
    const query = `
      SELECT * FROM conversations 
      WHERE contact_id = $1 AND instance_id = $2 AND status != 'closed'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [contactId, instanceId]);
    return result.rows[0];
  }

  static async findAll(filters = {}) {
    let query = `
      SELECT c.*, 
             cont.name as contact_name, cont.phone as contact_phone, cont.avatar_url as contact_avatar,
             u.name as assigned_user_name, u.email as assigned_user_email,
             i.name as instance_name, i.instance_id,
             (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
      FROM conversations c
      LEFT JOIN contacts cont ON c.contact_id = cont.id
      LEFT JOIN users u ON c.assigned_user_id = u.id
      LEFT JOIN instances i ON c.instance_id = i.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 0;

    if (filters.status) {
      paramCount++;
      query += ` AND c.status = $${paramCount}`;
      params.push(filters.status);
    }

    if (filters.assigned_user_id) {
      paramCount++;
      query += ` AND c.assigned_user_id = $${paramCount}`;
      params.push(filters.assigned_user_id);
    }

    if (filters.unassigned) {
      query += ` AND c.assigned_user_id IS NULL`;
    }

    query += ` ORDER BY c.last_message_at DESC`;

    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async assignToUser(conversationId, userId) {
    const query = `
      UPDATE conversations 
      SET assigned_user_id = $1, status = 'active'
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [userId, conversationId]);
    return result.rows[0];
  }

  static async transfer(conversationId, fromUserId, toUserId, reason = null) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Atualizar a conversa
      const updateQuery = `
        UPDATE conversations 
        SET assigned_user_id = $1
        WHERE id = $2
        RETURNING *
      `;

      const conversationResult = await client.query(updateQuery, [
        toUserId,
        conversationId,
      ]);

      // Registrar a transferência
      const transferQuery = `
        INSERT INTO conversation_transfers (conversation_id, from_user_id, to_user_id, reason)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;

      const transferResult = await client.query(transferQuery, [
        conversationId,
        fromUserId,
        toUserId,
        reason,
      ]);

      await client.query("COMMIT");

      return {
        conversation: conversationResult.rows[0],
        transfer: transferResult.rows[0],
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async close(conversationId) {
    const query = `
      UPDATE conversations 
      SET status = 'closed'
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [conversationId]);
    return result.rows[0];
  }

  static async updateLastMessage(conversationId) {
    const query = `
      UPDATE conversations 
      SET last_message_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await pool.query(query, [conversationId]);
  }

  static async addNote(conversationId, userId, note) {
    const query = `
      INSERT INTO conversation_notes (conversation_id, user_id, note)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await pool.query(query, [conversationId, userId, note]);
    return result.rows[0];
  }

  static async getNotes(conversationId) {
    const query = `
      SELECT cn.*, u.name as user_name
      FROM conversation_notes cn
      LEFT JOIN users u ON cn.user_id = u.id
      WHERE cn.conversation_id = $1
      ORDER BY cn.created_at DESC
    `;

    const result = await pool.query(query, [conversationId]);
    return result.rows;
  }

  static async getTransferHistory(conversationId) {
    const query = `
      SELECT ct.*, 
             uf.name as from_user_name,
             ut.name as to_user_name
      FROM conversation_transfers ct
      LEFT JOIN users uf ON ct.from_user_id = uf.id
      LEFT JOIN users ut ON ct.to_user_id = ut.id
      WHERE ct.conversation_id = $1
      ORDER BY ct.created_at DESC
    `;

    const result = await pool.query(query, [conversationId]);
    return result.rows;
  }
}

module.exports = Conversation;
