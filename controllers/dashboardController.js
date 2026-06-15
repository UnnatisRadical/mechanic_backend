import db from "../db/db.js";

export const getDashboardRevenueTrend = async (req, res) => {
  let connection;
  try {
    const { admin_id } = req.params;
    const { period } = req.query;

    if (!admin_id) {
      return res.status(400).json({ error: "Admin ID is required" });
    }

    connection = await db.promise().getConnection();

    let trendQuery = "";
    let graphDataArray = [0, 0, 0, 0, 0];

    if (period === 'today' || period === 'yesterday') {
      graphDataArray = [0, 0, 0, 0, 0];
      trendQuery = `
        SELECT FLOOR(HOUR(date) / 5) AS interval_index, COALESCE(SUM(total_bill), 0) AS revenue
        FROM bills WHERE admin_id = ? AND date >= ${period === 'today' ? 'CURDATE()' : 'DATE_SUB(CURDATE(), INTERVAL 1 DAY) AND date < CURDATE()'}
        GROUP BY interval_index ORDER BY interval_index ASC`;
    } else if (period === 'thisweek') {
      graphDataArray = [0, 0, 0, 0, 0, 0, 0];
      trendQuery = `
        SELECT WEEKDAY(date) AS interval_index, COALESCE(SUM(total_bill), 0) AS revenue
        FROM bills WHERE admin_id = ? AND YEARWEEK(date, 1) = YEARWEEK(CURDATE(), 1)
        GROUP BY interval_index ORDER BY interval_index ASC`;
    } else if (period === 'thisyear' || period === 'overall') {
      graphDataArray = Array(12).fill(0);
      trendQuery = `
        SELECT MONTH(date) - 1 AS interval_index, COALESCE(SUM(total_bill), 0) AS revenue
        FROM bills WHERE admin_id = ? AND YEAR(date) = YEAR(CURDATE())
        GROUP BY interval_index ORDER BY interval_index ASC`;
    } else {
      trendQuery = `
        SELECT FLOOR((DAYOFMONTH(date) - 1) / 7) AS interval_index, COALESCE(SUM(total_bill), 0) AS revenue
        FROM bills WHERE admin_id = ? AND YEAR(date) = YEAR(CURDATE()) AND MONTH(date) = MONTH(CURDATE())
        GROUP BY interval_index ORDER BY interval_index ASC`;
    }

    const [trendData] = await connection.query(trendQuery, [admin_id]);
    trendData.forEach(row => {
      if (row.interval_index >= 0 && row.interval_index < graphDataArray.length) {
        graphDataArray[row.interval_index] = parseFloat(row.revenue);
      }
    });

    return res.json({ revenueTrendGraph: graphDataArray });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (connection) connection.release();
  }
};

export const getDashboardData = async (req, res) => {
  let connection;
  try {
    const { admin_id } = req.params;
    const { period } = req.query;

    if (!admin_id) {
      return res.status(400).json({ error: "Admin ID is required" });
    }

    connection = await db.promise().getConnection();

    const [metrics] = await connection.query(
      `SELECT 
    COALESCE(SUM(CASE WHEN date >= CURDATE() THEN total_bill ELSE 0 END), 0) as today,
    COALESCE(SUM(CASE WHEN date >= DATE_SUB(CURDATE(), INTERVAL 1 DAY) AND date < CURDATE() THEN total_bill ELSE 0 END), 0) as yesterday,
    COALESCE(SUM(CASE WHEN date >= DATE_SUB(CURDATE(), INTERVAL 2 DAY) AND date < DATE_SUB(CURDATE(), INTERVAL 1 DAY) THEN total_bill ELSE 0 END), 0) as day_before_yesterday,
    COALESCE(SUM(CASE WHEN YEARWEEK(date, 1) = YEARWEEK(CURDATE(), 1) THEN total_bill ELSE 0 END), 0) as week,
    COALESCE(SUM(CASE WHEN YEARWEEK(date, 1) = YEARWEEK(DATE_SUB(CURDATE(), INTERVAL 1 WEEK), 1) THEN total_bill ELSE 0 END), 0) as last_week,
    COALESCE(SUM(CASE WHEN YEAR(date) = YEAR(CURDATE()) AND MONTH(date) = MONTH(CURDATE()) THEN total_bill ELSE 0 END), 0) as month,
    COALESCE(SUM(CASE WHEN YEAR(date) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND MONTH(date) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) THEN total_bill ELSE 0 END), 0) as last_month,
    COALESCE(SUM(CASE WHEN YEAR(date) = YEAR(CURDATE()) THEN total_bill ELSE 0 END), 0) as year,
    COALESCE(SUM(CASE WHEN YEAR(date) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 YEAR)) THEN total_bill ELSE 0 END), 0) as last_year,
    COALESCE(SUM(total_bill), 0) as total,
    
    -- FIXED: Dono lines ka hona zaroori hai taaki niche code crash na ho
    COALESCE(SUM(CASE WHEN balance > 0 THEN balance ELSE 0 END), 0) as pending_payments,
    GROUP_CONCAT(CASE WHEN balance > 0 THEN bill_id END) as pending_invoice_ids,
    
    COUNT(CASE WHEN balance > 0 THEN 1 END) as no_of_pending_payments,
    COUNT(*) as invoice_count
   FROM bills 
   WHERE admin_id = ?`,
      [admin_id]
    );

    const [weeklyTrend] = await connection.query(
      `SELECT 
        FLOOR((DAYOFMONTH(date) - 1) / 7) AS week_number,
        COALESCE(SUM(total_bill), 0) AS weekly_revenue
        FROM bills
        WHERE admin_id = ? AND YEAR(date) = YEAR(CURDATE()) AND MONTH(date) = MONTH(CURDATE())
        GROUP BY week_number ORDER BY week_number ASC`,
      [admin_id]
    );

    const graphDataArray = [0, 0, 0, 0, 0];
    weeklyTrend.forEach(row => {
      if (row.week_number >= 0 && row.week_number < 5) {
        graphDataArray[row.week_number] = parseFloat(row.weekly_revenue);
      }
    });

    let serviceQuery = `SELECT service_taken FROM bills WHERE admin_id = ?`;
    let queryParams = [admin_id];

    if (period === 'today') {
      serviceQuery += ` AND date >= CURDATE()`;
    } else if (period === 'yesterday') {
      serviceQuery += ` AND date >= DATE_SUB(CURDATE(), INTERVAL 1 DAY) AND date < CURDATE()`;
    } else if (period === 'thisweek') {
      serviceQuery += ` AND YEARWEEK(date, 1) = YEARWEEK(CURDATE(), 1)`;
    } else if (period === 'thismonth') {
      serviceQuery += ` AND YEAR(date) = YEAR(CURDATE()) AND MONTH(date) = MONTH(CURDATE())`;
    } else if (period === 'thisyear') {
      serviceQuery += ` AND YEAR(date) = YEAR(CURDATE())`;
    }

    const [rawServices] = await connection.query(serviceQuery, queryParams);
    const [activeServices] = await connection.query(
      `SELECT name FROM services WHERE admin_id = ? AND status = 'active'`,
      [admin_id]
    );

    const [pendingInvoices] = await connection.query(
      `SELECT invoiceid, total_bill, balance FROM bills WHERE admin_id = ? AND balance > 0`,
      [admin_id]
    );

    const data = metrics[0];

    const pendingInvoiceIdsArray = data.pending_invoice_ids
      ? data.pending_invoice_ids.split(',').map(id => parseInt(id, 10))
      : [];

    res.json({
      todayEarnings: parseFloat(data.today),
      yesterdayEarnings: parseFloat(data.yesterday),
      dayBeforeYesterdayEarnings: parseFloat(data.day_before_yesterday),
      weekEarnings: parseFloat(data.week),
      lastWeekEarnings: parseFloat(data.last_week),
      monthEarnings: parseFloat(data.month),
      lastMonthEarnings: parseFloat(data.last_month),
      yearEarnings: parseFloat(data.year),
      lastYearEarnings: parseFloat(data.last_year),
      totalEarnings: parseFloat(data.total),
      pendingPayments: parseFloat(data.pending_payments),
      pendingInvoiceIds: pendingInvoiceIdsArray,
      noofPendingPayments: parseInt(data.no_of_pending_payments || 0, 10),
      rawServices,
      activeServices,
      pendingInvoices,
      invoiceCount: data.invoice_count,
      lastUpdated: new Date().toISOString(),
      monthlyTrendGraph: graphDataArray
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (connection) connection.release();
  }
};