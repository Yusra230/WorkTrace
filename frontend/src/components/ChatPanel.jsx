import { Bot, CornerDownLeft, Send, UserRound } from 'lucide-react';
import { useState } from 'react';

export default function ChatPanel({ error, isSending, messages, onClearError, onSend }) {
  const [message, setMessage] = useState('');
  const canSend = message.trim().length > 0 && !isSending;

  function submit(event) {
    event.preventDefault();
    if (!canSend) return;
    onSend(message.trim());
    setMessage('');
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit(event);
    }
  }

  return (
    <section aria-labelledby="teammate-heading" className="flex min-h-[38rem] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
      <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-4">
        <span className="grid size-9 place-items-center rounded-lg bg-violet-300/15 text-violet-200"><Bot aria-hidden="true" size={19} /></span>
        <div><h2 id="teammate-heading" className="text-sm font-semibold text-white">AI teammate</h2><p className="text-xs text-slate-500">Ask about the mission context or investigation approach.</p></div>
      </div>

      <div aria-live="polite" className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/20 p-4 text-sm leading-6 text-slate-400">
            Start with a focused investigation question. Your confirmed conversation becomes part of the mission record.
          </div>
        )}
        {messages.map((chatMessage) => (
          <article key={chatMessage.id} className={`flex gap-3 ${chatMessage.role === 'learner' ? 'justify-end' : ''}`}>
            {chatMessage.role === 'teammate' && <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-violet-300/15 text-violet-200"><Bot aria-hidden="true" size={14} /></span>}
            <p className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${chatMessage.role === 'learner' ? 'bg-cyan-300 text-slate-950' : 'bg-slate-800 text-slate-200'}`}>{chatMessage.content}</p>
            {chatMessage.role === 'learner' && <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-cyan-300/15 text-cyan-200"><UserRound aria-hidden="true" size={14} /></span>}
          </article>
        ))}
        {isSending && <div className="flex items-center gap-3 text-sm text-slate-400"><span className="grid size-7 place-items-center rounded-full bg-violet-300/15 text-violet-200"><Bot aria-hidden="true" size={14} /></span><span className="animate-pulse">AI teammate is reviewing the evidence…</span></div>}
      </div>

      <div className="border-t border-slate-800 p-4">
        {error && <div role="alert" className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs leading-5 text-rose-100"><span>{error}</span><button type="button" onClick={onClearError} className="shrink-0 font-semibold text-rose-200 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">Dismiss</button></div>}
        <form onSubmit={submit}>
          <label htmlFor="teammate-message" className="sr-only">Message your AI teammate</label>
          <textarea id="teammate-message" value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={handleKeyDown} disabled={isSending} rows="3" maxLength="4000" placeholder="Ask a focused investigation question…" className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/30 disabled:cursor-not-allowed disabled:opacity-60" />
          <div className="mt-3 flex items-center justify-between gap-3"><span className="inline-flex items-center gap-1 text-xs text-slate-500"><CornerDownLeft aria-hidden="true" size={13} />Enter to send · Shift+Enter for a new line</span><button type="submit" disabled={!canSend} className="inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-50">Send<Send aria-hidden="true" size={15} /></button></div>
        </form>
      </div>
    </section>
  );
}
