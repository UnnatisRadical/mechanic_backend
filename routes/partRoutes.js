import express from 'express';
import { addSparePart, getParts, updateSparePart, deleteSparePart, bulkDeleteParts } from '../controllers/partController.js';

const router = express.Router();

router.post('/add-part', addSparePart);
router.get('/get-parts/:adminId', getParts);
router.put('/update-part/:id', updateSparePart);
router.delete('/:id', deleteSparePart);
router.post("/bulk-delete", bulkDeleteParts);

export default router;