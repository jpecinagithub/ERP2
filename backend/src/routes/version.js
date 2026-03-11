const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ version: '0.1.0', build: new Date().toISOString() });
});

module.exports = router;
