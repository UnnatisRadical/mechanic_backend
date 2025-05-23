// controllers/workHistoryController.js
import db from "../db/db.js";

function tryParseJSON(jsonString) {
  try {
    if (typeof jsonString === 'string') {
      return JSON.parse(jsonString);
    }
    return jsonString;
  } catch (e) {
    console.error("JSON parse error:", e);
    return [];
  }
}

export const getWorkHistory = async (req, res) => {
  try {
    const { admin_id } = req.query;
    
    if (!admin_id) {
      return res.status(400).json({ error: "Admin ID is required" });
    }

    const query = `
      SELECT 
        bill_id as id,
        customer_name,
        contact,
        service_taken,
        other_charges,
        total_bill as total_with_tax,
        DATE_FORMAT(date, '%Y-%m-%dT%H:%i:%sZ') as date,
        tax_rate
      FROM bills
      WHERE admin_id = ?
      ORDER BY date DESC
    `;

    db.query(query, [admin_id], (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Database operation failed" });
      }

      const formattedResults = results.map(item => ({
        ...item,
        id: item.id || 0,
        customer_name: item.customer_name || "N/A",
        service_taken: tryParseJSON(item.service_taken) || [],
        other_charges: parseFloat(item.other_charges) || 0,
        total_with_tax: parseFloat(item.total_with_tax) || 0,
        tax_rate: item.tax_rate ? parseFloat(item.tax_rate) : null,
        date: item.date || null
      }));

      res.json(formattedResults);
    });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};