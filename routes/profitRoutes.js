import express from "express";
import profitController from "../controllers/profitController.js";

const router = express.Router();

router.get("/calculate", profitController.calculateProfit);
router.get("/summary", profitController.getFinanceSummary);

export default router;