import { Router } from "express";
import {
  getAdminById,
  updateAdmin,
  changeAdminPassword,
  getAdminSettings,
  updateAdminSettings,
  googleSignIn,
  deleteAdminAccount,
  verifyAdminBeforeDelete,
  updatePremiumStatus,
  updateInvoiceNumberFormat,
  getSubscriptionAnalytics,
  getFreeTrialUsers,
  getPremiumUsers,
  getExpiredSubscriptions,
} from "../controllers/adminController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/google-signin", googleSignIn);
router.get("/protected", verifyToken, (req, res) => {
  res.json({ message: "Access granted", admin: req.admin });
});

// Subscription management routes
router.put("/premium", updatePremiumStatus);
router.get("/analytics/subscriptions", getSubscriptionAnalytics);
router.get("/analytics/trial-users", getFreeTrialUsers);
router.get("/analytics/premium-users", getPremiumUsers);
router.get("/analytics/expired-subscriptions", getExpiredSubscriptions);

// Other routes
router.put("/invoice-format", updateInvoiceNumberFormat);
router.get("/:id", getAdminById);
router.put("/:id", updateAdmin);
router.put("/:id/password", changeAdminPassword);
router.get("/:id/settings", getAdminSettings);
router.put("/:id/settings", updateAdminSettings);
router.post("/:id/verify-delete", verifyAdminBeforeDelete);
router.delete("/:id", deleteAdminAccount);

export default router;