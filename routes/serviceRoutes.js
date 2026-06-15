import express from "express";
import { addService, getServicesByAdmin, editService, deleteService } from "../controllers/serviceController.js";

const router = express.Router();

router.post("/add", addService);  
router.get("/view/:admin_id", getServicesByAdmin);
router.put("/edit", editService);
router.delete("/:id", deleteService);
export default router;
