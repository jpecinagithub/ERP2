const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken, authorize } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT
      id,
      sku,
      name,
      description,
      category_id,
      unit_id,
      tax_rate_id,
      cost_price,
      sale_price,
      sale_price AS unit_price
    FROM items`
  );
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const [rows] = await pool.execute(
    `SELECT
      id,
      sku,
      name,
      description,
      category_id,
      unit_id,
      tax_rate_id,
      cost_price,
      sale_price,
      sale_price AS unit_price
    FROM items
    WHERE id = ?`,
    [id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Item not found' });
  res.json(rows[0]);
});

router.post('/', authorize(['superadmin']), async (req, res) => {
  const { sku, name, description, unit_price, sale_price, cost_price, unit_id, category_id, tax_rate_id } = req.body;
  const finalSalePrice = sale_price ?? unit_price ?? 0;
  const finalCostPrice = cost_price ?? 0;
  let finalUnitId = unit_id;

  if (!finalUnitId) {
    const [units] = await pool.execute('SELECT id FROM units ORDER BY id LIMIT 1');
    if (!units.length) return res.status(400).json({ error: 'No units found. Seed units first.' });
    finalUnitId = units[0].id;
  }

  const [insert] = await pool.execute(
    `INSERT INTO items
      (sku, name, description, category_id, unit_id, tax_rate_id, cost_price, sale_price, created_by)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [sku, name, description || null, category_id || null, finalUnitId, tax_rate_id || null, finalCostPrice, finalSalePrice, req.user?.id || null]
  );
  const insertedId = insert.insertId;
  await pool.execute('INSERT INTO audit_logs (user_id, action, table_name, record_id, details) VALUES (?,?,?,?,?)', [req.user?.id || null, 'CREATE', 'items', insertedId, `created item ${name}`]);
  res.status(201).json({ message: 'Item created' });
});

router.put('/:id', authorize(['superadmin']), async (req, res) => {
  const { id } = req.params;
  const { sku, name, description, unit_price, sale_price, cost_price, unit_id, category_id, tax_rate_id } = req.body;
  const finalSalePrice = sale_price ?? unit_price ?? 0;
  const finalCostPrice = cost_price ?? 0;
  let finalUnitId = unit_id;

  if (!finalUnitId) {
    const [units] = await pool.execute('SELECT id FROM units ORDER BY id LIMIT 1');
    if (!units.length) return res.status(400).json({ error: 'No units found. Seed units first.' });
    finalUnitId = units[0].id;
  }

  await pool.execute(
    `UPDATE items
     SET sku = ?, name = ?, description = ?, category_id = ?, unit_id = ?, tax_rate_id = ?, cost_price = ?, sale_price = ?
     WHERE id = ?`,
    [sku, name, description || null, category_id || null, finalUnitId, tax_rate_id || null, finalCostPrice, finalSalePrice, id]
  );
  await pool.execute('INSERT INTO audit_logs (user_id, action, table_name, record_id, details) VALUES (?,?,?,?,?)', [req.user?.id || null, 'UPDATE', 'items', Number(id), `updated item ${name}`]);
  res.json({ message: 'Item updated' });
});

router.delete('/:id', authorize(['superadmin']), async (req, res) => {
  const { id } = req.params;
  await pool.execute('DELETE FROM items WHERE id = ?', [id]);
  await pool.execute('INSERT INTO audit_logs (user_id, action, table_name, record_id, details) VALUES (?,?,?,?,?)', [req.user?.id || null, 'DELETE', 'items', Number(id), `deleted item ${id}`]);
  res.json({ message: 'Item deleted' });
});

module.exports = router;
