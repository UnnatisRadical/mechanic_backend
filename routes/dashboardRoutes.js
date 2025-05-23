import { Router } from 'express';
import { getDashboardData } from '../controllers/dashboardController.js';


const router = Router();

router.get('/:admin_id', getDashboardData);

export default router;