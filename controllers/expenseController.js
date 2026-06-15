import db from "../db/db.js";

export const addExpense = (req, res) => {
  const {
    adminId,
    payeeName,
    expenseName,
    amount,
    paymentMethod = "Cash",
    status = "Paid",
    description = "",
    date
  } = req.body;

  if (!adminId) {
    return res.status(400).json({
      success: false,
      message: "Admin ID is required"
    });
  }

  if (!payeeName || !expenseName || !amount) {
    return res.status(400).json({
      success: false,
      message: "Payee name, expense name, and amount are required"
    });
  }

  if (isNaN(amount) || Number(amount) <= 0) {
    return res.status(400).json({
      success: false,
      message: "Amount must be a positive number"
    });
  }

  db.query(
    `SELECT * FROM expenses WHERE admin_id = ? AND LOWER(expense_name) = LOWER(?)`,
    [adminId, expenseName],
    (checkError, checkResult) => {
      if (checkError) {
        return res.status(500).json({
          success: false,
          message: "Failed to verify expense name"
        });
      }

      if (checkResult.length > 0) {
        return res.status(400).json({
          success: false,
          message: "An expense with this name already exists"
        });
      }

      db.query(
        `INSERT INTO expenses 
         (admin_id, payee_name, expense_name, amount, payment_method, status, description, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [adminId, payeeName, expenseName, parseFloat(amount), paymentMethod, status, description, date || new Date().toISOString()],
        (error, result) => {
          if (error) {
            return res.status(500).json({
              success: false,
              message: "Failed to save expense"
            });
          }

          db.query(
            `SELECT * FROM expenses WHERE id = ?`,
            [result.insertId],
            (selectError, selectResult) => {
              if (selectError || selectResult.length === 0) {
                return res.status(500).json({
                  success: false,
                  message: "Expense saved but failed to retrieve details"
                });
              }

              res.status(201).json({
                success: true,
                message: "Expense added successfully",
                data: selectResult[0]
              });
            }
          );
        }
      );
    }
  );
};

export const getExpenses = (req, res) => {
  const { adminId, startDate, endDate } = req.query;

  if (!adminId) {
    return res.status(400).json({
      success: false,
      message: "Admin ID is required"
    });
  }

  let query = `SELECT * FROM expenses WHERE admin_id = ?`;
  const params = [adminId];

  if (startDate && endDate) {
    query += ` AND DATE(created_at) BETWEEN ? AND ?`;
    params.push(startDate, endDate);
  }

  query += ` ORDER BY created_at DESC`;

  db.query(
    query,
    params,
    (error, results) => {
      if (error) {
        return res.status(500).json({
          success: false,
          message: "Failed to fetch expenses"
        });
      }

      res.status(200).json({
        success: true,
        data: results
      });
    }
  );
};

export const getExpenseCategories = (req, res) => {
  const categories = [
    "Decor",
    "Electricity",
    "Equipment Maintenance",
    "Furniture",
    "Insurance",
    "Internet",
    "Marketing & Advertising",
    "Phone Bills",
    "Product Purchase",
    "Rent",
    "Software Subscription",
    "Taxes & Permits",
    "Training"
  ];

  res.status(200).json({
    success: true,
    data: categories
  });
};

export const updateExpense = (req, res) => {
  const { id } = req.params;
  
  const { 
    payeeName, 
    expenseName, 
    amount, 
    paymentMethod, 
    status, 
    description, 
    date 
  } = req.body;

  if (!payeeName || !expenseName || amount === undefined || !paymentMethod || !status) {
    return res.status(400).json({
      success: false,
      message: "Required fields are missing: payeeName, expenseName, amount, paymentMethod, and status are mandatory."
    });
  }

  const dbAmount = parseFloat(amount);
  const dbDate = date ? new Date(date).toISOString().slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' ');
  const dbDescription = description || '';

  const sqlQuery = `
    UPDATE expenses 
    SET 
      payee_name = ?, 
      expense_name = ?, 
      amount = ?, 
      payment_method = ?, 
      status = ?, 
      description = ?, 
      created_at = ? 
    WHERE id = ?
  `;

  const queryValues = [
    payeeName, 
    expenseName, 
    dbAmount, 
    paymentMethod, 
    status, 
    dbDescription, 
    dbDate, 
    id
  ];

  db.query(sqlQuery, queryValues, (error, result) => {
    if (error) {
      return res.status(500).json({
        success: false,
        message: `Failed to update expense: ${error.message}`
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Expense record not found or target identifier invalid."
      });
    }

    res.status(200).json({
      success: true,
      message: "Expense updated successfully"
    });
  });
};
export const deleteExpense = (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Expense ID is required"
    });
  }

  db.query(
    `DELETE FROM expenses WHERE id = ?`,
    [id],
    (error, result) => {
      if (error) {
        return res.status(500).json({
          success: false,
          message: "Failed to delete expense"
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Expense not found"
        });
      }

      res.status(200).json({
        success: true,
        message: "Expense deleted successfully"
      });
    }
  );
};
