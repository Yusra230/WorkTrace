import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AppShell from './components/AppShell';
import OnboardingScreen from './components/OnboardingScreen';
import WorkspaceScreen from './components/WorkspaceScreen';
import EvaluationScreen from './components/EvaluationScreen';
import FollowUpScreen from './components/FollowUpScreen';
import SubmissionScreen from './components/SubmissionScreen';
import ReceiptScreen from './components/ReceiptScreen';
import { applicationViews, clearRecoverableError, generateReceipt, markReceiptRestorationChecked, restoreReceipt, retryReceiptGeneration, setFollowUpAnswer, setSubmissionField, startSession, submitFollowUp, submitSolution } from './features/worktrace/worktraceSlice';
import { getCompletedSessionId } from './services/receiptStorage';

export default function App() {
  const dispatch = useDispatch();
  const { competencyReceipt, currentView, errorScope, evaluation, followUp, loading, receiptRestoration, recoverableError, submission } = useSelector((state) => state.worktrace);

  useEffect(() => {
    if (receiptRestoration.status !== 'idle') return;
    const completedSessionId = getCompletedSessionId();
    if (completedSessionId) {
      dispatch(restoreReceipt(completedSessionId));
    } else {
      dispatch(markReceiptRestorationChecked());
    }
  }, [dispatch, receiptRestoration.status]);

  return (
    <AppShell>
      {currentView === applicationViews.ONBOARDING && (
        <OnboardingScreen
          error={recoverableError}
          isStarting={loading.startSession}
          onStart={() => dispatch(startSession())}
        />
      )}
      {currentView === applicationViews.WORKSPACE && (
        <WorkspaceScreen />
      )}
      {currentView === applicationViews.SUBMISSION && (
        <SubmissionScreen error={errorScope === 'submission' ? recoverableError : null} isSubmitting={loading.submitSolution} onClearError={() => dispatch(clearRecoverableError())} onFieldChange={(field, value) => dispatch(setSubmissionField({ field, value }))} onSubmit={() => dispatch(submitSolution())} submission={submission} />
      )}
      {currentView === applicationViews.FOLLOW_UP && (
        <FollowUpScreen answer={followUp.answer} error={errorScope === 'follow-up' ? recoverableError : null} isSubmitting={loading.submitFollowUp} onAnswerChange={(answer) => dispatch(setFollowUpAnswer(answer))} onClearError={() => dispatch(clearRecoverableError())} onSubmit={() => dispatch(submitFollowUp())} question={followUp.question} />
      )}
      {currentView === applicationViews.EVALUATING && <EvaluationScreen error={errorScope === 'receipt' ? recoverableError : null} onGenerate={() => dispatch(generateReceipt())} onRetry={() => dispatch(retryReceiptGeneration())} status={evaluation.status} />}
      {currentView === applicationViews.RECEIPT && <ReceiptScreen receipt={competencyReceipt} />}
    </AppShell>
  );
}
