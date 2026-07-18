import { Award, ChevronDown, ClipboardCheck, FileSearch, MessageSquareQuote } from 'lucide-react';
import DecisionTrace from './DecisionTrace';

const dimensions = [
  ['technical_execution', 'Technical Execution'],
  ['problem_framing', 'Problem Framing'],
  ['ai_verification', 'AI Verification'],
  ['independent_judgment', 'Independent Judgment'],
  ['communication', 'Communication']
];

function scoreTone(score) {
  if (score >= 85) return 'text-emerald-200 border-emerald-300/25 bg-emerald-300/10';
  if (score >= 70) return 'text-cyan-100 border-cyan-300/25 bg-cyan-300/10';
  return 'text-amber-100 border-amber-300/25 bg-amber-300/10';
}

function eventLabel(type) {
  return type.replaceAll('_', ' ');
}

function valueText(value) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function evidenceSource(event) {
  const labels = {
    user_prompt: ['Learner investigation', 'text-cyan-200 border-cyan-300/25 bg-cyan-300/10'],
    ai_response: ['AI teammate information', 'text-violet-200 border-violet-300/25 bg-violet-300/10'],
    suggestion_offered: ['AI teammate suggestion', 'text-amber-100 border-amber-300/25 bg-amber-300/10'],
    suggestion_accepted: ['Learner decision', 'text-cyan-200 border-cyan-300/25 bg-cyan-300/10'],
    suggestion_rejected: ['Learner decision', 'text-cyan-200 border-cyan-300/25 bg-cyan-300/10'],
    suggestion_verified: ['Learner verification', 'text-emerald-200 border-emerald-300/25 bg-emerald-300/10'],
    user_decision: ['Learner decision', 'text-cyan-200 border-cyan-300/25 bg-cyan-300/10'],
    submission: ['Learner final solution', 'text-cyan-200 border-cyan-300/25 bg-cyan-300/10'],
    follow_up_answer: ['Learner independent explanation', 'text-cyan-200 border-cyan-300/25 bg-cyan-300/10'],
    evidence_collected: ['Learner-selected evidence', 'text-violet-200 border-violet-300/25 bg-violet-300/10']
  };
  return labels[event?.type] || ['System context', 'text-slate-300 border-slate-700 bg-slate-800'];
}

export default function ReceiptScreen({ mission, receipt }) {
  const evidenceByDimension = new Map((receipt?.evidence || []).map((item) => [item.dimension, item]));
  const timelineById = new Map((receipt?.event_timeline || []).map((event) => [event.event_id, event]));

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <header className="rounded-2xl border border-cyan-300/25 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/20 sm:p-8">
        <span className="grid size-12 place-items-center rounded-xl bg-cyan-300/15 text-cyan-200"><Award aria-hidden="true" size={25} /></span>
        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.15em] text-cyan-300">WorkTrace Competency Receipt</p>
        <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">Proof of how you worked with AI.</h1>
        {mission && <p className="mt-4 text-sm font-medium text-slate-300">{mission.company} · {mission.role} · {mission.title}</p>}
        <p className="mt-4 max-w-3xl leading-7 text-slate-300">This assessment is grounded in the recorded evidence, AI hypothesis, human judgment, verification, and independent explanation from your mission.</p>
      </header>

      <DecisionTrace mode="receipt" timeline={receipt?.event_timeline || []} />

      <section aria-labelledby="scores-heading">
        <div className="mb-4 flex items-center gap-2"><ClipboardCheck aria-hidden="true" size={19} className="text-cyan-300" /><h2 id="scores-heading" className="text-lg font-semibold text-white">Competency scores</h2></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {dimensions.map(([key, label]) => {
            const score = receipt?.scores?.[key];
            return <article key={key} className={`rounded-2xl border p-5 ${scoreTone(Number(score) || 0)}`}><p className="text-xs font-semibold uppercase tracking-wide opacity-75">{label}</p><p className="mt-4 text-4xl font-semibold tracking-tight">{Number.isFinite(score) ? score : '—'}<span className="text-lg">{Number.isFinite(score) ? '%' : ''}</span></p></article>;
          })}
        </div>
      </section>

      <section aria-labelledby="narrative-heading" className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex items-center gap-2"><MessageSquareQuote aria-hidden="true" size={19} className="text-violet-300" /><h2 id="narrative-heading" className="text-lg font-semibold text-white">Narrative assessment</h2></div>
        <p className="mt-4 max-w-4xl whitespace-pre-wrap leading-7 text-slate-300">{receipt?.narrative_summary || 'No narrative assessment was returned.'}</p>
      </section>

      <section aria-labelledby="evidence-heading" className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex items-center gap-2"><FileSearch aria-hidden="true" size={19} className="text-amber-300" /><h2 id="evidence-heading" className="text-lg font-semibold text-white">Evidence mappings</h2></div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {dimensions.map(([key, label]) => {
            const evidence = evidenceByDimension.get(key);
            return <article key={key} className="rounded-xl border border-slate-800 bg-slate-950/30 p-4"><h3 className="font-medium text-slate-100">{label}</h3>{evidence ? <><p className="mt-2 text-sm leading-6 text-slate-300">{evidence.explanation}</p><div className="mt-4 space-y-2">{evidence.event_ids.map((id, index) => { const event = timelineById.get(id); const [sourceLabel, sourceTone] = evidenceSource(event); return <div key={id} className="flex flex-wrap items-center gap-2"><span className={`rounded-md border px-2 py-1 text-xs font-medium ${sourceTone}`}>{sourceLabel}</span><span className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-xs text-slate-300">Event {evidence.event_sequences?.[index] ? `#${evidence.event_sequences[index]} - ` : ''}{id}</span></div>; })}</div></> : <p className="mt-2 text-sm text-slate-500">No mapped evidence returned for this dimension.</p>}</article>;
          })}
        </div>
      </section>

      <section aria-labelledby="timeline-heading" className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h2 id="timeline-heading" className="text-lg font-semibold text-white">Decision timeline</h2>
        <p className="mt-1 text-sm text-slate-400">Chronological, backend-sanitized events used to make the assessment traceable.</p>
        <div className="mt-5 space-y-2">{(receipt?.event_timeline || []).map((event) => <details key={event.event_id} className="group rounded-xl border border-slate-800 bg-slate-950/30"><summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"><ChevronDown aria-hidden="true" size={17} className="shrink-0 text-slate-500 transition group-open:rotate-180" /><span className="font-mono text-xs text-cyan-300">#{event.sequence}</span><span className="capitalize text-sm font-medium text-slate-200">{eventLabel(event.type)}</span><span className="ml-auto text-xs text-slate-500">{event.timestamp ? new Date(event.timestamp).toLocaleString() : ''}</span></summary><dl className="border-t border-slate-800 px-4 py-3 text-sm">{Object.entries(event.data || {}).map(([key, value]) => <div key={key} className="grid gap-1 py-1 sm:grid-cols-[10rem_1fr]"><dt className="font-medium text-slate-500">{key.replaceAll('_', ' ')}</dt><dd className="whitespace-pre-wrap break-words text-slate-300">{valueText(value)}</dd></div>)}</dl></details>)}</div>
      </section>
    </section>
  );
}
