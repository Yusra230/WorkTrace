// @vitest-environment jsdom
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';
import InvestigationWorkspace, { getCodeLanguage, getCodeViewerHeight } from './InvestigationWorkSpace';
import worktraceReducer, { applicationViews, initialState } from '../features/worktrace/worktraceSlice';
import { logEvent, sendChat, submitFollowUp } from '../services/worktraceApi';

const monacoEditor = vi.hoisted(() => ({ render: vi.fn() }));
const persistedEvidenceId = '9f8c3e6a-a938-4b6d-9a43-02521055ca9b';

vi.mock('@monaco-editor/react', () => ({
  default: (props) => {
    monacoEditor.render(props);
    return <pre data-testid="syntax-highlighted-code" data-language={props.language} data-read-only={String(props.options.readOnly)}><span className="mtk1">{props.value}</span></pre>;
  }
}));

vi.mock('../services/worktraceApi', () => ({
  generateReceipt: vi.fn(),
  getReceipt: vi.fn(),
  logEvent: vi.fn(() => Promise.resolve({ event_id: 'event-1', evidence_id: persistedEvidenceId })),
  sendChat: vi.fn(() => Promise.resolve({ ai_response: 'Inspect the retry path before deciding.' })),
  startSession: vi.fn(),
  submitFollowUp: vi.fn(),
  submitSolution: vi.fn(),
}));

class Observer {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function renderWorkspace(overrides = {}) {
  const baseWorktraceState = {
    ...initialState,
    currentView: applicationViews.WORKSPACE,
    sessionId: 'session-1',
    mission: { company: 'NovaCommerce', role: 'Junior Product Engineer', title: 'Checkout conversion drop', description: 'Investigate the checkout conversion decline.' },
    offeredSuggestion: { message: 'Re-validate the card on every retry attempt.' },
    suggestionId: 'suggestion-1',
  };
  const store = configureStore({
    reducer: { worktrace: worktraceReducer },
    preloadedState: {
      worktrace: {
        ...baseWorktraceState,
        ...overrides,
        followUp: { ...baseWorktraceState.followUp, ...overrides.followUp },
        verification: { ...baseWorktraceState.verification, ...overrides.verification },
      },
    },
  });

  return { ...render(<Provider store={store}><InvestigationWorkspace /></Provider>), store };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('InvestigationWorkspace', () => {
  it('connects files, chat, learner-selected evidence, decisions, and verification to the existing thunks', async () => {
    Object.defineProperty(window, 'IntersectionObserver', { configurable: true, value: Observer });
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() });
    const { store } = renderWorkspace();

    fireEvent.click(screen.getByRole('button', { name: /frontend\/Cart\.js/i }));
    expect(screen.getByText(/calculateCartTotal/i)).toBeTruthy();
    expect(screen.getByTestId('syntax-highlighted-code').getAttribute('data-language')).toBe('javascript');
    expect(screen.getByTestId('syntax-highlighted-code').getAttribute('data-read-only')).toBe('true');

    const message = screen.getByPlaceholderText(/Add an investigation note/i);
    fireEvent.change(message, { target: { value: 'Inspect the retry request.' } });
    fireEvent.keyDown(message, { key: 'Enter' });
    await waitFor(() => expect(sendChat).toHaveBeenCalledWith({ sessionId: 'session-1', message: 'Inspect the retry request.' }));
    expect(await screen.findByLabelText('AI Conversation')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Code' }));
    fireEvent.click(screen.getByRole('button', { name: /Mark as selected evidence/i }));
    await waitFor(() => expect(logEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'evidence_collected', sessionId: 'session-1' })));
    const evidenceCall = logEvent.mock.calls.find(([request]) => request.type === 'evidence_collected')[0];
    expect(evidenceCall.data).not.toHaveProperty('evidence_id');
    await waitFor(() => expect(store.getState().worktrace.evidenceItems[0]?.id).toBe(persistedEvidenceId));

    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    await waitFor(() => expect(logEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'suggestion_rejected', sessionId: 'session-1' })));

    fireEvent.click(await screen.findByRole('button', { name: /Record Verification/i }));
    await waitFor(() => expect(logEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'suggestion_verified', sessionId: 'session-1' })));
  });

  it('only auto-scrolls a new chat response and preserves a learner-controlled conversation position', async () => {
    Object.defineProperty(window, 'IntersectionObserver', { configurable: true, value: Observer });
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() });
    const originalAnimationFrame = globalThis.requestAnimationFrame;
    let scheduledScroll;
    globalThis.requestAnimationFrame = (callback) => {
      scheduledScroll = callback;
      return 1;
    };
    try {
      renderWorkspace();
      const message = screen.getByPlaceholderText(/Add an investigation note/i);
      fireEvent.change(message, { target: { value: 'Show the AI conversation.' } });
      fireEvent.keyDown(message, { key: 'Enter' });

      const conversation = await screen.findByTestId('conversation-scroll-region');
      Object.defineProperties(conversation, {
        clientHeight: { configurable: true, value: 120 },
        scrollHeight: { configurable: true, value: 600 },
        scrollTop: { configurable: true, writable: true, value: 160 },
      });
      await waitFor(() => expect(scheduledScroll).toBeTypeOf('function'));
      scheduledScroll();
      expect(conversation.scrollTo).toHaveBeenCalledWith({ top: 600, behavior: 'smooth' });

      conversation.scrollTo.mockClear();
      fireEvent.scroll(conversation);
      fireEvent.change(screen.getByPlaceholderText(/Add an investigation note/i), { target: { value: 'Keep reading earlier messages.' } });
      expect(conversation.scrollTo).not.toHaveBeenCalled();
    } finally {
      globalThis.requestAnimationFrame = originalAnimationFrame;
    }
  });

  it('keeps the conversation active and preserves the existing error state when chat submission fails', async () => {
    Object.defineProperty(window, 'IntersectionObserver', { configurable: true, value: Observer });
    sendChat.mockRejectedValueOnce(new Error('AI teammate is unavailable.'));
    renderWorkspace();

    const message = screen.getByPlaceholderText(/Add an investigation note/i);
    fireEvent.change(message, { target: { value: 'Can you inspect this?' } });
    fireEvent.keyDown(message, { key: 'Enter' });

    expect(await screen.findByLabelText('AI Conversation')).toBeTruthy();
    expect((await screen.findByRole('alert')).textContent).toContain('AI teammate is unavailable.');
    expect(screen.getByPlaceholderText(/Add an investigation note/i).disabled).toBe(false);
  });

  it('keeps the composer locked during an AI request and restores it after the response', async () => {
    let resolveChat;
    sendChat.mockImplementationOnce(() => new Promise((resolve) => { resolveChat = resolve; }));
    const { store } = renderWorkspace();

    const message = screen.getByPlaceholderText(/Add an investigation note/i);
    fireEvent.change(message, { target: { value: 'Inspect the payment request.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send investigation note' }));

    expect(sendChat).toHaveBeenCalledTimes(1);
    expect(screen.getByPlaceholderText('Thinking…').disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'AI teammate is thinking' }).disabled).toBe(true);
    expect(store.getState().worktrace.chatTranscript).toMatchObject([{ role: 'learner', content: 'Inspect the payment request.', status: 'pending' }]);

    resolveChat({ ai_response: 'The request payload is missing amount_cents.' });
    expect(await screen.findByText('The request payload is missing amount_cents.')).toBeTruthy();
    expect(screen.getByPlaceholderText(/Add an investigation note/i).disabled).toBe(false);
    expect(store.getState().worktrace.chatTranscript.map((item) => item.role)).toEqual(['learner', 'teammate']);
  });

  it('maps JavaScript files to Monaco highlighting and sizes short and long source deliberately', () => {
    expect(getCodeLanguage('frontend/Checkout.js')).toBe('javascript');
    expect(getCodeLanguage('frontend/Checkout.jsx')).toBe('javascript');
    expect(getCodeLanguage('backend/routes/checkout.js')).toBe('javascript');
    expect(getCodeLanguage('notes.txt')).toBe('plaintext');
    expect(getCodeViewerHeight('const total = 0;', 900)).toBe(176);
    expect(getCodeViewerHeight(Array.from({ length: 20 }, () => 'const total = 0;').join('\n'), 900)).toBe(472);
    expect(getCodeViewerHeight(Array.from({ length: 200 }, () => 'const total = 0;').join('\n'), 600)).toBe(348);
  });

  it('keeps a follow-up answer out of the evidence timeline until Submit Answer succeeds', async () => {
    renderWorkspace({
      currentView: applicationViews.FOLLOW_UP,
      followUp: { question: 'Explain your decision.', answer: '', submittedAnswer: '' }
    });

    const answer = screen.getByPlaceholderText(/The issue is caused by X/i);
    const submit = screen.getByRole('button', { name: 'Submit Answer' });
    expect(submit.disabled).toBe(true);

    fireEvent.change(answer, { target: { value: 'I chose the request-contract investigation because the available code needs verification.' } });
    expect(submit.disabled).toBe(false);
    expect(screen.queryByText('independent_explanation')).toBeNull();
    expect(submitFollowUp).not.toHaveBeenCalled();

    let resolveSubmission;
    submitFollowUp.mockImplementationOnce(() => new Promise((resolve) => { resolveSubmission = resolve; }));
    fireEvent.click(submit);
    fireEvent.click(submit);
    expect(submitFollowUp).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Submitting…' }).disabled).toBe(true);

    resolveSubmission({ success: true, ready_for_evaluation: true });
    await waitFor(() => expect(screen.getByText('independent_explanation')).toBeTruthy());
  });

  it('retains a failed follow-up draft and shows the persistence error', async () => {
    submitFollowUp.mockRejectedValueOnce(new Error('Follow-up service is unavailable.'));
    renderWorkspace({
      currentView: applicationViews.FOLLOW_UP,
      followUp: { question: 'Explain your decision.', answer: '', submittedAnswer: '' }
    });

    const answer = screen.getByPlaceholderText(/The issue is caused by X/i);
    fireEvent.change(answer, { target: { value: 'My explanation remains available after the error.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit Answer' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Follow-up service is unavailable.');
    expect(screen.getByDisplayValue('My explanation remains available after the error.')).toBeTruthy();
    expect(screen.queryByText('independent_explanation')).toBeNull();
  });

  it('renders explicit empty and populated decision-verification states from real workflow state', () => {
    renderWorkspace();
    expect(screen.getByText('No decisions or verifications recorded yet.')).toBeTruthy();
    expect(screen.getByText(/Your decisions and verification notes will appear here/i)).toBeTruthy();

    cleanup();
    renderWorkspace({
      suggestionDecision: 'rejected',
      verification: { status: 'completed', rationale: 'The provided checkout path does not prove a timeout.' }
    });
    expect(screen.getByText('Rejected the AI suggestion.')).toBeTruthy();
    expect(screen.getByText('The provided checkout path does not prove a timeout.')).toBeTruthy();
    expect(screen.getAllByText('Incomplete').length).toBeGreaterThan(0);
  });
});
