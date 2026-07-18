const express = require('express');
const { AppError, asyncHandler } = require('../utils/errors');
const { requireSessionId } = require('../utils/validation');
const { getEvaluationTimeline, getPublicTimeline, toPublicTimelineEvent } = require('../utils/timeline');
const { redactSensitiveText } = require('../utils/safety');

const DIMENSIONS = ['technical_execution', 'problem_framing', 'ai_verification', 'independent_judgment', 'communication'];

function parseStoredJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function validateEvaluation(evaluation, timeline) {
  if (!evaluation || typeof evaluation !== 'object') return null;
  const scores = evaluation.scores;
  if (!scores || typeof scores !== 'object' || !DIMENSIONS.every((key) => Number.isFinite(scores[key]) && scores[key] >= 0 && scores[key] <= 100)) {
    return null;
  }
  if (!Array.isArray(evaluation.evidence) || typeof evaluation.narrative_summary !== 'string' || !evaluation.narrative_summary.trim()) {
    return null;
  }
  const sequenceById = new Map(timeline.map((event) => [event.event_id, event.sequence]));
  const evidence = [];
  for (const item of evaluation.evidence) {
    if (!item || !DIMENSIONS.includes(item.dimension) || !Array.isArray(item.event_ids) || typeof item.explanation !== 'string' || !item.explanation.trim()) {
      return null;
    }
    const uniqueIds = [...new Set(item.event_ids)];
    if (uniqueIds.length !== item.event_ids.length || !uniqueIds.every((id) => sequenceById.has(id))) return null;
    evidence.push({
      dimension: item.dimension,
      event_ids: uniqueIds,
      event_sequences: uniqueIds.map((id) => sequenceById.get(id)),
      explanation: redactSensitiveText(item.explanation.trim())
    });
  }
  return { scores, evidence, narrative_summary: redactSensitiveText(evaluation.narrative_summary.trim()) };
}

function publicReceipt(receipt) {
  const rawScores = parseStoredJson(receipt.scores, {});
  const scores = DIMENSIONS.reduce((result, dimension) => {
    if (Number.isFinite(rawScores[dimension])) result[dimension] = rawScores[dimension];
    return result;
  }, {});
  const summary = parseStoredJson(receipt.evidence_summary, { evidence: [], event_timeline: [] });
  const eventTimeline = (Array.isArray(summary.event_timeline) ? summary.event_timeline : [])
    .map((event) => toPublicTimelineEvent({
      id: event.event_id || event.id,
      sequence: event.sequence,
      timestamp: event.timestamp,
      type: event.type,
      data: event.data
    }))
    .filter(Boolean);
  const evidence = (Array.isArray(summary.evidence) ? summary.evidence : [])
    .filter((item) => item && DIMENSIONS.includes(item.dimension) && Array.isArray(item.event_ids))
    .map((item) => ({
      dimension: item.dimension,
      event_ids: item.event_ids.filter((id) => typeof id === 'string'),
      event_sequences: Array.isArray(item.event_sequences)
        ? item.event_sequences.filter((sequence) => Number.isInteger(sequence))
        : [],
      explanation: redactSensitiveText(typeof item.explanation === 'string' ? item.explanation : '')
    }));
  return {
    session_id: receipt.session_id,
    scores,
    evidence,
    event_timeline: eventTimeline,
    narrative_summary: redactSensitiveText(receipt.narrative_summary || ''),
    generated_at: receipt.generated_at
  };
}

function createReceiptRouter({ db, mission, ai, sessionLock }) {
  const router = express.Router();

  router.post('/generate', asyncHandler(async (req, res) => {
    const sessionId = requireSessionId(req.body && req.body.session_id);
    const receipt = await sessionLock.run(sessionId, async () => {
      const existing = db.getReceipt(sessionId);
      if (existing) return existing;
      const session = db.getSession(sessionId);
      if (!session) throw new AppError(404, 'Session not found.', 'session_not_found');
      if (session.status !== 'submitted' || !session.submission_completed || !session.follow_up_completed) {
        throw new AppError(409, 'Submission and follow-up explanation are required before evaluation.', 'invalid_state');
      }

      db.appendEvent(sessionId, 'evaluation_started', {});
      const timelineForEvaluation = getEvaluationTimeline(db, sessionId);
      const evaluationInput = {
        mission: {
          id: mission.id,
          company: mission.company,
          role: mission.role,
          title: mission.title,
          brief: mission.brief,
          context: mission.context,
          codebase_files: mission.codebase_files,
          seed_data: mission.seed_data
        },
        events: timelineForEvaluation,
        submission: db.getSubmission(sessionId),
        follow_up_answer: db.getFollowUp(sessionId)
      };

      let validated = validateEvaluation(await ai.evaluate(evaluationInput), timelineForEvaluation);
      if (!validated) {
        validated = validateEvaluation(await ai.evaluate(evaluationInput, true), timelineForEvaluation);
      }
      if (!validated) {
        throw new AppError(503, 'AI service temporarily unavailable.', 'invalid_evaluator_output');
      }

      db.appendEvent(sessionId, 'evaluation_completed', {});
      const completeTimeline = getPublicTimeline(db, sessionId);
      const saved = db.saveReceipt(sessionId, validated.scores, {
        evidence: validated.evidence,
        event_timeline: completeTimeline
      }, validated.narrative_summary);
      db.updateSession(sessionId, { status: 'completed', completed_at: new Date().toISOString() });
      return saved;
    });
    res.json(publicReceipt(receipt));
  }));

  router.get('/:session_id', asyncHandler(async (req, res) => {
    const sessionId = requireSessionId(req.params.session_id);
    const receipt = db.getReceipt(sessionId);
    if (!receipt) throw new AppError(404, 'Competency Receipt not found.', 'receipt_not_found');
    res.json(publicReceipt(receipt));
  }));

  return router;
}

module.exports = { createReceiptRouter, validateEvaluation, publicReceipt };
