const express = require('express');
const { createHash } = require('crypto');
const { AppError, asyncHandler } = require('../utils/errors');
const { requireSessionId } = require('../utils/validation');
const { getEvaluationTimeline, getPublicTimeline, toPublicTimelineEvent } = require('../utils/timeline');
const { redactSensitiveText } = require('../utils/safety');

const DIMENSIONS = ['technical_execution', 'problem_framing', 'ai_verification', 'independent_judgment', 'communication'];
const EVALUATOR_CONTRACT_VERSION = 'evidence-rubric-v1';

const DIMENSION_ANCHORS = Object.freeze({
  technical_execution: [[{ actor: 'learner', category: 'final_solution' }]],
  problem_framing: [[
    { actor: 'learner', category: 'investigation_question_or_reasoning' },
    { actor: 'learner', category: 'learner_selected_evidence' }
  ]],
  ai_verification: [[
    { actor: 'learner', category: 'decision' },
    { actor: 'learner', category: 'verification' }
  ]],
  independent_judgment: [
    [{ actor: 'learner', category: 'decision' }],
    [{ actor: 'learner', category: 'independent_explanation' }]
  ],
  communication: [[
    { actor: 'learner', category: 'final_solution' },
    { actor: 'learner', category: 'independent_explanation' }
  ]]
});

function parseStoredJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function matchesAttribution(event, allowedAttributions) {
  return allowedAttributions.some(({ actor, category }) => (
    event?.evidence_attribution?.actor === actor && event?.evidence_attribution?.category === category
  ));
}

function hasRequiredAnchors(dimension, events) {
  return DIMENSION_ANCHORS[dimension].every((anchorGroup) => events.some((event) => matchesAttribution(event, anchorGroup)));
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((result, key) => {
      if (value[key] !== undefined) result[key] = canonicalize(value[key]);
      return result;
    }, {});
  }
  return value;
}

function fingerprintEvaluationInput(input) {
  return createHash('sha256').update(JSON.stringify(canonicalize(input))).digest('hex');
}

function buildEvaluationMetadata(ai, evaluationInput) {
  const providerMetadata = typeof ai.getEvaluationMetadata === 'function' ? ai.getEvaluationMetadata() : {};
  return {
    evaluator_contract_version: EVALUATOR_CONTRACT_VERSION,
    model: typeof providerMetadata?.model === 'string' ? providerMetadata.model : 'custom-evaluator',
    temperature: Number.isFinite(providerMetadata?.temperature) ? providerMetadata.temperature : null,
    input_sha256: fingerprintEvaluationInput(evaluationInput)
  };
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
  if (evaluation.evidence.length !== DIMENSIONS.length) return null;
  const eventById = new Map(timeline.map((event) => [event.event_id, event]));
  const evidence = [];
  const mappedDimensions = new Set();
  for (const item of evaluation.evidence) {
    if (!item || !DIMENSIONS.includes(item.dimension) || !Array.isArray(item.event_ids) || typeof item.explanation !== 'string' || !item.explanation.trim()) {
      return null;
    }
    if (mappedDimensions.has(item.dimension)) return null;
    const uniqueIds = [...new Set(item.event_ids)];
    if (!uniqueIds.length || uniqueIds.length !== item.event_ids.length || !uniqueIds.every((id) => eventById.has(id))) return null;
    const mappedEvents = uniqueIds.map((id) => eventById.get(id));
    if (!hasRequiredAnchors(item.dimension, mappedEvents)) return null;
    mappedDimensions.add(item.dimension);
    evidence.push({
      dimension: item.dimension,
      event_ids: uniqueIds,
      event_sequences: mappedEvents.map((event) => event.sequence),
      explanation: redactSensitiveText(item.explanation.trim())
    });
  }
  if (mappedDimensions.size !== DIMENSIONS.length) return null;
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
        event_timeline: completeTimeline,
        evaluation_metadata: buildEvaluationMetadata(ai, evaluationInput)
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

module.exports = { buildEvaluationMetadata, canonicalize, createReceiptRouter, EVALUATOR_CONTRACT_VERSION, fingerprintEvaluationInput, publicReceipt, validateEvaluation };
