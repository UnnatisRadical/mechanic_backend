import express from 'express';
import { registerVehicle, getVehicles, updateVehicle, deleteVehicle } from '../controllers/vehicleController.js';

const router = express.Router();

router.post('/register-vehicle', registerVehicle);
router.get('/get-vehicles/:adminId', getVehicles);
router.get('/get-all-vehicles/:adminId', getVehicles);
router.put('/update-vehicle/:id', updateVehicle);
router.delete('/:id', deleteVehicle);

export default router;