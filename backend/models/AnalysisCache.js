const mongoose = require("mongoose");

/**
 * AnalysisCache stores LLM results keyed by SHA-256 hash of input text.
 * This prevents re-calling Gemini for identical or previously-seen text,
 * dramatically reducing API costs at scale.
 */
const analysisCacheSchema = new mongoose.Schema(
  {
    textHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    emotion: { type: String, required: true },
    keywords: { type: [String], required: true },
    summary: { type: String, required: true },
    // TTL index: cache entries auto-expire after 30 days
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      index: { expireAfterSeconds: 0 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AnalysisCache", analysisCacheSchema);
