const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const request = require('supertest');
const { createDatabase } = require('../db/db');
const { createApp } = require('../server');
const { toEvaluationTimelineEvent, toPublicTimelineEvent } = require('../utils/timeline');
const { isCauseQuestion } = require('../utils/validation');
const { AppError } = require('../utils/errors');
const { createAiService, evaluatorEventIdInstruction, MAX_TEAMMATE_RESPONSE_WORDS, receiptSchema, safeParseJson } = require('../utils/gemini');
const { EVALUATOR_CONTRACT_VERSION, fingerprintEvaluationInput, inspectEvaluation, publicReceipt, validateEvaluation } = require('../routes/receipt');

function eventId(input, ...types) {
  const event = input.events.find((item) => types.includes(item.type));
  assert.ok(event, `Expected an event of type ${types.join(' or ')}`);
  return event.event_id;
}

function completeEvidenceMappings(input) {
  return [
    { dimension: 'technical_execution', event_ids: [eventId(input, 'submission')], explanation: 'Learner final solution event.' },
    { dimension: 'problem_framing', event_ids: [eventId(input, 'evidence_collected'), eventId(input, 'user_prompt')], explanation: 'Learner-selected evidence and investigation question events.' },
    { dimension: 'ai_verification', event_ids: [eventId(input, 'suggestion_offered'), eventId(input, 'suggestion_verified')], explanation: 'AI suggestion with learner verification event.' },
    { dimension: 'independent_judgment', event_ids: [eventId(input, 'suggestion_accepted', 'suggestion_rejected', 'user_decision'), eventId(input, 'follow_up_answer')], explanation: 'Learner decision and independent explanation events.' },
    { dimension: 'communication', event_ids: [eventId(input, 'submission'), eventId(input, 'follow_up_answer')], explanation: 'Learner submission and independent explanation events.' }
  ];
}

function completeEvaluation(input, overrides = {}) {
  return {
    scores: { technical_execution: 80, problem_framing: 81, ai_verification: 82, independent_judgment: 83, communication: 84 },
    evidence: completeEvidenceMappings(input),
    narrative_summary: 'The learner produced a traceable evidence-based investigation.',
    ...overrides
  };
}

function createHarness() {
  const db = createDatabase(':memory:');
  let evaluatorInput;
  let evaluationCalls = 0;
  const teammateCalls = [];
  const ai = {
    teammate: async (...args) => {
      teammateCalls.push(args);
      return 'Inspect the available error signals before committing to a cause.';
    },
    evaluate: async (input) => {
      evaluatorInput = input;
      evaluationCalls += 1;
      return completeEvaluation(input);
    },
    getEvaluationMetadata: () => ({ model: 'test-evaluator', temperature: 0 })
  };
  return {
    db,
    app: createApp({ db, ai }),
    getEvaluationCalls: () => evaluationCalls,
    getEvaluatorInput: () => evaluatorInput,
    getTeammateCalls: () => teammateCalls
  };
}

test('mission preview returns the existing public mission without creating a session', async (t) => {
  const { app, db } = createHarness();
  t.after(() => db.close());

  const response = await request(app).get('/api/session/mission').expect(200);

  assert.equal(response.body.mission.id, 'nova-commerce-checkout');
  assert.equal(response.body.mission.company, 'NovaCommerce');
  assert.equal(response.body.mission.codebase_files.includes('backend/routes/checkout.js'), true);
  assert.equal(db.raw.prepare('SELECT COUNT(*) AS total FROM sessions').get().total, 0);
});

function createScenarioHarness(scenario) {
  const db = createDatabase(':memory:');
  let evaluatorInput;
  const ai = {
    teammate: async () => 'Inspect the observed request failures before settling on a cause.',
    evaluate: async (input) => {
      evaluatorInput = input;
      return {
        scores: scenario.scores,
        evidence: completeEvidenceMappings(input),
        narrative_summary: scenario.summary
      };
    },
    getEvaluationMetadata: () => ({ model: 'scenario-evaluator', temperature: 0 })
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
        created_by: scenario.evidenceCreatedBy || 'learner'
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
    if (scenario.includeUserDecision) {
      await request(app).post('/api/event/log').send({
        session_id: sessionId,
        type: 'user_decision',
        data: { decision: scenario.includeUserDecision, reason: 'Recorded as a learner-owned decision event.' }
      }).expect(201);
    }
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

function canonicalScenario(overrides = {}) {
  return {
    decision: 'rejected',
    decisionReason: 'The repeated 400 validation errors and missing amount_cents point to an SDK contract mismatch.',
    verificationReason: 'The collected validation evidence contradicts the timeout hypothesis.',
    solution: 'Restore amount_cents in the SDK migration payload and add a request-contract regression test.',
    justification: 'The recorded 400 validation errors identify the missing request field after migration.',
    followUpAnswer: 'I rejected the timeout hypothesis because the evidence identifies a request contract mismatch.',
    scores: { technical_execution: 82, problem_framing: 83, ai_verification: 84, independent_judgment: 85, communication: 86 },
    summary: 'The learner connected the recorded evidence to a contract-mismatch solution.',
    ...overrides
  };
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

test('evaluation validation uses canonical attribution from actual persisted event shapes', async () => {
  const { evaluatorInput } = await runEvaluationScenario(canonicalScenario());
  const evaluation = completeEvaluation(evaluatorInput);
  const byType = new Map(evaluatorInput.events.map((event) => [event.type, event]));

  assert.deepEqual(byType.get('user_prompt').evidence_attribution, { actor: 'learner', category: 'investigation_question_or_reasoning' });
  assert.deepEqual(byType.get('evidence_collected').evidence_attribution, { actor: 'learner', category: 'learner_selected_evidence' });
  assert.deepEqual(byType.get('suggestion_offered').evidence_attribution, { actor: 'ai_teammate', category: 'suggestion' });
  assert.deepEqual(byType.get('suggestion_rejected').evidence_attribution, { actor: 'learner', category: 'decision' });
  assert.deepEqual(byType.get('suggestion_verified').evidence_attribution, { actor: 'learner', category: 'verification' });
  assert.deepEqual(byType.get('submission').evidence_attribution, { actor: 'learner', category: 'final_solution' });
  assert.deepEqual(byType.get('follow_up_answer').evidence_attribution, { actor: 'learner', category: 'independent_explanation' });
  assert.ok(validateEvaluation(evaluation, evaluatorInput.events));

  assert.equal(validateEvaluation({ ...evaluation, evidence: evaluation.evidence.slice(1) }, evaluatorInput.events), null);
  assert.equal(validateEvaluation({ ...evaluation, evidence: [...evaluation.evidence.slice(0, 4), { ...evaluation.evidence[4], dimension: 'technical_execution' }] }, evaluatorInput.events), null);
  assert.equal(validateEvaluation({ ...evaluation, evidence: evaluation.evidence.map((item) => item.dimension === 'ai_verification' ? { ...item, event_ids: [eventId(evaluatorInput, 'suggestion_offered')] } : item) }, evaluatorInput.events), null);
  assert.equal(validateEvaluation({ ...evaluation, evidence: evaluation.evidence.map((item) => item.dimension === 'technical_execution' ? { ...item, event_ids: ['invented-event'] } : item) }, evaluatorInput.events), null);
});

test('evaluator JSON parsing accepts structured and markdown-wrapped JSON but rejects malformed output', () => {
  const valid = '{"scores":{},"evidence":[],"narrative_summary":"summary"}';

  assert.deepEqual(safeParseJson(valid), { scores: {}, evidence: [], narrative_summary: 'summary' });
  assert.deepEqual(safeParseJson(`Evaluator output:\n\n\`\`\`json\n${valid}\n\`\`\``), { scores: {}, evidence: [], narrative_summary: 'summary' });
  assert.equal(safeParseJson('{"scores":'), null);
});

test('evaluator validation identifies missing fields, invalid scores, and missing independent-explanation anchors', async () => {
  const { evaluatorInput } = await runEvaluationScenario(canonicalScenario());
  const valid = completeEvaluation(evaluatorInput);

  assert.equal(inspectEvaluation({ scores: valid.scores, evidence: valid.evidence }, evaluatorInput.events).failure, 'missing_evidence_or_summary');
  assert.equal(inspectEvaluation({ ...valid, scores: { ...valid.scores, technical_execution: '82' } }, evaluatorInput.events).failure, 'invalid_scores');
  assert.equal(inspectEvaluation({ ...valid, scores: { ...valid.scores, technical_execution: 101 } }, evaluatorInput.events).failure, 'invalid_scores');
  const withoutFollowUpAnchor = {
    ...valid,
    evidence: valid.evidence.map((item) => item.dimension === 'independent_judgment'
      ? { ...item, event_ids: [eventId(evaluatorInput, 'suggestion_rejected'), eventId(evaluatorInput, 'suggestion_verified')] }
      : item)
  };
  assert.equal(inspectEvaluation(withoutFollowUpAnchor, evaluatorInput.events).failure, 'missing_required_anchor:independent_judgment');
  const aiEventInsteadOfDecision = {
    ...valid,
    evidence: valid.evidence.map((item) => item.dimension === 'independent_judgment'
      ? { ...item, event_ids: [eventId(evaluatorInput, 'suggestion_offered'), eventId(evaluatorInput, 'follow_up_answer')] }
      : item)
  };
  assert.equal(inspectEvaluation(aiEventInsteadOfDecision, evaluatorInput.events).failure, 'missing_required_anchor:independent_judgment');
});

test('evaluator instructions require the exact independent-explanation event ID for independent judgment', async () => {
  const { evaluatorInput } = await runEvaluationScenario(canonicalScenario());
  const instruction = evaluatorEventIdInstruction(evaluatorInput);

  assert.match(instruction, /independent_judgment: BOTH one decision ID/);
  assert.match(instruction, new RegExp(eventId(evaluatorInput, 'follow_up_answer')));
});

test('learner-selected AI-source evidence remains a valid problem-framing anchor', async () => {
  const { evaluatorInput } = await runEvaluationScenario(canonicalScenario({ evidenceCreatedBy: 'ai_teammate' }));
  const evidenceEvent = evaluatorInput.events.find((event) => event.type === 'evidence_collected');

  assert.equal(evidenceEvent.data.created_by, 'ai_teammate');
  assert.deepEqual(evidenceEvent.evidence_attribution, { actor: 'learner', category: 'learner_selected_evidence' });
  assert.ok(validateEvaluation(completeEvaluation(evaluatorInput), evaluatorInput.events));
});

test('canonical user_decision events remain valid learner decision anchors', async () => {
  const { evaluatorInput } = await runEvaluationScenario(canonicalScenario({ includeUserDecision: 'rejected' }));
  const evaluation = completeEvaluation(evaluatorInput, {
    evidence: completeEvidenceMappings(evaluatorInput).map((item) => item.dimension === 'independent_judgment'
      ? { ...item, event_ids: [eventId(evaluatorInput, 'user_decision'), eventId(evaluatorInput, 'follow_up_answer')] }
      : item)
  });

  assert.deepEqual(evaluatorInput.events.find((event) => event.type === 'user_decision').evidence_attribution, { actor: 'learner', category: 'decision' });
  assert.ok(validateEvaluation(evaluation, evaluatorInput.events));
});

test('deliberately collected evidence is persisted through the generic event log with its full payload', async (t) => {
  const { db, app } = createHarness();
  t.after(() => db.close());
  const started = await request(app).post('/api/session/start').send({}).expect(201);
  const evidence = {
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
  const persistedEvidence = JSON.parse(event.data);
  const evaluationEvent = toEvaluationTimelineEvent(event);
  const { linked_hypothesis_id, ...publicEvidence } = persistedEvidence;

  assert.equal(event.type, 'evidence_collected');
  assert.match(logged.body.evidence_id, /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.deepEqual(persistedEvidence, { ...evidence, evidence_id: logged.body.evidence_id });
  assert.deepEqual(publicEvent.data, publicEvidence);
  assert.deepEqual(evaluationEvent.evidence_attribution, { actor: 'learner', category: 'learner_selected_evidence' });

  await request(app).post('/api/event/log').send({
    session_id: started.body.session_id,
    type: 'evidence_collected',
    data: { ...evidence, evidence_id: 'frontend-file-path' }
  }).expect(400);
});

test('chat supplies Gemini with the complete grounded mission workspace, not only file names', async (t) => {
  const { db, app, getTeammateCalls } = createHarness();
  t.after(() => db.close());
  const started = await request(app).post('/api/session/start').send({}).expect(201);

  await request(app).post('/api/chat').send({
    session_id: started.body.session_id,
    message: 'Can you inspect the payment confirmation code?'
  }).expect(200);

  const [[history, message, context]] = getTeammateCalls();
  assert.deepEqual(history, [{ role: 'learner', content: 'Can you inspect the payment confirmation code?' }]);
  assert.equal(message, 'Can you inspect the payment confirmation code?');
  assert.deepEqual(context.workspace_files.map((file) => file.path), [
    'frontend/Checkout.js',
    'frontend/Cart.js',
    'backend/routes/checkout.js'
  ]);
  assert.match(context.workspace_files.find((file) => file.path === 'frontend/Checkout.js').content, /fetch\('\/api\/payment\/confirm'/);
  assert.match(context.workspace_files.find((file) => file.path === 'frontend/Cart.js').content, /calculateCartTotal/);
  assert.match(context.workspace_files.find((file) => file.path === 'backend/routes/checkout.js').content, /paymentProvider\.confirm\(req\.body\)/);
  assert.equal(Object.hasOwn(context.mission, 'flawed_suggestion'), false);
});

test('complete flow returns an ordered sanitized receipt and evaluator timeline', async (t) => {
  const { db, app, getEvaluationCalls, getEvaluatorInput } = createHarness();
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
  assert.equal(JSON.stringify(receipt.body).includes('evaluation_metadata'), false);
  assert.deepEqual(receipt.body.evidence[0].event_sequences.length, receipt.body.evidence[0].event_ids.length);
  const independentJudgmentEvidence = receipt.body.evidence.find((item) => item.dimension === 'independent_judgment');
  const followUpEvent = timeline.find((event) => event.type === 'follow_up_answer');
  assert.ok(independentJudgmentEvidence.event_ids.includes(followUpEvent.event_id));

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

  const storedSummary = JSON.parse(db.getReceipt(sessionId).evidence_summary);
  assert.deepEqual(storedSummary.evaluation_metadata, {
    evaluator_contract_version: EVALUATOR_CONTRACT_VERSION,
    model: 'test-evaluator',
    temperature: 0,
    input_sha256: fingerprintEvaluationInput(getEvaluatorInput())
  });

  const fetched = await request(app).get(`/api/receipt/${sessionId}`).expect(200);
  assert.deepEqual(fetched.body, receipt.body);
  const repeated = await request(app).post('/api/receipt/generate').send({ session_id: sessionId }).expect(200);
  assert.deepEqual(repeated.body, receipt.body);
  assert.equal(getEvaluationCalls(), 1);
});

test('canonical evaluation fingerprints ignore object key order and preserve evidence changes', () => {
  const first = { mission: { title: 'Checkout', id: 'nova' }, events: [{ event_id: 'event-1', data: { message: 'Inspect logs.', relation: 'neutral' } }], submission: { solution: 'Fix payload.' } };
  const reordered = { submission: { solution: 'Fix payload.' }, events: [{ data: { relation: 'neutral', message: 'Inspect logs.' }, event_id: 'event-1' }], mission: { id: 'nova', title: 'Checkout' } };
  const changed = { ...reordered, events: [{ ...reordered.events[0], event_id: 'event-2' }] };

  assert.equal(fingerprintEvaluationInput(first), fingerprintEvaluationInput(reordered));
  assert.notEqual(fingerprintEvaluationInput(first), fingerprintEvaluationInput(changed));
});

test('legacy receipts without evaluation metadata remain publicly compatible', async (t) => {
  const { db, app } = createHarness();
  t.after(() => db.close());
  const sessionId = randomUUID();
  db.createSession(sessionId, 'nova-commerce-checkout');
  db.saveReceipt(sessionId, {
    technical_execution: 60,
    problem_framing: 61,
    ai_verification: 62,
    independent_judgment: 63,
    communication: 64
  }, {
    evidence: [{ dimension: 'technical_execution', event_ids: ['event-submission'], event_sequences: [3], explanation: 'Legacy evidence mapping.' }],
    event_timeline: [{ event_id: 'event-submission', sequence: 3, timestamp: '2026-01-01T00:00:00.000Z', type: 'submission', data: { solution: 'Legacy solution.', justification: 'Legacy justification.' } }]
  }, 'Legacy receipt summary.');

  const response = await request(app).get(`/api/receipt/${sessionId}`).expect(200);
  assert.equal(Object.hasOwn(response.body, 'evaluation_metadata'), false);
  assert.deepEqual(response.body, publicReceipt(db.getReceipt(sessionId)));
  assert.equal(response.body.evidence[0].explanation, 'Legacy evidence mapping.');
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

test('invalid evaluator output preserves the completed learner record and creates no receipt', async (t) => {
  const db = createDatabase(':memory:');
  t.after(() => db.close());
  const app = createApp({
    db,
    ai: {
      teammate: async () => 'Inspect the available request failures before deciding.',
      evaluate: async () => ({ scores: {}, evidence: [], narrative_summary: 'Malformed evaluator result.' })
    }
  });
  const sessionId = randomUUID();
  db.createSession(sessionId, 'nova-commerce-checkout');
  db.appendEvent(sessionId, 'user_prompt', { message: 'Investigate the checkout failure.' });
  db.saveSubmission(sessionId, 'Align the client payload with the route contract.', 'The request validation evidence points to a missing field.');
  db.saveFollowUp(sessionId, 'Why did you choose this solution?', 'I rejected the timeout hypothesis because the route contract is the supplied evidence.');
  db.appendEvent(sessionId, 'submission', { solution: 'Align the client payload with the route contract.' });
  db.appendEvent(sessionId, 'follow_up_answer', { answer: 'I rejected the timeout hypothesis because the route contract is the supplied evidence.' });
  db.updateSession(sessionId, { status: 'submitted', submission_completed: 1, follow_up_completed: 1 });

  await request(app).post('/api/receipt/generate').send({ session_id: sessionId }).expect(503);

  assert.equal(db.getReceipt(sessionId), undefined);
  assert.equal(db.getSession(sessionId).status, 'submitted');
  assert.equal(db.getSubmission(sessionId).solution, 'Align the client payload with the route contract.');
  assert.equal(db.getFollowUp(sessionId).answer, 'I rejected the timeout hypothesis because the route contract is the supplied evidence.');
  assert.equal(db.getEvents(sessionId).some((event) => event.type === 'evaluation_completed'), false);
});

test('Gemini provider uses system instructions and structured evaluator output', async () => {
  const requests = [];
  const evaluatorSummary = Array.from({ length: MAX_TEAMMATE_RESPONSE_WORDS + 25 }, (_, index) => `evaluation${index + 1}`).join(' ');
  const client = {
    models: {
      generateContent: async (request) => {
        requests.push(request);
        return { text: requests.length === 1 ? 'Inspect the evidence first.' : JSON.stringify({ scores: {}, evidence: [], narrative_summary: evaluatorSummary }) };
      }
    }
  };
  const ai = createAiService({ client, model: 'gemini-test-model' });
  const groundedMissionContext = {
    mission: { id: 'nova-commerce-checkout', context: 'Payment failures increased after July 14.' },
    workspace_files: [
      { path: 'frontend/Checkout.js', language: 'javascript', content: "fetch('/api/payment/confirm')" },
      { path: 'frontend/Cart.js', language: 'javascript', content: 'calculateCartTotal(items)' },
      { path: 'backend/routes/checkout.js', language: 'javascript', content: 'paymentProvider.confirm(req.body)' }
    ]
  };
  const teammate = await ai.teammate([{ role: 'learner', content: 'What changed?' }], 'Where should I look?', groundedMissionContext);
  const evaluator = await ai.evaluate({ mission: {}, events: [] });

  assert.equal(teammate, 'Inspect the evidence first.');
  assert.deepEqual(evaluator, { scores: {}, evidence: [], narrative_summary: evaluatorSummary });
  assert.equal(evaluator.narrative_summary.match(/\S+/g).length, MAX_TEAMMATE_RESPONSE_WORDS + 25);
  assert.equal(requests[0].model, 'gemini-test-model');
  assert.equal(typeof requests[0].config.systemInstruction, 'string');
  assert.equal(requests[0].config.systemInstruction.includes('Do not invent files, logs, analytics, Git history'), true);
  assert.equal(requests[0].contents.includes('Current learner message:'), true);
  assert.equal(requests[0].contents.includes('frontend/Checkout.js'), true);
  assert.equal(requests[0].contents.includes("fetch('/api/payment/confirm')"), true);
  assert.equal(requests[0].contents.includes('frontend/Cart.js'), true);
  assert.equal(requests[0].contents.includes('backend/routes/checkout.js'), true);
  assert.equal(requests[1].config.responseMimeType, 'application/json');
  assert.deepEqual(requests[1].config.responseJsonSchema, receiptSchema);
  assert.equal(requests[1].config.temperature, 0);
  assert.equal(requests[1].config.systemInstruction.includes('evidence_attribution.actor'), true);
  assert.equal(requests[1].config.systemInstruction.includes('AI-provided context'), true);
  assert.equal(requests[1].config.systemInstruction.includes('evidence-rubric-v1'), true);
  assert.equal(requests[1].config.systemInstruction.includes('independent_judgment: BOTH one decision ID'), true);
  assert.deepEqual(ai.getEvaluationMetadata(), { model: 'gemini-test-model', temperature: 0 });
});

test('Gemini teammate responses are capped for ordinary investigation prompts but preserve explicit detail requests', async () => {
  const longResponse = Array.from({ length: MAX_TEAMMATE_RESPONSE_WORDS + 25 }, (_, index) => `word${index + 1}`).join(' ');
  const client = {
    models: {
      generateContent: async () => ({ text: longResponse })
    }
  };
  const ai = createAiService({ client, model: 'gemini-test-model' });

  const concise = await ai.teammate([], 'What should I inspect next?');
  const detailed = await ai.teammate([], 'Please provide a detailed explanation of the available checkout code.');

  assert.equal(concise.match(/\S+/g).length, MAX_TEAMMATE_RESPONSE_WORDS);
  assert.equal(concise.endsWith('…'), true);
  assert.equal(detailed.match(/\S+/g).length, MAX_TEAMMATE_RESPONSE_WORDS + 25);
});
