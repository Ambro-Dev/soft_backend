const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: {type: String},
  createdAt: { type: Date, default: Date.now() }
});

const conversationSchema = new mongoose.Schema({
  name: {type: String},
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  messages: [messageSchema],
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
