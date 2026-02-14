const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PIN = process.env.ADMIN_PIN || 'otrasemanamiseñor';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Base de datos ---
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'liturgia.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS asignaciones (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    dia   TEXT NOT NULL,
    hora  TEXT NOT NULL,
    servicio TEXT NOT NULL,
    nombre   TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    UNIQUE(dia, hora, servicio)
  )
`);

// --- API ---

// GET /api/asignaciones — devuelve todas las asignaciones
app.get('/api/asignaciones', (req, res) => {
  const rows = db.prepare('SELECT dia, hora, servicio, nombre FROM asignaciones').all();
  res.json(rows);
});

// POST /api/asignar — registra un servidor litúrgico
app.post('/api/asignar', (req, res) => {
  const { dia, hora, servicio, nombre } = req.body;

  if (!dia || !hora || !servicio || !nombre) {
    return res.status(400).json({ status: 'error', message: 'Faltan campos requeridos.' });
  }

  const trimmed = nombre.trim();
  if (trimmed.length < 2 || trimmed.length > 100) {
    return res.status(400).json({ status: 'error', message: 'El nombre debe tener entre 2 y 100 caracteres.' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO asignaciones (dia, hora, servicio, nombre)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(dia, hora, servicio) DO UPDATE SET nombre = excluded.nombre, created_at = datetime('now','localtime')
    `);
    stmt.run(dia, hora, servicio, trimmed);
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Error al guardar la asignación.' });
  }
});

// POST /api/limpiar — limpia la tabla (requiere PIN)
app.post('/api/limpiar', (req, res) => {
  const { pin } = req.body;

  if (pin !== ADMIN_PIN) {
    return res.status(403).json({ status: 'error', message: 'Clave incorrecta.' });
  }

  try {
    db.prepare('DELETE FROM asignaciones').run();
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Error al limpiar la tabla.' });
  }
});

// Fallback: servir index.html para cualquier ruta no-API
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Graceful shutdown: checkpoint WAL y cerrar DB ---
function shutdown() {
  console.log('Cerrando servidor...');
  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
    db.close();
    console.log('Base de datos cerrada correctamente.');
  } catch (err) {
    console.error('Error al cerrar la DB:', err.message);
  }
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

app.listen(PORT, () => {
  console.log(`Servidor litúrgico corriendo en http://localhost:${PORT}`);
});
