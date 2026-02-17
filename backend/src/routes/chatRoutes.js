import * as chatController from "../controllers/chatController.js";
import * as documentController from '../controllers/documentController.js';
import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/', chatController.sendMessage);
router.get('/threads', chatController.getThreads);
router.post('/delete-history', chatController.deleteAllThreads);
router.get('/documents', documentController.getDocuments);
router.get('/:threadId', chatController.getHistory);

export default router;