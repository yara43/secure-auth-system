const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./auth_system.db", (err) => {
  if (err) {
    console.error("Database error:", err.message);
  } else {
    console.log("Connected to SQLite database");
  }
});

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('Admin', 'Manager', 'User')),
    two_factor_secret TEXT NOT NULL
  )
`);

module.exports = db;