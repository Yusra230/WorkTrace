const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createDatabase } = require('../db/db');
const { createApp } = require('../server');
const { toPublicTimelineEvent } = require('../utils/timeline');
const { isCauseQuestion } = require('../utils/validation');
const { AppError } = require('../utils/errors');
const { createAiService, receiptSchema } = require('../utils/gemini');

function createHarness() {
  const db = createDatabase(':memory:');
  let evaluatorInput;
  const ai = {
    teammate: async () => 'Inspect the available error signals before committing to a cause.',
    evaluate: async (input) => {
      evaluatorInput = input;
      const verification = input.events.find((event) => event.type === 'suggestion_verified');
      const submission = input.events.find((event) => event.type === 'submission');
      return {
        scores: {
          technical_execution: 80,
          problem_framing: 81,
          ai_verification: 95,
          independent_judgment: 88,
          communication: 84
        },
        evidence: [
          {
            dimension: 'ai_verification',
            event_ids: [verification.event_id],
            explanation: 'The learner explicitly verified the suggestion before accepting it.'
          },
          {
            dimension: 'technical_execution',
            event_ids: [submission.event_id],
            explanation: 'The final solution identifies a concrete investigation path.'
          }
        ],
        narrative_summary: 'The learner demonstrated careful AI verification.'
      };
    }
  };
  return { db, app: createApp({ db, ai }), getEvaluatorInput: () => evaluatorInput };
}

test('cause matching is targeted', () => {
  assert.equal(isCauseQuestion('What caused the drop?'), true);
  assert.equal(isCauseQuestion('What is the root cause?'), true);
  assert.equal(isCauseQuestion('What is causing this?'), true);
  assert.equal(isCauseQuestion('Can you help me find the issue?'), true);
  assert.equal(isCauseQuestion('I can fix the issue after lunch.'), false);
  assert.equal(isCauseQuestion('The cause might be unrelated.'), false);
});

test('public serializer omits private event fields', () => {
  const event = toPublicTimelineEvent({
    id: 'event-1', sequence: 3, timestamp: '2026-01-01', type: 'suggestion_offered',
    data: JSON.stringify({ suggestion_id: 'suggestion-1', suggestion: 'Visible suggestion', trigger: 'fifth_message', system_prompt: 'secret' })
  });
  assert.deepEqual(event.data, { suggestion_id: 'suggestion-1', suggestion: 'Visible suggestion' });
});

test('public serializer redacts API-key-like text', () => {
  const event = toPublicTimelineEvent({
    id: 'event-2', sequence: 4, timestamp: '2026-01-01', type: 'user_prompt',
    data: JSON.stringify({ message: 'Please use sk-proj-1234567890abcdefgh.' })
  });
  assert.equal(event.data.message.includes('sk-proj-1234567890abcdefgh'), false);
  assert.equal(event.data.message.includes('[REDACTED]'), true);
});

test('complete flow returns an ordered sanitized receipt and evaluator timeline', async (t) => {
  const { db, app, getEvaluatorInput } = createHarness();
  t.after(() => db.close());

  const started = await request(app).post('/api/session/start').send({}).expect(201);
  const sessionId = started.body.session_id;
  let chat;
  for (let count = 0; count < 5; count += 1) {
    chat = await request(app).post('/api/chat').send({ session_id: sessionId, message: `Investigation question ${count + 1}` }).expect(200);
  }
  assert.equal(chat.body.suggestion_offered, true);
  const suggestionId = chat.body.suggestion_id;

  await request(app).post('/api/event/log').send({
    session_id: sessionId,
    type: 'suggestion_rejected',
    data: { suggestion_id: suggestionId, reason: 'The observed failure spike needs direct verification.' }
  }).expect(201);
  await request(app).post('/api/event/log').send({
    session_id: sessionId,
    type: 'suggestion_verified',
    data: { suggestion_id: suggestionId, decision: 'rejected', reason: 'The available evidence does not support it.' }
  }).expect(201);
  await request(app).post('/api/submission').send({
    session_id: sessionId,
    solution: 'Inspect the July 14 payment integration change and error codes.',
    justification: 'The timing aligns with the payment-failure spike.'
  }).expect(200);
  await request(app).post('/api/submission/follow-up').send({
    session_id: sessionId,
    answer: 'I rejected the suggestion because the timeline did not prove a database timeout.'
  }).expect(200);

  const receipt = await request(app).post('/api/receipt/generate').send({ session_id: sessionId }).expect(200);
  const timeline = receipt.body.event_timeline;
  assert.deepEqual(timeline.map((event) => event.sequence), [...timeline.map((event) => event.sequence)].sort((a, b) => a - b));
  assert.ok(timeline.some((event) => event.type === 'user_prompt'));
  assert.ok(timeline.some((event) => event.type === 'ai_response'));
  assert.ok(timeline.some((event) => event.type === 'suggestion_offered'));
  assert.ok(timeline.some((event) => event.type === 'suggestion_verified'));
  assert.ok(timeline.some((event) => event.type === 'submission'));
  assert.ok(timeline.some((event) => event.type === 'follow_up_answer'));
  assert.equal(JSON.stringify(timeline).includes('fifth_message'), false);
  assert.equal(JSON.stringify(receipt.body).includes('system_prompt'), false);
  assert.deepEqual(receipt.body.evidence[0].event_sequences.length, receipt.body.evidence[0].event_ids.length);

  const evaluatorTypes = getEvaluatorInput().events.map((event) => event.type);
  for (const type of ['user_prompt', 'ai_response', 'suggestion_offered', 'suggestion_verified', 'submission', 'follow_up_answer']) {
    assert.ok(evaluatorTypes.includes(type));
  }
  assert.deepEqual(getEvaluatorInput().events.map((event) => event.sequence), [...getEvaluatorInput().events.map((event) => event.sequence)].sort((a, b) => a - b));

  const fetched = await request(app).get(`/api/receipt/${sessionId}`).expect(200);
  assert.deepEqual(fetched.body, receipt.body);
});

test('receipt cannot be generated before submission and follow-up', async (t) => {
  const { db, app } = createHarness();
  t.after(() => db.close());
  const started = await request(app).post('/api/session/start').send({}).expect(201);
  await request(app).post('/api/receipt/generate').send({ session_id: started.body.session_id }).expect(409);
});

test('AI failures preserve learner evidence and return a controlled error', async (t) => {
  const db = createDatabase(':memory:');
  t.after(() => db.close());
  const app = createApp({
    db,
    ai: {
      teammate: async () => { throw new AppError(503, 'AI service temporarily unavailable.', 'ai_unavailable'); },
      evaluate: async () => null
    }
  });
  const started = await request(app).post('/api/session/start').send({}).expect(201);
  const result = await request(app).post('/api/chat').send({
    session_id: started.body.session_id,
    message: 'What changed recently?'
  }).expect(503);
  assert.deepEqual(result.body, { error: true, message: 'AI service temporarily unavailable.' });
  assert.deepEqual(db.getEvents(started.body.session_id).map((event) => event.type), ['session_started', 'user_prompt']);
});

test('Gemini provider uses system instructions and structured evaluator output', async () => {
  const requests = [];
  const client = {
    models: {
      generateContent: async (request) => {
        requests.push(request);
        return { text: requests.length === 1 ? 'Inspect the evidence first.' : '{"scores":{},"evidence":[],"narrative_summary":"summary"}' };
      }
    }
  };
  const ai = createAiService({ client, model: 'gemini-test-model' });
  const teammate = await ai.teammate([{ role: 'learner', content: 'What changed?' }], 'Where should I look?');
  const evaluator = await ai.evaluate({ mission: {}, events: [] });

  assert.equal(teammate, 'Inspect the evidence first.');
  assert.deepEqual(evaluator, { scores: {}, evidence: [], narrative_summary: 'summary' });
  assert.equal(requests[0].model, 'gemini-test-model');
  assert.equal(typeof requests[0].config.systemInstruction, 'string');
  assert.equal(requests[0].contents.includes('Current learner message:'), true);
  assert.equal(requests[1].config.responseMimeType, 'application/json');
  assert.deepEqual(requests[1].config.responseJsonSchema, receiptSchema);
});
