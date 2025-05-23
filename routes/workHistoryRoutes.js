// routes/workHistoryRoutes.js
import express from "express";
import { getWorkHistory } from "../controllers/workHistoryController.js";

const router = express.Router();

router.get("/", getWorkHistory);

export default router;