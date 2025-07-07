// src/index.js (formerly server.js)
const express = require('express');
const { Pool } = require('pg');
const app = express();
const port = 3000;

app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  // ssl: { rejectUnauthorized: false } // Only if strictly necessary for local setup
});

pool.connect()
  .then(client => {
    console.log('Connected to PostgreSQL database!');
    return client.query(`
      CREATE TABLE IF NOT EXISTS test_items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `).then(() => {
      client.release();
      console.log('Table "test_items" checked/created.');
    }).catch(err => {
      client.release();
      console.error('Error creating table:', err.message);
    });
  })
  .catch(err => {
    console.error('Failed to connect to PostgreSQL:', err.message);
    process.exit(1);
  });

app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    res.send(`Hello from the Node.js app! Current DB time: ${result.rows[0].current_time}`);
  } catch (err) {
    console.error('Error fetching time:', err.message);
    res.status(500).send('Error connecting to database');
  }
});

app.get('/items', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM test_items ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching items:', err.message);
    res.status(500).send('Error fetching items from database');
  }
});

app.post('/items', async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).send('Item name is required in the request body.');
  }
  try {
    const result = await pool.query('INSERT INTO test_items (name) VALUES ($1) RETURNING *', [name]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding item:', err.message);
    res.status(500).send('Error adding item to database');
  }
});

app.listen(port, () => {
  console.log(`Node.js app listening at http://localhost:${port}`);
});
#triggering CI/CD for testing github actions
#another comment
