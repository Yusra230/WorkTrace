import { describe, expect, it } from 'vitest';
import reducer, { addEvidence, applicationViews, collectEvidence, generateReceipt, hydrateActiveSession, initialState, persistEvidence, recordSuggestionDecision, restoreReceipt, sendChat, setFollowUpAnswer, startSession, submitFollowUp, submitSolution, verifySuggestionDecision } from './worktraceSlice';

describe('worktraceSlice', () => {
  it('stores the session and enters the workspace after session start succeeds', () => {
    const mission = { id: 'nova-commerce-checkout', title: 'Checkout Conversion Drop' };
    const nextState = reducer(initialState, startSession.fulfilled({ session_id: 'session-123', mission }, 'request-1'));

    expect(nextState.sessionId).toBe('session-123');
    expect(nextState.mission).toEqual(mission);
    expect(nextState.currentView).toBe(applicationViews.WORKSPACE);
    expect(nextState.loading.startSession).toBe(false);
  });

  it('hydrates a restorable active session without restoring transient state', () => {
    const restoredState = reducer(initialState, hydrateActiveSession({
      sessionId: 'session-123',
      mission: { id: 'nova-commerce-checkout' },
      currentView: applicationViews.WORKSPACE,
      selectedFilePath: 'frontend/Checkout.js',
      chatTranscript: [{ id: 'learner-1', role: 'learner', content: 'Inspect the payment request.' }],
      evidenceItems: [],
      offeredSuggestion: null,
      suggestionId: null,
      suggestionDecision: null,
      verification: { status: 'idle', rationale: '' },
      submission: { solution: '', justification: '' },
      followUp: { question: '', answer: '' },
      evaluation: { status: 'idle', attempts: 0 }
    }));

    expect(restoredState.currentView).toBe(applicationViews.WORKSPACE);
    expect(restoredState.chatTranscript).toHaveLength(1);
    expect(restoredState.loading.startSession).toBe(false);
    expect(restoredState.recoverableError).toBeNull();
  });

  it('retains a recoverable error when mission start fails', () => {
    const nextState = reducer(initialState, startSession.rejected(new Error('offline'), 'request-1', undefined, 'Server unavailable'));

    expect(nextState.recoverableError).toBe('Server unavailable');
    expect(nextState.loading.startSession).toBe(false);
  });

  it('adds the learner message immediately, then appends the teammate response in order', () => {
    const activeState = { ...initialState, sessionId: 'session-123' };
    const message = 'What changed recently?';
    const payload = {
      message: 'What changed recently?',
      response: {
        ai_response: 'Start by inspecting the July 14 payment failure signals.',
        suggestion_offered: true,
        suggestion_id: 'suggestion-123'
      }
    };
    const pendingState = reducer(activeState, sendChat.pending('request-2', message));
    const nextState = reducer(pendingState, sendChat.fulfilled(payload, 'request-2', message));

    expect(nextState.chatTranscript).toEqual([
      { id: 'learner-request-2', requestId: 'request-2', role: 'learner', content: message, status: 'sent' },
      { id: 'teammate-request-2', role: 'teammate', content: payload.response.ai_response, status: 'sent' }
    ]);
    expect(nextState.suggestionId).toBe('suggestion-123');
    expect(nextState.offeredSuggestion).toEqual({ message: payload.response.ai_response });
  });

  it('persists a recorded decision and completes verification without changing it', () => {
    const pendingVerification = {
      ...initialState,
      sessionId: 'session-123',
      suggestionId: 'suggestion-123',
      verification: { status: 'idle', rationale: 'The available evidence does not support this cause.' }
    };
    const decisionState = reducer(pendingVerification, recordSuggestionDecision.fulfilled({ decision: 'rejected', response: { event_id: 'event-1' } }, 'request-3', 'rejected'));
    const completedState = reducer(decisionState, verifySuggestionDecision.fulfilled({ event_id: 'event-2' }, 'request-4'));

    expect(decisionState.suggestionDecision).toBe('rejected');
    expect(decisionState.verification.status).toBe('decision-recorded');
    expect(completedState.suggestionDecision).toBe('rejected');
    expect(completedState.suggestionId).toBe('suggestion-123');
    expect(completedState.verification.status).toBe('completed');
  });

  it('moves through follow-up and evaluating states only after successful submissions', () => {
    const submittedState = reducer(initialState, submitSolution.fulfilled({ success: true, follow_up_question: 'Why did you choose this solution?' }, 'request-5'));
    const evaluationState = reducer(submittedState, submitFollowUp.fulfilled({ success: true, ready_for_evaluation: true }, 'request-6'));

    expect(submittedState.followUp.question).toBe('Why did you choose this solution?');
    expect(submittedState.currentView).toBe(applicationViews.FOLLOW_UP);
    expect(evaluationState.currentView).toBe(applicationViews.EVALUATING);
    expect(evaluationState.evaluation.status).toBe('ready');
  });

  it('keeps a follow-up answer as a draft until the successful explicit submission commits it', () => {
    const followUpState = reducer(initialState, submitSolution.fulfilled({ success: true, follow_up_question: 'Why did you choose this solution?' }, 'request-5'));
    const draftState = reducer(followUpState, setFollowUpAnswer('I rejected the timeout hypothesis because the provided request path needs direct verification.'));
    const pendingState = reducer(draftState, submitFollowUp.pending('request-6'));
    const completedState = reducer(pendingState, submitFollowUp.fulfilled({ success: true, ready_for_evaluation: true, answer: draftState.followUp.answer }, 'request-6'));

    expect(draftState.followUp.answer).toContain('I rejected the timeout hypothesis');
    expect(draftState.followUp.submittedAnswer).toBe('');
    expect(pendingState.followUp.submittedAnswer).toBe('');
    expect(completedState.followUp.answer).toBe('');
    expect(completedState.followUp.submittedAnswer).toContain('I rejected the timeout hypothesis');
    expect(completedState.currentView).toBe(applicationViews.EVALUATING);
    expect(completedState.evaluation.status).toBe('ready');
  });

  it('keeps a failed follow-up draft editable and uncommitted', () => {
    const draftState = {
      ...initialState,
      sessionId: 'session-123',
      currentView: applicationViews.FOLLOW_UP,
      followUp: { question: 'Explain your decision.', answer: 'My independent explanation.', submittedAnswer: '' }
    };
    const pendingState = reducer(draftState, submitFollowUp.pending('request-6'));
    const failedState = reducer(pendingState, submitFollowUp.rejected(new Error('offline'), 'request-6', undefined, 'Unable to submit your explanation.'));

    expect(failedState.followUp.answer).toBe('My independent explanation.');
    expect(failedState.followUp.submittedAnswer).toBe('');
    expect(failedState.currentView).toBe(applicationViews.FOLLOW_UP);
    expect(failedState.errorScope).toBe('follow-up');
  });

  it('tracks receipt generation loading and moves to the final receipt on success', () => {
    const generatingState = reducer({ ...initialState, sessionId: 'session-123', evaluation: { status: 'ready', attempts: 0 } }, generateReceipt.pending('request-7'));
    const receipt = { session_id: 'session-123', scores: { communication: 82 }, evidence: [], event_timeline: [] };
    const completedState = reducer(generatingState, generateReceipt.fulfilled(receipt, 'request-7'));

    expect(generatingState.loading.generateReceipt).toBe(true);
    expect(generatingState.evaluation.status).toBe('generating');
    expect(completedState.currentView).toBe(applicationViews.RECEIPT);
    expect(completedState.competencyReceipt).toEqual(receipt);
  });

  it('keeps completed evidence and exposes a controlled receipt-generation failure', () => {
    const readyState = { ...initialState, evaluation: { status: 'ready', attempts: 0 }, chatTranscript: [{ id: 'learner-1', role: 'learner', content: 'Investigate July 14.' }] };
    const failedState = reducer(readyState, generateReceipt.rejected(new Error('unavailable'), 'request-8', undefined, 'AI service temporarily unavailable.'));

    expect(failedState.evaluation.status).toBe('error');
    expect(failedState.recoverableError).toBe('AI service temporarily unavailable.');
    expect(failedState.chatTranscript).toEqual(readyState.chatTranscript);
  });

  it('restores a persisted receipt into the final receipt state', () => {
    const receipt = { session_id: 'completed-session', scores: {}, evidence: [], event_timeline: [] };
    const restoredState = reducer(initialState, restoreReceipt.fulfilled(receipt, 'request-9', 'completed-session'));

    expect(restoredState.receiptRestoration.status).toBe('loaded');
    expect(restoredState.sessionId).toBe('completed-session');
    expect(restoredState.currentView).toBe(applicationViews.RECEIPT);
  });

  it('adds learner-collected evidence with its hypothesis relation', () => {
    const evidence = {
      id: 'evidence-1',
      title: 'Payment failure timing',
      description: 'Payment failures increased starting July 14.',
      source: 'Mission signal',
      type: 'data',
      relation: 'contradicts',
      linkedHypothesisId: 'suggestion-123',
      createdBy: 'learner'
    };
    const nextState = reducer(initialState, addEvidence(evidence));

    expect(nextState.evidenceItems[0]).toMatchObject(evidence);
    expect(nextState.evidenceItems[0].persistenceStatus).toBe('pending');
    expect(nextState.evidenceItems[0].relation).toBe('contradicts');
  });

  it('prevents a duplicate evidence item from being added', () => {
    const evidence = {
      id: 'evidence-1',
      title: 'Payment failure timing',
      description: 'Payment failures increased starting July 14.',
      source: 'Mission signal',
      type: 'data',
      relation: 'neutral',
      linkedHypothesisId: null,
      createdBy: 'learner'
    };
    const withEvidence = reducer(initialState, addEvidence(evidence));
    const duplicateAttempt = reducer(withEvidence, addEvidence({ ...evidence, id: 'evidence-2' }));

    expect(duplicateAttempt.evidenceItems).toHaveLength(1);
    expect(duplicateAttempt.evidenceError).toBe('This evidence is already on the board.');
  });

  it('stores only the persisted backend evidence UUID and surfaces a failed write', () => {
    const evidence = {
      title: 'Observed timing', description: 'Failures begin on July 14.', source: 'Mission signal', type: 'data', relation: 'neutral', linkedHypothesisId: null, createdBy: 'learner'
    };
    const pendingState = reducer({ ...initialState, sessionId: 'session-123' }, persistEvidence.pending('request-evidence', evidence));
    const persistedEvidence = { ...evidence, id: '9f8c3e6a-a938-4b6d-9a43-02521055ca9b' };
    const savedState = reducer(pendingState, persistEvidence.fulfilled({ evidence: persistedEvidence, eventId: 'event-123' }, 'request-evidence', evidence));
    const failedState = reducer(pendingState, persistEvidence.rejected(new Error('offline'), 'request-evidence', evidence, 'Unable to save evidence to the mission timeline.'));

    expect(savedState.evidenceItems[0]).toMatchObject({ id: persistedEvidence.id, persistenceStatus: 'persisted', eventId: 'event-123' });
    expect(failedState.evidenceItems).toHaveLength(0);
    expect(failedState.evidenceError).toBe('Unable to save evidence to the mission timeline.');
    expect(failedState.errorScope).toBe('evidence');
  });

  it('does not dispatch backend persistence for duplicate evidence', async () => {
    const existingEvidence = {
      id: 'evidence-1', title: 'Observed timing', description: 'Failures begin on July 14.', source: 'Mission signal', type: 'data', relation: 'neutral', linkedHypothesisId: null, createdBy: 'learner', persistenceStatus: 'persisted', eventId: 'event-1'
    };
    const actions = [];
    const result = await collectEvidence({ ...existingEvidence, id: 'evidence-2' })(
      (action) => actions.push(action),
      () => ({ worktrace: { evidenceItems: [existingEvidence] } })
    );

    expect(result).toEqual({ duplicate: true });
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe('worktrace/setEvidenceError');
  });

  it('preserves collected evidence through submission, evaluation, and receipt transitions', () => {
    const withEvidence = reducer(initialState, addEvidence({
      id: 'evidence-1', title: 'Observed timing', description: 'Failures begin on July 14.', source: 'Mission signal', type: 'data', relation: 'neutral', linkedHypothesisId: null, createdBy: 'learner'
    }));
    const followUpState = reducer(withEvidence, submitSolution.fulfilled({ success: true, follow_up_question: 'Explain your choice.' }, 'request-10'));
    const evaluationState = reducer(followUpState, submitFollowUp.fulfilled({ success: true, ready_for_evaluation: true }, 'request-11'));
    const receiptState = reducer(evaluationState, generateReceipt.fulfilled({ session_id: 'session-123', scores: {}, evidence: [], event_timeline: [] }, 'request-12'));

    expect(followUpState.evidenceItems).toHaveLength(1);
    expect(evaluationState.evidenceItems).toHaveLength(1);
    expect(receiptState.evidenceItems).toHaveLength(1);
  });
});
