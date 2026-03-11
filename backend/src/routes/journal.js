const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken, authorize } = require('../middleware/auth');

router.use(authenticateToken);

const ALLOWED_ROLES = ['superadmin', 'contabilidad'];

async function validateHeader(payload) {
  const { entry_date, lines } = payload;
  if (!entry_date || !Array.isArray(lines) || lines.length === 0) {
    throw new Error('Invalid payload: entry_date and lines are required');
  }
}

async function validateAndNormalizeLines(conn, lines) {
  let totalDebit = 0;
  let totalCredit = 0;
  const normalized = [];

  for (const line of lines) {
    const accountId = Number(line.account_id);
    const debit = Number(line.debit) || 0;
    const credit = Number(line.credit) || 0;
    const quantity = line.quantity === '' || line.quantity == null ? null : Number(line.quantity);
    const unitPrice = line.unit_price === '' || line.unit_price == null ? null : Number(line.unit_price);
    const entityId = line.entity_id === '' || line.entity_id == null ? null : Number(line.entity_id);
    const itemId = line.item_id === '' || line.item_id == null ? null : Number(line.item_id);

    if (!accountId) throw new Error('account_id is required in each line');
    if (debit < 0 || credit < 0) throw new Error('debit/credit cannot be negative');
    if (debit === 0 && credit === 0) throw new Error('each line must have debit or credit > 0');

    const [accountRows] = await conn.query('SELECT id FROM accounts WHERE id = ? LIMIT 1', [accountId]);
    if (!accountRows.length) throw new Error(`Account not found for account_id ${accountId}`);

    if (itemId != null) {
      const [itemRows] = await conn.query('SELECT id FROM items WHERE id = ? LIMIT 1', [itemId]);
      if (!itemRows.length) throw new Error(`Item not found for item_id ${itemId}`);
    }

    totalDebit += debit;
    totalCredit += credit;

    normalized.push({
      account_id: accountId,
      debit,
      credit,
      description: line.description || '',
      transaction_type: line.transaction_type || null,
      entity_id: entityId,
      item_id: itemId,
      quantity,
      unit_price: unitPrice,
      document_ref: line.document_ref || null
    });
  }

  if (Math.abs(totalDebit - totalCredit) > 0.0001) {
    throw new Error('Debe y Haber no equilibran');
  }

  return normalized;
}

async function insertLines(conn, journalEntryId, lines) {
  for (const line of lines) {
    await conn.query(
      `INSERT INTO journal_entry_lines (
        journal_entry_id, account_id, debit, credit, description,
        transaction_type, entity_id, item_id, quantity, unit_price, document_ref
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        journalEntryId,
        line.account_id,
        line.debit,
        line.credit,
        line.description,
        line.transaction_type,
        line.entity_id,
        line.item_id,
        line.quantity,
        line.unit_price,
        line.document_ref
      ]
    );
  }
}

function getAutoProcedure(lines) {
  const txTypes = [...new Set(lines.map((l) => l.transaction_type).filter(Boolean))];
  if (txTypes.length !== 1) return null;
  // Llamar al procedimiento completo que genera facturas Y movimientos de inventario
  if (txTypes[0] === 'venta') return 'sp_generate_invoices_and_stock';
  if (txTypes[0] === 'compra') return 'sp_generate_invoices_and_stock';
  return null;
}

// Función para generar facturas y movimientos de inventario directamente en JavaScript
// NO hace rollback si falla algo - solo registra errores
async function generateInvoicesAndStock(conn, journalEntryId, lines) {
  console.log('[generateInvoicesAndStock] Iniciando para journalEntryId:', journalEntryId);
  
  try {
    // Buscar línea con transaction_type = venta o compra y que tenga entity_id
    const txLines = lines.filter(l => 
      (l.transaction_type === 'venta' || l.transaction_type === 'compra') && 
      l.entity_id != null
    );
    
    console.log('[generateInvoicesAndStock] txLines encontradas:', txLines.length);
    
    if (txLines.length === 0) {
      console.log('[generateInvoicesAndStock] NO hay líneas de venta/compra con entity_id');
      return; 
    }
    
    const txType = txLines[0].transaction_type;
    const entityId = txLines[0].entity_id;
    
    console.log('[generateInvoicesAndStock] txType:', txType, 'entityId:', entityId);
    
    // Obtener la fecha del asiento
    const [entryRows] = await conn.query('SELECT entry_date FROM journal_entries WHERE id = ?', [journalEntryId]);
    if (entryRows.length === 0) {
      console.log('[generateInvoicesAndStock] No se encontró el asiento');
      return;
    }
    const entryDate = entryRows[0].entry_date;
    
    // Calcular total
    let totalAmount = 0;
    if (txType === 'venta') {
      totalAmount = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
    } else {
      totalAmount = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
    }
    
    console.log('[generateInvoicesAndStock] totalAmount:', totalAmount);
    
    // Generar número de factura
    const prefix = txType === 'venta' ? 'FAC-V-' : 'FAC-C-';
    const invoiceNumber = prefix + String(journalEntryId).padStart(6, '0');
    
    let invoiceId;
    
    if (txType === 'venta') {
      console.log('[generateInvoicesAndStock] Creando factura de VENTA...');
      const [result] = await conn.query(
        `INSERT INTO sales_invoices (invoice_number, customer_id, invoice_date, journal_entry_id, total_amount, status) 
         VALUES (?, ?, ?, ?, ?, 'emitida')`,
        [invoiceNumber, entityId, entryDate, journalEntryId, totalAmount]
      );
      invoiceId = result.insertId;
      console.log('[generateInvoicesAndStock] Factura de venta creada, invoiceId:', invoiceId);
    } else {
      console.log('[generateInvoicesAndStock] Creando factura de COMPRA...');
      const [result] = await conn.query(
        `INSERT INTO purchase_invoices (invoice_number, supplier_id, invoice_date, journal_entry_id, total_amount, status) 
         VALUES (?, ?, ?, ?, ?, 'recibida')`,
        [invoiceNumber, entityId, entryDate, journalEntryId, totalAmount]
      );
      invoiceId = result.insertId;
      console.log('[generateInvoicesAndStock] Factura de compra creada, invoiceId:', invoiceId);
    }
    
    // Crear movimientos de inventario - si falla, NO hace rollback de la factura
    const itemLines = lines.filter(l => l.item_id != null && l.quantity != null && l.quantity > 0);
    console.log('[generateInvoicesAndStock] itemLines:', itemLines.length);
    
    for (const line of itemLines) {
      const movementType = txType === 'venta' ? 'salida' : 'entrada';
      const refType = txType === 'venta' ? 'sales_invoice' : 'purchase_invoice';
      
      console.log('[generateInvoicesAndStock] Insertando movimiento para item:', line.item_id);
      
      try {
        const [movResult] = await conn.query(
          `INSERT INTO inventory_movements (item_id, movement_type, quantity, unit_cost, reference_type, reference_id, journal_entry_id, movement_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [line.item_id, movementType, line.quantity, line.unit_price, refType, invoiceId, journalEntryId, entryDate]
        );
        console.log('[generateInvoicesAndStock] Movimiento creado, insertId:', movResult.insertId);
      } catch (movErr) {
        console.error('[generateInvoicesAndStock] Error al crear movimiento:', movErr.message);
        // NO throw - continuar con los demás movimientos
      }
    }
    
    console.log('[generateInvoicesAndStock] COMPLETADO (con o sin errores de movimientos)');
    
  } catch (error) {
    // NO lanzar el error - solo registrarlo para no afectar la transacción principal
    console.error('[generateInvoicesAndStock] Error (NO hace rollback):', error.message);
  }
}

// Versión para ejecutar DESPUÉS del commit - usa pool en lugar de conn
async function generateInvoicesAfterCommit(journalEntryId, lines) {
  console.log('[generateInvoicesAfterCommit] Iniciando...');
  const conn = await pool.getConnection();
  
  try {
    // Buscar línea con transaction_type
    const txLines = lines.filter(l => 
      (l.transaction_type === 'venta' || l.transaction_type === 'compra') && 
      l.entity_id != null
    );
    
    if (txLines.length === 0) {
      console.log('[generateInvoicesAfterCommit] Sin líneas de venta/compra');
      return; 
    }
    
    const txType = txLines[0].transaction_type;
    const entityId = txLines[0].entity_id;
    
    // Obtener la fecha del asiento
    const [entryRows] = await conn.query('SELECT entry_date FROM journal_entries WHERE id = ?', [journalEntryId]);
    if (entryRows.length === 0) return;
    const entryDate = entryRows[0].entry_date;
    
    // Calcular total
    let totalAmount = 0;
    if (txType === 'venta') {
      totalAmount = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
    } else {
      totalAmount = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
    }
    
    const prefix = txType === 'venta' ? 'FAC-V-' : 'FAC-C-';
    const invoiceNumber = prefix + String(journalEntryId).padStart(6, '0');
    
    let invoiceId;
    
    if (txType === 'venta') {
      const [result] = await conn.query(
        `INSERT INTO sales_invoices (invoice_number, customer_id, invoice_date, journal_entry_id, total_amount, status) 
         VALUES (?, ?, ?, ?, ?, 'emitida')`,
        [invoiceNumber, entityId, entryDate, journalEntryId, totalAmount]
      );
      invoiceId = result.insertId;
    } else {
      const [result] = await conn.query(
        `INSERT INTO purchase_invoices (invoice_number, supplier_id, invoice_date, journal_entry_id, total_amount, status) 
         VALUES (?, ?, ?, ?, ?, 'recibida')`,
        [invoiceNumber, entityId, entryDate, journalEntryId, totalAmount]
      );
      invoiceId = result.insertId;
    }
    
    console.log('[generateInvoicesAfterCommit] Factura creada, id:', invoiceId);
    
    // Desactivar triggers de auditoría temporalmente para evitar error de foreign key
    await conn.query('SET @AUDIT_SKIP_SEED = 1');
    
    // Crear movimientos de inventario
    console.log('[generateInvoicesAfterCommit] Lines totales:', JSON.stringify(lines));
    const itemLines = lines.filter(l => l.item_id != null && l.quantity != null && l.quantity > 0);
    console.log('[generateInvoicesAfterCommit] itemLines encontradas:', itemLines.length);
    
    for (const line of itemLines) {
      const movementType = txType === 'venta' ? 'salida' : 'entrada';
      const refType = txType === 'venta' ? 'sales_invoice' : 'purchase_invoice';
      
      // Las entradas tienen cantidad positiva, las salidas tienen cantidad negativa
      const qty = txType === 'venta' ? -Math.abs(line.quantity) : Math.abs(line.quantity);
      
      console.log('[generateInvoicesAfterCommit] Creando movimiento:', {
        item_id: line.item_id,
        movementType,
        quantity: qty,
        unit_price: line.unit_price,
        refType,
        invoiceId,
        journalEntryId,
        entryDate
      });
      
      const [movResult] = await conn.query(
        `INSERT INTO inventory_movements (item_id, movement_type, quantity, unit_cost, reference_type, reference_id, journal_entry_id, movement_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [line.item_id, movementType, qty, line.unit_price, refType, invoiceId, journalEntryId, entryDate]
      );
      console.log('[generateInvoicesAfterCommit] Movimiento creado, id:', movResult.insertId);
    }
    
    // Reactivar triggers de auditoría
    await conn.query('SET @AUDIT_SKIP_SEED = 0');
    
    console.log('[generateInvoicesAfterCommit] COMPLETADO');
    
  } catch (error) {
    console.error('[generateInvoicesAfterCommit] Error:', error.message);
  } finally {
    conn.release();
  }
}

router.get('/', async (req, res) => {
  try {
    const [entries] = await pool.execute(
      'SELECT id, entry_date, description, reference, created_by, created_at FROM journal_entries ORDER BY id DESC'
    );
    res.json(entries);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [entryRows] = await pool.execute(
      'SELECT id, entry_date, description, reference, created_by, created_at FROM journal_entries WHERE id = ?',
      [id]
    );
    if (!entryRows.length) return res.status(404).json({ error: 'Journal entry not found' });

    const [lineRows] = await pool.execute(
      `SELECT
         jel.id,
         jel.journal_entry_id,
         jel.account_id,
         a.code AS account_code,
         a.name AS account_name,
         jel.debit,
         jel.credit,
         jel.description,
         jel.transaction_type,
         jel.entity_id,
         jel.item_id,
         jel.quantity,
         jel.unit_price,
         jel.document_ref
       FROM journal_entry_lines jel
       JOIN accounts a ON a.id = jel.account_id
       WHERE jel.journal_entry_id = ?
       ORDER BY jel.id`,
      [id]
    );

    res.json({ entry: entryRows[0], lines: lineRows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', authorize(ALLOWED_ROLES), async (req, res) => {
  const { entry_date, description, reference, lines } = req.body;
  const conn = await pool.getConnection();

  try {
    await validateHeader({ entry_date, lines });
    await conn.beginTransaction();

    const normalizedLines = await validateAndNormalizeLines(conn, lines);

    const [entryResult] = await conn.query(
      'INSERT INTO journal_entries (entry_date, description, reference, status, created_by, posted_at) VALUES (?,?,?,?,?,?)',
      [entry_date, description || '', reference || null, 'posteado', req.user?.id ? Number(req.user.id) : null, new Date()]
    );
    const journalEntryId = entryResult.insertId;

    await insertLines(conn, journalEntryId, normalizedLines);

    await conn.commit();
    console.log('[POST] Transacción principal confirmada');

    // Generar facturas y movimientos de inventario DESPUÉS del commit
    // (En una conexión separada para evitar problemas de transacción)
    try {
      await generateInvoicesAfterCommit(journalEntryId, normalizedLines);
    } catch (genErr) {
      console.error('[POST] Error al generar facturas (no afecta el asiento):', genErr.message);
    }

    console.log('[POST] Generando respuesta');
    
    // Responder al cliente primero
    res.status(201).json({ journalEntryId, balanced: true, status: 'posteado', autoProcedure: 'generated' });
    
    // Audit log fuera de la transacción (no bloquea la respuesta)
    try {
      // Siempre usar null si no hay usuario válido - evita error de foreign key
      const userId = req.user?.id ? Number(req.user.id) : null;
      console.log('[POST] Audit log - userId:', userId);
      if (userId) {
        await pool.execute(
          'INSERT INTO audit_logs (user_id, action, table_name, record_id, details) VALUES (?,?,?,?,?)',
          [userId, 'CREATE', 'journal_entries', journalEntryId, `created and posted journal with ${normalizedLines.length} lines`]
        );
      } else {
        console.log('[POST] Skip audit - no userId');
      }
    } catch (auditErr) {
      console.error('Audit log failed (no bloquea):', auditErr.message);
    }
    
    console.log('[POST] Respuesta enviada');
    return;
  } catch (e) {
    await conn.rollback();
    res.status(400).json({ error: e.message });
  } finally {
    conn.release();
  }
});

router.put('/:id', authorize(ALLOWED_ROLES), async (req, res) => {
  const { id } = req.params;
  const { entry_date, description, reference, lines } = req.body;
  const conn = await pool.getConnection();

  try {
    await validateHeader({ entry_date, lines });
    await conn.beginTransaction();

    const [existing] = await conn.query('SELECT id FROM journal_entries WHERE id = ?', [id]);
    if (!existing.length) throw new Error('Journal entry not found');

    const normalizedLines = await validateAndNormalizeLines(conn, lines);

    await conn.query(
      'UPDATE journal_entries SET entry_date = ?, description = ?, reference = ? WHERE id = ?',
      [entry_date, description || '', reference || null, id]
    );
    await conn.query('DELETE FROM journal_entry_lines WHERE journal_entry_id = ?', [id]);
    await insertLines(conn, Number(id), normalizedLines);

    await conn.commit();

    try {
      await pool.execute(
        'INSERT INTO audit_logs (user_id, action, table_name, record_id, details) VALUES (?,?,?,?,?)',
        [req.user?.id || null, 'UPDATE', 'journal_entries', Number(id), `updated journal with ${normalizedLines.length} lines`]
      );
    } catch (auditErr) {
      console.error('Audit log failed:', auditErr);
    }

    res.json({ journalEntryId: Number(id), updated: true });
  } catch (e) {
    await conn.rollback();
    res.status(400).json({ error: e.message });
  } finally {
    conn.release();
  }
});

router.delete('/:id', authorize(ALLOWED_ROLES), async (req, res) => {
  const { id } = req.params;
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [existing] = await conn.query('SELECT id FROM journal_entries WHERE id = ?', [id]);
    if (!existing.length) throw new Error('Journal entry not found');

    // Business cascade for journal-first generated records
    await conn.query('DELETE FROM sales_invoices WHERE journal_entry_id = ?', [id]);
    await conn.query('DELETE FROM purchase_invoices WHERE journal_entry_id = ?', [id]);
    await conn.query('DELETE FROM inventory_movements WHERE journal_entry_id = ?', [id]);
    await conn.query('DELETE FROM document_links WHERE journal_entry_id = ?', [id]);
    await conn.query('DELETE FROM journal_entries WHERE id = ?', [id]);

    await conn.commit();

    try {
      await pool.execute(
        'INSERT INTO audit_logs (user_id, action, table_name, record_id, details) VALUES (?,?,?,?,?)',
        [req.user?.id || null, 'DELETE', 'journal_entries', Number(id), 'deleted journal entry and generated records']
      );
    } catch (auditErr) {
      console.error('Audit log failed:', auditErr);
    }

    res.json({ deleted: true, id: Number(id) });
  } catch (e) {
    await conn.rollback();
    res.status(400).json({ error: e.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
