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

  // Check if expense name already exists (case-insensitive)
  db.query(
    `SELECT * FROM expenses WHERE admin_id = ? AND LOWER(expense_name) = LOWER(?)`,
    [adminId, expenseName],
    (checkError, checkResult) => {
      if (checkError) {
        console.error("Error checking expense name:", checkError);
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

      // Proceed with inserting the new expense
      db.query(
        `INSERT INTO expenses 
         (admin_id, payee_name, expense_name, amount, payment_method, status, description, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [adminId, payeeName, expenseName, parseFloat(amount), paymentMethod, status, description, date || new Date().toISOString()],
        (error, result) => {
          if (error) {
            console.error("Expense save error:", error);
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
                console.error("Error fetching new expense:", selectError);
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

  // Add date filtering if provided
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
        console.error("Database error:", error);
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
  const { expenseName } = req.body;

  if (!expenseName) {
    return res.status(400).json({ 
      success: false, 
      message: "Expense name is required" 
    });
  }

  db.query(
    `UPDATE expenses SET expense_name = ? WHERE id = ?`,
    [expenseName, id],
    (error, result) => {
      if (error) {
        console.error("Expense update error:", error);
        return res.status(500).json({ 
          success: false, 
          message: `Failed to update expense: ${error.message}` 
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
        message: "Expense updated successfully"
      });
    }
  );
};