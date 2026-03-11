import { useCallback, useEffect, useMemo, useState } from 'react';
import { HiOutlinePencil, HiOutlinePlus, HiOutlineSearch, HiOutlineTrash } from 'react-icons/hi';
import client from '../api/client';
import Modal from './ui/Modal';
import Toast from './ui/Toast';

export default function CrudPage({ title, subtitle, endpoint, columns, formFields }) {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.get(endpoint);
      setData(Array.isArray(res.data) ? res.data : []);
    } catch {
      setData([]);
    }
    setLoading(false);
  }, [endpoint]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2600);
  };

  const resetForm = (base = {}) => {
    const next = {};
    formFields.forEach((field) => {
      next[field.key] = base[field.key] ?? field.default ?? '';
    });
    setForm(next);
  };

  const openCreate = () => {
    setEditItem(null);
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    resetForm(item);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editItem) {
        await client.put(`${endpoint}/${editItem.id}`, form);
        showToast('Registro actualizado');
      } else {
        await client.post(endpoint, form);
        showToast('Registro creado');
      }
      setShowModal(false);
      fetchData();
    } catch (error) {
      showToast(error.response?.data?.error || 'Error al guardar', 'error');
    }

    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Esta accion eliminara el registro. Continuar?')) return;

    try {
      await client.delete(`${endpoint}/${id}`);
      showToast('Registro eliminado');
      fetchData();
    } catch (error) {
      showToast(error.response?.data?.error || 'Error al eliminar', 'error');
    }
  };

  const filtered = useMemo(() => {
    const needle = search.toLowerCase();
    return data.filter((item) =>
      columns.some((col) => String(item[col.key] ?? '').toLowerCase().includes(needle))
    );
  }, [columns, data, search]);

  return (
    <>
      <Toast toast={toast} />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>
        <button type="button" className="erp-btn-primary" onClick={openCreate}>
          <HiOutlinePlus size={18} /> Nuevo
        </button>
      </div>

      <section className="erp-panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <label className="relative w-full max-w-sm">
            <HiOutlineSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input className="erp-input pl-9" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{filtered.length} registros</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-surface-800/50">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className="erp-th">{col.label}</th>
                ))}
                <th className="erp-th text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-sm text-slate-400">Cargando datos...</td>
                </tr>
              )}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-sm text-slate-400">No hay registros para mostrar.</td>
                </tr>
              )}

              {!loading &&
                filtered.map((item) => (
                  <tr key={item.id} className="transition hover:bg-white/5">
                    {columns.map((col) => (
                      <td key={`${item.id}-${col.key}`} className="erp-td">
                        {col.render ? col.render(item[col.key], item) : item[col.key] ?? '-'}
                      </td>
                    ))}
                    <td className="erp-td">
                      <div className="flex justify-end gap-1.5">
                        <button type="button" className="rounded-lg p-2 text-slate-300 transition hover:bg-brand-500/20 hover:text-brand-200" onClick={() => openEdit(item)}>
                          <HiOutlinePencil size={16} />
                        </button>
                        <button type="button" className="rounded-lg p-2 text-slate-300 transition hover:bg-rose-500/20 hover:text-rose-200" onClick={() => handleDelete(item.id)}>
                          <HiOutlineTrash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {showModal && (
        <Modal
          title={`${editItem ? 'Editar' : 'Nuevo'} ${title}`}
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button type="button" className="erp-btn-secondary" onClick={() => setShowModal(false)}>
                Cancelar
              </button>
              <button type="submit" form="crud-form" className="erp-btn-primary" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </>
          }
        >
          <form id="crud-form" className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={handleSave}>
            {formFields.map((field) => (
              <label key={field.key} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">{field.label}</span>
                {field.type === 'select' ? (
                  <select
                    className="erp-input"
                    value={form[field.key]}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                    required={field.required}
                  >
                    <option value="">Seleccionar...</option>
                    {(field.options || []).map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    className="erp-input min-h-[96px]"
                    value={form[field.key]}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                    required={field.required}
                    placeholder={field.placeholder}
                  ></textarea>
                ) : (
                  <input
                    className="erp-input"
                    type={field.type || 'text'}
                    value={form[field.key]}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                    required={field.required}
                    placeholder={field.placeholder}
                    step={field.step}
                  />
                )}
              </label>
            ))}
          </form>
        </Modal>
      )}
    </>
  );
}
