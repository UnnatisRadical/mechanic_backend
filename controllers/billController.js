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

export const createBill = async (req, res) => {
  try {
    let { admin_id, customer_name, contact, service_taken, other_charges, discount, total_bill, date, tax_details, payment_method } = req.body;
    
    // Validation
    if (!admin_id || !customer_name || !contact || !service_taken || service_taken.length === 0) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (typeof other_charges !== 'number' || other_charges < 0) {
      return res.status(400).json({ error: "Invalid other charges" });
    }
    if (typeof discount !== 'number' || discount < 0) {
      return res.status(400).json({ error: "Invalid discount" });
    }
    if (typeof total_bill !== 'number' || total_bill < 0) {
      return res.status(400).json({ error: "Invalid total bill" });
    }
    if (!date || isNaN(new Date(date))) {
      return res.status(400).json({ error: "Invalid date" });
    }
    if (!['cash', 'e-transfer'].includes(payment_method)) {
      return res.status(400).json({ error: "Invalid payment method" });
    }

    // Validate discount
    const serviceTotal = service_taken.reduce((sum, service) => sum + parseFloat(service.price || 0), 0);
    const subtotalBeforeTax = serviceTotal + other_charges - discount;
    if (subtotalBeforeTax < 0) {
      return res.status(400).json({ error: "Discount cannot exceed service total plus other charges" });
    }

    const tax_rate = tax_details?.wasTaxApplied ? parseFloat(tax_details?.taxRate) || 0 : null;

    const utcDate = new Date(date);
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(utcDate.getTime() + istOffset);
    date = istDate.toISOString().slice(0, 19).replace("T", " ");

    const serviceTakenFormatted = JSON.stringify(service_taken);

    const query = `
      INSERT INTO bills 
        (admin_id, customer_name, contact, service_taken, other_charges, discount, total_bill, date, tax_rate, payment_method)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      admin_id, 
      customer_name, 
      contact, 
      serviceTakenFormatted, 
      other_charges, 
      discount, 
      total_bill, 
      date,
      tax_rate,
      payment_method
    ];

    db.query(query, values, (err, result) => {
      if (err) {
        console.error("DB Insert Error:", err);
        return res.status(500).json({ error: "Database insert failed", details: err });
      }
      res.status(201).json({ 
        message: "Bill created successfully", 
        bill_id: result.insertId 
      });
    });
  } catch (error) {
    console.error("Error creating bill:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getActiveServices = (req, res) => {
  const { admin_id } = req.params;
  db.query("SELECT * FROM services WHERE admin_id = ? AND status = 'active'", [admin_id], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
};

export const getPreviousCustomers = (req, res) => {
  const { admin_id } = req.params;
  db.query("SELECT DISTINCT customer_name, contact FROM bills WHERE admin_id = ?", [admin_id], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
};

export const updateBill = async (req, res) => {
  try {
    const { bill_id } = req.params;
    let { admin_id, customer_name, contact, service_taken, other_charges, discount, total_bill, tax_rate, payment_method } = req.body;
    
    // Validation
    if (!admin_id || !customer_name || !contact || !service_taken || service_taken.length === 0) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (typeof other_charges !== 'number' || other_charges < 0) {
      return res.status(400).json({ error: "Invalid other charges" });
    }
    if (typeof discount !== 'number' || discount < 0) {
      return res.status(400).json({ error: "Invalid discount" });
    }
    if (typeof total_bill !== 'number' || total_bill < 0) {
      return res.status(400).json({ error: "Invalid total bill" });
    }
    if (!['cash', 'e-transfer'].includes(payment_method)) {
      return res.status(400).json({ error: "Invalid payment method" });
    }
    if (!Array.isArray(service_taken)) {
      return res.status(400).json({ error: "service_taken must be an array" });
    }

    // Validate discount
    const serviceTotal = service_taken.reduce((sum, service) => sum + parseFloat(service.price || 0), 0);
    const subtotalBeforeTax = serviceTotal + other_charges - discount;
    if (subtotalBeforeTax < 0) {
      return res.status(400).json({ error: "Discount cannot exceed service total plus other charges" });
    }

    const serviceTakenFormatted = JSON.stringify(service_taken);

    const query = `
      UPDATE bills 
      SET 
        customer_name = ?, 
        contact = ?, 
        service_taken = ?, 
        other_charges = ?, 
        discount = ?,
        total_bill = ?,
        tax_rate = ?,
        payment_method = ?,
        date = COALESCE(?, date)  /* Preserve existing date if not provided */
      WHERE bill_id = ? AND admin_id = ?
    `;

    const date = req.body.date ? new Date(req.body.date).toISOString().slice(0, 19).replace('T', ' ') : null;

    const values = [
      customer_name, 
      contact, 
      serviceTakenFormatted, 
      other_charges, 
      discount, 
      total_bill,
      tax_rate || null,  // Store as NULL if not provided
      payment_method,    // Add payment_method to values
      date,
      bill_id, 
      admin_id
    ];

    db.query(query, values, (err, result) => {
      if (err) {
        console.error("DB Update Error:", err);
        return res.status(500).json({ error: "Database update failed", details: err });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Bill not found or unauthorized" });
      }
      
      // Return the updated bill data
      const getUpdatedBill = `
        SELECT * FROM bills WHERE bill_id = ?
      `;
      db.query(getUpdatedBill, [bill_id], (err, updatedResults) => {
        if (err) {
          console.error("DB Fetch Error:", err);
          return res.status(200).json({ message: "Bill updated successfully" });
        }
        
        const updatedBill = updatedResults[0];
        updatedBill.service_taken = tryParseJSON(updatedBill.service_taken);
        
        res.status(200).json({ 
          message: "Bill updated successfully",
          bill: updatedBill 
        });
      });
    });
  } catch (error) {
    console.error("Error updating bill:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const updateCustomerDetails = async (req, res) => {
  const { admin_id, old_contact, new_contact, customer_name } = req.body;

  console.log("Received update request with:", {
    admin_id,
    old_contact,
    new_contact,
    customer_name
  });

  const query = `
    UPDATE bills 
    SET customer_name = ?, contact = ?
    WHERE admin_id = ? AND contact = ?
  `;

  db.query(query, 
    [customer_name, new_contact, admin_id, old_contact],
    (err, result) => {
      console.log("Update result:", { err, result });
      
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Database operation failed" });
      }
      
      res.json({ 
        success: true, 
        updated: result.affectedRows 
      });
    }
  );
};

export const deleteBill = async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_id } = req.body;

    if (!admin_id) {
      return res.status(400).json({ error: "Admin ID is required" });
    }

    const query = `
      DELETE FROM bills 
      WHERE bill_id = ? AND admin_id = ?
    `;

    db.query(query, [id, admin_id], (err, result) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Database operation failed" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Bill not found or unauthorized" });
      }

      res.json({ message: "Bill deleted successfully" });
    });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getWorkHistory = async (req, res) => {
  try {
    const { admin_id } = req.query;

    const query = `
      SELECT 
        id AS bill_id, 
        customer_name, 
        date, 
        service_taken, 
        total_bill AS total_with_tax
      FROM bills 
      WHERE admin_id = ?
    `;

    db.query(query, [admin_id], (err, results) => {
      if (err) {
        console.error("DB Query Error:", err);
        return res.status(500).json({ error: "Database query failed", details: err });
      }

      console.log("WorkHistory query results:", JSON.stringify(results, null, 2));
      const bills = results.map(bill => ({
        ...bill,
        service_taken: tryParseJSON(bill.service_taken),
      }));

      res.status(200).json(bills);
    });
  } catch (error) {
    console.error("Error fetching work history:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getBillById = async (req, res) => {
  try {
    const { bill_id } = req.params;

    const query = `
      SELECT 
        bill_id, 
        admin_id, 
        customer_name, 
        contact, 
        service_taken, 
        other_charges, 
        discount, 
        total_bill, 
        date, 
        tax_rate,
        payment_method
      FROM bills 
      WHERE bill_id = ?
    `;

    db.query(query, [bill_id], (err, results) => {
      if (err) {
        console.error("DB Query Error:", err);
        return res.status(500).json({ error: "Database query failed", details: err });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: "Bill not found" });
      }

      const bill = results[0];
      bill.service_taken = tryParseJSON(bill.service_taken);
      
      if (bill.date) {
        bill.date = new Date(bill.date).toISOString();
      }

      res.status(200).json(bill);
    });
  } catch (error) {
    console.error("Error fetching bill:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};