export default function FormError({ message, onDismiss }) {
  if (!message) return null;

  return (
    <div role="alert" className="mt-4 flex items-start justify-between gap-3 rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm leading-6 text-rose-100">
      <span>{message}</span>
      {onDismiss && <button type="button" onClick={onDismiss} className="shrink-0 font-semibold underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">Dismiss</button>}
    </div>
  );
}
