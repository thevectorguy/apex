# APEX

APEX is a Vite + React showroom experience prototype. This branch now includes `My Coach`, a sales-coaching workflow that records or uploads customer conversations, transcribes them through Groq, scores them against the uploaded training master copy, and saves coaching reports for repeat visits.

## Local Setup

1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env.local` and set `GROQ_API_KEY`.
3. Start the API server:
   `npm run server`
4. In another terminal, start the frontend:
   `npm run dev`

The Vite dev server proxies `/api/*` requests to the local My Coach API port.
