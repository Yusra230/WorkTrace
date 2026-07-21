// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MissionEntry from './MissionEntry';

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
  context: 'Payment failures increased after July 14.',
  seed_data: 'Spike in payment failures starting July 14.',
  codebase_files: ['frontend/Checkout.js', 'frontend/Cart.js', 'backend/routes/checkout.js']
};

describe('MissionEntry', () => {
  it('renders preview mission data and starts only after acknowledgement', () => {
    const onStart = vi.fn();
    const { container } = render(<MissionEntry mission={mission} isLoading={false} onRetry={vi.fn()} onStart={onStart} />);

    expect(screen.getByText('NovaCommerce')).toBeTruthy();
    expect(screen.getByText('Role: Junior Product Engineer')).toBeTruthy();
    expect(screen.getByText('Checkout Conversion Drop')).toBeTruthy();
    expect(screen.getByText('Checkout conversion has dropped 12%. Investigate and propose a fix.')).toBeTruthy();
    expect(screen.getByText('backend/routes/checkout.js')).toBeTruthy();

    const start = screen.getByRole('button', { name: 'Start Investigation' });
    expect(start.disabled).toBe(true);
    fireEvent.click(container.querySelector('label > span'));
    expect(start.disabled).toBe(false);
    fireEvent.click(start);
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
