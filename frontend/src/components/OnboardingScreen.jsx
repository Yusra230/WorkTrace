import { ArrowRight, BriefcaseBusiness, MessageSquareText } from 'lucide-react';

export default function OnboardingScreen({ error, isStarting, onStart }) {
  return (
    <section className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
      <div>
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">NovaCommerce simulation</p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Show how you work with AI.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
          Investigate a real product incident alongside an AI teammate. Your reasoning, verification, and final judgment become the evidence.
        </p>
        <button
          type="button"
          onClick={onStart}
          disabled={isStarting}
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isStarting ? 'Starting mission…' : 'Start investigation'}
          {!isStarting && <ArrowRight aria-hidden="true" size={18} />}
        </button>
        {error && <p role="alert" className="mt-4 max-w-xl rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</p>}
      </div>

      <aside className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/30">
        <p className="text-sm font-medium text-slate-400">Your assignment</p>
        <div className="mt-5 space-y-5">
          <div className="flex gap-3">
            <BriefcaseBusiness aria-hidden="true" className="mt-0.5 text-violet-300" size={20} />
            <div><p className="font-medium text-white">Junior Product Engineer</p><p className="mt-1 text-sm text-slate-400">NovaCommerce</p></div>
          </div>
          <div className="flex gap-3">
            <MessageSquareText aria-hidden="true" className="mt-0.5 text-cyan-300" size={20} />
            <div><p className="font-medium text-white">Checkout conversion dropped 12%</p><p className="mt-1 text-sm leading-6 text-slate-400">Investigate the failure spike and propose a well-supported fix.</p></div>
          </div>
        </div>
      </aside>
    </section>
  );
}
