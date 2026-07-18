import { FileSearch, Scale, ShieldCheck } from 'lucide-react';

export default function DecisionContextBanner({ evidenceCount, suggestionDecision, verificationStatus }) {
  const decision = suggestionDecision ? suggestionDecision[0].toUpperCase() + suggestionDecision.slice(1) : 'Recorded';
  const verified = verificationStatus === 'completed';

  return (
    <section aria-label="Investigation context" className="mb-8 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-cyan-300">Investigation context</p>
      <p className="mt-2 text-sm leading-6 text-slate-200">Your proposal follows a recorded evidence and decision trail. Continue in your own words; the final assessment considers the complete process.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-2 text-sm text-slate-300"><FileSearch aria-hidden="true" size={16} className="text-violet-200" /><span>{evidenceCount} evidence {evidenceCount === 1 ? 'item' : 'items'} saved</span></div>
        <div className="flex items-center gap-2 text-sm text-slate-300"><Scale aria-hidden="true" size={16} className="text-cyan-200" /><span>Human judgment: {decision}</span></div>
        <div className="flex items-center gap-2 text-sm text-slate-300"><ShieldCheck aria-hidden="true" size={16} className={verified ? 'text-emerald-200' : 'text-slate-500'} /><span>{verified ? 'Verification recorded' : 'Verification in progress'}</span></div>
      </div>
    </section>
  );
}
