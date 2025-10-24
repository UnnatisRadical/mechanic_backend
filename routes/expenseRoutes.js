import { Router } from "express";
import { 
  addExpense, 
  getExpenses,
  getExpenseCategories,
  updateExpense,
  deleteExpense
} from "../controllers/expenseController.js";

const router = Router();

router.post("/expenses", addExpense);
router.get("/expenses", getExpenses);
router.get("/expense-categories", getExpenseCategories);
router.patch("/expenses/:id", updateExpense);
router.delete("/expenses/:id", deleteExpense);

export default router;