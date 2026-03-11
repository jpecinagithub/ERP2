const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken, authorize } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', async (req, res) => {
  const [rows] = await pool.execute('SELECT id, invoice_number, supplier_id, invoice_date, total_amount, status FROM purchase_invoices');
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const [invoices] = await pool.execute('SELECT * FROM purchase_invoices WHERE id = ?', [id]);
  if (invoices.length === 0) return res.status(404).json({ error: 'Invoice not found' });
  const [lines] = await pool.execute('SELECT * FROM purchase_invoice_lines WHERE invoice_id = ?', [id]);
  res.json({ invoice: invoices[0], lines });
});

router.post('/', authorize(['superadmin','compras','contabilidad']), async (req, res) => {
  const { invoice_number, supplier_id, invoice_date, total_amount, status } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [insert] = await conn.query(
      'INSERT INTO purchase_invoices (invoice_number, supplier_id, invoice_date, total_amount, status) VALUES (?,?,?,?,?)',
      [invoice_number, supplier_id, invoice_date, total_amount, status]
    );
    const id = insert.insertId;

    const [je] = await conn.query(
      'INSERT INTO journal_entries (entry_date, description, created_by, source_document) VALUES (?,?,?,?)',
      [invoice_date, `Purchase invoice ${invoice_number}`, req.user?.id || null, invoice_number]
    );
    const jeId = je.insertId;
    // Debit: Compras (600); Credit: Proveedores (400)
    await conn.query(
      'INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description) VALUES (?,?,?,?,?)',
      [jeId, 600, total_amount, 0, `Invoice ${invoice_number} purchases`]
    );
    await conn.query(
      'INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description) VALUES (?,?,?,?,?)',
      [jeId, 400, 0, total_amount, `Invoice ${invoice_number} suppliers`]
    );
    // Link invoice <-> journal for robust business cascade
    await conn.query(
      'INSERT INTO document_links (source_document, source_id, target_document, target_id) VALUES (?,?,?,?)',
      ['purchase_invoice', id, 'journal_entry', jeId]
    );

    await conn.commit();
    res.status(201).json({ message: 'Purchase invoice created', id });
  } catch (e) {
    await conn.rollback();
    res.status(400).json({ error: e.message });
  } finally {
    conn.release();
  }
});

router.post('/:invoiceId/lines', authorize(['superadmin','compras','contabilidad']), async (req, res) => {
  const { invoiceId } = req.params;
  const { item_id, quantity, unit_price, total } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [invoiceRows] = await conn.query('SELECT id, invoice_number FROM purchase_invoices WHERE id = ?', [invoiceId]);
    if (!invoiceRows.length) throw new Error('Invoice not found');
    const invoice = invoiceRows[0];

    const [lineInsert] = await conn.query(
      'INSERT INTO purchase_invoice_lines (invoice_id, item_id, quantity, unit_price, total) VALUES (?,?,?,?,?)',
      [invoiceId, item_id, quantity, unit_price, total]
    );
    // Every purchase line updates inventory and is reference-linked to invoice
    const [movInsert] = await conn.query(
      'INSERT INTO inventory_movements (item_id, movement_type, quantity, unit_cost, reference_document, created_by) VALUES (?,?,?,?,?,?)',
      [item_id, 'entrada', quantity, unit_price, invoice.invoice_number, req.user?.id || null]
    );
    await conn.query(
      'INSERT INTO document_links (source_document, source_id, target_document, target_id) VALUES (?,?,?,?)',
      ['purchase_invoice_line', lineInsert.insertId, 'inventory_movement', movInsert.insertId]
    );

    await conn.commit();
    res.status(201).json({ message: 'Purchase line added', lineId: lineInsert.insertId, movementId: movInsert.insertId });
  } catch (e) {
    await conn.rollback();
    res.status(400).json({ error: e.message });
  } finally {
    conn.release();
  }
});

router.delete('/:id', authorize(['superadmin','compras','contabilidad']), async (req, res) => {
  const { id } = req.params;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT id, invoice_number FROM purchase_invoices WHERE id = ?', [id]);
    if (!rows.length) throw new Error('Invoice not found');
    const invoice = rows[0];
    const [lineRows] = await conn.query('SELECT id FROM purchase_invoice_lines WHERE invoice_id = ?', [id]);
    const lineIds = lineRows.map((r) => Number(r.id));

    // Business cascade: remove inventory effects and all accounting traces bound to this purchase document
    await conn.query('DELETE FROM inventory_movements WHERE reference_document = ?', [invoice.invoice_number]);
    await conn.query('DELETE FROM journal_entries WHERE source_document = ?', [invoice.invoice_number]);
    await conn.query('DELETE FROM purchase_invoices WHERE id = ?', [id]); // cascades purchase_invoice_lines
    await conn.query('DELETE FROM document_links WHERE source_document = ? AND source_id = ?', ['purchase_invoice', Number(id)]);
    if (lineIds.length) {
      await conn.query(
        `DELETE FROM document_links WHERE source_document = 'purchase_invoice_line' AND source_id IN (${lineIds.map(() => '?').join(',')})`,
        lineIds
      );
    }

    await conn.commit();
    try {
      await pool.execute(
        'INSERT INTO audit_logs (user_id, action, table_name, record_id, details) VALUES (?,?,?,?,?)',
        [req.user?.id || null, 'DELETE', 'purchase_invoices', Number(id), `business-cascade delete for ${invoice.invoice_number}`]
      );
    } catch (auditErr) {
      console.error('Audit log failed:', auditErr);
    }
    res.json({ deleted: true, id: Number(id), cascadedBy: 'purchase_invoice' });
  } catch (e) {
    await conn.rollback();
    res.status(400).json({ error: e.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
