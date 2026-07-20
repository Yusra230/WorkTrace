// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { ACTIVE_SESSION_KEY, clearActiveSession, getActiveSessionSnapshot, saveActiveSession } from './activeSessionStorage';

const activeState = {
  sessionId: 'session-123',
  mission: { id: 'nova-commerce-checkout' },
  currentView: 'workspace',
  selectedFilePath: 'frontend/Checkout.js',
  chatTranscript: [],
  evidenceItems: [],
  offeredSuggestion: null,
  suggestionId: null,
  suggestionDecision: null,
  verification: { status: 'idle', rationale: '' },
  submission: { solution: '', justification: '' },
  followUp: { question: '', answer: '' },
  evaluation: { status: 'idle', attempts: 0 },
  competencyReceipt: null
};

afterEach(() => window.sessionStorage.clear());

describe('activeSessionStorage', () => {
  it('stores and restores an active investigation snapshot', () => {
    expect(saveActiveSession(activeState)).toBe(true);
    expect(getActiveSessionSnapshot()).toMatchObject({ sessionId: 'session-123', currentView: 'workspace' });
  });

  it('discards malformed and completed-session snapshots', () => {
    window.sessionStorage.setItem(ACTIVE_SESSION_KEY, '{not-json');
    expect(getActiveSessionSnapshot()).toBeNull();
    expect(window.sessionStorage.getItem(ACTIVE_SESSION_KEY)).toBeNull();

    window.sessionStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({ version: 1, state: { ...activeState, competencyReceipt: { session_id: 'session-123' } } }));
    expect(getActiveSessionSnapshot()).toBeNull();
  });

  it('clears the active snapshot when the workflow is complete', () => {
    saveActiveSession(activeState);
    clearActiveSession();
    expect(getActiveSessionSnapshot()).toBeNull();
  });
});
