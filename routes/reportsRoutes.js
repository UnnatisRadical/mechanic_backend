import express from "express";
import { 
  getReports, 
  getCustomerBills, 
  getWorkHistory 
} from "../controllers/reportsController.js";

const router = express.Router();

router.get("/", getReports);
router.get("/customer", getCustomerBills);
router.get("/work-history", getWorkHistory);

export default router;