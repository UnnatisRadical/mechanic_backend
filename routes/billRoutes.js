import express from "express";
import {
  createBill,
  getActiveServices,
  getPreviousCustomers,
  updateBill,
  updateCustomerDetails,
  deleteBill,
  getBillById,
  // updatePayment,
  getPendingBalances,
  updatePayment,
  getAllBills,

} from "../controllers/billController.js";

const router = express.Router();

router.post("/create", createBill);
router.get("/active-services/:admin_id", getActiveServices);
router.get("/previous-customers/:admin_id", getPreviousCustomers);
router.get("/all-bills", getAllBills);
router.put("/:bill_id", updateBill);
router.put("/customer/update", updateCustomerDetails);
router.delete("/:id", deleteBill);
router.get("/:bill_id", getBillById);
router.put("/update-payment/:bill_id", updatePayment);
router.get("/pending-balances/:admin_id", getPendingBalances);

export default router;