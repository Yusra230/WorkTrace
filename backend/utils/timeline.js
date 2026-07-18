const PUBLIC_TYPES = new Set([
  'session_started',
  'user_prompt',
  'ai_response',
  'suggestion_offered',
  'suggestion_accepted',
  'suggestion_rejected',
  'suggestion_verified',
  'user_decision',
  'evidence_collected',
  'submission',
  'follow_up_question',
  'follow_up_answer',
  'evaluation_started',
  'evaluation_completed'
]);
const { redactSensitiveText } = require('./safety');

const EVALUATION_EVIDENCE_TYPES = Object.freeze({
  session_started: { actor: 'system', category: 'session_context' },
  user_prompt: { actor: 'learner', category: 'investigation_question_or_reasoning' },
  ai_response: { actor: 'ai_teammate', category: 'investigation_information' },
  suggestion_offered: { actor: 'ai_teammate', category: 'suggestion' },
  suggestion_accepted: { actor: 'learner', category: 'decision' },
  suggestion_rejected: { actor: 'learner', category: 'decision' },
  suggestion_verified: { actor: 'learner', category: 'verification' },
  user_decision: { actor: 'learner', category: 'decision' },
  evidence_collected: { actor: 'learner', category: 'learner_selected_evidence' },
  submission: { actor: 'learner', category: 'final_solution' },
  follow_up_question: { actor: 'system', category: 'independent_explanation_prompt' },
  follow_up_answer: { actor: 'learner', category: 'independent_explanation' },
  evaluation_started: { actor: 'system', category: 'evaluation_lifecycle' },
  evaluation_completed: { actor: 'system', category: 'evaluation_lifecycle' }
});

function parseData(data) {
  try {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function pick(data, keys) {
  return keys.reduce((result, key) => {
    if (typeof data[key] === 'string' || typeof data[key] === 'number' || typeof data[key] === 'boolean') {
      result[key] = typeof data[key] === 'string' ? redactSensitiveText(data[key]) : data[key];
    }
    return result;
  }, {});
}

function publicData(type, data) {
  switch (type) {
    case 'session_started': return pick(data, ['mission_id']);
    case 'user_prompt': return pick(data, ['message']);
    case 'ai_response': return pick(data, ['message']);
    case 'suggestion_offered': return pick(data, ['suggestion_id', 'suggestion']);
    case 'suggestion_accepted':
    case 'suggestion_rejected': return pick(data, ['suggestion_id', 'reason']);
    case 'suggestion_verified': return pick(data, ['suggestion_id', 'decision', 'reason']);
    case 'user_decision': return pick(data, ['decision', 'reason']);
    case 'evidence_collected': return pick(data, ['evidence_id', 'title', 'description', 'source', 'type', 'relation', 'linked_hypothesis_id', 'created_by']);
    case 'submission': return pick(data, ['solution', 'justification']);
    case 'follow_up_question': return pick(data, ['question']);
    case 'follow_up_answer': return pick(data, ['answer']);
    case 'evaluation_started': return { status: 'started' };
    case 'evaluation_completed': return { status: 'completed' };
    default: return {};
  }
}

function toPublicTimelineEvent(event) {
  if (!event || !PUBLIC_TYPES.has(event.type)) return null;
  return {
    event_id: event.id,
    sequence: event.sequence,
    timestamp: event.timestamp,
    type: event.type,
    data: publicData(event.type, parseData(event.data))
  };
}

function getPublicTimeline(db, sessionId) {
  return db.getEvents(sessionId).map(toPublicTimelineEvent).filter(Boolean);
}

function toEvaluationTimelineEvent(event) {
  const publicEvent = toPublicTimelineEvent(event);
  if (!publicEvent) return null;
  return {
    ...publicEvent,
    evidence_attribution: EVALUATION_EVIDENCE_TYPES[publicEvent.type] || { actor: 'system', category: 'unknown' }
  };
}

function getEvaluationTimeline(db, sessionId) {
  return db.getEvents(sessionId).map(toEvaluationTimelineEvent).filter(Boolean);
}

function buildTeammateHistory(timeline) {
  return timeline.flatMap((event) => {
    if (event.type === 'user_prompt') return [{ role: 'learner', content: event.data.message }];
    if (event.type === 'ai_response') return [{ role: 'teammate', content: event.data.message }];
    return [];
  });
}

module.exports = { toPublicTimelineEvent, toEvaluationTimelineEvent, getPublicTimeline, getEvaluationTimeline, buildTeammateHistory, EVALUATION_EVIDENCE_TYPES };
