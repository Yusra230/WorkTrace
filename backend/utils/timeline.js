const PUBLIC_TYPES = new Set([
  'session_started',
  'user_prompt',
  'ai_response',
  'suggestion_offered',
  'suggestion_accepted',
  'suggestion_rejected',
  'suggestion_verified',
  'user_decision',
  'submission',
  'follow_up_question',
  'follow_up_answer',
  'evaluation_started',
  'evaluation_completed'
]);
const { redactSensitiveText } = require('./safety');

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

function buildTeammateHistory(timeline) {
  return timeline.flatMap((event) => {
    if (event.type === 'user_prompt') return [{ role: 'learner', content: event.data.message }];
    if (event.type === 'ai_response') return [{ role: 'teammate', content: event.data.message }];
    return [];
  });
}

module.exports = { toPublicTimelineEvent, getPublicTimeline, buildTeammateHistory };
