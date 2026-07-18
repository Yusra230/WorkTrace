import DecisionTrace from './DecisionTrace';

export default function InvestigationStatusStrip({ chatTranscript, evidenceItems, offeredSuggestion, suggestionDecision, verificationStatus }) {
  return (
    <DecisionTrace mode="workspace" chatTranscript={chatTranscript} evidenceItems={evidenceItems} offeredSuggestion={offeredSuggestion} suggestionDecision={suggestionDecision} verificationStatus={verificationStatus} />
  );
}
