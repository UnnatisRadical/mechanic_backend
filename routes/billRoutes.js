// routes/billRoutes.js
import express from "express";
import { 
  createBill, 
  getActiveServices, 
  getPreviousCustomers, 
  updateBill, 
  updateCustomerDetails, 
  deleteBill,
  getWorkHistory,
  getBillById
} from "../controllers/billController.js";

const router = express.Router();

// Create a new bill
router.post("/", createBill);

// Get active services for bill creation
router.get("/active-services/:admin_id", getActiveServices);

// Get previous customers for autocomplete
router.get("/previous-customers/:admin_id", getPreviousCustomers);

// Update a bill
router.put("/:bill_id", updateBill);

// Update customer details across all bills
router.put("/customer/update", updateCustomerDetails);

// Delete a bill
router.delete("/:id", deleteBill);

// Get work history (for WorkHistory screen)
router.get("/work-history", getWorkHistory);

// Get a single bill by bill_id (for CustomerDetails screen)
router.get("/:bill_id", getBillById);

export default router;