const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const resultSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    json: {
      type: Object,
      default: {
        logoPosition: "right",
        completedHtml: {
          pl: "<h3>Twój wynik to {totalScore} z {maxScore} punktów</h3>",
          en: "<h3>Your score is {totalScore} of {maxScore} points</h3>",
        },
        completedHtmlOnCondition: [{}],
        showTitle: false,
        maxTimeToFinish: 3600,
        showTimerPanel: "top",
        showTimerPanelMode: "survey",
      },
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const examSchema = new Schema(
  {
    title: {
      type: String,
    },
    json: {
      type: Object,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
    },
    results: [resultSchema],
    createdAt: { type: Date, default: Date.now() },
  },
  { timestamps: true }
);

const Exam = mongoose.model("Exam", examSchema);

module.exports = Exam;
