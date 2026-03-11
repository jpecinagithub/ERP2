const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken, authorize } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', async (req, res) => {
  const [rows] = await pool.execute('SELECT id, name, email FROM suppliers');
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const [rows] = await pool.execute('SELECT id, name, email FROM suppliers WHERE id = ?', [id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Supplier not found' });
  res.json(rows[0]);
});

router.post('/', authorize(['superadmin']), async (req, res) => {
  const { name, email, tax_id, address } = req.body;
  const [insert] = await pool.execute('INSERT INTO suppliers (name, email, tax_id, address) VALUES (?,?,?,?)', [name, email, tax_id, address]);
  const insertedId = insert.insertId;
  await pool.execute('INSERT INTO audit_logs (user_id, action, table_name, record_id, details) VALUES (?,?,?,?,?)', [req.user?.id || null, 'CREATE', 'suppliers', insertedId, `created supplier ${name}`]);
  res.status(201).json({ message: 'Supplier created' });
});

router.put('/:id', authorize(['superadmin']), async (req, res) => {
  const { id } = req.params;
  const { name, email, tax_id, address } = req.body;
  await pool.execute('UPDATE suppliers SET name = ?, email = ?, tax_id = ?, address = ? WHERE id = ?', [name, email, tax_id, address, id]);
  await pool.execute('INSERT INTO audit_logs (user_id, action, table_name, record_id, details) VALUES (?,?,?,?,?)', [req.user?.id || null, 'UPDATE', 'suppliers', Number(id), `updated supplier ${name}`]);
  res.json({ message: 'Supplier updated' });
});

router.delete('/:id', authorize(['superadmin']), async (req, res) => {
  const { id } = req.params;
  await pool.execute('DELETE FROM suppliers WHERE id = ?', [id]);
  await pool.execute('INSERT INTO audit_logs (user_id, action, table_name, record_id, details) VALUES (?,?,?,?,?)', [req.user?.id || null, 'DELETE', 'suppliers', Number(id), `deleted supplier ${id}`]);
  res.json({ message: 'Supplier deleted' });
});

module.exports = router;
