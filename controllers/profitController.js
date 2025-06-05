// Updated profitController.js
import db from "../db/db.js";

const calculateProfit = (req, res) => {
  const { adminId, startDate, endDate, range } = req.query;

  if (!adminId || !startDate || !endDate) {
    return res.status(400).json({ 
      success: false, 
      message: "Admin ID, start date, and end date are required" 
    });
  }


  // Fetch expenses for the date range
  const startOfStartDate = new Date(`${startDate}T00:00:00.000Z`);
  const endOfEndDate = new Date(`${endDate}T23:59:59.999Z`);
  const startOfStartDateLocal = startOfStartDate.toISOString().slice(0, 19).replace('T', ' ');
  const endOfEndDateLocal = endOfEndDate.toISOString().slice(0, 19).replace('T', ' ');


  db.query(
    `SELECT SUM(amount) as totalExpenses 
     FROM expenses 
     WHERE admin_id = ? AND created_at BETWEEN ? AND ?`,
    [adminId, startOfStartDateLocal, endOfEndDateLocal],
    (error, expenseResults) => {
      if (error) {
        console.error("Error fetching expenses:", error);
        return res.status(500).json({ 
          success: false, 
          message: "Failed to fetch expenses" 
        });
      }

      
      const totalExpenses = parseFloat(expenseResults[0].totalExpenses || 0);
    

      // Fetch bills for the date range (income)
      const startOfStartDateIST = new Date(startOfStartDate.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
      const endOfEndDateIST = new Date(endOfEndDate.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

      db.query(
        `SELECT SUM(total_bill) as totalIncome 
         FROM bills 
         WHERE admin_id = ? AND date BETWEEN ? AND ?`,
        [adminId, startOfStartDateIST, endOfEndDateIST],
        (billError, billResults) => {
          if (billError) {
            console.error("Error fetching bills:", billError);
            return res.status(500).json({ 
              success: false, 
              message: "Failed to fetch bills" 
            });
          }

          
          const totalIncome = parseFloat(billResults[0].totalIncome || 0);
        
          const profit = totalIncome - totalExpenses;

          res.status(200).json({
            success: true,
            data: {
              profit,
              expenses: totalExpenses,
              income: totalIncome,
            },
          });
        }
      );
    }
  );
};

const getFinanceSummary = (req, res) => {
  const { adminId, startDate, endDate } = req.query;

  if (!adminId || !startDate || !endDate) {
    return res.status(400).json({ 
      success: false, 
      message: "Admin ID, start date, and end date are required" 
    });
  }

  

  // Fetch expenses for the date range
  const startOfStartDate = new Date(`${startDate}T00:00:00.000Z`);
  const endOfEndDate = new Date(`${endDate}T23:59:59.999Z`);
  const startOfStartDateLocal = startOfStartDate.toISOString().slice(0, 19).replace('T', ' ');
  const endOfEndDateLocal = endOfEndDate.toISOString().slice(0, 19).replace('T', ' ');



  db.query(
    `SELECT SUM(amount) as totalExpenses 
     FROM expenses 
     WHERE admin_id = ? AND created_at BETWEEN ? AND ?`,
    [adminId, startOfStartDateLocal, endOfEndDateLocal],
    (error, expenseResults) => {
      if (error) {
        console.error("Error fetching expenses:", error);
        return res.status(500).json({ 
          success: false, 
          message: "Failed to fetch expenses" 
        });
      }

      const totalExpenses = parseFloat(expenseResults[0].totalExpenses || 0);

      const startOfStartDateIST = new Date(startOfStartDate.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
      const endOfEndDateIST = new Date(endOfEndDate.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

      db.query(
        `SELECT SUM(total_bill) as totalIncome 
         FROM bills 
         WHERE admin_id = ? AND date BETWEEN ? AND ?`,
        [adminId, startOfStartDateIST, endOfEndDateIST],
        (billError, billResults) => {
          if (billError) {
            console.error("Error fetching bills:", billError);
            return res.status(500).json({ 
              success: false, 
              message: "Failed to fetch bills" 
            });
          }

          const totalIncome = parseFloat(billResults[0].totalIncome || 0);
          const netBalance = totalIncome - totalExpenses;

          // Fetch all expenses with details
          db.query(
            `SELECT 
              id,
              expense_name as name, 
              amount as expense,
              DATE(created_at) AS date
             FROM expenses 
             WHERE admin_id = ? AND created_at BETWEEN ? AND ?
             ORDER BY created_at DESC`,
            [adminId, startOfStartDateLocal, endOfEndDateLocal],
            (detailExpenseError, expenseDetails) => {
              if (detailExpenseError) {
                console.error("Error fetching detailed expenses:", detailExpenseError);
                return res.status(500).json({ 
                  success: false, 
                  message: "Failed to fetch detailed expenses" 
                });
              }

              // Fetch all customers with their bill totals
              db.query(
                `SELECT 
                  bill_id,
                  customer_name as name, 
                  SUM(total_bill) as income,
                  DATE(date) AS date
                 FROM bills 
                 WHERE admin_id = ? AND date BETWEEN ? AND ?
                 GROUP BY customer_name, DATE(date)
                 ORDER BY date DESC`,
                [adminId, startOfStartDateIST, endOfEndDateIST],
                (detailBillError, incomeDetails) => {
                  if (detailBillError) {
                    console.error("Error fetching detailed bills:", detailBillError);
                    return res.status(500).json({ 
                      success: false, 
                      message: "Failed to fetch detailed bills" 
                    });
                  }

                  // Combine expense and income details
                  const combinedDetails = [
                    // Expense details
                    ...expenseDetails.map(item => ({
                      id: item.id,
                      name: item.name,
                      expense: parseFloat(item.expense) || 0,
                      income: 0,
                      date: item.date,
                      isExpense: true
                    })),
                    // Income details
                    ...incomeDetails.map(item => ({
                      id: item.bill_id,
                      name: item.name,
                      expense: 0,
                      income: parseFloat(item.income) || 0,
                      date: item.date,
                      isIncome: true
                    }))
                  ];

                  // Sort combined details by date in descending order
                  combinedDetails.sort((a, b) => {
                    const dateA = new Date(a.date);
                    const dateB = new Date(b.date);
                    return dateB - dateA; // Descending order
                  });

                  // Format the data for the table
                  const tableData = [
                    // Total row
                    {
                      id: 'total',
                      name: 'TOTAL',
                      expense: totalExpenses,
                      income: totalIncome,
                      date: null,
                      isTotal: true
                    },
                    // Sorted combined details
                    ...combinedDetails
                  ];

                  res.status(200).json({
                    success: true,
                    data: {
                      netBalance,
                      expenses: totalExpenses,
                      income: totalIncome,
                      details: tableData,
                    },
                  });
                }
              );
            }
          );
        }
      );
    }
  );
};
export default {
  calculateProfit,
  getFinanceSummary,
};