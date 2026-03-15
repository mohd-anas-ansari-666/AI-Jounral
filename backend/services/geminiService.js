const { GoogleGenerativeAI } = require("@google/generative-ai");
const crypto = require("crypto");
const AnalysisCache = require("../models/AnalysisCache");

let genAI = null;

function getGeminiClient() {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set in environment variables.");
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

/**
 * Compute SHA-256 hash of text (used as cache key).
 */
function hashText(text) {
  return crypto.createHash("sha256").update(text.trim().toLowerCase()).digest("hex");
}

/**
 * Strict JSON extraction: strips markdown fences if Gemini wraps output.
 */
function extractJSON(raw) {
  // Remove ```json ... ``` or ``` ... ``` wrappers if present
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  return JSON.parse(cleaned);
}

/**
 * Call Gemini to analyze emotion from journal text.
 * Returns: { emotion, keywords, summary }
 */
async function analyzeWithGemini(text) {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `You are an expert emotion analysis assistant for a nature-wellness journaling app called ArvyaX.

Analyze the following journal entry and return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "emotion": "<primary emotion as a single lowercase word, e.g. calm, anxious, joyful, reflective, sad, grateful, energized, peaceful>",
  "keywords": ["<keyword1>", "<keyword2>", "<keyword3>"],
  "summary": "<one sentence summarizing the user's mental/emotional state during this session>"
}

Rules:
- "emotion" must be a single word (lowercase)
- "keywords" must be an array of 3–5 relevant words from the text
- "summary" must be a single, empathetic sentence
- Return ONLY the JSON object, nothing else

Journal entry:
"${text}"`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const raw = response.text();

  const parsed = extractJSON(raw);

  // Validate structure
  if (!parsed.emotion || !Array.isArray(parsed.keywords) || !parsed.summary) {
    throw new Error("Gemini returned malformed analysis response.");
  }

  return {
    emotion: parsed.emotion.toLowerCase().trim(),
    keywords: parsed.keywords.map((k) => k.toLowerCase().trim()),
    summary: parsed.summary.trim(),
  };
}

/**
 * Main analysis function — checks cache first, calls Gemini only on cache miss.
 */
async function analyzeText(text) {
  const hash = hashText(text);

  // 1. Check MongoDB cache
  const cached = await AnalysisCache.findOne({ textHash: hash });
  if (cached) {
    console.log(`[Cache HIT] hash=${hash.slice(0, 8)}...`);
    return {
      emotion: cached.emotion,
      keywords: cached.keywords,
      summary: cached.summary,
      cached: true,
    };
  }

  // 2. Cache miss — call Gemini
  console.log(`[Cache MISS] Calling Gemini for hash=${hash.slice(0, 8)}...`);
  const analysis = await analyzeWithGemini(text);

  // 3. Store in cache
  try {
    await AnalysisCache.create({
      textHash: hash,
      emotion: analysis.emotion,
      keywords: analysis.keywords,
      summary: analysis.summary,
    });
  } catch (cacheErr) {
    // Duplicate key on race condition — safe to ignore
    if (cacheErr.code !== 11000) {
      console.warn("[Cache] Failed to store analysis:", cacheErr.message);
    }
  }

  return { ...analysis, cached: false };
}

module.exports = { analyzeText, hashText };
