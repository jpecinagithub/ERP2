import { useEffect, useMemo, useState } from 'react';
import { HiOutlinePlus, HiOutlineSearch } from 'react-icons/hi';
import client from '../api/client';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import Toast from '../components/ui/Toast';

export default function Inventory() {
  const [movements, setMovements] = useState([]);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({
    item_id: '',
    movement_type: 'entrada',
    quantity: '',
    unit_cost: '',
    reference_document: ''
  });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2600);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [movementRes, itemRes] = await Promise.all([client.get('/inventory/movements'), client.get('/items')]);
      setMovements(Array.isArray(movementRes.data) ? movementRes.data : []);
      setItems(Array.isArray(itemRes.data) ? itemRes.data : []);
    } catch {
      setMovements([]);
      setItems([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const itemName = (id) => items.find((item) => item.id === id)?.name || `Item ${id}`;

  const filtered = useMemo(() => {
    const value = search.toLowerCase();
    return movements.filter((movement) => {
      const name = itemName(movement.item_id).toLowerCase();
      const ref = String(movement.reference_document || '').toLowerCase();
      return name.includes(value) || ref.includes(value);
    });
  }, [movements, search]);

  const stockSummary = useMemo(() => {
    const map = {};

    movements.forEach((movement) => {
      if (!map[movement.item_id]) {
        map[movement.item_id] = {
          id: movement.item_id,
          name: itemName(movement.item_id),
          qty: 0
        };
      }
      map[movement.item_id].qty += movement.movement_type === 'entrada' ? Number(movement.quantity) : -Number(movement.quantity);
    });

    return Object.values(map).slice(0, 4);
  }, [movements]);

  const handleCreate = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      await client.post('/inventory/movements', form);
      showToast('Movimiento registrado');
      setShowModal(false);
      setForm({ item_id: '', movement_type: 'entrada', quantity: '', unit_cost: '', reference_document: '' });
      fetchData();
    } catch (error) {
      showToast(error.response?.data?.error || 'No se pudo registrar el movimiento', 'error');
    }

    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <Toast toast={toast} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Inventario</h1>
          <p className="mt-1 text-sm text-slate-400">Control de movimientos y stock de articulos.</p>
        </div>
        <button type="button" className="erp-btn-primary" onClick={() => setShowModal(true)}>
          <HiOutlinePlus size={18} /> Nuevo movimiento
        </button>
      </div>

      {stockSummary.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stockSummary.map((item) => (
            <article key={item.id} className="erp-panel p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{item.name}</p>
              <p className="mt-2 text-2xl font-black text-white">{Number(item.qty).toFixed(2)}</p>
              <p className={`mt-1 text-xs font-semibold ${item.qty > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {item.qty > 0 ? 'Con stock' : 'Sin stock'}
              </p>
            </article>
          ))}
        </div>
      )}

      <section className="erp-panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <label className="relative w-full max-w-sm">
            <HiOutlineSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input className="erp-input pl-9" placeholder="Buscar item o referencia..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{filtered.length} movimientos</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-surface-800/40">
              <tr>
                <th className="erp-th">ID</th>
                <th className="erp-th">Articulo</th>
                <th className="erp-th">Tipo</th>
                <th className="erp-th text-right">Cantidad</th>
                <th className="erp-th text-right">Costo Unitario</th>
                <th className="erp-th">Referencia</th>
                <th className="erp-th">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-slate-400" colSpan={7}>Cargando movimientos...</td>
                </tr>
              )}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-slate-400" colSpan={7}>No hay movimientos.</td>
                </tr>
              )}

              {!loading &&
                filtered.map((movement) => (
                  <tr key={movement.id} className="transition hover:bg-white/5">
                    <td className="erp-td">{movement.id}</td>
                    <td className="erp-td">{itemName(movement.item_id)}</td>
                    <td className="erp-td"><StatusBadge value={movement.movement_type} /></td>
                    <td className="erp-td text-right font-semibold text-slate-100">{movement.quantity}</td>
                    <td className="erp-td text-right">{movement.unit_cost ? Number(movement.unit_cost).toFixed(2) : '-'} EUR</td>
                    <td className="erp-td">{movement.reference_document || '-'}</td>
                    <td className="erp-td">{movement.date ? new Date(movement.date).toLocaleDateString('es-ES') : '-'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {showModal && (
        <Modal
          title="Nuevo movimiento de inventario"
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button type="button" className="erp-btn-secondary" onClick={() => setShowModal(false)}>
                Cancelar
              </button>
              <button type="submit" form="inventory-form" className="erp-btn-primary" disabled={saving}>
                {saving ? 'Guardando...' : 'Registrar'}
              </button>
            </>
          }
        >
          <form id="inventory-form" className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={handleCreate}>
            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Articulo</span>
              <select className="erp-input" value={form.item_id} onChange={(event) => setForm({ ...form, item_id: event.target.value })} required>
                <option value="">Seleccionar...</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>{item.sku} - {item.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Tipo</span>
              <select className="erp-input" value={form.movement_type} onChange={(event) => setForm({ ...form, movement_type: event.target.value })}>
                <option value="entrada">Entrada</option>
                <option value="salida">Salida</option>
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Cantidad</span>
              <input className="erp-input" type="number" step="0.01" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} required placeholder="0" />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Costo unitario</span>
              <input className="erp-input" type="number" step="0.01" value={form.unit_cost} onChange={(event) => setForm({ ...form, unit_cost: event.target.value })} placeholder="0.00" />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Documento referencia</span>
              <input className="erp-input" value={form.reference_document} onChange={(event) => setForm({ ...form, reference_document: event.target.value })} placeholder="FV-001" />
            </label>
          </form>
        </Modal>
      )}
    </div>
  );
}
