// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement, Fragment } from 'react';
import EvaluationTransition from './EvaluationTransition';

vi.mock('framer-motion', () => {
  const motion = new Proxy({}, {
    get: (_, element) => ({ children, ...props }) => {
      for (const key of ['animate', 'custom', 'exit', 'initial', 'transition', 'variants', 'viewport', 'whileInView']) delete props[key];
      return createElement(element, props, children);
    }
  });
  return { AnimatePresence: ({ children }) => createElement(Fragment, null, children), motion };
});

afterEach(cleanup);

describe('EvaluationTransition', () => {
  it('starts evaluation once when ready and waits for the real completed state before exposing the receipt action', async () => {
    const onGenerate = vi.fn();
    const onViewReceipt = vi.fn();
    const { rerender } = render(<EvaluationTransition status="ready" onGenerate={onGenerate} onRetry={vi.fn()} onViewReceipt={onViewReceipt} />);

    await waitFor(() => expect(onGenerate).toHaveBeenCalledTimes(1));
    rerender(<EvaluationTransition status="ready" onGenerate={onGenerate} onRetry={vi.fn()} onViewReceipt={onViewReceipt} />);
    expect(onGenerate).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'View Competency Receipt' })).toBeNull();

    rerender(<EvaluationTransition status="completed" onGenerate={onGenerate} onRetry={vi.fn()} onViewReceipt={onViewReceipt} />);
    fireEvent.click(screen.getByRole('button', { name: 'View Competency Receipt' }));
    expect(onViewReceipt).toHaveBeenCalledTimes(1);
  });

  it('shows the backend evaluation error and keeps retry explicit', () => {
    const onRetry = vi.fn();
    render(<EvaluationTransition status="error" error="AI service temporarily unavailable." onGenerate={vi.fn()} onRetry={onRetry} onViewReceipt={vi.fn()} />);

    expect(screen.getByRole('alert').textContent).toContain('AI service temporarily unavailable.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry evaluation' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
