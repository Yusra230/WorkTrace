// @vitest-environment jsdom
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';
import InvestigationWorkspace from './InvestigationWorkSpace';
import worktraceReducer, { applicationViews, initialState } from '../features/worktrace/worktraceSlice';
import { logEvent, sendChat } from '../services/worktraceApi';

vi.mock('../services/worktraceApi', () => ({
  generateReceipt: vi.fn(),
  getReceipt: vi.fn(),
  logEvent: vi.fn(() => Promise.resolve({ event_id: 'event-1' })),
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

function renderWorkspace() {
  const store = configureStore({
    reducer: { worktrace: worktraceReducer },
    preloadedState: {
      worktrace: {
        ...initialState,
        currentView: applicationViews.WORKSPACE,
        sessionId: 'session-1',
        mission: { company: 'NovaCommerce', role: 'Junior Product Engineer', title: 'Checkout conversion drop', description: 'Investigate the checkout conversion decline.' },
        offeredSuggestion: { message: 'Re-validate the card on every retry attempt.' },
        suggestionId: 'suggestion-1',
      },
    },
  });

  return render(<Provider store={store}><InvestigationWorkspace /></Provider>);
}

afterEach(() => vi.clearAllMocks());

describe('InvestigationWorkspace', () => {
  it('connects files, chat, learner-selected evidence, decisions, and verification to the existing thunks', async () => {
    Object.defineProperty(window, 'IntersectionObserver', { configurable: true, value: Observer });
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() });
    renderWorkspace();

    fireEvent.click(screen.getByRole('button', { name: /frontend\/Cart\.js/i }));
    expect(screen.getByText(/calculateCartTotal/i)).toBeTruthy();

    const message = screen.getByPlaceholderText(/Add an investigation note/i);
    fireEvent.change(message, { target: { value: 'Inspect the retry request.' } });
    fireEvent.keyDown(message, { key: 'Enter' });
    await waitFor(() => expect(sendChat).toHaveBeenCalledWith({ sessionId: 'session-1', message: 'Inspect the retry request.' }));

    fireEvent.click(screen.getByRole('button', { name: /Mark as selected evidence/i }));
    await waitFor(() => expect(logEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'evidence_collected', sessionId: 'session-1' })));

    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    await waitFor(() => expect(logEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'suggestion_rejected', sessionId: 'session-1' })));

    fireEvent.click(await screen.findByRole('button', { name: /Record Verification/i }));
    await waitFor(() => expect(logEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'suggestion_verified', sessionId: 'session-1' })));
  });
});
