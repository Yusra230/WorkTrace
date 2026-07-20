export function resolveAppEntry({ restoredActiveSession, restoredReceipt, restorationResolved, route }) {
  if (!restorationResolved) return { surface: 'pending', normalizeToInvestigation: false };

  if (route === 'investigate') return { surface: 'product', normalizeToInvestigation: false };

  if (restoredActiveSession || restoredReceipt) {
    return { surface: 'product', normalizeToInvestigation: route !== 'investigate' };
  }

  return { surface: 'landing', normalizeToInvestigation: false };
}
