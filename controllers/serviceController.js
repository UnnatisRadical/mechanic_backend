import db from "../db/db.js";

export const addService = async (req, res) => {
  try {
    const {
      name,
      category,
      price_2w,
      price_4w,
      admin_id,
    } = req.body;

    if (!name || !category || !admin_id) {
      return res.status(400).json({ error: "All required fields must be filled" });
    }

    if (!price_2w && !price_4w) {
      return res.status(400).json({ error: "At least one price (2W or 4W) is required" });
    }

    const checkQuery = "SELECT * FROM services WHERE name = ? AND admin_id = ?";
    db.query(checkQuery, [name, admin_id], (err, results) => {
      if (err)
        return res.status(500).json({ error: "Database error", details: err });

      if (results.length > 0) {
        return res.status(400).json({ error: "Service already exists" });
      }

      const insertQuery = `INSERT INTO services (name, category, price_2w, price_4w, admin_id) VALUES (?, ?, ?, ?, ?)`;

      const values = [
        name,
        category,
        price_2w,
        price_4w,
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
    price_2w,
    price_4w,
    admin_id,
  } = req.body;

  try {
    if (!id || !name || !admin_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (id, name, or admin_id)",
      });
    }

    if (!price_2w && !price_4w) {
      return res
        .status(400)
        .json({ success: false, message: "At least one price (2W or 4W) is required" });
    }

    const queryText = `UPDATE services SET name = ?, category = ?, price_2w = ?, price_4w = ? WHERE id = ? AND admin_id = ?`;

    const queryValues = [
      name,
      category,
      price_2w,
      price_4w,
      id,
      admin_id,
    ];

    db.query(queryText, queryValues, (error, results) => {
      if (error) {
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

export const updateCategory = (req, res) => {
  try {
    const { admin_id, oldCategoryName, newCategoryName } = req.body;

    if (!admin_id || !oldCategoryName || !newCategoryName) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (admin_id, oldCategoryName, newCategoryName)"
      });
    }

    if (!newCategoryName.trim()) {
      return res.status(400).json({
        success: false,
        message: "New category name cannot be empty"
      });
    }

    const trimmedNewCategoryName = newCategoryName.trim().toLowerCase();

    const checkQuery = "SELECT id FROM services WHERE admin_id = ? AND (category = ? OR category = ?) LIMIT 1";

    db.query(checkQuery, [admin_id, oldCategoryName, oldCategoryName.toLowerCase()], (checkErr, checkResults) => {
      console.log("checkErr", checkErr);
      if (checkErr) {
        return res.status(500).json({
          success: false,
          message: "Database operation failed"
        });
      }

      if (checkResults.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No services found with this category"
        });
      }

      const updateQuery = "UPDATE services SET category = ? WHERE admin_id = ? AND (category = ? OR category = ?)";

      db.query(updateQuery, [trimmedNewCategoryName, admin_id, oldCategoryName, oldCategoryName.toLowerCase()], (updateErr, updateResults) => {
        console.log("updateErr", updateErr);
        if (updateErr) {
          return res.status(500).json({
            success: false,
            message: "Database operation failed",
            details: updateErr.message
          });
        }

        return res.status(200).json({
          success: true,
          message: "Category updated successfully",
          affectedServices: updateResults.affectedRows,
          categoryDetails: {
            oldName: oldCategoryName,
            newName: trimmedNewCategoryName,
            servicesUpdated: updateResults.affectedRows
          }
        });
      });
    });

  } catch (error) {
    console.log("error", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      details: error.message
    });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { admin_id, category } = req.body;

    if (!admin_id || !category) {
      return res.status(400).json({
        success: false,
        message: "Admin ID and category are required",
      });
    }

    const deleteQuery = "DELETE FROM services WHERE admin_id = ? AND (category = ? OR category = ?)";

    db.query(deleteQuery, [admin_id, category, category.toLowerCase()], (err, result) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Database operation failed",
          details: err.message,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Category and related services permanently deleted",
        deletedServices: result.affectedRows,
      });
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      details: error.message,
    });
  }
};

export const bulkDeleteCategories = async (req, res) => {
  try {
    const { admin_id, categories } = req.body;

    if (!admin_id || !Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Admin ID and a non-empty categories array are required",
      });
    }

    const normalizedCategories = categories.flatMap((cat) => [cat, cat.toLowerCase()]);
    const placeholders = normalizedCategories.map(() => "?").join(", ");

    const deleteQuery = `DELETE FROM services WHERE admin_id = ? AND category IN (${placeholders})`;

    db.query(deleteQuery, [admin_id, ...normalizedCategories], (err, result) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Database operation failed",
          details: err.message,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Categories and related services permanently deleted",
        deletedServices: result.affectedRows,
      });
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      details: error.message,
    });
  }
};