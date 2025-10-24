import express from "express";
import { addService, getServicesByAdmin, removeService, restoreService, getDeletedServicesByAdmin, editService } from "../controllers/serviceController.js";

const router = express.Router();

router.post("/add", addService);  
router.get("/view/:admin_id", getServicesByAdmin); 
router.post("/remove", removeService);
router.post("/restore", restoreService); 
router.get("/deleted/:admin_id", getDeletedServicesByAdmin); 
router.post("/edit", editService);
export default router;
