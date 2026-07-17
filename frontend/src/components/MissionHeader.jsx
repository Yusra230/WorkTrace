import { Building2, CircleDotDashed, UserRound } from 'lucide-react';

export default function MissionHeader({ mission, messageCount }) {
  return (
    <header className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl shadow-slate-950/20 sm:p-6">
      <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">
            <span className="inline-flex items-center gap-2"><Building2 aria-hidden="true" size={16} className="text-cyan-300" />{mission?.company || 'NovaCommerce'}</span>
            <span className="inline-flex items-center gap-2"><UserRound aria-hidden="true" size={16} className="text-violet-300" />{mission?.role || 'Junior Product Engineer'}</span>
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{mission?.title || 'Checkout Conversion Drop'}</h1>
          <p className="mt-2 text-base text-slate-300">{mission?.brief || 'Checkout conversion dropped 12%. Investigate and propose a fix.'}</p>
        </div>
        <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm sm:min-w-56">
          <p className="flex items-center gap-2 font-medium text-cyan-100"><CircleDotDashed aria-hidden="true" size={16} className="text-cyan-300" />Investigation in progress</p>
          <p className="mt-1 text-xs text-slate-400">{messageCount} teammate messages captured</p>
        </div>
      </div>
    </header>
  );
}
