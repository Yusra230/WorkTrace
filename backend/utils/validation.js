const { AppError } = require('./errors');
const { isUuid } = require('./uuid');
const { redactSensitiveText } = require('./safety');

const MAX = {
  message: 4000,
  solution: 10000,
  justification: 10000,
  followUp: 10000,
  rationale: 2000,
  decision: 100,
  evidenceTitle: 120,
  evidenceDescription: 1000,
  evidenceSource: 120,
  evidenceType: 100
};

const allowedEventTypes = new Set([
  'suggestion_accepted',
  'suggestion_rejected',
  'suggestion_verified',
  'user_decision',
  'evidence_collected'
]);

function requireObject(value, label = 'Request body') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError(400, `${label} must be a JSON object.`, 'validation_error');
  }
  return value;
}

function requireString(value, field, maxLength) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError(400, `${field} must be a non-empty string.`, 'validation_error');
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new AppError(400, `${field} must be ${maxLength} characters or fewer.`, 'validation_error');
  }
  return redactSensitiveText(trimmed);
}

function requireSessionId(value) {
  if (typeof value !== 'string' || !isUuid(value)) {
    throw new AppError(400, 'session_id must be a valid UUID.', 'validation_error');
  }
  return value;
}

function validateChat(body) {
  requireObject(body);
  return {
    sessionId: requireSessionId(body.session_id),
    message: requireString(body.message, 'message', MAX.message)
  };
}

function validateSubmission(body) {
  requireObject(body);
  return {
    sessionId: requireSessionId(body.session_id),
    solution: requireString(body.solution, 'solution', MAX.solution),
    justification: requireString(body.justification, 'justification', MAX.justification)
  };
}

function validateFollowUp(body) {
  requireObject(body);
  return {
    sessionId: requireSessionId(body.session_id),
    answer: requireString(body.answer, 'answer', MAX.followUp)
  };
}

function validateEvent(body) {
  requireObject(body);
  const sessionId = requireSessionId(body.session_id);
  if (!allowedEventTypes.has(body.type)) {
    throw new AppError(400, 'Unsupported event type.', 'validation_error');
  }
  const data = requireObject(body.data, 'data');
  const type = body.type;

  if (type.startsWith('suggestion_')) {
    if (typeof data.suggestion_id !== 'string' || !isUuid(data.suggestion_id)) {
      throw new AppError(400, 'data.suggestion_id must be a valid UUID.', 'validation_error');
    }
    const safeData = { suggestion_id: data.suggestion_id };
    if (data.reason !== undefined) safeData.reason = requireString(data.reason, 'data.reason', MAX.rationale);
    if (type === 'suggestion_verified') {
      if (!['accepted', 'rejected'].includes(data.decision)) {
        throw new AppError(400, 'data.decision must be accepted or rejected.', 'validation_error');
      }
      safeData.decision = data.decision;
    }
    return { sessionId, type, data: safeData };
  }

  if (type === 'user_decision') {
    const safeData = { decision: requireString(data.decision, 'data.decision', MAX.decision) };
    if (data.reason !== undefined) safeData.reason = requireString(data.reason, 'data.reason', MAX.rationale);
    return { sessionId, type, data: safeData };
  }

  if (type === 'evidence_collected') {
    if (data.evidence_id !== undefined && (typeof data.evidence_id !== 'string' || !isUuid(data.evidence_id))) {
      throw new AppError(400, 'data.evidence_id must be a valid UUID.', 'validation_error');
    }
    if (!['supports', 'contradicts', 'neutral'].includes(data.relation)) {
      throw new AppError(400, 'data.relation must be supports, contradicts, or neutral.', 'validation_error');
    }
    if (!['learner', 'ai_teammate', 'system'].includes(data.created_by)) {
      throw new AppError(400, 'data.created_by must be learner, ai_teammate, or system.', 'validation_error');
    }
    let linkedHypothesisId = null;
    if (data.linked_hypothesis_id !== null && data.linked_hypothesis_id !== undefined) {
      linkedHypothesisId = requireSessionId(data.linked_hypothesis_id);
    }
    return {
      sessionId,
      type,
      data: {
        title: requireString(data.title, 'data.title', MAX.evidenceTitle),
        description: requireString(data.description, 'data.description', MAX.evidenceDescription),
        source: requireString(data.source, 'data.source', MAX.evidenceSource),
        type: requireString(data.type, 'data.type', MAX.evidenceType),
        relation: data.relation,
        linked_hypothesis_id: linkedHypothesisId,
        created_by: data.created_by
      }
    };
  }
}

function isCauseQuestion(message) {
  const normalized = message.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
  const patterns = [
    /^(?:what|can you tell me what|do you know what) (?:is |was )?(?:causing|caused) (?:this|the drop|the issue|the problem|drop|issue|problem)\??$/,
    /^what(?:'s| is)? (?:the )?(?:issue|problem|root cause)\??$/,
    /^what(?:'s| is) causing (?:this|the drop|the issue|the problem|checkout)\??$/,
    /^why (?:is|are) (?:the )?(?:checkout|checkout flow|payment|payments) failing\??$/,
    /^what do you think (?:is|went) wrong\??$/,
    /^can (?:we|you) (?:help (?:me )?)?(?:identify|find) (?:the )?(?:cause|root cause|issue|problem)\??$/,
    /^what should i fix\??$/,
    /^can you help (?:me )?(?:find|identify) (?:the )?(?:issue|problem|cause|root cause)\??$/,
    /^can you help me find what(?:'s| is) causing (?:this|the drop|the issue|the problem)\??$/
  ];
  return patterns.some((pattern) => pattern.test(normalized));
}

module.exports = {
  MAX,
  requireObject,
  requireString,
  requireSessionId,
  validateChat,
  validateSubmission,
  validateFollowUp,
  validateEvent,
  isCauseQuestion
};
