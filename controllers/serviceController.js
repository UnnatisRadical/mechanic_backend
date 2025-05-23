import db from "../db/db.js"; // MySQL connection

export const addService = async (req, res) => {
  try {
    const { name, price, admin_id } = req.body;

    if (!name || !price || !admin_id) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if the service already exists for the same admin
    const checkQuery = "SELECT * FROM services WHERE name = ? AND admin_id = ? AND status = 'active'";
    db.query(checkQuery, [name, admin_id], (err, results) => {
      if (err) {
        return res.status(500).json({ error: "Database error", details: err });
      }
      if (results.length > 0) {
        return res.status(400).json({ error: "Service already exists" });
      }

      // Insert new service if it does not exist
      const insertQuery = "INSERT INTO services (name, price, admin_id, status) VALUES (?, ?, ?, 'active')";
      db.query(insertQuery, [name, price, admin_id], (err, result) => {
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

    const query = "SELECT * FROM services WHERE admin_id = ? AND status = 'active'";
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

export const removeService = async (req, res) => {
  try {
    const { service_id } = req.body;

    if (!service_id) {
      return res.status(400).json({ error: "Service ID is required" });
    }

    const query = "UPDATE services SET status = 'deleted' WHERE id = ?";
    db.query(query, [service_id], (err, result) => {
      if (err) {
        return res.status(500).json({ error: "Database error", details: err });
      }
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

    const query = "SELECT * FROM services WHERE admin_id = ? AND status = 'deleted'";
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



export const restoreService = async (req, res) => {
  try {
    const { service_id } = req.body;

    if (!service_id) {
      return res.status(400).json({ error: "Service ID is required" });
    }

    const query = "UPDATE services SET status = 'active' WHERE id = ?";
    db.query(query, [service_id], (err, result) => {
      if (err) {
        return res.status(500).json({ error: "Database error", details: err });
      }
      res.status(200).json({ message: "Service restored successfully" });
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};


export const editService = (req, res) => {
  const { id, name, price, admin_id } = req.body;

  // Validate input
  if (!id || !name || price === undefined || !admin_id) {
    return res.status(400).json({ 
      success: false,
      message: 'Missing required fields' 
    });
  }

  // Execute the query with callback
  db.query(
    `UPDATE services SET name = ?, price = ? WHERE id = ? AND admin_id = ?`,
    [name, price, id, admin_id],
    (error, results) => {
      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({
          success: false,
          message: 'Database operation failed'
        });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Service not found or no permission'
        });
      }

      // Get the updated service
      db.query(
        `SELECT id, name, price FROM services WHERE id = ?`,
        [id],
        (error, serviceResults) => {
          if (error) {
            console.error('Database error:', error);
            return res.status(500).json({
              success: false,
              message: 'Failed to fetch updated service'
            });
          }

          res.status(200).json({
            success: true,
            message: 'Service updated successfully',
            service: serviceResults[0]
          });
        }
      );
    }
  );
};