// routes/reportsRoutes.js
import express from "express";
import { 
  getReports, 
  getCustomerBills, 
  getWorkHistory 
} from "../controllers/reportsController.js";

const router = express.Router();

// Get all bills for reporting
router.get("/", getReports);

// Get bills for a specific customer
router.get("/customer", getCustomerBills);

// Get work history (chronological bill list)
router.get("/work-history", getWorkHistory);

export default router;