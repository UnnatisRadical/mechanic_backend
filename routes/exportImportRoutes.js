
import { exportBills } from '../controllers/exportImportController.js';
import express from 'express'

const router = express.Router();
// POST /api/export-bills - Export bills to Excel
router.post('/export-bills', exportBills);

export default router;