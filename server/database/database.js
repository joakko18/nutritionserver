const { Pool } = require('pg');

// Create a PostgreSQL connection pool
const pool = new Pool({
  user: 'postgres',
  host: 'monorail.proxy.rlwy.net',
  database: 'railway',
  password: 'DBbcb*Ge246CF525Cc6Gg5a6eE365CD1',
  port: 58971, // Your PostgreSQL port (default is 5432)
});

// Catch errors during pool creation
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1); // Exit the process with an error code
});

// Listen for the 'connect' event to confirm successful connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

// Attempt to connect to the database
pool.connect((err, client, done) => {
  if (err) {
    console.error('Error connecting to PostgreSQL database:', err);
    process.exit(-1); // Exit the process with an error code
  }
  console.log('Successfully connected to PostgreSQL database');
  // Release the client back to the pool
  done();
});

module.exports = pool;

