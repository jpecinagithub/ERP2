import { Fragment, useEffect, useMemo, useState } from 'react';
import { HiOutlineChevronDown, HiOutlineChevronRight, HiOutlinePlus, HiOutlineSearch } from 'react-icons/hi';
import client from '../api/client';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import Toast from '../components/ui/Toast';

const fmtMoney = (value) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(Number(value) || 0);

export default function PurchaseInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [details, setDetails] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState(null);
  // Estados válidos para purchase_invoices: borrador,recibida,pagada,anulada
  const [form, setForm] = useState({
    invoice_number: '',
    supplier_id: '',
    invoice_date: '',
    total_amount: '',
    status: 'borrador'
  });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2600);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invoiceRes, supplierRes] = await Promise.all([client.get('/purchase_invoices'), client.get('/suppliers')]);
      setInvoices(Array.isArray(invoiceRes.data) ? invoiceRes.data : []);
      setSuppliers(Array.isArray(supplierRes.data) ? supplierRes.data : []);
    } catch {
      setInvoices([]);
      setSuppliers([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    const value = search.toLowerCase();
    return invoices.filter((invoice) => {
      const supplierName = suppliers.find((supplier) => supplier.id === invoice.supplier_id)?.name || '';
      return (
        invoice.invoice_number?.toLowerCase().includes(value) ||
        supplierName.toLowerCase().includes(value) ||
        String(invoice.supplier_id).includes(value)
      );
    });
  }, [invoices, search, suppliers]);

  const getSupplierName = (id) => suppliers.find((supplier) => supplier.id === id)?.name || `Proveedor ${id}`;

  const toggleExpand = async (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(id);

    if (!details[id]) {
      try {
        const response = await client.get(`/purchase_invoices/${id}`);
        setDetails((prev) => ({ ...prev, [id]: response.data }));
      } catch {
        setDetails((prev) => ({ ...prev, [id]: { lines: [] } }));
      }
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      await client.post('/purchase_invoices', form);
      showToast('Factura de compra creada');
      setShowModal(false);
      setForm({ invoice_number: '', supplier_id: '', invoice_date: '', total_amount: '', status: 'borrador' });
      fetchData();
    } catch (error) {
      showToast(error.response?.data?.error || 'No se pudo crear la factura', 'error');
    }

    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <Toast toast={toast} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Facturas de Compra</h1>
          <p className="mt-1 text-sm text-slate-400">Registro de compras a proveedores.</p>
        </div>
        <button type="button" className="erp-btn-primary" onClick={() => setShowModal(true)}>
          <HiOutlinePlus size={18} /> Nueva factura
        </button>
      </div>

      <section className="erp-panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <label className="relative w-full max-w-sm">
            <HiOutlineSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input className="erp-input pl-9" placeholder="Buscar por numero o proveedor..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{filtered.length} facturas</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-surface-800/40">
              <tr>
                <th className="erp-th w-10"></th>
                <th className="erp-th">Numero</th>
                <th className="erp-th">Proveedor</th>
                <th className="erp-th">Fecha</th>
                <th className="erp-th text-right">Total</th>
                <th className="erp-th">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-slate-400" colSpan={6}>Cargando facturas...</td>
                </tr>
              )}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-slate-400" colSpan={6}>No hay facturas para mostrar.</td>
                </tr>
              )}

              {!loading &&
                filtered.map((invoice) => (
                  <Fragment key={invoice.id}>
                    <tr className="cursor-pointer transition hover:bg-white/5" onClick={() => toggleExpand(invoice.id)}>
                      <td className="erp-td">
                        {expandedId === invoice.id ? <HiOutlineChevronDown size={16} /> : <HiOutlineChevronRight size={16} />}
                      </td>
                      <td className="erp-td font-semibold text-white">{invoice.invoice_number}</td>
                      <td className="erp-td">{getSupplierName(invoice.supplier_id)}</td>
                      <td className="erp-td">{invoice.invoice_date}</td>
                      <td className="erp-td text-right font-semibold text-brand-200">{fmtMoney(invoice.total_amount)}</td>
                      <td className="erp-td"><StatusBadge value={invoice.status} /></td>
                    </tr>
                    {expandedId === invoice.id && (
                      <tr className="bg-surface-950/50">
                        <td colSpan={6} className="p-4">
                          <div className="rounded-xl border border-white/10 bg-surface-900/70 p-4">
                            <h3 className="mb-3 text-sm font-semibold text-white">Lineas de la factura</h3>
                            <table className="min-w-full">
                              <thead>
                                <tr>
                                  <th className="erp-th">Articulo (ID)</th>
                                  <th className="erp-th text-right">Cantidad</th>
                                  <th className="erp-th text-right">Precio Unitario</th>
                                  <th className="erp-th text-right">Total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                {(details[invoice.id]?.lines || []).map((line, index) => (
                                  <tr key={`${invoice.id}-line-${index}`}>
                                    <td className="erp-td">{line.item_id}</td>
                                    <td className="erp-td text-right">{line.quantity}</td>
                                    <td className="erp-td text-right">{fmtMoney(line.unit_price)}</td>
                                    <td className="erp-td text-right font-semibold text-slate-100">{fmtMoney(line.total)}</td>
                                  </tr>
                                ))}
                                {(details[invoice.id]?.lines || []).length === 0 && (
                                  <tr>
                                    <td colSpan={4} className="px-4 py-4 text-center text-sm text-slate-400">Sin lineas registradas.</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {showModal && (
        <Modal
          title="Nueva factura de compra"
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button type="button" className="erp-btn-secondary" onClick={() => setShowModal(false)}>
                Cancelar
              </button>
              <button type="submit" form="purchase-form" className="erp-btn-primary" disabled={saving}>
                {saving ? 'Guardando...' : 'Crear factura'}
              </button>
            </>
          }
        >
          <form id="purchase-form" className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={handleCreate}>
            <label>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Numero</span>
              <input className="erp-input" value={form.invoice_number} onChange={(event) => setForm({ ...form, invoice_number: event.target.value })} required placeholder="FC-2026-001" />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Proveedor</span>
              <select className="erp-input" value={form.supplier_id} onChange={(event) => setForm({ ...form, supplier_id: event.target.value })} required>
                <option value="">Seleccionar...</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Fecha</span>
              <input className="erp-input" type="date" value={form.invoice_date} onChange={(event) => setForm({ ...form, invoice_date: event.target.value })} required />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Total</span>
              <input className="erp-input" type="number" step="0.01" value={form.total_amount} onChange={(event) => setForm({ ...form, total_amount: event.target.value })} required placeholder="0.00" />
            </label>
            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Estado</span>
              <select className="erp-input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                <option value="borrador">Borrador</option>
                <option value="recibida">Recibida</option>
                <option value="pagada">Pagada</option>
                <option value="anulada">Anulada</option>
              </select>
            </label>
          </form>
        </Modal>
      )}
    </div>
  );
}
