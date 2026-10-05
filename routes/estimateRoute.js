import express from "express";
import {
	createEstimate,
	bulkDeleteEstimates,
	deleteEstimate,
	getEstimates,
	updateEstimate,
} from "../controllers/estimateController.js";

const router = express.Router();

router.post("/create", createEstimate);
router.post("/bulk-delete", bulkDeleteEstimates);
router.get("/", getEstimates);
router.put("/:id", updateEstimate);
router.delete("/:id", deleteEstimate);

export default router;