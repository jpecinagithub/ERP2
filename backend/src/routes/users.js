const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const { authenticateToken, authorize } = require('../middleware/auth');

router.use(authenticateToken);

// Admins can manage users (MVP1 assumption)
router.get('/', authorize(['superadmin']), async (req, res) => {
  const [rows] = await pool.execute('SELECT id, username, role FROM users');
  res.json(rows);
});

router.get('/:id', authorize(['superadmin']), async (req, res) => {
  const { id } = req.params;
  const [rows] = await pool.execute('SELECT id, username, role FROM users WHERE id = ?', [id]);
  if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});

router.post('/', authorize(['superadmin']), async (req, res) => {
  const { username, password, role } = req.body;
  const [result] = await pool.execute('INSERT INTO users (username, password, role) VALUES (?,?,?)', [username, password, role]);
  const insertedId = result.insertId;
  await pool.execute('INSERT INTO audit_logs (user_id, action, table_name, record_id, details) VALUES (?,?,?,?,?)', [req.user?.id || null, 'CREATE', 'users', insertedId, `created user ${username}`]);
  res.status(201).json({ message: 'User created' });
});

// Upgrade a user's password (hash and store) - MVP-friendly helper for migration
router.post('/:id/upgrade-password', authorize(['superadmin']), async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });
  const hash = bcrypt.hashSync(password, 10);
  await pool.execute('UPDATE users SET password = ? WHERE id = ?', [hash, id]);
  await pool.execute('INSERT INTO audit_logs (user_id, action, table_name, record_id, details) VALUES (?,?,?,?,?)', [req.user?.id || null, 'UPDATE', 'users', Number(id), `password upgraded`]);
  res.json({ message: 'Password upgraded (hashed)' });
});

router.put('/:id', authorize(['superadmin']), async (req, res) => {
  const { id } = req.params;
  const { username, password, role } = req.body;
  await pool.execute('UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?', [username, password, role, id]);
  await pool.execute('INSERT INTO audit_logs (user_id, action, table_name, record_id, details) VALUES (?,?,?,?,?)', [req.user?.id || null, 'UPDATE', 'users', Number(id), `updated user ${username}`]);
  res.json({ message: 'User updated' });
});

router.delete('/:id', authorize(['superadmin']), async (req, res) => {
  const { id } = req.params;
  await pool.execute('DELETE FROM users WHERE id = ?', [id]);
  await pool.execute('INSERT INTO audit_logs (user_id, action, table_name, record_id, details) VALUES (?,?,?,?,?)', [req.user?.id || null, 'DELETE', 'users', Number(id), `deleted user ${id}`]);
  res.json({ message: 'User deleted' });
});

module.exports = router;
