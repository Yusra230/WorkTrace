import { describe, expect, it } from 'vitest';
import { buildWorkspaceTrace, normalizeReceiptTrace } from './decisionTrace';

describe('decision trace normalization', () => {
  it('derives the active workspace stage only from persisted investigation state', () => {
    const trace = buildWorkspaceTrace({
      chatTranscript: [{ id: 'learner-1' }],
      evidenceItems: [{ persistenceStatus: 'failed' }, { persistenceStatus: 'persisted' }],
      offeredSuggestion: { message: 'Database timeout' },
      suggestionDecision: 'rejected',
      verificationStatus: 'completed'
    });

    expect(trace.persistedEvidence).toBe(1);
    expect(trace.activeStage).toBe('proposal');
    expect(trace.completeStages).toBe(5);
  });

  it('preserves real event attribution and identifies a verified rejection without scoring it', () => {
    const trace = normalizeReceiptTrace([
      { event_id: 'event-verified', sequence: 4, type: 'suggestion_verified', data: { decision: 'rejected' } },
      { event_id: 'event-rejected', sequence: 3, type: 'suggestion_rejected', data: { reason: 'Contradicted by logs.' } },
      { event_id: 'event-evidence', sequence: 1, type: 'evidence_collected', data: { title: '400 validation failures' } },
      { event_id: 'event-hypothesis', sequence: 2, type: 'suggestion_offered', data: { suggestion: 'Database timeout' } }
    ]);

    expect(trace.pivotalDecision).toBe('Rejected');
    expect(trace.isVerifiedRejection).toBe(true);
    expect(trace.evidence[0].event_id).toBe('event-evidence');
    expect(trace.decision.event_id).toBe('event-rejected');
    expect(trace.completeKeys.has('verification')).toBe(true);
  });
});
