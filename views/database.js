// database.js
const sqlite3 = require('sqlite3').verbose();

// Create an in-memory database
const db = new sqlite3.Database(':memory:', (err) => {
  if (err) {
    console.error('Error connecting to the database:', err.message);
  } else {
    console.log('Connected to the in-memory SQLite database.');
  }
});

// Initialize the database with tables and default data
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT,
      role TEXT,
      verified BOOLEAN DEFAULT 0,
      verificationFile TEXT
    )
  `, (err) => {
    if (err) {
      console.error('Error creating users table:', err.message);
    } else {
      console.log('Users table created or already exists.');
    }
  });

  const defaultUser = {
    name: 'Srihesh',
    email: 'srihesh@gm.com',
    password: 'Srih@12345',
    role: 'user',
    verified: true
  };

  const adminUser = {
    name: 'Admin',
    email: 'admin@admin.com',
    password: 'Admin@12345',
    role: 'admin',
    verified: true
  };

  

  db.run(`
    INSERT OR IGNORE INTO users (name, email, password, role, verified)
    VALUES (?, ?, ?, ?, ?)
  `, [defaultUser.name, defaultUser.email, defaultUser.password, defaultUser.role, defaultUser.verified], (err) => {
    if (err) {
      console.error('Error inserting default user:', err.message);
    } else {
      console.log('Default user inserted or already exists.');
    }
  });

  db.run(`
    INSERT OR IGNORE INTO users (name, email, password, role, verified)
    VALUES (?, ?, ?, ?, ?)
  `, [adminUser.name, adminUser.email, adminUser.password, adminUser.role, adminUser.verified], (err) => {
    if (err) {
      console.error('Error inserting admin user:', err.message);
    } else {
      console.log('Admin user inserted or already exists.');
    }
  });
});

// Handle application exit
process.on('exit', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing the database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
  });
});

module.exports = db;

// Add this function to your database.js file
function viewUsers() {
  db.all('SELECT * FROM users', (err, rows) => {
    if (err) {
      console.error('Error querying users:', err.message);
    } else {
      console.log('Users in the database:');
      console.table(rows); // Use console.table for a formatted output
    }
  });
}

// Call the function to view users
viewUsers();