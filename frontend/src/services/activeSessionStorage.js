const ACTIVE_SESSION_KEY = 'worktrace.activeSession';
const SNAPSHOT_VERSION = 1;
const RESTORABLE_VIEWS = new Set(['workspace', 'submission', 'follow-up', 'evaluating']);

const snapshotFields = [
  'sessionId',
  'mission',
  'currentView',
  'selectedFilePath',
  'chatTranscript',
  'evidenceItems',
  'offeredSuggestion',
  'suggestionId',
  'suggestionDecision',
  'verification',
  'submission',
  'followUp',
  'evaluation'
];

export function isRestorableActiveSession(state) {
  return Boolean(
    state
    && typeof state.sessionId === 'string'
    && state.sessionId
    && state.mission
    && RESTORABLE_VIEWS.has(state.currentView)
    && !state.competencyReceipt
    && state.evaluation?.status !== 'generating'
  );
}

export function createActiveSessionSnapshot(state) {
  if (!isRestorableActiveSession(state)) return null;
  return {
    version: SNAPSHOT_VERSION,
    state: Object.fromEntries(snapshotFields.map((field) => [field, state[field]]))
  };
}

export function saveActiveSession(state) {
  const snapshot = createActiveSessionSnapshot(state);
  if (typeof window === 'undefined' || !snapshot) return false;
  window.sessionStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(snapshot));
  return true;
}

export function clearActiveSession() {
  if (typeof window !== 'undefined') window.sessionStorage.removeItem(ACTIVE_SESSION_KEY);
}

export function getActiveSessionSnapshot() {
  if (typeof window === 'undefined') return null;
  const rawSnapshot = window.sessionStorage.getItem(ACTIVE_SESSION_KEY);
  if (!rawSnapshot) return null;

  try {
    const snapshot = JSON.parse(rawSnapshot);
    if (snapshot?.version === SNAPSHOT_VERSION && isRestorableActiveSession(snapshot.state)) return snapshot.state;
  } catch {
    // A corrupted browser-session value should never block product entry.
  }

  clearActiveSession();
  return null;
}

export { ACTIVE_SESSION_KEY };
