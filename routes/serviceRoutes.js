import express from "express";
import {
    addService,
    getServicesByAdmin,
    editService,
    deleteService,
    updateCategory,
    deleteCategory,
    bulkDeleteCategories,
} from "../controllers/serviceController.js";

const router = express.Router();

router.post("/add", addService);
router.get("/view/:admin_id", getServicesByAdmin);
router.put("/edit", editService);
router.delete("/:id", deleteService);
router.put("/update-category", updateCategory);
router.delete("/category/delete", deleteCategory);
router.post("/category/bulk-delete", bulkDeleteCategories);

export default router;