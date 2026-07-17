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
  event_timeline: [{
    event_id: 'event-verified',
    sequence: 6,
    timestamp: '2026-07-17T12:00:00.000Z',
    type: 'suggestion_verified',
    data: { decision: 'rejected' }
  }]
};

describe('ReceiptScreen', () => {
  it('renders competency evidence and the chronological timeline', () => {
    render(<ReceiptScreen receipt={receipt} />);

    expect(screen.getAllByText('AI Verification')).toHaveLength(2);
    expect(screen.getByText((_, element) => element.tagName === 'P' && element.textContent === '94%')).toBeTruthy();
    expect(screen.getByText('The learner explicitly verified the AI hypothesis.')).toBeTruthy();
    expect(screen.getByText('Event #6 · event-verified')).toBeTruthy();
    expect(screen.getByText('Decision timeline')).toBeTruthy();
    expect(screen.getByText('suggestion verified')).toBeTruthy();
  });
});
