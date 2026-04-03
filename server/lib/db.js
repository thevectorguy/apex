import { DatabaseSync } from 'node:sqlite';
import { dbPath } from './paths.js';
import { ensureStorageDirs } from './storage.js';
import { masterCopySnapshot } from './masterCopy.js';

let dbInstance;

export function getDb() {
  if (dbInstance) return dbInstance;

  ensureStorageDirs();
  dbInstance = new DatabaseSync(dbPath);
  dbInstance.exec('PRAGMA journal_mode = WAL;');
  dbInstance.exec('PRAGMA foreign_keys = ON;');
  initSchema(dbInstance);
  seedMasterCopy(dbInstance);
  return dbInstance;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS coach_sessions (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      title TEXT,
      mode TEXT NOT NULL DEFAULT 'analysis',
      status TEXT NOT NULL DEFAULT 'draft',
      visit_number INTEGER NOT NULL DEFAULT 1,
      transcript_json TEXT NOT NULL DEFAULT '[]',
      analysis_json TEXT NOT NULL DEFAULT '{}',
      report_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audio_assets (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_path TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'upload',
      transcript_text TEXT,
      duration_ms INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY(session_id) REFERENCES coach_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      overall_score INTEGER NOT NULL,
      grade TEXT NOT NULL,
      report_json TEXT NOT NULL,
      report_path TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(session_id) REFERENCES coach_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS master_copy_snapshots (
      id TEXT PRIMARY KEY,
      version TEXT NOT NULL,
      source TEXT NOT NULL,
      content_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

function seedMasterCopy(db) {
  const existing = db.prepare('SELECT COUNT(*) AS count FROM master_copy_snapshots').get();
  if (existing?.count) return;

  const snapshot = masterCopySnapshot();
  db.prepare(`
    INSERT INTO master_copy_snapshots (id, version, source, content_json, created_at)
    VALUES (@id, @version, @source, @contentJson, @createdAt)
  `).run({
    id: snapshot.id,
    version: snapshot.version,
    source: snapshot.source,
    contentJson: JSON.stringify(snapshot.content),
    createdAt: snapshot.createdAt,
  });
}

export function nowIso() {
  return new Date().toISOString();
}

export function mapCustomerRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    phone: row.phone || '',
    email: row.email || '',
    notes: row.notes || '',
    status: row.status,
    metadata: parseJson(row.metadata_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapSessionRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    customerId: row.customer_id,
    title: row.title || '',
    mode: row.mode,
    status: row.status,
    visitNumber: row.visit_number,
    transcript: parseJson(row.transcript_json, []),
    analysis: parseJson(row.analysis_json, {}),
    reportId: row.report_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapReportRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    sessionId: row.session_id,
    customerId: row.customer_id,
    overallScore: row.overall_score,
    grade: row.grade,
    report: parseJson(row.report_json, {}),
    reportPath: row.report_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAudioRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    sessionId: row.session_id,
    customerId: row.customer_id,
    filename: row.filename,
    mimeType: row.mime_type,
    filePath: row.file_path,
    source: row.source,
    transcriptText: row.transcript_text || '',
    durationMs: row.duration_ms ?? null,
    createdAt: row.created_at,
  };
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
