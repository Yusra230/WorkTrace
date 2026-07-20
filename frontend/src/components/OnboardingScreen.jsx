import { ArrowUpRight } from 'lucide-react';

export default function OnboardingScreen({ error, isStarting, isVisible = true, onStart }) {
  return (
    <section id="main-content" className={`worktrace-onboarding ${isVisible ? 'worktrace-onboarding--revealed' : ''}`} aria-labelledby="onboarding-title">
      <div className="worktrace-onboarding__hero">
        <p className="worktrace-onboarding__eyebrow">NovaCommerce / live simulation</p>
        <h1 id="onboarding-title">Show how you work with AI.</h1>
        <p className="worktrace-onboarding__introduction">
          Investigate a real product incident alongside an AI teammate. Your reasoning, verification, and final judgment become the evidence.
        </p>
        <p className="worktrace-onboarding__narrative">
          I am about to enter a real investigation where my reasoning becomes evidence.
        </p>
        <div className="worktrace-onboarding__actions">
          <button type="button" onClick={onStart} disabled={isStarting} className="worktrace-onboarding__start">
            {isStarting ? 'Starting mission…' : 'Start investigation'}
            {!isStarting && <ArrowUpRight aria-hidden="true" size={18} strokeWidth={2.25} />}
          </button>
          <p className="worktrace-onboarding__action-note">Your investigation opens in a focused workspace.</p>
        </div>
        {error && <p role="alert" className="worktrace-onboarding__error">{error}</p>}
      </div>

      <aside className="worktrace-mission-brief" aria-labelledby="mission-brief-title">
        <div className="worktrace-mission-brief__heading">
          <p>Assignment brief</p>
          <span aria-hidden="true">↗</span>
        </div>
        <div className="worktrace-mission-brief__company">
          <span className="worktrace-mission-brief__company-mark" aria-hidden="true" />
          <p>NovaCommerce</p>
        </div>
        <div className="worktrace-mission-brief__content">
          <p className="worktrace-mission-brief__label">Your role</p>
          <h2 id="mission-brief-title">Junior Product Engineer</h2>
          <div className="worktrace-mission-brief__rule" />
          <p className="worktrace-mission-brief__label">Incident</p>
          <p className="worktrace-mission-brief__incident">Checkout conversion dropped 12%</p>
          <p className="worktrace-mission-brief__description">Investigate the failure spike and propose a well-supported fix.</p>
        </div>
        <p className="worktrace-mission-brief__footer">Reasoning record</p>
      </aside>
    </section>
  );
}
