import db from "../db/db.js";

export const addCustomer = async (req, res) => {
    const { 
        admin_id, name, phone, email, address, city, state, pin_code, notes,
        brand, model, vehicle_number, manufacturing_year, vehicle_type, status
    } = req.body;

    if (!name || !phone || !admin_id || !city || !state || !pin_code) {
        return res.status(400).json({ 
            success: false, 
            message: "Name, Phone, Admin ID, City, State, and PIN Code are required" 
        });
    }

    if (!brand || !model || !vehicle_number) {
        return res.status(400).json({ 
            success: false, 
            message: "Vehicle Brand, Model, and Vehicle Number are required" 
        });
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

            db.getConnection((connErr, connection) => {
                if (connErr) {
                    return res.status(500).json({ success: false, message: "Database connection failed for transaction" });
                }

                connection.beginTransaction((transactionErr) => {
                    if (transactionErr) {
                        connection.release();
                        return res.status(500).json({ success: false, message: "Transaction failed to start" });
                    }

                    const insertCustomerQuery = `
                        INSERT INTO customers (admin_id, name, phone, email, address, city, state, pin_code, notes) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;
                    const customerValues = [
                        admin_id, name, phone, email || null, address || null, 
                        city, state, pin_code, notes || null
                    ];

                    connection.query(insertCustomerQuery, customerValues, (custErr, custResult) => {
                        if (custErr) {
                            return connection.rollback(() => {
                                connection.release();
                                res.status(500).json({ success: false, message: "Error saving customer data" });
                            });
                        }

                        const newCustomerId = custResult.insertId;

                        const insertVehicleQuery = `
                            INSERT INTO vehicles (admin_id, customer_id, brand, model, vehicle_number, manufacturing_year, vehicle_type, status) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        `;
                        const vehicleValues = [
                            admin_id, 
                            newCustomerId,
                            brand, 
                            model, 
                            vehicle_number, 
                            manufacturing_year || null, 
                            vehicle_type || 'car',
                            status || 'Active',
                        ];

                        connection.query(insertVehicleQuery, vehicleValues, (vehErr, vehResult) => {
                            if (vehErr) {
                                return connection.rollback(() => {
                                    connection.release();
                                    res.status(500).json({ success: false, message: "Customer registered, but error saving vehicle data" });
                                });
                            }

                            connection.commit((commitErr) => {
                                if (commitErr) {
                                    return connection.rollback(() => {
                                        connection.release();
                                        res.status(500).json({ success: false, message: "Transaction commit failed" });
                                    });
                                }

                                connection.release();

                                res.status(201).json({ 
                                    success: true, 
                                    message: "Customer and Vehicle added successfully", 
                                    customerId: newCustomerId,
                                    vehicleId: vehResult.insertId
                                });
                            });
                        });
                    });
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
    const { 
        id, name, phone, email, address, city, state, pin_code, notes, admin_id,
        vehicle_id, brand, model, vehicle_number, manufacturing_year, vehicle_type, status 
    } = req.body;

    if (!id || !name || !phone || !admin_id || !city || !state || !pin_code) {
        return res.status(400).json({ success: false, message: "Required customer fields are missing" });
    }

    if (brand || model || vehicle_number || vehicle_id) {
        if (!brand || !model || !vehicle_number) {
            return res.status(400).json({ 
                success: false, 
                message: "Vehicle Brand, Model, and Vehicle Number are required for vehicle operations" 
            });
        }
    }

    if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: "Invalid email format" });
        }
    }

    db.getConnection((connErr, connection) => {
        if (connErr) {
            return res.status(500).json({ success: false, message: "Database connection failed for transaction" });
        }

        connection.beginTransaction((transactionErr) => {
            if (transactionErr) {
                connection.release();
                return res.status(500).json({ success: false, message: "Transaction failed to start" });
            }

            const updateCustomerQuery = `
                UPDATE customers 
                SET name = ?, phone = ?, email = ?, address = ?, city = ?, state = ?, pin_code = ?, notes = ? 
                WHERE id = ? AND admin_id = ?
            `;
            const customerValues = [name, phone, email || null, address || null, city, state, pin_code, notes || null, id, admin_id];

            connection.query(updateCustomerQuery, customerValues, (custErr, custResult) => {
                if (custErr) {
                    return connection.rollback(() => {
                        connection.release();
                        res.status(500).json({ success: false, message: "Error updating customer data" });
                    });
                }

                if (brand && model && vehicle_number) {
                    
                    if (vehicle_id) {
                        const updateVehicleQuery = `
                            UPDATE vehicles 
                            SET brand = ?, model = ?, vehicle_number = ?, manufacturing_year = ?, vehicle_type = ?, status = ?
                            WHERE id = ? AND customer_id = ? AND admin_id = ?
                        `;
                        const updateVehicleValues = [
                            brand, model, vehicle_number, manufacturing_year || null, 
                            vehicle_type || 'car', status || 'Active', vehicle_id, id, admin_id
                        ];

                        connection.query(updateVehicleQuery, updateVehicleValues, (vehErr, vehResult) => {
                            if (vehErr) {
                                return connection.rollback(() => {
                                    connection.release();
                                    res.status(500).json({ success: false, message: "Error updating existing vehicle data" });
                                });
                            }
                            
                            commitTransaction(connection, res, "Customer and Vehicle updated successfully");
                        });

                    } else {
                        const checkVehicleQuery = "SELECT id FROM vehicles WHERE vehicle_number = ?";
                        
                        connection.query(checkVehicleQuery, [vehicle_number], (checkErr, checkResults) => {
                            if (checkErr) {
                                return connection.rollback(() => {
                                    connection.release();
                                    res.status(500).json({ success: false, message: "Error checking vehicle existence" });
                                });
                            }

                            if (checkResults.length > 0) {
                                return commitTransaction(connection, res, "Customer updated successfully (Vehicle already exists, no changes made)");
                            }

                            const insertVehicleQuery = `
                                INSERT INTO vehicles (admin_id, customer_id, brand, model, vehicle_number, manufacturing_year, vehicle_type, status) 
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                            `;
                            const insertVehicleValues = [
                                admin_id, id, brand, model, vehicle_number, 
                                manufacturing_year || null, vehicle_type || 'car', status || 'Active'
                            ];

                            connection.query(insertVehicleQuery, insertVehicleValues, (insertVehErr, insertVehResult) => {
                                if (insertVehErr) {
                                    return connection.rollback(() => {
                                        connection.release();
                                        res.status(500).json({ success: false, message: "Customer updated, but error adding new vehicle" });
                                    });
                                }

                                commitTransaction(connection, res, "Customer updated and new vehicle added successfully");
                            });
                        });
                    }

                } else {
                    commitTransaction(connection, res, "Customer updated successfully (No vehicle changes)");
                }
            });
        });
    });
};

const commitTransaction = (connection, res, successMessage) => {
    connection.commit((commitErr) => {
        if (commitErr) {
            return connection.rollback(() => {
                connection.release();
                res.status(500).json({ success: false, message: "Transaction commit failed" });
            });
        }
        connection.release();
        res.status(200).json({ success: true, message: successMessage });
    });
};