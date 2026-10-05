import db from "../db/db.js";

const parseJsonArray = (value) => {
	if (Array.isArray(value)) return value;
	if (typeof value !== "string") return [];
	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
};

export const createEstimate = (req, res) => {
	const {
		admin_id,
		customer_name,
		customer_phone,
		vehicle_type,
		selected_services,
		selected_parts,
		other_charges,
		discount,
		tax_type,
		tax_rate,
	} = req.body;

	if (!admin_id || !customer_name?.trim()) {
		return res.status(400).json({
			success: false,
			message: "Admin ID and customer name are required",
		});
	}

	if (!["car", "motorbike"].includes(vehicle_type)) {
		return res.status(400).json({
			success: false,
			message: "A valid vehicle type is required",
		});
	}

	const services = Array.isArray(selected_services) ? selected_services : [];
	const parts = Array.isArray(selected_parts) ? selected_parts : [];
	const charges = Array.isArray(other_charges) ? other_charges : [];

	if (services.length === 0 && parts.length === 0) {
		return res.status(400).json({
			success: false,
			message: "At least one service or spare part is required",
		});
	}

	const serviceTotal = services.reduce((sum, service) => {
		const price = Number(
			vehicle_type === "car" ? service.price_4w : service.price_2w,
		);
		return sum + (Number.isFinite(price) ? price : 0) * (Number(service.qty) || 1);
	}, 0);
	const sparePartsTotal = parts.reduce((sum, part) => {
		const price = Number(part.selling_price);
		return sum + (Number.isFinite(price) ? price : 0) * (Number(part.qty) || 1);
	}, 0);
	const otherChargesAmount = charges.reduce((sum, charge) => {
		const amount = Number(charge.amount);
		return sum + (Number.isFinite(amount) ? amount : 0);
	}, 0);
	const discountAmount = Number(discount) || 0;
	const subtotal = Math.max(
		0,
		serviceTotal + sparePartsTotal + otherChargesAmount - discountAmount,
	);
	const rate = Number(tax_rate) || 0;
	const taxAmount = subtotal * (rate / 100);
	const grandTotal = subtotal + taxAmount;

	const query = `
		INSERT INTO estimates (
			admin_id, customer_name, customer_phone, vehicle_type, selected_services,
			selected_parts, other_charges, discount, tax_type, tax_rate, service_total,
			spare_parts_total, other_charges_amount, discount_amount, subtotal,
			tax_amount, grand_total
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`;
	const values = [
		admin_id,
		customer_name.trim(),
		customer_phone || null,
		vehicle_type,
		JSON.stringify(services),
		JSON.stringify(parts),
		JSON.stringify(charges),
		discountAmount,
		tax_type || "GST",
		rate,
		serviceTotal,
		sparePartsTotal,
		otherChargesAmount,
		discountAmount,
		subtotal,
		taxAmount,
		grandTotal,
	];

	db.query(query, values, (error, result) => {
		if (error) {
			return res.status(500).json({
				success: false,
				message: "Could not save estimate",
			});
		}

		return res.status(201).json({
			success: true,
			message: "Estimate saved successfully",
			estimate_id: result.insertId,
		});
	});
};

export const updateEstimate = (req, res) => {
	const { id } = req.params;
	const {
		admin_id,
		customer_name,
		customer_phone,
		vehicle_type,
		selected_services,
		selected_parts,
		other_charges,
		discount,
		tax_type,
		tax_rate,
	} = req.body;

	if (!admin_id || !customer_name?.trim()) {
		return res.status(400).json({
			success: false,
			message: "Admin ID and customer name are required",
		});
	}
	if (!["car", "motorbike"].includes(vehicle_type)) {
		return res.status(400).json({
			success: false,
			message: "A valid vehicle type is required",
		});
	}

	const services = Array.isArray(selected_services) ? selected_services : [];
	const parts = Array.isArray(selected_parts) ? selected_parts : [];
	const charges = Array.isArray(other_charges) ? other_charges : [];
	if (services.length === 0 && parts.length === 0) {
		return res.status(400).json({
			success: false,
			message: "At least one service or spare part is required",
		});
	}

	const serviceTotal = services.reduce((sum, service) => {
		const price = Number(vehicle_type === "car" ? service.price_4w : service.price_2w);
		return sum + (Number.isFinite(price) ? price : 0) * (Number(service.qty) || 1);
	}, 0);
	const sparePartsTotal = parts.reduce((sum, part) => {
		const price = Number(part.selling_price ?? part.sellingPrice);
		return sum + (Number.isFinite(price) ? price : 0) * (Number(part.qty) || 1);
	}, 0);
	const otherChargesAmount = charges.reduce((sum, charge) => {
		const amount = Number(charge.amount);
		return sum + (Number.isFinite(amount) ? amount : 0);
	}, 0);
	const discountAmount = Number(discount) || 0;
	const subtotal = Math.max(0, serviceTotal + sparePartsTotal + otherChargesAmount - discountAmount);
	const rate = Number(tax_rate) || 0;
	const taxAmount = subtotal * (rate / 100);
	const grandTotal = subtotal + taxAmount;

	const query = `
		UPDATE estimates SET
			customer_name = ?, customer_phone = ?, vehicle_type = ?, selected_services = ?,
			selected_parts = ?, other_charges = ?, discount = ?, tax_type = ?, tax_rate = ?,
			service_total = ?, spare_parts_total = ?, other_charges_amount = ?,
			discount_amount = ?, subtotal = ?, tax_amount = ?, grand_total = ?
		WHERE id = ? AND admin_id = ?
	`;
	const values = [
		customer_name.trim(),
		customer_phone || null,
		vehicle_type,
		JSON.stringify(services),
		JSON.stringify(parts),
		JSON.stringify(charges),
		discountAmount,
		tax_type || "GST",
		rate,
		serviceTotal,
		sparePartsTotal,
		otherChargesAmount,
		discountAmount,
		subtotal,
		taxAmount,
		grandTotal,
		id,
		admin_id,
	];

	db.query(query, values, (error, result) => {
		if (error) {
			return res.status(500).json({
				success: false,
				message: "Could not update estimate",
			});
		}
		if (result.affectedRows === 0) {
			return res.status(404).json({
				success: false,
				message: "Estimate not found",
			});
		}
		return res.json({
			success: true,
			message: "Estimate updated successfully",
			estimate_id: Number(id),
		});
	});
};

export const getEstimates = (req, res) => {
	const { admin_id } = req.query;
	if (!admin_id) {
		return res.status(400).json({
			success: false,
			message: "Admin ID is required",
		});
	}

	db.query(
		"SELECT * FROM estimates WHERE admin_id = ? ORDER BY created_at DESC, id DESC",
		[admin_id],
		(error, results) => {
			if (error) {
				return res.status(500).json({
					success: false,
					message: "Could not fetch estimates",
				});
			}

			const estimates = results.map((estimate) => ({
				...estimate,
				selected_services: parseJsonArray(estimate.selected_services),
				selected_parts: parseJsonArray(estimate.selected_parts),
				other_charges: parseJsonArray(estimate.other_charges),
			}));
			return res.json({ success: true, data: estimates });
		},
	);
};

export const deleteEstimate = (req, res) => {
	const { id } = req.params;
	const { admin_id } = req.body;
	if (!admin_id || !id) {
		return res.status(400).json({
			success: false,
			message: "Admin ID and estimate ID are required",
		});
	}

	db.query(
		"DELETE FROM estimates WHERE id = ? AND admin_id = ?",
		[id, admin_id],
		(error, result) => {
			if (error) {
				return res.status(500).json({
					success: false,
					message: "Could not delete estimate",
				});
			}
			if (!result.affectedRows) {
				return res.status(404).json({
					success: false,
					message: "Estimate not found",
				});
			}
			return res.json({ success: true, message: "Estimate deleted successfully" });
		},
	);
};

export const bulkDeleteEstimates = (req, res) => {
	const { admin_id, estimate_ids } = req.body;
	if (!admin_id || !Array.isArray(estimate_ids) || estimate_ids.length === 0) {
		return res.status(400).json({
			success: false,
			message: "Admin ID and at least one estimate ID are required",
		});
	}

	const ids = [...new Set(estimate_ids.map(Number))];
	if (ids.some(id => !Number.isSafeInteger(id) || id <= 0)) {
		return res.status(400).json({
			success: false,
			message: "Estimate IDs must be positive integers",
		});
	}

	const placeholders = ids.map(() => "?").join(", ");
	db.query(
		`DELETE FROM estimates WHERE admin_id = ? AND id IN (${placeholders})`,
		[admin_id, ...ids],
		(error, result) => {
			if (error) {
				return res.status(500).json({
					success: false,
					message: "Could not delete estimates",
				});
			}
			return res.json({
				success: true,
				deleted_count: result.affectedRows,
			});
		},
	);
};
