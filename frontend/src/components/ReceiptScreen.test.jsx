// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ReceiptScreen from './ReceiptScreen';

const receipt = {
  scores: {
    technical_execution: 87,
    problem_framing: 91,
    ai_verification: 94,
    independent_judgment: 88,
    communication: 82
  },
  narrative_summary: 'The learner demonstrated careful AI verification.',
  evidence: [{
    dimension: 'ai_verification',
    explanation: 'The learner explicitly verified the AI hypothesis.',
    event_ids: ['event-verified'],
    event_sequences: [6]
  }],
  event_timeline: [
    {
      event_id: 'event-evidence',
      sequence: 3,
      timestamp: '2026-07-17T12:00:00.000Z',
      type: 'evidence_collected',
      data: { title: 'SDK validation failures', description: '400 validation errors require amount_cents.', source: 'Logs', relation: 'contradicts', created_by: 'learner' }
    },
    {
      event_id: 'event-hypothesis',
      sequence: 4,
      timestamp: '2026-07-17T12:01:00.000Z',
      type: 'suggestion_offered',
      data: { suggestion: 'Database timeout' }
    },
    {
      event_id: 'event-decision',
      sequence: 5,
      timestamp: '2026-07-17T12:02:00.000Z',
      type: 'suggestion_rejected',
      data: { reason: 'The logs contradict this hypothesis.' }
    },
    {
      event_id: 'event-verified',
      sequence: 6,
      timestamp: '2026-07-17T12:03:00.000Z',
      type: 'suggestion_verified',
      data: { decision: 'rejected', reason: 'Verified against the SDK contract.' }
    }
  ]
};

describe('ReceiptScreen', () => {
  it('renders proof-first decision trace, competency evidence, and the chronological timeline', () => {
    render(<ReceiptScreen receipt={receipt} />);

    expect(screen.getAllByText('AI Verification')).toHaveLength(2);
    expect(screen.getByText((_, element) => element.tagName === 'P' && element.textContent === '94%')).toBeTruthy();
    expect(screen.getByText('The learner explicitly verified the AI hypothesis.')).toBeTruthy();
    expect(screen.getByText('Learner verification')).toBeTruthy();
    expect(screen.getByText('Event #6 - event-verified')).toBeTruthy();
    expect(screen.getByText('Proof of how you worked with AI.')).toBeTruthy();
    expect(screen.getByText('The human judgment behind this receipt')).toBeTruthy();
    expect(screen.getByText('Rejected')).toBeTruthy();
    expect(screen.getAllByText('The logs contradict this hypothesis.')).toHaveLength(2);
    expect(screen.getByText('Event #5 · event-decision')).toBeTruthy();
    expect(screen.getByText('Decision timeline')).toBeTruthy();
    expect(screen.getByText('suggestion verified')).toBeTruthy();
    expect(screen.getByText('The human judgment behind this receipt').compareDocumentPosition(screen.getByText('Competency scores')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
