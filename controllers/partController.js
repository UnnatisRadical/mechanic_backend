import db from "../db/db.js";

export const addSparePart = async (req, res) => {
    try {
        const {
            adminId, name, sku, categoryName, brand, description, costPrice, sellingPrice, mrp, stockQuantity, lowStockThreshold, location,
            unit, supplierName, status
        } = req.body;

        if (!adminId || !name || !sku || !categoryName || !categoryName.trim() || !stockQuantity || !costPrice) {
            return res.status(400).json({
                success: false,
                message: "Required fields (Name, SKU, Category Name, Quantity, Unit Price) are missing or invalid",
            });
        }

        const sql = `INSERT INTO spare_parts (
            admin_id, name, sku, category_name, brand, description, cost_price, selling_price, mrp, stock_quantity, low_stock_threshold, location, unit, supplier_name, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const values = [
            adminId,
            name,
            sku,
            categoryName.trim(),
            brand || null,
            description || null,
            parseFloat(costPrice) || 0.00,
            parseFloat(sellingPrice) || 0.00,
            mrp ? parseFloat(mrp) : null,
            parseInt(stockQuantity) || 0,
            lowStockThreshold !== undefined ? parseInt(lowStockThreshold) : 5,
            location || null,
            unit || 'Pcs',
            supplierName ? supplierName : null,
            status || 'active'
        ];

        db.query(sql, values, (err, result) => {
            if (err) {
                return res
                    .status(500)
                    .json({ success: false, error: "Database error occurred", details: err.message });
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

        const sql = `SELECT * FROM spare_parts WHERE admin_id = ? ORDER BY created_at DESC`;

        db.query(sql, [adminId], (err, results) => {
            if (err) {
                return res.status(500).json({ success: false, message: "Database error" });
            }
            res.status(200).json({ success: true, data: results });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
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

export const updateSparePart = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            adminId, name, sku, categoryName, brand, description, stockQuantity, costPrice, sellingPrice, mrp, lowStockThreshold, location, unit, supplierName, status
        } = req.body;

        if (!adminId) {
            return res.status(400).json({ success: false, message: "Admin authentication failed" });
        }

        if (!name || !sku || !categoryName || stockQuantity === undefined || !costPrice) {
            return res.status(400).json({
                success: false,
                message: "Required fields (Name, SKU, Category, Quantity, Cost Price) are missing",
            });
        }

        const sql = `UPDATE spare_parts SET name = ?, sku = ?, category_name = ?, brand = ?, description = ?, stock_quantity = ?, cost_price = ?, selling_price = ?, mrp = ?, low_stock_threshold = ?, location = ?, unit = ?, supplier_name = ?, status = ? WHERE id = ? AND admin_id = ?`;

        const values = [
            name,
            sku,
            categoryName,
            brand || null,
            description || null,
            parseInt(stockQuantity) || 0,
            parseFloat(costPrice) || 0.00,
            parseFloat(sellingPrice) || 0.00,
            mrp ? parseFloat(mrp) : null,
            lowStockThreshold !== undefined ? parseInt(lowStockThreshold) : 5,
            location || null,
            unit || 'Pcs',
            supplierName ? supplierName : null,
            status ? status.toLowerCase() : 'active',
            id,
            adminId
        ];

        db.query(sql, values, (err, result) => {
            if (err) {
                return res.status(500).json({ success: false, error: "Database error occurred", details: err.message });
            }

            if (result.affectedRows === 0) {
                return res.status(403).json({ 
                    success: false, 
                    message: "Unauthorized: You don't have permission to update this part or part not found" 
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