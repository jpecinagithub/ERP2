const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken, authorize } = require('../middleware/auth');

router.use(authenticateToken);

// List all sales invoices
router.get('/', async (req, res) => {
  const [rows] = await pool.execute('SELECT id, invoice_number, customer_id, invoice_date, total_amount, status FROM sales_invoices');
  res.json(rows);
});

// Get a specific invoice
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const [invoices] = await pool.execute('SELECT * FROM sales_invoices WHERE id = ?', [id]);
  if (invoices.length === 0) return res.status(404).json({ error: 'Invoice not found' });
  const [lines] = await pool.execute('SELECT * FROM sales_invoice_lines WHERE invoice_id = ?', [id]);
  res.json({ invoice: invoices[0], lines });
});

// Create a new sales invoice (basic)
router.post('/', authorize(['superadmin','contabilidad','compras']), async (req, res) => {
  const { invoice_number, customer_id, invoice_date, total_amount, status } = req.body;
  const [insert] = await pool.execute('INSERT INTO sales_invoices (invoice_number, customer_id, invoice_date, total_amount, status) VALUES (?,?,?,?,?)', [invoice_number, customer_id, invoice_date, total_amount, status]);
  const id = insert.insertId;
  // Create a basic journal entry for this sale to establish trazabilidad
  try {
    const [je] = await pool.execute('INSERT INTO journal_entries (entry_date, description, created_by, source_document) VALUES (?,?,?,?)', [invoice_date, `Sales invoice ${invoice_number}`, req.user?.id || null, invoice_number]);
    const jeId = je.insertId;
    // Debit: Clientes (430); Credit: Ventas (700)
    await pool.execute('INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description) VALUES (?,?,?,?,?)', [jeId, 430, total_amount, 0, `Invoice ${invoice_number} receivable`]);
    await pool.execute('INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description) VALUES (?,?,?,?,?)', [jeId, 700, 0, total_amount, `Invoice ${invoice_number} sales`]);
  } catch (e) {
    // Do not block invoice creation if journal entry fails; log non-fatal error
    console.error('Journal entry creation failed for Sales Invoice', e);
  }
  res.status(201).json({ message: 'Sales invoice created', id });
});

// Add line to an existing sales invoice
router.post('/:invoiceId/lines', authorize(['superadmin','contabilidad','compras']), async (req, res) => {
  const { invoiceId } = req.params;
  const { item_id, quantity, unit_price, total } = req.body;
  await pool.execute('INSERT INTO sales_invoice_lines (invoice_id, item_id, quantity, unit_price, total) VALUES (?,?,?,?,?)', [invoiceId, item_id, quantity, unit_price, total]);
  res.status(201).json({ message: 'Line added' });
});

module.exports = router;
