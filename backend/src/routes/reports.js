const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken, authorize } = require('../middleware/auth');

router.use(authenticateToken);

// Balance report - calculates account balances from journal entries
router.get('/balance', authorize(['superadmin', 'contabilidad', 'tesoreria', 'compras', 'admin']), async (req, res) => {
  const { year, month } = req.query;
  
  try {
    let dateFilter = '';
    const params = [];
    
    if (year) {
      if (month) {
        dateFilter = 'WHERE YEAR(jel.created_at) = ? AND MONTH(jel.created_at) = ?';
        params.push(year, month);
      } else {
        dateFilter = 'WHERE YEAR(jel.created_at) = ?';
        params.push(year);
      }
    }

    const query = `
      SELECT 
        a.id,
        a.code,
        a.name,
        a.type as account_type,
        COALESCE(SUM(jel.debit), 0) as total_debit,
        COALESCE(SUM(jel.credit), 0) as total_credit,
        COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0) as balance
      FROM accounts a
      LEFT JOIN journal_entry_lines jel ON a.id = jel.account_id
      ${dateFilter ? 'AND ' + dateFilter.replace('WHERE', 'jel.created_at') : ''}
      GROUP BY a.id, a.code, a.name, a.type
      ORDER BY a.code
    `;
    
    // Simpler query without the complex date filtering
    // El saldo se calcula según el tipo de cuenta:
    // - Activo y Gasto (grupo 6): saldo natural en el Debe (positivo si Debe > Haber)
    // - Pasivo, Patrimonio e Ingreso (grupo 7): saldo natural en el Haber (positivo si Haber > Debe)
    const simpleQuery = `
      SELECT 
        a.id,
        a.code,
        a.name,
        a.type as account_type,
        COALESCE(SUM(jel.debit), 0) as total_debit,
        COALESCE(SUM(jel.credit), 0) as total_credit,
        CASE 
          WHEN a.type IN ('activo', 'gasto') THEN COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0)
          ELSE COALESCE(SUM(jel.credit), 0) - COALESCE(SUM(jel.debit), 0)
        END as balance
      FROM accounts a
      LEFT JOIN journal_entry_lines jel ON a.id = jel.account_id
      GROUP BY a.id, a.code, a.name, a.type
      ORDER BY a.code
    `;

    const [rows] = await pool.execute(simpleQuery);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Trial balance (balance de sumas y saldos)
router.get('/trial-balance', authorize(['superadmin', 'contabilidad']), async (req, res) => {
  const { year } = req.query;
  
  try {
    const query = `
      SELECT 
        a.code,
        a.name,
        a.type as account_type,
        COALESCE(SUM(jel.debit), 0) as total_debit,
        COALESCE(SUM(jel.credit), 0) as total_credit,
        CASE 
          WHEN a.type IN ('activo', 'gasto') THEN COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0)
          ELSE COALESCE(SUM(jel.credit), 0) - COALESCE(SUM(jel.debit), 0)
        END as balance
      FROM accounts a
      LEFT JOIN journal_entry_lines jel ON a.id = jel.account_id
      GROUP BY a.id, a.code, a.name, a.type
      HAVING total_debit > 0 OR total_credit > 0
      ORDER BY a.code
    `;

    const [rows] = await pool.execute(query);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Income statement (cuenta de pérdidas y ganancias)
router.get('/income-statement', authorize(['superadmin', 'contabilidad']), async (req, res) => {
  const { year } = req.query;
  
  try {
    // Ingresos
    const incomeQuery = `
      SELECT COALESCE(SUM(jel.credit - jel.debit), 0) as total
      FROM journal_entry_lines jel
      JOIN accounts a ON a.id = jel.account_id
      WHERE a.type = 'ingreso'
    `;
    
    // Gastos
    const expenseQuery = `
      SELECT COALESCE(SUM(jel.debit - jel.credit), 0) as total
      FROM journal_entry_lines jel
      JOIN accounts a ON a.id = jel.account_id
      WHERE a.type = 'gasto'
    `;

    const [income] = await pool.execute(incomeQuery);
    const [expense] = await pool.execute(expenseQuery);

    const totalIncome = income[0]?.total || 0;
    const totalExpense = expense[0]?.total || 0;

    res.json({
      totalIncome,
      totalExpense,
      result: totalIncome - totalExpense
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
