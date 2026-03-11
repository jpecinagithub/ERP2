const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken, authorize } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', async (req, res) => {
  const [rows] = await pool.execute('SELECT id, name, email FROM customers');
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const [rows] = await pool.execute('SELECT id, name, email FROM customers WHERE id = ?', [id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
  res.json(rows[0]);
});

router.post('/', authorize(['superadmin']), async (req, res) => {
  const { name, email, tax_id, address } = req.body;
  const [insert] = await pool.execute('INSERT INTO customers (name, email, tax_id, address, created_by) VALUES (?,?,?,?, NULL)', [name, email, tax_id, address]);
  const insertedId = insert.insertId;
  await pool.execute('INSERT INTO audit_logs (user_id, action, table_name, record_id, details) VALUES (?,?,?,?,?)', [req.user?.id || null, 'CREATE', 'customers', insertedId, `created customer ${name}`]);
  res.status(201).json({ message: 'Customer created' });
});

router.put('/:id', authorize(['superadmin']), async (req, res) => {
  const { id } = req.params;
  const { name, email, tax_id, address } = req.body;
  await pool.execute('UPDATE customers SET name = ?, email = ?, tax_id = ?, address = ? WHERE id = ?', [name, email, tax_id, address, id]);
  await pool.execute('INSERT INTO audit_logs (user_id, action, table_name, record_id, details) VALUES (?,?,?,?,?)', [req.user?.id || null, 'UPDATE', 'customers', Number(id), `updated customer ${name}`]);
  res.json({ message: 'Customer updated' });
});

router.delete('/:id', authorize(['superadmin']), async (req, res) => {
  const { id } = req.params;
  await pool.execute('DELETE FROM customers WHERE id = ?', [id]);
  await pool.execute('INSERT INTO audit_logs (user_id, action, table_name, record_id, details) VALUES (?,?,?,?,?)', [req.user?.id || null, 'DELETE', 'customers', Number(id), `deleted customer ${id}`]);
  res.json({ message: 'Customer deleted' });
});

module.exports = router;
