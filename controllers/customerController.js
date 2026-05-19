import db from "../db/db.js";

export const addCustomer = async (req, res) => {
    const { name, phone, email, address, admin_id } = req.body;

    if (!name || !phone || !admin_id) {
        return res.status(400).json({ success: false, message: "Name, Phone and Admin ID are required" });
    }

    if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: "Invalid email format" });
        }
    }

    try {
        const checkQuery = "SELECT * FROM customers WHERE name = ? AND phone = ? AND admin_id = ?";
        
        db.query(checkQuery, [name, phone, admin_id], (err, results) => {
            if (err) {
                return res.status(500).json({ success: false, message: "Database error during check" });
            }

            if (results.length > 0) {
                return res.status(409).json({ 
                    success: false, 
                    message: "Customer with this Name and Phone already exists!" 
                });
            }

            const insertQuery = "INSERT INTO customers (admin_id, name, phone, email, address) VALUES (?, ?, ?, ?, ?)";
            const values = [admin_id, name, phone, email || null, address || null];

            db.query(insertQuery, values, (err, result) => {
                if (err) {
                    return res.status(500).json({ success: false, message: "Error saving customer" });
                }
                
                res.status(201).json({ 
                    success: true, 
                    message: "Customer added successfully", 
                    customerId: result.insertId 
                });
            });
        });

    } catch (error) {
        res.status(500).json({ success: false, message: "Server error occurred" });
    }
};

export const getCustomers = async (req, res) => {
    const { admin_id } = req.query;

    if (!admin_id) {
        return res.status(400).json({ success: false, message: "Admin ID is required" });
    }

    const query = "SELECT * FROM customers WHERE admin_id = ? ORDER BY id DESC";

    db.query(query, [admin_id], (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Error fetching customers" });
        }

        const processedData = results.map(cust => ({
            ...cust,
            initials: cust.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
        }));

        res.status(200).json({ success: true, data: processedData });
    });
};

export const updateCustomer = async (req, res) => {
    const { id, name, phone, email, address, admin_id } = req.body;

    if (!id || !name || !phone || !admin_id) {
        return res.status(400).json({ success: false, message: "ID, Name, Phone and Admin ID are required" });
    }

    if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: "Invalid email format" });
        }
    }

    try {
        const query = "UPDATE customers SET name = ?, phone = ?, email = ?, address = ? WHERE id = ? AND admin_id = ?";
        const values = [name, phone, email || null, address || null, id, admin_id];

        db.query(query, values, (err, result) => {
            if (err) {
                return res.status(500).json({ success: false, message: "Database error during update" });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: "Customer not found or no changes made" });
            }

            res.status(200).json({ success: true, message: "Customer updated successfully" });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error occurred" });
    }
};