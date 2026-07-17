PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'submitted', 'completed')),
  message_count INTEGER NOT NULL DEFAULT 0,
  flawed_suggestion_offered INTEGER NOT NULL DEFAULT 0 CHECK (flawed_suggestion_offered IN (0, 1)),
  verification_completed INTEGER NOT NULL DEFAULT 0 CHECK (verification_completed IN (0, 1)),
  submission_completed INTEGER NOT NULL DEFAULT 0 CHECK (submission_completed IN (0, 1)),
  follow_up_completed INTEGER NOT NULL DEFAULT 0 CHECK (follow_up_completed IN (0, 1)),
  completed_at DATETIME
);

CREATE TABLE IF NOT EXISTS decision_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  type TEXT NOT NULL,
  data TEXT NOT NULL,
  FOREIGN KEY(session_id) REFERENCES sessions(id),
  UNIQUE(session_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_decision_events_session_sequence
  ON decision_events(session_id, sequence);

CREATE TABLE IF NOT EXISTS submissions (
  session_id TEXT PRIMARY KEY,
  solution TEXT NOT NULL,
  justification TEXT NOT NULL,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(session_id) REFERENCES sessions(id)
);

CREATE TABLE IF NOT EXISTS follow_up_answers (
  session_id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(session_id) REFERENCES sessions(id)
);

CREATE TABLE IF NOT EXISTS competency_receipts (
  session_id TEXT PRIMARY KEY,
  scores TEXT NOT NULL,
  evidence_summary TEXT NOT NULL,
  narrative_summary TEXT,
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(session_id) REFERENCES sessions(id)
);
