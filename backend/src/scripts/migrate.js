const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'cybershield';

async function runMigrations() {
  console.log('--- Starting Database Migration ---');
  console.log(`Connecting to MySQL server at ${DB_HOST}:${DB_PORT} as ${DB_USER}...`);

  // Step 1: Ensure database exists
  const serverConn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD
  });

  await serverConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  console.log(`Database '${DB_NAME}' ensured.`);
  await serverConn.end();

  // Step 2: Connect to the target database
  const dbConn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    multipleStatements: true
  });

  // Step 3: Ensure schema_migrations table exists
  await dbConn.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      migration_name VARCHAR(255) NOT NULL UNIQUE,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Step 4: Get already applied migrations
  const [rows] = await dbConn.query('SELECT migration_name FROM schema_migrations;');
  const appliedMigrations = new Set(rows.map(r => r.migration_name));

  // Step 5: Read migration files in order
  const migrationsDir = path.resolve(__dirname, '../../migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.error(`Migrations directory not found: ${migrationsDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration file(s).`);

  let appliedCount = 0;
  for (const file of files) {
    if (appliedMigrations.has(file)) {
      console.log(`[SKIPPED] ${file} (already applied)`);
      continue;
    }

    console.log(`[APPLYING] ${file}...`);
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    await dbConn.query(sql);
    await dbConn.query('INSERT INTO schema_migrations (migration_name) VALUES (?);', [file]);
    console.log(`[APPLIED] ${file} successfully.`);
    appliedCount++;
  }

  await dbConn.end();
  console.log(`--- Migrations Complete: ${appliedCount} newly applied, ${files.length - appliedCount} previously applied ---`);
}

runMigrations().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

