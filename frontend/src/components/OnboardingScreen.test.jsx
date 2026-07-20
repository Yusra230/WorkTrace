// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import OnboardingScreen from './OnboardingScreen';

afterEach(cleanup);

describe('OnboardingScreen', () => {
  it('starts the existing investigation flow from its primary action', () => {
    const onStart = vi.fn();
    render(<OnboardingScreen isStarting={false} onStart={onStart} />);

    fireEvent.click(screen.getByRole('button', { name: 'Start investigation' }));

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('heading', { name: 'Show how you work with AI.' })).toBeTruthy();
  });

  it('keeps the primary action reachable with a keyboard', () => {
    render(<OnboardingScreen isStarting={false} onStart={vi.fn()} />);
    const startButton = screen.getByRole('button', { name: 'Start investigation' });

    startButton.focus();

    expect(document.activeElement).toBe(startButton);
  });

  it('reveals its editorial composition once the intro has completed', () => {
    const { container, rerender } = render(<OnboardingScreen isStarting={false} isVisible={false} onStart={vi.fn()} />);

    expect(container.querySelector('.worktrace-onboarding')?.classList.contains('worktrace-onboarding--revealed')).toBe(false);

    rerender(<OnboardingScreen isStarting={false} isVisible onStart={vi.fn()} />);

    expect(container.querySelector('.worktrace-onboarding')?.classList.contains('worktrace-onboarding--revealed')).toBe(true);
  });

  it('keeps the action disabled while the investigation starts and presents an error when supplied', () => {
    render(<OnboardingScreen error="Unable to start the investigation." isStarting onStart={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Starting mission…' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('alert').textContent).toBe('Unable to start the investigation.');
  });
});
