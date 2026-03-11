export default function Modal({ title, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="erp-panel w-full max-w-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <button type="button" className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-slate-100" onClick={onClose}>
            x
          </button>
        </div>
        <div className="max-h-[72vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-3 border-t border-white/10 px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}
