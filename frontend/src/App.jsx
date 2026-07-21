import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import CompetencyReceipt from './components/CompetencyReceipt';
import EvaluationTransition from './components/EvaluationTransition';
import InvestigationWorkspace from './components/InvestigationWorkSpace';
import MissionEntry from './components/MissionEntry';
import Home from './components/Home';
import { applicationViews, generateReceipt, hydrateActiveSession, loadMissionPreview, markReceiptRestorationChecked, restoreReceipt, retryReceiptGeneration, startSession, viewCompetencyReceipt } from './features/worktrace/worktraceSlice';
import { clearActiveSession, getActiveSessionSnapshot, isRestorableActiveSession, saveActiveSession } from './services/activeSessionStorage';
import { getCompletedSessionId } from './services/receiptStorage';
import { resolveAppEntry } from './utils/appEntry';

function getRoute() {
  if (typeof window === 'undefined') return 'landing';
  return window.location.hash === '#/investigate' ? 'investigate' : 'landing';
}

function navigateToInvestigation() {
  if (typeof window !== 'undefined' && window.location.hash !== '#/investigate') window.location.hash = '#/investigate';
}

export default function App() {
  const dispatch = useDispatch();
  const [route, setRoute] = useState(getRoute);
  const [activeSessionChecked, setActiveSessionChecked] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [restoredActiveSession, setRestoredActiveSession] = useState(false);
  const [restoredReceipt, setRestoredReceipt] = useState(false);
  const worktrace = useSelector((state) => state.worktrace);
  const { competencyReceipt, currentView, errorScope, evaluation, loading, mission, missionPreview, receiptRestoration, recoverableError } = worktrace;

  useEffect(() => {
    const updateRoute = () => setRoute(getRoute());
    window.addEventListener('hashchange', updateRoute);
    return () => window.removeEventListener('hashchange', updateRoute);
  }, []);

  useEffect(() => {
    const snapshot = getActiveSessionSnapshot();
    if (snapshot) {
      dispatch(hydrateActiveSession(snapshot));
      setHasActiveSession(true);
      setRestoredActiveSession(true);
    }
    setActiveSessionChecked(true);
  }, [dispatch]);

  useEffect(() => {
    if (!activeSessionChecked) return;
    if (receiptRestoration.status !== 'idle') return;
    if (hasActiveSession) {
      dispatch(markReceiptRestorationChecked());
      return;
    }
    const completedSessionId = getCompletedSessionId();
    if (completedSessionId) {
      setRestoredReceipt(true);
      dispatch(restoreReceipt(completedSessionId));
    } else {
      dispatch(markReceiptRestorationChecked());
    }
  }, [activeSessionChecked, dispatch, hasActiveSession, receiptRestoration.status]);

  const restorationResolved = activeSessionChecked && receiptRestoration.status !== 'idle';
  const entry = resolveAppEntry({
    restorationResolved,
    restoredActiveSession,
    restoredReceipt,
    route
  });
  const showLanding = entry.surface === 'landing';
  const isInvestigationWorkspace = [
    applicationViews.WORKSPACE,
    applicationViews.SUBMISSION,
    applicationViews.FOLLOW_UP,
  ].includes(currentView);

  useEffect(() => {
    if (entry.normalizeToInvestigation) navigateToInvestigation();
  }, [entry.normalizeToInvestigation]);

  useEffect(() => {
    if (route !== 'investigate') return;
    if (restoredActiveSession) setRestoredActiveSession(false);
    if (restoredReceipt) setRestoredReceipt(false);
  }, [restoredActiveSession, restoredReceipt, route]);

  useEffect(() => {
    if (!restorationResolved || route !== 'investigate' || worktrace.sessionId || competencyReceipt) return;
    dispatch(loadMissionPreview());
  }, [competencyReceipt, dispatch, restorationResolved, route, worktrace.sessionId]);

  useEffect(() => {
    if (!restorationResolved) return;
    if (competencyReceipt || currentView === applicationViews.RECEIPT || (!worktrace.sessionId && !loading.startSession)) {
      clearActiveSession();
    } else if (isRestorableActiveSession(worktrace)) {
      saveActiveSession(worktrace);
    }
  }, [currentView, loading.startSession, restorationResolved, worktrace]);

  const startFromLanding = () => {
    navigateToInvestigation();
  };

  return (
    <>
      {showLanding && <Home onStart={startFromLanding} />}
      {entry.surface === 'product' && isInvestigationWorkspace && (
        <main className="worktrace-internal-app">
          <InvestigationWorkspace />
        </main>
      )}
      {entry.surface === 'product' && currentView === applicationViews.MISSION_ENTRY && (
        <MissionEntry
          error={missionPreview.error || (errorScope === 'session' ? recoverableError : null)}
          isLoading={missionPreview.status === 'loading' || loading.startSession}
          mission={mission}
          onRetry={() => dispatch(errorScope === 'session' ? startSession() : loadMissionPreview())}
          onStart={() => dispatch(startSession())}
        />
      )}
      {entry.surface === 'product' && currentView === applicationViews.EVALUATING && (
        <EvaluationTransition
          error={errorScope === 'receipt' ? recoverableError : null}
          onGenerate={() => dispatch(generateReceipt())}
          onRetry={() => dispatch(retryReceiptGeneration())}
          onViewReceipt={() => dispatch(viewCompetencyReceipt())}
          status={evaluation.status}
        />
      )}
      {entry.surface === 'product' && currentView === applicationViews.RECEIPT && <CompetencyReceipt mission={mission} receipt={competencyReceipt} />}
    </>
  );
}
