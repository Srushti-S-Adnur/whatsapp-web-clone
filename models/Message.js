const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  msg_id: { type: String, index: true },
  meta_msg_id: { type: String, index: true },
  wa_id: String,       // WhatsApp user ID
  from: String,        // Sender
  to: String,          // Receiver
  text: String,        // Message text
  type: String,        // Message type (text, image, etc.)
  timestamp: { type: Date, default: Date.now },  // When it was sent
  status: { 
    type: String, 
    enum: ['sent', 'delivered', 'read', 'unknown'], 
    default: 'sent' 
  },
  unread: { type: Boolean, default: true },
  raw: mongoose.Schema.Types.Mixed // Original payload
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);
