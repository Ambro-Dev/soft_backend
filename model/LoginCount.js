const mongoose = require("mongoose");

const loginCountSchema = new mongoose.Schema({
  date: { type: Date, unique: true },
  count: { type: Number, default: 0 },
});
const LoginCount = mongoose.model("LoginCount", loginCountSchema);

module.exports = LoginCount;
