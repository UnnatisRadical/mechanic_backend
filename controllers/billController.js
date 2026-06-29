import db from "../db/db.js";

function tryParseJSON(jsonString) {
  try {
    if (typeof jsonString === "string") {
      return JSON.parse(jsonString);
    }
    return jsonString;
  } catch (e) {
    console.error("JSON parse error:", e);
    return [];
  }
}

const generateInvoiceNumber = (lastInvoiceNo, settings, currentDate = new Date()) => {
  const { prefix = "INV", format = "prefix_year_serial", digits = "2", resetType = "never" } = settings;

  const currentYear = currentDate.getFullYear();
  const currentMonth = String(currentDate.getMonth() + 1).padStart(2, "0");

  const parseLastInvoice = (invoiceNo) => {
    if (!invoiceNo) return { serial: 0, month: null, year: null };

    try {
      const parts = invoiceNo.split("-");

      switch (format) {
        case "serial_only":
          return { serial: parseInt(parts[0], 10) || 0, month: null, year: null };

        case "prefix_serial":
          return { serial: parseInt(parts[parts.length - 1], 10) || 0, month: null, year: null };

        case "year_serial":
          return {
            serial: parseInt(parts[1], 10) || 0,
            month: null,
            year: parseInt(parts[0], 10) || currentYear
          };

        case "prefix_year_serial":
          return {
            serial: parseInt(parts[2], 10) || 0,
            month: null,
            year: parseInt(parts[1], 10) || currentYear
          };

        case "prefix_month_year_serial":
          return {
            serial: parseInt(parts[3], 10) || 0,
            month: parseInt(parts[1], 10) || currentMonth,
            year: parseInt(parts[2], 10) || currentYear
          };

        default:
          return { serial: 0, month: null, year: null };
      }
    } catch (err) {
      console.error("❌ Error parsing invoice number:", err);
      return { serial: 0, month: null, year: null };
    }
  };

  let shouldReset = false;
  if (resetType === "never") {
    shouldReset = false;
  } else if (resetType === "year") {
    shouldReset = parsed.year !== currentYear;
  } else if (resetType === "month") {
    shouldReset = parsed.year !== currentYear || parsed.month !== currentMonth;
  }

  const nextSerial = shouldReset ? 1 : (parsed.serial + 1);
  const paddedSerial = String(nextSerial).padStart(parseInt(digits, 10), "0");

  let generatedInvoiceNo = "";

  switch (format) {
    case "serial_only":
      generatedInvoiceNo = paddedSerial;
      break;

    case "prefix_serial":
      generatedInvoiceNo = `${prefix}-${paddedSerial}`;
      break;

    case "year_serial":
      generatedInvoiceNo = `${currentYear}-${paddedSerial}`;
      break;

    case "prefix_year_serial":
      generatedInvoiceNo = `${prefix}-${currentYear}-${paddedSerial}`;
      break;

    case "prefix_month_year_serial":
      generatedInvoiceNo = `${prefix}-${currentMonth}-${currentYear}-${paddedSerial}`;
      break;

    default:
      generatedInvoiceNo = `${prefix}-${currentYear}-${paddedSerial}`;
  }

  return generatedInvoiceNo;
};

export const createBill = async (req, res) => {
  try {
    let {
      admin_id,
      custId,
      customer_name,
      contact,
      customer_email,
      customer_address,
      vehicle_details,
      service_taken,
      parts_taken,
      other_charges,
      discount,
      received,
      total_bill,
      date,
      tax_details,
      payment_status,
      payment_method,
      invoice_no,
    } = req.body;

    if (
      !admin_id ||
      !customer_name ||
      !contact ||
      (service_taken.length === 0 && parts_taken.length === 0)
    ) {
      return res.status(400).json({
        error:
          "Missing required fields. Customer details and items are required.",
      });
    }
    if (
      typeof vehicle_details === "object" &&
      Object.keys(vehicle_details).length === 0
    ) {
      return res
        .status(400)
        .json({ error: "Vehicle details cannot be empty." });
    }
    if (typeof other_charges !== "number" || other_charges < 0)
      return res.status(400).json({ error: "Invalid other charges" });
    if (typeof discount !== "number" || discount < 0)
      return res.status(400).json({ error: "Invalid discount" });
    if (typeof received !== "number" || received < 0)
      return res.status(400).json({ error: "Invalid received amount" });
    if (typeof total_bill !== "number" || total_bill < 0)
      return res.status(400).json({ error: "Invalid total bill" });
    if (!date || isNaN(new Date(date)))
      return res.status(400).json({ error: "Invalid date" });
    if (!["cash", "online"].includes(payment_method))
      return res.status(400).json({ error: "Invalid payment method" });

    if (['paid', 'partial'].includes(payment_status)) {
      if (received <= 0) {
        return res.status(400).json({
          error: `Received or Partial amount must be greater than 0 for ${payment_status} payment.`
        });
      }

      if (!['cash', 'online'].includes(payment_method)) {
        return res.status(400).json({
          error: "Payment method is required and must be 'cash' or 'online' for paid/partial status."
        });
      }
    } else {
      payment_method = null;
    }

    const serviceTotal = service_taken.reduce(
      (sum, service) => sum + parseFloat(service.price || 0),
      0,
    );
    const partsTotal = parts_taken.reduce(
      (sum, part) => sum + parseFloat(part.sellingPrice || 0) * (part.qty || 1),
      0,
    );

    const subtotalBeforeTax =
      serviceTotal + partsTotal + other_charges - discount;
    if (subtotalBeforeTax < 0)
      return res.status(400).json({
        error: "Discount cannot exceed items total plus other charges",
      });

    const tax_rate = parseFloat(tax_details?.taxRate) || 0;
    const totalWithTax =
      subtotalBeforeTax > 0
        ? subtotalBeforeTax + (subtotalBeforeTax * (tax_rate || 0)) / 100
        : 0;

    const balance = totalWithTax - received;

    const utcDate = new Date(date);
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(utcDate.getTime() + istOffset);
    date = istDate.toISOString().slice(0, 19).replace("T", " ");

    const serviceTakenFormatted = JSON.stringify(service_taken);
    const partsTakenFormatted = JSON.stringify(parts_taken);
    const vehicleDetailsFormatted = vehicle_details
      ? JSON.stringify(vehicle_details)
      : null;

    const insertQuery = `
      INSERT INTO bills 
        (admin_id, cust_id, customer_name, contact, customer_email, customer_address, vehicle_details, service_taken, parts_taken, other_charges, discount, received, balance, total_bill, date, tax_rate, payment_status, payment_method, invoiceid)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      admin_id,
      custId,
      customer_name,
      contact,
      customer_email || null,
      customer_address || null,
      vehicleDetailsFormatted,
      serviceTakenFormatted,
      partsTakenFormatted,
      other_charges,
      discount,
      received,
      balance,
      total_bill,
      date,
      tax_rate,
      payment_status,
      payment_method,
      invoice_no,
    ];


    db.query(insertQuery, values, (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ error: "Database insert failed", details: err });
      }
      res.status(201).json({
        success: true,
        message: "Bill created successfully",
        bill_id: result.insertId,
        invoiceid: invoice_no,
      });
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getActiveServices = (req, res) => {
  const { admin_id } = req.params;
  db.query(
    "SELECT * FROM services WHERE admin_id = ? AND status = 'active'",
    [admin_id],
    (err, results) => {
      if (err) return res.status(500).json(err);
      res.json(results);
    },
  );
};

export const getPreviousCustomers = (req, res) => {
  const { admin_id } = req.params;
  db.query(
    "SELECT DISTINCT customer_name, contact FROM bills WHERE admin_id = ?",
    [admin_id],
    (err, results) => {
      if (err) return res.status(500).json(err);
      res.json(results);
    },
  );
};

export const updateBill = async (req, res) => {
  try {
    const { bill_id } = req.params;

    let {
      admin_id,
      invoiceNo,
      customer_name,
      contact,
      customer_email,
      customer_address,
      vehicle_details,
      service_taken,
      parts_taken,
      other_charges = 0,
      discount,
      received,
      total_bill,
      tax_rate,
      payment_status,
      payment_method,
    } = req.body;

    const safeOtherCharges = parseFloat(other_charges) || 0;

    if (!Array.isArray(service_taken)) service_taken = [];

    let parsedParts = parts_taken;
    if (typeof parts_taken === "string") {
      parsedParts = tryParseJSON(parts_taken);
    }
    if (!Array.isArray(parsedParts)) parsedParts = [];

    if (
      !admin_id ||
      !customer_name ||
      !contact ||
      (service_taken.length === 0 && parsedParts.length === 0)
    ) {
      return res.status(400).json({
        error:
          "Missing required fields. Customer details and items are required.",
      });
    }

    if (
      typeof vehicle_details === "object" &&
      vehicle_details &&
      Object.keys(vehicle_details).length === 0
    ) {
      return res
        .status(400)
        .json({ error: "Vehicle details cannot be empty." });
    }

    if (typeof discount !== "number" || discount < 0) {
      return res.status(400).json({
        error: "Invalid discount",
      });
    }

    if (typeof received !== "number" || received < 0) {
      return res.status(400).json({
        error: "Invalid received amount",
      });
    }

    if (typeof total_bill !== "number" || total_bill < 0) {
      return res.status(400).json({
        error: "Invalid total bill",
      });
    }

    if (["paid", "partial"].includes(payment_status)) {
      if (received <= 0) {
        return res.status(400).json({
          error: `Received amount must be greater than 0 for ${payment_status} payment.`,
        });
      }

      if (!["cash", "online"].includes(payment_method)) {
        return res.status(400).json({
          error:
            "Payment method is required and must be 'cash' or 'online' for paid/partial payment.",
        });
      }
    } else {
      payment_method = null;
    }

    const serviceTotal = service_taken.reduce(
      (sum, service) => sum + parseFloat(service.price || 0),
      0
    );

    const partsTotal = parsedParts.reduce(
      (sum, part) =>
        sum + parseFloat(part.sellingPrice || 0) * (part.qty || 1),
      0
    );

    const subtotalBeforeTax =
      serviceTotal + partsTotal + other_charges - discount;

    if (subtotalBeforeTax < 0) {
      return res.status(400).json({
        error: "Discount cannot exceed items total plus other charges",
      });
    }

    const liveTaxRate = parseFloat(tax_rate) || 0;

    const totalWithTax =
      subtotalBeforeTax > 0
        ? subtotalBeforeTax +
        (subtotalBeforeTax * liveTaxRate) / 100
        : 0;

    const computedBalance = totalWithTax - received;

    const serviceTakenFormatted = JSON.stringify(service_taken);
    const partsTakenFormatted = JSON.stringify(parsedParts);
    const vehicleDetailsFormatted = vehicle_details
      ? JSON.stringify(vehicle_details)
      : null;

    let date = null;

    if (req.body.date) {
      const utcDate = new Date(req.body.date);
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istDate = new Date(utcDate.getTime() + istOffset);

      date = istDate
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");
    }

    const query = `
      UPDATE bills
      SET
        customer_name = ?,
        contact = ?,
        customer_email = ?,
        customer_address = ?,
        vehicle_details = ?,
        service_taken = ?,
        parts_taken = ?,
        other_charges = ?,
        discount = ?,
        received = ?,
        balance = ?,
        total_bill = ?,
        tax_rate = ?,
        payment_status = ?,
        payment_method = ?,
        date = COALESCE(?, date)
      WHERE invoiceid = ? AND admin_id = ?
    `;

    const values = [
      customer_name,
      contact,
      customer_email || null,
      customer_address || null,
      vehicleDetailsFormatted,
      serviceTakenFormatted,
      partsTakenFormatted,
      safeOtherCharges,
      discount,
      received,
      computedBalance,
      total_bill,
      liveTaxRate,
      payment_status,
      payment_method,
      date,
      invoiceNo,
      admin_id,
    ];

    db.query(query, values, (err, result) => {
      if (err) {
        return res.status(500).json({
          error: "Database update failed",
          details: err,
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          error: "Bill not found or unauthorized.",
        });
      }

      const getUpdatedBill =
        "SELECT * FROM bills WHERE bill_id = ?";

      db.query(getUpdatedBill, [bill_id], (err, updatedResults) => {
        if (err || updatedResults.length === 0) {
          console.log("erro", err);
          return res.status(200).json({
            success: true,
            message: "Bill updated successfully",
          });
        }

        const updatedBill = updatedResults[0];

        updatedBill.service_taken = tryParseJSON(
          updatedBill.service_taken
        );
        updatedBill.parts_taken = tryParseJSON(
          updatedBill.parts_taken
        );
        updatedBill.vehicle_details = tryParseJSON(
          updatedBill.vehicle_details
        );

        res.status(200).json({
          success: true,
          message: "Invoice updated successfully ✅",
          bill: updatedBill,
        });
      });
    });
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error",
    });
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
        return res
          .status(500)
          .json({ error: "Database query failed", details: err });
      }

      const bills = results.map((bill) => ({
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
        return res
          .status(500)
          .json({ error: "Database query failed", details: err });
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

  db.query(
    query,
    [customer_name, new_contact, admin_id, old_contact],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: "Database operation failed" });
      }

      res.json({
        success: true,
        updated: result.affectedRows,
      });
    },
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
        return res
          .status(404)
          .json({ error: "Bill not found or unauthorized" });
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
        return res
          .status(500)
          .json({ error: "Database query failed", details: err });
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
    if (typeof received !== "number" || received < 0) {
      return res.status(400).json({ error: "Invalid received amount" });
    }
    if (typeof balance !== "number" || balance < 0) {
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
        return res
          .status(500)
          .json({ error: "Database update failed", details: err });
      }

      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ error: "Bill not found or unauthorized" });
      }

      const fetchQuery = `
        SELECT received, balance 
        FROM bills 
        WHERE bill_id = ? AND admin_id = ?
      `;
      db.query(fetchQuery, [bill_id, admin_id], (fetchErr, fetchResult) => { });

      res.status(200).json({ message: "Payment updated successfully" });
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getPendingBalances = (req, res) => {
  const { admin_id } = req.params;

  if (!admin_id) {
    return res
      .status(400)
      .json({ success: false, error: "Admin ID is required" });
  }

  const query = `
    SELECT * FROM bills 
    WHERE admin_id = ? AND balance > 0
    ORDER BY date DESC
  `;

  db.query(query, [admin_id], (err, results) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: "Database query failed",
        details: err.message,
      });
    }

    res.status(200).json(results);
  });
};

export const getNextInvoiceNumber = (req, res) => {
  const { admin_id } = req.params;

  if (!admin_id) {
    return res
      .status(400)
      .json({ success: false, error: "Admin ID is required" });
  }

  const lastInvoiceQuery = `
    SELECT invoiceid 
    FROM bills 
    WHERE admin_id = ? 
    ORDER BY bill_id DESC 
    LIMIT 1
  `;

  db.query(lastInvoiceQuery, [admin_id], (err, invoiceResults) => {
    if (err) {
      console.error("❌ Database query failed:", err);
      return res.status(500).json({
        success: false,
        error: "Database query failed",
        details: err,
      });
    }

    const lastInvoiceNo = invoiceResults.length > 0 ? invoiceResults[0].invoiceid : null;

    res.status(200).json({
      success: true,
      lastInvoiceNo: lastInvoiceNo,
    });
  });
};

export const getNextInvoiceId = (req, res) => {
  const { admin_id } = req.params;

  if (!admin_id) {
    return res
      .status(400)
      .json({ success: false, error: "Admin ID is required" });
  }

  const query = `SELECT MAX(invoiceid) as maxInvoiceId FROM bills WHERE admin_id = ?`;

  try {
    db.query(query, [admin_id], (err, result) => {
      if (err) {
        return res.status(500).json({
          success: false,
          error: "Database query failed",
          details: err,
        });
      }

      const nextInvoiceId = result[0].maxInvoiceId
        ? result[0].maxInvoiceId + 1
        : 1;

      res.status(200).json({
        success: true,
        nextInvoiceId: nextInvoiceId,
      });
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const addService = (req, res) => {
  const { admin_id, name, vehicle_type, price_2w, price_4w, status } = req.body;

  if (!admin_id || !name || !vehicle_type) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  db.query(
    "INSERT INTO services (admin_id, name, vehicle_type, price_2w, price_4w, status) VALUES (?, ?, ?, ?, ?, ?)",
    [
      admin_id,
      name,
      vehicle_type,
      price_2w || 0,
      price_4w || 0,
      status || "active",
    ],
    (err, result) => {
      if (err)
        return res
          .status(500)
          .json({ error: "Failed to add service", details: err });
      res.status(201).json({ success: true, id: result.insertId });
    },
  );
};