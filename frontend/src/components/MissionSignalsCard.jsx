import { Radar } from 'lucide-react';

export default function MissionSignalsCard({ mission }) {
  return (
    <section aria-labelledby="signals-heading" className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <h2 id="signals-heading" className="flex items-center gap-2 text-sm font-semibold text-white"><Radar aria-hidden="true" size={17} className="text-amber-300" />Mission signals</h2>
      <dl className="mt-4 space-y-4 text-sm">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Context</dt>
          <dd className="mt-1 leading-6 text-slate-300">{mission?.context || 'The checkout flow is built in React with a Node.js backend.'}</dd>
        </div>
        <div className="border-t border-slate-800 pt-4">
          <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Observed signal</dt>
          <dd className="mt-1 leading-6 text-amber-100">{mission?.seed_data || 'Spike in payment failures starting July 14.'}</dd>
        </div>
      </dl>
    </section>
  );
}
