const Conversation = require("../model/Conversation");
const User = require("../model/User");

// Create a new conversation
const createConversation = async (req, res) => {
  try {
    const { name, members } = req.body;

    const conversation = await Conversation.create({ name, members });
    await conversation.save();

    res.json(conversation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get conversations for a user
const getUserConversation = async (req, res) => {
  try {
    const { userId } = req.params;

    const conversations = await Conversation.find({ members: req.params.id })
      .populate("members", "_id name surname picture")
      .exec();

    res.json(conversations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getAllConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find();

    res.json(conversations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};


module.exports = {
  getUserConversation,
  createConversation,
  getAllConversations,
};
