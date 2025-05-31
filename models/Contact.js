const pool = require("../config/database");

class Contact {
  static async create(contactData) {
    const { phone, name = null, avatar_url = null } = contactData;

    const query = `
      INSERT INTO contacts (phone, name, avatar_url, last_seen)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (phone) 
      DO UPDATE SET 
        name = COALESCE(EXCLUDED.name, contacts.name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, contacts.avatar_url),
        last_seen = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await pool.query(query, [phone, name, avatar_url]);
    return result.rows[0];
  }

  static async findByPhone(phone) {
    const query = "SELECT * FROM contacts WHERE phone = $1";
    const result = await pool.query(query, [phone]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = "SELECT * FROM contacts WHERE id = $1";
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findAll(limit = 50, offset = 0) {
    const query = `
      SELECT c.*, 
             COUNT(conv.id) as total_conversations,
             MAX(conv.last_message_at) as last_conversation_at
      FROM contacts c
      LEFT JOIN conversations conv ON c.id = conv.contact_id
      GROUP BY c.id
      ORDER BY last_conversation_at DESC NULLS LAST, c.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await pool.query(query, [limit, offset]);
    return result.rows;
  }

  static async update(id, contactData) {
    const { name, avatar_url } = contactData;

    const query = `
      UPDATE contacts 
      SET name = $1, avatar_url = $2, last_seen = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;

    const result = await pool.query(query, [name, avatar_url, id]);
    return result.rows[0];
  }

  static async updateProfile(phone, profileData) {
    const { pushname, profilePicUrl } = profileData;

    const query = `
      UPDATE contacts 
      SET name = COALESCE($1, name), 
          avatar_url = COALESCE($2, avatar_url),
          last_seen = CURRENT_TIMESTAMP
      WHERE phone = $3
      RETURNING *
    `;

    const result = await pool.query(query, [pushname, profilePicUrl, phone]);
    return result.rows[0];
  }

  static async updateLastSeen(phone) {
    const query = `
      UPDATE contacts 
      SET last_seen = CURRENT_TIMESTAMP
      WHERE phone = $1
      RETURNING *
    `;

    const result = await pool.query(query, [phone]);
    return result.rows[0];
  }

  static async search(searchTerm, limit = 20) {
    const query = `
      SELECT * FROM contacts 
      WHERE name ILIKE $1 OR phone ILIKE $1
      ORDER BY name ASC, phone ASC
      LIMIT $2
    `;

    const result = await pool.query(query, [`%${searchTerm}%`, limit]);
    return result.rows;
  }

  static async getContactStats(contactId) {
    const query = `
      SELECT 
        COUNT(DISTINCT conv.id) as total_conversations,
        COUNT(m.id) as total_messages,
        COUNT(CASE WHEN m.is_from_me = false THEN 1 END) as received_messages,
        COUNT(CASE WHEN m.is_from_me = true THEN 1 END) as sent_messages,
        MIN(conv.created_at) as first_contact,
        MAX(conv.last_message_at) as last_contact
      FROM contacts c
      LEFT JOIN conversations conv ON c.id = conv.contact_id
      LEFT JOIN messages m ON conv.id = m.conversation_id
      WHERE c.id = $1
      GROUP BY c.id
    `;

    const result = await pool.query(query, [contactId]);
    return result.rows[0];
  }

  static async getRecentContacts(limit = 10) {
    const query = `
      SELECT c.*, MAX(conv.last_message_at) as last_interaction
      FROM contacts c
      INNER JOIN conversations conv ON c.id = conv.contact_id
      GROUP BY c.id
      ORDER BY last_interaction DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  static async delete(id) {
    const query = "DELETE FROM contacts WHERE id = $1";
    await pool.query(query, [id]);
  }

  static async getContactWithConversations(contactId) {
    const query = `
      SELECT c.*,
             json_agg(
               json_build_object(
                 'id', conv.id,
                 'status', conv.status,
                 'created_at', conv.created_at,
                 'last_message_at', conv.last_message_at,
                 'assigned_user_name', u.name
               ) ORDER BY conv.last_message_at DESC
             ) FILTER (WHERE conv.id IS NOT NULL) as conversations
      FROM contacts c
      LEFT JOIN conversations conv ON c.id = conv.contact_id
      LEFT JOIN users u ON conv.assigned_user_id = u.id
      WHERE c.id = $1
      GROUP BY c.id
    `;

    const result = await pool.query(query, [contactId]);
    return result.rows[0];
  }
}

module.exports = Contact;
