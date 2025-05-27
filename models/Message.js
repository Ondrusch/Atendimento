const pool = require("../config/database");

class Message {
  static async create(messageData) {
    const {
      conversation_id,
      message_id,
      sender_type,
      sender_id = null,
      content,
      message_type,
      media_url = null,
      media_base64 = null,
      media_mimetype = null,
      media_filename = null,
      latitude = null,
      longitude = null,
      location_name = null,
      location_address = null,
      is_from_me = false,
      status = "sent",
      timestamp,
    } = messageData;

    const query = `
      INSERT INTO messages (
        conversation_id, message_id, sender_type, sender_id, content, message_type,
        media_url, media_base64, media_mimetype, media_filename,
        latitude, longitude, location_name, location_address,
        is_from_me, status, timestamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;

    const result = await pool.query(query, [
      conversation_id,
      message_id,
      sender_type,
      sender_id,
      content,
      message_type,
      media_url,
      media_base64,
      media_mimetype,
      media_filename,
      latitude,
      longitude,
      location_name,
      location_address,
      is_from_me,
      status,
      timestamp,
    ]);

    return result.rows[0];
  }

  static async findByConversation(conversationId, limit = 50, offset = 0) {
    const query = `
      SELECT m.*, u.name as sender_name
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = $1
      ORDER BY m.timestamp ASC, m.created_at ASC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [conversationId, limit, offset]);
    return result.rows;
  }

  static async findById(id) {
    const query = `
      SELECT m.*, u.name as sender_name
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findByMessageId(messageId) {
    const query = "SELECT * FROM messages WHERE message_id = $1";
    const result = await pool.query(query, [messageId]);
    return result.rows[0];
  }

  static async updateStatus(messageId, status) {
    const query = `
      UPDATE messages 
      SET status = $1
      WHERE message_id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [status, messageId]);
    return result.rows[0];
  }

  static async getLastMessage(conversationId) {
    const query = `
      SELECT * FROM messages 
      WHERE conversation_id = $1
      ORDER BY timestamp DESC, created_at DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [conversationId]);
    return result.rows[0];
  }

  static async getUnreadCount(conversationId) {
    const query = `
      SELECT COUNT(*) as count
      FROM messages 
      WHERE conversation_id = $1 AND status != 'read' AND is_from_me = false
    `;

    const result = await pool.query(query, [conversationId]);
    return parseInt(result.rows[0].count);
  }

  static async markAsRead(conversationId) {
    const query = `
      UPDATE messages 
      SET status = 'read'
      WHERE conversation_id = $1 AND is_from_me = false AND status != 'read'
    `;

    await pool.query(query, [conversationId]);
  }

  static async getMediaMessages(conversationId, mediaType = null) {
    let query = `
      SELECT * FROM messages 
      WHERE conversation_id = $1 AND message_type != 'text'
    `;

    const params = [conversationId];

    if (mediaType) {
      query += ` AND message_type = $2`;
      params.push(mediaType);
    }

    query += ` ORDER BY timestamp DESC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async searchMessages(conversationId, searchTerm) {
    const query = `
      SELECT m.*, u.name as sender_name
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = $1 AND m.content ILIKE $2
      ORDER BY m.timestamp DESC
      LIMIT 50
    `;

    const result = await pool.query(query, [conversationId, `%${searchTerm}%`]);
    return result.rows;
  }

  static async delete(id) {
    const query = "DELETE FROM messages WHERE id = $1";
    await pool.query(query, [id]);
  }

  static async getMessageStats(conversationId) {
    const query = `
      SELECT 
        COUNT(*) as total_messages,
        COUNT(CASE WHEN is_from_me = true THEN 1 END) as sent_messages,
        COUNT(CASE WHEN is_from_me = false THEN 1 END) as received_messages,
        COUNT(CASE WHEN message_type != 'text' THEN 1 END) as media_messages
      FROM messages 
      WHERE conversation_id = $1
    `;

    const result = await pool.query(query, [conversationId]);
    return result.rows[0];
  }
}

module.exports = Message;
