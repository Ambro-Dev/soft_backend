const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    name: {
      type: String,
      require: true,
    },
    surname: {
      type: String,
    },
    studentNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    roles: {
      User: {
        type: Number,
        default: 2001,
      },
      Student: Number,
      Teacher: Number,
      Admin: Number,
      Blocked: Number,
    },
    password: {
      type: String,
      required: true,
    },
    socket: {
      type: String,
    },
    picture: {
      type: String,
      default: "796b0db7fe9f9f149e77a3cacc5e42e3.png",
    },
    resetToken: String,
    refreshToken: String,
    resetTokenExpiresAt: Date,
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
