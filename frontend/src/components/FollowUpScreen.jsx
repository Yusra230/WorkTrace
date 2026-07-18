import { ArrowRight, MessageSquareQuote } from 'lucide-react';
import { useState } from 'react';
import DecisionContextBanner from './DecisionContextBanner';
import FormError from './FormError';

const MAX_LENGTH = 10000;

export default function FollowUpScreen({ answer, decisionContext, error, isSubmitting, onAnswerChange, onClearError, onSubmit, question }) {
  const [validationError, setValidationError] = useState(null);

  function submit(event) {
    event.preventDefault();
    if (!answer.trim()) {
      setValidationError('Provide your independent explanation before continuing.');
      return;
    }
    setValidationError(null);
    onSubmit();
  }

  return (
    <section className="mx-auto max-w-3xl">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8">
        <span className="grid size-11 place-items-center rounded-xl bg-violet-300/15 text-violet-200"><MessageSquareQuote aria-hidden="true" size={22} /></span>
        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.15em] text-violet-300">Independent explanation</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Explain your judgment in your own words</h1>
        <DecisionContextBanner {...decisionContext} />
        <div className="mt-6 rounded-xl border border-violet-300/20 bg-violet-300/10 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-200">Follow-up question</p>
          <p className="mt-2 text-base leading-7 text-violet-50">{question}</p>
        </div>

        <form className="mt-6" onSubmit={submit} noValidate>
          <label htmlFor="follow-up-answer" className="text-sm font-semibold text-slate-100">Your answer</label>
          <textarea id="follow-up-answer" value={answer} onChange={(event) => onAnswerChange(event.target.value)} maxLength={MAX_LENGTH} disabled={isSubmitting} rows="8" placeholder="Describe the reasoning behind your decision…" className="mt-2 w-full resize-y rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-sm leading-6 text-slate-100 placeholder:text-slate-600 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/30 disabled:cursor-not-allowed disabled:opacity-60" />
          <p className="mt-2 text-right text-xs text-slate-500">{answer.length.toLocaleString()} / {MAX_LENGTH.toLocaleString()} characters</p>
          <FormError message={validationError || error} onDismiss={validationError ? () => setValidationError(null) : onClearError} />
          <button type="submit" disabled={isSubmitting} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-300 px-4 py-3 font-semibold text-slate-950 transition hover:bg-violet-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? 'Submitting explanation…' : 'Continue to evaluation'}<ArrowRight aria-hidden="true" size={18} /></button>
        </form>
      </div>
    </section>
  );
}
