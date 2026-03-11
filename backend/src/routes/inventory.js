const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken, authorize } = require('../middleware/auth');

router.use(authenticateToken);

// List movements
router.get('/movements', async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM inventory_movements');
  res.json(rows);
});

// Create a movement (entry/exit)
router.post('/movements', authorize(['superadmin','contabilidad','compras','tesoreria']), async (req, res) => {
  const { item_id, movement_type, quantity, unit_cost, reference_document } = req.body;
  const [insert] = await pool.execute('INSERT INTO inventory_movements (item_id, movement_type, quantity, unit_cost, reference_document, created_by) VALUES (?,?,?,?,?,?)', [item_id, movement_type, quantity, unit_cost, reference_document, req.user?.id || null]);
  res.status(201).json({ message: 'Inventory movement created', id: insert.insertId });
});

module.exports = router;
