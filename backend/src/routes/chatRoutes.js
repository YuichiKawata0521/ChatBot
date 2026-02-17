import { chatController } from "../controllers/chatController.js";
import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/', protect, chatController.sendMessage);
router.get('/threads', protect, chatController.getThreads);
router.post('/delete-history', protect, chatController.deleteAllThreads);
router.get('/:threadId', protect, chatController.getHistory);

export default router;