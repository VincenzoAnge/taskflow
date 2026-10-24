const Message = require('../models/Message');

// Ultimi 50 messaggi della chat, dal più vecchio al più recente
async function getMessages(req, res) {
  const messages = await Message.find({ project: req.project._id })
    .populate('user', 'name')
    .sort({ createdAt: -1 })
    .limit(50);

  res.json({ success: true, data: messages.reverse() });
}

module.exports = { getMessages };
