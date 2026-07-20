import { describe, expect, it } from 'vitest';
import { resolveAppEntry } from './appEntry';

describe('resolveAppEntry', () => {
  it('keeps the landing unavailable until restoration resolves', () => {
    expect(resolveAppEntry({ restoredActiveSession: false, restoredReceipt: false, restorationResolved: false, route: 'landing' })).toEqual({ surface: 'pending', normalizeToInvestigation: false });
  });

  it('restores an active investigation ahead of the public landing', () => {
    expect(resolveAppEntry({ restoredActiveSession: true, restoredReceipt: false, restorationResolved: true, route: 'landing' })).toEqual({ surface: 'product', normalizeToInvestigation: true });
  });

  it('keeps a completed receipt ahead of the public landing', () => {
    expect(resolveAppEntry({ restoredActiveSession: false, restoredReceipt: true, restorationResolved: true, route: 'landing' })).toEqual({ surface: 'product', normalizeToInvestigation: true });
  });

  it('returns an intentional Back navigation to the landing even when an investigation remains in memory', () => {
    expect(resolveAppEntry({ restoredActiveSession: false, restoredReceipt: false, restorationResolved: true, route: 'landing' })).toEqual({ surface: 'landing', normalizeToInvestigation: false });
    expect(resolveAppEntry({ restoredActiveSession: false, restoredReceipt: false, restorationResolved: true, route: 'investigate' })).toEqual({ surface: 'product', normalizeToInvestigation: false });
  });
});
