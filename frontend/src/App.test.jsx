// @vitest-environment jsdom
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Provider } from 'react-redux';
import App from './App';
import worktraceReducer, { applicationViews, initialState } from './features/worktrace/worktraceSlice';
import { clearActiveSession, saveActiveSession } from './services/activeSessionStorage';
import { saveCompletedSessionId } from './services/receiptStorage';
import { getMissionPreview, getReceipt, startSession } from './services/worktraceApi';

vi.mock('./components/Home', () => ({
  default: ({ onStart }) => <section aria-label="Public landing"><button type="button" onClick={onStart}>See an Investigation</button><button type="button" onClick={onStart}>Request Access</button></section>
}));
vi.mock('./components/MissionEntry', () => ({ default: ({ mission, onStart }) => <section aria-label="Mission entry"><p>{mission?.title || 'Loading mission'}</p><button type="button" onClick={onStart}>Start Investigation</button></section> }));
vi.mock('./components/InvestigationWorkSpace', () => ({ default: () => <p>Internal workspace</p> }));
vi.mock('./components/EvaluationTransition', () => ({ default: ({ onViewReceipt, status }) => <section aria-label="Evaluation transition"><p>{status}</p><button type="button" onClick={onViewReceipt}>View Competency Receipt</button></section> }));
vi.mock('./components/CompetencyReceipt', () => ({ default: () => <p>Restored receipt</p> }));
vi.mock('./services/worktraceApi', () => ({
  generateReceipt: vi.fn(),
  getMissionPreview: vi.fn(() => Promise.resolve({ title: 'Checkout Conversion Drop' })),
  getReceipt: vi.fn(() => Promise.resolve({ session_id: 'receipt-1' })),
  logEvent: vi.fn(),
  sendChat: vi.fn(),
  startSession: vi.fn(() => Promise.resolve({ session_id: 'new-session', mission: { title: 'Checkout Conversion Drop' } })),
  submitFollowUp: vi.fn(),
  submitSolution: vi.fn()
}));

const activeSession = {
  sessionId: 'active-session-1', mission: { title: 'Investigate the issue' }, currentView: 'workspace', selectedFilePath: 'src/api.js', chatTranscript: [], evidenceItems: [], offeredSuggestion: null, suggestionId: null, suggestionDecision: null, verification: { status: 'idle' }, submission: {}, followUp: {}, evaluation: { status: 'idle' }
};

function renderApp(preloadedState) {
  const store = configureStore({ reducer: { worktrace: worktraceReducer }, preloadedState: preloadedState ? { worktrace: preloadedState } : undefined });
  return render(<Provider store={store}><App /></Provider>);
}

function setHash(hash) {
  window.location.hash = hash;
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  clearActiveSession();
  setHash('#/');
  vi.clearAllMocks();
});

describe('public and internal entry routing', () => {
  it('renders the public landing at #/ when there is no restoration', async () => {
    renderApp();
    expect(await screen.findByLabelText('Public landing')).toBeTruthy();
  });

  it.each(['See an Investigation', 'Request Access'])('opens MissionEntry from %s without creating a session', async (label) => {
    renderApp();
    fireEvent.click(await screen.findByRole('button', { name: label }));

    expect(window.location.hash).toBe('#/investigate');
    expect(await screen.findByLabelText('Mission entry')).toBeTruthy();
    await waitFor(() => expect(getMissionPreview).toHaveBeenCalledTimes(1));
    expect(startSession).not.toHaveBeenCalled();
  });

  it('starts one session from MissionEntry and reaches the workspace', async () => {
    setHash('#/investigate');
    renderApp();
    await screen.findByLabelText('Mission entry');
    fireEvent.click(screen.getByRole('button', { name: 'Start Investigation' }));

    await waitFor(() => expect(startSession).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Internal workspace')).toBeTruthy();
  });

  it('returns to the landing when Back changes #/investigate to #/', async () => {
    setHash('#/investigate');
    renderApp();
    await screen.findByLabelText('Mission entry');
    setHash('#/');
    expect(await screen.findByLabelText('Public landing')).toBeTruthy();
  });

  it('restores an active session directly into the workspace', async () => {
    saveActiveSession(activeSession);
    setHash('#/investigate');
    renderApp();

    expect(await screen.findByText('Internal workspace')).toBeTruthy();
    expect(document.querySelector('.worktrace-internal-app')).toBeTruthy();
    expect(screen.queryByLabelText('Mission entry')).toBeNull();
  });

  it('keeps completed receipt restoration ahead of MissionEntry', async () => {
    saveCompletedSessionId('receipt-1');
    setHash('#/');
    renderApp();

    await waitFor(() => expect(getReceipt).toHaveBeenCalledWith({ sessionId: 'receipt-1' }));
    expect(await screen.findByText('Restored receipt')).toBeTruthy();
    expect(window.location.hash).toBe('#/investigate');
  });

  it('moves from a completed evaluation transition into the receipt only after View Competency Receipt', async () => {
    const state = {
      ...initialState,
      sessionId: 'finished-session',
      mission: { title: 'Checkout Conversion Drop' },
      currentView: applicationViews.EVALUATING,
      competencyReceipt: { session_id: 'finished-session', scores: {}, evidence: [], event_timeline: [] },
      evaluation: { status: 'completed', attempts: 1 },
      receiptRestoration: { status: 'not-found' }
    };
    setHash('#/investigate');
    renderApp(state);

    await screen.findByLabelText('Evaluation transition');
    fireEvent.click(screen.getByRole('button', { name: 'View Competency Receipt' }));
    expect(await screen.findByText('Restored receipt')).toBeTruthy();
  });
});
