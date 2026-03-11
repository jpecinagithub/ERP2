import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  HiOutlineChevronDown,
  HiOutlineChevronRight,
  HiOutlineDownload,
  HiOutlinePencil,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineUpload,
  HiOutlineTemplate
} from 'react-icons/hi';
import * as XLSX from 'xlsx';
import client from '../api/client';
import Modal from '../components/ui/Modal';
import Toast from '../components/ui/Toast';

const TX_TYPES = [
  { value: '', label: 'Ninguno' },
  { value: 'venta', label: 'Venta' },
  { value: 'compra', label: 'Compra' },
  { value: 'pago', label: 'Pago' },
  { value: 'cobro', label: 'Cobro' },
  { value: 'ajuste', label: 'Ajuste' }
];

const LEGACY_ACCOUNT_CODE_MAP = { 
  '101': '570', 
  '102': '572',
  'banco': '572',
  'caja': '570',
  'cliente': '430',
  'clientes': '430',
  'proveedor': '400',
  'proveedores': '400',
  'acreedor': '410',
  'acreedores': '410'
};
const REQUIRED_COLUMNS = ['asiento_ref', 'fecha', 'descripcion_asiento', 'cuenta_id', 'debe', 'haber', 'descripcion_linea'];

// Plantillas de asientos predefinidos
const JOURNAL_TEMPLATES = {
  // Facturas de VENTA
  'venta_materiales': {
    name: 'Venta de materiales',
    description: 'Venta de mercaderías a cliente',
    lines: [
      { account_code: '430', debit: '', credit: '', description: 'Cliente (importe total)', transaction_type: 'venta', showEntity: true, showItem: true },
      { account_code: '700', debit: '', credit: '', description: 'Ventas mercaderías (base imponible)', transaction_type: 'venta', isBase: true, hasItem: true, exampleQty: 10, examplePrice: 100 },
      { account_code: '477', debit: '', credit: '', description: 'IVA repercussions', transaction_type: 'venta', isIVA: true }
    ]
  },
  'venta_servicio': {
    name: 'Venta de servicios',
    description: 'Prestacion de servicios',
    lines: [
      { account_code: '430', debit: '', credit: '', description: 'Cliente', transaction_type: 'venta', showEntity: true },
      { account_code: '705', debit: '', credit: '', description: 'Prestacion de servicios', transaction_type: 'venta', isBase: true },
      { account_code: '477', debit: '', credit: '', description: 'IVA repercussions', transaction_type: 'venta', isIVA: true }
    ]
  },

  // Facturas de COMPRA
  'compra_materiales': {
    name: 'Compra de materiales',
    description: 'Compra de mercaderías a proveedor',
    lines: [
      { account_code: '600', debit: '', credit: '', description: 'Compras mercaderías (base imponible)', transaction_type: 'compra', isBase: true, hasItem: true, exampleQty: 10, examplePrice: 100 },
      { account_code: '472', debit: '', credit: '', description: 'IVA soportado', transaction_type: 'compra', isIVA: true },
      { account_code: '400', debit: '', credit: '', description: 'Proveedor (importe total)', transaction_type: 'compra', showEntity: true, showItem: true }
    ]
  },
  'compra_inmovilizado': {
    name: 'Compra de inmovilizado',
    description: 'Adquisicion de activos fijos',
    lines: [
      { account_code: '220', debit: '', credit: '', description: 'Inmovilizado material (base)', transaction_type: 'compra', isBase: true },
      { account_code: '472', debit: '', credit: '', description: 'IVA soportado', transaction_type: 'compra', isIVA: true },
      { account_code: '400', debit: '', credit: '', description: 'Proveedor', transaction_type: 'compra', showEntity: true }
    ]
  },
  'compra_gasto': {
    name: 'Gasto corriente',
    description: 'Gastos de funcionamiento',
    lines: [
      { account_code: '600', debit: '', credit: '', description: 'Compras / Gasto', transaction_type: 'compra', isBase: true },
      { account_code: '472', debit: '', credit: '', description: 'IVA soportado', transaction_type: 'compra', isIVA: true },
      { account_code: '410', debit: '', credit: '', description: 'Acreedores servicios', transaction_type: 'compra', showEntity: true }
    ]
  },

  // GASTOS ESPECÍFICOS
  'gasto_alquiler': {
    name: 'Alquiler oficina',
    description: 'Pago de alquiler mensual',
    lines: [
      { account_code: '629', debit: '', credit: '', description: 'Alquiler local', transaction_type: '', isBase: true },
      { account_code: '472', debit: '', credit: '', description: 'IVA soportado', transaction_type: '', isIVA: true },
      { account_code: '410', debit: '', credit: '', description: 'Acreedor', transaction_type: '' }
    ]
  },
  'gasto_suministros': {
    name: 'Suministros (luz/agua/telefono)',
    description: 'Gastos de suministros',
    lines: [
      { account_code: '622', debit: '', credit: '', description: 'Suministros', transaction_type: '', isBase: true },
      { account_code: '472', debit: '', credit: '', description: 'IVA soportado', transaction_type: '', isIVA: true },
      { account_code: '110', debit: '', credit: '', description: 'Banco', transaction_type: '' }
    ]
  },
  'gasto_nomina': {
    name: 'Nómina empleados',
    description: 'Pago de nómina mensual',
    lines: [
      { account_code: '640', debit: '', credit: '', description: 'Sueldos y salarios', transaction_type: '' },
      { account_code: '642', debit: '', credit: '', description: 'Seguridad Social empresa', transaction_type: '' },
      { account_code: '4750', debit: '', credit: '', description: 'IRPF trabajadores', transaction_type: '' },
      { account_code: '476', debit: '', credit: '', description: 'SS trabajadores', transaction_type: '' },
      { account_code: '110', debit: '', credit: '', description: 'Banco (neto)', transaction_type: '' }
    ]
  },
  'gasto_seguro': {
    name: 'Seguro empresa',
    description: 'Prima de seguro',
    lines: [
      { account_code: '625', debit: '', credit: '', description: 'Prima seguro', transaction_type: '', isBase: true },
      { account_code: '472', debit: '', credit: '', description: 'IVA soportado', transaction_type: '', isIVA: true },
      { account_code: '110', debit: '', credit: '', description: 'Banco', transaction_type: '' }
    ]
  },
  'gasto_asesoria': {
    name: 'Servicios profesionales',
    description: 'Asesoría, consultoría, etc.',
    lines: [
      { account_code: '623', debit: '', credit: '', description: 'Servicios profesionales', transaction_type: '', isBase: true },
      { account_code: '472', debit: '', credit: '', description: 'IVA soportado', transaction_type: '', isIVA: true },
      { account_code: '410', debit: '', credit: '', description: 'Acreedor', transaction_type: '' }
    ]
  },
  'gasto_banco': {
    name: 'Gastos bancarios',
    description: 'Comisiones bancarias',
    lines: [
      { account_code: '626', debit: '', credit: '', description: 'Gastos bancarios', transaction_type: '' },
      { account_code: '572', debit: '', credit: '', description: 'Banco', transaction_type: '' }
    ]
  },

  // COBROS Y PAGOS
  'cobro_cliente': {
    name: 'Cobro de cliente',
    description: 'Cobro parcial o total de cliente',
    lines: [
      { account_code: '110', debit: '', credit: '', description: 'Banco', transaction_type: 'cobro' },
      { account_code: '430', debit: '', credit: '', description: 'Cliente', transaction_type: 'cobro', showEntity: true }
    ]
  },
  'pago_proveedor': {
    name: 'Pago a proveedor',
    description: 'Pago parcial o total a proveedor',
    lines: [
      { account_code: '400', debit: '', credit: '', description: 'Proveedor', transaction_type: 'pago', showEntity: true },
      { account_code: '110', debit: '', credit: '', description: 'Banco', transaction_type: 'pago' }
    ]
  },

  // CONSTITUCIÓN Y APORTACIONES
  'capital_social': {
    name: 'Constitución capital social',
    description: 'Desembolso de capital social',
    lines: [
      { account_code: '100', debit: '', credit: '', description: 'Capital social', transaction_type: '' },
      { account_code: '572', debit: '', credit: '', description: 'Bancos', transaction_type: '' }
    ]
  },
  'aportacion_socios': {
    name: 'Aportación de socios',
    description: 'Aportación adicional de capital',
    lines: [
      { account_code: '572', debit: '', credit: '', description: 'Bancos', transaction_type: '' },
      { account_code: '120', debit: '', credit: '', description: 'Reservas voluntarias', transaction_type: '' }
    ]
  },

  // AMORTIZACIÓN
  'amortizacion': {
    name: 'Amortización inmovilizado',
    description: 'Dotación amortización anual',
    lines: [
      { account_code: '681', debit: '', credit: '', description: 'Amortización inmovilizado', transaction_type: '' },
      { account_code: '281', debit: '', credit: '', description: 'Amortización acumulada', transaction_type: '' }
    ]
  },

  // REGULARIZACIÓN
  'regularizacion_existencias': {
    name: 'Regularización existencias',
    description: 'Ajuste existencias finales',
    lines: [
      { account_code: '300', debit: '', credit: '', description: 'Mercaderías', transaction_type: '' },
      { account_code: '610', debit: '', credit: '', description: 'Variación existencias', transaction_type: '' }
    ]
  }
};

const lineTemplate = {
  account_id: '',
  debit: '',
  credit: '',
  description: '',
  transaction_type: '',
  entity_id: '',
  item_id: '',
  quantity: '',
  unit_price: '',
  document_ref: ''
};

const toMoney = (n) => Number(n || 0).toFixed(2);

const normalizeNumericCode = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const num = Number(raw);
  return Number.isFinite(num) ? String(num) : raw;
};

const normalizeLineForApi = (line) => ({
  account_id: Number(line.account_id),
  debit: Number(line.debit) || 0,
  credit: Number(line.credit) || 0,
  description: line.description || '',
  transaction_type: line.transaction_type || null,
  entity_id: line.entity_id === '' ? null : Number(line.entity_id),
  item_id: line.item_id === '' ? null : Number(line.item_id),
  quantity: line.quantity === '' ? null : Number(line.quantity),
  unit_price: line.unit_price === '' ? null : Number(line.unit_price),
  document_ref: line.document_ref || null
});

function LineRows({ lines, onChange, onDelete, accounts, customers, suppliers, items }) {
  const entityOptions = (tx) => {
    if (tx === 'venta' || tx === 'cobro') return customers;
    if (tx === 'compra' || tx === 'pago') return suppliers;
    return [];
  };

  const getAccountName = (accountId) => {
    const acc = accounts.find(a => a.id === Number(accountId));
    return acc ? `${acc.code} - ${acc.name}` : '';
  };

  return (
    <tbody className="divide-y divide-white/5">
      {lines.map((line, idx) => {
        const entities = entityOptions(line.transaction_type);
        return (
          <tr key={`line-${idx}`}>
            <td className="p-2 min-w-[220px]">
              <select className="erp-input" value={line.account_id} onChange={(e) => onChange(idx, 'account_id', e.target.value)} required>
                <option value="">Seleccionar...</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
              </select>
            </td>
            <td className="p-2 min-w-[120px]"><input className="erp-input text-right" type="number" step="0.01" value={line.debit} onChange={(e) => onChange(idx, 'debit', e.target.value)} /></td>
            <td className="p-2 min-w-[120px]"><input className="erp-input text-right" type="number" step="0.01" value={line.credit} onChange={(e) => onChange(idx, 'credit', e.target.value)} /></td>
            <td className="p-2 min-w-[130px]"><select className="erp-input" value={line.transaction_type} onChange={(e) => onChange(idx, 'transaction_type', e.target.value)}>{TX_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></td>
            <td className="p-2 min-w-[190px]">
              <select className="erp-input" value={line.entity_id} onChange={(e) => onChange(idx, 'entity_id', e.target.value)} disabled={!entities.length}>
                <option value="">Entidad...</option>
                {entities.map((ent) => <option key={ent.id} value={ent.id}>{ent.name}</option>)}
              </select>
            </td>
            <td className="p-2 min-w-[210px]">
              <select className="erp-input" value={line.item_id} onChange={(e) => onChange(idx, 'item_id', e.target.value)}>
                <option value="">Item...</option>
                {items.map((it) => <option key={it.id} value={it.id}>{it.sku} - {it.name}</option>)}
              </select>
            </td>
            <td className="p-2 min-w-[120px]"><input className="erp-input text-right" type="number" step="0.0001" value={line.quantity} onChange={(e) => onChange(idx, 'quantity', e.target.value)} /></td>
            <td className="p-2 min-w-[120px]"><input className="erp-input text-right" type="number" step="0.01" value={line.unit_price} onChange={(e) => onChange(idx, 'unit_price', e.target.value)} /></td>
            <td className="p-2 min-w-[140px]"><input className="erp-input" value={line.document_ref} onChange={(e) => onChange(idx, 'document_ref', e.target.value)} /></td>
            <td className="p-2 min-w-[180px]"><input className="erp-input" value={line.description} onChange={(e) => onChange(idx, 'description', e.target.value)} /></td>
            <td className="p-2 text-center">
              {lines.length > 1 && (
                <button type="button" className="rounded-lg p-2 text-slate-300 transition hover:bg-rose-500/20 hover:text-rose-200" onClick={() => onDelete(idx)}>
                  <HiOutlineTrash size={16} />
                </button>
              )}
            </td>
          </tr>
        );
      })}
    </tbody>
  );
}

export default function JournalEntries() {
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateBaseAmount, setTemplateBaseAmount] = useState('');
  const [templateIVA, setTemplateIVA] = useState('21');
  const [expandedId, setExpandedId] = useState(null);
  const [detailsById, setDetailsById] = useState({});
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [toast, setToast] = useState(null);

  const [form, setForm] = useState({ entry_date: '', description: '', reference: '' });
  const [lines, setLines] = useState([{ ...lineTemplate }]);
  const [editForm, setEditForm] = useState({ entry_date: '', description: '', reference: '', lines: [{ ...lineTemplate }] });

  const fileInputRef = useRef(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [e, a, c, s, i] = await Promise.all([
        client.get('/journal'),
        client.get('/accounts'),
        client.get('/customers'),
        client.get('/suppliers'),
        client.get('/items')
      ]);
      setEntries(Array.isArray(e.data) ? e.data : []);
      setAccounts(Array.isArray(a.data) ? a.data : []);
      setCustomers(Array.isArray(c.data) ? c.data : []);
      setSuppliers(Array.isArray(s.data) ? s.data : []);
      setItems(Array.isArray(i.data) ? i.data : []);
    } catch {
      setEntries([]); setAccounts([]); setCustomers([]); setSuppliers([]); setItems([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const accountByCode = useMemo(() => {
    const map = new Map();
    accounts.forEach((a) => {
      const code = String(a.code).trim();
      map.set(code, Number(a.id));
      map.set(code.toLowerCase(), Number(a.id));
      map.set(normalizeNumericCode(code), Number(a.id));
      map.set(String(a.id), Number(a.id));
    });
    return map;
  }, [accounts]);

  const customerById = useMemo(() => new Map(customers.map((c) => [Number(c.id), c.name])), [customers]);
  const supplierById = useMemo(() => new Map(suppliers.map((s) => [Number(s.id), s.name])), [suppliers]);
  const itemById = useMemo(() => new Map(items.map((i) => [Number(i.id), `${i.sku} - ${i.name}`])), [items]);
  const itemBySku = useMemo(() => {
    const map = new Map();
    items.forEach((i) => {
      map.set(String(i.sku).trim().toLowerCase(), Number(i.id));
      map.set(String(i.name).toLowerCase(), Number(i.id));
      map.set(String(i.id), Number(i.id));
    });
    return map;
  }, [items]);

  const resolveItemId = (raw) => {
    if (!raw || items.length === 0) return null;
    const rawStr = String(raw).trim().toLowerCase();
    if (itemBySku.has(rawStr)) return itemBySku.get(rawStr);
    return null;
  };

  const lineTotals = (rows) => {
    const debit = rows.reduce((acc, r) => acc + (Number(r.debit) || 0), 0);
    const credit = rows.reduce((acc, r) => acc + (Number(r.credit) || 0), 0);
    return { debit, credit, balanced: debit > 0 && Math.abs(debit - credit) < 0.01 };
  };

  const totals = useMemo(() => lineTotals(lines), [lines]);
  const editTotals = useMemo(() => lineTotals(editForm.lines || []), [editForm.lines]);

  const resolveAccountId = (raw) => {
    const rawStr = String(raw ?? '').trim().toLowerCase();
    if (!rawStr) return null;
    if (accountByCode.has(rawStr)) return accountByCode.get(rawStr);
    const normalized = normalizeNumericCode(rawStr);
    if (accountByCode.has(normalized)) return accountByCode.get(normalized);
    const mapped = LEGACY_ACCOUNT_CODE_MAP[normalized];
    if (mapped && accountByCode.has(mapped)) return accountByCode.get(mapped);
    for (const [code, id] of accountByCode.entries()) {
      if (String(code).toLowerCase() === rawStr) return id;
    }
    return null;
  };

  // Aplicar plantilla
  const applyTemplate = (templateKey, baseAmount = '', ivaRate = '21') => {
    const template = JOURNAL_TEMPLATES[templateKey];
    if (!template) return;

    if (accounts.length === 0) {
      showToast('Cargando cuentas...', 'error');
      return;
    }

    // Usar importe de prueba por defecto
    const hasBaseOrIVA = template.lines.some(l => l.isBase || l.isIVA);
    const useDefaultAmount = !baseAmount; // Siempre usar importes por defecto
    const DEFAULT_BASE = 1000;
    const base = useDefaultAmount ? DEFAULT_BASE : (Number(baseAmount) || 0);
    const ivaPercent = Number(ivaRate) || 21;
    const ivaAmount = Number((base * ivaPercent / 100).toFixed(2));
    const totalAmount = Number((base + ivaAmount).toFixed(2));

    // Detectar si es compra/venta
    const isVenta = templateKey.startsWith('venta');
    const isGasto = templateKey.startsWith('gasto');

    const missingAccounts = [];
    const newLines = template.lines.map(t => {
      const accountId = resolveAccountId(t.account_code);
      if (!accountId && t.account_code) {
        missingAccounts.push(t.account_code);
      }

      let debit = '';
      let credit = '';
      const accountCode = t.account_code;

      // SIEMPRE aplicar importes cuando useDefaultAmount es true
      if (useDefaultAmount) {
        if (t.isBase) {
          // Cuenta de gasto/venta (base imponible)
          if (isVenta) {
            credit = base;
          } else {
            debit = base;
          }
        } else if (t.isIVA) {
          // Cuenta de IVA
          if (isVenta) {
            credit = ivaAmount;
          } else {
            debit = ivaAmount;
          }
        } else {
          // OTRAS CUENTAS - asignar según el tipo de plantilla
          
          // CLIENTE (430) - Debe tener el TOTAL en ventas
          if (accountCode === '430' && isVenta) {
            debit = totalAmount;
          }
          // CLIENTE (430) - Haber en cobros
          else if (accountCode === '430' && templateKey === 'cobro_cliente') {
            credit = 1000;
          }
          // PROVEEDOR (400) - Haber en compras
          else if (accountCode === '400' && templateKey.startsWith('compra')) {
            credit = totalAmount;
          }
          // PROVEEDOR (400) - Debe en pagos
          else if (accountCode === '400' && templateKey === 'pago_proveedor') {
            debit = 1000;
          }
          // ACREEDOR (410) - Haber en gastos
          else if (accountCode === '410' && isGasto) {
            credit = totalAmount;
          }
          // BANCO (110) - según tipo de operación
          else if (accountCode === '110') {
            if (isVenta) {
              // No aplica para ventas
            } else if (templateKey === 'cobro_cliente') {
              debit = 1000;
            } else if (templateKey === 'pago_proveedor') {
              credit = 1000;
            } else if (templateKey === 'capital_social') {
              debit = 5000;
            } else if (templateKey === 'aportacion_socios') {
              debit = 3000;
            } else if (templateKey === 'gasto_nomina') {
              credit = 2100;
            } else if (templateKey === 'gasto_banco') {
              credit = 25;
            } else if (isGasto) {
              // Gastos con banco como contrapartida
              credit = totalAmount;
            }
          }
          // BANCOS (572) - según tipo de operación (capital social y aportación de socios)
          else if (accountCode === '572') {
            if (templateKey === 'capital_social') {
              debit = 5000;
            } else if (templateKey === 'aportacion_socios') {
              debit = 3000;
            }
          }
          // CAPITAL SOCIAL (100)
          else if (accountCode === '100' && templateKey === 'capital_social') {
            credit = 5000;
          }
          // RESERVAS (120)
          else if (accountCode === '120' && templateKey === 'aportacion_socios') {
            credit = 3000;
          }
          // AMORTIZACIÓN ACUMULADA (281)
          else if (accountCode === '281' && templateKey === 'amortizacion') {
            credit = 500;
          }
          // GASTO AMORTIZACIÓN (681)
          else if (accountCode === '681' && templateKey === 'amortizacion') {
            debit = 500;
          }
          // EXISTENCIAS (300)
          else if (accountCode === '300' && templateKey === 'regularizacion_existencias') {
            debit = 800;
          }
          // VARIACIÓN EXISTENCIAS (610)
          else if (accountCode === '610' && templateKey === 'regularizacion_existencias') {
            credit = 800;
          }
          // NOMINA - otras cuentas
          else if (templateKey === 'gasto_nomina') {
            if (accountCode === '640') debit = 2000;
            else if (accountCode === '642') debit = 500;
            else if (accountCode === '4750') credit = 250;
            else if (accountCode === '476') credit = 150;
          }
          // GASTO BANCO
          else if (templateKey === 'gasto_banco' && accountCode === '626') {
            debit = 25;
          }
        }
      }

      return {
        ...lineTemplate,
        account_id: String(accountId || ''),
        debit,
        credit,
        description: t.description || '',
        transaction_type: t.transaction_type || '',
        entity_id: '',
        item_id: (useDefaultAmount && t.hasItem && items.length > 0) ? String(items[0].id) : '',
        quantity: (useDefaultAmount && t.hasItem && t.exampleQty) ? String(t.exampleQty) : '',
        unit_price: (useDefaultAmount && t.hasItem && t.examplePrice) ? String(t.examplePrice) : '',
        document_ref: ''
      };
    });

    if (missingAccounts.length > 0) {
      showToast(`Cuentas no encontradas: ${missingAccounts.join(', ')}`, 'error');
    }

    const description = (useDefaultAmount && hasBaseOrIVA) 
      ? `${template.description} (ejemplo: ${base.toFixed(2)} + IVA ${ivaPercent}%)`
      : template.description;

    setForm({
      ...form,
      description,
      reference: ''
    });
    setLines(newLines);
    setShowTemplates(false);
    setSelectedTemplate(templateKey);
    setTemplateBaseAmount(useDefaultAmount ? String(DEFAULT_BASE) : baseAmount);
    setTemplateIVA(ivaRate);
  };

  const applyTemplateWithAmount = (templateKey) => {
    applyTemplate(templateKey, templateBaseAmount, templateIVA);
  };

  const updateLine = (idx, field, value) => setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  const deleteLine = (idx) => setLines((prev) => prev.filter((_, i) => i !== idx));
  const addLine = () => setLines((prev) => [...prev, { ...lineTemplate }]);

  const updateEditLine = (idx, field, value) => setEditForm((prev) => ({ ...prev, lines: prev.lines.map((l, i) => (i === idx ? { ...l, [field]: value } : l)) }));
  const deleteEditLine = (idx) => setEditForm((prev) => ({ ...prev, lines: prev.lines.filter((_, i) => i !== idx) }));
  const addEditLine = () => setEditForm((prev) => ({ ...prev, lines: [...prev.lines, { ...lineTemplate }] }));

  const fetchEntryDetail = async (id) => {
    if (detailsById[id]) return detailsById[id];
    const res = await client.get(`/journal/${id}`);
    setDetailsById((prev) => ({ ...prev, [id]: res.data }));
    return res.data;
  };

  const toggleExpand = async (id) => {
    if (expandedId === id) return setExpandedId(null);
    setExpandedId(id);
    try { await fetchEntryDetail(id); } catch (e) { showToast(e.response?.data?.error || 'No se pudo cargar detalle', 'error'); }
  };

  const handleSave = async (ev) => {
    ev.preventDefault();
    if (!totals.balanced) return showToast('El Debe y Haber no estan equilibrados', 'error');
    setSaving(true);
    try {
      const res = await client.post('/journal', {
        entry_date: form.entry_date,
        description: form.description,
        reference: form.reference || null,
        lines: lines.map(normalizeLineForApi)
      });
      showToast(res.data?.autoProcedure ? `Asiento creado y generado ${res.data.autoProcedure}.` : 'Asiento creado.');
      setShowForm(false);
      setForm({ entry_date: '', description: '', reference: '' });
      setLines([{ ...lineTemplate }]);
      setSelectedTemplate('');
      fetchData();
    } catch (e) {
      showToast(e.response?.data?.error || 'No se pudo registrar el asiento', 'error');
    }
    setSaving(false);
  };

  const openEdit = async (entry) => {
    try {
      const d = await fetchEntryDetail(entry.id);
      setEditingEntryId(entry.id);
      setEditForm({
        entry_date: d.entry?.entry_date || entry.entry_date,
        description: d.entry?.description || '',
        reference: d.entry?.reference || '',
        lines: (d.lines || []).map((l) => ({
          account_id: String(l.account_id || ''), debit: String(l.debit || ''), credit: String(l.credit || ''), description: l.description || '',
          transaction_type: l.transaction_type || '', entity_id: l.entity_id == null ? '' : String(l.entity_id),
          item_id: l.item_id == null ? '' : String(l.item_id), quantity: l.quantity == null ? '' : String(l.quantity),
          unit_price: l.unit_price == null ? '' : String(l.unit_price), document_ref: l.document_ref || ''
        }))
      });
    } catch (e) {
      showToast(e.response?.data?.error || 'No se pudo abrir editor', 'error');
    }
  };

  const handleUpdate = async (ev) => {
    ev.preventDefault();
    if (!editingEntryId) return;
    if (!editTotals.balanced) return showToast('El Debe y Haber no estan equilibrados en la edicion', 'error');
    setUpdating(true);
    try {
      await client.put(`/journal/${editingEntryId}`, {
        entry_date: editForm.entry_date,
        description: editForm.description,
        reference: editForm.reference || null,
        lines: (editForm.lines || []).map(normalizeLineForApi)
      });
      showToast('Asiento actualizado');
      setEditingEntryId(null);
      fetchData();
      if (expandedId === editingEntryId) setExpandedId(null);
    } catch (e) {
      showToast(e.response?.data?.error || 'No se pudo actualizar', 'error');
    }
    setUpdating(false);
  };

  const handleDelete = async (entry) => {
    if (!window.confirm(`Eliminar asiento #${entry.id} y sus registros generados?`)) return;
    try {
      await client.delete(`/journal/${entry.id}`);
      showToast('Asiento eliminado');
      fetchData();
      if (expandedId === entry.id) setExpandedId(null);
    } catch (e) {
      showToast(e.response?.data?.error || 'No se pudo eliminar', 'error');
    }
  };

  const importFromExcel = async (file) => {
    setImporting(true);
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
      if (!rows.length) throw new Error('El archivo no tiene filas de datos.');
      const missing = REQUIRED_COLUMNS.filter((c) => !Object.keys(rows[0]).includes(c));
      if (missing.length) throw new Error(`Faltan columnas: ${missing.join(', ')}`);

      const grouped = new Map();
      rows.forEach((r, i) => {
        const ref = String(r.asiento_ref || '').trim();
        const entryDate = String(r.fecha || '').trim();
        const accountId = resolveAccountId(r.cuenta_id);
        const debit = Number(r.debe) || 0;
        const credit = Number(r.haber) || 0;
        if (!ref || !entryDate) throw new Error(`Fila ${i + 2}: asiento_ref y fecha son obligatorios.`);
        if (!accountId) throw new Error(`Fila ${i + 2}: cuenta_id/codigo contable invalido (${r.cuenta_id}).`);
        if (debit === 0 && credit === 0) throw new Error(`Fila ${i + 2}: debe o haber debe ser mayor a cero.`);
        if (!grouped.has(ref)) grouped.set(ref, { entry_date: entryDate, description: r.descripcion_asiento || `Asiento ${ref}`, reference: ref, lines: [] });
        grouped.get(ref).lines.push({ ...lineTemplate, account_id: accountId, debit, credit, description: r.descripcion_linea || '' });
      });

      let created = 0;
      for (const entry of grouped.values()) {
        const t = lineTotals(entry.lines);
        if (!t.balanced) throw new Error(`Asiento ${entry.reference} no esta balanceado.`);
        await client.post('/journal', { entry_date: entry.entry_date, description: entry.description, reference: entry.reference, lines: entry.lines.map(normalizeLineForApi) });
        created += 1;
      }
      showToast(`Importacion completada: ${created} asientos creados.`);
      fetchData();
    } catch (e) {
      showToast(e.response?.data?.error || e.message || 'No se pudo importar Excel', 'error');
    }
    setImporting(false);
  };

  const handleFileChange = async (ev) => {
    const file = ev.target.files?.[0];
    ev.target.value = '';
    if (file) await importFromExcel(file);
  };

  // Agrupar plantillas por categoría
  const templateCategories = {
    'Ventas': ['venta_materiales', 'venta_servicio'],
    'Compras': ['compra_materiales', 'compra_inmovilizado', 'compra_gasto'],
    'Gastos': ['gasto_alquiler', 'gasto_suministros', 'gasto_nomina', 'gasto_seguro', 'gasto_asesoria', 'gasto_banco'],
    'Cobros/Pagos': ['cobro_cliente', 'pago_proveedor'],
    'Capital': ['capital_social', 'aportacion_socios'],
    'Regularización': ['amortizacion', 'regularizacion_existencias']
  };

  return (
    <div className="space-y-6">
      <Toast toast={toast} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Libro Diario</h1>
          <p className="mt-1 text-sm text-slate-400">Asientos contables con templates y trazabilidad completa.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/templates/journal_template.xlsx" className="erp-btn-secondary"><HiOutlineDownload size={16} /> Template</a>
          <button type="button" className="erp-btn-secondary" onClick={() => fileInputRef.current?.click()} disabled={importing}><HiOutlineUpload size={16} /> {importing ? 'Importando...' : 'Excel'}</button>
          <button type="button" className="erp-btn-primary" onClick={() => setShowForm((v) => !v)}><HiOutlinePlus size={18} /> {showForm ? 'Cerrar' : 'Nuevo asiento'}</button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
        </div>
      </div>

      {showForm && (
        <section className="erp-panel p-5">
          {/* Selector de plantillas con importe */}
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={`erp-btn-secondary flex items-center gap-2 ${selectedTemplate ? 'bg-brand-500/20 border-brand-500/40' : ''}`}
                onClick={() => setShowTemplates(!showTemplates)}
              >
                <HiOutlineTemplate size={16} />
                {selectedTemplate ? JOURNAL_TEMPLATES[selectedTemplate]?.name : 'Seleccionar plantilla'}
              </button>
            </div>
            
            {selectedTemplate && (
              <>
                <div className="flex items-center gap-2">
                  <label className="flex flex-col">
                    <span className="text-xs text-slate-400">Base imponible</span>
                    <input
                      type="number"
                      step="0.01"
                      className="erp-input w-32"
                      placeholder="0.00"
                      value={templateBaseAmount}
                      onChange={(e) => setTemplateBaseAmount(e.target.value)}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-xs text-slate-400">IVA %</span>
                    <select
                      className="erp-input w-20"
                      value={templateIVA}
                      onChange={(e) => setTemplateIVA(e.target.value)}
                    >
                      <option value="21">21%</option>
                      <option value="10">10%</option>
                      <option value="4">4%</option>
                      <option value="0">0%</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    className="erp-btn-primary"
                    onClick={() => applyTemplateWithAmount(selectedTemplate)}
                  >
                    Calcular
                  </button>
                </div>
                <button
                  type="button"
                  className="text-sm text-slate-400 hover:text-white"
                  onClick={() => { setSelectedTemplate(''); setLines([{ ...lineTemplate }]); setTemplateBaseAmount(''); }}
                >
                  Limpiar
                </button>
              </>
            )}
          </div>

          {/* Menú de plantillas */}
          {showTemplates && (
            <div className="mb-4 grid grid-cols-1 gap-2 rounded-lg border border-white/10 bg-surface-900/50 p-4 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(templateCategories).map(([category, keys]) => (
                <div key={category}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{category}</h3>
                  <div className="space-y-1">
                    {keys.map(key => (
                      <button
                        key={key}
                        type="button"
                        className={`w-full rounded px-2 py-1 text-left text-sm transition ${
                          selectedTemplate === key
                            ? 'bg-brand-500/20 text-brand-200'
                            : 'text-slate-300 hover:bg-white/5 hover:text-white'
                        }`}
                        onClick={() => {
                          const tmpl = JOURNAL_TEMPLATES[key];
                          if (tmpl.lines.some(l => l.isBase || l.isIVA)) {
                            applyTemplate(key, '', templateIVA);
                          } else {
                            applyTemplate(key, '', templateIVA);
                          }
                          setShowTemplates(false);
                        }}
                      >
                        {JOURNAL_TEMPLATES[key]?.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <h2 className="mb-4 text-lg font-bold text-white">Nuevo asiento</h2>
          <form className="space-y-5" onSubmit={handleSave}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Fecha</span><input className="erp-input" type="date" required value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} /></label>
              <label><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Referencia</span><input className="erp-input" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="AS-001" /></label>
              <label><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Descripcion</span><input className="erp-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripción del asiento" /></label>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="min-w-full">
                <thead className="bg-surface-800/40">
                  <tr>
                    <th className="erp-th">Cuenta</th><th className="erp-th text-right">Debe</th><th className="erp-th text-right">Haber</th><th className="erp-th">Tx</th><th className="erp-th">Entidad</th><th className="erp-th">Item</th><th className="erp-th text-right">Cantidad</th><th className="erp-th text-right">Precio</th><th className="erp-th">DocRef</th><th className="erp-th">Descripcion linea</th><th className="erp-th w-14"></th>
                  </tr>
                </thead>
                <LineRows lines={lines} onChange={updateLine} onDelete={deleteLine} accounts={accounts} customers={customers} suppliers={suppliers} items={items} />
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button type="button" className="erp-btn-secondary" onClick={addLine}><HiOutlinePlus size={16} /> Agregar linea</button>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-slate-300">Debe: {toMoney(totals.debit)} EUR</span>
                <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-slate-300">Haber: {toMoney(totals.credit)} EUR</span>
                <span className={`rounded-lg border px-3 py-2 font-semibold ${totals.balanced ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/40 bg-rose-500/10 text-rose-200'}`}>{totals.balanced ? 'Equilibrado' : 'No equilibrado'}</span>
                <button type="submit" className="erp-btn-primary" disabled={saving || !totals.balanced}>{saving ? 'Guardando...' : 'Guardar asiento'}</button>
              </div>
            </div>
          </form>
        </section>
      )}

      <section className="erp-panel overflow-hidden">
        <div className="border-b border-white/10 px-4 py-3"><h2 className="text-lg font-bold text-white">Asientos registrados</h2></div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-surface-800/40"><tr><th className="erp-th w-8"></th><th className="erp-th">ID</th><th className="erp-th">Fecha</th><th className="erp-th">Referencia</th><th className="erp-th">Descripcion</th><th className="erp-th text-right">Acciones</th></tr></thead>
            <tbody className="divide-y divide-white/5">
              {loading && <tr><td className="px-4 py-8 text-center text-sm text-slate-400" colSpan={6}>Cargando asientos...</td></tr>}
              {!loading && entries.length === 0 && <tr><td className="px-4 py-8 text-center text-sm text-slate-400" colSpan={6}>No hay asientos registrados.</td></tr>}
              {!loading && entries.map((entry) => (
                <Fragment key={entry.id}>
                  <tr className="transition hover:bg-white/5">
                    <td className="erp-td"><button type="button" className="rounded p-1 text-slate-300 hover:bg-white/10" onClick={() => toggleExpand(entry.id)}>{expandedId === entry.id ? <HiOutlineChevronDown size={16} /> : <HiOutlineChevronRight size={16} />}</button></td>
                    <td className="erp-td">{entry.id}</td>
                    <td className="erp-td">{entry.entry_date}</td>
                    <td className="erp-td">{entry.reference || '-'}</td>
                    <td className="erp-td">{entry.description || '-'}</td>
                    <td className="erp-td"><div className="flex justify-end gap-2"><button type="button" className="rounded-lg p-2 text-slate-300 transition hover:bg-brand-500/20 hover:text-brand-200" onClick={() => openEdit(entry)}><HiOutlinePencil size={16} /></button><button type="button" className="rounded-lg p-2 text-slate-300 transition hover:bg-rose-500/20 hover:text-rose-200" onClick={() => handleDelete(entry)}><HiOutlineTrash size={16} /></button></div></td>
                  </tr>
                  {expandedId === entry.id && (
                    <tr className="bg-surface-950/50"><td colSpan={6} className="p-4"><div className="rounded-xl border border-white/10 bg-surface-900/70 p-4"><h3 className="mb-3 text-sm font-semibold text-white">Detalle del asiento #{entry.id}</h3><table className="min-w-full"><thead><tr><th className="erp-th">Cuenta</th><th className="erp-th text-right">Debe</th><th className="erp-th text-right">Haber</th><th className="erp-th">Tx</th><th className="erp-th">Entidad</th><th className="erp-th">Item</th><th className="erp-th text-right">Cant.</th><th className="erp-th text-right">Precio</th><th className="erp-th">DocRef</th><th className="erp-th">Descripcion linea</th></tr></thead><tbody className="divide-y divide-white/5">{(detailsById[entry.id]?.lines || []).map((line) => {const entity = line.transaction_type === 'venta' || line.transaction_type === 'cobro' ? customerById.get(Number(line.entity_id)) : supplierById.get(Number(line.entity_id)); return <tr key={line.id}><td className="erp-td">{line.account_code} - {line.account_name}</td><td className="erp-td text-right">{toMoney(line.debit)}</td><td className="erp-td text-right">{toMoney(line.credit)}</td><td className="erp-td">{line.transaction_type || '-'}</td><td className="erp-td">{entity || line.entity_id || '-'}</td><td className="erp-td">{itemById.get(Number(line.item_id)) || line.item_id || '-'}</td><td className="erp-td text-right">{line.quantity ?? '-'}</td><td className="erp-td text-right">{line.unit_price ?? '-'}</td><td className="erp-td">{line.document_ref || '-'}</td><td className="erp-td">{line.description || '-'}</td></tr>;})}</tbody></table></div></td></tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editingEntryId && (
        <Modal title={`Editar asiento #${editingEntryId}`} onClose={() => setEditingEntryId(null)} footer={<><button type="button" className="erp-btn-secondary" onClick={() => setEditingEntryId(null)}>Cancelar</button><button type="submit" form="edit-journal-form" className="erp-btn-primary" disabled={updating || !editTotals.balanced}>{updating ? 'Guardando...' : 'Guardar cambios'}</button></>}>
          <form id="edit-journal-form" className="space-y-4" onSubmit={handleUpdate}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Fecha</span><input className="erp-input" type="date" required value={editForm.entry_date} onChange={(e) => setEditForm((p) => ({ ...p, entry_date: e.target.value }))} /></label>
              <label><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Referencia</span><input className="erp-input" value={editForm.reference} onChange={(e) => setEditForm((p) => ({ ...p, reference: e.target.value }))} /></label>
              <label><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Descripcion</span><input className="erp-input" value={editForm.description} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} /></label>
            </div>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="min-w-full">
                <thead className="bg-surface-800/40"><tr><th className="erp-th">Cuenta</th><th className="erp-th text-right">Debe</th><th className="erp-th text-right">Haber</th><th className="erp-th">Tx</th><th className="erp-th">Entidad</th><th className="erp-th">Item</th><th className="erp-th text-right">Cantidad</th><th className="erp-th text-right">Precio</th><th className="erp-th">DocRef</th><th className="erp-th">Descripcion linea</th><th className="erp-th w-14"></th></tr></thead>
                <LineRows lines={editForm.lines || []} onChange={updateEditLine} onDelete={deleteEditLine} accounts={accounts} customers={customers} suppliers={suppliers} items={items} />
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button type="button" className="erp-btn-secondary" onClick={addEditLine}><HiOutlinePlus size={16} /> Agregar linea</button>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-slate-300">Debe: {toMoney(editTotals.debit)} EUR</span>
                <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-slate-300">Haber: {toMoney(editTotals.credit)} EUR</span>
                <span className={`rounded-lg border px-3 py-2 font-semibold ${editTotals.balanced ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/40 bg-rose-500/10 text-rose-200'}`}>{editTotals.balanced ? 'Equilibrado' : 'No equilibrado'}</span>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
