const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const request = require('supertest');
const { createDatabase } = require('../db/db');
const { createApp } = require('../server');
const { toEvaluationTimelineEvent, toPublicTimelineEvent } = require('../utils/timeline');
const { isCauseQuestion } = require('../utils/validation');
const { AppError } = require('../utils/errors');
const { createAiService, receiptSchema } = require('../utils/gemini');
const { validateEvaluation } = require('../routes/receipt');

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

function createScenarioHarness(scenario) {
  const db = createDatabase(':memory:');
  let evaluatorInput;
  const ai = {
    teammate: async () => 'Inspect the observed request failures before settling on a cause.',
    evaluate: async (input) => {
      evaluatorInput = input;
      const eventId = (...types) => input.events.find((event) => types.includes(event.type)).event_id;
      return {
        scores: scenario.scores,
        evidence: [
          { dimension: 'technical_execution', event_ids: [eventId('submission')], explanation: 'Learner final solution event.' },
          { dimension: 'problem_framing', event_ids: [eventId('evidence_collected'), eventId('user_prompt')], explanation: 'Learner-selected evidence and investigation question events.' },
          { dimension: 'ai_verification', event_ids: [eventId('suggestion_offered'), eventId('suggestion_verified')], explanation: 'AI suggestion and learner verification events.' },
          { dimension: 'independent_judgment', event_ids: [eventId('suggestion_accepted', 'suggestion_rejected'), eventId('follow_up_answer')], explanation: 'Learner decision and independent explanation events.' },
          { dimension: 'communication', event_ids: [eventId('submission'), eventId('follow_up_answer')], explanation: 'Learner submission and independent explanation events.' }
        ],
        narrative_summary: scenario.summary
      };
    }
  };
  return { db, app: createApp({ db, ai }), getEvaluatorInput: () => evaluatorInput };
}

async function runEvaluationScenario(scenario) {
  const { db, app, getEvaluatorInput } = createScenarioHarness(scenario);
  try {
    const started = await request(app).post('/api/session/start').send({}).expect(201);
    const sessionId = started.body.session_id;
    const chat = await request(app).post('/api/chat').send({
      session_id: sessionId,
      message: "What's the issue?"
    }).expect(200);
    const suggestionId = chat.body.suggestion_id;
    assert.equal(chat.body.suggestion_offered, true);

    await request(app).post('/api/event/log').send({
      session_id: sessionId,
      type: 'evidence_collected',
      data: {
        evidence_id: randomUUID(),
        title: 'SDK validation failures after migration',
        description: 'Repeated 400 validation errors show amount_cents is missing after the SDK migration.',
        source: 'Learner investigation',
        type: 'request_error',
        relation: 'contradicts',
        linked_hypothesis_id: suggestionId,
        created_by: 'learner'
      }
    }).expect(201);
    await request(app).post('/api/event/log').send({
      session_id: sessionId,
      type: scenario.decision === 'accepted' ? 'suggestion_accepted' : 'suggestion_rejected',
      data: { suggestion_id: suggestionId, reason: scenario.decisionReason }
    }).expect(201);
    await request(app).post('/api/event/log').send({
      session_id: sessionId,
      type: 'suggestion_verified',
      data: { suggestion_id: suggestionId, decision: scenario.decision, reason: scenario.verificationReason }
    }).expect(201);
    await request(app).post('/api/submission').send({
      session_id: sessionId,
      solution: scenario.solution,
      justification: scenario.justification
    }).expect(200);
    await request(app).post('/api/submission/follow-up').send({
      session_id: sessionId,
      answer: scenario.followUpAnswer
    }).expect(200);
    const receipt = await request(app).post('/api/receipt/generate').send({ session_id: sessionId }).expect(200);
    return { evaluatorInput: getEvaluatorInput(), receipt: receipt.body };
  } finally {
    db.close();
  }
}

function assertReceiptEvidenceIsTraceable(receipt) {
  const sequenceById = new Map(receipt.event_timeline.map((event) => [event.event_id, event.sequence]));
  for (const item of receipt.evidence) {
    assert.ok(item.event_ids.length > 0);
    assert.deepEqual(item.event_sequences, item.event_ids.map((id) => sequenceById.get(id)));
  }
}

test('deterministic evaluator fixtures preserve distinct evidence-grounded outcomes for judgment scenarios', async () => {
  const scenarioA = {
    decision: 'rejected',
    decisionReason: 'The repeated 400 errors and missing amount_cents point to an SDK contract mismatch, not a database timeout.',
    verificationReason: 'The collected validation evidence contradicts the unsupported timeout hypothesis.',
    solution: 'Update the SDK migration payload to provide amount_cents and add a regression test for the payment request contract.',
    justification: 'The 400 validation errors began after the SDK migration and explicitly identify the missing amount_cents field.',
    followUpAnswer: 'I rejected the timeout hypothesis because the recorded 400 validation errors identify a request contract mismatch. I chose the payload fix because it directly addresses amount_cents.',
    scores: { technical_execution: 90, problem_framing: 91, ai_verification: 94, independent_judgment: 93, communication: 86 },
    summary: 'The learner connected contradictory evidence to a contract-mismatch solution.'
  };
  const scenarioB = {
    decision: 'accepted',
    decisionReason: 'The database timeout explanation sounds likely.',
    verificationReason: 'I accepted the teammate suggestion without reconciling the 400 errors.',
    solution: 'Increase the database timeout for the payment service.',
    justification: 'The database timeout hypothesis should resolve checkout failures.',
    followUpAnswer: 'I trusted the AI hypothesis and selected the timeout increase.',
    scores: { technical_execution: 38, problem_framing: 42, ai_verification: 31, independent_judgment: 29, communication: 55 },
    summary: 'The learner accepted a hypothesis that conflicted with the collected evidence.'
  };
  const scenarioC = {
    decision: 'rejected',
    decisionReason: 'I rejected it because database timeouts are usually boring.',
    verificationReason: 'The hypothesis did not feel right to me.',
    solution: 'Inspect the SDK migration request payload and restore amount_cents.',
    justification: 'The SDK migration should be reviewed.',
    followUpAnswer: 'I rejected the hypothesis because it did not feel right, not because of the recorded validation errors.',
    scores: { technical_execution: 74, problem_framing: 70, ai_verification: 59, independent_judgment: 57, communication: 66 },
    summary: 'The learner rejected the hypothesis but did not ground the reasoning in the collected evidence.'
  };

  const [correct, blindAcceptance, unsupportedReasoning] = await Promise.all([
    runEvaluationScenario(scenarioA),
    runEvaluationScenario(scenarioB),
    runEvaluationScenario(scenarioC)
  ]);

  assert.ok(correct.receipt.scores.ai_verification >= 85);
  assert.ok(correct.receipt.scores.independent_judgment >= 85);
  assert.ok(correct.receipt.scores.problem_framing >= 85);
  assert.ok(correct.receipt.scores.technical_execution >= 80);
  assert.ok(correct.receipt.scores.ai_verification - blindAcceptance.receipt.scores.ai_verification >= 40);
  assert.ok(correct.receipt.scores.independent_judgment - blindAcceptance.receipt.scores.independent_judgment >= 40);
  assert.ok(correct.receipt.scores.problem_framing > blindAcceptance.receipt.scores.problem_framing);
  assert.ok(correct.receipt.scores.technical_execution > blindAcceptance.receipt.scores.technical_execution);
  assert.ok(correct.receipt.scores.ai_verification - unsupportedReasoning.receipt.scores.ai_verification >= 25);
  assert.ok(correct.receipt.scores.independent_judgment - unsupportedReasoning.receipt.scores.independent_judgment >= 25);

  for (const result of [correct, blindAcceptance, unsupportedReasoning]) {
    assertReceiptEvidenceIsTraceable(result.receipt);
    assert.ok(result.receipt.event_timeline.some((event) => event.type === 'evidence_collected'));
    assert.ok(result.evaluatorInput.events.some((event) => event.type === 'evidence_collected' && event.evidence_attribution.category === 'learner_selected_evidence'));
    assert.ok(result.evaluatorInput.events.some((event) => event.type === 'suggestion_offered' && event.evidence_attribution.actor === 'ai_teammate'));
  }
});

test('cause matching recognizes equivalent investigation questions without matching unrelated statements', () => {
  for (const message of [
    'What caused the drop?',
    'What is the root cause?',
    'What is causing this?',
    "What's the issue?",
    "What's causing the drop?",
    'Why is checkout failing?',
    'What do you think is wrong?',
    'Can we identify the cause?',
    'Can you help me find the issue?'
  ]) {
    assert.equal(isCauseQuestion(message), true, message);
  }
  for (const message of [
    'I can fix the issue after lunch.',
    'The cause might be unrelated.',
    'Can you summarize the cart component?',
    'We should investigate more tomorrow.'
  ]) {
    assert.equal(isCauseQuestion(message), false, message);
  }
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

test('evaluation timeline labels persisted evidence by actor without changing the public receipt event', () => {
  const sourceEvent = {
    id: 'event-3', sequence: 5, timestamp: '2026-01-01', type: 'ai_response',
    data: JSON.stringify({ message: 'Inspect payment errors first.' })
  };
  const evaluationEvent = toEvaluationTimelineEvent(sourceEvent);
  const publicEvent = toPublicTimelineEvent(sourceEvent);

  assert.deepEqual(evaluationEvent.evidence_attribution, { actor: 'ai_teammate', category: 'investigation_information' });
  assert.equal(Object.hasOwn(publicEvent, 'evidence_attribution'), false);
});

test('evaluation evidence must reference a concrete persisted timeline event', () => {
  const timeline = [{ event_id: 'event-recorded', sequence: 4, type: 'suggestion_verified', data: {} }];
  const baseEvaluation = {
    scores: { technical_execution: 60, problem_framing: 60, ai_verification: 60, independent_judgment: 60, communication: 60 },
    evidence: [{ dimension: 'ai_verification', event_ids: ['event-recorded'], explanation: 'Learner verification event.' }],
    narrative_summary: 'Evidence is limited but traceable.'
  };

  assert.ok(validateEvaluation(baseEvaluation, timeline));
  assert.equal(validateEvaluation({ ...baseEvaluation, evidence: [{ ...baseEvaluation.evidence[0], event_ids: ['invented-event'] }] }, timeline), null);
});

test('deliberately collected evidence is persisted through the generic event log with its full payload', async (t) => {
  const { db, app } = createHarness();
  t.after(() => db.close());
  const started = await request(app).post('/api/session/start').send({}).expect(201);
  const evidence = {
    evidence_id: randomUUID(),
    title: 'Payment failure timing',
    description: 'Payment failures increased beginning July 14.',
    source: 'Mission signal',
    type: 'data',
    relation: 'contradicts',
    linked_hypothesis_id: null,
    created_by: 'learner'
  };

  const logged = await request(app).post('/api/event/log').send({
    session_id: started.body.session_id,
    type: 'evidence_collected',
    data: evidence
  }).expect(201);
  const event = db.getEvents(started.body.session_id).find((item) => item.id === logged.body.event_id);
  const publicEvent = toPublicTimelineEvent(event);
  const evaluationEvent = toEvaluationTimelineEvent(event);
  const { linked_hypothesis_id, ...publicEvidence } = evidence;

  assert.equal(event.type, 'evidence_collected');
  assert.deepEqual(JSON.parse(event.data), evidence);
  assert.deepEqual(publicEvent.data, publicEvidence);
  assert.deepEqual(evaluationEvent.evidence_attribution, { actor: 'learner', category: 'learner_selected_evidence' });
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
  await request(app).post('/api/event/log').send({
    session_id: sessionId,
    type: 'evidence_collected',
    data: {
      evidence_id: randomUUID(),
      title: 'Payment failure timing',
      description: 'The recorded signal begins on July 14.',
      source: 'Mission signal',
      type: 'data',
      relation: 'contradicts',
      linked_hypothesis_id: suggestionId,
      created_by: 'learner'
    }
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
  assert.ok(timeline.some((event) => event.type === 'evidence_collected'));
  assert.ok(timeline.some((event) => event.type === 'submission'));
  assert.ok(timeline.some((event) => event.type === 'follow_up_answer'));
  assert.equal(JSON.stringify(timeline).includes('fifth_message'), false);
  assert.equal(JSON.stringify(receipt.body).includes('system_prompt'), false);
  assert.deepEqual(receipt.body.evidence[0].event_sequences.length, receipt.body.evidence[0].event_ids.length);

  const evaluatorTypes = getEvaluatorInput().events.map((event) => event.type);
  for (const type of ['user_prompt', 'ai_response', 'suggestion_offered', 'suggestion_verified', 'evidence_collected', 'submission', 'follow_up_answer']) {
    assert.ok(evaluatorTypes.includes(type));
  }
  assert.deepEqual(getEvaluatorInput().events.map((event) => event.sequence), [...getEvaluatorInput().events.map((event) => event.sequence)].sort((a, b) => a - b));
  const aiEvidence = getEvaluatorInput().events.find((event) => event.type === 'ai_response');
  const learnerDecisionEvidence = getEvaluatorInput().events.find((event) => event.type === 'suggestion_rejected');
  const collectedEvidence = getEvaluatorInput().events.find((event) => event.type === 'evidence_collected');
  const learnerExplanationEvidence = getEvaluatorInput().events.find((event) => event.type === 'follow_up_answer');
  assert.deepEqual(aiEvidence.evidence_attribution, { actor: 'ai_teammate', category: 'investigation_information' });
  assert.deepEqual(learnerDecisionEvidence.evidence_attribution, { actor: 'learner', category: 'decision' });
  assert.deepEqual(collectedEvidence.evidence_attribution, { actor: 'learner', category: 'learner_selected_evidence' });
  assert.deepEqual(learnerExplanationEvidence.evidence_attribution, { actor: 'learner', category: 'independent_explanation' });

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
  assert.equal(requests[1].config.systemInstruction.includes('evidence_attribution.actor'), true);
  assert.equal(requests[1].config.systemInstruction.includes('AI-provided context'), true);
});
