const COMPLETED_SESSION_KEY = 'worktrace.completedSessionId';

export function saveCompletedSessionId(sessionId) {
  if (typeof window !== 'undefined' && sessionId) {
    window.sessionStorage.setItem(COMPLETED_SESSION_KEY, sessionId);
  }
}

export function getCompletedSessionId() {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(COMPLETED_SESSION_KEY);
}
