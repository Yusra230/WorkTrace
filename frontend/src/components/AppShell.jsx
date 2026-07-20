import { Activity, ShieldCheck } from 'lucide-react';

export default function AppShell({ children, variant = 'default' }) {
  if (variant === 'onboarding') {
    return (
      <main className="worktrace-onboarding-shell">
        <div className="worktrace-onboarding-shell__frame">
          <header className="worktrace-onboarding-header">
            <a className="worktrace-onboarding-header__brand" href="#main-content" aria-label="WorkTrace home">
              <span className="worktrace-onboarding-header__mark" aria-hidden="true" />
              <span>WorkTrace</span>
            </a>
            <p className="worktrace-onboarding-header__descriptor">Competency evidence for AI-native work</p>
            <span className="worktrace-onboarding-header__mode">Investigation brief</span>
          </header>
          {children}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#09111f] px-4 py-6 text-slate-100 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex items-center justify-between border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-cyan-400/15 text-cyan-300">
              <Activity aria-hidden="true" size={21} />
            </span>
            <div>
              <p className="text-lg font-semibold tracking-tight">WorkTrace</p>
              <p className="text-xs text-slate-400">Competency evidence for AI-native work</p>
            </div>
          </div>
          <span className="hidden items-center gap-2 text-xs text-slate-400 sm:flex">
            <ShieldCheck aria-hidden="true" size={16} className="text-emerald-300" />
            Server-side AI
          </span>
        </header>
        {children}
      </div>
    </main>
  );
}
