const { GoogleGenAI } = require('@google/genai');
const teammatePrompt = require('../prompts/teammate');
const evaluatorPrompt = require('../prompts/evaluator');
const { AppError } = require('./errors');
const { retryAI } = require('./retry');
const { redactSensitiveText } = require('./safety');

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
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
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
    async teammate(history, message) {
      const transcript = history.map((item) => `${item.role}: ${item.content}`).join('\n');
      const response = await generateContent({
        model,
        contents: `Visible conversation so far:\n${transcript || '(none)'}\n\nCurrent learner message:\n${message}`,
        config: { systemInstruction: teammatePrompt }
      });
      const text = typeof response.text === 'string' ? response.text.trim() : '';
      if (!text) throw new AppError(503, 'AI service temporarily unavailable.', 'ai_empty_response');
      return redactSensitiveText(text);
    },
    async evaluate(evidence, correction = false) {
      const correctionInstruction = correction
        ? '\nYour previous output was invalid. Return only a complete response matching the requested schema.'
        : '';
      const response = await generateContent({
        model,
        contents: JSON.stringify(evidence),
        config: {
          systemInstruction: `${evaluatorPrompt}${correctionInstruction}`,
          responseMimeType: 'application/json',
          responseJsonSchema: receiptSchema
        }
      });
      return safeParseJson(response.text);
    }
  };
}

module.exports = { createAiService, receiptSchema, safeParseJson };
