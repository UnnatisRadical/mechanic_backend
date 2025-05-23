import { Router } from "express";
import { registerAdmin, loginAdmin, getAdminById, updateAdmin, changeAdminPassword, getAdminSettings, updateAdminSettings } from "../controllers/adminController.js";
import { verifyToken } from "../middleware/authMiddleware.js";


const router = Router();

router.post("/register", registerAdmin);
router.post("/login", loginAdmin);
router.get("/protected", verifyToken, (req, res) => {
  res.json({ message: "Access granted", admin: req.admin });
});

router.get("/:id", getAdminById);
router.put("/:id", updateAdmin);
router.put("/:id/password", changeAdminPassword);
router.get("/:id/settings", getAdminSettings);
router.put("/:id/settings", updateAdminSettings);

export default router;
