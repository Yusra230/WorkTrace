import { Award, Bot, Check, FileSearch, FileText, MessageSquareQuote, Scale, ShieldCheck } from 'lucide-react';
import { buildWorkspaceTrace, normalizeReceiptTrace, traceEventReference, traceEventSummary } from '../utils/decisionTrace';

const workspaceStages = [
  ['investigation', 'Investigation', 'Learner questions recorded', MessageSquareQuote],
  ['evidence', 'Evidence', 'Deliberately collected evidence', FileSearch],
  ['hypothesis', 'AI hypothesis', 'Hypothesis surfaced for review', Bot],
  ['decision', 'Human judgment', 'Learner decision recorded', Scale],
  ['verification', 'Verification', 'Decision checked against evidence', ShieldCheck],
  ['proposal', 'Proposal', 'Independent recommendation', FileText]
];

const receiptStages = [
  ['investigation', 'Investigation', MessageSquareQuote],
  ['evidence', 'Evidence', FileSearch],
  ['hypothesis', 'AI hypothesis', Bot],
  ['decision', 'Human judgment', Scale],
  ['verification', 'Verification', ShieldCheck],
  ['solution', 'Solution', FileText],
  ['explanation', 'Independent explanation', MessageSquareQuote],
  ['receipt', 'Competency receipt', Award]
];

function statusTone(status) {
  if (status === 'complete') return 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100';
  if (status === 'active') return 'border-cyan-300/35 bg-cyan-300/10 text-cyan-50';
  return 'border-slate-800 bg-slate-950/20 text-slate-500';
}

function StageIcon({ Icon, status }) {
  return (
    <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${status === 'complete' ? 'bg-emerald-300/15 text-emerald-200' : status === 'active' ? 'bg-cyan-300/15 text-cyan-200' : 'bg-slate-800 text-slate-500'}`}>
      {status === 'complete' ? <Check aria-hidden="true" size={16} /> : <Icon aria-hidden="true" size={16} />}
    </span>
  );
}

function WorkspaceTrace({ chatTranscript, evidenceItems, offeredSuggestion, suggestionDecision, verificationStatus }) {
  const { activeStage, completeStages, persistedEvidence, stages } = buildWorkspaceTrace({ chatTranscript, evidenceItems, offeredSuggestion, suggestionDecision, verificationStatus });

  return (
    <section aria-labelledby="investigation-trace-heading" className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
      <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-cyan-300">Investigation trace</p>
          <h2 id="investigation-trace-heading" className="mt-1 text-lg font-semibold text-white">Build a defensible human judgment</h2>
        </div>
        <span className="w-fit rounded-full border border-slate-700 bg-slate-950/40 px-3 py-1 text-xs font-medium text-slate-300">{completeStages} of 5 decision stages recorded</span>
      </div>
      <ol className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-6">
        {workspaceStages.map(([key, label, detail, Icon]) => {
          const status = key === activeStage ? 'active' : stages[key] ? 'complete' : 'upcoming';
          const stageDetail = key === 'evidence' && persistedEvidence > 0
            ? `${persistedEvidence} evidence ${persistedEvidence === 1 ? 'item' : 'items'} saved`
            : key === 'decision' && suggestionDecision
              ? `Learner ${suggestionDecision}`
              : detail;
          return <li key={key} aria-current={status === 'active' ? 'step' : undefined} className={`flex min-w-0 items-center gap-3 rounded-xl border p-3 transition motion-safe:duration-200 ${statusTone(status)}`}><StageIcon Icon={Icon} status={status} /><span className="min-w-0"><span className="block text-xs font-semibold uppercase tracking-wide">{label}</span><span className="mt-1 block text-xs leading-4 opacity-75">{stageDetail}</span></span></li>;
        })}
      </ol>
    </section>
  );
}

function TraceReference({ event }) {
  const reference = traceEventReference(event);
  return reference ? <p className="mt-3 font-mono text-[11px] text-slate-500">{reference}</p> : null;
}

function ReceiptTrace({ timeline }) {
  const { completeKeys, decision, evidence, hypothesis, isVerifiedRejection, pivotalDecision, verification } = normalizeReceiptTrace(timeline);

  return (
    <section aria-labelledby="decision-trace-heading" className="rounded-2xl border border-cyan-300/25 bg-slate-900/70 p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-cyan-300">Decision trace</p>
          <h2 id="decision-trace-heading" className="mt-1 text-2xl font-semibold tracking-tight text-white">The human judgment behind this receipt</h2>
        </div>
        <p className="text-sm text-slate-400">Backend-recorded mission events</p>
      </div>

      {hypothesis || decision || verification || evidence.length > 0 ? (
        <div className={`mt-6 rounded-2xl border p-5 sm:p-6 ${isVerifiedRejection ? 'border-rose-300/35 bg-rose-300/[0.06]' : 'border-slate-700 bg-slate-950/30'}`}>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-stretch">
            <article className="rounded-xl border border-amber-300/20 bg-slate-950/30 p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-amber-200"><Bot aria-hidden="true" size={15} />AI hypothesis</p>
              <p className="mt-3 text-sm leading-6 text-slate-200">{traceEventSummary(hypothesis, 'suggestion') || 'No AI hypothesis was recorded.'}</p>
              <TraceReference event={hypothesis} />
            </article>
            <span aria-hidden="true" className="hidden self-center text-slate-600 lg:block">→</span>
            <article className="rounded-xl border border-violet-300/25 bg-violet-300/[0.06] p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-violet-200"><FileSearch aria-hidden="true" size={15} />Selected evidence</p>
              <p className="mt-3 text-sm font-semibold text-slate-100">{evidence.length > 0 ? `${evidence.length} ${evidence.length === 1 ? 'record' : 'records'} deliberately saved` : 'No evidence record linked'}</p>
              {evidence.length > 0 && <p className="mt-2 text-sm leading-6 text-slate-300">{evidence.filter((event) => traceEventSummary(event, 'relation') === 'contradicts').length} contradicts · {evidence.filter((event) => traceEventSummary(event, 'relation') === 'supports').length} supports</p>}
              <TraceReference event={evidence[0]} />
            </article>
            <span aria-hidden="true" className="hidden self-center text-slate-600 lg:block">→</span>
            <article className="rounded-xl border border-cyan-300/40 bg-cyan-300/[0.10] p-5 shadow-lg shadow-cyan-950/20">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-cyan-200"><Scale aria-hidden="true" size={15} />Human judgment</p>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-white">{pivotalDecision || 'Not recorded'}</p>
              {traceEventSummary(decision, 'reason') && <><p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Why</p><p className="mt-1 text-sm leading-6 text-slate-200">{traceEventSummary(decision, 'reason')}</p></>}
              {!traceEventSummary(decision, 'reason') && decision && <p className="mt-3 text-sm leading-6 text-slate-400">No rationale was recorded with this decision.</p>}
              <TraceReference event={decision} />
            </article>
            <span aria-hidden="true" className="hidden self-center text-slate-600 lg:block">→</span>
            <article className={`rounded-xl border p-4 ${verification ? 'border-emerald-300/30 bg-emerald-300/[0.07]' : 'border-slate-700 bg-slate-950/30'}`}>
              <p className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] ${verification ? 'text-emerald-200' : 'text-slate-400'}`}><ShieldCheck aria-hidden="true" size={15} />Verification</p>
              <p className="mt-3 text-sm font-semibold text-white">{verification ? 'Decision confirmed against evidence' : 'Not recorded'}</p>
              {traceEventSummary(verification, 'reason') && <p className="mt-2 text-sm leading-6 text-slate-200">{traceEventSummary(verification, 'reason')}</p>}
              <TraceReference event={verification} />
            </article>
          </div>

          {evidence.length > 0 && (
            <div className="mt-5 border-t border-slate-700/80 pt-5">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-violet-200"><FileSearch aria-hidden="true" size={15} />Learner-selected evidence</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {evidence.map((event) => <article key={event.event_id} className="rounded-xl border border-slate-700 bg-slate-950/30 p-3"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium text-slate-100">{traceEventSummary(event, 'title') || 'Recorded evidence'}</p><span className="rounded-md border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] text-slate-300">{traceEventSummary(event, 'relation') || 'neutral'}</span></div><p className="mt-2 text-sm leading-6 text-slate-300">{traceEventSummary(event, 'description') || 'No evidence detail was retained.'}</p><p className="mt-3 text-xs text-slate-500">{traceEventSummary(event, 'source') || 'Source not recorded'} · selected by {traceEventSummary(event, 'created_by') || 'learner'}</p><TraceReference event={event} /></article>)}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-slate-700 bg-slate-950/20 p-5 text-sm leading-6 text-slate-400">No decision trace events were retained in this receipt.</div>
      )}

      <ol aria-label="Complete mission record" className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {receiptStages.map(([key, label, Icon]) => {
          const isComplete = completeKeys.has(key);
          return <li key={key} className={`flex items-center gap-3 rounded-xl border px-3 py-3 ${isComplete ? 'border-slate-700 bg-slate-950/30 text-slate-200' : 'border-slate-800 bg-slate-950/10 text-slate-500'}`}><StageIcon Icon={Icon} status={isComplete ? 'complete' : 'upcoming'} /><span className="text-sm font-medium">{label}</span></li>;
        })}
      </ol>
    </section>
  );
}

export default function DecisionTrace({ mode, ...props }) {
  if (mode === 'receipt') return <ReceiptTrace timeline={props.timeline || []} />;
  return <WorkspaceTrace {...props} />;
}
