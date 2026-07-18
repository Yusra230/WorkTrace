import { useDispatch, useSelector } from 'react-redux';
import { novaCommerceCodebase } from '../data/novaCommerceCodebase';
import { applicationViews, clearEvidenceError, clearRecoverableError, collectEvidence, persistEvidence, recordSuggestionDecision, sendChat, setCurrentView, setSelectedFilePath, setVerificationRationale, verifySuggestionDecision } from '../features/worktrace/worktraceSlice';
import ChatPanel from './ChatPanel';
import CodeViewer from './CodeViewer';
import FileExplorer from './FileExplorer';
import MissionHeader from './MissionHeader';
import MissionSignalsCard from './MissionSignalsCard';
import SuggestionDecisionCard from './SuggestionDecisionCard';
import InvestigationStatusStrip from './InvestigationStatusStrip';
import EvidenceBoard from './EvidenceBoard';

export default function WorkspaceScreen() {
  const dispatch = useDispatch();
  const { chatTranscript, errorScope, evidenceError, evidenceItems, loading, mission, offeredSuggestion, recoverableError, selectedFilePath, suggestionDecision, suggestionId, verification } = useSelector((state) => state.worktrace);
  const selectedFile = novaCommerceCodebase.files.find((file) => file.path === selectedFilePath);
  const teammateMessageCount = chatTranscript.filter((message) => message.role === 'teammate').length;

  return (
    <section className="space-y-6">
      <MissionHeader mission={mission} messageCount={teammateMessageCount} />
      <InvestigationStatusStrip chatTranscript={chatTranscript} evidenceItems={evidenceItems} offeredSuggestion={offeredSuggestion} suggestionDecision={suggestionDecision} verificationStatus={verification.status} />
      {verification.status === 'completed' && <button type="button" onClick={() => dispatch(setCurrentView(applicationViews.SUBMISSION))} className="inline-flex items-center justify-center rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">Prepare final proposal</button>}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
          <FileExplorer files={novaCommerceCodebase.files} selectedFilePath={selectedFilePath} onSelect={(path) => dispatch(setSelectedFilePath(path))} />
          <CodeViewer file={selectedFile} />
        </div>
        <aside className="grid gap-6 content-start">
          <EvidenceBoard activeHypothesisId={suggestionId} evidenceError={evidenceError} evidenceItems={evidenceItems} onAddEvidence={(evidence) => dispatch(collectEvidence(evidence))} onClearError={() => dispatch(clearEvidenceError())} onRetryEvidence={(evidence) => dispatch(persistEvidence(evidence))} />
          <MissionSignalsCard mission={mission} />
          {offeredSuggestion && <SuggestionDecisionCard error={errorScope === 'decision' ? recoverableError : null} evidenceItems={evidenceItems} isRecording={loading.logDecision} isVerifying={loading.verifyDecision} onClearError={() => dispatch(clearRecoverableError())} onRationaleChange={(rationale) => dispatch(setVerificationRationale(rationale))} onRecord={(decision) => dispatch(recordSuggestionDecision(decision))} onVerify={() => dispatch(verifySuggestionDecision())} rationale={verification.rationale} suggestion={offeredSuggestion} suggestionDecision={suggestionDecision} suggestionId={suggestionId} verificationStatus={verification.status} />}
          <ChatPanel error={errorScope === 'chat' ? recoverableError : null} isSending={loading.sendChat} messages={chatTranscript} onClearError={() => dispatch(clearRecoverableError())} onSend={(message) => dispatch(sendChat(message))} />
        </aside>
      </div>
    </section>
  );
}
