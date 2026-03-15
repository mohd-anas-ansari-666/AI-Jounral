const express = require("express");
const router = express.Router();
const JournalEntry = require("../models/JournalEntry");
const { analyzeText, hashText } = require("../services/geminiService");

// ─────────────────────────────────────────────
// POST /api/journal
// Create a new journal entry
// ─────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { userId, ambience, text } = req.body;

    if (!userId || !ambience || !text) {
      return res.status(400).json({
        error: "Missing required fields: userId, ambience, text",
      });
    }

    if (text.trim().length < 5) {
      return res.status(400).json({ error: "Journal text too short (min 5 characters)" });
    }

    const entry = await JournalEntry.create({
      userId: userId.trim(),
      ambience: ambience.trim().toLowerCase(),
      text: text.trim(),
      textHash: hashText(text),
    });

    res.status(201).json({
      success: true,
      message: "Journal entry created successfully",
      entry: {
        id: entry._id,
        userId: entry.userId,
        ambience: entry.ambience,
        text: entry.text,
        analysis: entry.analysis,
        createdAt: entry.createdAt,
      },
    });
  } catch (err) {
    console.error("[POST /api/journal]", err.message);
    res.status(500).json({ error: "Failed to create journal entry" });
  }
});

// ─────────────────────────────────────────────
// GET /api/journal/insights/:userId
// NOTE: Must be declared BEFORE /:userId to avoid route conflict
// Return aggregate insights for a user
// ─────────────────────────────────────────────
router.get("/insights/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const entries = await JournalEntry.find({ userId }).lean();

    if (entries.length === 0) {
      return res.json({
        totalEntries: 0,
        topEmotion: null,
        mostUsedAmbience: null,
        recentKeywords: [],
        message: "No journal entries found for this user.",
      });
    }

    const totalEntries = entries.length;

    // Top emotion (from analyzed entries)
    const emotionCount = {};
    entries.forEach((e) => {
      if (e.analysis?.emotion) {
        emotionCount[e.analysis.emotion] = (emotionCount[e.analysis.emotion] || 0) + 1;
      }
    });
    const topEmotion =
      Object.keys(emotionCount).length > 0
        ? Object.entries(emotionCount).sort((a, b) => b[1] - a[1])[0][0]
        : null;

    // Most used ambience
    const ambienceCount = {};
    entries.forEach((e) => {
      ambienceCount[e.ambience] = (ambienceCount[e.ambience] || 0) + 1;
    });
    const mostUsedAmbience =
      Object.entries(ambienceCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Recent keywords — from the 10 most recent analyzed entries
    const recentEntries = entries
      .filter((e) => e.analysis?.keywords?.length > 0)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    const keywordFreq = {};
    recentEntries.forEach((e) => {
      e.analysis.keywords.forEach((kw) => {
        keywordFreq[kw] = (keywordFreq[kw] || 0) + 1;
      });
    });
    const recentKeywords = Object.entries(keywordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([kw]) => kw);

    // Emotion trend over time (last 7 analyzed entries)
    const emotionTimeline = entries
      .filter((e) => e.analysis?.emotion)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 7)
      .map((e) => ({
        date: e.createdAt,
        emotion: e.analysis.emotion,
        ambience: e.ambience,
      }));

    res.json({
      totalEntries,
      topEmotion,
      mostUsedAmbience,
      recentKeywords,
      emotionTimeline,
      analyzedEntries: entries.filter((e) => e.analysis?.emotion).length,
    });
  } catch (err) {
    console.error("[GET /api/journal/insights/:userId]", err.message);
    res.status(500).json({ error: "Failed to fetch insights" });
  }
});

// ─────────────────────────────────────────────
// POST /api/journal/analyze
// Analyze text with Gemini LLM (with caching)
// ─────────────────────────────────────────────
router.post("/analyze", async (req, res) => {
  try {
    const { text, entryId } = req.body;

    if (!text || text.trim().length < 5) {
      return res.status(400).json({ error: "Text is required (min 5 characters)" });
    }

    const result = await analyzeText(text.trim());

    // If an entryId is provided, persist the analysis back to the entry
    if (entryId) {
      await JournalEntry.findByIdAndUpdate(entryId, {
        "analysis.emotion": result.emotion,
        "analysis.keywords": result.keywords,
        "analysis.summary": result.summary,
        "analysis.analyzedAt": new Date(),
      });
    }

    res.json({
      emotion: result.emotion,
      keywords: result.keywords,
      summary: result.summary,
      cached: result.cached,
    });
  } catch (err) {
    console.error("[POST /api/journal/analyze]", err.message);

    if (err.message.includes("GEMINI_API_KEY")) {
      return res.status(500).json({
        error: "LLM service not configured. Please set GEMINI_API_KEY.",
      });
    }

    res.status(500).json({ error: "Emotion analysis failed. Please try again." });
  }
});

// ─────────────────────────────────────────────
// GET /api/journal/:userId
// Get all journal entries for a user
// ─────────────────────────────────────────────
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      JournalEntry.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      JournalEntry.countDocuments({ userId }),
    ]);

    res.json({
      success: true,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      entries: entries.map((e) => ({
        id: e._id,
        userId: e.userId,
        ambience: e.ambience,
        text: e.text,
        analysis: e.analysis,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      })),
    });
  } catch (err) {
    console.error("[GET /api/journal/:userId]", err.message);
    res.status(500).json({ error: "Failed to fetch journal entries" });
  }
});

module.exports = router;
