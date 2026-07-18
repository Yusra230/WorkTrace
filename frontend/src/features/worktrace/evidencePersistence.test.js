import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  logEvent: vi.fn(),
  startSession: vi.fn(),
  sendChat: vi.fn(),
  submitSolution: vi.fn(),
  submitFollowUp: vi.fn(),
  generateReceipt: vi.fn(),
  getReceipt: vi.fn()
}));

vi.mock('../../services/worktraceApi', () => api);

import { persistEvidence } from './worktraceSlice';

describe('persistEvidence', () => {
  const evidence = {
    id: '9f8c3e6a-a938-4b6d-9a43-02521055ca9b',
    title: 'Payment failure timing',
    description: 'Payment failures increased beginning July 14.',
    source: 'Mission signal',
    type: 'data',
    relation: 'contradicts',
    linkedHypothesisId: '122f3d46-3282-4af5-8fc8-f8a5b20cf083',
    createdBy: 'learner',
    persistenceStatus: 'pending'
  };

  beforeEach(() => {
    api.logEvent.mockReset();
  });

  it('uses the existing generic event log with the evidence_collected payload', async () => {
    api.logEvent.mockResolvedValue({ success: true, event_id: 'event-123' });
    const dispatched = [];

    const result = await persistEvidence(evidence)(
      (action) => dispatched.push(action),
      () => ({ worktrace: { sessionId: 'session-123', evidenceItems: [evidence] } }),
      undefined
    );

    expect(api.logEvent).toHaveBeenCalledWith({
      sessionId: 'session-123',
      type: 'evidence_collected',
      data: {
        evidence_id: evidence.id,
        title: evidence.title,
        description: evidence.description,
        source: evidence.source,
        type: evidence.type,
        relation: evidence.relation,
        linked_hypothesis_id: evidence.linkedHypothesisId,
        created_by: evidence.createdBy
      }
    });
    expect(result.type).toBe('worktrace/persistEvidence/fulfilled');
    expect(dispatched.at(-1).payload).toEqual({ evidenceId: evidence.id, eventId: 'event-123' });
  });
});
