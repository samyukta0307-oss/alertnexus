const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const pool = require('./db/pool');
const alertsRouter = require('./routes/alerts');
const incidentsRouter = require('./routes/incidents');
const configRouter = require('./routes/config');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
  let dbStatus = false;
  try {
    const [rows] = await pool.query('SELECT 1 AS ok;');
    dbStatus = rows[0]?.ok === 1;
  } catch (err) {
    console.error('Database health check failed:', err.message);
  }

  res.json({
    status: 'ok',
    db: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/alerts', alertsRouter);
app.use('/api/incidents', incidentsRouter);
app.use('/api/config', configRouter);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[CyberShield Backend] Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
