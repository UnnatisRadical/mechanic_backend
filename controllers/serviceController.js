import db from "../db/db.js";

export const addService = async (req, res) => {
  try {
    const { name, category, description, duration, price, status, admin_id } = req.body;

    if (!name || !category || !duration || !price || !status || !admin_id) {
      return res.status(400).json({ error: "All required fields must be filled" });
    }

    const checkQuery = "SELECT * FROM services WHERE name = ? AND admin_id = ? AND status = 'active'";
    db.query(checkQuery, [name, admin_id], (err, results) => {
      if (err) {
        return res.status(500).json({ error: "Database error", details: err });
      }
      if (results.length > 0) {
        return res.status(400).json({ error: "Service already exists" });
      }

      const insertQuery = `INSERT INTO services (name, category, description, duration, price, status, admin_id)VALUES (?, ?, ?, ?, ?, ?, ?)`;

      const dbStatus = status.toLowerCase();

      db.query(insertQuery, [name, category, description || null, duration, price, dbStatus, admin_id], (err, result) => {
        if (err) {
          return res.status(500).json({ error: "Database error", details: err });
        }
        res.status(201).json({ message: "Service added successfully", serviceId: result.insertId });
      });
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getServicesByAdmin = async (req, res) => {
  try {
    const { admin_id } = req.params;

    if (!admin_id) {
      return res.status(400).json({ error: "Admin ID is required" });
    }

    const query = "SELECT * FROM services WHERE admin_id = ?";
    db.query(query, [admin_id], (err, results) => {
      if (err) {
        return res.status(500).json({ error: "Database error", details: err });
      }
      res.status(200).json(results);
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_id } = req.body;

    if (!admin_id) {
      return res.status(400).json({ success: false, message: "Admin ID is required" });
    }

    db.query("DELETE FROM services WHERE id = ? AND admin_id = ?", [id, admin_id], (err, result) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Database operation failed" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: "Service not found or unauthorized" });
      }

      return res.status(200).json({ success: true, message: "Service deleted successfully" });
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

export const editService = (req, res) => {
  const { id, name, price, category, description, duration, status, admin_id } = req.body;

  try {
    if (!id || !name || price === undefined || !admin_id) {
      return res.status(400).json({ success: false, message: 'Missing required fields (id, name, price, or admin_id)' });
    }

    const queryText = `
    UPDATE services SET name = ?, price = ?, category = ?, description = ?, duration = ?, status = ? WHERE id = ? AND admin_id = ?
  `;

    const queryValues = [name, price, category, description, duration, status, id, admin_id];

    db.query(queryText, queryValues, (error, results) => {
      if (error) {
        return res.status(500).json({ success: false, message: 'Database operation failed' });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Service not found or you do not have permission to edit this' });
      }

      return res.status(200).json({ success: true, message: 'Service updated successfully' });
    });
  } catch (error) {
    return res.status(200).json({ success: false, message: error?.message });
  }
};