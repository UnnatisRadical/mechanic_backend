import { Router } from 'express';
import { getDashboardData, getDashboardRevenueTrend } from '../controllers/dashboardController.js';


const router = Router();

router.get('/:admin_id', getDashboardData);
router.get('/revenue-trend/:admin_id', getDashboardRevenueTrend);

export default router;