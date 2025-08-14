const Message = require('../models/Message');

// Get all conversations
exports.getConversations = async (req, res) => {
  try {
    const conv = await Message.aggregate([
      { $sort: { createdAt: -1 } },
      { $group: {
        _id: "$wa_id",
        lastMessage: { $first: "$text" },
        lastAt: { $first: "$timestamp" },
        count: { $sum: 1 }
      } }
    ]);
    res.json(conv);
  } catch (e) {
    console.error(e);
    res.status(500).send('Server error');
  }
};

// Get messages for a specific WhatsApp ID
exports.getMessagesForWaId = async (req, res) => {
  try {
    const wa_id = req.params.wa_id;
    const msgs = await Message.find({ wa_id }).sort({ timestamp: 1 });
    res.json(msgs);
  } catch (e) {
    console.error(e);
    res.status(500).send('Server error');
  }
};

// Send a demo message (local testing)
exports.sendMessageDemo = async (req, res) => {
  try {
    const io = req.app.get('io');
    const { wa_id, from, to, text } = req.body;
    const msg = new Message({
      msg_id: `local_${Date.now()}`,
      wa_id,
      from,
      to,
      text,
      type: 'text',
      timestamp: new Date(),
      status: 'sent',
      raw: req.body
    });
    await msg.save();
    if (io) io.emit('newmessage', msg);
    res.json(msg);
  } catch (e) {
    console.error(e);
    res.status(500).send('Server error');
  }
};
