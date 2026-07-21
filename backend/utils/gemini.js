const { GoogleGenAI } = require('@google/genai');
const teammatePrompt = require('../prompts/teammate');
const evaluatorPrompt = require('../prompts/evaluator');
const { AppError } = require('./errors');
const { retryAI } = require('./retry');
const { redactSensitiveText } = require('./safety');

const EVALUATOR_TEMPERATURE = 0;
const MAX_TEAMMATE_RESPONSE_WORDS = 200;

const teammateSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['message', 'suggestion'],
  properties: {
    message: { type: 'string' },
    suggestion: { type: 'string' }
  }
};

function requestsDetail(message) {
  return /\b(detail(?:ed)?|in[-\s]?depth|thorough(?:ly)?|comprehensive(?:ly)?|step[-\s]?by[-\s]?step)\b/i.test(message || '');
}

function constrainTeammateResponse(text, message) {
  if (requestsDetail(message)) return text;
  const words = text.match(/\S+/g) || [];
  if (words.length <= MAX_TEAMMATE_RESPONSE_WORDS) return text;
  return `${words.slice(0, MAX_TEAMMATE_RESPONSE_WORDS).join(' ')}…`;
}

function parseTeammateResponse(text, message) {
  const parsed = safeParseJson(text);
  if (!parsed || typeof parsed.message !== 'string' || typeof parsed.suggestion !== 'string') return null;
  const response = constrainTeammateResponse(parsed.message.trim(), message);
  if (!response) return null;
  return {
    message: response,
    suggestion: parsed.suggestion.trim() || null
  };
}

const receiptSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['scores', 'evidence', 'narrative_summary'],
  properties: {
    scores: {
      type: 'object',
      additionalProperties: false,
      required: ['technical_execution', 'problem_framing', 'ai_verification', 'independent_judgment', 'communication'],
      properties: {
        technical_execution: { type: 'number', minimum: 0, maximum: 100 },
        problem_framing: { type: 'number', minimum: 0, maximum: 100 },
        ai_verification: { type: 'number', minimum: 0, maximum: 100 },
        independent_judgment: { type: 'number', minimum: 0, maximum: 100 },
        communication: { type: 'number', minimum: 0, maximum: 100 }
      }
    },
    evidence: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['dimension', 'event_ids', 'explanation'],
        properties: {
          dimension: {
            type: 'string',
            enum: ['technical_execution', 'problem_framing', 'ai_verification', 'independent_judgment', 'communication']
          },
          event_ids: { type: 'array', items: { type: 'string' } },
          explanation: { type: 'string' }
        }
      }
    },
    narrative_summary: { type: 'string' }
  }
};

function safeParseJson(text) {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenced) {
      try {
        return JSON.parse(fenced[1]);
      } catch {
        return null;
      }
    }
    const start = trimmed.indexOf('{');
    if (start < 0) return null;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < trimmed.length; index += 1) {
      const character = trimmed[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (character === '\\') escaped = true;
        else if (character === '"') inString = false;
      } else if (character === '"') {
        inString = true;
      } else if (character === '{') {
        depth += 1;
      } else if (character === '}') {
        depth -= 1;
        if (depth === 0) {
          try {
            return JSON.parse(trimmed.slice(start, index + 1));
          } catch {
            return null;
          }
        }
      }
    }
    return null;
  }
}

function learnerEventIds(events, categories) {
  return (Array.isArray(events) ? events : [])
    .filter((event) => event?.evidence_attribution?.actor === 'learner' && categories.includes(event.evidence_attribution.category))
    .map((event) => event.event_id)
    .filter((eventId) => typeof eventId === 'string');
}

function evaluatorEventIdInstruction(evaluationInput) {
  const events = evaluationInput?.events;
  const ids = (categories) => JSON.stringify(learnerEventIds(events, categories));
  return `\n\nUse only exact event_id values from this evaluation input. Required learner-owned anchors by dimension:\n- technical_execution: one final_solution ID from ${ids(['final_solution'])}\n- problem_framing: one investigation_question_or_reasoning or learner_selected_evidence ID from ${ids(['investigation_question_or_reasoning', 'learner_selected_evidence'])}\n- ai_verification: one decision or verification ID from ${ids(['decision', 'verification'])}\n- independent_judgment: BOTH one decision ID from ${ids(['decision'])} AND one independent_explanation ID from ${ids(['independent_explanation'])}\n- communication: one final_solution or independent_explanation ID from ${ids(['final_solution', 'independent_explanation'])}`;
}

function createAiService({ client, model = process.env.GEMINI_MODEL || 'gemini-2.5-flash' } = {}) {
  const getClient = () => {
    if (client) return client;
    if (!process.env.GEMINI_API_KEY) {
      throw new AppError(503, 'AI service temporarily unavailable.', 'ai_not_configured');
    }
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    return client;
  };

  const generateContent = (request) => retryAI(() => getClient().models.generateContent(request));

  return {
    getEvaluationMetadata() {
      return { model, temperature: EVALUATOR_TEMPERATURE };
    },
    async teammate(history, message, groundedMissionContext = {}) {
      const transcript = history.map((item) => `${item.role}: ${item.content}`).join('\n');
      const response = await generateContent({
        model,
        contents: `Grounded mission context (the complete available workspace and mission signals):\n${JSON.stringify(groundedMissionContext)}\n\nVisible conversation so far:\n${transcript || '(none)'}\n\nCurrent learner message:\n${message}`,
        config: {
          systemInstruction: teammatePrompt,
          responseMimeType: 'application/json',
          responseJsonSchema: teammateSchema
        }
      });
      const teammateResponse = typeof response.text === 'string' ? parseTeammateResponse(response.text, message) : null;
      if (!teammateResponse) throw new AppError(503, 'AI service temporarily unavailable.', 'ai_empty_response');
      return {
        message: redactSensitiveText(teammateResponse.message),
        suggestion: teammateResponse.suggestion ? redactSensitiveText(teammateResponse.suggestion) : null
      };
    },
    async evaluate(evidence, correction = false) {
      const correctionInstruction = correction
        ? '\nYour previous output was invalid. Return only a complete response matching the requested schema.'
        : '';
      const response = await generateContent({
        model,
        contents: JSON.stringify(evidence),
        config: {
          systemInstruction: `${evaluatorPrompt}${evaluatorEventIdInstruction(evidence)}${correctionInstruction}`,
          temperature: EVALUATOR_TEMPERATURE,
          responseMimeType: 'application/json',
          responseJsonSchema: receiptSchema
        }
      });
      return safeParseJson(response.text);
    }
  };
}

module.exports = { createAiService, evaluatorEventIdInstruction, parseTeammateResponse, receiptSchema, safeParseJson, teammateSchema, EVALUATOR_TEMPERATURE, MAX_TEAMMATE_RESPONSE_WORDS, constrainTeammateResponse };
