require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');

const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const customersRouter = require('./routes/customers');
const suppliersRouter = require('./routes/suppliers');
const itemsRouter = require('./routes/items');
const accountsRouter = require('./routes/accounts');
const journalRouter = require('./routes/journal');
const versionRouter = require('./routes/version');
const salesInvoicesRouter = require('./routes/sales_invoices');
const purchaseInvoicesRouter = require('./routes/purchase_invoices');
const inventoryRouter = require('./routes/inventory');
const reportsRouter = require('./routes/reports');
const healthRouter = require('./routes/health');

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/customers', customersRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/items', itemsRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/journal', journalRouter);
app.use('/api/version', versionRouter);
app.use('/api/sales_invoices', salesInvoicesRouter);
app.use('/api/purchase_invoices', purchaseInvoicesRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/health', healthRouter);

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`ERP MVP1 backend running on http://localhost:${PORT}`);
  });
}

module.exports = app;
