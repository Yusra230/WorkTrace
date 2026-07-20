import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AppShell from './components/AppShell';
import OnboardingScreen from './components/OnboardingScreen';
import EvaluationScreen from './components/EvaluationScreen';
import ReceiptScreen from './components/ReceiptScreen';
import InvestigationWorkspace from './components/InvestigationWorkSpace';
import Home from './components/Home';
import { applicationViews, generateReceipt, hydrateActiveSession, markReceiptRestorationChecked, restoreReceipt, retryReceiptGeneration, startSession } from './features/worktrace/worktraceSlice';
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

function PublicHome({ onStart }) {
  const handleClick = (event) => {
    const button = event.target instanceof Element ? event.target.closest('button') : null;
    const label = button?.textContent?.trim();
    if (label === 'See an Investigation' || label === 'Request Access') onStart();
  };

  return <div onClickCapture={handleClick}><Home /></div>;
}

export default function App() {
  const dispatch = useDispatch();
  const [route, setRoute] = useState(getRoute);
  const [activeSessionChecked, setActiveSessionChecked] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [restoredActiveSession, setRestoredActiveSession] = useState(false);
  const [restoredReceipt, setRestoredReceipt] = useState(false);
  const worktrace = useSelector((state) => state.worktrace);
  const { competencyReceipt, currentView, errorScope, evaluation, loading, mission, receiptRestoration, recoverableError } = worktrace;

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
    if (!restorationResolved) return;
    if (currentView === applicationViews.RECEIPT || (!worktrace.sessionId && !loading.startSession)) {
      clearActiveSession();
    } else if (isRestorableActiveSession(worktrace)) {
      saveActiveSession(worktrace);
    }
  }, [currentView, loading.startSession, restorationResolved, worktrace]);

  const startFromLanding = () => {
    navigateToInvestigation();
    dispatch(startSession());
  };

  return (
    <>
      {showLanding && <PublicHome onStart={startFromLanding} />}
      {entry.surface === 'product' && isInvestigationWorkspace && (
        <main className="worktrace-internal-app">
          <InvestigationWorkspace />
        </main>
      )}
      {entry.surface === 'product' && !isInvestigationWorkspace && (
        <AppShell variant={currentView === applicationViews.ONBOARDING ? 'onboarding' : 'default'}>
          {currentView === applicationViews.ONBOARDING && (
            <OnboardingScreen
              error={recoverableError}
              isStarting={loading.startSession}
              onStart={() => dispatch(startSession())}
            />
          )}
          {currentView === applicationViews.EVALUATING && <EvaluationScreen error={errorScope === 'receipt' ? recoverableError : null} onGenerate={() => dispatch(generateReceipt())} onRetry={() => dispatch(retryReceiptGeneration())} status={evaluation.status} />}
          {currentView === applicationViews.RECEIPT && <ReceiptScreen mission={mission} receipt={competencyReceipt} />}
        </AppShell>
      )}
    </>
  );
}
