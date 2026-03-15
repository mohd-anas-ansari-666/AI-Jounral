const mongoose = require("mongoose");

const journalEntrySchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    ambience: {
      type: String,
      required: true,
      enum: ["forest", "ocean", "mountain", "desert", "meadow", "rain", "other"],
      lowercase: true,
    },
    text: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 5000,
    },
    // LLM analysis results — stored alongside entry after analyze call
    analysis: {
      emotion: { type: String, default: null },
      keywords: { type: [String], default: [] },
      summary: { type: String, default: null },
      analyzedAt: { type: Date, default: null },
    },
    // Cache key: SHA-256 hash of text (used to avoid re-analyzing identical text)
    textHash: {
      type: String,
      index: true,
      default: null,
    },
  },
  {
    timestamps: true, // adds createdAt + updatedAt
  }
);

// Compound index for fast per-user queries sorted by date
journalEntrySchema.index({ userId: 1, createdAt: -1 });

// Index for analytics aggregation
journalEntrySchema.index({ userId: 1, "analysis.emotion": 1 });
journalEntrySchema.index({ userId: 1, ambience: 1 });

module.exports = mongoose.model("JournalEntry", journalEntrySchema);
