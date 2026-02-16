import { chatController } from "../controllers/chatController.js";
import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/', protect, chatController.sendMessage);
router.get('/:threadId', protect, chatController.getHistory);

export default router;