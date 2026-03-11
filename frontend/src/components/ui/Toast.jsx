export default function Toast({ toast }) {
  if (!toast) return null;

  const tone = toast.type === 'error'
    ? 'border-rose-500/40 bg-rose-500/15 text-rose-100'
    : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-100';

  return (
    <div className={`fixed right-4 top-4 z-[70] animate-slide-up rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-glow ${tone}`}>
      {toast.msg}
    </div>
  );
}
