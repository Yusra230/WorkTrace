import { ClipboardCheck, MessageSquareText, SearchCheck } from 'lucide-react';

export default function InvestigationStatusStrip({ messageCount, suggestionDecision, suggestionVisible, verificationStatus }) {
  const verificationLabel = verificationStatus === 'completed'
    ? 'Verification complete'
    : suggestionDecision
      ? 'Decision recorded'
      : suggestionVisible
        ? 'Hypothesis ready to review'
        : 'Awaiting AI hypothesis';

  return (
    <section aria-label="Investigation status" className="grid gap-px overflow-hidden rounded-xl border border-slate-800 bg-slate-800 sm:grid-cols-3">
      <div className="flex items-center gap-3 bg-slate-900 px-4 py-3"><MessageSquareText aria-hidden="true" size={17} className="text-cyan-300" /><span><span className="block text-xs text-slate-500">Conversation</span><span className="text-sm font-medium text-slate-200">{messageCount} messages confirmed</span></span></div>
      <div className="flex items-center gap-3 bg-slate-900 px-4 py-3"><SearchCheck aria-hidden="true" size={17} className="text-amber-300" /><span><span className="block text-xs text-slate-500">AI hypothesis</span><span className="text-sm font-medium text-slate-200">{suggestionVisible ? 'Surfaced for review' : 'Not surfaced yet'}</span></span></div>
      <div className="flex items-center gap-3 bg-slate-900 px-4 py-3"><ClipboardCheck aria-hidden="true" size={17} className="text-emerald-300" /><span><span className="block text-xs text-slate-500">Evidence check</span><span className="text-sm font-medium text-slate-200">{verificationLabel}</span></span></div>
    </section>
  );
}
