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

export const getCustomerBills = async (req, res) => {
  try {
    const { admin_id, contact } = req.query;

    if (!admin_id || !contact) {
      return res.status(400).json({ error: "Admin ID and contact are required" });
    }

    const query = `SELECT * FROM bills WHERE admin_id = ? AND contact = ? ORDER BY date DESC`;

    db.query(query, [admin_id, contact], (err, results) => {
      if (err) {
        return res.status(500).json({ error: "Database operation failed", details: err.message });
      }

      const processedResults = results.map(bill => ({
        ...bill,
        customer_email: bill?.customer_email,
        customer_address: bill?.customer_address,
        service_taken: tryParseJSON(bill.service_taken),
        vehicle_details: tryParseJSON(bill.vehicle_details),
        parts_taken: tryParseJSON(bill.parts_taken),
        other_charges: parseFloat(bill.other_charges) || 0,
        discount: parseFloat(bill.discount) || 0,
        total_bill: parseFloat(bill.total_bill) || 0,
        tax_rate: bill.tax_rate ? parseFloat(bill.tax_rate) : null,
        payment_method: bill.payment_method || 'cash'
      }));

      res.json({
        customer_name: results[0]?.customer_name || "",
        contact: contact,
        history: processedResults
      });
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
};

export const getReports = async (req, res) => {
  try {
    const { admin_id } = req.query;

    if (!admin_id) {
      return res.status(400).json({ error: "Admin ID is required" });
    }

    const query = `
      SELECT 
        bill_id, 
        customer_name, 
        contact, 
        service_taken, 
        other_charges, 
        discount,
        total_bill as total_amount, 
        date,
        tax_rate,
        payment_method
      FROM bills
      WHERE admin_id = ?
      ORDER BY date DESC
    `;

    db.query(query, [admin_id], (err, results) => {
      if (err) {
        return res.status(500).json({ error: "Database operation failed", details: err.message });
      }

      const formattedResults = results.map(item => ({
        ...item,
        bill_id: item.bill_id || 0,
        service_taken: tryParseJSON(item.service_taken) || [],
        other_charges: parseFloat(item.other_charges) || 0,
        discount: parseFloat(item.discount) || 0,
        total_amount: parseFloat(item.total_amount) || 0,
        tax_rate: item.tax_rate ? parseFloat(item.tax_rate) : null,
        date: item.date || null,
        payment_method: item.payment_method || 'cash'
      }));

      res.json(formattedResults);
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
};

export const getWorkHistory = async (req, res) => {
  try {
    const { admin_id } = req.query;
    
    if (!admin_id) {
      return res.status(400).json({ error: "Admin ID is required" });
    }

    const query = `SELECT * FROM bills WHERE admin_id = ? ORDER BY date DESC`;

    db.query(query, [admin_id], (err, results) => {
      if (err) {
        return res.status(500).json({ error: "Database operation failed" });
      }

      const formattedResults = results.map(item => ({
        ...item,
        id: item.id || 0,
        customer_name: item.customer_name || "N/A",
        service_taken: tryParseJSON(item.service_taken) || [],
        other_charges: tryParseJSON(item.other_charges) || 0,
        total_with_tax: parseFloat(item.total_with_tax) || 0,
        tax_rate: item.tax_rate ? parseFloat(item.tax_rate) : null,
        date: item.date || null
      }));

      res.json(formattedResults);
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};