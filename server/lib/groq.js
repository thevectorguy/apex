import fs from 'node:fs';

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const DEFAULT_TRANSCRIBE_MODEL = process.env.GROQ_TRANSCRIPTION_MODEL || process.env.GROQ_TRANSCRIBE_MODEL || 'whisper-large-v3-turbo';
const DEFAULT_ANALYSIS_MODEL = process.env.GROQ_MODEL || process.env.GROQ_ANALYSIS_MODEL || 'llama-3.3-70b-versatile';

function hasGroqKey() {
  return Boolean(process.env.GROQ_API_KEY);
}

async function groqFetch(path, init = {}) {
  if (!hasGroqKey()) {
    throw new Error('GROQ_API_KEY is not set');
  }

  const response = await fetch(`${GROQ_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Groq request failed (${response.status}): ${text}`);
  }

  return response;
}

export async function transcribeAudioFile({ filePath, mimeType, language = 'en' }) {
  if (!hasGroqKey()) {
    return {
      text: 'Transcript unavailable. Set GROQ_API_KEY to enable Groq transcription.',
      segments: [],
      provider: 'fallback',
      model: null,
    };
  }

  const fileBuffer = fs.readFileSync(filePath);
  const form = new FormData();
  form.append('model', DEFAULT_TRANSCRIBE_MODEL);
  form.append('language', language);
  form.append('response_format', 'verbose_json');
  form.append('file', new Blob([fileBuffer], { type: mimeType }), filePath.split(/[/\\]/).pop() || 'audio.webm');

  const response = await groqFetch('/audio/transcriptions', {
    method: 'POST',
    body: form,
  });

  const payload = await response.json();
  const segments = Array.isArray(payload.segments)
    ? payload.segments.map((segment, index) => ({
        id: `seg_${index + 1}`,
        start: segment.start ?? null,
        end: segment.end ?? null,
        text: String(segment.text || '').trim(),
      }))
    : [];

  return {
    text: String(payload.text || '').trim(),
    segments,
    provider: 'groq',
    model: DEFAULT_TRANSCRIBE_MODEL,
    raw: payload,
  };
}

export async function generateGroqAnalysis({ prompt, schema }) {
  if (!hasGroqKey()) {
    return null;
  }

  const response = await groqFetch('/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: DEFAULT_ANALYSIS_MODEL,
      input: prompt,
      text: {
        format: {
          type: 'json_schema',
          name: schema.name,
          schema: schema.schema,
          strict: true,
        },
      },
    }),
  });

  const payload = await response.json();
  return extractResponseJson(payload);
}

export function extractResponseJson(payload) {
  if (!payload) return null;

  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return safeParse(payload.output_text);
  }

  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    const content = Array.isArray(item.content) ? item.content : [];
    for (const part of content) {
      if (typeof part.text === 'string' && part.text.trim()) {
        const parsed = safeParse(part.text);
        if (parsed) return parsed;
      }
    }
  }

  return null;
}

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
