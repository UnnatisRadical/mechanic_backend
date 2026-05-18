import db from "../db/db.js";

export const addSparePart = async (req, res) => {
    try {
        const { name, costPrice, sellingPrice, stockQuantity, lowStockThreshold, adminId } = req.body;

        if (!name || !sellingPrice || !stockQuantity || !adminId) {
            return res.status(400).json({
                success: false,
                message: "Mandatory fields (Name, Selling Price, Quantity) are missing",
            });
        }

        const sql = `INSERT INTO spare_parts (admin_id, name, cost_price, selling_price, stock_quantity, low_stock_threshold)VALUES (?, ?, ?, ?, ?, ?)`;

        const values = [
            adminId,
            name,
            parseFloat(costPrice) || 0,
            parseFloat(sellingPrice),
            parseInt(stockQuantity),
            parseInt(lowStockThreshold) || 5,
        ];

        db.query(sql, values, (err, result) => {
            if (err) {
                console.error("DB Error:", err);
                return res
                    .status(500)
                    .json({ success: false, error: "Database error occurred" });
            }
            res.status(201).json({
                success: true,
                message: "Spare part added successfully",
                partId: result.insertId,
            });
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getParts = async (req, res) => {
    try {
        const { adminId } = req.params;

        if (!adminId) {
            return res.status(400).json({ success: false, message: "Admin ID is required" });
        }

        const sql = `SELECT 
                        id, 
                        name, 
                        cost_price AS costPrice, 
                        selling_price AS sellingPrice, 
                        stock_quantity AS stock, 
                        low_stock_threshold AS threshold 
                     FROM spare_parts 
                     WHERE admin_id = ? 
                     ORDER BY created_at DESC`;

        db.query(sql, [adminId], (err, results) => {
            if (err) {
                console.error("Fetch Error:", err);
                return res.status(500).json({ success: false, message: "Database error" });
            }
            res.status(200).json({ success: true, data: results });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateSparePart = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            name, 
            costPrice, 
            sellingPrice, 
            stockQuantity, 
            lowStockThreshold, 
            adminId
        } = req.body;

        if (!adminId) {
            return res.status(400).json({ success: false, message: "Admin authentication failed" });
        }

        const sql = `UPDATE spare_parts 
                     SET name = ?, 
                         cost_price = ?, 
                         selling_price = ?, 
                         stock_quantity = ?, 
                         low_stock_threshold = ? 
                     WHERE id = ? AND admin_id = ?`;

        const values = [
            name,
            parseFloat(costPrice) || 0,
            parseFloat(sellingPrice),
            parseInt(stockQuantity),
            parseInt(lowStockThreshold) || 5,
            id,
            adminId
        ];

        db.query(sql, values, (err, result) => {
            if (err) {
                return res.status(500).json({ success: false, message: "Database error" });
            }

            if (result.affectedRows === 0) {
                return res.status(403).json({ 
                    success: false, 
                    message: "Unauthorized: You don't have permission to update this part" 
                });
            }

            res.status(200).json({ 
                success: true, 
                message: "Spare part updated successfully" 
            });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
