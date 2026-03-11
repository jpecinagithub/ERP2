import { useEffect, useMemo, useState } from 'react';
import { HiOutlineChartBar, HiOutlineCurrencyDollar, HiOutlineShoppingCart, HiOutlineUserGroup } from 'react-icons/hi';
import client from '../api/client';
import StatusBadge from '../components/ui/StatusBadge';

const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const bars = [46, 58, 62, 55, 71, 79, 68, 82, 74, 88, 93, 85];

const fmtMoney = (value) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(Math.abs(Number(value) || 0));

function StatCard({ title, value, icon: Icon, accent = 'from-brand-500 to-indigo-500' }) {
  return (
    <article className="erp-panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
        <div className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${accent} text-white`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="text-2xl font-black tracking-tight text-white">{value}</p>
    </article>
  );
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState({});
  const [counts, setCounts] = useState({ customers: 0, suppliers: 0, items: 0 });
  const [recentInvoices, setRecentInvoices] = useState([]);

  useEffect(() => {
    Promise.all([
      client.get('/reports/balance').catch(() => ({ data: { totals: {} } })),
      client.get('/customers').catch(() => ({ data: [] })),
      client.get('/suppliers').catch(() => ({ data: [] })),
      client.get('/items').catch(() => ({ data: [] })),
      client.get('/sales_invoices').catch(() => ({ data: [] }))
    ]).then(([balanceRes, customersRes, suppliersRes, itemsRes, salesRes]) => {
      setBalance(balanceRes.data.totals || {});
      setCounts({
        customers: Array.isArray(customersRes.data) ? customersRes.data.length : 0,
        suppliers: Array.isArray(suppliersRes.data) ? suppliersRes.data.length : 0,
        items: Array.isArray(itemsRes.data) ? itemsRes.data.length : 0
      });
      setRecentInvoices(Array.isArray(salesRes.data) ? salesRes.data.slice(0, 6) : []);
      setLoading(false);
    });
  }, []);

  const statCards = useMemo(
    () => [
      { title: 'Ingresos', value: fmtMoney(balance.incomes), icon: HiOutlineCurrencyDollar, accent: 'from-emerald-500 to-teal-500' },
      { title: 'Gastos', value: fmtMoney(balance.expenses), icon: HiOutlineShoppingCart, accent: 'from-amber-500 to-orange-500' },
      { title: 'Clientes', value: counts.customers, icon: HiOutlineUserGroup, accent: 'from-brand-500 to-indigo-500' },
      { title: 'Resultado Neto', value: fmtMoney(balance.equityApprox), icon: HiOutlineChartBar, accent: 'from-cyan-500 to-sky-500' }
    ],
    [balance.equityApprox, balance.expenses, balance.incomes, counts.customers]
  );

  if (loading) {
    return <div className="grid min-h-[40vh] place-items-center text-sm text-slate-300">Cargando dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Dashboard Financiero</h1>
        <p className="mt-1 text-sm text-slate-400">Resumen de rendimiento y operacion del ERP.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <section className="erp-panel xl:col-span-2">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-lg font-bold text-white">Evolucion mensual</h2>
            <p className="text-xs text-slate-400">Serie simulada de tendencia para panel ejecutivo.</p>
          </div>
          <div className="p-5">
            <div className="flex h-56 items-end gap-2 rounded-xl border border-white/5 bg-surface-950/50 px-3 pb-4 pt-8">
              {bars.map((height, index) => (
                <div key={months[index]} className="flex flex-1 flex-col items-center gap-2">
                  <div className="w-full rounded-t-md bg-gradient-to-b from-brand-400 to-indigo-500" style={{ height: `${height}%` }}></div>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{months[index]}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="erp-panel">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-lg font-bold text-white">Ultimas facturas</h2>
            <p className="text-xs text-slate-400">Movimientos mas recientes de ventas.</p>
          </div>
          <div className="space-y-3 p-4">
            {recentInvoices.length === 0 && <p className="text-sm text-slate-400">No hay facturas recientes.</p>}
            {recentInvoices.map((invoice) => (
              <article key={invoice.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{invoice.invoice_number}</p>
                  <StatusBadge value={invoice.status} />
                </div>
                <p className="text-xs text-slate-400">Cliente ID: {invoice.customer_id}</p>
                <p className="mt-1 text-sm font-semibold text-brand-200">{fmtMoney(invoice.total_amount)}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Proveedores" value={counts.suppliers} icon={HiOutlineUserGroup} accent="from-fuchsia-500 to-violet-500" />
        <StatCard title="Articulos" value={counts.items} icon={HiOutlineShoppingCart} accent="from-cyan-500 to-blue-500" />
        <StatCard title="Activos" value={fmtMoney(balance.assets)} icon={HiOutlineChartBar} accent="from-lime-500 to-emerald-500" />
      </div>
    </div>
  );
}
