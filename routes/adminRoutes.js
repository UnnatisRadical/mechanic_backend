import { Router } from "express";
import {
  registerAdmin, loginAdmin, getAdminById, updateAdmin, changeAdminPassword, getAdminSettings, updateAdminSettings, googleSignIn,
  deleteAdminAccount,
  verifyAdminBeforeDelete,
  updatePremiumStatus
} from "../controllers/adminController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/register", registerAdmin);
router.post("/login", loginAdmin);
router.post("/google-signin", googleSignIn);
router.get("/protected", verifyToken, (req, res) => {
  res.json({ message: "Access granted", admin: req.admin });
});
router.put("/premium", updatePremiumStatus);
router.get("/:id", getAdminById);
router.put("/:id", updateAdmin);
router.put("/:id/password", changeAdminPassword);
router.get("/:id/settings", getAdminSettings);
router.put("/:id/settings", updateAdminSettings);
router.post("/:id/verify-delete", verifyAdminBeforeDelete);
router.delete("/:id", deleteAdminAccount);

export default router;