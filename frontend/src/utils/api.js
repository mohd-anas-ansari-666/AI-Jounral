import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// ─── Journal Entry APIs ───────────────────────────────────────

export const createEntry = (userId, ambience, text) =>
  api.post("/journal", { userId, ambience, text }).then((r) => r.data);

export const getEntries = (userId, page = 1, limit = 20) =>
  api.get(`/journal/${userId}`, { params: { page, limit } }).then((r) => r.data);

export const analyzeText = (text, entryId = null) =>
  api.post("/journal/analyze", { text, entryId }).then((r) => r.data);

export const getInsights = (userId) =>
  api.get(`/journal/insights/${userId}`).then((r) => r.data);

export default api;
