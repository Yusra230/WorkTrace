import { AlertTriangle, BrainCircuit, LoaderCircle, RefreshCw } from 'lucide-react';
import { useEffect, useRef } from 'react';

export default function EvaluationScreen({ error, onGenerate, onRetry, status }) {
  const generatedForReadyState = useRef(false);

  useEffect(() => {
    if (status === 'ready' && !generatedForReadyState.current) {
      generatedForReadyState.current = true;
      onGenerate();
    }
    if (status !== 'ready') generatedForReadyState.current = false;
  }, [onGenerate, status]);

  const isError = status === 'error';

  return (
    <section className="mx-auto max-w-2xl text-center">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 sm:p-12">
        <span className={`mx-auto grid size-14 place-items-center rounded-2xl ${isError ? 'bg-rose-300/15 text-rose-200' : 'bg-violet-300/15 text-violet-200'}`}>
          {isError ? <AlertTriangle aria-hidden="true" size={29} /> : <BrainCircuit aria-hidden="true" size={29} />}
        </span>
        {isError ? (
          <>
            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.15em] text-rose-300">Evaluation paused</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Your evidence is safely preserved.</h1>
            <p role="alert" className="mt-4 rounded-xl border border-rose-400/25 bg-rose-400/10 p-4 text-sm leading-6 text-rose-100">{error}</p>
            <p className="mt-4 leading-7 text-slate-300">The evaluator was temporarily unavailable. Retry when you are ready; your completed investigation will not be lost.</p>
            <button type="button" onClick={onRetry} className="mt-7 inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"><RefreshCw aria-hidden="true" size={17} />Retry evaluation</button>
          </>
        ) : (
          <>
            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.15em] text-violet-300">Follow-up complete</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Independent explanation recorded</h1>
            <p className="mt-4 leading-7 text-slate-300">WorkTrace is now evaluating your investigation, AI verification, and submitted explanation for the Competency Receipt.</p>
            <p aria-live="polite" className="mt-7 inline-flex items-center gap-2 text-sm text-slate-400"><LoaderCircle aria-hidden="true" size={17} className="animate-spin text-cyan-300" />Generating your Competency Receipt…</p>
          </>
        )}
      </div>
    </section>
  );
}
