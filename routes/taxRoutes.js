import { Router } from "express";

import { getTaxDetails, saveTaxDetails } from "../controllers/taxController.js"; 
const router = Router();

router.get("/tax-details/:adminId", getTaxDetails);
router.post("/tax-details", saveTaxDetails);

export default router;