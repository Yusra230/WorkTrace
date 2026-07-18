import { BadgeCheck, Check, CircleAlert, ShieldCheck, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useState } from 'react';

function extractHypothesis(message) {
  const marker = 'One hypothesis to consider:';
  const markerIndex = message.indexOf(marker);
  return markerIndex >= 0 ? message.slice(markerIndex + marker.length).trim() : message;
}

export default function SuggestionDecisionCard({ error, evidenceItems, isRecording, isVerifying, onClearError, onRecord, onVerify, onRationaleChange, rationale, suggestion, suggestionDecision, suggestionId, verificationStatus }) {
  const [selectedDecision, setSelectedDecision] = useState(null);
  const isComplete = verificationStatus === 'completed';
  const isRecorded = Boolean(suggestionDecision);
  const isRejected = suggestionDecision === 'rejected';
  const linkedEvidence = evidenceItems.filter((item) => item.persistenceStatus === 'persisted' && item.linkedHypothesisId === suggestionId);
  const contradictingEvidence = linkedEvidence.filter((item) => item.relation === 'contradicts').length;
  const supportingEvidence = linkedEvidence.filter((item) => item.relation === 'supports').length;

  return (
    <section aria-labelledby="hypothesis-heading" className={`rounded-2xl border p-5 ${isRejected && isComplete ? 'border-rose-300/35 bg-rose-300/[0.06]' : 'border-amber-300/30 bg-amber-300/5'}`}>
      <div className="flex gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-300/15 text-amber-200"><CircleAlert aria-hidden="true" size={19} /></span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-300">AI hypothesis</p>
          <h2 id="hypothesis-heading" className="mt-1 font-semibold text-white">AI input requires human judgment</h2>
        </div>
      </div>
      <p className="mt-4 rounded-xl border border-slate-700 bg-slate-950/30 p-3 text-sm leading-6 text-slate-200">{extractHypothesis(suggestion.message)}</p>
      <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/20 px-3 py-2.5 text-xs leading-5 text-slate-400">
        {linkedEvidence.length > 0 ? <><span className="font-semibold text-slate-200">Evidence linked to this hypothesis:</span> {linkedEvidence.length} saved · {contradictingEvidence} contradicts · {supportingEvidence} supports.</> : 'No saved evidence has been linked to this hypothesis yet. Evaluate it against the mission record.'}
      </div>

      {!isRecorded && (
        <div className="mt-5">
          <p className="text-sm font-medium text-slate-200">Based on your investigation, do you accept this hypothesis?</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setSelectedDecision('accepted')} aria-pressed={selectedDecision === 'accepted'} className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${selectedDecision === 'accepted' ? 'border-emerald-300 bg-emerald-300/15 text-emerald-100' : 'border-slate-700 text-slate-300 hover:border-emerald-300/60'}`}><ThumbsUp aria-hidden="true" size={16} />Accept</button>
            <button type="button" onClick={() => setSelectedDecision('rejected')} aria-pressed={selectedDecision === 'rejected'} className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${selectedDecision === 'rejected' ? 'border-rose-300 bg-rose-300/15 text-rose-100' : 'border-slate-700 text-slate-300 hover:border-rose-300/60'}`}><ThumbsDown aria-hidden="true" size={16} />Reject</button>
          </div>
          <label className="mt-4 block text-sm font-medium text-slate-200" htmlFor="decision-rationale">Rationale <span className="font-normal text-slate-500">(optional)</span></label>
          <textarea id="decision-rationale" value={rationale} onChange={(event) => onRationaleChange(event.target.value)} maxLength="2000" rows="3" placeholder="What evidence informed your decision?" className="mt-2 w-full resize-none rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/30" />
          {error && <div role="alert" className="mt-3 flex items-start justify-between gap-3 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs leading-5 text-rose-100"><span>{error}</span><button type="button" onClick={onClearError} className="shrink-0 font-semibold underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">Dismiss</button></div>}
          <button type="button" disabled={!selectedDecision || isRecording} onClick={() => onRecord(selectedDecision)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-300 px-3 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-50">{isRecording ? 'Recording decision…' : 'Record decision'}<Check aria-hidden="true" size={16} /></button>
        </div>
      )}

      {isRecorded && !isComplete && (
        <div className="mt-5 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-cyan-200">Human judgment</p>
          <p className="mt-1 text-lg font-semibold text-cyan-50"><span className="capitalize">{suggestionDecision}</span> AI hypothesis</p>
          {rationale && <><p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Recorded rationale</p><p className="mt-1 text-sm leading-6 text-slate-200">{rationale}</p></>}
          <p className="mt-3 text-xs leading-5 text-slate-400">Confirm that you verified this decision against the available mission evidence.</p>
          {error && <div role="alert" className="mt-3 flex items-start justify-between gap-3 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs leading-5 text-rose-100"><span>{error}</span><button type="button" onClick={onClearError} className="shrink-0 font-semibold underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">Dismiss</button></div>}
          <button type="button" disabled={isVerifying} onClick={onVerify} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-300 px-3 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-50">{isVerifying ? 'Verifying decision…' : 'Verify decision'}<ShieldCheck aria-hidden="true" size={16} /></button>
        </div>
      )}

      {isComplete && <div className="mt-5 flex gap-3 rounded-xl border border-emerald-300/30 bg-emerald-300/10 p-4 text-sm text-emerald-50"><BadgeCheck aria-hidden="true" size={20} className="shrink-0 text-emerald-300" /><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-200">Verified human judgment</p><p className="mt-1 text-lg font-semibold">{suggestionDecision === 'rejected' ? 'AI hypothesis rejected' : 'AI hypothesis accepted'}</p>{rationale && <p className="mt-2 leading-6 text-emerald-50/90">{rationale}</p>}<p className="mt-2 text-xs leading-5 text-emerald-100/75">This decision has been recorded and verified against the investigation evidence.</p></div></div>}
    </section>
  );
}
