# 🌿 ArvyaX Journal

> AI-powered nature-session journal with real-time emotion analysis using Google Gemini.

## Overview

ArvyaX Journal lets users record their experiences from immersive nature sessions (forest, ocean, mountain, etc.), analyze their emotional state using the Gemini LLM, and view insights about their mental wellbeing over time.

![alt text](<Screenshot (215).png>) ![alt text](<Screenshot (216).png>) ![alt text](<Screenshot (217).png>)

---

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Backend   | Node.js + Express                   |
| Frontend  | React (Create React App)            |
| Database  | MongoDB + Mongoose                  |
| LLM       | Google Gemini 1.5 Flash (free tier) |

---

## Prerequisites

- Node.js v18+
- MongoDB running locally **or** a MongoDB Atlas URI
- Google Gemini API key → [Get one free](https://aistudio.google.com/app/apikey)

---

## Setup & Run

### 1. Clone the repository

```bash
git clone https://github.com/mohd-anas-ansari-666/AI-journal.git
cd AI-journal
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env and fill in your values (see below)
npm install
npm start           # production
# OR
npm run dev         # development with hot reload (nodemon)
```

#### Required `.env` Variables

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/arvyax_journal
GEMINI_API_KEY=your_actual_gemini_api_key
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

> **Get your Gemini API key for free** at https://aistudio.google.com/app/apikey  
> Gemini 1.5 Flash is free-tier eligible with generous daily quotas.

### 3. Frontend Setup

```bash
cd frontend
npm install
npm start
# Opens at http://localhost:3000
```

---

## API Reference

### `POST /api/journal`
Create a new journal entry.

**Request:**
```json
{
  "userId": "123",
  "ambience": "forest",
  "text": "I felt calm today after listening to the rain."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Journal entry created successfully",
  "entry": {
    "id": "...",
    "userId": "123",
    "ambience": "forest",
    "text": "I felt calm today...",
    "analysis": { "emotion": null, "keywords": [], "summary": null },
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
}
```

---

### `GET /api/journal/:userId`
Get all entries for a user (paginated).

**Query params:** `page` (default: 1), `limit` (default: 20, max: 100)

**Response:**
```json
{
  "success": true,
  "total": 8,
  "page": 1,
  "totalPages": 1,
  "entries": [...]
}
```

---

### `POST /api/journal/analyze`
Analyze emotions from journal text using Gemini LLM.

**Request:**
```json
{
  "text": "I felt calm today after listening to the rain",
  "entryId": "optional_entry_id_to_persist_analysis"
}
```

**Response:**
```json
{
  "emotion": "calm",
  "keywords": ["rain", "nature", "peace"],
  "summary": "User experienced deep relaxation during the forest session.",
  "cached": false
}
```

---

### `GET /api/journal/insights/:userId`
Get aggregated mental wellness insights for a user.

**Response:**
```json
{
  "totalEntries": 8,
  "topEmotion": "calm",
  "mostUsedAmbience": "forest",
  "recentKeywords": ["focus", "nature", "rain"],
  "emotionTimeline": [...],
  "analyzedEntries": 6
}
```

---

### `GET /health`
Service health check.

---

## Project Structure

```
arvyax-journal/
├── backend/
│   ├── models/
│   │   ├── JournalEntry.js       # MongoDB schema for journal entries
│   │   └── AnalysisCache.js      # LLM result cache (TTL: 30 days)
│   ├── routes/
│   │   └── journal.js            # All 4 API endpoints
│   ├── services/
│   │   └── geminiService.js      # Gemini API integration + cache logic
│   ├── middleware/
│   │   └── errorHandler.js       # Global error + 404 handlers
│   ├── server.js                 # Express app entry point
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js                # Main React app (single page)
│   │   ├── App.css               # Nature-themed styles
│   │   ├── index.js              # React entry point
│   │   └── utils/
│   │       └── api.js            # Axios API client
│   └── package.json
├── README.md
└── ARCHITECTURE.md
```

---

## Features

- **Write** journal entries with session ambience tagging
- **Analyze** emotions with one click — powered by Gemini LLM
- **View** past entries with analysis results inline
- **Insights** dashboard: top emotion, favorite ambience, keyword cloud, emotion timeline
- **Smart caching**: identical text analyzed once, results reused (saves LLM cost)
- **Rate limiting**: protects the analyze endpoint from abuse
- **Security**: Helmet headers, CORS, request size limits

---

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/arvyax_journal` |
| `GEMINI_API_KEY` | Google Gemini API key | *(required)* |
| `NODE_ENV` | Environment | `development` |
| `FRONTEND_URL` | Allowed CORS origin | `http://localhost:3000` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) | `900000` (15 min) |
| `RATE_LIMIT_MAX` | Max requests per window | `100` |
