import db from "../db/db.js";

export const addSparePart = async (req, res) => {
    try {
        const {
            adminId,
            name,
            sku,
            categoryName,
            brand,
            description,
            buyPrice,
            sellingPrice,
            status,
        } = req.body;

        if (!adminId || !name || !categoryName || !buyPrice || !sellingPrice) {
            return res.status(400).json({
                success: false,
                message:
                    "Required fields (Name, Category, Buy and Selling Price) are missing or invalid",
            });
        }

        const sql = `INSERT INTO spare_parts (
            admin_id, name, sku, category_name, brand, description, buy_price, selling_price, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const values = [
            adminId,
            name,
            sku,
            categoryName?.trim(),
            brand || null,
            description || null,
            parseFloat(buyPrice) || 0.0,
            parseFloat(sellingPrice) || 0.0,
            status || "active",
        ];

        db.query(sql, values, (err, result) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    error: "Database error occurred",
                    details: err.message,
                });
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
            return res
                .status(400)
                .json({ success: false, message: "Admin ID is required" });
        }

        const sql = `SELECT * FROM spare_parts  WHERE admin_id = ? ORDER BY created_at DESC`;

        db.query(sql, [adminId], (err, results) => {
            if (err) {
                return res
                    .status(500)
                    .json({ success: false, message: "Database error" });
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
            adminId,
            name,
            sku,
            categoryName,
            brand,
            description,
            buyPrice,
            sellingPrice,
            status,
        } = req.body;

        if (!adminId) {
            return res
                .status(400)
                .json({ success: false, message: "Admin authentication failed" });
        }

        if (!name || !categoryName || !buyPrice || !sellingPrice) {
            return res.status(400).json({
                success: false,
                message:
                    "Required fields (Name, Category, Buy and Selling Price) are missing or invalid",
            });
        }

        const sql = `UPDATE spare_parts SET name = ?, sku = ?, category_name = ?, brand = ?, description = ?, buy_price = ?, selling_price = ?, status = ? WHERE id = ? AND admin_id = ?`;

        const values = [
            name,
            sku || null,
            categoryName?.trim(),
            brand || null,
            description || null,
            parseFloat(buyPrice) || 0.0,
            parseFloat(sellingPrice) || 0.0,
            status || "active",
            id,
            adminId,
        ];

        db.query(sql, values, (err, result) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    error: "Database error occurred",
                    details: err.message,
                });
            }

            if (result.affectedRows === 0) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Unauthorized: You don't have permission to update this part or part not found",
                });
            }

            res.status(200).json({
                success: true,
                message: "Spare part updated successfully",
            });
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const deleteSparePart = async (req, res) => {
    try {
        const { id } = req.params;
        const { adminId } = req.body;

        if (!adminId) {
            return res.status(400).json({ success: false, message: "Admin ID is required" });
        }

        db.query("DELETE FROM spare_parts WHERE id = ? AND admin_id = ?", [id, adminId], (err, result) => {
            if (err) {
                return res.status(500).json({ success: false, message: "Database operation failed" });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: "Part not found or unauthorized" });
            }

            return res.status(200).json({ success: true, message: "Part deleted successfully" });
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};

export const bulkDeleteParts = async (req, res) => {
    try {
        const { adminId, part_ids } = req.body;

        if (!adminId || !part_ids || !Array.isArray(part_ids) || part_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Admin ID and valid part_ids array are required",
            });
        }

        const placeholders = part_ids.map(() => "?").join(",");
        const sql = `DELETE FROM spare_parts WHERE id IN (${placeholders}) AND admin_id = ?`;
        const params = [...part_ids, adminId];

        db.query(sql, params, (err, result) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: "Database operation failed",
                    details: err.message,
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: "No parts found or unauthorized access",
                });
            }

            res.status(200).json({
                success: true,
                message: `${result.affectedRows} parts deleted successfully`,
                deletedCount: result.affectedRows,
            });
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};