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
  updatePremiumStatusPUT,
  updateInvoiceNumberFormat,
  getSubscriptionAnalytics,
  getFreeTrialUsers,
  getPremiumUsers,
  getExpiredSubscriptions,
  getSubscriptionHistory,
  getSubscriptionTimeline,
} from "../controllers/adminController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/google-signin", googleSignIn);
router.get("/protected", verifyToken, (req, res) => {
  res.json({ message: "Access granted", admin: req.admin });
});

// ============================================
// SUBSCRIPTION MANAGEMENT ROUTES (ORDER MATTERS!)
// ============================================

// History and analytics routes FIRST (before :id routes)
router.get("/analytics/subscriptions", getSubscriptionAnalytics);
router.get("/analytics/trial-users", getFreeTrialUsers);
router.get("/analytics/premium-users", getPremiumUsers);
router.get("/analytics/expired-subscriptions", getExpiredSubscriptions);
router.get("/subscription-history/:adminId", getSubscriptionHistory);
router.get("/subscription-timeline/:adminId", getSubscriptionTimeline);

// Premium status update routes
router.put("/premium", updatePremiumStatus);
router.put("/premium/:adminId", updatePremiumStatusPUT); // Alternative PUT with ID in path

// ============================================
// OTHER ADMIN ROUTES
// ============================================

router.put("/invoice-format", updateInvoiceNumberFormat);

// Settings routes before generic :id routes
router.get("/:id/settings", getAdminSettings);
router.put("/:id/settings", updateAdminSettings);

// Account management routes
router.post("/:id/verify-delete", verifyAdminBeforeDelete);
router.delete("/:id", deleteAdminAccount);
router.put("/:id/password", changeAdminPassword);

// Generic admin routes (LAST - catch-all position)
router.get("/:id", getAdminById);
router.put("/:id", updateAdmin);

export default router;