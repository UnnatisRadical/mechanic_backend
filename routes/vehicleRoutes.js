import express from 'express';
import { registerVehicle, getVehicles, updateVehicle } from '../controllers/vehicleController.js';

const router = express.Router();

router.post('/register-vehicle', registerVehicle);
router.get('/get-vehicles/:adminId', getVehicles);
router.put('/update-vehicle/:id', updateVehicle);

export default router;