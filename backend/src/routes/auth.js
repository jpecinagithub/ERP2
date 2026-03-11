const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken, authorize } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const SECRET = process.env.JWT_SECRET || 'erpsecret';

// Login - existente
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await pool.execute('SELECT id, username, password, role FROM users WHERE username = ?', [username]);
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = rows[0];
    // Primero intentar comparación en claro (para seeds en texto plano)
    let valid = user.password === password;
    if (!valid) {
      // Intenta comparar con hash bcrypt
      if (typeof bcrypt.compareSync === 'function') {
        valid = bcrypt.compareSync(password, user.password);
      } else {
        valid = false;
      }
    }
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET, { expiresIn: '2h' });
    res.json({ token });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Registro de nuevos usuarios
router.post('/register', async (req, res) => {
  const { username, password, role } = req.body;
  
  // Validaciones
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
  }
  
  if (username.length < 3) {
    return res.status(400).json({ error: 'El usuario debe tener al menos 3 caracteres' });
  }
  
  if (password.length < 4) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });
  }

  // Verificar si el usuario ya existe
  try {
    const [existing] = await pool.execute('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'El usuario ya existe' });
    }

    // Hash de la contraseña
    const hash = bcrypt.hashSync(password, 10);
    
    // rol por defecto: 'compras' (si no se especifica o si no es superadmin)
    const userRole = ['admin', 'compras', 'contabilidad', 'tesoreria', 'superadmin'].includes(role) ? role : 'compras';
    
    const [result] = await pool.execute(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hash, userRole]
    );
    
    res.status(201).json({ message: 'Usuario creado exitosamente', userId: result.insertId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
