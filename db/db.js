import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

// const db = mysql.createPool({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   port: process.env.DB_PORT,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   waitForConnections: true,
//   connectionLimit: 10, 
//   queueLimit: 0
// });

const db = mysql.createPool({
  host: '193.203.166.175',
  user: 'u632893350_mechanic',
  port: '3306',
  password: "Mechanic@1234##12#",
  database: 'u632893350_mechanic',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

db.getConnection((err, connection) => {
  if (err) {
    console.error("Database connection failed:", err);
  } else {
    console.log("Connected to MySQL database");
    connection.release(); 
  }
});

export default db;
