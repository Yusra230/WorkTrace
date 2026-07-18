import { ClipboardPlus, Database, Link2, Plus, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

const relations = {
  supports: 'Supports hypothesis',
  contradicts: 'Contradicts hypothesis',
  neutral: 'Neutral context'
};

function relationTone(relation) {
  if (relation === 'supports') return 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100';
  if (relation === 'contradicts') return 'border-rose-300/25 bg-rose-300/10 text-rose-100';
  return 'border-slate-700 bg-slate-800 text-slate-300';
}

function createEvidenceId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `evidence-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function EvidenceBoard({ activeHypothesisId, evidenceError, evidenceItems, onAddEvidence, onClearError, onRetryEvidence }) {
  const [isCollecting, setIsCollecting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    source: 'Learner investigation',
    type: 'observation',
    relation: 'neutral',
    createdBy: 'learner'
  });
  const [validationError, setValidationError] = useState(null);
  const [pendingEvidenceId, setPendingEvidenceId] = useState(null);

  useEffect(() => {
    if (pendingEvidenceId && evidenceItems.some((item) => item.id === pendingEvidenceId)) {
      setForm((current) => ({ ...current, title: '', description: '' }));
      setIsCollecting(false);
      setPendingEvidenceId(null);
    }
  }, [evidenceItems, pendingEvidenceId]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setValidationError(null);
  }

  function submit(event) {
    event.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      setValidationError('Add both a short title and the evidence details.');
      return;
    }
    const id = createEvidenceId();
    setPendingEvidenceId(id);
    onAddEvidence({ ...form, id, linkedHypothesisId: activeHypothesisId || null });
  }

  return (
    <section aria-labelledby="evidence-board-heading" className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="evidence-board-heading" className="flex items-center gap-2 text-sm font-semibold text-white"><Database aria-hidden="true" size={17} className="text-cyan-300" />Evidence Board</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">Collect only the evidence you choose to rely on.</p>
        </div>
        <span className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-400">{evidenceItems.length}</span>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/30 px-3 py-2 text-xs text-slate-400">
        <Link2 aria-hidden="true" size={14} className={activeHypothesisId ? 'text-amber-300' : 'text-slate-500'} />
        {activeHypothesisId ? 'Evidence can be related to the active AI hypothesis.' : 'No active AI hypothesis has been surfaced yet.'}
      </div>

      {evidenceItems.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/20 p-4 text-sm leading-6 text-slate-400">
          No evidence collected. Add only the observations, reasoning, or AI information you want to examine.
        </div>
      ) : (
        <ol className="mt-4 space-y-3">
          {evidenceItems.map((item) => (
            <li key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
              <div className="flex items-start justify-between gap-3"><p className="text-sm font-medium text-slate-100">{item.title}</p><span className={`shrink-0 rounded-md border px-2 py-1 text-[11px] font-medium ${relationTone(item.relation)}`}>{relations[item.relation]}</span></div>
              <p className="mt-2 text-xs leading-5 text-slate-400">{item.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500"><span>{item.source} · {item.type} · recorded by {item.createdBy}</span>{item.persistenceStatus === 'persisted' && <span className="text-emerald-300">Saved to timeline</span>}{item.persistenceStatus === 'pending' && <span className="text-amber-300">Saving to timeline…</span>}{item.persistenceStatus === 'failed' && <><span className="text-rose-300">Not saved to timeline</span><button type="button" onClick={() => onRetryEvidence(item)} className="font-semibold text-cyan-300 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">Retry</button></>}</div>
            </li>
          ))}
        </ol>
      )}

      {evidenceError && !isCollecting && <div role="alert" className="mt-4 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs leading-5 text-rose-100">{evidenceError}<button type="button" onClick={onClearError} className="ml-2 font-semibold underline">Dismiss</button></div>}

      {!isCollecting ? (
        <button type="button" onClick={() => setIsCollecting(true)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-300/30 px-3 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"><ClipboardPlus aria-hidden="true" size={16} />Collect evidence</button>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-3 rounded-xl border border-slate-700 bg-slate-950/30 p-3">
          <p className="flex items-center gap-2 text-sm font-medium text-slate-100"><Sparkles aria-hidden="true" size={15} className="text-amber-300" />Record evidence deliberately</p>
          <label className="block text-xs font-medium text-slate-300" htmlFor="evidence-title">Title<input id="evidence-title" value={form.title} onChange={(event) => updateField('title', event.target.value)} maxLength="120" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm text-slate-100 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/30" placeholder="Short evidence label" /></label>
          <label className="block text-xs font-medium text-slate-300" htmlFor="evidence-description">Details<textarea id="evidence-description" value={form.description} onChange={(event) => updateField('description', event.target.value)} maxLength="1000" rows="3" className="mt-1 w-full resize-y rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm text-slate-100 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/30" placeholder="What does this evidence show?" /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-slate-300" htmlFor="evidence-source">Source<select id="evidence-source" value={form.source} onChange={(event) => updateField('source', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm text-slate-100 focus:border-cyan-300 focus:outline-none"><option>Learner investigation</option><option>AI teammate</option><option>Mission signal</option><option>System context</option></select></label>
            <label className="text-xs font-medium text-slate-300" htmlFor="evidence-type">Type<select id="evidence-type" value={form.type} onChange={(event) => updateField('type', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm text-slate-100 focus:border-cyan-300 focus:outline-none"><option value="observation">Observation</option><option value="code">Code context</option><option value="data">Data signal</option><option value="reasoning">Reasoning</option></select></label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-slate-300" htmlFor="evidence-relation">Relation to hypothesis<select id="evidence-relation" value={form.relation} onChange={(event) => updateField('relation', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm text-slate-100 focus:border-cyan-300 focus:outline-none"><option value="supports">Supports</option><option value="contradicts">Contradicts</option><option value="neutral">Neutral</option></select></label>
            <label className="text-xs font-medium text-slate-300" htmlFor="evidence-created-by">Created by<select id="evidence-created-by" value={form.createdBy} onChange={(event) => updateField('createdBy', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm text-slate-100 focus:border-cyan-300 focus:outline-none"><option value="learner">Learner</option><option value="ai_teammate">AI teammate</option><option value="system">System</option></select></label>
          </div>
          {(validationError || evidenceError) && <div role="alert" className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs leading-5 text-rose-100">{validationError || evidenceError}<button type="button" onClick={() => { setValidationError(null); onClearError(); }} className="ml-2 font-semibold underline">Dismiss</button></div>}
          <div className="flex gap-2"><button type="submit" className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"><Plus aria-hidden="true" size={16} />Add to board</button><button type="button" onClick={() => setIsCollecting(false)} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">Cancel</button></div>
        </form>
      )}
    </section>
  );
}
