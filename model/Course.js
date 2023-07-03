const mongoose = require("mongoose");
const availableImages = require("../config/availableImages");

const eventSchema = new mongoose.Schema(
  {
    title: { type: String },
    description: { type: String },
    start: {
      type: Date,
    },
    end: {
      type: Date,
    },
    inCall: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdAt: { type: Date, default: Date.now },
    url: { type: String },
    className: { type: String, default: "success" },
  },
  { timestamps: true }
);

const courseSchema = new mongoose.Schema({
  name: {
    type: "string",
    required: true,
  },
  description: {
    type: "string",
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  pic: {
    type: "string",
    default:
      availableImages[Math.floor(Math.random() * availableImages.length)],
  },
  events: [eventSchema],
  files: [
    {
      type: mongoose.Schema.Types.ObjectId,
    },
  ],
});

const Course = mongoose.model("Course", courseSchema);

module.exports = Course;
