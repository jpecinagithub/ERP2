const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken, authorize } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', async (req, res) => {
  const [rows] = await pool.execute('SELECT id, code, name, type FROM accounts');
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const [rows] = await pool.execute('SELECT id, code, name, type FROM accounts WHERE id = ?', [id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Account not found' });
  res.json(rows[0]);
});

router.post('/', authorize(['superadmin']), async (req, res) => {
  const { code, name, type, parent_account } = req.body;
  const [insert] = await pool.execute('INSERT INTO accounts (code, name, type, parent_account) VALUES (?,?,?,?)', [code, name, type, parent_account]);
  const insertedId = insert.insertId;
  await pool.execute('INSERT INTO audit_logs (user_id, action, table_name, record_id, details) VALUES (?,?,?,?,?)', [req.user?.id || null, 'CREATE', 'accounts', insertedId, `created account ${name}`]);
  res.status(201).json({ message: 'Account created' });
});

router.put('/:id', authorize(['superadmin']), async (req, res) => {
  const { id } = req.params;
  const { code, name, type, parent_account } = req.body;
  await pool.execute('UPDATE accounts SET code = ?, name = ?, type = ?, parent_account = ? WHERE id = ?', [code, name, type, parent_account, id]);
  await pool.execute('INSERT INTO audit_logs (user_id, action, table_name, record_id, details) VALUES (?,?,?,?,?)', [req.user?.id || null, 'UPDATE', 'accounts', Number(id), `updated account ${name}`]);
  res.json({ message: 'Account updated' });
});

router.delete('/:id', authorize(['superadmin']), async (req, res) => {
  const { id } = req.params;
  await pool.execute('DELETE FROM accounts WHERE id = ?', [id]);
  await pool.execute('INSERT INTO audit_logs (user_id, action, table_name, record_id, details) VALUES (?,?,?,?,?)', [req.user?.id || null, 'DELETE', 'accounts', Number(id), `deleted account ${id}`]);
  res.json({ message: 'Account deleted' });
});

module.exports = router;
