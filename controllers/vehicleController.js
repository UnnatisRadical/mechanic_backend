import db from "../db/db.js";

export const registerVehicle = async (req, res) => {
    try {
        const {
            adminId,
            customerId,
            brand,
            model,
            vehicleNumber,
            year,
            type,
            serviceHistory
        } = req.body;

        if (!adminId || !customerId || !brand || !model || !vehicleNumber) {
            return res.status(400).json({
                success: false,
                message: "Mandatory fields (Brand, Model, Vehicle Number, Customer) are missing",
            });
        }

        const sql = `INSERT INTO vehicles 
            (admin_id, customer_id, brand, model, vehicle_number, manufacturing_year, vehicle_type, service_history) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

        const values = [
            adminId,
            customerId,
            brand,
            model,
            vehicleNumber.toUpperCase(),
            year || null,
            type || 'Car',
            serviceHistory || ""
        ];

        db.query(sql, values, (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ success: false, message: "Vehicle number already exists" });
                }
                return res.status(500).json({ success: false, message: "Database error occurred" });
            }
            res.status(201).json({
                success: true,
                message: "Vehicle registered successfully",
                vehicleId: result.insertId,
            });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getVehicles = async (req, res) => {
    try {
        const { adminId } = req.params;
        const sql = `SELECT v.*, c.name as ownerName FROM vehicles v 
                     JOIN customers c ON v.customer_id = c.id 
                     WHERE v.admin_id = ? ORDER BY v.created_at DESC`;

        db.query(sql, [adminId], (err, results) => {
            if (err) return res.status(500).json({ success: false, message: "Database error" });
            res.status(200).json({ success: true, data: results });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getAllVehicles = async (req, res) => {
    try {
        const { adminId } = req.params;
        const sql = 'SELECT * FROM vehicles';

        db.query(sql, [adminId], (err, results) => {
            if (err) return res.status(500).json({ success: false, message: "Database error" });
            res.status(200).json({ success: true, data: results });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateVehicle = async (req, res) => {
    try {
        const { id } = req.params;
        const { customerId, brand, model, vehicleNumber, year, type, status } = req.body;

        if (!brand || !model || !vehicleNumber) {
            return res.status(400).json({
                success: false,
                message: "Mandatory fields (Brand, Model, Vehicle Number) are missing",
            });
        }

        const sql = `UPDATE vehicles 
                     SET brand = ?, model = ?, vehicle_number = ?, manufacturing_year = ?, vehicle_type = ?, status = ? 
                     ${customerId ? ', customer_id = ?' : ''} 
                     WHERE id = ?`;

        const values = [
            brand,
            model,
            vehicleNumber.toUpperCase(),
            year || null,
            type || 'Car',
            status || 'Active'
        ];

        if (customerId) values.push(customerId);
        values.push(id);

        db.query(sql, values, (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ success: false, message: "Vehicle number already exists" });
                }
                return res.status(500).json({ success: false, message: "Database error" });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: "Vehicle not found" });
            }

            res.status(200).json({ success: true, message: "Vehicle updated successfully" });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};