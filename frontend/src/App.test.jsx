// @vitest-environment jsdom
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Provider } from 'react-redux';
import App from './App';
import worktraceReducer from './features/worktrace/worktraceSlice';
import { clearActiveSession, saveActiveSession } from './services/activeSessionStorage';
import { saveCompletedSessionId } from './services/receiptStorage';
import { getReceipt } from './services/worktraceApi';

vi.mock('./components/AppShell', () => ({
  default: ({ children }) => (
    <div data-testid="app-shell">
      <p>WorkTrace</p>
      <p>Competency evidence for AI-native work</p>
      <p>Server-side AI</p>
      {children}
    </div>
  )
}));
vi.mock('./components/Home', () => ({
  default: () => <section aria-label="Public landing"><button type="button">See an Investigation</button></section>
}));
vi.mock('./components/OnboardingScreen', () => ({ default: () => <p>Internal onboarding</p> }));
vi.mock('./components/InvestigationWorkSpace', () => ({ default: () => <p>Internal workspace</p> }));
vi.mock('./components/EvaluationScreen', () => ({ default: () => <p>Evaluation</p> }));
vi.mock('./components/ReceiptScreen', () => ({ default: () => <p>Restored receipt</p> }));
vi.mock('./services/worktraceApi', () => ({
  generateReceipt: vi.fn(),
  getReceipt: vi.fn(() => Promise.resolve({ session_id: 'receipt-1' })),
  logEvent: vi.fn(),
  sendChat: vi.fn(),
  startSession: vi.fn(() => new Promise(() => {})),
  submitFollowUp: vi.fn(),
  submitSolution: vi.fn()
}));

const activeSession = {
  sessionId: 'active-session-1',
  mission: { title: 'Investigate the issue' },
  currentView: 'workspace',
  selectedFilePath: 'src/api.js',
  chatTranscript: [],
  evidenceItems: [],
  offeredSuggestion: null,
  suggestionId: null,
  suggestionDecision: null,
  verification: { status: 'idle' },
  submission: {},
  followUp: {},
  evaluation: { status: 'idle' }
};

function renderApp() {
  const store = configureStore({ reducer: { worktrace: worktraceReducer } });
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
    setHash('#/');
    renderApp();

    expect(await screen.findByLabelText('Public landing')).toBeTruthy();
  });

  it('moves from the landing CTA into #/investigate', async () => {
    setHash('#/');
    renderApp();

    fireEvent.click(await screen.findByRole('button', { name: 'See an Investigation' }));
    expect(window.location.hash).toBe('#/investigate');
    expect(await screen.findByText('Internal onboarding')).toBeTruthy();
  });

  it('returns to the landing when Back changes #/investigate to #/', async () => {
    setHash('#/');
    renderApp();
    fireEvent.click(await screen.findByRole('button', { name: 'See an Investigation' }));
    expect(await screen.findByText('Internal onboarding')).toBeTruthy();

    setHash('#/');
    expect(await screen.findByLabelText('Public landing')).toBeTruthy();
  });

  it('restores an active session on a refreshed #/investigate route', async () => {
    saveActiveSession(activeSession);
    setHash('#/investigate');
    renderApp();

    expect(await screen.findByText('Internal workspace')).toBeTruthy();
    expect(document.querySelector('.worktrace-internal-app')).toBeTruthy();
    expect(screen.queryByTestId('app-shell')).toBeNull();
    expect(screen.queryByText('WorkTrace')).toBeNull();
    expect(screen.queryByText('Competency evidence for AI-native work')).toBeNull();
    expect(screen.queryByText('Server-side AI')).toBeNull();
    expect(window.location.hash).toBe('#/investigate');
  });

  it('uses a restored session for initial entry only, then allows a later root navigation', async () => {
    saveActiveSession(activeSession);
    setHash('#/');
    renderApp();

    expect(await screen.findByText('Internal workspace')).toBeTruthy();
    await waitFor(() => expect(window.location.hash).toBe('#/investigate'));

    setHash('#/');
    expect(await screen.findByLabelText('Public landing')).toBeTruthy();
  });

  it('keeps completed receipt restoration ahead of the public landing', async () => {
    saveCompletedSessionId('receipt-1');
    setHash('#/');
    renderApp();

    await waitFor(() => expect(getReceipt).toHaveBeenCalledWith({ sessionId: 'receipt-1' }));
    expect(await screen.findByText('Restored receipt')).toBeTruthy();
    expect(window.location.hash).toBe('#/investigate');
  });
});
