import express from "express";
import {
  createBill,  getActiveServices, getPreviousCustomers, updateBill, updateCustomerDetails, deleteBill, getBillById, getPendingBalances, updatePayment, getAllBills, getNextInvoiceId,
} from "../controllers/billController.js";

const router = express.Router();

router.post("/create", createBill);
router.get("/active-services/:admin_id", getActiveServices);
router.get("/previous-customers/:admin_id", getPreviousCustomers);
router.get("/all-bills", getAllBills);
router.get("/pending-balances/:admin_id", getPendingBalances);
router.get('/get-next-invoice-id/:admin_id', getNextInvoiceId);
router.put("/customer/update", updateCustomerDetails);
router.put("/update-payment/:bill_id", updatePayment);
router.put("/:bill_id", updateBill);
router.delete("/:id", deleteBill);
router.get("/:bill_id", getBillById);

export default router;