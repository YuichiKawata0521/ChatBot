import { chatController } from "../controllers/chatController.js";
import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/caht', protect, chatController.sendMessage);
router.get('/chat/:threadId', protect, chatController.getHistory);

export default router;