import db from "../db/db.js";

const calculateProfit = (req, res) => {
  const { adminId, startDate, endDate, range, deletedInvoices } = req.query;

  if (!adminId || !startDate || !endDate) {
    return res.status(400).json({ success: false, message: "Admin ID, start date, and end date are required" });
  }

  let excludedInvoiceIds = [];
  if (deletedInvoices) {
    try {
      const parsedTrash = JSON.parse(deletedInvoices);
      excludedInvoiceIds = parsedTrash.map(trash => Number(trash.bill_id || trash.invoiceid || trash));
    } catch (e) {
      console.error("Trash parsing error:", e);
    }
  }

  const startOfStartDate = new Date(`${startDate}T00:00:00.000Z`);
  const endOfEndDate = new Date(`${endDate}T23:59:59.999Z`);
  const startOfStartDateLocal = startOfStartDate.toISOString().slice(0, 19).replace('T', ' ');
  const endOfEndDateLocal = endOfEndDate.toISOString().slice(0, 19).replace('T', ' ');

  db.query(
    `SELECT SUM(amount) as totalExpenses FROM expenses WHERE admin_id = ? AND created_at BETWEEN ? AND ?`,
    [adminId, startOfStartDateLocal, endOfEndDateLocal],
    (error, expenseResults) => {
      if (error) return res.status(500).json({ success: false, message: "Failed to fetch expenses" });

      const totalExpenses = parseFloat(expenseResults[0].totalExpenses || 0);

      const startOfStartDateIST = new Date(startOfStartDate.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
      const endOfEndDateIST = new Date(endOfEndDate.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

      let billQuery = `SELECT SUM(total_bill) as totalIncome FROM bills WHERE admin_id = ? AND date BETWEEN ? AND ?`;
      let queryParams = [adminId, startOfStartDateIST, endOfEndDateIST];

      if (excludedInvoiceIds.length > 0) {
        billQuery += ` AND bill_id NOT IN (?) AND invoiceid NOT IN (?)`;
        queryParams.push(excludedInvoiceIds, excludedInvoiceIds);
      }

      db.query(billQuery, queryParams, (billError, billResults) => {
        if (billError) return res.status(500).json({ success: false, message: "Failed to fetch bills" });

        const totalIncome = parseFloat(billResults[0].totalIncome || 0);
        const profit = totalIncome - totalExpenses;

        res.status(200).json({
          success: true,
          data: { profit, expenses: totalExpenses, income: totalIncome },
        });
      });
    }
  );
};

const getFinanceSummary = (req, res) => {
  const { adminId, startDate, endDate, deletedInvoices } = req.query;

  if (!adminId || !startDate || !endDate) {
    return res.status(400).json({ success: false, message: "Admin ID, start date, and end date are required" });
  }

  let excludedInvoiceIds = [];
  if (deletedInvoices) {
    try {
      const parsedTrash = JSON.parse(deletedInvoices);
      excludedInvoiceIds = parsedTrash.map(trash => Number(trash.bill_id || trash.invoiceid || trash));
    } catch (e) {
      console.error("Trash parsing error:", e);
    }
  }

  const startOfStartDate = new Date(`${startDate}T00:00:00.000Z`);
  const endOfEndDate = new Date(`${endDate}T23:59:59.999Z`);
  const startOfStartDateLocal = startOfStartDate.toISOString().slice(0, 19).replace('T', ' ');
  const endOfEndDateLocal = endOfEndDate.toISOString().slice(0, 19).replace('T', ' ');

  db.query(
    `SELECT SUM(amount) as totalExpenses FROM expenses WHERE admin_id = ? AND created_at BETWEEN ? AND ?`,
    [adminId, startOfStartDateLocal, endOfEndDateLocal],
    (error, expenseResults) => {
      if (error) return res.status(500).json({ success: false, message: "Failed to fetch expenses" });

      const totalExpenses = parseFloat(expenseResults[0].totalExpenses || 0);

      const startOfStartDateIST = new Date(startOfStartDate.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
      const endOfEndDateIST = new Date(endOfEndDate.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

      let billQuery = `SELECT SUM(total_bill) as totalIncome FROM bills WHERE admin_id = ? AND date BETWEEN ? AND ?`;
      let queryParams = [adminId, startOfStartDateIST, endOfEndDateIST];

      if (excludedInvoiceIds.length > 0) {
        billQuery += ` AND bill_id NOT IN (?) AND invoiceid NOT IN (?)`;
        queryParams.push(excludedInvoiceIds, excludedInvoiceIds);
      }

      db.query(billQuery, queryParams, (billError, billResults) => {
        if (billError) return res.status(500).json({ success: false, message: "Failed to fetch bills" });

        const totalIncome = parseFloat(billResults[0].totalIncome || 0);
        const netBalance = totalIncome - totalExpenses;

        db.query(
          `SELECT id, expense_name as name, amount as expense, DATE(created_at) AS date FROM expenses WHERE admin_id = ? AND created_at BETWEEN ? AND ? ORDER BY created_at DESC`,
          [adminId, startOfStartDateLocal, endOfEndDateLocal],
          (detailExpenseError, expenseDetails) => {
            if (detailExpenseError) return res.status(500).json({ success: false, message: "Failed to fetch detailed expenses" });

            let detailedBillQuery = `SELECT bill_id, customer_name as name, SUM(total_bill) as income, DATE(date) AS date FROM bills WHERE admin_id = ? AND date BETWEEN ? AND ?`;
            let detailedBillParams = [adminId, startOfStartDateIST, endOfEndDateIST];

            if (excludedInvoiceIds.length > 0) {
              detailedBillQuery += ` AND bill_id NOT IN (?) AND invoiceid NOT IN (?)`;
              detailedBillParams.push(excludedInvoiceIds, excludedInvoiceIds);
            }
            detailedBillQuery += ` GROUP BY customer_name, DATE(date) ORDER BY date DESC`;

            db.query(detailedBillQuery, detailedBillParams, (detailBillError, incomeDetails) => {
              if (detailBillError) return res.status(500).json({ success: false, message: "Failed to fetch detailed bills" });

              const combinedDetails = [
                ...expenseDetails.map(item => ({
                  id: item.id, name: item.name, expense: parseFloat(item.expense) || 0, income: 0, date: item.date, isExpense: true
                })),
                ...incomeDetails.map(item => ({
                  id: item.bill_id, name: item.name, expense: 0, income: parseFloat(item.income) || 0, date: item.date, isIncome: true
                }))
              ];

              combinedDetails.sort((a, b) => new Date(b.date) - new Date(a.date));

              const tableData = [
                { id: 'total', name: 'TOTAL', expense: totalExpenses, income: totalIncome, date: null, isTotal: true },
                ...combinedDetails
              ];

              res.status(200).json({
                success: true,
                data: { netBalance, expenses: totalExpenses, income: totalIncome, details: tableData },
              });
            });
          }
        );
      });
    }
  );
};

export default { calculateProfit, getFinanceSummary };