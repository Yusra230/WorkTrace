import { useDispatch, useSelector } from 'react-redux';
import { novaCommerceCodebase } from '../data/novaCommerceCodebase';
import { applicationViews, clearRecoverableError, recordSuggestionDecision, sendChat, setCurrentView, setSelectedFilePath, setVerificationRationale, verifySuggestionDecision } from '../features/worktrace/worktraceSlice';
import ChatPanel from './ChatPanel';
import CodeViewer from './CodeViewer';
import FileExplorer from './FileExplorer';
import MissionHeader from './MissionHeader';
import MissionSignalsCard from './MissionSignalsCard';
import SuggestionDecisionCard from './SuggestionDecisionCard';
import InvestigationStatusStrip from './InvestigationStatusStrip';

export default function WorkspaceScreen() {
  const dispatch = useDispatch();
  const { chatTranscript, errorScope, loading, mission, offeredSuggestion, recoverableError, selectedFilePath, suggestionDecision, verification } = useSelector((state) => state.worktrace);
  const selectedFile = novaCommerceCodebase.files.find((file) => file.path === selectedFilePath);
  const teammateMessageCount = chatTranscript.filter((message) => message.role === 'teammate').length;

  return (
    <section className="space-y-6">
      <MissionHeader mission={mission} messageCount={teammateMessageCount} />
      <InvestigationStatusStrip messageCount={chatTranscript.length} suggestionVisible={Boolean(offeredSuggestion)} suggestionDecision={suggestionDecision} verificationStatus={verification.status} />
      {verification.status === 'completed' && <button type="button" onClick={() => dispatch(setCurrentView(applicationViews.SUBMISSION))} className="inline-flex items-center justify-center rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">Prepare final proposal</button>}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
          <FileExplorer files={novaCommerceCodebase.files} selectedFilePath={selectedFilePath} onSelect={(path) => dispatch(setSelectedFilePath(path))} />
          <CodeViewer file={selectedFile} />
        </div>
        <aside className="grid gap-6 content-start">
          <MissionSignalsCard mission={mission} />
          {offeredSuggestion && <SuggestionDecisionCard error={errorScope === 'decision' ? recoverableError : null} isRecording={loading.logDecision} isVerifying={loading.verifyDecision} onClearError={() => dispatch(clearRecoverableError())} onRationaleChange={(rationale) => dispatch(setVerificationRationale(rationale))} onRecord={(decision) => dispatch(recordSuggestionDecision(decision))} onVerify={() => dispatch(verifySuggestionDecision())} rationale={verification.rationale} suggestion={offeredSuggestion} suggestionDecision={suggestionDecision} verificationStatus={verification.status} />}
          <ChatPanel error={errorScope === 'chat' ? recoverableError : null} isSending={loading.sendChat} messages={chatTranscript} onClearError={() => dispatch(clearRecoverableError())} onSend={(message) => dispatch(sendChat(message))} />
        </aside>
      </div>
    </section>
  );
}
