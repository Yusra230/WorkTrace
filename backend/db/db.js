const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { createUuid } = require('../utils/uuid');

function createDatabase(filename = path.join(__dirname, 'worktrace.db')) {
  if (filename !== ':memory:') {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
  }

  const db = new Database(filename);
  db.pragma('foreign_keys = ON');
  db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));

  const appendEvent = db.transaction((sessionId, type, data) => {
    const next = db.prepare(
      'SELECT COALESCE(MAX(sequence), 0) + 1 AS sequence FROM decision_events WHERE session_id = ?'
    ).get(sessionId).sequence;
    const id = createUuid();
    db.prepare(
      'INSERT INTO decision_events (id, session_id, sequence, type, data) VALUES (?, ?, ?, ?, ?)'
    ).run(id, sessionId, next, type, JSON.stringify(data));
    return db.prepare('SELECT * FROM decision_events WHERE id = ?').get(id);
  });

  return {
    raw: db,
    close: () => db.close(),
    createSession(id, missionId) {
      db.prepare('INSERT INTO sessions (id, mission_id) VALUES (?, ?)').run(id, missionId);
      return this.getSession(id);
    },
    getSession(id) {
      return db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
    },
    updateSession(id, fields) {
      const keys = Object.keys(fields);
      if (!keys.length) return this.getSession(id);
      const set = keys.map((key) => `${key} = ?`).join(', ');
      db.prepare(`UPDATE sessions SET ${set} WHERE id = ?`).run(...keys.map((key) => fields[key]), id);
      return this.getSession(id);
    },
    appendEvent,
    getEvents(sessionId) {
      return db.prepare(
        'SELECT id, session_id, sequence, timestamp, type, data FROM decision_events WHERE session_id = ? ORDER BY sequence ASC'
      ).all(sessionId);
    },
    findSuggestion(sessionId, suggestionId) {
      const rows = db.prepare(
        "SELECT * FROM decision_events WHERE session_id = ? AND type = 'suggestion_offered' ORDER BY sequence ASC"
      ).all(sessionId);
      return rows.find((row) => {
        try {
          return JSON.parse(row.data).suggestion_id === suggestionId;
        } catch {
          return false;
        }
      });
    },
    saveSubmission(sessionId, solution, justification) {
      db.prepare(
        'INSERT INTO submissions (session_id, solution, justification) VALUES (?, ?, ?)'
      ).run(sessionId, solution, justification);
    },
    getSubmission(sessionId) {
      return db.prepare('SELECT * FROM submissions WHERE session_id = ?').get(sessionId);
    },
    saveFollowUp(sessionId, question, answer) {
      db.prepare(
        'INSERT INTO follow_up_answers (session_id, question, answer) VALUES (?, ?, ?)'
      ).run(sessionId, question, answer);
    },
    getFollowUp(sessionId) {
      return db.prepare('SELECT * FROM follow_up_answers WHERE session_id = ?').get(sessionId);
    },
    getReceipt(sessionId) {
      return db.prepare('SELECT * FROM competency_receipts WHERE session_id = ?').get(sessionId);
    },
    saveReceipt(sessionId, scores, evidenceSummary, narrativeSummary) {
      db.prepare(
        'INSERT INTO competency_receipts (session_id, scores, evidence_summary, narrative_summary) VALUES (?, ?, ?, ?)'
      ).run(sessionId, JSON.stringify(scores), JSON.stringify(evidenceSummary), narrativeSummary);
      return this.getReceipt(sessionId);
    }
  };
}

module.exports = { createDatabase };
