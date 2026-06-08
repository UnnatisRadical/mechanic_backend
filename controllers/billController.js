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
    let {
      admin_id, custId, customer_name, contact, customer_email, customer_address, vehicle_details, service_taken, parts_taken, other_charges, discount, received, total_bill, date, due_date, tax_details, payment_status, payment_method
    } = req.body;

    if (!admin_id || !customer_name || !contact || (service_taken.length === 0 && parts_taken.length === 0)) {
      return res.status(400).json({ error: "Missing required fields. Customer details and items are required." });
    }
    if (typeof vehicle_details === 'object' && Object.keys(vehicle_details).length === 0) {
      return res.status(400).json({ error: "Vehicle details cannot be empty." });
    }

    if (!Array.isArray(other_charges)) {
      return res.status(400).json({ error: "Invalid other charges format. Expected an array." });
    }

    if (typeof discount !== 'number' || discount < 0) return res.status(400).json({ error: "Invalid discount" });
    if (typeof received !== 'number' || received < 0) return res.status(400).json({ error: "Invalid received amount" });
    if (typeof total_bill !== 'number' || total_bill < 0) return res.status(400).json({ error: "Invalid total bill" });
    if (!date || isNaN(new Date(date))) return res.status(400).json({ error: "Invalid date" });
    if (!['unpaid', 'partial', 'paid'].includes(payment_status)) return res.status(400).json({ error: "Invalid payment status" });

    if (['paid', 'partial'].includes(payment_status)) {
      if (!['cash', 'online'].includes(payment_method)) {
        return res.status(400).json({ error: "Payment method is required and must be 'cash' or 'online' for paid/partial status." });
      }
    } else {
      payment_method = null;
    }

    if (['unpaid', 'partial'].includes(payment_status)) {
      if (!due_date || isNaN(new Date(due_date))) {
        return res.status(400).json({ error: "Due date is required and must be a valid date for unpaid or partial payments." });
      }

      const parsedDueDate = new Date(due_date);
      due_date = parsedDueDate.toISOString().slice(0, 10);
    } else {
      due_date = null;
    }

    const serviceTotal = service_taken.reduce((sum, service) => sum + parseFloat(service.price || 0), 0);

    const partsTotal = parts_taken.reduce((sum, part) => {
      const price = part.selling_price !== undefined ? part.selling_price : (part.sellingPrice || 0);
      return sum + (parseFloat(price) * (part.qty || 1));
    }, 0);

    const otherChargesTotal = other_charges.reduce((sum, charge) => sum + (parseFloat(charge.amount) || 0), 0);

    const subtotalBeforeTax = serviceTotal + partsTotal + otherChargesTotal - discount;
    if (subtotalBeforeTax < 0) return res.status(400).json({ error: "Discount cannot exceed items total plus other charges" });

    const tax_rate = tax_details?.wasTaxApplied ? parseFloat(tax_details?.taxRate) || 0 : null;
    const totalWithTax = subtotalBeforeTax > 0 ? subtotalBeforeTax + (subtotalBeforeTax * (tax_rate || 0) / 100) : 0;

    const balance = totalWithTax - received;

    const utcDate = new Date(date);
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(utcDate.getTime() + istOffset);
    date = istDate.toISOString().slice(0, 19).replace("T", " ");

    const serviceTakenFormatted = JSON.stringify(service_taken);
    const partsTakenFormatted = JSON.stringify(parts_taken);
    const vehicleDetailsFormatted = vehicle_details ? JSON.stringify(vehicle_details) : null;
    const otherChargesFormatted = JSON.stringify(other_charges);

    const getInvoiceIdQuery = `SELECT MAX(invoiceid) as maxInvoiceId FROM bills WHERE admin_id = ?`;
    db.query(getInvoiceIdQuery, [admin_id], (err, result) => {
      if (err) {
        return res.status(500).json({ error: "Failed to fetch invoiceid" });
      }

      const nextInvoiceId = result[0].maxInvoiceId ? result[0].maxInvoiceId + 1 : 1;

      const insertQuery = `
        INSERT INTO bills 
          (admin_id, cust_id, invoiceid, customer_name, contact, customer_email, customer_address, vehicle_details, service_taken, parts_taken, other_charges, discount, received, balance, total_bill, date, due_date, tax_rate, payment_status, payment_method)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        admin_id, custId, nextInvoiceId, customer_name, contact, customer_email || null, customer_address || null, vehicleDetailsFormatted, serviceTakenFormatted, partsTakenFormatted, otherChargesFormatted, discount, received, balance, total_bill, date, due_date, tax_rate, payment_status, payment_method
      ];

      db.query(insertQuery, values, (err, result) => {
        if (err) {
          return res.status(500).json({ error: "Database insert failed", details: err });
        }
        res.status(201).json({ success: true, message: "Bill created successfully", bill_id: result.insertId, invoiceid: nextInvoiceId });
      });
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getNextInvoiceId = async (req, res) => {
  try {
    const { admin_id } = req.params;

    const query = `SELECT MAX(invoiceid) as maxInvoiceId FROM bills WHERE admin_id = ?`;
    db.query(query, [admin_id], (err, result) => {
      if (err) {
        return res.status(500).json({ success: false, error: "Failed to fetch invoice id" });
      }

      const nextInvoiceId = result[0].maxInvoiceId ? result[0].maxInvoiceId + 1 : 1;

      res.status(200).json({ success: true, nextInvoiceId: nextInvoiceId });
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal Server Error" });
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
    let {
      admin_id, custId, customer_name, contact, customer_email, customer_address, vehicle_details, service_taken, parts_taken, other_charges, discount, received, total_bill, date, due_date, tax_details, payment_status, payment_method
    } = req.body;

    if (!Array.isArray(service_taken)) service_taken = [];

    let parsedParts = parts_taken;
    if (typeof parts_taken === 'string') {
      parsedParts = tryParseJSON(parts_taken);
    }
    if (!Array.isArray(parsedParts)) parsedParts = [];

    let parsedOtherCharges = other_charges;
    if (typeof other_charges === 'string') {
      parsedOtherCharges = tryParseJSON(other_charges);
    }
    if (!Array.isArray(parsedOtherCharges)) {
      return res.status(400).json({ error: "Invalid other charges format. Expected an array." });
    }

    if (!admin_id || !customer_name || !contact || (service_taken.length === 0 && parsedParts.length === 0)) {
      return res.status(400).json({ error: "Missing required fields. Customer details and items are required." });
    }
    if (typeof vehicle_details === 'object' && Object.keys(vehicle_details).length === 0) {
      return res.status(400).json({ error: "Vehicle details cannot be empty." });
    }

    if (typeof discount !== 'number' || discount < 0) return res.status(400).json({ error: "Invalid discount" });
    if (typeof received !== 'number' || received < 0) return res.status(400).json({ error: "Invalid received amount" });
    if (typeof total_bill !== 'number' || total_bill < 0) return res.status(400).json({ error: "Invalid total bill" });
    if (!['unpaid', 'partial', 'paid'].includes(payment_status)) return res.status(400).json({ error: "Invalid payment status" });

    if (['paid', 'partial'].includes(payment_status)) {
      if (!['cash', 'online'].includes(payment_method)) {
        return res.status(400).json({ error: "Payment method is required and must be 'cash' or 'online' for paid/partial status." });
      }
    } else {
      payment_method = null;
    }

    if (['unpaid', 'partial'].includes(payment_status)) {
      if (!due_date || isNaN(new Date(due_date))) {
        return res.status(400).json({ error: "Due date is required and must be a valid date for unpaid or partial payments." });
      }
      const parsedDueDate = new Date(due_date);
      due_date = parsedDueDate.toISOString().slice(0, 10);
    } else {
      due_date = null;
    }

    const serviceTotal = service_taken.reduce((sum, service) => sum + parseFloat(service.price || 0), 0);

    const partsTotal = parsedParts.reduce((sum, part) => {
      const price = part.selling_price !== undefined ? part.selling_price : (part.sellingPrice || 0);
      return sum + (parseFloat(price) * (part.qty || 1));
    }, 0);

    const otherChargesTotal = parsedOtherCharges.reduce((sum, charge) => sum + (parseFloat(charge.amount) || 0), 0);

    const subtotalBeforeTax = serviceTotal + partsTotal + otherChargesTotal - discount;
    if (subtotalBeforeTax < 0) {
      return res.status(400).json({ error: "Discount cannot exceed items total plus other charges" });
    }

    const tax_rate = tax_details?.wasTaxApplied ? parseFloat(tax_details?.taxRate) || 0 : null;
    const totalWithTax = subtotalBeforeTax > 0 ? subtotalBeforeTax + (subtotalBeforeTax * (tax_rate || 0) / 100) : 0;

    const balance = totalWithTax - received;

    const serviceTakenFormatted = JSON.stringify(service_taken);
    const partsTakenFormatted = JSON.stringify(parsedParts);
    const vehicleDetailsFormatted = vehicle_details ? JSON.stringify(vehicle_details) : null;
    const otherChargesFormatted = JSON.stringify(parsedOtherCharges);

    let formattedDate = null;
    if (date && !isNaN(new Date(date))) {
      const utcDate = new Date(date);
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istDate = new Date(utcDate.getTime() + istOffset);
      formattedDate = istDate.toISOString().slice(0, 19).replace("T", " ");
    }

    const query = `
      UPDATE bills SET cust_id = ?, customer_name = ?, contact = ?, customer_email = ?, customer_address = ?, vehicle_details = ?, service_taken = ?, parts_taken = ?, other_charges = ?, discount = ?, received = ?, balance = ?, total_bill = ?, tax_rate = ?, payment_status = ?, payment_method = ?, due_date = ?, date = COALESCE(?, date) WHERE invoiceid = ? AND admin_id = ?
    `;

    const values = [
      custId, customer_name, contact, customer_email || null, customer_address || null, vehicleDetailsFormatted, serviceTakenFormatted, partsTakenFormatted, otherChargesFormatted, discount, received, balance, total_bill, tax_rate, payment_status, payment_method, due_date,
      formattedDate, bill_id, admin_id
    ];

    db.query(query, values, (err, result) => {
      if (err) {
        return res.status(500).json({ error: "Database update operations failed", details: err });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Invoice registry entry not found or context token unauthorized" });
      }

      const getUpdatedBill = `SELECT * FROM bills WHERE bill_id = ?`;
      db.query(getUpdatedBill, [bill_id], (err, updatedResults) => {
        if (err || updatedResults.length === 0) {
          return res.status(200).json({ message: "Bill entry modifications updated securely inside database" });
        }

        const updatedBill = updatedResults[0];
        updatedBill.service_taken = tryParseJSON(updatedBill.service_taken);
        updatedBill.parts_taken = tryParseJSON(updatedBill.parts_taken);
        updatedBill.vehicle_details = tryParseJSON(updatedBill.vehicle_details);
        updatedBill.other_charges = tryParseJSON(updatedBill.other_charges);

        res.status(200).json({ success: true, message: "Invoice updated successfully ✅", bill: updatedBill });
      });
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error context initialization error" });
  }
};

export const getWorkHistory = async (req, res) => {
  try {
    const { admin_id } = req.query;

    const query = `SELECT 
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
        return res.status(500).json({ error: "Database query failed", details: err });
      }

      const bills = results.map(bill => ({
        ...bill,
        service_taken: tryParseJSON(bill.service_taken),
      }));

      res.status(200).json(bills);
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getAllBills = async (req, res) => {
  try {
    const { admin_id } = req.query;

    const query = `SELECT * FROM bills WHERE admin_id = ?`;

    db.query(query, [admin_id], (err, results) => {
      if (err) {
        return res.status(500).json({ error: "Database query failed", details: err });
      }

      res.status(200).json(results);
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const updateCustomerDetails = async (req, res) => {
  const { admin_id, old_contact, new_contact, customer_name } = req.body;

  const query = `
    UPDATE bills 
    SET customer_name = ?, contact = ?
    WHERE admin_id = ? AND contact = ?
  `;

  db.query(query,
    [customer_name, new_contact, admin_id, old_contact],
    (err, result) => {

      if (err) {
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
        return res.status(500).json({ error: "Database operation failed" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Bill not found or unauthorized" });
      }

      res.json({ message: "Bill deleted successfully" });
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getBillById = async (req, res) => {
  try {
    const { bill_id } = req.params;

    const query = `SELECT * FROM bills WHERE bill_id = ?`;
    db.query(query, [bill_id], (err, results) => {
      if (err) {
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
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const updatePayment = async (req, res) => {
  try {
    const { bill_id } = req.params;
    const { admin_id, received, balance } = req.body;

    if (!admin_id) {
      return res.status(400).json({ error: "Admin ID is required" });
    }
    if (typeof received !== 'number' || received < 0) {
      return res.status(400).json({ error: "Invalid received amount" });
    }
    if (typeof balance !== 'number' || balance < 0) {
      return res.status(400).json({ error: "Invalid balance amount" });
    }

    const query = `
      UPDATE bills 
      SET 
        received = ?,
        balance = ?
      WHERE bill_id = ? AND admin_id = ?
    `;

    const values = [received, balance, bill_id, admin_id];

    db.query(query, values, (err, result) => {
      if (err) {
        return res.status(500).json({ error: "Database update failed", details: err });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Bill not found or unauthorized" });
      }

      const fetchQuery = `
        SELECT received, balance 
        FROM bills 
        WHERE bill_id = ? AND admin_id = ?
      `;
      db.query(fetchQuery, [bill_id, admin_id], (fetchErr, fetchResult) => {
      });

      res.status(200).json({ message: "Payment updated successfully" });
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getPendingBalances = (req, res) => {
  const { admin_id } = req.params;

  if (!admin_id) {
    return res.status(400).json({ success: false, error: "Admin ID is required" });
  }

  const query = `
    SELECT 
      bill_id,
      customer_name,
      date,
      balance,
      total_bill,
      received
    FROM bills 
    WHERE admin_id = ? AND balance > 0
    ORDER BY date DESC
  `;

  db.query(query, [admin_id], (err, results) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: "Database query failed",
        details: err.message
      });
    }

    res.status(200).json(results);
  });
};