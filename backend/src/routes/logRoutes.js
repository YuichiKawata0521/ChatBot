import * as logController from '../controllers/logController.js';
import express from 'express';
import { protect, authorizeRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();
router.use(protect);
router.use(authorizeRoles('admin'));

router.get('/', logController.getLogs);

export default router;