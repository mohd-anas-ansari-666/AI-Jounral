import React, { useState, useEffect, useCallback } from "react";
import { createEntry, getEntries, analyzeText, getInsights } from "./utils/api";
import "./App.css";

const AMBIENCES = [
  { value: "forest", label: "🌲 Forest", color: "#2d6a4f" },
  { value: "ocean", label: "🌊 Ocean", color: "#1e6091" },
  { value: "mountain", label: "⛰️ Mountain", color: "#6b4c9a" },
  { value: "desert", label: "🏜️ Desert", color: "#c77b3a" },
  { value: "meadow", label: "🌸 Meadow", color: "#7cb86e" },
  { value: "rain", label: "🌧️ Rain", color: "#4a7fa5" },
  { value: "other", label: "✨ Other", color: "#888" },
];

const EMOTION_COLORS = {
  calm: "#4a9e8a",
  peaceful: "#5cb8a4",
  joyful: "#e8c547",
  grateful: "#e88c47",
  reflective: "#9b72cf",
  anxious: "#e05c5c",
  sad: "#7ba7d4",
  energized: "#f4a24a",
  default: "#7a9e87",
};

const DEFAULT_USER = "user_123";

function App() {
  const [userId] = useState(DEFAULT_USER);
  const [activeTab, setActiveTab] = useState("write");
  const [entries, setEntries] = useState([]);
  const [insights, setInsights] = useState(null);

  // Write form state
  const [text, setText] = useState("");
  const [ambience, setAmbience] = useState("forest");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState(null);

  // Analysis state
  const [analyzing, setAnalyzing] = useState(null); // entryId being analyzed
  const [analysisError, setAnalysisError] = useState(null);

  const [loadingEntries, setLoadingEntries] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const loadEntries = useCallback(async () => {
    setLoadingEntries(true);
    try {
      const data = await getEntries(userId);
      setEntries(data.entries || []);
    } catch (e) {
      console.error("Failed to load entries", e);
    } finally {
      setLoadingEntries(false);
    }
  }, [userId]);

  const loadInsights = useCallback(async () => {
    setLoadingInsights(true);
    try {
      const data = await getInsights(userId);
      setInsights(data);
    } catch (e) {
      console.error("Failed to load insights", e);
    } finally {
      setLoadingInsights(false);
    }
  }, [userId]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    if (activeTab === "insights") loadInsights();
  }, [activeTab, loadInsights]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setIsSubmitting(true);
    setSubmitMsg(null);
    try {
      await createEntry(userId, ambience, text.trim());
      setSubmitMsg({ type: "success", text: "✅ Journal entry saved!" });
      setText("");
      loadEntries();
    } catch (err) {
      setSubmitMsg({ type: "error", text: "❌ Failed to save. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnalyze = async (entry) => {
    setAnalyzing(entry.id);
    setAnalysisError(null);
    try {
      const result = await analyzeText(entry.text, entry.id);
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id
            ? {
                ...e,
                analysis: {
                  emotion: result.emotion,
                  keywords: result.keywords,
                  summary: result.summary,
                  analyzedAt: new Date().toISOString(),
                },
              }
            : e
        )
      );
    } catch (err) {
      setAnalysisError(`Analysis failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setAnalyzing(null);
    }
  };

  const ambienceObj = (val) => AMBIENCES.find((a) => a.value === val) || AMBIENCES[6];
  const emotionColor = (em) =>
    em ? EMOTION_COLORS[em.toLowerCase()] || EMOTION_COLORS.default : EMOTION_COLORS.default;

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-leaf">🌿</span>
            <span className="logo-text">ArvyaX Journal</span>
          </div>
          <p className="header-sub">Your nature-session reflection space</p>
        </div>
      </header>

      {/* Tabs */}
      <nav className="tabs">
        {[
          { key: "write", label: "✍️ Write" },
          { key: "entries", label: `📖 Entries ${entries.length > 0 ? `(${entries.length})` : ""}` },
          { key: "insights", label: "📊 Insights" },
        ].map((tab) => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="main">
        {/* ── WRITE TAB ── */}
        {activeTab === "write" && (
          <div className="tab-panel">
            <h2 className="panel-title">New Journal Entry</h2>
            <form onSubmit={handleSubmit} className="journal-form">
              <div className="form-group">
                <label className="form-label">Session Ambience</label>
                <div className="ambience-grid">
                  {AMBIENCES.map((a) => (
                    <button
                      key={a.value}
                      type="button"
                      className={`ambience-btn ${ambience === a.value ? "selected" : ""}`}
                      style={ambience === a.value ? { borderColor: a.color, background: `${a.color}20` } : {}}
                      onClick={() => setAmbience(a.value)}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Your Reflection{" "}
                  <span className="char-count">{text.length}/5000</span>
                </label>
                <textarea
                  className="journal-textarea"
                  rows={8}
                  maxLength={5000}
                  placeholder="How did your nature session make you feel? Describe the experience, your emotions, what you noticed…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  required
                />
              </div>

              {submitMsg && (
                <div className={`alert ${submitMsg.type}`}>{submitMsg.text}</div>
              )}

              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitting || text.trim().length < 5}
              >
                {isSubmitting ? "Saving…" : "Save Entry"}
              </button>
            </form>
          </div>
        )}

        {/* ── ENTRIES TAB ── */}
        {activeTab === "entries" && (
          <div className="tab-panel">
            <div className="panel-header">
              <h2 className="panel-title">Your Journal</h2>
              <button className="btn-ghost" onClick={loadEntries}>
                ↻ Refresh
              </button>
            </div>

            {analysisError && (
              <div className="alert error">{analysisError}</div>
            )}

            {loadingEntries ? (
              <div className="loading">Loading entries…</div>
            ) : entries.length === 0 ? (
              <div className="empty-state">
                <p>🌱 No entries yet. Write your first journal entry!</p>
              </div>
            ) : (
              <div className="entries-list">
                {entries.map((entry) => {
                  const amb = ambienceObj(entry.ambience);
                  const hasAnalysis = entry.analysis?.emotion;
                  return (
                    <div key={entry.id} className="entry-card">
                      <div className="entry-header">
                        <span
                          className="ambience-tag"
                          style={{ background: `${amb.color}25`, color: amb.color, borderColor: `${amb.color}50` }}
                        >
                          {amb.label}
                        </span>
                        <span className="entry-date">
                          {new Date(entry.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      <p className="entry-text">{entry.text}</p>

                      {/* Analysis results */}
                      {hasAnalysis && (
                        <div className="analysis-box">
                          <div className="analysis-emotion-row">
                            <span
                              className="emotion-badge"
                              style={{
                                background: `${emotionColor(entry.analysis.emotion)}20`,
                                color: emotionColor(entry.analysis.emotion),
                                borderColor: `${emotionColor(entry.analysis.emotion)}50`,
                              }}
                            >
                              {entry.analysis.emotion}
                            </span>
                            <div className="keyword-chips">
                              {entry.analysis.keywords.map((kw) => (
                                <span key={kw} className="keyword-chip">{kw}</span>
                              ))}
                            </div>
                          </div>
                          <p className="analysis-summary">💬 {entry.analysis.summary}</p>
                        </div>
                      )}

                      {/* Analyze button */}
                      {!hasAnalysis && (
                        <button
                          className="btn-analyze"
                          onClick={() => handleAnalyze(entry)}
                          disabled={analyzing === entry.id}
                        >
                          {analyzing === entry.id ? "Analyzing…" : "🔍 Analyze Emotions"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── INSIGHTS TAB ── */}
        {activeTab === "insights" && (
          <div className="tab-panel">
            <div className="panel-header">
              <h2 className="panel-title">Your Insights</h2>
              <button className="btn-ghost" onClick={loadInsights}>↻ Refresh</button>
            </div>

            {loadingInsights ? (
              <div className="loading">Loading insights…</div>
            ) : !insights ? (
              <div className="empty-state"><p>Unable to load insights.</p></div>
            ) : insights.totalEntries === 0 ? (
              <div className="empty-state">
                <p>🌱 No data yet. Start journaling to see your insights!</p>
              </div>
            ) : (
              <>
                {/* Stats Grid */}
                <div className="stats-grid">
                  <div className="stat-card">
                    <span className="stat-number">{insights.totalEntries}</span>
                    <span className="stat-label">Total Entries</span>
                  </div>
                  <div className="stat-card">
                    <span
                      className="stat-number"
                      style={{ color: emotionColor(insights.topEmotion) }}
                    >
                      {insights.topEmotion || "—"}
                    </span>
                    <span className="stat-label">Top Emotion</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-number">
                      {insights.mostUsedAmbience
                        ? ambienceObj(insights.mostUsedAmbience).label
                        : "—"}
                    </span>
                    <span className="stat-label">Fav. Ambience</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-number">{insights.analyzedEntries || 0}</span>
                    <span className="stat-label">Analyzed</span>
                  </div>
                </div>

                {/* Recent Keywords */}
                {insights.recentKeywords?.length > 0 && (
                  <div className="insight-section">
                    <h3 className="insight-section-title">Recent Keywords</h3>
                    <div className="keyword-cloud">
                      {insights.recentKeywords.map((kw) => (
                        <span key={kw} className="kw-cloud-chip">{kw}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Emotion Timeline */}
                {insights.emotionTimeline?.length > 0 && (
                  <div className="insight-section">
                    <h3 className="insight-section-title">Recent Emotion Timeline</h3>
                    <div className="timeline">
                      {insights.emotionTimeline.map((item, i) => (
                        <div key={i} className="timeline-item">
                          <div
                            className="timeline-dot"
                            style={{ background: emotionColor(item.emotion) }}
                          />
                          <div className="timeline-content">
                            <span
                              className="tl-emotion"
                              style={{ color: emotionColor(item.emotion) }}
                            >
                              {item.emotion}
                            </span>
                            <span className="tl-ambience">
                              {ambienceObj(item.ambience).label}
                            </span>
                            <span className="tl-date">
                              {new Date(item.date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
