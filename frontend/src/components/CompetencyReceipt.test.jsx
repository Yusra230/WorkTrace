// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import CompetencyReceipt from './CompetencyReceipt';

class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.IntersectionObserver = IntersectionObserverMock;
afterEach(cleanup);

const mission = {
  company: 'NovaCommerce',
  role: 'Junior Product Engineer',
  title: 'Checkout Conversion Drop',
  brief: 'Checkout conversion has dropped 12%. Investigate and propose a fix.',
  codebase_files: ['frontend/Checkout.js', 'backend/routes/checkout.js']
};

const timeline = [
  { event_id: 'event-ai', sequence: 2, timestamp: '2026-07-17T12:00:00.000Z', type: 'suggestion_offered', data: { suggestion: 'Database timeout' } },
  { event_id: 'event-evidence', sequence: 3, timestamp: '2026-07-17T12:01:00.000Z', type: 'evidence_collected', data: { title: 'SDK failures', description: '400 validation errors require amount_cents.', created_by: 'learner' } },
  { event_id: 'event-decision', sequence: 4, timestamp: '2026-07-17T12:02:00.000Z', type: 'suggestion_rejected', data: { reason: 'The logs contradict this hypothesis.' } },
  { event_id: 'event-verified', sequence: 5, timestamp: '2026-07-17T12:03:00.000Z', type: 'suggestion_verified', data: { decision: 'rejected', reason: 'Verified against the SDK contract.' } },
  { event_id: 'event-submission', sequence: 6, timestamp: '2026-07-17T12:04:00.000Z', type: 'submission', data: { solution: 'Restore amount_cents.' } },
  { event_id: 'event-follow-up', sequence: 7, timestamp: '2026-07-17T12:05:00.000Z', type: 'follow_up_answer', data: { answer: 'The SDK contract caused the failures.' } },
  { event_id: 'event-complete', sequence: 8, timestamp: '2026-07-17T12:06:00.000Z', type: 'evaluation_completed', data: { status: 'completed' } }
];
const receipt = {
  session_id: 'session-real-123', generated_at: '2026-07-17T12:06:00.000Z',
  scores: { technical_execution: 80, problem_framing: 70, ai_verification: 90, independent_judgment: 85, communication: 75 },
  evidence: [
    { dimension: 'technical_execution', explanation: 'The learner submitted a solution.', event_ids: ['event-submission'] },
    { dimension: 'problem_framing', explanation: 'The learner selected evidence.', event_ids: ['event-evidence'] },
    { dimension: 'ai_verification', explanation: 'The learner rejected and verified the AI suggestion.', event_ids: ['event-ai', 'event-decision', 'event-verified'] },
    { dimension: 'independent_judgment', explanation: 'The learner made a decision and explained it independently.', event_ids: ['event-decision', 'event-follow-up'] },
    { dimension: 'communication', explanation: 'The learner communicated a solution and explanation.', event_ids: ['event-submission', 'event-follow-up'] }
  ], event_timeline: timeline
};

describe('CompetencyReceipt', () => {
  it('renders public receipt and mission data without mock claims', () => {
    render(<CompetencyReceipt mission={mission} receipt={receipt} />);

    expect(screen.getByText('session-real-123')).toBeTruthy();
    expect(screen.getByText('NovaCommerce — Junior Product Engineer — Checkout Conversion Drop')).toBeTruthy();
    expect(screen.getByText('Checkout conversion has dropped 12%. Investigate and propose a fix.')).toBeTruthy();
    expect(screen.getAllByText('80')).toHaveLength(2);
    expect(screen.queryByText('Immutable after generation')).toBeNull();
    expect(screen.queryByText('Immutable')).toBeNull();
  });

  it('shows evaluator mappings with learner evidence distinct from AI context', () => {
    render(<CompetencyReceipt mission={mission} receipt={receipt} />);
    fireEvent.click(screen.getAllByRole('button', { name: /AI Verification/i })[0]);

    expect(screen.getByText('The learner rejected and verified the AI suggestion.')).toBeTruthy();
    expect(screen.getByText('AI · context')).toBeTruthy();
    expect(screen.getAllByText('Learner').length).toBeGreaterThan(0);
    expect(screen.getByText('AI context only — cannot satisfy learner evidence alone')).toBeTruthy();
  });

  it('reveals the sanitized timeline in backend sequence order', () => {
    render(<CompetencyReceipt mission={mission} receipt={receipt} />);
    fireEvent.click(screen.getByRole('button', { name: 'View full timeline' }));

    const items = screen.getAllByText(/#(?:2|3|4|5|6|7|8)/).map((item) => item.textContent);
    expect(items).toEqual(['#2', '#3', '#4', '#5', '#6', '#7', '#8']);
    expect(screen.getByText('Ordered, backend-sanitized events from this investigation.')).toBeTruthy();
  });
});
