import { ArrowRight, FileCheck2, Lightbulb } from 'lucide-react';
import { useState } from 'react';
import DecisionContextBanner from './DecisionContextBanner';
import FormError from './FormError';

const MAX_LENGTH = 10000;

export default function SubmissionScreen({ decisionContext, error, isSubmitting, onClearError, onFieldChange, onSubmit, submission }) {
  const [validationError, setValidationError] = useState(null);

  function submit(event) {
    event.preventDefault();
    if (!submission.solution.trim() || !submission.justification.trim()) {
      setValidationError('Describe both your proposed solution and the evidence behind it.');
      return;
    }
    setValidationError(null);
    onSubmit();
  }

  return (
    <section className="mx-auto max-w-3xl">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8">
        <span className="grid size-11 place-items-center rounded-xl bg-cyan-300/15 text-cyan-200"><FileCheck2 aria-hidden="true" size={22} /></span>
        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.15em] text-cyan-300">Final proposal</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Document your recommended fix</h1>
        <p className="mt-3 leading-7 text-slate-300">State the solution you would propose to NovaCommerce, then explain the mission evidence that supports it.</p>
        <DecisionContextBanner {...decisionContext} />

        <form className="space-y-6" onSubmit={submit} noValidate>
          <div>
            <label htmlFor="solution" className="text-sm font-semibold text-slate-100">Proposed solution</label>
            <textarea id="solution" value={submission.solution} onChange={(event) => onFieldChange('solution', event.target.value)} maxLength={MAX_LENGTH} disabled={isSubmitting} rows="7" placeholder="Describe the fix or investigation outcome you recommend…" className="mt-2 w-full resize-y rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-sm leading-6 text-slate-100 placeholder:text-slate-600 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/30 disabled:cursor-not-allowed disabled:opacity-60" />
            <p className="mt-2 text-right text-xs text-slate-500">{submission.solution.length.toLocaleString()} / {MAX_LENGTH.toLocaleString()} characters</p>
          </div>
          <div>
            <label htmlFor="justification" className="text-sm font-semibold text-slate-100">Justification</label>
            <textarea id="justification" value={submission.justification} onChange={(event) => onFieldChange('justification', event.target.value)} maxLength={MAX_LENGTH} disabled={isSubmitting} rows="7" placeholder="Explain why the evidence supports this decision…" className="mt-2 w-full resize-y rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-sm leading-6 text-slate-100 placeholder:text-slate-600 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/30 disabled:cursor-not-allowed disabled:opacity-60" />
            <p className="mt-2 flex justify-between gap-3 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><Lightbulb aria-hidden="true" size={13} />Refer to the signals you verified.</span><span>{submission.justification.length.toLocaleString()} / {MAX_LENGTH.toLocaleString()} characters</span></p>
          </div>
          <FormError message={validationError || error} onDismiss={validationError ? () => setValidationError(null) : onClearError} />
          <button type="submit" disabled={isSubmitting} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? 'Submitting proposal…' : 'Submit proposal'}<ArrowRight aria-hidden="true" size={18} /></button>
        </form>
      </div>
    </section>
  );
}
