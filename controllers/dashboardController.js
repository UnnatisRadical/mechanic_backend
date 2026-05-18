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

    const [total] = await connection.query(
      `SELECT COALESCE(SUM(total_bill), 0) as total FROM bills WHERE admin_id = ?`,
      [admin_id]
    );

    const [pending] = await connection.query(
      `SELECT COALESCE(SUM(balance), 0) as total_pending FROM bills WHERE admin_id = ?`,
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

    const [invoiceResult] = await connection.query(
      "SELECT COUNT(*) as count FROM bills WHERE admin_id = ?", 
      [admin_id]
    );

    res.json({
      todayEarnings: parseFloat(today[0].total),
      totalEarnings: parseFloat(total[0].total),
      pendingPayments: parseFloat(pending[0].total_pending),
      rawServices,
      activeServices,
      invoiceCount: invoiceResult[0].count,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (connection) connection.release();
  }
};