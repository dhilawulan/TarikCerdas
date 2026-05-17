const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'game_db'
});

db.connect((err) => {
  if (err) throw err;
  console.log('Database Connected');
});

module.exports = db;