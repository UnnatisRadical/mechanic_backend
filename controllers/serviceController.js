import db from "../db/db.js";

export const addService = async (req, res) => {
  try {
    const {
      name,
      category,
      description,
      duration,
      vehicle_type,
      price_2w,
      price_4w,
      status,
      admin_id,
    } = req.body;

    if (!name || !category || !vehicle_type || !status || !admin_id) {
      return res
        .status(400)
        .json({ error: "All required fields must be filled" });
    }

    if (
      (vehicle_type === "2 Wheeler" || vehicle_type === "Both") &&
      !price_2w
    ) {
      return res.status(400).json({ error: "2 Wheeler price is required" });
    }
    if (
      (vehicle_type === "4 Wheeler" || vehicle_type === "Both") &&
      !price_4w
    ) {
      return res.status(400).json({ error: "4 Wheeler price is required" });
    }

    const checkQuery =
      "SELECT * FROM services WHERE name = ? AND admin_id = ? AND status = 'active'";
    db.query(checkQuery, [name, admin_id], (err, results) => {
      if (err)
        return res.status(500).json({ error: "Database error", details: err });

      if (results.length > 0) {
        return res.status(400).json({ error: "Service already exists" });
      }

      const insertQuery = `
        INSERT INTO services 
          (name, category, description, duration, vehicle_type, price_2w, price_4w, status, admin_id)
        VALUES 
          (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        name,
        category,
        description || null,
        duration || null,
        vehicle_type,
        price_2w || null,
        price_4w || null,
        status.toLowerCase(),
        admin_id,
      ];

      db.query(insertQuery, values, (err, result) => {
        if (err)
          return res
            .status(500)
            .json({ error: "Database error", details: err });

        res.status(201).json({
          message: "Service added successfully",
          serviceId: result.insertId,
        });
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
      if (err)
        return res.status(500).json({ error: "Database error", details: err });

      res.status(200).json(results);
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const removeService = async (req, res) => {
  try {
    const { service_id } = req.body;

    if (!service_id) {
      return res.status(400).json({ error: "Service ID is required" });
    }

    const query = "UPDATE services SET status = 'deleted' WHERE id = ?";
    db.query(query, [service_id], (err, result) => {
      if (err)
        return res.status(500).json({ error: "Database error", details: err });

      res.status(200).json({ message: "Service removed successfully" });
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getDeletedServicesByAdmin = async (req, res) => {
  try {
    const { admin_id } = req.params;

    if (!admin_id) {
      return res.status(400).json({ error: "Admin ID is required" });
    }

    const query =
      "SELECT * FROM services WHERE admin_id = ? AND status = 'deleted'";
    db.query(query, [admin_id], (err, results) => {
      if (err)
        return res.status(500).json({ error: "Database error", details: err });

      res.status(200).json(results);
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const restoreService = async (req, res) => {
  try {
    const { service_id } = req.body;

    if (!service_id) {
      return res.status(400).json({ error: "Service ID is required" });
    }

    const query = "UPDATE services SET status = 'active' WHERE id = ?";
    db.query(query, [service_id], (err, result) => {
      if (err)
        return res.status(500).json({ error: "Database error", details: err });

      res.status(200).json({ message: "Service restored successfully" });
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const editService = (req, res) => {
  const {
    id,
    name,
    category,
    description,
    duration,
    vehicle_type,
    price_2w,
    price_4w,
    status,
    admin_id,
  } = req.body;

  try {
    if (!id || !name || !vehicle_type || !admin_id) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields (id, name, vehicle_type, or admin_id)",
      });
    }

    if (
      (vehicle_type === "2 Wheeler" || vehicle_type === "Both") &&
      !price_2w
    ) {
      return res
        .status(400)
        .json({ success: false, message: "2 Wheeler price is required" });
    }
    if (
      (vehicle_type === "4 Wheeler" || vehicle_type === "Both") &&
      !price_4w
    ) {
      return res
        .status(400)
        .json({ success: false, message: "4 Wheeler price is required" });
    }

    const queryText = `
      UPDATE services SET
        name        = ?,
        category    = ?,
        description = ?,
        duration    = ?,
        vehicle_type = ?,
        price_2w    = ?,
        price_4w    = ?,
        status      = ?
      WHERE id = ? AND admin_id = ?
    `;

    const queryValues = [
      name,
      category,
      description || null,
      duration || null,
      vehicle_type,
      price_2w || null,
      price_4w || null,
      status,
      id,
      admin_id,
    ];

    db.query(queryText, queryValues, (error, results) => {
      if (error) {
        console.error("Database Error:", error);
        return res
          .status(500)
          .json({ success: false, message: "Database operation failed" });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message:
            "Service not found or you do not have permission to edit this",
        });
      }

      return res
        .status(200)
        .json({ success: true, message: "Service updated successfully" });
    });
  } catch (error) {
    console.error("editService error:", error);
    return res.status(500).json({ success: false, message: error?.message });
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