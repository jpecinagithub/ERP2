export default function StatusBadge({ value }) {
  const normalized = String(value || '').toLowerCase();

  const map = {
    pagada: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    activo: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    superadmin: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
    admin: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300',
    pendiente: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    compras: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    gasto: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    contabilidad: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
    tesoreria: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
    ingreso: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    anulada: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
    pasivo: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
    entrada: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    salida: 'border-rose-500/40 bg-rose-500/10 text-rose-300'
  };

  const className = map[normalized] || 'border-white/20 bg-white/5 text-slate-300';

  return <span className={`erp-chip ${className}`}>{value || 'N/A'}</span>;
}
