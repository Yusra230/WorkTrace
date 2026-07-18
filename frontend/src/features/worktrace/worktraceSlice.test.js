import { describe, expect, it } from 'vitest';
import reducer, { addEvidence, applicationViews, collectEvidence, generateReceipt, initialState, persistEvidence, recordSuggestionDecision, restoreReceipt, sendChat, startSession, submitFollowUp, submitSolution, verifySuggestionDecision } from './worktraceSlice';

describe('worktraceSlice', () => {
  it('stores the session and enters the workspace after session start succeeds', () => {
    const mission = { id: 'nova-commerce-checkout', title: 'Checkout Conversion Drop' };
    const nextState = reducer(initialState, startSession.fulfilled({ session_id: 'session-123', mission }, 'request-1'));

    expect(nextState.sessionId).toBe('session-123');
    expect(nextState.mission).toEqual(mission);
    expect(nextState.currentView).toBe(applicationViews.WORKSPACE);
    expect(nextState.loading.startSession).toBe(false);
  });

  it('retains a recoverable error when mission start fails', () => {
    const nextState = reducer(initialState, startSession.rejected(new Error('offline'), 'request-1', undefined, 'Server unavailable'));

    expect(nextState.recoverableError).toBe('Server unavailable');
    expect(nextState.loading.startSession).toBe(false);
  });

  it('adds chat messages only after the teammate response succeeds', () => {
    const activeState = { ...initialState, sessionId: 'session-123' };
    const payload = {
      message: 'What changed recently?',
      response: {
        ai_response: 'Start by inspecting the July 14 payment failure signals.',
        suggestion_offered: true,
        suggestion_id: 'suggestion-123'
      }
    };
    const nextState = reducer(activeState, sendChat.fulfilled(payload, 'request-2', payload.message));

    expect(nextState.chatTranscript).toEqual([
      { id: 'learner-1', role: 'learner', content: payload.message },
      { id: 'teammate-2', role: 'teammate', content: payload.response.ai_response }
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

  it('marks evidence persisted only after the event log succeeds and surfaces a failed write', () => {
    const evidence = {
      id: 'evidence-1', title: 'Observed timing', description: 'Failures begin on July 14.', source: 'Mission signal', type: 'data', relation: 'neutral', linkedHypothesisId: null, createdBy: 'learner'
    };
    const pendingState = reducer({ ...initialState, sessionId: 'session-123' }, addEvidence(evidence));
    const savedState = reducer(pendingState, persistEvidence.fulfilled({ evidenceId: evidence.id, eventId: 'event-123' }, 'request-evidence', evidence));
    const failedState = reducer(pendingState, persistEvidence.rejected(new Error('offline'), 'request-evidence', evidence, 'Unable to save evidence to the mission timeline.'));

    expect(savedState.evidenceItems[0]).toMatchObject({ persistenceStatus: 'persisted', eventId: 'event-123' });
    expect(failedState.evidenceItems[0].persistenceStatus).toBe('failed');
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
