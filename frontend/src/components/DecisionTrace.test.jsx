// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import DecisionTrace from './DecisionTrace';

const recordedTimeline = [
  { event_id: 'event-1', sequence: 1, type: 'user_prompt', data: { message: 'What is causing the checkout drop?' } },
  { event_id: 'event-2', sequence: 2, type: 'evidence_collected', data: { title: 'Validation failures', description: 'Repeated 400 validation errors require amount_cents after the SDK migration.', source: 'Deployment logs', relation: 'contradicts', created_by: 'learner' } },
  { event_id: 'event-3', sequence: 3, type: 'suggestion_offered', data: { suggestion: 'Database timeout' } },
  { event_id: 'event-4', sequence: 4, type: 'suggestion_rejected', data: { reason: 'The validation failures directly contradict a database-timeout explanation.' } },
  { event_id: 'event-5', sequence: 5, type: 'suggestion_verified', data: { decision: 'rejected', reason: 'Confirmed against logs and the SDK contract.' } },
  { event_id: 'event-6', sequence: 6, type: 'submission', data: { solution: 'Restore the required amount_cents field.' } },
  { event_id: 'event-7', sequence: 7, type: 'follow_up_answer', data: { answer: 'The SDK contract is the direct failure source.' } },
  { event_id: 'event-8', sequence: 8, type: 'evaluation_completed', data: { status: 'completed' } }
];

afterEach(cleanup);

describe('DecisionTrace', () => {
  it('derives a compact workspace progression from recorded investigation state', () => {
    render(<DecisionTrace mode="workspace" chatTranscript={[{ id: 'learner-1', role: 'learner', content: 'Investigate the drop.' }]} evidenceItems={[{ id: 'evidence-1', persistenceStatus: 'persisted' }]} offeredSuggestion={{ message: 'Database timeout' }} suggestionDecision="rejected" verificationStatus="completed" />);

    expect(screen.getByText('5 of 5 decision stages recorded')).toBeTruthy();
    expect(screen.getByText('Learner rejected')).toBeTruthy();
    expect(screen.getByText('Proposal')).toBeTruthy();
  });

  it('makes a verified learner rejection the pivotal receipt moment with traceable evidence', () => {
    render(<DecisionTrace mode="receipt" timeline={recordedTimeline} />);

    expect(screen.getByText('The human judgment behind this receipt')).toBeTruthy();
    expect(screen.getByText('Database timeout')).toBeTruthy();
    expect(screen.getByText('Rejected')).toBeTruthy();
    expect(screen.getByText('The validation failures directly contradict a database-timeout explanation.')).toBeTruthy();
    expect(screen.getByText('Decision confirmed against evidence')).toBeTruthy();
    expect(screen.getByText('Repeated 400 validation errors require amount_cents after the SDK migration.')).toBeTruthy();
    expect(screen.getByText('Event #4 · event-4')).toBeTruthy();
    expect(screen.getByText('Event #5 · event-5')).toBeTruthy();
    expect(screen.getByText(/selected by learner/)).toBeTruthy();
  });

  it('renders acceptance as a factual decision without rejection messaging', () => {
    const acceptedTimeline = recordedTimeline.map((event) => event.type === 'suggestion_rejected'
      ? { ...event, type: 'suggestion_accepted', data: { reason: 'The learner recorded this decision.' } }
      : event);
    render(<DecisionTrace mode="receipt" timeline={acceptedTimeline} />);

    expect(screen.getByText('Accepted')).toBeTruthy();
    expect(screen.queryByText('Rejected')).toBeNull();
    expect(screen.getByText('Decision confirmed against evidence')).toBeTruthy();
  });

  it('does not invent a pivotal decision when the receipt has no decision events', () => {
    render(<DecisionTrace mode="receipt" timeline={[recordedTimeline[0]]} />);

    expect(screen.getByText('No decision trace events were retained in this receipt.')).toBeTruthy();
    expect(screen.queryByText('Rejected')).toBeNull();
  });
});
