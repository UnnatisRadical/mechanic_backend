// Backend/controllers/dashboardController.js
import db from "../db/db.js";

export const getDashboardData = async (req, res) => {
  let connection;
  try {
    const { admin_id } = req.params;
    if (!admin_id) {
      return res.status(400).json({ error: "Admin ID is required" });
    }

    connection = await db.promise().getConnection();

    const [today] = await connection.query(
      `SELECT COALESCE(SUM(total_bill), 0) as total FROM bills WHERE admin_id = ? AND date >= CURDATE()`,
      [admin_id]
    );

    const [yesterday] = await connection.query(
      `SELECT COALESCE(SUM(total_bill), 0) as total FROM bills WHERE admin_id = ? AND date = CURDATE() - INTERVAL 1 DAY`,
      [admin_id]
    );

    const [week] = await connection.query(
      `SELECT COALESCE(SUM(total_bill), 0) as total FROM bills WHERE admin_id = ? AND YEARWEEK(date, 1) = YEARWEEK(CURDATE(), 1)`,
      [admin_id]
    );

    const [month] = await connection.query(
      `SELECT COALESCE(SUM(total_bill), 0) as total FROM bills WHERE admin_id = ? AND YEAR(date) = YEAR(CURDATE()) AND MONTH(date) = MONTH(CURDATE())`,
      [admin_id]
    );

    const [year] = await connection.query(
      `SELECT COALESCE(SUM(total_bill), 0) as total FROM bills WHERE admin_id = ? AND YEAR(date) = YEAR(CURDATE())`,
      [admin_id]
    );

    const [total] = await connection.query(
      `SELECT COALESCE(SUM(total_bill), 0) as total FROM bills WHERE admin_id = ?`,
      [admin_id]
    );

    const [rawServices] = await connection.query(
      `SELECT service_taken FROM bills WHERE admin_id = ?`,
      [admin_id]
    );

    const [activeServices] = await connection.query(
      `SELECT name FROM services WHERE admin_id = ? AND status = 'active'`,
      [admin_id]
    );

    res.json({
      todayEarnings: parseFloat(today[0].total),
      yesterdayEarnings: parseFloat(yesterday[0].total),
      weekEarnings: parseFloat(week[0].total),
      monthEarnings: parseFloat(month[0].total),
      yearEarnings: parseFloat(year[0].total),
      totalEarnings: parseFloat(total[0].total),
      rawServices,
      activeServices,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (connection) connection.release();
  }
};